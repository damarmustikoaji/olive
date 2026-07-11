SET search_path TO workforce;

ALTER TABLE content_pieces
  ADD COLUMN published_at TIMESTAMPTZ,
  ADD COLUMN published_url TEXT;
