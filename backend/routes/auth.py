import uuid
from typing import Literal

import bcrypt
from database import get_db
from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extensions import connection
from pydantic import BaseModel

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    email: str
    password: str
    name: str


class OAuthRequest(BaseModel):
    email: str
    name: str | None
    # Only real OAuth providers. Accepting any string let a caller pass
    # "credentials" and get back a password user's user_id without the password.
    auth_provider: Literal["google", "github"]


@router.post("/api/auth/login")
def login(req: LoginRequest, db: connection = Depends(get_db)):
    cursor = db.cursor()
    try:
        cursor.execute(
            "SELECT user_id, email, name, password_hash FROM users WHERE email = %s AND auth_provider = 'credentials'",
            (req.email,),
        )
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        user_id, email, name, password_hash = row
        if not bcrypt.checkpw(req.password.encode("utf-8"), password_hash.encode("utf-8")):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        return {"user_id": user_id, "email": email, "name": name}
    finally:
        cursor.close()


@router.post("/api/auth/signup")
def signup(req: SignupRequest, db: connection = Depends(get_db)):
    cursor = db.cursor()
    try:
        cursor.execute("SELECT user_id FROM users WHERE email = %s", (req.email,))
        if cursor.fetchone() is not None:
            raise HTTPException(status_code=409, detail="Email already registered")

        user_id = str(uuid.uuid4())
        password_hash = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        cursor.execute(
            "INSERT INTO users (user_id, email, name, password_hash, auth_provider) VALUES (%s, %s, %s, %s, 'credentials')",
            (user_id, req.email, req.name, password_hash),
        )
        db.commit()
        return {"user_id": user_id, "email": req.email, "name": req.name}
    finally:
        cursor.close()


@router.post("/api/auth/oauth")
def oauth_login(req: OAuthRequest, db: connection = Depends(get_db)):
    cursor = db.cursor()
    try:
        cursor.execute(
            "SELECT user_id, email, name FROM users WHERE email = %s AND auth_provider = %s",
            (req.email, req.auth_provider),
        )
        row = cursor.fetchone()

        if row is not None:
            return {"user_id": row[0], "email": row[1], "name": row[2]}

        user_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO users (user_id, email, name, auth_provider) VALUES (%s, %s, %s, %s)",
            (user_id, req.email, req.name, req.auth_provider),
        )
        db.commit()
        return {"user_id": user_id, "email": req.email, "name": req.name}
    finally:
        cursor.close()
