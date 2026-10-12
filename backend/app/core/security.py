import hashlib
import hmac
import secrets
from typing import Optional
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.app.core.config import settings

security_bearer = HTTPBearer(auto_error=False)


def generate_api_token() -> str:
    """Generate a high-entropy API token prefixed with pm_."""
    random_bytes = secrets.token_urlsafe(32)
    return f"pm_{random_bytes}"


def hash_token(token: str) -> str:
    """Hash the token using SHA-256 for secure storage."""
    # Use HMAC with SECRET_KEY as salt/key to prevent rainbow table attacks
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        token.strip().encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


def verify_token_hash(plain_token: str, hashed_token: str) -> bool:
    """Constant-time verification of token hash."""
    computed_hash = hash_token(plain_token)
    return hmac.compare_digest(computed_hash, hashed_token)


def get_token_prefix(token: str) -> str:
    """Return prefix of token for auditing/display purposes without revealing secret."""
    if len(token) > 10:
        return token[:8] + "..."
    return "pm_..."
