"""Add message delivery and read acknowledgments.

Revision ID: 20261107_06_status
Revises: 20261107_05_msg
Create Date: 2026-11-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261107_06_status"
down_revision: str | None = "20261107_05_msg"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "messages",
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "messages",
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "messages",
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        "UPDATE messages SET "
        "sent_at = created_at, "
        "status = CASE WHEN status = 'sending' THEN 'sent' ELSE status END, "
        "delivered_at = CASE WHEN status IN ('delivered', 'read') "
        "THEN updated_at ELSE NULL END, "
        "read_at = CASE WHEN status = 'read' THEN updated_at ELSE NULL END"
    )
    op.alter_column(
        "messages",
        "sent_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    )
    op.drop_constraint("ck_messages_status", "messages", type_="check")
    op.create_check_constraint(
        "ck_messages_status",
        "messages",
        "status IN ('sent', 'delivered', 'read')",
    )
    op.create_check_constraint(
        "ck_messages_status_timestamps",
        "messages",
        "(status = 'sent' AND delivered_at IS NULL AND read_at IS NULL) OR "
        "(status = 'delivered' AND delivered_at IS NOT NULL AND read_at IS NULL) OR "
        "(status = 'read' AND delivered_at IS NOT NULL AND read_at IS NOT NULL)",
    )
    op.create_check_constraint(
        "ck_messages_delivery_after_sent",
        "messages",
        "delivered_at IS NULL OR sent_at <= delivered_at",
    )
    op.create_check_constraint(
        "ck_messages_read_after_delivery",
        "messages",
        "read_at IS NULL OR delivered_at <= read_at",
    )


def downgrade() -> None:
    op.drop_constraint("ck_messages_read_after_delivery", "messages", type_="check")
    op.drop_constraint("ck_messages_delivery_after_sent", "messages", type_="check")
    op.drop_constraint("ck_messages_status_timestamps", "messages", type_="check")
    op.drop_constraint("ck_messages_status", "messages", type_="check")
    op.create_check_constraint(
        "ck_messages_status",
        "messages",
        "status IN ('sending', 'sent', 'delivered', 'read')",
    )
    op.drop_column("messages", "read_at")
    op.drop_column("messages", "delivered_at")
    op.drop_column("messages", "sent_at")
