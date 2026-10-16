"""Installation settings: the single `setting` row (read, partial update, extension token)."""

import secrets
from pathlib import Path

from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.models import Setting
from ffe.schemas.setting import SettingUpdate
from ffe.services.base import stamp
from ffe.services.file import check_logo, unlink_if_orphan


def get_settings(session: Session) -> Setting:
    setting = session.get(Setting, 1)
    assert setting is not None, "ligne setting absente (migration 0001)"
    return setting


def update_settings(
    session: Session, data: SettingUpdate, clock: Clock, files_dir: Path
) -> Setting:
    with session.begin():
        setting = get_settings(session)
        changes = data.model_dump(exclude_unset=True)
        old_logo = setting.agency_logo_file_id
        if changes.get("agency_logo_file_id") not in (None, old_logo):
            check_logo(session, changes["agency_logo_file_id"], "agencyLogoFileId")
        for key, value in changes.items():
            setattr(setting, key, value)
        setting.updated_at = stamp(clock)
    if old_logo is not None and setting.agency_logo_file_id != old_logo:
        unlink_if_orphan(session, files_dir, old_logo)  # a replaced logo leaves the disk
    return setting


def generate_extension_token(session: Session, clock: Clock) -> Setting:
    """A new shared secret for the browser extension (ADR-0017); the previous one stops working."""
    with session.begin():
        setting = get_settings(session)
        setting.extension_token = secrets.token_urlsafe(24)
        setting.updated_at = stamp(clock)
    return setting
