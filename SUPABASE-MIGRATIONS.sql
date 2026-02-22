-- ============================================
-- MIGRATIONS COMPLETAS - STORE ENHANCEMENT
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Verificar se as tabelas já existem
DO $$ 
BEGIN
  RAISE NOTICE 'Iniciando migrations das tabelas Store...';
END $$;

-- ========================================
-- MIGRAÇÃO: Tabelas de Personalização de Loja
-- Criado em: 2026-02-13
-- Descrição: Adiciona 5 novas tabelas para sistema de loja premium
-- ========================================

-- ========================================
-- 1. STORE_THEMES
-- Armazena configurações completas de design da loja
-- ========================================
CREATE TABLE IF NOT EXISTS store_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,

  -- Logo e Identidade
  logo_url TEXT,
  logo_size TEXT DEFAULT 'medium', -- 'small', 'medium', 'large'
  logo_position TEXT DEFAULT 'center', -- 'left', 'center', 'right'
  favicon_url TEXT,

  -- Cores (Design System Nacre - Madrepérola)
  primary_color TEXT DEFAULT '#d4af37', -- Dourado elegante
  secondary_color TEXT DEFAULT '#1a1a1a', -- Deep black
  accent_color TEXT DEFAULT '#e8b4bc', -- Rose pink
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#2c2c2c',
  heading_color TEXT DEFAULT '#1a1a1a',

  -- Tipografia
  font_heading TEXT DEFAULT 'Cormorant Garamond', -- Serif elegante
  font_body TEXT DEFAULT 'DM Sans', -- Sans moderna
  font_size_base INTEGER DEFAULT 16,
  font_size_heading INTEGER DEFAULT 32,

  -- Layout
  layout_template TEXT DEFAULT 'luxury', -- 'luxury', 'minimal', 'modern'
  product_grid_columns INTEGER DEFAULT 4, -- Desktop
  product_grid_columns_mobile INTEGER DEFAULT 2, -- Mobile
  spacing_unit INTEGER DEFAULT 16, -- px
  border_radius INTEGER DEFAULT 8, -- px

  -- Animações
  enable_animations BOOLEAN DEFAULT true,
  animation_speed TEXT DEFAULT 'normal', -- 'slow', 'normal', 'fast'

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_store_themes_reseller ON store_themes(reseller_id);

COMMENT ON TABLE store_themes IS 'Configurações de design e tema da loja (Design System Nacre)';
COMMENT ON COLUMN store_themes.primary_color IS 'Cor primária (ex: dourado #d4af37 do Nacre)';
COMMENT ON COLUMN store_themes.font_heading IS 'Fonte para títulos (ex: Cormorant Garamond)';
COMMENT ON COLUMN store_themes.font_body IS 'Fonte para texto (ex: DM Sans)';

-- ========================================
-- 2. STORE_SECTIONS
-- Gerencia seções dinâmicas da loja
-- ========================================
CREATE TABLE IF NOT EXISTS store_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,

  -- Identificação
  section_type TEXT NOT NULL, -- 'hero', 'featured', 'categories', 'collections', 'about', 'testimonials', 'instagram_feed', 'gift_guide'
  title TEXT,
  subtitle TEXT,
  description TEXT,

  -- Ordem e Visibilidade
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,

  -- Conteúdo (JSON flexível para cada tipo de seção)
  content JSONB,

  -- Estilo
  background_color TEXT,
  text_color TEXT,
  padding_top INTEGER DEFAULT 60, -- px
  padding_bottom INTEGER DEFAULT 60, -- px

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_store_sections_reseller ON store_sections(reseller_id);
CREATE INDEX IF NOT EXISTS idx_store_sections_order ON store_sections(reseller_id, display_order);
CREATE INDEX IF NOT EXISTS idx_store_sections_type ON store_sections(section_type);
CREATE INDEX IF NOT EXISTS idx_store_sections_visible ON store_sections(is_visible);

COMMENT ON TABLE store_sections IS 'Seções dinâmicas da loja (Hero, Featured, Categories, etc.)';
COMMENT ON COLUMN store_sections.section_type IS 'Tipo da seção: hero, featured, categories, collections, about, testimonials';
COMMENT ON COLUMN store_sections.content IS 'Conteúdo específico da seção em formato JSON';

