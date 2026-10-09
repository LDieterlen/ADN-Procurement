"""Application factory. No I/O at import time: everything comes through `Deps`."""

from dataclasses import dataclass, field

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from ffe.api.v1.router import router as v1_router
from ffe.config import Settings

API_PREFIX = "/api/v1"


@dataclass
class Deps:
    """Everything the application needs from the outside world (settings, later: engine, clock)."""

    settings: Settings = field(default_factory=Settings)


def create_app(deps: Deps | None = None) -> FastAPI:
    deps = deps or Deps()
    app = FastAPI(title="FFE", version="0.1.0", openapi_url="/openapi.json")
    app.include_router(v1_router, prefix=API_PREFIX)

    dist = deps.settings.web_dist
    if (dist / "index.html").is_file():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

        @app.get("/{path:path}", include_in_schema=False)
        def spa_fallback(path: str) -> FileResponse:
            candidate = dist / path
            if path and candidate.is_file():
                return FileResponse(candidate)
            return FileResponse(dist / "index.html")

    return app
