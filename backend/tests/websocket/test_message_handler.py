from datetime import UTC, datetime
from typing import Any, Self, cast
from uuid import UUID, uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend.schemas.conversation import ConversationResponse
from backend.schemas.message import MessageListResponse, MessageResponse
from backend.schemas.message_status import MessageStatus, MessageStatusResponse
from backend.services.message_service import MessagePermissionError
from backend.websocket.connection_manager import ConnectionManager
from backend.websocket.events import (
    MessageDeliveryAckEvent,
    MessageDeliveryBatchAckEvent,
    MessageSendEvent,
    SubscribeEvent,
)
from backend.websocket.message_handler import WebSocketMessageHandler


class FakeWebSocket:
    def __init__(self) -> None:
        self.sent: list[dict[str, Any]] = []

    async def send_json(self, event: dict[str, Any]) -> None:
        self.sent.append(event)


class EmptySession:
    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *args: object) -> None:
        return None


class EmptySessionFactory:
    def __call__(self) -> EmptySession:
        return EmptySession()


@pytest.mark.asyncio
@pytest.mark.parametrize("created", [True, False])
async def test_message_send_persists_before_sending_scoped_events(
    monkeypatch: pytest.MonkeyPatch,
    created: bool,
) -> None:
    sender_id, recipient_id, outsider_id, conversation_id = (
        uuid4(),
        uuid4(),
        uuid4(),
        uuid4(),
    )
    now = datetime.now(UTC)
    conversation = ConversationResponse(
        id=conversation_id,
        user_low_id=min(sender_id, recipient_id),
        user_high_id=max(sender_id, recipient_id),
        created_at=now,
    )
    message = MessageResponse(
        id=uuid4(),
        conversation_id=conversation_id,
        sender_id=sender_id,
        content="persisted",
        status="sent",
        created_at=now,
        updated_at=now,
        sent_at=now,
        delivered_at=None,
        read_at=None,
        deleted_at=None,
    )
    calls: list[tuple[object, ...]] = []

    class ConversationRepositoryStub:
        def __init__(self, _: object) -> None:
            pass

        async def get_by_id(self, _: object) -> ConversationResponse:
            return conversation

    class MessageServiceStub:
        def __init__(self, *_: object) -> None:
            pass

        async def send_message_idempotently(
            self,
            requested_conversation_id: object,
            user_id: object,
            content: str,
            client_message_id: object,
        ) -> tuple[MessageResponse, bool, UUID]:
            calls.append(
                (
                    requested_conversation_id,
                    user_id,
                    content,
                    client_message_id,
                    "persisted",
                )
            )
            return message, created, recipient_id

    monkeypatch.setattr(
        "backend.websocket.message_handler.ConversationRepository",
        ConversationRepositoryStub,
    )
    monkeypatch.setattr(
        "backend.websocket.message_handler.MessageRepository",
        lambda _: object(),
    )
    monkeypatch.setattr(
        "backend.websocket.message_handler.MessageService",
        MessageServiceStub,
    )

    manager = ConnectionManager()
    sender_socket, sender_device_socket, recipient_socket = (
        FakeWebSocket(),
        FakeWebSocket(),
        FakeWebSocket(),
    )
    outsider_socket = FakeWebSocket()
    sender = manager.register(sender_socket, sender_id)
    sender_device = manager.register(sender_device_socket, sender_id)
    recipient = manager.register(recipient_socket, recipient_id)
    outsider = manager.register(outsider_socket, outsider_id)
    for connection in (sender, sender_device, recipient):
        manager.subscribe(connection, conversation_id)
    manager.subscribe(outsider, uuid4())

    session_factory = cast(
        async_sessionmaker[AsyncSession],
        EmptySessionFactory(),
    )
    handler = WebSocketMessageHandler(session_factory, manager)
    event = MessageSendEvent(
        type="message.send",
        conversation_id=conversation_id,
        client_message_id=uuid4(),
        content="persisted",
    )
    await handler.handle(sender, event)

    assert calls == [
        (
            conversation_id,
            sender_id,
            "persisted",
            event.client_message_id,
            "persisted",
        )
    ]
    assert [item["type"] for item in sender_socket.sent] == ["message.sent"]
    assert [item["type"] for item in sender_device_socket.sent] == ["message.sent"]
    assert [item["type"] for item in recipient_socket.sent] == (
        ["message.received"] if created else []
    )
    assert outsider_socket.sent == []


