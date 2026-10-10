"""Error handlers: 500 never silent, database constraint → 409 (API.md « Codes de réponse »)."""

import logging

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import text

from conftest import BASE_URL
from ffe.app import create_app
from ffe.deps import Deps, SessionDep


def app_with_probes(deps: Deps) -> FastAPI:
    app = create_app(deps)

    @app.get("/probe/boom")
    def boom() -> None:
        raise RuntimeError("cassé exprès")

    @app.post("/probe/integrity")
    def integrity(session: SessionDep) -> None:
        with session.begin():
            session.execute(text("UPDATE setting SET default_vat_bp = 99999 WHERE id = 1"))

    return app


def test_unhandled_exception_is_a_logged_500_json(
    deps: Deps, caplog: pytest.LogCaptureFixture
) -> None:
    client = TestClient(app_with_probes(deps), base_url=BASE_URL, raise_server_exceptions=False)
    with caplog.at_level(logging.ERROR, logger="ffe"):
        response = client.get("/probe/boom")
    assert response.status_code == 500
    assert response.json() == {
        "code": "internal_error",
        "message": "Erreur interne : consulter le journal du serveur.",
        "details": [],
    }
    assert "cassé exprès" in caplog.text and "/probe/boom" in caplog.text


def test_database_constraint_violation_is_409_conflict(deps: Deps) -> None:
    client = TestClient(app_with_probes(deps), base_url=BASE_URL)
    response = client.post("/probe/integrity")
    assert response.status_code == 409
    payload = response.json()
    assert payload["code"] == "conflict" and "ck_setting_default_vat_bp_range" in payload["message"]
