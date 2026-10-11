"""Hourly timer applying the 24 h backup rule while the server runs, and the shutdown backup
(ARCHITECTURE §5 « Sauvegardes », step 9). One daemon thread; `tick()` is what tests call."""

import logging
import threading
from collections.abc import Callable
from datetime import datetime

from sqlalchemy import Engine

from ffe.config import Settings
from ffe.db.backup import BackupResult, backup_and_copy, needs_backup

Clock = Callable[[], datetime]
log = logging.getLogger("ffe")
HOUR = 3600.0


class BackupScheduler:
    def __init__(
        self, engine: Engine, settings: Settings, clock: Clock, interval_seconds: float = HOUR
    ) -> None:
        self._engine = engine
        self._settings = settings
        self._clock = clock
        self._interval = interval_seconds
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, name="ffe-backup", daemon=True)

    def tick(self, modified_rule: bool = False) -> BackupResult | None:
        """One check: backs up when the rule says so; errors are logged, never raised."""
        if not needs_backup(self._settings, self._clock(), modified_rule=modified_rule):
            return None
        try:
            result = backup_and_copy(self._engine, self._settings, self._clock)
        except Exception:
            log.exception("sauvegarde automatique échouée")
            return None
        log.info("sauvegarde automatique : %s", result.path)
        return result

    def _run(self) -> None:
        while not self._stop.wait(self._interval):
            self.tick()

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread.is_alive():
            self._thread.join(timeout=5)
