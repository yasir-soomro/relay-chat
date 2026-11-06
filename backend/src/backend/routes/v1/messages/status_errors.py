from typing import NoReturn

from fastapi import HTTPException, status

from backend.services.message_status_service import (
    MessageStatusManagementError,
    MessageStatusNotFoundError,
    MessageStatusPermissionError,
)


def raise_message_status_http_error(
    error: MessageStatusManagementError,
) -> NoReturn:
    if isinstance(error, MessageStatusNotFoundError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message or conversation not found",
        ) from None
    if isinstance(error, MessageStatusPermissionError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the recipient may acknowledge message delivery or reading",
        ) from None
    raise error
