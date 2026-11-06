from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, model_validator

from backend.schemas.message import MessageResponse
from backend.schemas.message_status import MessageStatusResponse


class ClientEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AuthEvent(ClientEvent):
    type: Literal["auth"]
    access_token: str = Field(min_length=1)


class SubscribeEvent(ClientEvent):
    type: Literal["subscribe"]
    conversation_id: UUID


class UnsubscribeEvent(ClientEvent):
    type: Literal["unsubscribe"]
    conversation_id: UUID


class MessageSendEvent(ClientEvent):
    type: Literal["message.send"]
    conversation_id: UUID
    client_message_id: UUID
    content: str = Field(min_length=1)


class MessageDeliveryAckEvent(ClientEvent):
    type: Literal["message.delivery_ack"]
    conversation_id: UUID
    message_id: UUID


class MessageDeliveryBatchAckEvent(ClientEvent):
    type: Literal["message.delivery_ack_batch"]
    conversation_id: UUID
    message_ids: list[UUID] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def require_unique_message_ids(self) -> MessageDeliveryBatchAckEvent:
        if len(set(self.message_ids)) != len(self.message_ids):
            raise ValueError("message_ids must be unique")
        return self


class MessageReadAckEvent(ClientEvent):
    type: Literal["message.read_ack"]
    conversation_id: UUID
    message_ids: list[UUID] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def require_unique_message_ids(self) -> MessageReadAckEvent:
        if len(set(self.message_ids)) != len(self.message_ids):
            raise ValueError("message_ids must be unique")
        return self


type InboundEvent = (
    AuthEvent
    | SubscribeEvent
    | UnsubscribeEvent
    | MessageSendEvent
    | MessageDeliveryAckEvent
    | MessageDeliveryBatchAckEvent
    | MessageReadAckEvent
)
inbound_event_adapter = TypeAdapter(
    Annotated[InboundEvent, Field(discriminator="type")]
)


class ServerEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AuthOKEvent(ServerEvent):
    type: Literal["auth.ok"] = "auth.ok"
    user_id: UUID


class SubscribedEvent(ServerEvent):
    type: Literal["subscribed"] = "subscribed"
    conversation_id: UUID


class UnsubscribedEvent(ServerEvent):
    type: Literal["unsubscribed"] = "unsubscribed"
    conversation_id: UUID


class MessageSentEvent(ServerEvent):
    type: Literal["message.sent"] = "message.sent"
    client_message_id: UUID
    message: MessageResponse


class MessageReceivedEvent(ServerEvent):
    type: Literal["message.received"] = "message.received"
    message: MessageResponse


class MessageStatusEvent(ServerEvent):
    type: Literal["message.status"] = "message.status"
    conversation_id: UUID
    status: MessageStatusResponse


class ErrorEvent(ServerEvent):
    type: Literal["error"] = "error"
    code: str
    detail: str
