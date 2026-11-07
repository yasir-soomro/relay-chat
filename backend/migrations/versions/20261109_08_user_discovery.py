"""Add an index for username prefix searches.

Revision ID: 20261109_08_discovery
Revises: 20261108_07_ws
Create Date: 2026-11-09
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20261109_08_discovery"
down_revision: str | None = "20261108_07_ws"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index("ix_users_username", "users", ["username"])
    op.create_index(
        "ix_users_username_pattern",
        "users",
        ["username"],
        postgresql_ops={"username": "varchar_pattern_ops"},
    )


def downgrade() -> None:
    op.drop_index("ix_users_username_pattern", table_name="users")
    op.drop_index("ix_users_username", table_name="users")
