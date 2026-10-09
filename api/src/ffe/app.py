"""Application factory. No I/O at import time: everything comes through `Deps`."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from ffe.api.v1.router import router as v1_router
from ffe.deps import Deps

API_PREFIX = "/api/v1"


def create_app(deps: Deps | None = None) -> FastAPI:
    deps = deps or Deps()

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
        yield
        for callback in deps.on_shutdown:
            callback()

    app = FastAPI(title="FFE", version="0.1.0", openapi_url="/openapi.json", lifespan=lifespan)
    app.state.deps = deps
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
