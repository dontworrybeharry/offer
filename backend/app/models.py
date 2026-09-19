"""数据表。

设计：常用于查询、筛选的字段单独成列（带索引），完整对象放在 data（JSON）里，
这样前端对象多加字段不需要改表，后端功能又能直接按列查询。
所有表都带 ws（workspace）：个人版与通用版、或以后的多份档案互不干扰。
"""
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Workspace(Base):
    """一份档案。version 每次写入 +1，用于多窗口乐观并发与实时同步。"""
    __tablename__ = "workspaces"
    ws: Mapped[str] = mapped_column(String(64), primary_key=True)
    version: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Document(Base):
    """状态里没有单独建表的部分（经历档案、复盘、题库、设置等），按顶层键存。"""
    __tablename__ = "documents"
    ws: Mapped[str] = mapped_column(String(64), primary_key=True)
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    data: Mapped[object] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Application(Base):
    """投递看板里的一条岗位。"""
    __tablename__ = "applications"
    ws: Mapped[str] = mapped_column(String(64), primary_key=True)
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    pos: Mapped[int] = mapped_column(Integer, default=0)
    company: Mapped[str] = mapped_column(String(200), default="", index=True)
    role: Mapped[str] = mapped_column(String(300), default="")
    stage: Mapped[str] = mapped_column(String(40), default="", index=True)
    phase: Mapped[str] = mapped_column(String(40), default="")
    applied_on: Mapped[str] = mapped_column(String(10), default="", index=True)
    deadline: Mapped[str] = mapped_column(String(10), default="", index=True)
    url: Mapped[str] = mapped_column(Text, default="")
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Job(Base):
    """职位雷达 / 自动投递发现的岗位。"""
    __tablename__ = "jobs"
    ws: Mapped[str] = mapped_column(String(64), primary_key=True)
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    pos: Mapped[int] = mapped_column(Integer, default=0)
    company: Mapped[str] = mapped_column(String(200), default="", index=True)
    role: Mapped[str] = mapped_column(String(300), default="")
    city: Mapped[str] = mapped_column(String(60), default="")
    url: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="", index=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True, index=True)
    found_at: Mapped[str] = mapped_column(String(40), default="", index=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Source(Base):
    """被监控的公司岗位列表页。"""
    __tablename__ = "sources"
    ws: Mapped[str] = mapped_column(String(64), primary_key=True)
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    pos: Mapped[int] = mapped_column(Integer, default=0)
    company: Mapped[str] = mapped_column(String(200), default="", index=True)
    url: Mapped[str] = mapped_column(Text, default="")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_scanned: Mapped[str] = mapped_column(String(40), default="")
    data: Mapped[dict] = mapped_column(JSON, default=dict)


class ResumeVersion(Base):
    """历史简历（每次生成 / 修改存一版）。"""
    __tablename__ = "resume_versions"
    ws: Mapped[str] = mapped_column(String(64), primary_key=True)
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    pos: Mapped[int] = mapped_column(Integer, default=0)
    company: Mapped[str] = mapped_column(String(200), default="", index=True)
    role: Mapped[str] = mapped_column(String(300), default="")
    app_id: Mapped[str] = mapped_column(String(64), default="", index=True)
    saved_at: Mapped[str] = mapped_column(String(40), default="")
    data: Mapped[dict] = mapped_column(JSON, default=dict)


class Secret(Base):
    """本机密钥（大模型 API Key 等）。不进入状态同步和导出。"""
    __tablename__ = "secrets"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
