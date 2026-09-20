"""整份状态：前端启动时读取、每次保存时写入（带版本号，多窗口不互相覆盖）。"""
import json
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, Response

from ..deps import DB, WS
from ..schemas import Conflict, StateIn, StateOut, StateSaved
from ..services.events import broadcaster
from ..services.state_sync import VersionConflict, compose, get_workspace, save_state

router = APIRouter(prefix="/state", tags=["状态同步"])


@router.get("", response_model=StateOut)
def read_state(db: DB, ws: WS):
    w = get_workspace(db, ws, create=False)
    return StateOut(ws=ws, version=w.version if w else 0, state=compose(db, ws) if w else None)


@router.put("", response_model=StateSaved, responses={409: {"model": Conflict}})
def write_state(body: StateIn, db: DB, ws: WS, client: str = ""):
    try:
        v = save_state(db, ws, body.state, body.base_version)
    except VersionConflict as e:
        db.rollback()
        return JSONResponse(status_code=409, content={"detail": "另一个窗口刚保存过，请先读取最新数据", "version": e.current})
    broadcaster.publish(ws, {"type": "state", "version": v, "client": client})
    return StateSaved(ws=ws, version=v)


@router.get("/export")
def export_state(db: DB, ws: WS):
    state = compose(db, ws)
    if state is None:
        raise HTTPException(404, "这个档案还没有数据")
    name = f"Offer_backup_{ws}_{datetime.now():%Y-%m-%d}.json"
    return Response(json.dumps(state, ensure_ascii=False, indent=1), media_type="application/json",
                    headers={"content-disposition": f"attachment; filename*=UTF-8''{__import__('urllib.parse').parse.quote(name)}"})
