"""Alembic environment: batch mode, type comparison, shared metadata (ARCHITECTURE §5).

Two callers: `ffe.db.migrate` passes an open connection in `config.attributes["connection"]`;
the `alembic` CLI opens the engine on the configured data directory (dev by default).
"""

from alembic import context
from sqlalchemy import Connection

from ffe.models import Base

config = context.config
target_metadata = Base.metadata


def _run(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        render_as_batch=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connection = config.attributes.get("connection")
    if connection is not None:
        _run(connection)
        return
    from ffe.config import load_settings
    from ffe.db.engine import create_db_engine
    from ffe.db.startup import prepare_data_dir

    settings = load_settings()
    prepare_data_dir(settings)
    engine = create_db_engine(settings.db_path)
    try:
        with engine.connect() as conn:
            _run(conn)
            conn.commit()
    finally:
        engine.dispose()


if context.is_offline_mode():
    raise RuntimeError(
        "Mode hors ligne non pris en charge : les migrations s'appliquent à une base."
    )
run_migrations_online()
