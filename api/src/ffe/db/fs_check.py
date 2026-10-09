"""Refuse to put live data anywhere but on ext4 (ARCHITECTURE §5): 9p and overlay lose WAL and locks."""

from pathlib import Path

from ffe.db import DbError

REQUIRED_FSTYPE = "ext4"
PROC_MOUNTS = Path("/proc/mounts")


class FsCheckError(DbError):
    pass


def _existing_ancestor(path: Path) -> Path:
    current = path.resolve()
    while not current.exists():
        current = current.parent
    return current.resolve()


def mount_of(path: Path, mounts_file: Path = PROC_MOUNTS) -> tuple[str, str]:
    """(mount point, filesystem type) of the longest mount point prefixing the resolved path."""
    target = _existing_ancestor(path)
    best: tuple[str, str] = ("/", "unknown")
    for line in mounts_file.read_text(encoding="utf-8").splitlines():
        parts = line.split()
        if len(parts) < 3:
            continue
        mount_point, fstype = parts[1].replace("\\040", " "), parts[2]
        if target == Path(mount_point) or Path(mount_point) in target.parents:
            if len(mount_point) >= len(best[0]):
                best = (mount_point, fstype)
    return best


def ensure_ext4(path: Path, mounts_file: Path = PROC_MOUNTS) -> None:
    mount_point, fstype = mount_of(path, mounts_file)
    if fstype != REQUIRED_FSTYPE:
        raise FsCheckError(
            f"Dossier de données refusé : {path} est monté sur « {mount_point} » "
            f"de type « {fstype} », « {REQUIRED_FSTYPE} » attendu (~/.persist). "
            "Jamais de base SQLite sur /workspaces (9p) ni sur l'overlay."
        )
