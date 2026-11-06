from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from backend.core.dependencies import get_conversation_service
from backend.core.security import CurrentUser
from backend.routes.v1.conversations.errors import raise_conversation_http_error
from backend.schemas.conversation import ConversationCreate, ConversationResponse
from backend.services.conversation_service import (
    ConversationManagementError,
    ConversationService,
)

router = APIRouter()


@router.post(
    "",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    data: ConversationCreate,
    response: Response,
    current_user: CurrentUser,
    service: Annotated[ConversationService, Depends(get_conversation_service)],
) -> ConversationResponse:
    try:
        conversation, created = await service.create_or_get(
            current_user.id,
            data.recipient_id,
        )
    except ConversationManagementError as error:
        raise_conversation_http_error(error)
    if not created:
        response.status_code = status.HTTP_200_OK
    return conversation
