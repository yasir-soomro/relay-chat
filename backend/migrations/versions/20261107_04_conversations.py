"""Add one-to-one conversations.

Revision ID: 20261107_04_conv
Revises: 20261106_03_conn
Create Date: 2026-11-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261107_04_conv"
down_revision: str | None = "20261106_03_conn"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "conversations",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_low_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_high_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "user_low_id < user_high_id",
            name="ck_conversations_ordered_users",
        ),
        sa.ForeignKeyConstraint(
            ["user_low_id"],
            ["users.id"],
            name="fk_conversations_user_low_id_users",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_high_id"],
            ["users.id"],
            name="fk_conversations_user_high_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_conversations"),
        sa.UniqueConstraint(
            "user_low_id",
            "user_high_id",
            name="uq_conversations_user_pair",
        ),
    )
    op.create_index(
        "ix_conversations_user_low_created",
        "conversations",
        ["user_low_id", "created_at"],
    )
    op.create_index(
        "ix_conversations_user_high_created",
        "conversations",
        ["user_high_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_conversations_user_high_created",
        table_name="conversations",
    )
    op.drop_index(
        "ix_conversations_user_low_created",
        table_name="conversations",
    )
    op.drop_table("conversations")
