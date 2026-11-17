import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '0004_ad_groups_daily'
down_revision = '0003_campaigns_daily'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ad_groups_daily",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),

        # Identity
        sa.Column("campaign_id", sa.Text(), nullable=False),
        sa.Column("campaign_name", sa.Text(), nullable=False),
        sa.Column("ad_group_id", sa.Text(), nullable=False),
        sa.Column("ad_group_name", sa.Text(), nullable=False),
        sa.Column("type", sa.Text(), nullable=True),

        # Delivery status
        sa.Column("status", sa.Text(), nullable=True),
        sa.Column("primary_status", sa.Text(), nullable=True),
        sa.Column("primary_status_reasons", postgresql.ARRAY(sa.Text()), nullable=True),

        # Bidding
        sa.Column("cpc_bid", sa.Numeric(12, 2), nullable=True),
        sa.Column("target_cpa", sa.Numeric(12, 2), nullable=True),
        sa.Column("target_roas", sa.Numeric(8, 4), nullable=True),
        sa.Column("effective_target_cpa", sa.Numeric(12, 2), nullable=True),
        sa.Column("effective_target_cpa_source", sa.Text(), nullable=True),
        sa.Column("effective_target_roas", sa.Numeric(8, 4), nullable=True),
        sa.Column("effective_target_roas_source", sa.Text(), nullable=True),
        sa.Column("optimized_targeting_enabled", sa.Boolean(), nullable=True),

        # Performance
        sa.Column("impressions", sa.BigInteger(), server_default="0"),
        sa.Column("clicks", sa.BigInteger(), server_default="0"),
        sa.Column("cost", sa.Numeric(12, 2), server_default="0.00"),
        sa.Column("conversions", sa.Numeric(12, 2), server_default="0.00"),
        sa.Column("conversion_value", sa.Numeric(12, 2), server_default="0.00"),
        sa.Column("all_conversions", sa.Numeric(12, 2), server_default="0.00"),
        sa.Column("all_conversion_value", sa.Numeric(12, 2), server_default="0.00"),

        # Impression share
        sa.Column("search_impression_share", sa.Numeric(5, 4), nullable=True),
        sa.Column("search_rank_lost_is", sa.Numeric(5, 4), nullable=True),
        sa.Column("top_impression_percentage", sa.Numeric(5, 4), nullable=True),
        sa.Column("absolute_top_impression_percentage", sa.Numeric(5, 4), nullable=True),

        # Derived metrics
        sa.Column("ctr", sa.Numeric(8, 4), server_default="0.00"),
        sa.Column("cpc", sa.Numeric(12, 2), server_default="0.00"),
        sa.Column("cvr", sa.Numeric(8, 4), server_default="0.00"),
        sa.Column("cpa", sa.Numeric(12, 2), server_default="0.00"),
        sa.Column("roas", sa.Numeric(8, 4), server_default="0.00"),

        sa.Column("last_checked", sa.DateTime(timezone=True),
                  server_default=sa.func.now()),

        sa.UniqueConstraint(
            "client_id", "ad_group_id", "date",
            name="unique_client_ad_group_date"
        ),
    )


def downgrade() -> None:
    op.drop_table("ad_groups_daily")