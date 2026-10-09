"""uvicorn entry point (`ffe serve`): startup cycle first, then the application (ARCHITECTURE §5).

Any failure of the cycle stops the process before anything is served; the database is untouched.
"""

import sys

from ffe.app import create_app
from ffe.config import load_settings
from ffe.db import DbError
from ffe.db.startup import run_startup
from ffe.deps import Deps

settings = load_settings()
try:
    started = run_startup(settings)
except DbError as error:
    print(f"FFE : démarrage refusé — {error}", file=sys.stderr)
    raise SystemExit(1) from None

app = create_app(Deps(settings=settings, engine=started.engine, on_shutdown=[started.close]))
