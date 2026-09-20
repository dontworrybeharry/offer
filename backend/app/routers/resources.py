"""资源接口：投递、岗位、公司来源、历史简历。

四种资源共用一套增删改查（按列筛选 + 完整对象存在 data 里）。以后加新资源：
在 models.py 建表，在 state_sync 里登记，再在这里 make_router 一行即可。
每次写入都会让档案版本 +1 并广播，打开着的页面会自动刷新。
"""
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, or_, select

from ..deps import DB, WS
from ..models import Application, Job, ListRow, ResumeVersion, Source
from ..schemas import ItemList, ItemOut, ItemPatch, JobImportIn
from ..services.events import broadcaster
from ..services.state_sync import bump, get_workspace, row_fields


def _out(row: Any) -> ItemOut:
    return ItemOut(id=row.id, data=row.data)


def make_router(model: type[ListRow], path: str, tag: str, filters: dict[str, str], order: Any, search_cols: tuple[str, ...]) -> APIRouter:
    router = APIRouter(prefix=path, tags=[tag])

    def commit(db: DB, ws: str) -> int:
        v = bump(db, ws)
        db.commit()
        broadcaster.publish(ws, {"type": "state", "version": v, "resource": path.strip("/")})
        return v

    @router.get("", response_model=ItemList, summary=f"列出{tag}")
    def list_items(db: DB, ws: WS, q: str = Query("", description="按公司 / 岗位搜索"), limit: int = Query(200, ge=1, le=2000),
                   offset: int = Query(0, ge=0), **kw: Any):
        stmt = select(model).where(model.ws == ws)
        for param, col in filters.items():
            val = kw.get(param)
            if val not in (None, ""):
                stmt = stmt.where(getattr(model, col) == val)
        if q:
            like = f"%{q}%"
            stmt = stmt.where(or_(*[getattr(model, c).like(like) for c in search_cols]))
        total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = db.scalars(stmt.order_by(order).offset(offset).limit(limit)).all()
        w = get_workspace(db, ws, create=False)
        return ItemList(total=total, items=[_out(r) for r in rows], version=w.version if w else 0)

    # FastAPI 需要显式声明筛选参数：动态生成签名
    import inspect
    sig = inspect.signature(list_items)
    params = [p for p in sig.parameters.values() if p.kind != inspect.Parameter.VAR_KEYWORD]
    params += [inspect.Parameter(k, inspect.Parameter.KEYWORD_ONLY, default=Query(None, description=f"按 {v} 筛选"), annotation=str | None) for k, v in filters.items()]
    list_items.__signature__ = sig.replace(parameters=params)  # type: ignore[attr-defined]

    @router.get("/{item_id}", response_model=ItemOut, summary=f"读取一条{tag}")
    def get_item(item_id: str, db: DB, ws: WS):
        row = db.get(model, {"ws": ws, "id": item_id})
        if not row:
            raise HTTPException(404, "找不到这条记录")
        return _out(row)

    @router.post("", response_model=ItemOut, status_code=201, summary=f"新增{tag}")
    def create_item(body: ItemPatch, db: DB, ws: WS):
        data = dict(body.data)
        if not data.get("id"):
            import secrets
            data["id"] = path.strip("/")[:1] + secrets.token_hex(6)
        if db.get(model, {"ws": ws, "id": data["id"]}):
            raise HTTPException(409, "id 已存在")
        get_workspace(db, ws)
        # 新条目排在最前（与前端「最新在前」一致）
        first = db.scalar(select(func.min(model.pos)).where(model.ws == ws))
        row = model(ws=ws, id=str(data["id"])[:64], pos=(first or 0) - 1, data=data, **row_fields(model, data))
        db.add(row)
        commit(db, ws)
        return _out(row)

    @router.patch("/{item_id}", response_model=ItemOut, summary=f"修改{tag}（合并字段）")
    def patch_item(item_id: str, body: ItemPatch, db: DB, ws: WS):
        row = db.get(model, {"ws": ws, "id": item_id})
        if not row:
            raise HTTPException(404, "找不到这条记录")
        data = {**row.data, **body.data, "id": item_id}
        row.data = data
        for k, v in row_fields(model, data).items():
            setattr(row, k, v)
        commit(db, ws)
        return _out(row)

    @router.delete("/{item_id}", status_code=204, summary=f"删除{tag}")
    def delete_item(item_id: str, db: DB, ws: WS):
        row = db.get(model, {"ws": ws, "id": item_id})
        if not row:
            raise HTTPException(404, "找不到这条记录")
        db.delete(row)
        commit(db, ws)

    return router


applications = make_router(Application, "/applications", "投递", {"stage": "stage", "phase": "phase", "company": "company"},
                           Application.pos, ("company", "role"))
jobs = make_router(Job, "/jobs", "岗位", {"status": "status", "company": "company", "city": "city"}, Job.pos, ("company", "role", "city"))

@jobs.post("/import", response_model=ItemList, status_code=201, summary="批量导入插件抓取的岗位")
def import_jobs(body: JobImportIn, db: DB, ws: WS):
    """插件抓取完成后直接写入 jobs 表；同 URL 或同公司+岗位视为重复。"""
    get_workspace(db, ws)
    existing = db.scalars(select(Job).where(Job.ws == ws)).all()
    keys = {(r.company, r.role) for r in existing}
    urls = {r.url for r in existing if r.url}
    added = []
    first = db.scalar(select(func.min(Job.pos)).where(Job.ws == ws))
    pos = (first or 0) - 1
    for raw in body.items:
        data = dict(raw)
        company = str(data.get("company") or "")[:200]
        role = str(data.get("role") or "")[:300]
        url = str(data.get("url") or "")
        if not company and not role:
            continue
        if (url and url in urls) or (company, role) in keys:
            continue
        import secrets
        oid = str(data.get("id") or "j" + secrets.token_hex(8))[:64]
        while db.get(Job, {"ws": ws, "id": oid}):
            oid = "j" + secrets.token_hex(8)
        data["id"] = oid
        row = Job(ws=ws, id=oid, pos=pos, data=data, **row_fields(Job, data))
        db.add(row); added.append(row); pos -= 1
        keys.add((company, role))
        if url: urls.add(url)
    v = bump(db, ws); db.commit()
    broadcaster.publish(ws, {"type": "state", "version": v, "resource": "jobs", "imported": len(added)})
    return ItemList(total=len(added), items=[_out(r) for r in added], version=v)

sources = make_router(Source, "/sources", "公司来源", {"company": "company"}, Source.pos, ("company", "url"))
resumes = make_router(ResumeVersion, "/resumes", "历史简历", {"company": "company", "app_id": "app_id"}, ResumeVersion.pos, ("company", "role"))
