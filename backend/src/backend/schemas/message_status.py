from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class MessageStatus(StrEnum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"


class MessageStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: MessageStatus
    sent_at: datetime
    delivered_at: datetime | None
    read_at: datetime | None


class MessageReadBatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message_ids: list[UUID] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def require_unique_message_ids(self) -> MessageReadBatchRequest:
        if len(set(self.message_ids)) != len(self.message_ids):
            raise ValueError("message_ids must be unique")
        return self


class MessageReadBatchResponse(BaseModel):
    items: list[MessageStatusResponse]
