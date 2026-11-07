from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend.repository.conversation_repository import ConversationRepository
from backend.repository.message_repository import MessageRepository
from backend.repository.message_status_repository import MessageStatusRepository
from backend.schemas.message_status import MessageStatusResponse
from backend.services.conversation_service import (
    ConversationManagementError,
    ConversationNotFoundError,
    ConversationPermissionError,
    ConversationService,
)
from backend.services.message_service import (
    MessageManagementError,
    MessageNotFoundError,
    MessagePermissionError,
    MessageService,
)
from backend.services.message_status_service import (
    MessageStatusManagementError,
    MessageStatusNotFoundError,
    MessageStatusPermissionError,
    MessageStatusService,
)
from backend.websocket.connection_manager import (
    ConnectionManager,
    WebSocketConnection,
)
from backend.websocket.events import (
    ErrorEvent,
    InboundEvent,
    MessageDeliveryAckEvent,
    MessageDeliveryBatchAckEvent,
    MessageReadAckEvent,
    MessageReceivedEvent,
    MessageSendEvent,
    MessageSentEvent,
    SubscribedEvent,
    SubscribeEvent,
    UnsubscribedEvent,
    UnsubscribeEvent,
)
from backend.websocket.status_broadcast import (
    broadcast_message_status,
    message_status_event,
)


