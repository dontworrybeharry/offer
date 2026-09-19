"""Offer · 本机后端（FastAPI）

启动：  cd backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8765
接口文档：http://127.0.0.1:8765/docs
"""
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from . import __version__
from .config import Settings, get_settings
from .db import init_engine
from .routers import misc, resources, state
from .services.events import broadcaster


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        init_engine(settings)
        broadcaster.bind_loop(asyncio.get_running_loop())
        yield

    app = FastAPI(title="Offer · 本机后端", version=__version__, lifespan=lifespan,
                  description="本地优先：只监听本机，数据存在本机 SQLite。前端整份状态同步 + 分资源接口 + 大模型服务 + 实时事件。")

    # 只接受发往本机的请求（防 DNS rebinding）；跨域只放行本机页面和 Chrome 插件
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts + ["testserver"])
    app.add_middleware(CORSMiddleware, allow_origin_regex=settings.cors_origin_regex, allow_methods=["*"], allow_headers=["*"])

    api = "/api"
    app.include_router(misc.router, prefix=api)
    app.include_router(state.router, prefix=api)
    for r in (resources.applications, resources.jobs, resources.sources, resources.resumes):
        app.include_router(r, prefix=api)

    # ---------- 页面 ----------
    web = settings.web_root

    @app.get("/", include_in_schema=False)
    def index():
        home = settings.home_html
        if home and home.exists():
            return FileResponse(home, headers={"cache-control": "no-cache"})
        return share()

    @app.get("/share", include_in_schema=False)
    def share():
        f = web / "index.html"
        if not f.exists():
            raise HTTPException(404, "找不到 index.html")
        return FileResponse(f, headers={"cache-control": "no-cache"})

    @app.get("/me", include_in_schema=False)
    def personal():
        f = settings.personal_html
        if not f or not f.exists():
            return RedirectResponse("/")
        return FileResponse(f, headers={"cache-control": "no-cache"})

    @app.get("/sites.json", include_in_schema=False)
    def sites_json():
        return FileResponse(web / "sites.json")

    if (web / "extension").is_dir():
        app.mount("/extension", StaticFiles(directory=web / "extension"), name="extension")
    return app


app = create_app()
