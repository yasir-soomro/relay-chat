from typing import Annotated

from fastapi import APIRouter, Depends

from backend.core.dependencies import get_notification_service
from backend.core.security import CurrentUser
from backend.schemas.notification import UnreadCountResponse
from backend.services.notification_service import NotificationService

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    current_user: CurrentUser,
    service: Annotated[NotificationService, Depends(get_notification_service)],
) -> UnreadCountResponse:
    return await service.get_unread_count(current_user.id)
