import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '0002_conversion'
down_revision = '0001_connected_accounts'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "conversions",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversion_action_id", sa.Text(), nullable=False),
        sa.Column("conversion_action_name", sa.Text(), nullable=False),
        sa.Column("conversion_category", sa.Text(), nullable=False),
        sa.Column("conversion_type", sa.Text(), nullable=True),
        sa.Column("conversion_origin", sa.Text(), nullable=True),
        sa.Column("action_optimization", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("conversions", sa.Numeric(12, 2), default=0.00),
        sa.Column("conversion_value", sa.Numeric(12, 2), default=0.00),
        sa.Column("all_conversions", sa.Numeric(12, 2), default=0.00),
        sa.Column("all_conversions_value", sa.Numeric(12, 2), default=0.00),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("last_checked", sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
        sa.UniqueConstraint("client_id", "conversion_action_id", "date", name="unique_client_conversion"),
    )


def downgrade() -> None:
    op.drop_table("conversions")