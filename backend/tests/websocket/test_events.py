from uuid import uuid4

import pytest
from pydantic import ValidationError

from backend.websocket.events import (
    MessageDeliveryBatchAckEvent,
    MessageReadAckEvent,
    inbound_event_adapter,
)


def test_message_send_requires_client_id_and_rejects_identity_override() -> None:
    event = {
        "type": "message.send",
        "conversation_id": str(uuid4()),
        "client_message_id": str(uuid4()),
        "content": "hello",
        "sender_id": str(uuid4()),
    }

    with pytest.raises(ValidationError):
        inbound_event_adapter.validate_python(event)


def test_read_ack_supports_one_or_many_unique_message_ids() -> None:
    conversation_id = uuid4()
    message_ids = [uuid4(), uuid4()]

    event = inbound_event_adapter.validate_python(
        {
            "type": "message.read_ack",
            "conversation_id": str(conversation_id),
            "message_ids": [str(message_id) for message_id in message_ids],
        }
    )

    assert isinstance(event, MessageReadAckEvent)
    assert event.conversation_id == conversation_id
    assert event.message_ids == message_ids


def test_read_ack_rejects_duplicate_message_ids() -> None:
    conversation_id, message_id = uuid4(), uuid4()

    with pytest.raises(ValidationError):
        inbound_event_adapter.validate_python(
            {
                "type": "message.read_ack",
                "conversation_id": str(conversation_id),
                "message_ids": [str(message_id), str(message_id)],
            }
        )


def test_batch_delivery_ack_rejects_duplicate_message_ids() -> None:
    conversation_id, message_id = uuid4(), uuid4()

    with pytest.raises(ValidationError):
        inbound_event_adapter.validate_python(
            {
                "type": "message.delivery_ack_batch",
                "conversation_id": str(conversation_id),
                "message_ids": [str(message_id), str(message_id)],
            }
        )

    valid = inbound_event_adapter.validate_python(
        {
            "type": "message.delivery_ack_batch",
            "conversation_id": str(conversation_id),
            "message_ids": [str(message_id)],
        }
    )
    assert isinstance(valid, MessageDeliveryBatchAckEvent)
