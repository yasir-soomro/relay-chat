from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from backend.core.dependencies import get_message_status_service
from backend.core.security import CurrentUser
from backend.routes.v1.messages.status_errors import (
    raise_message_status_http_error,
)
from backend.schemas.message_status import MessageStatusResponse
from backend.services.message_status_service import (
    MessageStatusManagementError,
    MessageStatusService,
)

router = APIRouter()


@router.post(
    "/messages/{message_id}/delivery",
    response_model=MessageStatusResponse,
)
async def acknowledge_delivery(
    message_id: UUID,
    current_user: CurrentUser,
    service: Annotated[
        MessageStatusService,
        Depends(get_message_status_service),
    ],
) -> MessageStatusResponse:
    try:
        return await service.acknowledge_delivery(message_id, current_user.id)
    except MessageStatusManagementError as error:
        raise_message_status_http_error(error)
