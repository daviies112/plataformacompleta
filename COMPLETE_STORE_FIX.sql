
-- ==============================================================================
-- 🚀 DEFINITIVE STORE SCHEMA FIX (TENANT_ID AS TEXT SUPPORT)
-- Execute este script no Supabase SQL Editor para garantir que todas as abas funcionem
-- ==============================================================================

-- 1. GARANTIR QUE AS TABELAS EXISTEM COM AS COLUNAS CORRETAS
-- Se a tabela não existir, cria. Se existir, não faz nada (IF NOT EXISTS)

-- STORE_SETTINGS (Configurações Gerais)
CREATE TABLE IF NOT EXISTS store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    store_name TEXT DEFAULT 'Minha Loja',
    store_tagline TEXT,
    logo_url TEXT,
    logo_size TEXT DEFAULT 'medium',
    logo_position TEXT DEFAULT 'center',
    color_primary TEXT DEFAULT '#C9A84C',
    color_primary_light TEXT DEFAULT '#E8CC7A',
    color_primary_dim TEXT DEFAULT '#F5F0E1',
    color_background TEXT DEFAULT '#FFFFFF',
    color_surface TEXT DEFAULT '#F9F9F9',
    color_text_primary TEXT DEFAULT '#1A1A1A',
    color_text_secondary TEXT DEFAULT '#4A4A4A',
    color_text_tertiary TEXT DEFAULT '#999999',
    font_heading TEXT DEFAULT 'Cormorant Garamond',
    font_body TEXT DEFAULT 'DM Sans',
    font_size_base TEXT DEFAULT '16px',
    layout_type TEXT DEFAULT 'carousel',
    layout_columns INTEGER DEFAULT 3,
    hero_banner_autoplay BOOLEAN DEFAULT true,
    hero_banner_interval INTEGER DEFAULT 5,
    show_benefits_bar BOOLEAN DEFAULT true,
    benefits_bar_background TEXT DEFAULT 'primary',
    show_video_section BOOLEAN DEFAULT true,
    show_mosaic_section BOOLEAN DEFAULT true,
    mosaic_layout_columns INTEGER DEFAULT 3,
    show_active_campaign BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STORE_BENEFITS (Aba Benefícios)
CREATE TABLE IF NOT EXISTS store_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    icon TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STORE_VIDEOS (Aba Vídeos)
CREATE TABLE IF NOT EXISTS store_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    title TEXT,
    description TEXT,
    video_url TEXT NOT NULL,
    video_type TEXT DEFAULT 'url',
    thumbnail_url TEXT,
    section_type TEXT DEFAULT 'hero',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    autoplay BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STORE_MOSAICS (Aba Mosaico)
CREATE TABLE IF NOT EXISTS store_mosaics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    title TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    layout_type TEXT DEFAULT '1x1',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STORE_CAMPAIGNS (Aba Campanhas)
CREATE TABLE IF NOT EXISTS store_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    badge_text TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    discount_percentage INTEGER,
    target_product_ids UUID[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STORE_BANNERS (Banners do Topo)
CREATE TABLE IF NOT EXISTS store_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    title TEXT,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    cta_text TEXT,
    cta_link TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELAS DE PRODUTOS (Garantir que existem com tenant_id TEXT)
CREATE TABLE IF NOT EXISTS store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    reseller_id TEXT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. GARANTIR QUE TENANT_ID SEJA TEXT EM TODAS AS TABELAS (Caso já existam como UUID)
DO $$ 
BEGIN
    BEGIN ALTER TABLE store_settings ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE store_benefits ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE store_videos ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE store_mosaics ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE store_campaigns ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE store_banners ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE store_products ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE store_products ALTER COLUMN reseller_id TYPE TEXT USING reseller_id::TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 3. CRIAR ÍNDICE ÚNICO PARA SETTINGS
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_settings_tenant_unique ON store_settings(tenant_id);

-- 4. RECARREGAR O CACHE DO SUPABASE
NOTIFY pgrst, 'reload schema';
