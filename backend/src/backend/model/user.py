from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from backend.DB.base import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("email = lower(email)", name="ck_users_email_normalized"),
        CheckConstraint(
            "username ~ '^[a-z0-9_]{3,30}$'",
            name="ck_users_username_format",
        ),
        CheckConstraint(
            "char_length(display_name) BETWEEN 1 AND 50",
            name="ck_users_display_name_length",
        ),
        CheckConstraint(
            "bio IS NULL OR char_length(bio) <= 160",
            name="ck_users_bio_length",
        ),
        Index("uq_users_email_normalized", func.lower(text("email")), unique=True),
        Index(
            "uq_users_username_normalized", func.lower(text("username")), unique=True
        ),
        Index(
            "ix_users_username",
            "username",
        ),
        Index(
            "ix_users_username_pattern",
            "username",
            postgresql_ops={"username": "varchar_pattern_ops"},
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    username: Mapped[str] = mapped_column(String(30), nullable=False)
    display_name: Mapped[str] = mapped_column(String(50), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    bio: Mapped[str | None] = mapped_column(String(160), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
