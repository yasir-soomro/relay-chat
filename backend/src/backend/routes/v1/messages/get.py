from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from backend.core.dependencies import get_message_service
from backend.core.security import CurrentUser
from backend.routes.v1.messages.errors import raise_message_http_error
from backend.schemas.message import MessageResponse
from backend.services.message_service import (
    MessageManagementError,
    MessageService,
)

router = APIRouter()


@router.get("/messages/{message_id}", response_model=MessageResponse)
async def get_message(
    message_id: UUID,
    current_user: CurrentUser,
    service: Annotated[MessageService, Depends(get_message_service)],
) -> MessageResponse:
    try:
        return await service.get_message(message_id, current_user.id)
    except MessageManagementError as error:
        raise_message_http_error(error)
