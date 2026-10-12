import json
import logging
from typing import Optional
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.database import SessionLocal
from backend.app.core.security import hash_token
from backend.app.models.models import APIToken
from backend.app.services.message_service import ws_manager

logger = logging.getLogger("pingme.ws")
router = APIRouter(tags=["WebSocket"])


def validate_ws_token(raw_token: Optional[str]) -> bool:
    if not raw_token:
        return False
    if raw_token == settings.INITIAL_ADMIN_TOKEN:
        return True
    hashed = hash_token(raw_token)
    db: Session = SessionLocal()
    try:
        token_obj = db.query(APIToken).filter(APIToken.token_hash == hashed).first()
        return bool(token_obj and not token_obj.is_revoked)
    finally:
        db.close()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
):
    """
    WebSocket connection endpoint for real-time messages and replies.
    Requires valid API token as query param ?token=...
    """
    if not validate_ws_token(token):
        await websocket.close(code=4001, reason="Unauthorized: Invalid token")
        return

    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep-alive loop and listen for client events (e.g. ping)
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.debug("WebSocket error: %s", e)
        await ws_manager.disconnect(websocket)
