from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from backend.core.dependencies import get_message_status_service
from backend.core.security import CurrentUser
from backend.routes.v1.messages.status_errors import (
    raise_message_status_http_error,
)
from backend.schemas.message_status import (
    MessageReadBatchRequest,
    MessageReadBatchResponse,
    MessageStatusResponse,
)
from backend.services.message_status_service import (
    MessageStatusManagementError,
    MessageStatusService,
)
from backend.websocket.connection_manager import (
    ConnectionManager,
    get_connection_manager,
)
from backend.websocket.status_broadcast import broadcast_message_status

router = APIRouter()


@router.post(
    "/messages/{message_id}/read",
    response_model=MessageStatusResponse,
)
async def acknowledge_read(
    message_id: UUID,
    current_user: CurrentUser,
    service: Annotated[
        MessageStatusService,
        Depends(get_message_status_service),
    ],
    manager: Annotated[ConnectionManager, Depends(get_connection_manager)],
) -> MessageStatusResponse:
    try:
        status_response, conversation_id = await service.acknowledge_read_with_context(
            message_id,
            current_user.id,
        )
    except MessageStatusManagementError as error:
        raise_message_status_http_error(error)
    await broadcast_message_status(manager, conversation_id, status_response)
    return status_response


@router.post(
    "/conversations/{conversation_id}/messages/read",
    response_model=MessageReadBatchResponse,
)
async def acknowledge_read_batch(
    conversation_id: UUID,
    data: MessageReadBatchRequest,
    current_user: CurrentUser,
    service: Annotated[
        MessageStatusService,
        Depends(get_message_status_service),
    ],
    manager: Annotated[ConnectionManager, Depends(get_connection_manager)],
) -> MessageReadBatchResponse:
    try:
        result = await service.acknowledge_read_batch(
            conversation_id,
            current_user.id,
            data.message_ids,
        )
    except MessageStatusManagementError as error:
        raise_message_status_http_error(error)
    for status_response in result.items:
        await broadcast_message_status(manager, conversation_id, status_response)
    return result
