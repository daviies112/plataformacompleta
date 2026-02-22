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
