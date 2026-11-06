from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from backend.core.dependencies import get_message_status_service
from backend.core.security import CurrentUser
from backend.routes.v1.messages.status_errors import (
    raise_message_status_http_error,
)
from backend.schemas.message_status import (
    MessageDeliveryBatchRequest,
    MessageDeliveryBatchResponse,
)
from backend.services.message_status_service import (
    MessageStatusManagementError,
    MessageStatusService,
)

router = APIRouter()


@router.post(
    "/conversations/{conversation_id}/messages/delivery",
    response_model=MessageDeliveryBatchResponse,
)
async def acknowledge_delivery_batch(
    conversation_id: UUID,
    data: MessageDeliveryBatchRequest,
    current_user: CurrentUser,
    service: Annotated[
        MessageStatusService,
        Depends(get_message_status_service),
    ],
) -> MessageDeliveryBatchResponse:
    try:
        return await service.acknowledge_delivery_batch(
            conversation_id,
            current_user.id,
            data.message_ids,
        )
    except MessageStatusManagementError as error:
        raise_message_status_http_error(error)
