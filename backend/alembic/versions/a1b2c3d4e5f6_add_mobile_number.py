"""add mobile_number, make email nullable

Revision ID: a1b2c3d4e5f6
Revises: 33b8fda87c3b
Create Date: 2026-05-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '33b8fda87c3b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite requires batch mode for column alterations
    with op.batch_alter_table('users', schema=None) as batch_op:
        # Rename existing `mobile` column to `mobile_number`
        batch_op.alter_column('mobile', new_column_name='mobile_number',
                              existing_type=sa.String(), existing_nullable=True)
        # Make email nullable
        batch_op.alter_column('email',
                              existing_type=sa.String(),
                              nullable=True)

    # Add unique index on mobile_number
    op.create_index('ix_users_mobile_number', 'users', ['mobile_number'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_users_mobile_number', table_name='users')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('mobile_number', new_column_name='mobile',
                              existing_type=sa.String(), existing_nullable=True)
        batch_op.alter_column('email',
                              existing_type=sa.String(),
                              nullable=False)
