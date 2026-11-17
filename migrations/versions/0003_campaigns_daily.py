import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '0003_campaigns_daily'
down_revision = '0002_conversion'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "campaigns_daily",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True
        ),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),

        # Campaign identity
        sa.Column("campaign_id", sa.Text(), nullable=False),
        sa.Column("campaign_name", sa.Text(), nullable=False),
        sa.Column("channel_type", sa.Text(), nullable=False),
        sa.Column("channel_subtype", sa.Text(), nullable=True),

        # Delivery status
        sa.Column("status", sa.Text(), nullable=True),
        sa.Column("primary_status", sa.Text(), nullable=True),
        sa.Column(
            "primary_status_reasons",
            postgresql.ARRAY(sa.Text()),
            nullable=True
        ),

        # Impression share (nullable, Search only)
        sa.Column("search_impression_share", sa.Numeric(5, 4), nullable=True),
        sa.Column("search_budget_lost_is", sa.Numeric(5, 4), nullable=True),
        sa.Column("search_rank_lost_is", sa.Numeric(5, 4), nullable=True),
        sa.Column("search_top_is", sa.Numeric(5, 4), nullable=True),
        sa.Column("search_abs_top_is", sa.Numeric(5, 4), nullable=True),

        # Budget
        sa.Column("budget_id", sa.Text(), nullable=True),
        sa.Column("budget_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("budget_period", sa.Text(), nullable=True),
        sa.Column("is_budget_shared", sa.Boolean(), nullable=True),
        sa.Column("budget_reference_count", sa.Integer(), nullable=True),
        sa.Column("budget_delivery_method", sa.Text(), nullable=True),

        # Bidding
        sa.Column("bidding_strategy_type", sa.Text(), nullable=True),
        sa.Column("target_cpa", sa.Numeric(12, 2), nullable=True),
        sa.Column("target_roas", sa.Numeric(8, 4), nullable=True),

        # Daily performance
        sa.Column("impressions", sa.BigInteger(), server_default="0"),
        sa.Column("clicks", sa.BigInteger(), server_default="0"),
        sa.Column("cost", sa.Numeric(12, 2), server_default="0.00"),
        sa.Column("conversions", sa.Numeric(12, 2), server_default="0.00"),
        sa.Column("conversion_value", sa.Numeric(12, 2), server_default="0.00"),

        # Derived metrics
        sa.Column("ctr", sa.Numeric(8, 4), nullable=True),
        sa.Column("cpc", sa.Numeric(12, 2), nullable=True),
        sa.Column("cvr", sa.Numeric(8, 4), nullable=True),
        sa.Column("cpa", sa.Numeric(12, 2), nullable=True),
        sa.Column("roas", sa.Numeric(8, 4), nullable=True),
        sa.Column("budget_utilisation", sa.Numeric(8, 4), nullable=True),

        sa.Column(
            "last_checked",
            sa.DateTime(timezone=True),
            server_default=sa.func.now()
        ),

        sa.UniqueConstraint(
            "client_id",
            "campaign_id",
            "date",
            name="unique_client_campaign_date"
        ),
    )


def downgrade() -> None:
    op.drop_table("campaigns_daily")