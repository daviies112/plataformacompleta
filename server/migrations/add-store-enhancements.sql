-- ============================================
-- Migration: Adicionar Funcionalidades Pandora/Vivara
-- Data: 2026-02-14
-- Descrição: Adiciona tabelas para benefits, videos, mosaics e campaigns
-- ============================================

-- ============================================
-- 1. ATUALIZAR STORE_SETTINGS
-- ============================================

ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_banner_autoplay BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_banner_interval INTEGER DEFAULT 5;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_benefits_bar BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS benefits_bar_background VARCHAR(20);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_video_section BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_mosaic_section BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS mosaic_layout_columns INTEGER DEFAULT 3;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_active_campaign BOOLEAN DEFAULT true;

-- ============================================
-- 2. TABELA DE BENEFÍCIOS
-- ============================================

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
CREATE INDEX IF NOT EXISTS idx_store_benefits_active ON store_benefits(is_active);
CREATE INDEX IF NOT EXISTS idx_store_benefits_order ON store_benefits(tenant_id, display_order);

COMMENT ON TABLE store_benefits IS 'Benefícios exibidos na barra de confiança (ex: Garantia, Entrega Grátis)';
COMMENT ON COLUMN store_benefits.icon IS 'Nome do ícone: gift, shield, truck, certificate';
COMMENT ON COLUMN store_benefits.title IS 'Texto principal (ex: "Garantia de 1 ano")';

-- ============================================
-- 3. TABELA DE VÍDEOS PROMOCIONAIS
-- ============================================

CREATE TABLE IF NOT EXISTS store_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title VARCHAR(200),
  description TEXT,
  video_url TEXT NOT NULL,
  video_type VARCHAR(20) DEFAULT 'url' CHECK (video_type IN ('youtube', 'vimeo', 'url')),
  thumbnail_url TEXT,
  section_type VARCHAR(50) DEFAULT 'hero' CHECK (section_type IN ('hero', 'institucional', 'produto')),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  autoplay BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_videos_tenant ON store_videos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_videos_active ON store_videos(is_active);
CREATE INDEX IF NOT EXISTS idx_store_videos_section ON store_videos(tenant_id, section_type);

COMMENT ON TABLE store_videos IS 'Vídeos promocionais e institucionais';
COMMENT ON COLUMN store_videos.video_type IS 'Tipo de vídeo: youtube | vimeo | url';
COMMENT ON COLUMN store_videos.section_type IS 'Onde exibir: hero | institucional | produto';

-- ============================================
-- 4. TABELA DE MOSAICO DE BANNERS
-- ============================================

CREATE TABLE IF NOT EXISTS store_mosaics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title VARCHAR(200),
  image_url TEXT NOT NULL,
  link_url TEXT,
  layout_type VARCHAR(10) DEFAULT '1x1' CHECK (layout_type IN ('1x1', '1x2', '2x1', '2x2')),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_mosaics_tenant ON store_mosaics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_mosaics_active ON store_mosaics(is_active);
CREATE INDEX IF NOT EXISTS idx_store_mosaics_order ON store_mosaics(tenant_id, display_order);

COMMENT ON TABLE store_mosaics IS 'Mosaico de imagens clicáveis em grid irregular';
COMMENT ON COLUMN store_mosaics.layout_type IS 'Tamanho do tile: 1x1 (padrão) | 1x2 (alto) | 2x1 (largo) | 2x2 (grande)';

-- ============================================
-- 5. TABELA DE CAMPANHAS SAZONAIS
-- ============================================

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
CREATE INDEX IF NOT EXISTS idx_store_campaigns_active ON store_campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_store_campaigns_dates ON store_campaigns(tenant_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_store_campaigns_current ON store_campaigns(tenant_id, is_active)
  WHERE is_active = true AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE;

COMMENT ON TABLE store_campaigns IS 'Campanhas sazonais (Dia das Mães, Black Friday, etc.)';
COMMENT ON COLUMN store_campaigns.badge_text IS 'Badge de urgência: "Últimos dias!", "Oferta por tempo limitado"';
COMMENT ON COLUMN store_campaigns.target_product_ids IS 'Array de UUIDs dos produtos incluídos na campanha';

-- ============================================
-- 6. TRIGGERS PARA UPDATED_AT
-- ============================================

-- Função auxiliar (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_store_benefits_updated_at ON store_benefits;
CREATE TRIGGER update_store_benefits_updated_at
  BEFORE UPDATE ON store_benefits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_videos_updated_at ON store_videos;
CREATE TRIGGER update_store_videos_updated_at
  BEFORE UPDATE ON store_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_mosaics_updated_at ON store_mosaics;
CREATE TRIGGER update_store_mosaics_updated_at
  BEFORE UPDATE ON store_mosaics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_campaigns_updated_at ON store_campaigns;
CREATE TRIGGER update_store_campaigns_updated_at
  BEFORE UPDATE ON store_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. DADOS DE EXEMPLO (OPCIONAL)
-- ============================================

-- Exemplo de benefícios padrão (comentado - descomentar se quiser)
/*
INSERT INTO store_benefits (tenant_id, icon, title, description, display_order, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'gift', 'Embalagem Grátis', 'Todas as compras incluem embalagem de presente', 1, true),
  ('00000000-0000-0000-0000-000000000000', 'shield', 'Garantia de 1 Ano', 'Produtos com garantia contra defeitos', 2, true),
  ('00000000-0000-0000-0000-000000000000', 'certificate', 'Certificado de Qualidade', 'Peças com certificado de autenticidade', 3, true),
  ('00000000-0000-0000-0000-000000000000', 'truck', 'Entrega Segura', 'Entrega com rastreamento', 4, true);
*/

-- ============================================
-- 8. VERIFICAÇÃO
-- ============================================

-- Verificar tabelas criadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('store_benefits', 'store_videos', 'store_mosaics', 'store_campaigns')
ORDER BY table_name;

-- Verificar novas colunas em store_settings
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'store_settings'
  AND column_name IN (
    'hero_banner_autoplay',
    'hero_banner_interval',
    'show_benefits_bar',
    'benefits_bar_background',
    'show_video_section',
    'show_mosaic_section',
    'mosaic_layout_columns',
    'show_active_campaign'
  )
ORDER BY column_name;
