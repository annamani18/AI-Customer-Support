"""
Authentication helpers: password hashing, JWT issuing/validation, and the
get_current_user dependency used to protect endpoints.

Set a real JWT_SECRET_KEY in your .env file before deploying anywhere
outside your own machine:

    JWT_SECRET_KEY=some-long-random-string
"""

import os
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db, User

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-only-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Declaring this as a proper security scheme (instead of a plain Header())
# is what makes the padlock / "Authorize" button show up in Swagger UI (/docs).
bearer_scheme = HTTPBearer()

# bcrypt has a hard 72-byte limit on the input password. Passwords are
# truncated to that length before hashing/verifying (this matches what
# passlib's bcrypt backend did under the hood, so no behavior change).
BCRYPT_MAX_BYTES = 72


def hash_password(password: str) -> str:
    pw_bytes = password.encode("utf-8")[:BCRYPT_MAX_BYTES]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    pw_bytes = plain_password.encode("utf-8")[:BCRYPT_MAX_BYTES]
    try:
        return bcrypt.checkpw(pw_bytes, hashed_password.encode("utf-8"))
    except ValueError:
        # Malformed/unsupported hash in the DB
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Reads the 'Authorization: Bearer <token>' header, validates the JWT,
    and returns the matching User row. Raises 401 on any failure."""

    credentials_error = HTTPException(status_code=401, detail="Could not validate credentials")

    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_error
    except JWTError:
        raise credentials_error

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_error

    return user
