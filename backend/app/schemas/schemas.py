from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


# --- Auth & Tokens ---
class TokenCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Friendly label for the API token")
    expires_in_days: Optional[int] = Field(default=None, ge=1, le=365, description="Optional expiration in days")


class TokenResponse(BaseModel):
    id: str
    name: str
    token_prefix: str
    plain_token: str = Field(..., description="Raw token revealed once upon creation")
    created_at: datetime
    expires_at: Optional[datetime] = None


class TokenListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    token_prefix: str
    is_revoked: bool
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime


# --- Devices ---
class DeviceRegisterRequest(BaseModel):
    id: Optional[str] = Field(default=None, max_length=64, description="Optional persistent client device ID")
    name: str = Field(..., min_length=1, max_length=100, description="Device name, e.g. iPhone 15 Pro")
    platform: str = Field(default="iOS", max_length=50, description="Platform identifier")
    user_agent: Optional[str] = None


class DeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    platform: str
    last_seen_at: datetime
    created_at: datetime
    subscription_count: int = 0


# --- Push Subscriptions ---
class PushSubscriptionKeys(BaseModel):
    p256dh: str = Field(..., min_length=10, description="Client public P-256 key")
    auth: str = Field(..., min_length=10, description="Client auth secret")


class PushSubscriptionCreate(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=64)
    endpoint: str = Field(..., min_length=10, description="Push service gateway URL")
    keys: PushSubscriptionKeys
    user_agent: Optional[str] = None


class PushSubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    device_id: str
    endpoint: str
    is_active: bool
    created_at: datetime
    last_active_at: datetime


class VapidPublicKeyResponse(BaseModel):
    public_key: str
    subject: str


# --- Replies ---
class ReplyCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000, description="Reply message body")
    voice_transcribed: bool = Field(default=False, description="Whether speech-to-text was used")
    sender_device: Optional[str] = Field(default=None, max_length=100)


class ReplyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    message_id: str
    conversation_id: str
    content: str
    voice_transcribed: bool
    sender: str
    sender_device: Optional[str] = None
    created_at: datetime


# --- Messages ---
class MessageCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000, description="Message text content")
    title: Optional[str] = Field(default=None, max_length=150, description="Optional title/header")
    priority: str = Field(default="normal", pattern="^(low|normal|high)$", description="Delivery priority")
    conversation_id: Optional[str] = Field(default=None, max_length=36)
    idempotency_key: Optional[str] = Field(default=None, max_length=100)
    sender_device: Optional[str] = Field(default=None, max_length=100)


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    title: Optional[str] = None
    content: str
    priority: str
    status: str
    sender: str
    sender_device: Optional[str] = None
    read_at: Optional[datetime] = None
    created_at: datetime
    replies: List[ReplyResponse] = []


class MessageListResponse(BaseModel):
    items: List[MessageResponse]
    total: int
    limit: int
    offset: int


# --- Conversations ---
class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    latest_message: Optional[MessageResponse] = None
    message_count: int = 0


# --- Health & Status ---
class HealthResponse(BaseModel):
    status: str
    database: str
    vapid_configured: bool
    active_subscriptions: int
    registered_devices: int
    total_messages: int
    timestamp: datetime
