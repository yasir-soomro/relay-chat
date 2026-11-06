from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ConnectionStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    REMOVED = "removed"


class ConnectionRequestCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recipient_id: UUID


class ConnectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    requester_id: UUID
    recipient_id: UUID
    status: ConnectionStatus
    requested_at: datetime
    responded_at: datetime | None
    rejected_at: datetime | None
    removed_at: datetime | None


class ConnectionListResponse(BaseModel):
    items: list[ConnectionResponse]


class BlockResponse(BaseModel):
    blocked_user_id: UUID
    created_at: datetime
