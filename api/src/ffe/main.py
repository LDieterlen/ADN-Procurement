"""uvicorn entry point (`ffe serve` and `uvicorn ffe.main:app`). The startup cycle arrives at step 3."""

from ffe.app import Deps, create_app
from ffe.config import load_settings

app = create_app(Deps(settings=load_settings()))