class WebSocketMessageHandler:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        connection_manager: ConnectionManager,
    ) -> None:
        self._session_factory = session_factory
        self._connections = connection_manager

    async def handle(
        self,
        connection: WebSocketConnection,
        event: InboundEvent,
    ) -> None:
        try:
            match event:
                case SubscribeEvent():
                    await self._subscribe(connection, event)
                case UnsubscribeEvent():
                    await self._unsubscribe(connection, event)
                case MessageSendEvent():
                    await self._send_message(connection, event)
                case MessageDeliveryAckEvent():
                    await self._acknowledge_delivery(connection, event)
                case MessageDeliveryBatchAckEvent():
                    await self._acknowledge_delivery_batch(connection, event)
                case MessageReadAckEvent():
                    await self._acknowledge_read(connection, event)
                case _:
                    raise AssertionError("Authentication is handled before dispatch")
        except ConversationManagementError as error:
            await self._send_conversation_error(connection, error)
        except MessageManagementError as error:
            await self._send_message_error(connection, error)
        except MessageStatusManagementError as error:
            await self._send_status_error(connection, error)

    async def _subscribe(
        self,
        connection: WebSocketConnection,
        event: SubscribeEvent,
    ) -> None:
        async with self._session_factory() as session:
            await ConversationService(ConversationRepository(session)).get_conversation(
                event.conversation_id, connection.user_id
            )

        self._connections.subscribe(connection, event.conversation_id)
        sent = await self._connections.send_event(
            connection,
            SubscribedEvent(conversation_id=event.conversation_id),
        )
        if not sent:
            return
        await self._send_current_statuses(connection, event.conversation_id)

    async def _unsubscribe(
        self,
        connection: WebSocketConnection,
        event: UnsubscribeEvent,
    ) -> None:
        self._connections.unsubscribe(connection, event.conversation_id)
        await self._connections.send_event(
            connection,
            UnsubscribedEvent(conversation_id=event.conversation_id),
        )

    async def _send_current_statuses(
        self,
        connection: WebSocketConnection,
        conversation_id: UUID,
    ) -> None:
        cursor: str | None = None
        while True:
            async with self._session_factory() as session:
                page = await MessageService(
                    MessageRepository(session),
                    ConversationRepository(session),
                ).list_messages(
                    conversation_id,
                    connection.user_id,
                    limit=100,
                    cursor=cursor,
                )
            for message in page.items:
                sent = await self._connections.send_event(
                    connection,
                    message_status_event(
                        conversation_id,
                        MessageStatusResponse.model_validate(message),
                    ),
                )
                if not sent:
                    return
            if page.next_cursor is None:
                return
            cursor = page.next_cursor

    async def _send_message(
        self,
        connection: WebSocketConnection,
        event: MessageSendEvent,
    ) -> None:
        if not self._connections.is_subscribed(connection, event.conversation_id):
            await self._permission_error(connection)
            return

        async with self._session_factory() as session:
            message, created, recipient_id = await MessageService(
                MessageRepository(session),
                ConversationRepository(session),
            ).send_message_idempotently(
                event.conversation_id,
                connection.user_id,
                event.content,
                event.client_message_id,
            )
        await self._connections.send_to_conversation(
            event.conversation_id,
            MessageSentEvent(
                client_message_id=event.client_message_id,
                message=message,
            ),
            user_ids={connection.user_id},
        )
        if created:
            await self._connections.send_to_conversation(
                event.conversation_id,
                MessageReceivedEvent(message=message),
                user_ids={recipient_id},
            )

    async def _acknowledge_delivery(
        self,
        connection: WebSocketConnection,
        event: MessageDeliveryAckEvent,
    ) -> None:
        if not self._connections.is_subscribed(connection, event.conversation_id):
            await self._permission_error(connection)
            return

        async with self._session_factory() as session:
            status = await MessageStatusService(
                MessageStatusRepository(session)
            ).acknowledge_delivery(
                event.message_id,
                connection.user_id,
                conversation_id=event.conversation_id,
            )

        await self._broadcast_status(
            event.conversation_id,
            status,
        )

    async def _acknowledge_delivery_batch(
        self,
        connection: WebSocketConnection,
        event: MessageDeliveryBatchAckEvent,
    ) -> None:
        if not self._connections.is_subscribed(connection, event.conversation_id):
            await self._permission_error(connection)
            return

        async with self._session_factory() as session:
            statuses = await MessageStatusService(
                MessageStatusRepository(session)
            ).acknowledge_delivery_batch(
                event.conversation_id,
                connection.user_id,
                event.message_ids,
            )

        for status in statuses.items:
            await self._broadcast_status(event.conversation_id, status)

    async def _acknowledge_read(
        self,
        connection: WebSocketConnection,
        event: MessageReadAckEvent,
    ) -> None:
        if not self._connections.is_subscribed(connection, event.conversation_id):
            await self._permission_error(connection)
            return

        async with self._session_factory() as session:
            statuses = await MessageStatusService(
                MessageStatusRepository(session)
            ).acknowledge_read_batch(
                event.conversation_id,
                connection.user_id,
                event.message_ids,
            )

        for status in statuses.items:
            await self._broadcast_status(
                event.conversation_id,
                status,
            )

    async def _broadcast_status(
        self,
        conversation_id: UUID,
        status: MessageStatusResponse,
    ) -> None:
        await broadcast_message_status(
            self._connections,
            conversation_id,
            status,
        )

    async def _send_conversation_error(
        self,
        connection: WebSocketConnection,
        error: ConversationManagementError,
    ) -> None:
        if isinstance(error, ConversationPermissionError):
            await self._permission_error(connection)
            return
        if isinstance(error, ConversationNotFoundError):
            await self._not_found_error(connection)
            return
        await self._internal_error(connection)

    async def _send_message_error(
        self,
        connection: WebSocketConnection,
        error: MessageManagementError,
    ) -> None:
        if isinstance(error, MessagePermissionError):
            await self._permission_error(connection)
            return
        if isinstance(error, MessageNotFoundError):
            await self._not_found_error(connection)
            return
        await self._internal_error(connection)

    async def _send_status_error(
        self,
        connection: WebSocketConnection,
        error: MessageStatusManagementError,
    ) -> None:
        if isinstance(error, MessageStatusPermissionError):
            await self._permission_error(connection)
            return
        if isinstance(error, MessageStatusNotFoundError):
            await self._not_found_error(connection)
            return
        await self._internal_error(connection)

    async def _permission_error(self, connection: WebSocketConnection) -> None:
        await self._connections.send_event(
            connection,
            ErrorEvent(
                code="permission_denied",
                detail="You are not allowed to perform this operation",
            ),
        )

    async def _not_found_error(self, connection: WebSocketConnection) -> None:
        await self._connections.send_event(
            connection,
            ErrorEvent(
                code="not_found",
                detail="Conversation or message not found",
            ),
        )

    async def _internal_error(self, connection: WebSocketConnection) -> None:
        await self._connections.send_event(
            connection,
            ErrorEvent(
                code="internal_error",
                detail="The operation could not be completed",
            ),
        )
