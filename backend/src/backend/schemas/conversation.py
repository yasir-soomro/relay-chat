from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ConversationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recipient_id: UUID


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_low_id: UUID
    user_high_id: UUID
    created_at: datetime


class ConversationListItemResponse(ConversationResponse):
    unread_count: int = Field(ge=0)


class ConversationListResponse(BaseModel):
    items: list[ConversationListItemResponse]
