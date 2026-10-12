import asyncio
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session, joinedload

from backend.app.api.deps import get_current_token
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.models import (
    APIToken,
    Conversation,
    Message,
    Reply,
    utc_now,
)
from backend.app.schemas.schemas import (
    MessageCreateRequest,
    MessageListResponse,
    MessageResponse,
    ReplyCreateRequest,
    ReplyResponse,
)
from backend.app.services.message_service import (
    get_or_create_conversation,
    notify_reply_arrived,
    register_reply_waiter,
    unregister_reply_waiter,
    ws_manager,
)
from backend.app.services.push_service import dispatch_push_for_message

logger = logging.getLogger("pingme.messages_api")
router = APIRouter(prefix="/messages", tags=["Messages"])


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_message(
    payload: MessageCreateRequest,
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """Create a new message, queue push notification, and broadcast live event."""
    # Check idempotency
    if payload.idempotency_key:
        existing = (
            db.query(Message)
            .filter(Message.idempotency_key == payload.idempotency_key)
            .first()
        )
        if existing:
            return existing

    # Find or create conversation
    conv = get_or_create_conversation(
        db,
        conversation_id=payload.conversation_id,
        title=payload.title or "Conversation",
    )

    message = Message(
        conversation_id=conv.id,
        title=payload.title,
        content=payload.content,
        priority=payload.priority,
        status="created",
        sender="cli",
        sender_device=payload.sender_device,
        idempotency_key=payload.idempotency_key,
        created_at=utc_now(),
    )
    db.add(message)
    conv.updated_at = utc_now()
    db.commit()
    db.refresh(message)

    # Dispatch Web Push
    try:
        dispatch_push_for_message(message, db)
    except Exception as e:
        logger.error("Error dispatching push notifications: %s", e)

    # Broadcast event via WebSocket
    message_data = {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "title": message.title,
        "content": message.content,
        "priority": message.priority,
        "status": message.status,
        "sender": message.sender,
        "sender_device": message.sender_device,
        "created_at": message.created_at.isoformat(),
        "replies": [],
    }
    asyncio.create_task(ws_manager.broadcast("message_created", message_data))

    return message


@router.get("", response_model=MessageListResponse)
def list_messages(
    conversation_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """List messages with pagination and optional conversation/status filters."""
    query = db.query(Message).options(joinedload(Message.replies))
    if conversation_id:
        query = query.filter(Message.conversation_id == conversation_id)
    if status_filter:
        query = query.filter(Message.status == status_filter)

    total = query.count()
    items = query.order_by(Message.created_at.desc()).offset(offset).limit(limit).all()

    return MessageListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{message_id}", response_model=MessageResponse)
def get_message(
    message_id: str,
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """Retrieve message details by ID."""
    message = (
        db.query(Message)
        .options(joinedload(Message.replies))
        .filter(Message.id == message_id)
        .first()
    )
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return message


@router.patch("/{message_id}/read", response_model=MessageResponse)
async def mark_message_read(
    message_id: str,
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """Mark message as explicitly opened / read by the recipient."""
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    if not message.read_at:
        message.read_at = utc_now()
        if message.status != "replied":
            message.status = "read"
        db.commit()
        db.refresh(message)

        asyncio.create_task(
            ws_manager.broadcast(
                "message_read",
                {"message_id": message.id, "read_at": message.read_at.isoformat()},
            )
        )

    return message


@router.post("/{message_id}/replies", response_model=ReplyResponse, status_code=status.HTTP_201_CREATED)
async def create_reply(
    message_id: str,
    payload: ReplyCreateRequest,
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """Create a reply to a message and wake up any CLI waiting."""
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    reply = Reply(
        message_id=message.id,
        conversation_id=message.conversation_id,
        content=payload.content,
        voice_transcribed=payload.voice_transcribed,
        sender="pwa",
        sender_device=payload.sender_device,
        created_at=utc_now(),
    )
    db.add(reply)
    message.status = "replied"
    if not message.read_at:
        message.read_at = utc_now()

    # Touch conversation
    conv = db.query(Conversation).filter(Conversation.id == message.conversation_id).first()
    if conv:
        conv.updated_at = utc_now()

    db.commit()
    db.refresh(reply)

    # Wake up CLI waiters
    await notify_reply_arrived(message.id)

    # Broadcast event
    reply_data = {
        "id": reply.id,
        "message_id": reply.message_id,
        "conversation_id": reply.conversation_id,
        "content": reply.content,
        "voice_transcribed": reply.voice_transcribed,
        "sender": reply.sender,
        "sender_device": reply.sender_device,
        "created_at": reply.created_at.isoformat(),
    }
    asyncio.create_task(ws_manager.broadcast("reply_created", reply_data))

    return reply


@router.get("/{message_id}/replies", response_model=List[ReplyResponse])
def list_replies(
    message_id: str,
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """List replies associated with a message."""
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return db.query(Reply).filter(Reply.message_id == message_id).order_by(Reply.created_at.asc()).all()


@router.get("/{message_id}/wait")
async def wait_for_reply(
    message_id: str,
    timeout: int = Query(default=60, ge=1, le=300, description="Wait timeout in seconds"),
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """
    Long-polling endpoint for CLI: waits until a reply arrives or timeout occurs.
    Associates precisely with original message_id.
    """
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    # Check if reply already exists
    existing_reply = (
        db.query(Reply)
        .filter(Reply.message_id == message_id)
        .order_by(Reply.created_at.desc())
        .first()
    )
    if existing_reply:
        return existing_reply

    # Register waiter event
    event = await register_reply_waiter(message_id)
    try:
        await asyncio.wait_for(event.wait(), timeout=float(timeout))
    except asyncio.TimeoutError:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    finally:
        await unregister_reply_waiter(message_id, event)

    # Reply arrived! Fetch from database
    latest_reply = (
        db.query(Reply)
        .filter(Reply.message_id == message_id)
        .order_by(Reply.created_at.desc())
        .first()
    )
    if not latest_reply:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return latest_reply
