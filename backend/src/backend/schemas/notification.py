from pydantic import BaseModel, Field


class UnreadCountResponse(BaseModel):
    total_unread_count: int = Field(ge=0)
