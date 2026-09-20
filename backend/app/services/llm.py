"""大模型调用：一个接口对接 Claude（Anthropic）和所有兼容 OpenAI 格式的服务
（ChatGPT、智谱 GLM、Gemini、DeepSeek、硅基流动、本机 Ollama 等）。
API Key 存在本机数据库（secrets 表），不经过浏览器、不进入状态同步。
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

import httpx

PROVIDERS: dict[str, dict[str, str]] = {
    "anthropic": {"name": "Claude", "base": "https://api.anthropic.com/v1", "model": "claude-opus-5", "kind": "anthropic"},
    "openai": {"name": "ChatGPT", "base": "https://api.openai.com/v1", "model": "gpt-5", "kind": "openai"},
    "zhipu": {"name": "智谱 GLM", "base": "https://open.bigmodel.cn/api/paas/v4", "model": "glm-4-flash", "kind": "openai"},
    "gemini": {"name": "Gemini", "base": "https://generativelanguage.googleapis.com/v1beta/openai", "model": "gemini-2.5-flash", "kind": "openai"},
    "deepseek": {"name": "DeepSeek", "base": "https://api.deepseek.com", "model": "deepseek-chat", "kind": "openai"},
    "custom": {"name": "其他", "base": "", "model": "", "kind": "openai"},
}


class LLMError(Exception):
    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict[str, Any]


@dataclass
class ChatResult:
    text: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    stop_reason: str = ""
    raw: dict[str, Any] = field(default_factory=dict)


async def chat(*, provider: str, api_key: str, model: str | None, system: str, messages: list[dict[str, Any]],
               tools: list[dict[str, Any]] | None = None, max_tokens: int = 2000, base_url: str | None = None,
               timeout: float = 120.0, client: httpx.AsyncClient | None = None) -> ChatResult:
    """messages 统一用 OpenAI 风格：[{role: user|assistant, content: str}]。
    tools 统一用 {name, description, parameters(JSON Schema)}。"""
    if provider not in PROVIDERS:
        raise LLMError(f"不认识的服务商：{provider}", 400)
    p = PROVIDERS[provider]
    if not api_key and provider != "custom":
        raise LLMError("还没有填写这个服务商的 API Key", 400)
    model = model or p["model"]
    base = (base_url or p["base"]).rstrip("/")
    if not base or not model:
        raise LLMError("自定义服务需要接口地址和模型名称", 400)
    own = client is None
    client = client or httpx.AsyncClient(timeout=timeout)
    try:
        if p["kind"] == "anthropic":
            body: dict[str, Any] = {"model": model, "max_tokens": max_tokens, "system": system, "messages": messages}
            if tools:
                body["tools"] = [{"name": t["name"], "description": t.get("description", ""), "input_schema": t.get("parameters") or {"type": "object", "properties": {}}} for t in tools]
            r = await client.post(f"{base}/messages", json=body, headers={"x-api-key": api_key, "anthropic-version": "2023-06-01"})
            data = _json_or_raise(r)
            text = "\n".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text").strip()
            calls = [ToolCall(b["id"], b["name"], b.get("input") or {}) for b in data.get("content", []) if b.get("type") == "tool_use"]
            return ChatResult(text=text, tool_calls=calls, stop_reason=data.get("stop_reason", ""), raw=data)
        body = {"model": model, "messages": [{"role": "system", "content": system}, *messages]}
        body["max_completion_tokens" if provider == "openai" else "max_tokens"] = max_tokens
        if tools:
            body["tools"] = [{"type": "function", "function": {"name": t["name"], "description": t.get("description", ""), **({"parameters": t["parameters"]} if t.get("parameters") else {})}} for t in tools]
        headers = {"authorization": f"Bearer {api_key}"} if api_key else {}
        r = await client.post(f"{base}/chat/completions", json=body, headers=headers)
        # 很多兼容服务的地址要带 /v1，用户常常漏掉：404 时补上 /v1 再试一次
        if r.status_code == 404 and not re.search(r"/v\d+[a-z]*$", base, re.I):
            r2 = await client.post(f"{base}/v1/chat/completions", json=body, headers=headers)
            if r2.status_code != 404:
                r = r2
        data = _json_or_raise(r)
        choice = (data.get("choices") or [{}])[0]
        msg = choice.get("message") or {}
        calls = []
        for c in msg.get("tool_calls") or []:
            import json as _json
            try:
                args = _json.loads(c["function"].get("arguments") or "{}")
            except ValueError:
                args = {}
            calls.append(ToolCall(c.get("id", ""), c["function"]["name"], args))
        return ChatResult(text=(msg.get("content") or "").strip(), tool_calls=calls, stop_reason=choice.get("finish_reason", ""), raw=data)
    except httpx.HTTPError as e:
        raise LLMError(f"连不上 {p['name']}：{e.__class__.__name__}") from e
    finally:
        if own:
            await client.aclose()


def _json_or_raise(r: httpx.Response) -> dict[str, Any]:
    try:
        data = r.json()
    except ValueError:
        data = {}
    if r.status_code >= 400:
        err = data.get("error") if isinstance(data, dict) else None
        detail = (err.get("message") if isinstance(err, dict) else err) or r.text[:200]
        hint = {401: "API Key 无效或已过期", 403: "这个 Key 没有权限使用该模型", 404: "模型名称或接口地址不对", 429: "请求太频繁或额度用完"}.get(r.status_code, "请求失败")
        raise LLMError(f"{hint}（{r.status_code}：{detail}）", 400 if r.status_code in (400, 401, 403, 404) else 502)
    return data
