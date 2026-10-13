"""Application factory. No I/O at import time: everything comes through `Deps`."""

import logging
import time
from collections.abc import AsyncGenerator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from ffe.api.handlers import register_error_handlers
from ffe.api.v1.router import router as v1_router
from ffe.deps import Deps

API_PREFIX = "/api/v1"
log = logging.getLogger("ffe")
# DNS-rebinding guard (D4.5): the API only answers to its own names, with or without a port.
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]
# ADR-0017: only a Chrome extension (any id) may call the API cross-origin, and only with the
# shared token checked by the inbox routes; the web app stays same-origin (Vite proxy).
EXTENSION_ORIGIN_REGEX = r"^chrome-extension://[a-p]{32}$"


def create_app(deps: Deps | None = None) -> FastAPI:
    deps = deps or Deps()

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
        yield
        for callback in deps.on_shutdown:
            callback()

    app = FastAPI(title="FFE", version="0.1.0", openapi_url="/openapi.json", lifespan=lifespan)
    app.state.deps = deps
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=ALLOWED_HOSTS)
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=EXTENSION_ORIGIN_REGEX,
        allow_methods=["GET", "POST"],
        allow_headers=["X-FFE-Token", "Content-Type"],
    )

    @app.middleware("http")
    async def log_request(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        started = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            # The 500 itself, with its trace, is logged by `internal_handler` outside this chain.
            elapsed_ms = round((time.perf_counter() - started) * 1000)
            log.info("%s %s 500 %dms", request.method, request.url.path, elapsed_ms)
            raise
        elapsed_ms = round((time.perf_counter() - started) * 1000)
        log.info(
            "%s %s %d %dms", request.method, request.url.path, response.status_code, elapsed_ms
        )
        return response

    register_error_handlers(app)
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
