"""接口的请求 / 响应模型。"""
from typing import Any

from pydantic import BaseModel, Field


class Health(BaseModel):
    ok: bool = True
    app: str = "qzzt-backend"
    version: str
    workspaces: list[str]


class StateOut(BaseModel):
    ws: str
    version: int
    state: dict[str, Any] | None = Field(None, description="前端整份状态；服务器还没有数据时为 null")


class StateIn(BaseModel):
    state: dict[str, Any]
    base_version: int | None = Field(None, description="客户端所基于的版本；与服务器不同则返回 409。为 null 表示强制覆盖")


class StateSaved(BaseModel):
    ws: str
    version: int


class Conflict(BaseModel):
    detail: str
    version: int


class ItemOut(BaseModel):
    """资源的统一形态：id + 完整对象。"""
    id: str
    data: dict[str, Any]


class ItemList(BaseModel):
    total: int
    items: list[ItemOut]
    version: int


class ItemPatch(BaseModel):
    data: dict[str, Any] = Field(..., description="要合并进对象的字段")


class JobImportIn(BaseModel):
    items: list[dict[str, Any]] = Field(default_factory=list, max_length=2000)


class AIKeyIn(BaseModel):
    provider: str
    api_key: str = ""
    model: str | None = None
    base_url: str | None = None


class AIProviderOut(BaseModel):
    provider: str
    name: str
    configured: bool
    key_hint: str = ""
    model: str
    base_url: str


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str


class ToolDef(BaseModel):
    name: str
    description: str = ""
    parameters: dict[str, Any] | None = None


class ChatIn(BaseModel):
    provider: str | None = Field(None, description="不填用默认服务商")
    model: str | None = None
    system: str = ""
    messages: list[ChatMessage]
    tools: list[ToolDef] | None = None
    max_tokens: int = Field(2000, ge=1, le=32000)


class ToolCallOut(BaseModel):
    id: str
    name: str
    arguments: dict[str, Any]


class ChatOut(BaseModel):
    provider: str
    model: str
    text: str
    tool_calls: list[ToolCallOut]
    stop_reason: str
