-- ============================================
-- LOJA PERSONALIZADA DE SEMIJOIAS
-- Design System: Nacre (Madrepérola)
-- ============================================

-- 1. CONFIGURAÇÕES DA LOJA (Personalizações do Admin)
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,

  -- BRANDING
  logo_url TEXT,
  logo_size TEXT DEFAULT 'medium', -- small, medium, large
  logo_position TEXT DEFAULT 'center', -- left, center, right
  store_name TEXT NOT NULL,
  store_description TEXT,
  store_tagline TEXT,

  -- CORES (Design System Nacre)
  color_primary TEXT DEFAULT '#C9A84C', -- Dourado principal
  color_primary_light TEXT DEFAULT '#E8CC7A', -- Dourado claro (hover)
  color_primary_dim TEXT DEFAULT '#7A6128', -- Dourado escuro
  color_background TEXT DEFAULT '#080808', -- Fundo principal
  color_surface TEXT DEFAULT '#111111', -- Cards/painéis
  color_text_primary TEXT DEFAULT '#F5F0E8', -- Texto principal (pérola)
  color_text_secondary TEXT DEFAULT '#B8B0A0', -- Texto secundário
  color_text_tertiary TEXT DEFAULT '#6B6358', -- Texto terciário

  -- TIPOGRAFIA
  font_heading TEXT DEFAULT 'Cormorant Garamond', -- Títulos
  font_body TEXT DEFAULT 'DM Sans', -- Corpo/interface
  font_size_base TEXT DEFAULT '14px',

  -- LAYOUT HOME
  layout_type TEXT DEFAULT 'grid', -- grid, masonry, carousel
  layout_columns INTEGER DEFAULT 3,
  show_banner BOOLEAN DEFAULT true,
  show_categories BOOLEAN DEFAULT true,
  show_featured_products BOOLEAN DEFAULT true,

  -- HEADER
  header_background TEXT DEFAULT '#080808',
  header_text_color TEXT DEFAULT '#F5F0E8',
  show_search_bar BOOLEAN DEFAULT true,
  show_cart BOOLEAN DEFAULT true,

  -- FOOTER
  footer_background TEXT DEFAULT '#080808',
  footer_text_color TEXT DEFAULT '#B8B0A0',
  footer_text TEXT,
  show_social_links BOOLEAN DEFAULT true,
  instagram_url TEXT,
  facebook_url TEXT,
  whatsapp_number TEXT,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,

  -- CONFIGURAÇÕES ADICIONAIS
  currency TEXT DEFAULT 'BRL',
  enable_checkout BOOLEAN DEFAULT true,
  enable_wishlist BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index para busca rápida por tenant
CREATE INDEX IF NOT EXISTS idx_store_settings_tenant ON store_settings(tenant_id);

