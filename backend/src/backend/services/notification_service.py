from uuid import UUID

from backend.repository.notification_repository import NotificationRepositoryProtocol
from backend.schemas.notification import UnreadCountResponse


class NotificationService:
    def __init__(self, repository: NotificationRepositoryProtocol) -> None:
        self._repository = repository

    async def get_unread_count(self, user_id: UUID) -> UnreadCountResponse:
        return UnreadCountResponse(
            total_unread_count=await self._repository.count_unread_for_user(user_id)
        )
