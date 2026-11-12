from collections.abc import AsyncIterator
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from backend.core.dependencies import get_notification_service
from backend.core.security import get_current_user
from backend.main import app
from backend.model.user import User
from backend.schemas.notification import UnreadCountResponse
from backend.services.auth_service import AuthenticatedUser


class NotificationServiceStub:
    def __init__(self) -> None:
        self.user_id: UUID | None = None

    async def get_unread_count(self, user_id: UUID) -> UnreadCountResponse:
        self.user_id = user_id
        return UnreadCountResponse(total_unread_count=7)


@pytest.fixture
def notification_actor() -> AuthenticatedUser:
    now = datetime.now(UTC)
    user = User(
        id=uuid4(),
        email="notification.actor@example.com",
        username="notification_actor",
        display_name="Notification Actor",
        password_hash="not-returned",
        created_at=now,
        updated_at=now,
    )
    return AuthenticatedUser(user=user, session_id=uuid4())


@pytest.fixture
async def notification_client() -> AsyncIterator[AsyncClient]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_unread_count_requires_authentication(
    notification_client: AsyncClient,
) -> None:
    response = await notification_client.get("/api/v1/notifications/unread-count")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_unread_count_uses_authenticated_user_identity(
    notification_client: AsyncClient,
    notification_actor: AuthenticatedUser,
) -> None:
    service = NotificationServiceStub()
    app.dependency_overrides[get_current_user] = lambda: notification_actor
    app.dependency_overrides[get_notification_service] = lambda: service

    response = await notification_client.get("/api/v1/notifications/unread-count")

    assert response.status_code == 200
    assert response.json() == {"total_unread_count": 7}
    assert service.user_id == notification_actor.id
