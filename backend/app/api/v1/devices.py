from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_token
from backend.app.core.database import get_db
from backend.app.models.models import APIToken, Device, PushSubscription, utc_now
from backend.app.schemas.schemas import DeviceRegisterRequest, DeviceResponse

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.get("", response_model=List[DeviceResponse])
def list_devices(
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """List all registered client devices."""
    devices = db.query(Device).order_by(Device.last_seen_at.desc()).all()
    results = []
    for d in devices:
        sub_count = (
            db.query(PushSubscription)
            .filter(PushSubscription.device_id == d.id, PushSubscription.is_active == True)
            .count()
        )
        results.append(
            DeviceResponse(
                id=d.id,
                name=d.name,
                platform=d.platform,
                last_seen_at=d.last_seen_at,
                created_at=d.created_at,
                subscription_count=sub_count,
            )
        )
    return results


@router.post("/register", response_model=DeviceResponse)
def register_device(
    payload: DeviceRegisterRequest,
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """Register a new device or update existing device's last_seen timestamp."""
    device = None
    if payload.id:
        device = db.query(Device).filter(Device.id == payload.id).first()

    if device:
        device.name = payload.name
        device.platform = payload.platform
        device.user_agent = payload.user_agent
        device.last_seen_at = utc_now()
    else:
        device = Device(
            id=payload.id if payload.id else None,
            name=payload.name,
            platform=payload.platform,
            user_agent=payload.user_agent,
            last_seen_at=utc_now(),
            created_at=utc_now(),
        )
        db.add(device)

    db.commit()
    db.refresh(device)

    sub_count = (
        db.query(PushSubscription)
        .filter(PushSubscription.device_id == device.id, PushSubscription.is_active == True)
        .count()
    )

    return DeviceResponse(
        id=device.id,
        name=device.name,
        platform=device.platform,
        last_seen_at=device.last_seen_at,
        created_at=device.created_at,
        subscription_count=sub_count,
    )


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(
    device_id: str,
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """Delete device and associated push subscriptions."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    db.delete(device)
    db.commit()
    return None
