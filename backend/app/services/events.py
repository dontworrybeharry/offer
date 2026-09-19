"""进程内事件广播：任何写入都会通知所有打开的页面（Server-Sent Events）。"""
from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from typing import Any


class Broadcaster:
    def __init__(self) -> None:
        self._subs: dict[str, set[asyncio.Queue[str]]] = defaultdict(set)
        self._loop: asyncio.AbstractEventLoop | None = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def subscribe(self, ws: str) -> asyncio.Queue[str]:
        q: asyncio.Queue[str] = asyncio.Queue(maxsize=100)
        self._subs[ws].add(q)
        return q

    def unsubscribe(self, ws: str, q: asyncio.Queue[str]) -> None:
        self._subs[ws].discard(q)

    def publish(self, ws: str, event: dict[str, Any]) -> None:
        """可以在同步路由（线程池）里调用。"""
        msg = json.dumps(event, ensure_ascii=False)
        loop = self._loop
        for q in list(self._subs.get(ws, ())):
            if loop and loop.is_running():
                loop.call_soon_threadsafe(self._put, q, msg)
            else:
                self._put(q, msg)

    @staticmethod
    def _put(q: asyncio.Queue[str], msg: str) -> None:
        try:
            q.put_nowait(msg)
        except asyncio.QueueFull:
            pass

    def count(self, ws: str) -> int:
        return len(self._subs.get(ws, ()))


broadcaster = Broadcaster()
