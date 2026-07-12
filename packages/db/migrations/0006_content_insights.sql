SET search_path TO workforce;

-- Needed to look up Threads Insights for a published piece — publishedUrl
-- alone isn't enough, the Insights API keys off the numeric media id
-- returned when the container was published.
ALTER TABLE content_pieces ADD COLUMN IF NOT EXISTS published_media_id VARCHAR(64);

-- One row per daily metrics snapshot per piece (not just the latest), so
-- growth over time is visible instead of only a single overwritten total.
CREATE TABLE content_insights (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_piece_id  UUID REFERENCES content_pieces(id) ON DELETE CASCADE,
  views             INTEGER NOT NULL DEFAULT 0,
  likes             INTEGER NOT NULL DEFAULT 0,
  replies           INTEGER NOT NULL DEFAULT 0,
  reposts           INTEGER NOT NULL DEFAULT 0,
  quotes            INTEGER NOT NULL DEFAULT 0,
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_insights_piece ON content_insights(content_piece_id, fetched_at DESC);
