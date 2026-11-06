from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from backend.core.dependencies import get_message_service
from backend.core.security import CurrentUser
from backend.routes.v1.messages.errors import raise_message_http_error
from backend.schemas.message import MessageCreate, MessageResponse
from backend.services.message_service import (
    MessageManagementError,
    MessageService,
)

router = APIRouter()


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    conversation_id: UUID,
    data: MessageCreate,
    current_user: CurrentUser,
    service: Annotated[MessageService, Depends(get_message_service)],
) -> MessageResponse:
    try:
        return await service.send_message(
            conversation_id,
            current_user.id,
            data.content,
        )
    except MessageManagementError as error:
        raise_message_http_error(error)
