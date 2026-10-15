"""Application factory. No I/O at import time: everything comes through `Deps`."""

import ipaddress
import logging
import re
import time
from collections.abc import AsyncGenerator, Awaitable, Callable
from contextlib import asynccontextmanager
from urllib.parse import urlsplit

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.types import ASGIApp, Receive, Scope, Send

from ffe.api.handlers import register_error_handlers
from ffe.api.v1.router import router as v1_router
from ffe.deps import Deps
from ffe.i18n import fr

API_PREFIX = "/api/v1"
log = logging.getLogger("ffe")
# DNS-rebinding guard (D4.5): the API only answers to its own names, with or without a port.
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]
# ADR-0017: only a Chrome extension (any id) may call the API cross-origin, and only on the inbox
# routes (`/captures`, shared token); the web app stays same-origin (Vite proxy). Elsewhere no CORS
# header is ever sent, so no extension or site can read the data (audit 2026-10-15).
EXTENSION_ORIGIN_REGEX = r"^chrome-extension://[a-p]{32}$"
CAPTURES_PREFIX = f"{API_PREFIX}/captures"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


class CapturesOnlyCors:
    """CORS for the extension's inbox routes only (ASGI wrapper)."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app
        self.cors = CORSMiddleware(
            app,
            allow_origin_regex=EXTENSION_ORIGIN_REGEX,
            allow_methods=["GET", "POST"],
            allow_headers=["X-FFE-Token", "Content-Type"],
        )

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and str(scope["path"]).startswith(CAPTURES_PREFIX):
            await self.cors(scope, receive, send)
        else:
            await self.app(scope, receive, send)


def origin_allowed(origin: str | None, host: str | None, path: str) -> bool:
    """A write is accepted from no browser origin (curl, tests), from the page's own origin, from a
    page served on this machine or the local network (the Vite dev server rewrites the Host header;
    Windows reaches WSL by a private address), or from the extension on its inbox routes. A site
    on the internet open in the browser cannot post to the local API."""
    if origin is None:
        return True
    if re.match(EXTENSION_ORIGIN_REGEX, origin):
        return path.startswith(CAPTURES_PREFIX)
    parts = urlsplit(origin)
    if host is not None and parts.netloc == host:
        return True
    name = parts.hostname or ""
    if name == "localhost":
        return True
    try:
        address = ipaddress.ip_address(name)
    except ValueError:
        return False
    return address.is_loopback or address.is_private


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
    app.add_middleware(CapturesOnlyCors)

    @app.middleware("http")
    async def refuse_foreign_writes(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if request.method not in SAFE_METHODS and not origin_allowed(
            request.headers.get("origin"), request.headers.get("host"), request.url.path
        ):
            return JSONResponse(
                {"code": "forbidden", "message": fr.FOREIGN_ORIGIN, "details": []}, status_code=403
            )
        return await call_next(request)

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
