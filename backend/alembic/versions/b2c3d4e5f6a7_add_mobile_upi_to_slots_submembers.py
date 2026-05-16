"""add mobile_number and upi_id to contributor_slots and sub_members

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('contributor_slots') as batch_op:
        batch_op.add_column(sa.Column('mobile_number', sa.String(20), nullable=True))
        batch_op.add_column(sa.Column('upi_id', sa.String(), nullable=True))

    with op.batch_alter_table('sub_members') as batch_op:
        batch_op.add_column(sa.Column('mobile_number', sa.String(20), nullable=True))
        batch_op.add_column(sa.Column('upi_id', sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('sub_members') as batch_op:
        batch_op.drop_column('upi_id')
        batch_op.drop_column('mobile_number')

    with op.batch_alter_table('contributor_slots') as batch_op:
        batch_op.drop_column('upi_id')
        batch_op.drop_column('mobile_number')
