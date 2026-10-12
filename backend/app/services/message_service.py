import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Set
from fastapi import WebSocket
from sqlalchemy.orm import Session

from backend.app.models.models import Conversation, Message, Reply, utc_now

logger = logging.getLogger("pingme.messages")


class ConnectionManager:
    """Manages active WebSocket connections for live notifications."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info("WebSocket client connected. Total clients: %d", len(self.active_connections))

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.info("WebSocket client disconnected. Total clients: %d", len(self.active_connections))

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        """Broadcast JSON payload to all connected clients."""
        payload = json.dumps({"type": event_type, "data": data})
        async with self._lock:
            clients = list(self.active_connections)

        for client in clients:
            try:
                await client.send_text(payload)
            except Exception as e:
                logger.debug("Failed to send message to websocket client: %s", e)
                async with self._lock:
                    self.active_connections.discard(client)


ws_manager = ConnectionManager()

# Registry for long-polling / wait-for-reply events: message_id -> asyncio.Event
_reply_waiters: Dict[str, List[asyncio.Event]] = {}
_waiter_lock = asyncio.Lock()


async def register_reply_waiter(message_id: str) -> asyncio.Event:
    event = asyncio.Event()
    async with _waiter_lock:
        if message_id not in _reply_waiters:
            _reply_waiters[message_id] = []
        _reply_waiters[message_id].append(event)
    return event


async def unregister_reply_waiter(message_id: str, event: asyncio.Event):
    async with _waiter_lock:
        if message_id in _reply_waiters:
            if event in _reply_waiters[message_id]:
                _reply_waiters[message_id].remove(event)
            if not _reply_waiters[message_id]:
                del _reply_waiters[message_id]


async def notify_reply_arrived(message_id: str):
    """Wake up all coroutines waiting for a reply to this message."""
    async with _waiter_lock:
        waiters = list(_reply_waiters.get(message_id, []))
    for event in waiters:
        event.set()


def get_or_create_conversation(
    db: Session, conversation_id: Optional[str] = None, title: Optional[str] = None
) -> Conversation:
    if conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conv:
            return conv

    # Create new conversation
    conv = Conversation(title=title or "General")
    db.add(conv)
    db.flush()
    return conv
