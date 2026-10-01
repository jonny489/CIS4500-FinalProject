"""Shared-secret check for routes that only the Next.js server may call.

The auth and saved-recipe routes trust the user_id they are given, so they must
not be reachable from the open internet. The Next.js server verifies the user's
session, then calls these routes with INTERNAL_API_SECRET in a header. Browsers
never see the secret, so they cannot call these routes directly.
"""

import hmac
import os

from fastapi import Header, HTTPException

INTERNAL_SECRET_ENV = "INTERNAL_API_SECRET"


def require_internal_secret(x_internal_secret: str | None = Header(default=None)) -> None:
    """FastAPI dependency: reject requests without the shared internal secret.

    Reads the env var per request (not at import) so tests and config reloads see
    the current value.
    """
    expected = os.getenv(INTERNAL_SECRET_ENV)
    if not expected:
        # Fail closed: a missing secret must never silently mean "no check".
        raise HTTPException(status_code=503, detail=f"{INTERNAL_SECRET_ENV} is not configured on the server")

    # compare_digest takes the same time however many characters match, so the
    # secret can't be guessed one character at a time from response timings.
    if x_internal_secret is None or not hmac.compare_digest(x_internal_secret.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Missing or invalid internal API secret")
