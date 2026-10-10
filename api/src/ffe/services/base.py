"""Helpers shared by services: timestamps from the injected clock, name normalisation."""

import re
import unicodedata
from datetime import UTC

from ffe.deps import Clock


def stamp(clock: Clock) -> str:
    """ISO-8601 UTC with `Z`, second precision (DATA_MODEL §3)."""
    return clock().astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def normalize_key(name: str) -> str:
    """Duplicate-detection key: no accents, case-folded, single spaces (D4.7)."""
    decomposed = unicodedata.normalize("NFD", name)
    stripped = "".join(c for c in decomposed if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", stripped).strip().casefold()