-- 2. BANNERS DA HOME
CREATE TABLE IF NOT EXISTS store_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,

  title TEXT,
  subtitle TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  mobile_image_url TEXT, -- Imagem otimizada para mobile

  -- CTA (Call To Action)
  cta_text TEXT DEFAULT 'Ver Coleção',
  cta_url TEXT,

  -- ESTILO
  text_color TEXT DEFAULT '#F5F0E8',
  overlay_opacity REAL DEFAULT 0.3, -- 0 a 1
  text_align TEXT DEFAULT 'center', -- left, center, right

  -- CONTROLE
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_banners_tenant ON store_banners(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_banners_active ON store_banners(tenant_id, is_active, display_order);

-- 3. CATEGORIAS DE PRODUTOS
CREATE TABLE IF NOT EXISTS store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,

  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  icon TEXT, -- Nome do ícone (ex: 'sparkles', 'gem', 'crown')

  -- HIERARQUIA
  parent_id UUID REFERENCES store_categories(id) ON DELETE CASCADE,

  -- CONTROLE
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_store_categories_tenant ON store_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_categories_parent ON store_categories(parent_id);

-- 4. PRODUTOS (Adicionados pela Revendedora)
CREATE TABLE IF NOT EXISTS store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  reseller_id TEXT, -- ID da revendedora (opcional, se houver multi-reseller)

  -- INFORMAÇÕES BÁSICAS
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  short_description TEXT,

  -- PREÇO
  price DECIMAL(10, 2) NOT NULL,
  compare_at_price DECIMAL(10, 2), -- Preço "de" (para mostrar desconto)
  cost_price DECIMAL(10, 2), -- Custo (não aparece na loja)

  -- CATEGORIA
  category_id UUID REFERENCES store_categories(id) ON DELETE SET NULL,

  -- ESTOQUE
  sku TEXT,
  stock_quantity INTEGER DEFAULT 0,
  track_inventory BOOLEAN DEFAULT true,
  allow_backorder BOOLEAN DEFAULT false,

  -- DIMENSÕES/PESO (para cálculo de frete)
  weight DECIMAL(10, 2), -- em gramas
  length DECIMAL(10, 2), -- em cm
  width DECIMAL(10, 2),
  height DECIMAL(10, 2),

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  -- CONTROLE
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false, -- Produto em destaque
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_store_products_tenant ON store_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_products_category ON store_products(category_id);
CREATE INDEX IF NOT EXISTS idx_store_products_featured ON store_products(tenant_id, is_featured, is_active);
CREATE INDEX IF NOT EXISTS idx_store_products_reseller ON store_products(reseller_id);

-- 5. IMAGENS DE PRODUTOS
CREATE TABLE IF NOT EXISTS store_product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,

  image_url TEXT NOT NULL,
  thumbnail_url TEXT, -- Thumbnail para preview
  alt_text TEXT,

  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false, -- Imagem principal do produto

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON store_product_images(product_id);

-- 6. VARIAÇÕES DE PRODUTOS (ex: tamanhos, cores)
CREATE TABLE IF NOT EXISTS store_product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,

  name TEXT NOT NULL, -- ex: "Dourado - Tamanho P"
  sku TEXT,

  -- PREÇO (se diferente do produto principal)
  price DECIMAL(10, 2),
  compare_at_price DECIMAL(10, 2),

  -- ATRIBUTOS
  attributes JSONB, -- ex: {"cor": "Dourado", "tamanho": "P"}

  -- ESTOQUE
  stock_quantity INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON store_product_variants(product_id);

-- 7. PÁGINAS CUSTOMIZÁVEIS
CREATE TABLE IF NOT EXISTS store_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,

  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT, -- HTML ou Markdown

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  -- CONTROLE
  is_active BOOLEAN DEFAULT true,
  show_in_menu BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_store_pages_tenant ON store_pages(tenant_id);

-- 8. PERFIL DA REVENDEDORA (para mostrar na loja)
CREATE TABLE IF NOT EXISTS store_reseller_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  reseller_id TEXT NOT NULL UNIQUE,

  -- INFORMAÇÕES
  name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  cover_image_url TEXT,

  -- CONTATO
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  instagram TEXT,

  -- PERSONALIZAÇÃO
  custom_colors JSONB, -- Cores específicas da revendedora (se permitido)

  -- SLUG PERSONALIZADO
  custom_slug TEXT UNIQUE,

  -- CONTROLE
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reseller_profiles_tenant ON store_reseller_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reseller_profiles_slug ON store_reseller_profiles(custom_slug);

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON store_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_store_banners_updated_at BEFORE UPDATE ON store_banners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_store_categories_updated_at BEFORE UPDATE ON store_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_store_products_updated_at BEFORE UPDATE ON store_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_store_product_variants_updated_at BEFORE UPDATE ON store_product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_store_pages_updated_at BEFORE UPDATE ON store_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reseller_profiles_updated_at BEFORE UPDATE ON store_reseller_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DADOS INICIAIS (Exemplo)
-- ============================================

-- Inserir categorias padrão (opcional)
-- Descomentar se quiser criar categorias iniciais
/*
INSERT INTO store_categories (tenant_id, name, slug, description, icon) VALUES
('default', 'Anéis', 'aneis', 'Anéis de todos os estilos', 'gem'),
('default', 'Colares', 'colares', 'Colares elegantes', 'sparkles'),
('default', 'Brincos', 'brincos', 'Brincos para todas as ocasiões', 'diamond'),
('default', 'Pulseiras', 'pulseiras', 'Pulseiras delicadas', 'bracelet'),
('default', 'Conjuntos', 'conjuntos', 'Conjuntos completos', 'crown');
*/

-- ============================================
-- COMENTÁRIOS FINAIS
-- ============================================

/*
ESTRUTURA DO SISTEMA:

1. Admin personaliza tudo em store_settings
2. Admin pode adicionar banners em store_banners
3. Admin cria categorias em store_categories
4. Revendedora adiciona produtos em store_products
5. Cada produto pode ter múltiplas imagens em store_product_images
6. Produtos podem ter variações em store_product_variants
7. Admin pode criar páginas customizadas em store_pages
8. Perfil da revendedora fica em store_reseller_profiles

MULTI-TENANT:
- Todas as tabelas têm tenant_id
- Cada tenant (cliente) tem suas próprias personalizações
- Revendedoras são identificadas por reseller_id

DESIGN SYSTEM NACRE:
- Cores padrão já configuradas no store_settings
- Fontes: Cormorant Garamond (títulos) + DM Sans (corpo)
- Inspiração: Vivara, Pandora (luxo acessível)
*/
