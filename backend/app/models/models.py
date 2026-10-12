import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from backend.app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def generate_uuid() -> str:
    return str(uuid.uuid4())


class APIToken(Base):
    __tablename__ = "api_tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    token_hash = Column(String(128), unique=True, index=True, nullable=False)
    token_prefix = Column(String(20), nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False, index=True)
    last_used_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)


class Device(Base):
    __tablename__ = "devices"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    platform = Column(String(50), nullable=False, default="iOS")  # iOS, Web, CLI
    user_agent = Column(Text, nullable=True)
    last_seen_at = Column(DateTime, default=utc_now, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    push_subscriptions = relationship(
        "PushSubscription", back_populates="device", cascade="all, delete-orphan"
    )


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    device_id = Column(String(64), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True)
    endpoint = Column(Text, unique=True, nullable=False)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    user_agent = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    last_active_at = Column(DateTime, default=utc_now, nullable=False)

    device = relationship("Device", back_populates="push_subscriptions")
    deliveries = relationship(
        "NotificationDelivery", back_populates="subscription", cascade="all, delete-orphan"
    )


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(150), nullable=False, default="Conversation")
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False, index=True)

    messages = relationship(
        "Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at"
    )
    replies = relationship(
        "Reply", back_populates="conversation", cascade="all, delete-orphan", order_by="Reply.created_at"
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(
        String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = Column(String(150), nullable=True)
    content = Column(Text, nullable=False)
    priority = Column(String(20), default="normal", nullable=False)  # low, normal, high
    status = Column(
        String(30), default="created", nullable=False, index=True
    )  # created, queued, push_accepted, read, replied, failed
    sender = Column(String(20), default="cli", nullable=False)  # cli, pwa, system
    sender_device = Column(String(100), nullable=True)
    idempotency_key = Column(String(100), unique=True, nullable=True, index=True)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    conversation = relationship("Conversation", back_populates="messages")
    replies = relationship(
        "Reply", back_populates="message", cascade="all, delete-orphan", order_by="Reply.created_at"
    )
    deliveries = relationship(
        "NotificationDelivery", back_populates="message", cascade="all, delete-orphan"
    )


class Reply(Base):
    __tablename__ = "replies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    message_id = Column(
        String(36), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True
    )
    conversation_id = Column(
        String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content = Column(Text, nullable=False)
    voice_transcribed = Column(Boolean, default=False, nullable=False)
    sender = Column(String(20), default="pwa", nullable=False)  # pwa, cli
    sender_device = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    message = relationship("Message", back_populates="replies")
    conversation = relationship("Conversation", back_populates="replies")


class NotificationDelivery(Base):
    __tablename__ = "notification_deliveries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    message_id = Column(
        String(36), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subscription_id = Column(
        String(36), ForeignKey("push_subscriptions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status = Column(
        String(30), default="queued", nullable=False
    )  # queued, push_accepted, failed, expired
    http_status = Column(Integer, nullable=True)
    error_details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    message = relationship("Message", back_populates="deliveries")
    subscription = relationship("PushSubscription", back_populates="deliveries")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_type = Column(String(50), nullable=False, index=True)
    actor = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)


Index("idx_messages_created_status", Message.created_at.desc(), Message.status)
Index("idx_replies_created", Reply.created_at.desc())
