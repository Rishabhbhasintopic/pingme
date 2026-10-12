import asyncio
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from backend.app.api.deps import get_current_token
from backend.app.core.database import get_db
from backend.app.models.models import APIToken, Conversation, Message, Reply, utc_now
from backend.app.schemas.schemas import ConversationResponse, ReplyCreateRequest, ReplyResponse
from backend.app.services.message_service import (
    DEFAULT_LIVE_CONVERSATION_ID,
    get_or_create_conversation,
    notify_reply_arrived,
    ws_manager,
)

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("", response_model=List[ConversationResponse])
def list_conversations(
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """List all conversations with their latest message and message count."""
    convs = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
    results = []

    for c in convs:
        latest = (
            db.query(Message)
            .filter(Message.conversation_id == c.id)
            .order_by(Message.created_at.desc())
            .first()
        )
        msg_count = db.query(Message).filter(Message.conversation_id == c.id).count()

        results.append(
            ConversationResponse(
                id=c.id,
                title=c.title,
                created_at=c.created_at,
                updated_at=c.updated_at,
                latest_message=latest,
                message_count=msg_count,
            )
        )

    return results


@router.get("/live/feed")
def get_live_chat_feed(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """
    Get unified chronological chat feed (Terminal messages + iPhone replies)
    for the live conversation.
    """
    conv = get_or_create_conversation(db, conversation_id=DEFAULT_LIVE_CONVERSATION_ID, title="Live Chat")

    # Query all messages in this conversation
    messages = (
        db.query(Message)
        .options(joinedload(Message.replies))
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
        .all()
    )

    feed = []
    for m in messages:
        feed.append({
            "id": m.id,
            "type": "message",
            "sender": m.sender,
            "sender_device": m.sender_device or "Terminal",
            "content": m.content,
            "title": m.title,
            "priority": m.priority,
            "created_at": m.created_at.isoformat(),
            "voice_transcribed": False,
        })
        for r in m.replies:
            feed.append({
                "id": r.id,
                "message_id": r.message_id,
                "type": "reply",
                "sender": r.sender,
                "sender_device": r.sender_device or "iPhone",
                "content": r.content,
                "title": None,
                "priority": "normal",
                "created_at": r.created_at.isoformat(),
                "voice_transcribed": r.voice_transcribed,
            })

    # Sort chronologically by created_at
    feed.sort(key=lambda x: x["created_at"])

    if len(feed) > limit:
        feed = feed[-limit:]

    latest_msg_id = messages[-1].id if messages else None

    return {
        "conversation_id": conv.id,
        "title": conv.title,
        "items": feed,
        "latest_message_id": latest_msg_id,
    }


@router.post("/live/reply", response_model=ReplyResponse, status_code=status.HTTP_201_CREATED)
async def post_live_reply(
    payload: ReplyCreateRequest,
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """
    Directly post a reply to the live chat session.
    Automatically attaches to the latest message or initializes if empty,
    and wakes up all terminal listeners.
    """
    conv = get_or_create_conversation(db, conversation_id=DEFAULT_LIVE_CONVERSATION_ID, title="Live Chat")

    latest_msg = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.desc())
        .first()
    )
    if not latest_msg:
        latest_msg = Message(
            conversation_id=conv.id,
            title="Live Chat",
            content="Chat session initialized",
            priority="normal",
            status="replied",
            sender="system",
            created_at=utc_now(),
        )
        db.add(latest_msg)
        db.commit()
        db.refresh(latest_msg)

    reply = Reply(
        message_id=latest_msg.id,
        conversation_id=conv.id,
        content=payload.content,
        voice_transcribed=payload.voice_transcribed,
        sender="pwa",
        sender_device=payload.sender_device or "iPhone",
        created_at=utc_now(),
    )
    db.add(reply)
    latest_msg.status = "replied"
    if not latest_msg.read_at:
        latest_msg.read_at = utc_now()
    conv.updated_at = utc_now()
    db.commit()
    db.refresh(reply)

    # Wake up CLI waiters
    await notify_reply_arrived(latest_msg.id)

    # Broadcast event via WebSocket
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


@router.get("/{conversation_id}")
def get_conversation_details(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_token: APIToken = Depends(get_current_token),
):
    """Get conversation details with all nested messages and replies."""
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id)
        .first()
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    messages = (
        db.query(Message)
        .options(joinedload(Message.replies))
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    return {
        "id": conv.id,
        "title": conv.title,
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
        "messages": messages,
    }
