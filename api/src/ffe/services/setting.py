"""Installation settings: the single `setting` row (read, partial update, extension token)."""

import secrets

from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.models import Setting
from ffe.schemas.setting import SettingUpdate
from ffe.services.base import stamp


def get_settings(session: Session) -> Setting:
    setting = session.get(Setting, 1)
    assert setting is not None, "ligne setting absente (migration 0001)"
    return setting


def update_settings(session: Session, data: SettingUpdate, clock: Clock) -> Setting:
    with session.begin():
        setting = get_settings(session)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(setting, key, value)
        setting.updated_at = stamp(clock)
    return setting


def generate_extension_token(session: Session, clock: Clock) -> Setting:
    """A new shared secret for the browser extension (ADR-0017); the previous one stops working."""
    with session.begin():
        setting = get_settings(session)
        setting.extension_token = secrets.token_urlsafe(24)
        setting.updated_at = stamp(clock)
    return setting
