from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from backend.DB.base import Base


class Connection(Base):
    __tablename__ = "connections"
    __table_args__ = (
        CheckConstraint(
            "user_low_id < user_high_id", name="ck_connections_ordered_users"
        ),
        CheckConstraint(
            "requester_id <> recipient_id",
            name="ck_connections_distinct_request_users",
        ),
        CheckConstraint(
            "(requester_id = user_low_id AND recipient_id = user_high_id) OR "
            "(requester_id = user_high_id AND recipient_id = user_low_id)",
            name="ck_connections_request_users_match_pair",
        ),
        CheckConstraint(
            "status IN ('pending', 'accepted', 'rejected', 'removed')",
            name="ck_connections_status",
        ),
        UniqueConstraint(
            "user_low_id",
            "user_high_id",
            name="uq_connections_user_pair",
        ),
        Index("ix_connections_recipient_status", "recipient_id", "status"),
        Index("ix_connections_requester_status", "requester_id", "status"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    user_low_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_high_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    requester_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    recipient_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    responded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    rejected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    removed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class UserBlock(Base):
    __tablename__ = "user_blocks"
    __table_args__ = (
        CheckConstraint(
            "blocker_id <> blocked_id",
            name="ck_user_blocks_distinct_users",
        ),
        UniqueConstraint("blocker_id", "blocked_id", name="uq_user_blocks_direction"),
        Index(
            "uq_user_blocks_pair",
            func.least(text("blocker_id"), text("blocked_id")),
            func.greatest(text("blocker_id"), text("blocked_id")),
            unique=True,
        ),
        Index("ix_user_blocks_blocked_id", "blocked_id"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    blocker_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    blocked_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
