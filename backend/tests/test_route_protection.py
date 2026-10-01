"""Regression tests: the real app in main.py guards the right routes.

test_security.py checks the dependency itself; this file checks the wiring,
i.e. that auth + saved-recipe routes require the secret and public recipe
routes do not. database.py connects at import time, so a fake module is
installed first and no real database is touched.
"""

import sys
import types
from collections.abc import Iterator
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

SECRET = "route-test-secret"
BACKEND_DIR = Path(__file__).resolve().parents[1]


def _fake_get_db() -> Iterator[MagicMock]:
    # Iterating a MagicMock yields nothing, so read routes return empty results.
    yield MagicMock()


@pytest.fixture(scope="module")
def client() -> Iterator[TestClient]:
    # main.py uses top-level imports (`from routes...`, `from database...`),
    # as when run via `cd backend && uvicorn main:app`.
    sys.path.insert(0, str(BACKEND_DIR))
    fake_db = types.ModuleType("database")
    fake_db.get_db = _fake_get_db  # type: ignore[attr-defined]
    saved = sys.modules.get("database")
    sys.modules["database"] = fake_db
    try:
        import main  # noqa: PLC0415 - must import after the fake db is installed

        yield TestClient(main.app)
    finally:
        sys.path.remove(str(BACKEND_DIR))
        if saved is None:
            sys.modules.pop("database", None)
        else:
            sys.modules["database"] = saved


@pytest.fixture(autouse=True)
def _secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("INTERNAL_API_SECRET", SECRET)


OAUTH_BODY = {"email": "victim@example.com", "name": None, "auth_provider": "credentials"}

PROTECTED = [
    ("post", "/api/auth/oauth", OAUTH_BODY),
    ("post", "/api/auth/login", {"email": "a@b.c", "password": "p"}),
    ("post", "/api/auth/signup", {"email": "a@b.c", "password": "pppppp", "name": "A"}),
    ("get", "/api/users/some-user/saved-recipes", None),
    ("get", "/api/users/some-user/saved-recipes/1", None),
    ("post", "/api/users/some-user/saved-recipes", {"recipe_id": 1}),
    ("delete", "/api/users/some-user/saved-recipes/1", None),
]


@pytest.mark.parametrize(("method", "path", "body"), PROTECTED)
def test_protected_routes_reject_missing_secret(client: TestClient, method: str, path: str, body: dict | None) -> None:
    res = client.request(method.upper(), path, json=body)
    assert res.status_code == 401, f"{method.upper()} {path} should require the internal secret"


@pytest.mark.parametrize(("method", "path", "body"), PROTECTED)
def test_protected_routes_reject_wrong_secret(client: TestClient, method: str, path: str, body: dict | None) -> None:
    res = client.request(method.upper(), path, json=body, headers={"X-Internal-Secret": "wrong"})
    assert res.status_code == 401


def test_oauth_rejects_credentials_provider_even_with_secret(client: TestClient) -> None:
    # The original exploit: provider "credentials" returned a password user's id.
    res = client.post("/api/auth/oauth", json=OAUTH_BODY, headers={"X-Internal-Secret": SECRET})
    assert res.status_code == 422


def test_public_recipe_routes_stay_open(client: TestClient) -> None:
    res = client.get("/api/recipes/filter", params={"name": "apple"})
    assert res.status_code == 200
