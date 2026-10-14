"""Refuse to put live data on a disk that loses WAL and locks (ARCHITECTURE §5): on Linux anything
but ext4 (9p, overlay); on macOS a synced folder (iCloud, Dropbox…) or a mounted volume (ADR-0019)."""

import sys
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


# Under the home directory, these are synced by a cloud client: never live data there.
MAC_SYNCED = ("Library/Mobile Documents", "Library/CloudStorage")


def ensure_mac_local(path: Path, home: Path) -> None:
    """macOS: the data directory sits on the Mac's own disk, under the home, outside synced folders."""
    target, home = path.resolve(), home.resolve()
    synced = [home / folder for folder in MAC_SYNCED]
    if not target.is_relative_to(home) or any(target.is_relative_to(s) for s in synced):
        raise FsCheckError(
            f"Dossier de données refusé : {path} doit être sur le disque du Mac, dans le dossier "
            "personnel, hors iCloud Drive, Dropbox, OneDrive, Google Drive et disques externes."
        )


def ensure_safe_data_dir(path: Path, platform: str = sys.platform) -> None:
    if platform == "darwin":
        ensure_mac_local(path, Path.home())
    elif platform.startswith("linux"):
        ensure_ext4(path)
    else:
        raise FsCheckError(f"Système non pris en charge ({platform}) : Linux ou macOS.")
