"""Database layer: the only package that talks to `sqlite3`, the engine and Alembic."""


class DbError(Exception):
    """Base class for every failure of the database layer; the message is shown to the user."""
