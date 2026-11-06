from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from backend.core.dependencies import get_conversation_service
from backend.core.security import CurrentUser
from backend.routes.v1.conversations.errors import raise_conversation_http_error
from backend.schemas.conversation import ConversationResponse
from backend.services.conversation_service import (
    ConversationManagementError,
    ConversationService,
)

router = APIRouter()


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID,
    current_user: CurrentUser,
    service: Annotated[ConversationService, Depends(get_conversation_service)],
) -> ConversationResponse:
    try:
        return await service.get_conversation(conversation_id, current_user.id)
    except ConversationManagementError as error:
        raise_conversation_http_error(error)
