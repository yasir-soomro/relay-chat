"""Add user connections and directional blocks.

Revision ID: 20261106_03_conn
Revises: 20261106_02_auth
Create Date: 2026-11-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261106_03_conn"
down_revision: str | None = "20261106_02_auth"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "connections",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_low_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_high_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("requester_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("recipient_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column(
            "requested_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("removed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "user_low_id < user_high_id",
            name="ck_connections_ordered_users",
        ),
        sa.CheckConstraint(
            "requester_id <> recipient_id",
            name="ck_connections_distinct_request_users",
        ),
        sa.CheckConstraint(
            "(requester_id = user_low_id AND recipient_id = user_high_id) OR "
            "(requester_id = user_high_id AND recipient_id = user_low_id)",
            name="ck_connections_request_users_match_pair",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'accepted', 'rejected', 'removed')",
            name="ck_connections_status",
        ),
        sa.ForeignKeyConstraint(
            ["user_low_id"],
            ["users.id"],
            name="fk_connections_user_low_id_users",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_high_id"],
            ["users.id"],
            name="fk_connections_user_high_id_users",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["requester_id"],
            ["users.id"],
            name="fk_connections_requester_id_users",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["recipient_id"],
            ["users.id"],
            name="fk_connections_recipient_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_connections"),
        sa.UniqueConstraint(
            "user_low_id",
            "user_high_id",
            name="uq_connections_user_pair",
        ),
    )
    op.create_index(
        "ix_connections_recipient_status",
        "connections",
        ["recipient_id", "status"],
    )
    op.create_index(
        "ix_connections_requester_status",
        "connections",
        ["requester_id", "status"],
    )
    op.create_table(
        "user_blocks",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("blocker_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("blocked_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "blocker_id <> blocked_id",
            name="ck_user_blocks_distinct_users",
        ),
        sa.ForeignKeyConstraint(
            ["blocker_id"],
            ["users.id"],
            name="fk_user_blocks_blocker_id_users",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["blocked_id"],
            ["users.id"],
            name="fk_user_blocks_blocked_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_user_blocks"),
        sa.UniqueConstraint(
            "blocker_id",
            "blocked_id",
            name="uq_user_blocks_direction",
        ),
    )
    op.create_index("ix_user_blocks_blocked_id", "user_blocks", ["blocked_id"])
    op.create_index(
        "uq_user_blocks_pair",
        "user_blocks",
        [
            sa.text("least(blocker_id, blocked_id)"),
            sa.text("greatest(blocker_id, blocked_id)"),
        ],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_user_blocks_pair", table_name="user_blocks")
    op.drop_index("ix_user_blocks_blocked_id", table_name="user_blocks")
    op.drop_table("user_blocks")
    op.drop_index("ix_connections_requester_status", table_name="connections")
    op.drop_index("ix_connections_recipient_status", table_name="connections")
    op.drop_table("connections")
