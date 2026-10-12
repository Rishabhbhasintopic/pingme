import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
import base64

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from pywebpush import webpush, WebPushException
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.models import (
    Message,
    NotificationDelivery,
    PushSubscription,
    utc_now,
)

logger = logging.getLogger("pingme.push")

_vapid_public_key: Optional[str] = None
_vapid_private_key: Optional[str] = None


def generate_vapid_keypair() -> Tuple[str, str]:
    """Generate a valid P-256 keypair for VAPID."""
    priv = ec.generate_private_key(ec.SECP256R1())
    # 65 bytes uncompressed point
    pub_bytes = priv.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    pub_b64 = base64.urlsafe_b64encode(pub_bytes).decode("utf-8").rstrip("=")

    # 32 bytes raw private key
    priv_bytes = priv.private_numbers().private_value.to_bytes(32, "big")
    priv_b64 = base64.urlsafe_b64encode(priv_bytes).decode("utf-8").rstrip("=")

    return pub_b64, priv_b64


def ensure_vapid_keys() -> Tuple[str, str]:
    """Load or generate persistent VAPID keys."""
    global _vapid_public_key, _vapid_private_key

    if _vapid_public_key and _vapid_private_key:
        return _vapid_public_key, _vapid_private_key

    # Check settings first
    if settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY:
        _vapid_public_key = settings.VAPID_PUBLIC_KEY.strip()
        _vapid_private_key = settings.VAPID_PRIVATE_KEY.strip()
        return _vapid_public_key, _vapid_private_key

    # Check key file in DATA_DIR
    key_file = settings.DATA_DIR / "vapid_keys.json"
    if key_file.exists():
        try:
            with open(key_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                _vapid_public_key = data.get("public_key")
                _vapid_private_key = data.get("private_key")
                if _vapid_public_key and _vapid_private_key:
                    logger.info("Loaded VAPID keys from %s", key_file)
                    return _vapid_public_key, _vapid_private_key
        except Exception as e:
            logger.warning("Failed to load existing VAPID key file: %s", e)

    # Generate new keys and persist
    pub, priv = generate_vapid_keypair()
    try:
        settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(key_file, "w", encoding="utf-8") as f:
            json.dump({"public_key": pub, "private_key": priv}, f, indent=2)
        logger.info("Generated new VAPID keys and saved to %s", key_file)
    except Exception as e:
        logger.error("Failed to persist VAPID keys: %s", e)

    _vapid_public_key = pub
    _vapid_private_key = priv
    return pub, priv


def get_vapid_public_key() -> str:
    pub, _ = ensure_vapid_keys()
    return pub


def send_web_push(
    subscription: PushSubscription,
    payload: Dict[str, Any],
    db: Session,
    message_id: Optional[str] = None,
) -> bool:
    """
    Send Web Push to a single subscription.
    Handles expired/unsubscribed status (HTTP 404, 410) by marking subscription inactive.
    Records delivery attempt.
    """
    pub_key, priv_key = ensure_vapid_keys()
    
    sub_info = {
        "endpoint": subscription.endpoint,
        "keys": {
            "p256dh": subscription.p256dh,
            "auth": subscription.auth,
        },
    }

    delivery = None
    if message_id:
        delivery = NotificationDelivery(
            message_id=message_id,
            subscription_id=subscription.id,
            status="queued",
        )
        db.add(delivery)
        db.flush()

    try:
        payload_str = json.dumps(payload)
        response = webpush(
            subscription_info=sub_info,
            data=payload_str,
            vapid_private_key=priv_key,
            vapid_claims={"sub": settings.VAPID_CLAIMS_SUB},
            timeout=10,
        )

        # Gateway accepted push
        status_code = getattr(response, "status_code", 201)
        subscription.last_active_at = utc_now()
        if delivery:
            delivery.status = "push_accepted"
            delivery.http_status = status_code

        logger.info(
            "Push accepted by gateway (%s) for subscription %s",
            status_code,
            subscription.id,
        )
        db.commit()
        return True

    except WebPushException as ex:
        http_status = None
        if hasattr(ex, "response") and ex.response is not None:
            http_status = getattr(ex.response, "status_code", None)

        err_msg = str(ex)
        logger.warning(
            "Push failed for subscription %s (status %s): %s",
            subscription.id,
            http_status,
            err_msg,
        )

        if delivery:
            delivery.http_status = http_status
            delivery.error_details = err_msg[:500]

        # 404 Not Found or 410 Gone means the subscription is no longer valid
        if http_status in (404, 410):
            subscription.is_active = False
            if delivery:
                delivery.status = "expired"
        else:
            if delivery:
                delivery.status = "failed"

        db.commit()
        return False

    except Exception as ex:
        logger.error("Unexpected error in send_web_push: %s", ex)
        if delivery:
            delivery.status = "failed"
            delivery.error_details = str(ex)[:500]
        db.commit()
        return False


def dispatch_push_for_message(message: Message, db: Session) -> int:
    """
    Queue and send push notifications to all active subscriptions.
    Returns number of gateways that accepted the push.
    """
    active_subscriptions = (
        db.query(PushSubscription).filter(PushSubscription.is_active == True).all()
    )

    if not active_subscriptions:
        logger.info("No active push subscriptions found for message %s", message.id)
        return 0

    payload = {
        "title": message.title or "New Message from Terminal",
        "body": message.content[:200] + ("..." if len(message.content) > 200 else ""),
        "messageId": message.id,
        "conversationId": message.conversation_id,
        "priority": message.priority,
        "timestamp": message.created_at.isoformat(),
        "url": f"/conversations/{message.conversation_id}?message={message.id}",
        "tag": f"pingme-msg-{message.id}",
    }

    accepted_count = 0
    for sub in active_subscriptions:
        if send_web_push(sub, payload, db, message_id=message.id):
            accepted_count += 1

    if accepted_count > 0:
        message.status = "push_accepted"
    else:
        message.status = "queued"
    db.commit()

    return accepted_count
