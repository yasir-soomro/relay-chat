from typing import NoReturn

from fastapi import HTTPException, status

from backend.services.conversation_service import (
    ConversationManagementError,
    ConversationNotFoundError,
    ConversationPermissionError,
    ConversationUserNotFoundError,
    SelfConversationError,
)


def raise_conversation_http_error(error: ConversationManagementError) -> NoReturn:
    if isinstance(error, SelfConversationError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot start a conversation with yourself",
        ) from None
    if isinstance(error, ConversationPermissionError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="An accepted connection is required",
        ) from None
    if isinstance(error, (ConversationNotFoundError, ConversationUserNotFoundError)):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation or user not found",
        ) from None
    raise error
