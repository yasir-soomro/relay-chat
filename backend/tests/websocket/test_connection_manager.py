import asyncio
from uuid import uuid4

import pytest

from backend.websocket.connection_manager import ConnectionManager
from backend.websocket.events import ErrorEvent


class FakeWebSocket:
    def __init__(self) -> None:
        self.sent: list[dict[str, object]] = []

    async def send_json(self, event: dict[str, object]) -> None:
        await asyncio.sleep(0)
        self.sent.append(event)


@pytest.mark.asyncio
async def test_conversation_broadcast_reaches_each_subscribed_device_only() -> None:
    manager = ConnectionManager()
    user_id, outsider_id, conversation_id = uuid4(), uuid4(), uuid4()
    first_socket, second_socket, outsider_socket = (
        FakeWebSocket(),
        FakeWebSocket(),
        FakeWebSocket(),
    )
    first = manager.register(first_socket, user_id)
    second = manager.register(second_socket, user_id)
    outsider = manager.register(outsider_socket, outsider_id)
    manager.subscribe(first, conversation_id)
    manager.subscribe(second, conversation_id)
    manager.subscribe(outsider, uuid4())

    await manager.send_to_conversation(
        conversation_id,
        ErrorEvent(code="test", detail="safe"),
    )

    assert len(first_socket.sent) == 1
    assert len(second_socket.sent) == 1
    assert outsider_socket.sent == []

    await manager.unregister(first)
    await manager.send_to_conversation(
        conversation_id,
        ErrorEvent(code="test", detail="again"),
    )
    assert len(first_socket.sent) == 1
    assert len(second_socket.sent) == 2


@pytest.mark.asyncio
async def test_outgoing_events_are_serialized_per_socket() -> None:
    manager = ConnectionManager()
    socket = FakeWebSocket()
    connection = manager.register(socket, uuid4())
    events = [
        ErrorEvent(code=f"event-{index}", detail="ordered") for index in range(10)
    ]

    await asyncio.gather(*(manager.send_event(connection, event) for event in events))

    assert [event["code"] for event in socket.sent] == [
        f"event-{index}" for index in range(10)
    ]
