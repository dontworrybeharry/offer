"""路由共用的依赖。"""
import re
from typing import Annotated

from fastapi import Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .db import get_db

WS_RE = re.compile(r"^[A-Za-z0-9_\-]{1,64}$")


def workspace(ws: Annotated[str, Query(description="档案名，前端用各自的存储键，例如 qzzt_share_v1")] = "default") -> str:
    if not WS_RE.match(ws):
        raise HTTPException(422, "ws 只能包含字母、数字、下划线和短横线，最长 64 个字符")
    return ws


DB = Annotated[Session, Depends(get_db)]
WS = Annotated[str, Depends(workspace)]
