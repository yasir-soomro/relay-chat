from typing import Annotated

from fastapi import APIRouter, Depends

from backend.core.dependencies import get_conversation_service
from backend.core.security import CurrentUser
from backend.schemas.conversation import ConversationListResponse
from backend.services.conversation_service import ConversationService

router = APIRouter()


@router.get("", response_model=ConversationListResponse)
async def list_conversations(
    current_user: CurrentUser,
    service: Annotated[ConversationService, Depends(get_conversation_service)],
) -> ConversationListResponse:
    return await service.list_conversations(current_user.id)
