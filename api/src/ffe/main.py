"""uvicorn entry point (`ffe serve`): startup cycle first, then the application (ARCHITECTURE §5).

Any failure of the cycle stops the process before anything is served; the database is untouched.
Step 9: `logs/ffe.log`, hourly backup timer (24 h rule) and a backup at shutdown when the base
changed since the last one.
"""

import logging
import sys

from ffe.app import create_app
from ffe.config import load_settings
from ffe.db import DbError
from ffe.db.scheduler import BackupScheduler
from ffe.db.startup import run_startup, utcnow
from ffe.deps import Deps, RuntimeStatus
from ffe.devreset import reset_dev
from ffe.logs import configure_logging

settings = load_settings()
try:
    started = run_startup(settings, on_drift=reset_dev)
except DbError as error:
    print(f"FFE : démarrage refusé — {error}", file=sys.stderr)
    raise SystemExit(1) from None

log_path = configure_logging(settings.logs_dir)
log = logging.getLogger("ffe")
log.info("démarrage : base %s, sauvegarde %s", settings.db_path, started.backup_path or "récente")
if started.reset_note:
    log.warning(started.reset_note)
if started.backup_copy_error:
    log.warning("copie Windows : %s", started.backup_copy_error)

scheduler = BackupScheduler(started.engine, settings, utcnow)
scheduler.start()


def shutdown() -> None:
    scheduler.stop()
    scheduler.tick(modified_rule=True)
    started.close()
    log.info("arrêt")


app = create_app(
    Deps(
        settings=settings,
        engine=started.engine,
        on_shutdown=[shutdown],
        status=RuntimeStatus(last_quick_check="ok", log_path=str(log_path)),
    )
)
