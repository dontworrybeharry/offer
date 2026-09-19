"""数据库连接：SQLite（WAL 模式，适合一台电脑上多个浏览器窗口同时读写）。"""
from collections.abc import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import Settings, get_settings


class Base(DeclarativeBase):
    pass


_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def init_engine(settings: Settings | None = None) -> Engine:
    """创建引擎并建表。测试里可以传入指向临时目录的 Settings。"""
    global _engine, _SessionLocal
    settings = settings or get_settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    _engine = create_engine(f"sqlite:///{settings.db_path}", connect_args={"check_same_thread": False})

    @event.listens_for(_engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _):  # noqa: ANN001
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA foreign_keys=ON")
        cur.execute("PRAGMA busy_timeout=5000")
        cur.close()

    from . import models  # noqa: F401  注册所有表

    Base.metadata.create_all(_engine)
    _SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False)
    return _engine


def get_db() -> Iterator[Session]:
    if _SessionLocal is None:
        init_engine()
    assert _SessionLocal is not None
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()
