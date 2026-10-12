from datetime import datetime, timezone
from typing import Optional
from fastapi import Depends, HTTPException, Header, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.security import hash_token, security_bearer
from backend.app.models.models import APIToken, utc_now


def get_token_from_request(
    request: Request,
    bearer: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    token_query: Optional[str] = Query(None, alias="token"),
) -> str:
    """Extract raw token string from Bearer header, X-API-Key, or query param."""
    if bearer and bearer.credentials:
        return bearer.credentials.strip()
    if x_api_key:
        return x_api_key.strip()
    if token_query:
        return token_query.strip()
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing authentication token. Use 'Authorization: Bearer <token>' or 'X-API-Key: <token>'.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_token(
    raw_token: str = Depends(get_token_from_request),
    db: Session = Depends(get_db),
) -> APIToken:
    """Validate token against database and check revocation and expiration."""
    hashed = hash_token(raw_token)
    token_obj = db.query(APIToken).filter(APIToken.token_hash == hashed).first()

    # Handle bootstrap token if no tokens registered yet or matches initial token
    if not token_obj and raw_token == settings.INITIAL_ADMIN_TOKEN:
        # Auto-bootstrap initial token if not in DB
        token_obj = APIToken(
            name="Bootstrap Admin Token",
            token_hash=hashed,
            token_prefix=raw_token[:8] + "...",
            is_revoked=False,
            created_at=utc_now(),
        )
        db.add(token_obj)
        db.commit()
        db.refresh(token_obj)

    if not token_obj or token_obj.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if token_obj.expires_at:
        now_utc = datetime.now(timezone.utc)
        expires_utc = token_obj.expires_at if token_obj.expires_at.tzinfo else token_obj.expires_at.replace(tzinfo=timezone.utc)
        if expires_utc < now_utc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API token has expired.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Update last_used_at
    token_obj.last_used_at = utc_now()
    db.commit()

    return token_obj
