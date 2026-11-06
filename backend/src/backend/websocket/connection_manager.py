import asyncio
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Protocol
from uuid import UUID

from starlette.websockets import WebSocketDisconnect

from backend.websocket.events import ServerEvent


class SocketWriter(Protocol):
    async def send_json(self, data: Any) -> None: ...


@dataclass(eq=False)
class WebSocketConnection:
    websocket: SocketWriter
    user_id: UUID
    subscriptions: set[UUID] = field(default_factory=set)
    send_lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[UUID, set[WebSocketConnection]] = defaultdict(set)
        self._subscriptions: dict[UUID, set[WebSocketConnection]] = defaultdict(set)

    def register(self, websocket: SocketWriter, user_id: UUID) -> WebSocketConnection:
        connection = WebSocketConnection(websocket=websocket, user_id=user_id)
        self._connections[user_id].add(connection)
        return connection

    async def unregister(self, connection: WebSocketConnection) -> None:
        user_connections = self._connections.get(connection.user_id)
        if user_connections is not None:
            user_connections.discard(connection)
            if not user_connections:
                self._connections.pop(connection.user_id, None)

        for conversation_id in tuple(connection.subscriptions):
            subscribers = self._subscriptions.get(conversation_id)
            if subscribers is not None:
                subscribers.discard(connection)
                if not subscribers:
                    self._subscriptions.pop(conversation_id, None)
        connection.subscriptions.clear()

    def subscribe(
        self,
        connection: WebSocketConnection,
        conversation_id: UUID,
    ) -> None:
        connection.subscriptions.add(conversation_id)
        self._subscriptions[conversation_id].add(connection)

    def unsubscribe(
        self,
        connection: WebSocketConnection,
        conversation_id: UUID,
    ) -> None:
        connection.subscriptions.discard(conversation_id)
        subscribers = self._subscriptions.get(conversation_id)
        if subscribers is not None:
            subscribers.discard(connection)
            if not subscribers:
                self._subscriptions.pop(conversation_id, None)

    def is_subscribed(
        self,
        connection: WebSocketConnection,
        conversation_id: UUID,
    ) -> bool:
        return conversation_id in connection.subscriptions

    async def send_event(
        self,
        connection: WebSocketConnection,
        event: ServerEvent,
    ) -> bool:
        try:
            async with connection.send_lock:
                await connection.websocket.send_json(event.model_dump(mode="json"))
        except RuntimeError, WebSocketDisconnect:
            await self.unregister(connection)
            return False
        return True

    async def send_to_conversation(
        self,
        conversation_id: UUID,
        event: ServerEvent,
        *,
        user_ids: set[UUID] | None = None,
    ) -> None:
        subscribers = tuple(self._subscriptions.get(conversation_id, ()))
        for connection in subscribers:
            if user_ids is None or connection.user_id in user_ids:
                await self.send_event(connection, event)
