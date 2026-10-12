from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_token
from backend.app.core.database import get_db
from backend.app.core.security import generate_api_token, get_token_prefix, hash_token
from backend.app.models.models import APIToken, utc_now
from backend.app.schemas.schemas import TokenCreateRequest, TokenListItem, TokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/tokens", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def create_token(
    payload: TokenCreateRequest,
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """Generate a new high-entropy API token. Revealed plain text only once."""
    plain_token = generate_api_token()
    token_hash = hash_token(plain_token)
    prefix = get_token_prefix(plain_token)

    expires_at = None
    if payload.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=payload.expires_in_days)

    token_obj = APIToken(
        name=payload.name,
        token_hash=token_hash,
        token_prefix=prefix,
        is_revoked=False,
        expires_at=expires_at,
        created_at=utc_now(),
    )
    db.add(token_obj)
    db.commit()
    db.refresh(token_obj)

    return TokenResponse(
        id=token_obj.id,
        name=token_obj.name,
        token_prefix=token_obj.token_prefix,
        plain_token=plain_token,
        created_at=token_obj.created_at,
        expires_at=token_obj.expires_at,
    )


@router.get("/tokens", response_model=List[TokenListItem])
def list_tokens(
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """List all API tokens with metadata and revocation status (hashes redacted)."""
    return db.query(APIToken).order_by(APIToken.created_at.desc()).all()


@router.delete("/tokens/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_token(
    token_id: str,
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """Revoke an existing API token immediately."""
    token_obj = db.query(APIToken).filter(APIToken.id == token_id).first()
    if not token_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found",
        )
    token_obj.is_revoked = True
    db.commit()
    return None


@router.get("/verify")
def verify_token(current_token: APIToken = Depends(get_current_token)):
    """Health check for currently used token."""
    return {
        "valid": True,
        "token_id": current_token.id,
        "name": current_token.name,
        "prefix": current_token.token_prefix,
    }
