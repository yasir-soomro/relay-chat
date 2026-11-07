from uuid import UUID

from backend.schemas.message_status import MessageStatusResponse
from backend.websocket.connection_manager import ConnectionManager
from backend.websocket.events import MessageStatusEvent


def message_status_event(
    conversation_id: UUID,
    status: MessageStatusResponse,
) -> MessageStatusEvent:
    return MessageStatusEvent(conversation_id=conversation_id, status=status)


async def broadcast_message_status(
    manager: ConnectionManager,
    conversation_id: UUID,
    status: MessageStatusResponse,
) -> None:
    await manager.send_to_conversation(
        conversation_id,
        message_status_event(conversation_id, status),
    )
