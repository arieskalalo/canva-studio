-- ===== CANVA Studio — Supabase Schema =====
-- Run this in your Supabase SQL editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===== Designs =====
CREATE TABLE IF NOT EXISTS designs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Untitled Design',
  canvas_json JSONB NOT NULL DEFAULT '{}',
  width       INTEGER NOT NULL DEFAULT 800,
  height      INTEGER NOT NULL DEFAULT 600,
  thumbnail_url TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own designs"
  ON designs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ===== Design Versions (Snapshots) =====
CREATE TABLE IF NOT EXISTS design_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id   UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL DEFAULT 'Snapshot',
  canvas_json JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE design_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own design versions"
  ON design_versions FOR ALL
  USING (
    auth.uid() = (SELECT user_id FROM designs WHERE id = design_versions.design_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM designs WHERE id = design_versions.design_id)
  );

-- ===== Brand Kits =====
CREATE TABLE IF NOT EXISTS brand_kits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Default',
  colors      JSONB NOT NULL DEFAULT '[]',
  fonts       JSONB NOT NULL DEFAULT '[]',
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own brand kit"
  ON brand_kits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ===== Storage Buckets =====
-- Run these in the Storage section or via SQL:

INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-assets', 'brand-assets', false) ON CONFLICT DO NOTHING;

-- Storage RLS for thumbnails (public read)
CREATE POLICY "Public thumbnail access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thumbnails');

CREATE POLICY "Users upload own thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own thumbnails"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage RLS for brand-assets
CREATE POLICY "Users manage own brand assets"
  ON storage.objects FOR ALL
  USING (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ===== updated_at trigger =====
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER designs_updated_at
  BEFORE UPDATE ON designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER brand_kits_updated_at
  BEFORE UPDATE ON brand_kits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
