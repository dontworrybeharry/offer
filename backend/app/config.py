"""运行配置。全部可用环境变量（前缀 QZ_）或 backend/.env 覆盖。"""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
WEB_ROOT = BACKEND_DIR.parent  # 秋招作战台-通用版/：index.html、sites.json、extension/


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="QZ_", env_file=BACKEND_DIR / ".env", extra="ignore")

    host: str = "127.0.0.1"
    port: int = 8765
    # 数据库所在目录（SQLite）。个人使用建议放在不上传的位置。
    data_dir: Path = BACKEND_DIR / "data"
    # 网页根目录：/ 返回这里的 index.html
    web_root: Path = WEB_ROOT
    # 可选：另一个页面挂在 /me（例如带个人数据的版本），只在本机提供
    personal_html: Path | None = None
    # 可选：打开 / 时返回这个页面（例如你自己的 Offer）；不设置则返回 web_root/index.html
    home_html: Path | None = None
    # 允许访问的 Host（防 DNS rebinding），以及允许跨域的来源（插件 / 本机开发）
    allowed_hosts: list[str] = ["127.0.0.1", "localhost"]
    cors_origin_regex: str = r"^(chrome-extension://[a-p]{32}|http://(127\.0\.0\.1|localhost)(:\d+)?)$"
    # 调用大模型的超时（秒）
    llm_timeout: float = 120.0

    @property
    def db_path(self) -> Path:
        return self.data_dir / "qzzt.sqlite3"


@lru_cache
def get_settings() -> Settings:
    return Settings()
