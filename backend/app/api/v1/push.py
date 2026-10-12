from typing import Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_token
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.models import APIToken, Device, PushSubscription, utc_now
from backend.app.schemas.schemas import (
    PushSubscriptionCreate,
    PushSubscriptionResponse,
    VapidPublicKeyResponse,
)
from backend.app.services.push_service import (
    get_vapid_public_key,
    send_web_push,
)

router = APIRouter(prefix="/push", tags=["Web Push"])


class UnsubscribeRequest(BaseModel):
    endpoint: str


@router.get("/vapid-public-key", response_model=VapidPublicKeyResponse)
def get_public_key():
    """Retrieve public VAPID key needed for client-side PushManager.subscribe()."""
    pub_key = get_vapid_public_key()
    return VapidPublicKeyResponse(
        public_key=pub_key,
        subject=settings.VAPID_CLAIMS_SUB,
    )


@router.post("/subscribe", response_model=PushSubscriptionResponse, status_code=status.HTTP_201_CREATED)
def subscribe(
    payload: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """Register or update a Web Push subscription for a device."""
    device = db.query(Device).filter(Device.id == payload.device_id).first()
    if not device:
        # Create device if missing
        device = Device(
            id=payload.device_id,
            name="iPhone PWA",
            platform="iOS",
            user_agent=payload.user_agent,
            last_seen_at=utc_now(),
            created_at=utc_now(),
        )
        db.add(device)
        db.flush()

    sub = db.query(PushSubscription).filter(PushSubscription.endpoint == payload.endpoint).first()
    if sub:
        sub.device_id = payload.device_id
        sub.p256dh = payload.keys.p256dh
        sub.auth = payload.keys.auth
        sub.user_agent = payload.user_agent
        sub.is_active = True
        sub.last_active_at = utc_now()
    else:
        sub = PushSubscription(
            device_id=payload.device_id,
            endpoint=payload.endpoint,
            p256dh=payload.keys.p256dh,
            auth=payload.keys.auth,
            user_agent=payload.user_agent,
            is_active=True,
            created_at=utc_now(),
            last_active_at=utc_now(),
        )
        db.add(sub)

    db.commit()
    db.refresh(sub)
    return sub


@router.delete("/subscribe", status_code=status.HTTP_204_NO_CONTENT)
def unsubscribe(
    payload: UnsubscribeRequest,
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """Deactivate or remove a push subscription."""
    sub = db.query(PushSubscription).filter(PushSubscription.endpoint == payload.endpoint).first()
    if sub:
        sub.is_active = False
        db.commit()
    return None


@router.post("/test")
def test_push(
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """Trigger a diagnostic push notification to test device receipt."""
    subscriptions = (
        db.query(PushSubscription).filter(PushSubscription.is_active == True).all()
    )
    if not subscriptions:
        return {
            "status": "warning",
            "message": "No active push subscriptions found. Please enable notifications in the PWA first.",
            "sent_count": 0,
        }

    test_payload = {
        "title": "PINGME Test Notification",
        "body": "Push notifications are working correctly on your device!",
        "messageId": "test",
        "conversationId": "test",
        "priority": "normal",
        "timestamp": utc_now().isoformat(),
        "url": "/",
        "tag": "pingme-test",
    }

    success_count = 0
    for sub in subscriptions:
        if send_web_push(sub, test_payload, db):
            success_count += 1

    return {
        "status": "success" if success_count > 0 else "failed",
        "accepted_by_gateway": success_count,
        "total_targets": len(subscriptions),
    }
