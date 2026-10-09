"""Application settings read from environment variables (master list: ARCHITECTURE §1)."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]
WEB_DIST = REPO_ROOT / "web" / "dist"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FFE_")

    host: str = "127.0.0.1"
    port: int = 8000
    # Served as static files by the API when it exists (production mode, ARCHITECTURE §1).
    web_dist: Path = WEB_DIST


def load_settings() -> Settings:
    return Settings()
