"""Application settings read from environment variables (master list: ARCHITECTURE §1)."""

from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]
WEB_DIST = REPO_ROOT / "web" / "dist"
PERSIST_ROOT = Path.home() / ".persist"
DB_FILENAME = "ffe.sqlite"
LOCK_FILENAME = "ffe.lock"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FFE_")

    # `dev` (default) keeps every reflex command away from the real data (D3.4).
    env: Literal["dev", "prod"] = "dev"
    # Explicit override of the data directory; refused unless it lives on ext4 (ARCHITECTURE §5).
    data_dir: Path | None = None
    # Windows-visible copy of the backups; only checked at step 3, copied to at step 9.
    backup_dir: Path = Path("/workspaces/Perso/FFE-sauvegardes")
    host: str = "127.0.0.1"
    port: int = 8000
    # Served as static files by the API when it exists (production mode, ARCHITECTURE §1).
    web_dist: Path = WEB_DIST
    # Upload limit (D6b.1): above it, POST /files answers 413.
    max_upload_bytes: int = 20 * 1024 * 1024

    @property
    def is_dev_db(self) -> bool:
        return self.env == "dev"

    @property
    def resolved_data_dir(self) -> Path:
        if self.data_dir is not None:
            return self.data_dir
        return PERSIST_ROOT / ("ffe-dev" if self.is_dev_db else "ffe")

    @property
    def db_path(self) -> Path:
        return self.resolved_data_dir / DB_FILENAME

    @property
    def backups_dir(self) -> Path:
        return self.resolved_data_dir / "backups"

    @property
    def lock_path(self) -> Path:
        return self.resolved_data_dir / LOCK_FILENAME

    @property
    def files_dir(self) -> Path:
        """Attached files, one per sha256 (`<sha256>.<ext>`, DATA_MODEL §4.9)."""
        return self.resolved_data_dir / "files"


def load_settings() -> Settings:
    return Settings()
