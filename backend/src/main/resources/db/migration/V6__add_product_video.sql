CREATE TABLE IF NOT EXISTS product_video (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(500) NOT NULL,
    video_url       VARCHAR(1000) NOT NULL,
    thumbnail_url   VARCHAR(1000),
    public_id       VARCHAR(500),
    duration        INTEGER,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by      UUID
);

CREATE TABLE IF NOT EXISTS product_video_mapping (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id    UUID NOT NULL REFERENCES product_video(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL,
    UNIQUE (video_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_video_created_at ON product_video(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_video_mapping_video ON product_video_mapping(video_id);
CREATE INDEX IF NOT EXISTS idx_product_video_mapping_product ON product_video_mapping(product_id);
