"""前端「整份状态」与数据表之间的互相转换。

前端（两个版本）把所有数据放在一个对象 S 里。这里把它拆成：
  S.apps                 -> applications
  S.resumeHist           -> resume_versions
  S.autopilot.queue      -> jobs
  S.autopilot.sources    -> sources
  其余顶层键（含 autopilot 的其他设置） -> documents
读的时候按原顺序拼回去，保证拆开再拼回来与原对象完全一致。
"""
from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..models import Application, Document, Job, ListRow, ResumeVersion, Source, Workspace, WsRow

LIST_TABLES: dict[str, type[ListRow]] = {"apps": Application, "resumeHist": ResumeVersion}
AUTOPILOT_LISTS: dict[str, type[ListRow]] = {"queue": Job, "sources": Source}


class VersionConflict(Exception):
    def __init__(self, current: int):
        super().__init__(f"state changed on server (version {current})")
        self.current = current


def _s(v: Any, n: int = 0) -> str:
    s = "" if v is None else str(v)
    return s[:n] if n else s


def _num(v: Any) -> float | None:
    try:
        return float(v) if v is not None and v != "" else None
    except (TypeError, ValueError):
        return None


def row_fields(model: type, obj: dict) -> dict:
    """从前端对象里取出建了列的字段（其余都在 data 里）。"""
    if model is Application:
        return dict(company=_s(obj.get("company"), 200), role=_s(obj.get("role"), 300), stage=_s(obj.get("stage"), 40),
                    phase=_s(obj.get("phase"), 40), applied_on=_s(obj.get("date"), 10), deadline=_s(obj.get("deadline"), 10),
                    url=_s(obj.get("url")))
    if model is Job:
        return dict(company=_s(obj.get("company"), 200), role=_s(obj.get("role"), 300), city=_s(obj.get("city"), 60),
                    url=_s(obj.get("url")), status=_s(obj.get("status"), 20), score=_num(obj.get("score")),
                    found_at=_s(obj.get("found") or obj.get("at"), 40))
    if model is Source:
        return dict(company=_s(obj.get("company") or obj.get("name"), 200), url=_s(obj.get("url")),
                    enabled=bool(obj.get("on", True)), last_scanned=_s(obj.get("last"), 40))
    if model is ResumeVersion:
        return dict(company=_s(obj.get("company"), 200), role=_s(obj.get("role"), 300), app_id=_s(obj.get("appId"), 64),
                    saved_at=_s(obj.get("at"), 40))
    return {}


def get_workspace(db: Session, ws: str, create: bool = True) -> Workspace | None:
    w = db.get(Workspace, ws)
    if w is None and create:
        w = Workspace(ws=ws, version=0)
        db.add(w)
        db.flush()
    return w


def bump(db: Session, ws: str) -> int:
    w = get_workspace(db, ws)
    assert w is not None
    w.version += 1
    w.updated_at = datetime.now(timezone.utc)
    return w.version


def _rows(db: Session, model: type[ListRow], ws: str) -> list[dict]:
    rows: Sequence[ListRow] = db.scalars(select(model).where(model.ws == ws).order_by(model.pos)).all()
    return [r.data for r in rows]


def compose(db: Session, ws: str) -> dict | None:
    """数据表 -> 前端状态对象。没有任何数据时返回 None。"""
    docs: dict[str, Any] = {d.key: d.data for d in db.scalars(select(Document).where(Document.ws == ws)).all()}
    order = docs.pop("__order__", None)
    order = order if isinstance(order, list) else None
    if not docs and order is None:
        return None
    state: dict[str, Any] = {}
    keys = order or list(docs.keys()) + list(LIST_TABLES.keys())
    for key in keys:
        if key in LIST_TABLES:
            state[key] = _rows(db, LIST_TABLES[key], ws)
        elif key in docs:
            state[key] = docs[key]
    for key, model in LIST_TABLES.items():
        if key not in state and key in (order or []):
            state[key] = _rows(db, model, ws)
    ap = state.get("autopilot")
    if isinstance(ap, dict):
        ap_order = ap.pop("__order__", None) or list(ap.keys()) + list(AUTOPILOT_LISTS.keys())
        rebuilt: dict[str, Any] = {}
        for k in ap_order:
            if k in AUTOPILOT_LISTS:
                rebuilt[k] = _rows(db, AUTOPILOT_LISTS[k], ws)
            elif k in ap:
                rebuilt[k] = ap[k]
        state["autopilot"] = rebuilt
    return state


def decompose(db: Session, ws: str, state: dict) -> None:
    """前端状态对象 -> 数据表（整份替换该 workspace 的数据）。"""
    tables: tuple[type[WsRow], ...] = (Document, Application, Job, Source, ResumeVersion)
    for model in tables:
        db.execute(delete(model).where(model.ws == ws))
    db.add(Document(ws=ws, key="__order__", data=list(state.keys())))
    for key, value in state.items():
        if key in LIST_TABLES and isinstance(value, list):
            _insert_list(db, LIST_TABLES[key], ws, value)
        elif key == "autopilot" and isinstance(value, dict):
            rest = {k: v for k, v in value.items() if k not in AUTOPILOT_LISTS}
            rest["__order__"] = list(value.keys())
            db.add(Document(ws=ws, key=key, data=rest))
            for k, model in AUTOPILOT_LISTS.items():
                if isinstance(value.get(k), list):
                    _insert_list(db, model, ws, value[k])
        else:
            db.add(Document(ws=ws, key=key, data=value))


def _insert_list(db: Session, model: type[ListRow], ws: str, items: list) -> None:
    seen: set[str] = set()
    for pos, obj in enumerate(items):
        if not isinstance(obj, dict):
            continue
        oid = _s(obj.get("id") or f"{model.__tablename__}-{pos}", 64)
        if oid in seen:  # 前端偶尔有重复 id，保留第一条
            continue
        seen.add(oid)
        db.add(model(ws=ws, id=oid, pos=pos, data=obj, **row_fields(model, obj)))


def save_state(db: Session, ws: str, state: dict, base_version: int | None) -> int:
    """整份写入。base_version 与服务器不一致时抛 VersionConflict（除非为 None 表示强制覆盖）。"""
    w = get_workspace(db, ws)
    assert w is not None
    if base_version is not None and base_version != w.version:
        raise VersionConflict(w.version)
    decompose(db, ws, state)
    v = bump(db, ws)
    db.commit()
    return v
