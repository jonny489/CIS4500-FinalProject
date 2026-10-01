"""Tests for the internal shared-secret dependency (backend/security.py).

Uses a throwaway app wired exactly like main.py (dependency attached at
include_router) so the header name, status codes and fail-closed behaviour are
exercised end to end without needing a database.
"""

import pytest
from fastapi import APIRouter, Depends, FastAPI
from fastapi.testclient import TestClient

from backend.security import INTERNAL_SECRET_ENV, require_internal_secret

SECRET = "test-secret-value"


@pytest.fixture
def client() -> TestClient:
    router = APIRouter()

    @router.get("/protected")
    def protected() -> dict[str, bool]:
        return {"ok": True}

    app = FastAPI()
    app.include_router(router, dependencies=[Depends(require_internal_secret)])
    return TestClient(app)


def test_correct_secret_is_allowed(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(INTERNAL_SECRET_ENV, SECRET)
    res = client.get("/protected", headers={"X-Internal-Secret": SECRET})
    assert res.status_code == 200
    assert res.json() == {"ok": True}


def test_missing_header_is_rejected(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(INTERNAL_SECRET_ENV, SECRET)
    assert client.get("/protected").status_code == 401


def test_wrong_secret_is_rejected(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(INTERNAL_SECRET_ENV, SECRET)
    res = client.get("/protected", headers={"X-Internal-Secret": "wrong"})
    assert res.status_code == 401


def test_prefix_of_secret_is_rejected(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    # Guards against a comparison that only checks a prefix or length.
    monkeypatch.setenv(INTERNAL_SECRET_ENV, SECRET)
    res = client.get("/protected", headers={"X-Internal-Secret": SECRET[:-1]})
    assert res.status_code == 401


@pytest.mark.parametrize("configured", [None, ""])
def test_unconfigured_server_fails_closed(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, configured: str | None
) -> None:
    # If the env var is missing, nothing gets through, not even an empty header.
    if configured is None:
        monkeypatch.delenv(INTERNAL_SECRET_ENV, raising=False)
    else:
        monkeypatch.setenv(INTERNAL_SECRET_ENV, configured)
    assert client.get("/protected", headers={"X-Internal-Secret": ""}).status_code == 503
    assert client.get("/protected", headers={"X-Internal-Secret": SECRET}).status_code == 503
