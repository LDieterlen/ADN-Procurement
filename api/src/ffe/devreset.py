"""`ffe db reset-dev` and step 8 of the startup cycle (dev only, ADR-0020): rebuild the dev
database at the models' schema, then the demo project and the contacts directory
(`FFE_DEV_CONTACTS_CSV`). Lives outside `db/` because it needs the services."""

import logging
from collections.abc import Callable
from datetime import datetime

from sqlalchemy import Engine
from sqlalchemy.orm import Session

from ffe.config import Settings
from ffe.db.reset import build_dev_database, discard_dev_database, install_dev_database
from ffe.demo import seed_demo
from ffe.services.contact_import import decode_contacts, import_contacts

Clock = Callable[[], datetime]
log = logging.getLogger("ffe")


def reset_dev(settings: Settings, engine: Engine, clock: Clock) -> tuple[Engine, str]:
    """Returns the new engine and a one-line summary. The old database stays in place until the
    new one is complete (see `ffe.db.reset`)."""
    building, types = build_dev_database(settings, clock)
    try:
        project = seed_demo(building, clock)
        contacts = ""
        csv = settings.dev_contacts_csv
        if csv is not None and csv.is_file():
            with Session(building, expire_on_commit=False) as session:
                result = import_contacts(session, decode_contacts(csv.read_bytes()), clock)
            contacts = (
                f", annuaire {result.suppliers_created + result.professionals_created} contacts"
            )
    except BaseException:
        discard_dev_database(settings, building)
        raise
    fresh, made = install_dev_database(settings, engine, building, clock)
    summary = (
        f"base de dev recréée (sauvegarde {made.name if made else 'aucune'}) : "
        f"{types} types, projet d'exemple {project.code if project else 'présent'}{contacts}"
    )
    log.info(summary)
    return fresh, summary
