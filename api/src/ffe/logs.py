"""`logs/ffe.log`: one line per request, every 500 with its trace (ARCHITECTURE §5).

Size rotation, two files at most. Configured once by `main.py` (and by tests on a temp dir);
the application itself only logs through `logging.getLogger("ffe")`.
"""

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

MAX_BYTES = 5 * 1024 * 1024
BACKUP_COUNT = 1
FORMAT = "%(asctime)s %(levelname)s %(message)s"


def configure_logging(logs_dir: Path) -> Path:
    logs_dir.mkdir(parents=True, exist_ok=True)
    path = logs_dir / "ffe.log"
    logger = logging.getLogger("ffe")
    logger.setLevel(logging.INFO)
    for existing in list(logger.handlers):
        if isinstance(existing, RotatingFileHandler):
            logger.removeHandler(existing)
            existing.close()
    handler = RotatingFileHandler(
        path, maxBytes=MAX_BYTES, backupCount=BACKUP_COUNT, encoding="utf-8"
    )
    handler.setFormatter(logging.Formatter(FORMAT))
    logger.addHandler(handler)
    return path
