from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from backend.core.dependencies import get_message_service
from backend.core.security import CurrentUser
from backend.routes.v1.messages.errors import raise_message_http_error
from backend.schemas.message import MessageListResponse
from backend.services.message_service import (
    MessageManagementError,
    MessageService,
)

router = APIRouter()


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=MessageListResponse,
)
async def list_messages(
    conversation_id: UUID,
    current_user: CurrentUser,
    service: Annotated[MessageService, Depends(get_message_service)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    cursor: str | None = None,
) -> MessageListResponse:
    try:
        return await service.list_messages(
            conversation_id,
            current_user.id,
            limit=limit,
            cursor=cursor,
        )
    except MessageManagementError as error:
        raise_message_http_error(error)
