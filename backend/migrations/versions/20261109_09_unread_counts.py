"""Add an index for unread-message aggregation.

Revision ID: 20261109_09_unread_counts
Revises: 20261109_08_discovery
Create Date: 2026-11-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261109_09_unread_counts"
down_revision: str | None = "20261109_08_discovery"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "ix_messages_unread_conversation_sender",
        "messages",
        ["conversation_id", "sender_id"],
        postgresql_where=sa.text("status <> 'read'"),
    )


def downgrade() -> None:
    op.drop_index("ix_messages_unread_conversation_sender", table_name="messages")
