from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from backend.app.api.deps import get_current_token
from backend.app.core.database import get_db
from backend.app.models.models import APIToken, Conversation, Message, Reply
from backend.app.schemas.schemas import ConversationResponse

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