-- ========================================
-- 3. STORE_BANNERS
-- Gerencia banners e imagens promocionais
-- ========================================
CREATE TABLE IF NOT EXISTS store_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,

  -- Banner
  title TEXT,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  image_mobile_url TEXT, -- Versão mobile otimizada

  -- Call to Action
  cta_text TEXT, -- Texto do botão (ex: "Ver Coleção")
  cta_link TEXT, -- Link do botão
  cta_style TEXT DEFAULT 'primary', -- 'primary', 'secondary', 'ghost'

  -- Posicionamento
  section_type TEXT DEFAULT 'hero', -- 'hero', 'promotional', 'category'
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Período de Exibição (opcional)
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_store_banners_reseller ON store_banners(reseller_id);
CREATE INDEX IF NOT EXISTS idx_store_banners_active ON store_banners(reseller_id, is_active);
CREATE INDEX IF NOT EXISTS idx_store_banners_dates ON store_banners(start_date, end_date);

COMMENT ON TABLE store_banners IS 'Banners promocionais da loja';
COMMENT ON COLUMN store_banners.image_mobile_url IS 'Versão otimizada para mobile (opcional)';
COMMENT ON COLUMN store_banners.cta_text IS 'Texto do Call to Action (botão)';

-- ========================================
-- 4. STORE_COLLECTIONS
-- Cria coleções especiais de produtos
-- ========================================
CREATE TABLE IF NOT EXISTS store_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,

  -- Coleção
  name TEXT NOT NULL,
  slug TEXT NOT NULL, -- URL amigável (ex: colecao-verao)
  description TEXT,
  image_url TEXT, -- Imagem de destaque da coleção

  -- Produtos
  product_ids UUID[], -- Array de IDs de produtos

  -- Visibilidade
  is_featured BOOLEAN DEFAULT false, -- Destaque na home
  is_visible BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_store_collections_reseller ON store_collections(reseller_id);
CREATE INDEX IF NOT EXISTS idx_store_collections_slug ON store_collections(reseller_id, slug);
CREATE INDEX IF NOT EXISTS idx_store_collections_featured ON store_collections(is_featured);

-- Constraint: slug único por revendedora
ALTER TABLE store_collections
ADD CONSTRAINT uk_store_collections_reseller_slug UNIQUE (reseller_id, slug);

COMMENT ON TABLE store_collections IS 'Coleções de produtos (ex: Coleção Verão, Noivas)';
COMMENT ON COLUMN store_collections.slug IS 'URL amigável para a coleção';
COMMENT ON COLUMN store_collections.product_ids IS 'Array de UUIDs dos produtos da coleção';

-- ========================================
-- 5. STORE_SETTINGS
-- Configurações gerais da loja
-- ========================================
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL UNIQUE REFERENCES resellers(id) ON DELETE CASCADE,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[], -- Array de palavras-chave

  -- Redes Sociais
  instagram_url TEXT,
  facebook_url TEXT,
  whatsapp_number TEXT,

  -- Checkout
  enable_checkout BOOLEAN DEFAULT true,
  payment_methods TEXT[] DEFAULT ARRAY['credit_card', 'pix'], -- 'credit_card', 'pix', 'boleto'
  shipping_enabled BOOLEAN DEFAULT false,

  -- Notificações
  order_notification_email TEXT,
  order_notification_whatsapp TEXT,

  -- Políticas
  terms_url TEXT, -- URL dos termos de uso
  privacy_url TEXT, -- URL da política de privacidade
  return_policy TEXT, -- Texto da política de devolução

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_store_settings_reseller ON store_settings(reseller_id);

COMMENT ON TABLE store_settings IS 'Configurações gerais da loja (SEO, redes sociais, checkout)';
COMMENT ON COLUMN store_settings.payment_methods IS 'Métodos de pagamento aceitos';
COMMENT ON COLUMN store_settings.return_policy IS 'Política de trocas e devoluções';

-- ========================================
-- FUNÇÕES AUXILIARES
-- ========================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_store_themes_updated_at BEFORE UPDATE ON store_themes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_sections_updated_at BEFORE UPDATE ON store_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_banners_updated_at BEFORE UPDATE ON store_banners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_collections_updated_at BEFORE UPDATE ON store_collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON store_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- DADOS INICIAIS (Exemplo)
-- ========================================

-- Você pode popular com dados de exemplo após a migração

-- ========================================
-- FIM DA MIGRAÇÃO
-- ========================================
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

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('store_banners', 'store_benefits', 'store_campaigns', 'store_mosaics', 'store_videos');
  
  RAISE NOTICE '✅ Total de tabelas store_* criadas: %', table_count;
END $$;

SELECT 'Tabela: ' || tablename || ' - Criada!' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('store_banners', 'store_benefits', 'store_campaigns', 'store_mosaics', 'store_videos')
ORDER BY tablename;
