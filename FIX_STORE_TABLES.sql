
-- ==============================================================================
-- CORREÇÃO TOTAL DE TABELAS DA LOJA (VERSÃO FINAL COM LIMPEZA)
-- Execute este script no Supabase SQL Editor para corrigir o erro 500
-- ==============================================================================

-- 1. STORE_THEMES
CREATE TABLE IF NOT EXISTS store_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, 
  logo_url TEXT,
  logo_size TEXT DEFAULT 'medium',
  logo_position TEXT DEFAULT 'center',
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#d4af37',
  secondary_color TEXT DEFAULT '#1a1a1a',
  accent_color TEXT DEFAULT '#e8b4bc',
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#2c2c2c',
  heading_color TEXT DEFAULT '#1a1a1a',
  font_heading TEXT DEFAULT 'Cormorant Garamond',
  font_body TEXT DEFAULT 'DM Sans',
  font_size_base INTEGER DEFAULT 16,
  font_size_heading INTEGER DEFAULT 32,
  layout_template TEXT DEFAULT 'luxury',
  product_grid_columns INTEGER DEFAULT 4,
  product_grid_columns_mobile INTEGER DEFAULT 2,
  spacing_unit INTEGER DEFAULT 16,
  border_radius INTEGER DEFAULT 8,
  enable_animations BOOLEAN DEFAULT true,
  animation_speed TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_themes_tenant ON store_themes(tenant_id);

-- 2. STORE_SECTIONS
CREATE TABLE IF NOT EXISTS store_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  section_type TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  content JSONB,
  background_color TEXT,
  text_color TEXT,
  padding_top INTEGER DEFAULT 60,
  padding_bottom INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_sections_tenant ON store_sections(tenant_id);

-- 3. STORE_BANNERS
CREATE TABLE IF NOT EXISTS store_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  image_mobile_url TEXT,
  cta_text TEXT,
  cta_link TEXT,
  cta_style TEXT DEFAULT 'primary',
  section_type TEXT DEFAULT 'hero',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_banners_tenant ON store_banners(tenant_id);

-- 4. STORE_COLLECTIONS
CREATE TABLE IF NOT EXISTS store_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  product_ids UUID[],
  is_featured BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uk_store_collections_tenant_slug UNIQUE (tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_store_collections_tenant ON store_collections(tenant_id);

-- 5. STORE_SETTINGS
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  instagram_url TEXT,
  facebook_url TEXT,
  whatsapp_number TEXT,
  enable_checkout BOOLEAN DEFAULT true,
  payment_methods TEXT[] DEFAULT ARRAY['credit_card', 'pix'],
  shipping_enabled BOOLEAN DEFAULT false,
  order_notification_email TEXT,
  order_notification_whatsapp TEXT,
  terms_url TEXT,
  privacy_url TEXT,
  return_policy TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CORREÇÃO DE DUPLICATAS: Remove configurações duplicadas mantendo a mais recente
DELETE FROM store_settings
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY updated_at DESC) as rnum
    FROM store_settings
  ) t
  WHERE t.rnum > 1
);

-- Criar índice único após limpeza
DROP INDEX IF EXISTS idx_store_settings_reseller;
DROP INDEX IF EXISTS idx_store_settings_tenant;
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_settings_tenant_unique ON store_settings(tenant_id);

-- 6. ATUALIZAÇÕES STORE_SETTINGS (Enhancements)
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_banner_autoplay BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_banner_interval INTEGER DEFAULT 5;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_benefits_bar BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS benefits_bar_background VARCHAR(20);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_video_section BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_mosaic_section BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS mosaic_layout_columns INTEGER DEFAULT 3;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_active_campaign BOOLEAN DEFAULT true;

-- 7. STORE_BENEFITS
CREATE TABLE IF NOT EXISTS store_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  icon VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_benefits_tenant ON store_benefits(tenant_id);

-- 8. STORE_VIDEOS
CREATE TABLE IF NOT EXISTS store_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title VARCHAR(200),
  description TEXT,
  video_url TEXT NOT NULL,
  video_type VARCHAR(20) DEFAULT 'url',
  thumbnail_url TEXT,
  section_type VARCHAR(50) DEFAULT 'hero',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  autoplay BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_videos_tenant ON store_videos(tenant_id);

-- 9. STORE_MOSAICS
CREATE TABLE IF NOT EXISTS store_mosaics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title VARCHAR(200),
  image_url TEXT NOT NULL,
  link_url TEXT,
  layout_type VARCHAR(10) DEFAULT '1x1',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_mosaics_tenant ON store_mosaics(tenant_id);

-- 10. STORE_CAMPAIGNS (CORREÇÃO DO ERRO PRINCIPAL)
CREATE TABLE IF NOT EXISTS store_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  image_url TEXT,
  badge_text VARCHAR(100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  discount_percentage INTEGER CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  target_product_ids UUID[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_store_campaigns_tenant ON store_campaigns(tenant_id);

-- 11. TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_store_themes_updated_at') THEN
    CREATE TRIGGER update_store_themes_updated_at BEFORE UPDATE ON store_themes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_store_sections_updated_at') THEN
    CREATE TRIGGER update_store_sections_updated_at BEFORE UPDATE ON store_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_store_banners_updated_at') THEN
    CREATE TRIGGER update_store_banners_updated_at BEFORE UPDATE ON store_banners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_store_collections_updated_at') THEN
    CREATE TRIGGER update_store_collections_updated_at BEFORE UPDATE ON store_collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_store_settings_updated_at') THEN
    CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON store_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_store_benefits_updated_at') THEN
    CREATE TRIGGER update_store_benefits_updated_at BEFORE UPDATE ON store_benefits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_store_videos_updated_at') THEN
    CREATE TRIGGER update_store_videos_updated_at BEFORE UPDATE ON store_videos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_store_mosaics_updated_at') THEN
    CREATE TRIGGER update_store_mosaics_updated_at BEFORE UPDATE ON store_mosaics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_store_campaigns_updated_at') THEN
    CREATE TRIGGER update_store_campaigns_updated_at BEFORE UPDATE ON store_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
