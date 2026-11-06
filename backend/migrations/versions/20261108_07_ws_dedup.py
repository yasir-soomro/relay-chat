"""Add WebSocket client-message idempotency keys.

Revision ID: 20261108_07_ws
Revises: 20261107_06_status
Create Date: 2026-11-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261108_07_ws"
down_revision: str | None = "20261107_06_status"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "messages",
        sa.Column("client_message_id", sa.Uuid(as_uuid=True), nullable=True),
    )
    op.create_unique_constraint(
        "uq_messages_conversation_sender_client_message_id",
        "messages",
        ["conversation_id", "sender_id", "client_message_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_messages_conversation_sender_client_message_id",
        "messages",
        type_="unique",
    )
    op.drop_column("messages", "client_message_id")
