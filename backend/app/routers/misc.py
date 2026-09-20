"""健康检查、实时事件、来源库、AI。"""
import asyncio
import json

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select

from .. import __version__
from ..config import get_settings
from ..deps import DB, WS
from ..models import Secret, Workspace
from ..schemas import AIKeyIn, AIProviderOut, ChatIn, ChatOut, Health, ToolCallOut
from ..services import fetchers, llm
from ..services.events import broadcaster

router = APIRouter()


@router.get("/health", response_model=Health, tags=["系统"])
def health(db: DB):
    return Health(version=__version__, workspaces=[w.ws for w in db.scalars(select(Workspace)).all()])


@router.get("/events", tags=["系统"], summary="实时事件（SSE）：档案有写入时推送 {type:'state', version}")
async def events(request: Request, ws: WS):
    q = broadcaster.subscribe(ws)

    async def stream():
        try:
            yield "retry: 3000\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=15)
                    yield f"data: {msg}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            broadcaster.unsubscribe(ws, q)

    return StreamingResponse(stream(), media_type="text/event-stream", headers={"cache-control": "no-cache", "x-accel-buffering": "no"})


@router.get("/sites", tags=["来源库"], summary="内置来源库（各公司校招官网）")
def sites():
    path = get_settings().web_root / "sites.json"
    if not path.exists():
        return {"updated": "", "sites": []}
    return json.loads(path.read_text(encoding="utf-8"))


# ---------------- AI ----------------
def _secret(db: DB, key: str) -> str:
    row = db.get(Secret, key)
    return row.value if row else ""


def _set_secret(db: DB, key: str, value: str) -> None:
    row = db.get(Secret, key)
    if value:
        if row:
            row.value = value
        else:
            db.add(Secret(key=key, value=value))
    elif row:
        db.delete(row)


@router.get("/ai/providers", response_model=list[AIProviderOut], tags=["AI"])
def ai_providers(db: DB):
    out = []
    for k, p in llm.PROVIDERS.items():
        key = _secret(db, f"ai.{k}.key")
        out.append(AIProviderOut(provider=k, name=p["name"], configured=bool(key) or (k == "custom" and bool(_secret(db, "ai.custom.base"))),
                                 key_hint=(key[:4] + "…" + key[-4:]) if len(key) > 10 else ("已设置" if key else ""),
                                 model=_secret(db, f"ai.{k}.model") or p["model"], base_url=_secret(db, f"ai.{k}.base") or p["base"]))
    return out


@router.put("/ai/providers", response_model=AIProviderOut, tags=["AI"], summary="保存某个服务商的 Key / 模型 / 地址（Key 只存在本机数据库）")
def ai_set_provider(body: AIKeyIn, db: DB, default: bool = True):
    if body.provider not in llm.PROVIDERS:
        raise HTTPException(400, "不认识的服务商")
    if body.api_key:
        _set_secret(db, f"ai.{body.provider}.key", body.api_key.strip())
    if body.model is not None:
        _set_secret(db, f"ai.{body.provider}.model", body.model.strip())
    if body.base_url is not None:
        _set_secret(db, f"ai.{body.provider}.base", body.base_url.strip())
    if default:
        _set_secret(db, "ai.default", body.provider)
    db.commit()
    return next(p for p in ai_providers(db) if p.provider == body.provider)


@router.post("/ai/chat", response_model=ChatOut, tags=["AI"], summary="调用大模型（支持工具调用），Key 用后端保存的")
async def ai_chat(body: ChatIn, db: DB):
    provider = body.provider or _secret(db, "ai.default") or "zhipu"
    if provider not in llm.PROVIDERS:
        raise HTTPException(400, "不认识的服务商")
    model = body.model or _secret(db, f"ai.{provider}.model") or None
    try:
        r = await llm.chat(provider=provider, api_key=_secret(db, f"ai.{provider}.key"), model=model,
                           base_url=_secret(db, f"ai.{provider}.base") or None, system=body.system,
                           messages=[m.model_dump() for m in body.messages],
                           tools=[t.model_dump() for t in body.tools] if body.tools else None,
                           max_tokens=body.max_tokens, timeout=get_settings().llm_timeout)
    except llm.LLMError as e:
        raise HTTPException(e.status, str(e)) from e
    return ChatOut(provider=provider, model=model or llm.PROVIDERS[provider]["model"], text=r.text,
                   tool_calls=[ToolCallOut(id=c.id, name=c.name, arguments=c.arguments) for c in r.tool_calls], stop_reason=r.stop_reason)


# ---------------------------------------------------------------- 直接读取招聘系统
class FetchIn(BaseModel):
    url: str = Field(..., description="公司招聘页网址")
    max: int = Field(300, ge=1, le=1000, description="最多返回多少个岗位")
    skip: list[str] = Field(default_factory=list, description="已经读过的岗位网址：不再拉详情（腾讯）")
    grad_year: int | None = Field(None, description="届别，例如 2027：快手按届别项目筛选")


@router.get("/jobs/sources/direct", tags=["岗位"], summary="哪些招聘系统可以由后端直接读取")
def direct_sources():
    return [{"kind": k, "system": n, "pattern": p.pattern} for k, n, p, _ in fetchers.ADAPTERS]


@router.post("/jobs/fetch", tags=["岗位"], summary="直接读取一家公司的在招岗位（带 JD），不需要浏览器插件")
async def jobs_fetch(body: FetchIn):
    try:
        return await fetchers.fetch(body.url, max_jobs=body.max, skip=set(body.skip), grad_year=body.grad_year)
    except fetchers.FetchError as e:
        raise HTTPException(422, str(e)) from e
