-- ============================================================
-- PriceHawk — V2_add_trending_deal_fields.sql
-- Bổ sung field phục vụ Trending Deals: popularity_score, trust_score, is_pinned
-- An toàn khi chạy nhiều môi trường (IF NOT EXISTS).
-- ============================================================

-- Product popularity score (0–100)
ALTER TABLE product
    ADD COLUMN IF NOT EXISTS popularity_score INT NOT NULL DEFAULT 0;

-- Listing trust score (0.0–1.0) và pin flag
ALTER TABLE product_listing
    ADD COLUMN IF NOT EXISTS trust_score DOUBLE PRECISION NOT NULL DEFAULT 0.50;

ALTER TABLE product_listing
    ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_product_listing_pinned
    ON product_listing(is_pinned);

CREATE INDEX IF NOT EXISTS idx_product_listing_trust_score
    ON product_listing(trust_score);

