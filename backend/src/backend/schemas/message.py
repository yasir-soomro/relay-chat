from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MessageStatus(StrEnum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"


class MessageCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str = Field(min_length=1)


class MessageUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str = Field(min_length=1)


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    sender_id: UUID
    content: str | None
    status: MessageStatus
    created_at: datetime
    updated_at: datetime
    sent_at: datetime
    delivered_at: datetime | None
    read_at: datetime | None
    deleted_at: datetime | None


class MessageListResponse(BaseModel):
    items: list[MessageResponse]
    next_cursor: str | None
