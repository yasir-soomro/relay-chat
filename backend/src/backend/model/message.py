from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from backend.DB.base import Base


class MessageStatus(StrEnum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        CheckConstraint(
            "status IN ('sent', 'delivered', 'read')",
            name="ck_messages_status",
        ),
        CheckConstraint(
            "content IS NULL OR char_length(content) > 0",
            name="ck_messages_nonempty_content",
        ),
        CheckConstraint(
            "(deleted_at IS NULL AND content IS NOT NULL) OR "
            "(deleted_at IS NOT NULL AND content IS NULL)",
            name="ck_messages_deleted_content",
        ),
        CheckConstraint(
            "(status = 'sent' AND delivered_at IS NULL AND read_at IS NULL) OR "
            "(status = 'delivered' AND delivered_at IS NOT NULL AND read_at IS NULL) OR "
            "(status = 'read' AND delivered_at IS NOT NULL AND read_at IS NOT NULL)",
            name="ck_messages_status_timestamps",
        ),
        CheckConstraint(
            "delivered_at IS NULL OR sent_at <= delivered_at",
            name="ck_messages_delivery_after_sent",
        ),
        CheckConstraint(
            "read_at IS NULL OR delivered_at <= read_at",
            name="ck_messages_read_after_delivery",
        ),
        UniqueConstraint(
            "conversation_id",
            "sender_id",
            "client_message_id",
            name="uq_messages_conversation_sender_client_message_id",
        ),
        Index(
            "ix_messages_conversation_created_id",
            "conversation_id",
            "created_at",
            "id",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    conversation_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    sender_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    client_message_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        nullable=True,
    )
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default=MessageStatus.SENT.value,
        server_default=MessageStatus.SENT.value,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
