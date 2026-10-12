from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.sql import text

from backend.app.core.database import get_db
from backend.app.models.models import Device, Message, PushSubscription, utc_now
from backend.app.schemas.schemas import HealthResponse
from backend.app.services.push_service import ensure_vapid_keys

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    """System health check endpoint."""
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    vapid_configured = False
    try:
        pub, priv = ensure_vapid_keys()
        vapid_configured = bool(pub and priv)
    except Exception:
        vapid_configured = False

    active_subs = 0
    device_count = 0
    message_count = 0
    try:
        active_subs = db.query(PushSubscription).filter(PushSubscription.is_active == True).count()
        device_count = db.query(Device).count()
        message_count = db.query(Message).count()
    except Exception:
        pass

    return HealthResponse(
        status="ok" if db_status == "healthy" else "degraded",
        database=db_status,
        vapid_configured=vapid_configured,
        active_subscriptions=active_subs,
        registered_devices=device_count,
        total_messages=message_count,
        timestamp=utc_now(),
    )
