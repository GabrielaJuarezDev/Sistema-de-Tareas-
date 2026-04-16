import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import Cookie, HTTPException, status
from jose import jwt, JWTError
from passlib.context import CryptContext


COOKIE_NAME = "auth_token"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def _secret() -> str:
    return os.getenv("JWT_SECRET") or "dev_secret_change_me"


def create_token(user_id: int, email: str) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=7)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, _secret(), algorithm="HS256")


def require_user(auth_token: Optional[str] = Cookie(default=None, alias=COOKIE_NAME)) -> dict:
    if not auth_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    try:
        payload = jwt.decode(auth_token, _secret(), algorithms=["HS256"])
        sub = payload.get("sub")
        email = payload.get("email")
        if not sub or not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
        return {"id": int(sub), "email": str(email)}
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