@pytest.mark.asyncio
async def test_permission_failure_keeps_socket_open_and_does_not_broadcast(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sender_socket, recipient_socket = FakeWebSocket(), FakeWebSocket()
    sender_id, recipient_id, conversation_id = uuid4(), uuid4(), uuid4()

    class MessageServiceStub:
        def __init__(self, *_: object) -> None:
            pass

        async def send_message_idempotently(
            self,
            *_: object,
        ) -> tuple[MessageResponse, bool, UUID]:
            raise MessagePermissionError

    monkeypatch.setattr(
        "backend.websocket.message_handler.MessageRepository",
        lambda _: object(),
    )
    monkeypatch.setattr(
        "backend.websocket.message_handler.ConversationRepository",
        lambda _: object(),
    )
    monkeypatch.setattr(
        "backend.websocket.message_handler.MessageService",
        MessageServiceStub,
    )

    manager = ConnectionManager()
    sender = manager.register(sender_socket, sender_id)
    recipient = manager.register(recipient_socket, recipient_id)
    manager.subscribe(sender, conversation_id)
    manager.subscribe(recipient, conversation_id)
    session_factory = cast(
        async_sessionmaker[AsyncSession],
        EmptySessionFactory(),
    )
    handler = WebSocketMessageHandler(session_factory, manager)

    await handler.handle(
        sender,
        MessageSendEvent(
            type="message.send",
            conversation_id=conversation_id,
            client_message_id=uuid4(),
            content="blocked",
        ),
    )

    assert sender_socket.sent == [
        {
            "type": "error",
            "code": "permission_denied",
            "detail": "You are not allowed to perform this operation",
        }
    ]
    assert recipient_socket.sent == []
    assert manager.is_subscribed(sender, conversation_id)


@pytest.mark.asyncio
async def test_delivery_ack_uses_recipient_identity_and_syncs_participant_devices(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sender_id, recipient_id, outsider_id, conversation_id, message_id = (
        uuid4(),
        uuid4(),
        uuid4(),
        uuid4(),
        uuid4(),
    )
    now = datetime.now(UTC)
    status = MessageStatusResponse(
        id=message_id,
        status=MessageStatus.DELIVERED,
        sent_at=now,
        delivered_at=now,
        read_at=None,
    )
    acknowledgment: list[tuple[object, object, object]] = []

    class MessageStatusServiceStub:
        def __init__(self, *_: object) -> None:
            pass

        async def acknowledge_delivery(
            self,
            acknowledged_message_id: object,
            recipient_user_id: object,
            *,
            conversation_id: object,
        ) -> MessageStatusResponse:
            acknowledgment.append(
                (acknowledged_message_id, recipient_user_id, conversation_id)
            )
            return status

    monkeypatch.setattr(
        "backend.websocket.message_handler.MessageStatusRepository",
        lambda _: object(),
    )
    monkeypatch.setattr(
        "backend.websocket.message_handler.MessageStatusService",
        MessageStatusServiceStub,
    )
    manager = ConnectionManager()
    sender_socket, recipient_socket, recipient_device_socket, outsider_socket = (
        FakeWebSocket(),
        FakeWebSocket(),
        FakeWebSocket(),
        FakeWebSocket(),
    )
    sender = manager.register(sender_socket, sender_id)
    recipient = manager.register(recipient_socket, recipient_id)
    recipient_device = manager.register(recipient_device_socket, recipient_id)
    outsider = manager.register(outsider_socket, outsider_id)
    for connection in (sender, recipient, recipient_device):
        manager.subscribe(connection, conversation_id)
    manager.subscribe(outsider, uuid4())

    session_factory = cast(
        async_sessionmaker[AsyncSession],
        EmptySessionFactory(),
    )
    await WebSocketMessageHandler(session_factory, manager).handle(
        recipient,
        MessageDeliveryAckEvent(
            type="message.delivery_ack",
            conversation_id=conversation_id,
            message_id=message_id,
        ),
    )

    assert acknowledgment == [(message_id, recipient_id, conversation_id)]
    for socket in (sender_socket, recipient_socket, recipient_device_socket):
        assert socket.sent[0]["type"] == "message.status"
        assert socket.sent[0]["conversation_id"] == str(conversation_id)
    assert outsider_socket.sent == []


@pytest.mark.asyncio
async def test_batch_delivery_ack_updates_recipient_device_statuses(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recipient_id, conversation_id = uuid4(), uuid4()
    message_ids = [uuid4(), uuid4()]
    now = datetime.now(UTC)
    statuses = [
        MessageStatusResponse(
            id=message_id,
            status=MessageStatus.DELIVERED,
            sent_at=now,
            delivered_at=now,
            read_at=None,
        )
        for message_id in message_ids
    ]
    acknowledgment: list[tuple[UUID, UUID, list[UUID]]] = []

    class MessageStatusServiceStub:
        def __init__(self, *_: object) -> None:
            pass

        async def acknowledge_delivery_batch(
            self,
            requested_conversation_id: UUID,
            authenticated_recipient_id: UUID,
            requested_message_ids: list[UUID],
        ) -> object:
            acknowledgment.append(
                (
                    requested_conversation_id,
                    authenticated_recipient_id,
                    requested_message_ids,
                )
            )
            return type("BatchResult", (), {"items": statuses})()

    monkeypatch.setattr(
        "backend.websocket.message_handler.MessageStatusRepository",
        lambda _: object(),
    )
    monkeypatch.setattr(
        "backend.websocket.message_handler.MessageStatusService",
        MessageStatusServiceStub,
    )

    manager = ConnectionManager()
    recipient_socket, second_device_socket, stranger_socket = (
        FakeWebSocket(),
        FakeWebSocket(),
        FakeWebSocket(),
    )
    recipient = manager.register(recipient_socket, recipient_id)
    second_device = manager.register(second_device_socket, recipient_id)
    stranger = manager.register(stranger_socket, uuid4())
    manager.subscribe(recipient, conversation_id)
    manager.subscribe(second_device, conversation_id)
    manager.subscribe(stranger, uuid4())
    session_factory = cast(
        async_sessionmaker[AsyncSession],
        EmptySessionFactory(),
    )

    await WebSocketMessageHandler(session_factory, manager).handle(
        recipient,
        MessageDeliveryBatchAckEvent(
            type="message.delivery_ack_batch",
            conversation_id=conversation_id,
            message_ids=message_ids,
        ),
    )

    assert acknowledgment == [(conversation_id, recipient_id, message_ids)]
    assert [event["type"] for event in recipient_socket.sent] == [
        "message.status",
        "message.status",
    ]
    assert [event["type"] for event in second_device_socket.sent] == [
        "message.status",
        "message.status",
    ]
    assert stranger_socket.sent == []


@pytest.mark.asyncio
async def test_subscribe_revalidates_participant_and_sends_only_current_status(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user_id, other_user_id, conversation_id = uuid4(), uuid4(), uuid4()
    now = datetime.now(UTC)
    conversation = ConversationResponse(
        id=conversation_id,
        user_low_id=min(user_id, other_user_id),
        user_high_id=max(user_id, other_user_id),
        created_at=now,
    )
    message = MessageResponse(
        id=uuid4(),
        conversation_id=conversation_id,
        sender_id=other_user_id,
        content="must not be replayed",
        status="sent",
        created_at=now,
        updated_at=now,
        sent_at=now,
        delivered_at=None,
        read_at=None,
        deleted_at=None,
    )

    class ConversationServiceStub:
        def __init__(self, *_: object) -> None:
            pass

        async def get_conversation(
            self,
            requested_conversation_id: UUID,
            authenticated_user_id: UUID,
        ) -> ConversationResponse:
            assert requested_conversation_id == conversation_id
            assert authenticated_user_id == user_id
            return conversation

    class MessageServiceStub:
        def __init__(self, *_: object) -> None:
            pass

        async def list_messages(
            self,
            requested_conversation_id: UUID,
            authenticated_user_id: UUID,
            *,
            limit: int,
            cursor: str | None,
        ) -> MessageListResponse:
            assert requested_conversation_id == conversation_id
            assert authenticated_user_id == user_id
            assert limit == 100
            assert cursor is None
            return MessageListResponse(items=[message], next_cursor=None)

    monkeypatch.setattr(
        "backend.websocket.message_handler.ConversationRepository",
        lambda _: object(),
    )
    monkeypatch.setattr(
        "backend.websocket.message_handler.MessageRepository",
        lambda _: object(),
    )
    monkeypatch.setattr(
        "backend.websocket.message_handler.ConversationService",
        ConversationServiceStub,
    )
    monkeypatch.setattr(
        "backend.websocket.message_handler.MessageService",
        MessageServiceStub,
    )

    manager = ConnectionManager()
    socket = FakeWebSocket()
    connection = manager.register(socket, user_id)
    session_factory = cast(
        async_sessionmaker[AsyncSession],
        EmptySessionFactory(),
    )
    handler = WebSocketMessageHandler(session_factory, manager)

    await handler.handle(
        connection,
        SubscribeEvent(type="subscribe", conversation_id=conversation_id),
    )

    assert manager.is_subscribed(connection, conversation_id)
    assert [event["type"] for event in socket.sent] == [
        "subscribed",
        "message.status",
    ]
    assert "content" not in socket.sent[1]["status"]
