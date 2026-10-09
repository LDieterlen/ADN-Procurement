"""Single-instance lock on `ffe.lock` (fcntl.flock, D3.5): one server, or one CLI, at a time."""

import fcntl
from pathlib import Path
from types import TracebackType

from ffe.db import DbError


class LockError(DbError):
    pass


class InstanceLock:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._handle = None

    def acquire(self) -> None:
        handle = self.path.open("a+")
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            handle.close()
            raise LockError(f"FFE tourne déjà (verrou {self.path}).") from None
        self._handle = handle

    def release(self) -> None:
        if self._handle is None:
            return
        fcntl.flock(self._handle.fileno(), fcntl.LOCK_UN)
        self._handle.close()
        self._handle = None

    @property
    def held(self) -> bool:
        return self._handle is not None

    def __enter__(self) -> InstanceLock:
        self.acquire()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        self.release()
