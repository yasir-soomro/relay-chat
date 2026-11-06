from typing import NoReturn

from fastapi import HTTPException, status

from backend.services.message_service import (
    MessageAuthorPermissionError,
    MessageManagementError,
    MessageNotFoundError,
    MessagePaginationError,
    MessagePermissionError,
    MessageStateConflictError,
)


def raise_message_http_error(error: MessageManagementError) -> NoReturn:
    if isinstance(error, MessageNotFoundError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message or conversation not found",
        ) from None
    if isinstance(error, MessagePaginationError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid message pagination parameters",
        ) from None
    if isinstance(error, MessagePermissionError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="An accepted, unblocked connection is required to send messages",
        ) from None
    if isinstance(error, MessageAuthorPermissionError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only modify messages you authored",
        ) from None
    if isinstance(error, MessageStateConflictError):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Deleted messages cannot be modified or deleted again",
        ) from None
    raise error
