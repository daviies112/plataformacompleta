-- SQL para criar as tabelas de configuração do sistema de SPLIT no Supabase CLIENTE
-- Execute este SQL no SQL Editor do seu projeto Supabase
-- Data: 2026-01-26
-- Sistema: Split de Comissões (Pagar.me + Dinâmica de Tiers)

-- ============================================================================
-- 1. TABELA: platform_settings
-- Armazena as configurações da plataforma (chaves de API, recipient_id, etc)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    pagarme_company_recipient_id VARCHAR(255),
    pagarme_api_key_test VARCHAR(500),
    pagarme_api_key_live VARCHAR(500),
    use_live_mode BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT,
    
    CONSTRAINT valid_id CHECK (id = 'default')
);

-- Adicionar comentários
COMMENT ON TABLE public.platform_settings IS 'Configurações globais da plataforma (chaves API, modo live, recipient IDs)';
COMMENT ON COLUMN public.platform_settings.id IS 'ID única - sempre "default" para manter uma única linha de config';
COMMENT ON COLUMN public.platform_settings.pagarme_company_recipient_id IS 'ID do recipient da empresa no Pagar.me (para receber a parte da empresa)';
COMMENT ON COLUMN public.platform_settings.pagarme_api_key_test IS 'Chave de API do Pagar.me em ambiente de teste';
COMMENT ON COLUMN public.platform_settings.pagarme_api_key_live IS 'Chave de API do Pagar.me em ambiente de produção';
COMMENT ON COLUMN public.platform_settings.use_live_mode IS 'Flag: true = usar chave LIVE, false = usar chave TEST';

-- ============================================================================
-- 2. TABELA: commission_config
-- Armazena a configuração de comissões (tiers dinâmicos, percentuais, etc)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.commission_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    use_dynamic_tiers BOOLEAN DEFAULT TRUE,
    sales_tiers JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT,
    
    CONSTRAINT valid_config_id CHECK (id = 'default')
);

-- Criar índice para otimizar queries
CREATE INDEX IF NOT EXISTS idx_commission_config_id ON public.commission_config(id);

-- Adicionar comentários
COMMENT ON TABLE public.commission_config IS 'Configuração de tiers de comissão baseado em volume de vendas mensal';
COMMENT ON COLUMN public.commission_config.id IS 'ID única - sempre "default" para manter uma única configuração ativa';
COMMENT ON COLUMN public.commission_config.use_dynamic_tiers IS 'Flag: true = usar tiers dinâmicos, false = usar comissão fixa de 70/30';
COMMENT ON COLUMN public.commission_config.sales_tiers IS 'Array JSON com tiers: [{id, name, min_monthly_sales, max_monthly_sales, reseller_percentage, company_percentage}]';

-- ============================================================================
-- 3. DADOS PADRÃO
-- ============================================================================

-- Inserir ou atualizar registro padrão em platform_settings
INSERT INTO public.platform_settings (
    id,
    pagarme_company_recipient_id,
    pagarme_api_key_test,
    pagarme_api_key_live,
    use_live_mode,
    created_by,
    updated_by
) VALUES (
    'default',
    NULL,                      -- Será preenchido durante a configuração
    NULL,                      -- Será preenchido durante a configuração
    NULL,                      -- Será preenchido durante a configuração
    FALSE,                     -- Começar em modo teste
    'system',
    'system'
)
ON CONFLICT (id) DO UPDATE SET
    use_live_mode = COALESCE(EXCLUDED.use_live_mode, platform_settings.use_live_mode),
    updated_at = NOW(),
    updated_by = 'system';

-- Inserir ou atualizar registro padrão em commission_config com tiers padrão
INSERT INTO public.commission_config (
    id,
    use_dynamic_tiers,
    sales_tiers,
    created_by,
    updated_by
) VALUES (
    'default',
    TRUE,
    '[
        {
            "id": "1",
            "name": "Iniciante",
            "min_monthly_sales": 0,
            "max_monthly_sales": 2000,
            "reseller_percentage": 65,
            "company_percentage": 35
        },
        {
            "id": "2",
            "name": "Bronze",
            "min_monthly_sales": 2000,
            "max_monthly_sales": 4500,
            "reseller_percentage": 70,
            "company_percentage": 30
        },
        {
            "id": "3",
            "name": "Prata",
            "min_monthly_sales": 4500,
            "max_monthly_sales": 10000,
            "reseller_percentage": 75,
            "company_percentage": 25
        },
        {
            "id": "4",
            "name": "Ouro",
            "min_monthly_sales": 10000,
            "max_monthly_sales": null,
            "reseller_percentage": 80,
            "company_percentage": 20
        }
    ]'::jsonb,
    'system',
    'system'
)
ON CONFLICT (id) DO UPDATE SET
    use_dynamic_tiers = COALESCE(EXCLUDED.use_dynamic_tiers, commission_config.use_dynamic_tiers),
    sales_tiers = COALESCE(EXCLUDED.sales_tiers, commission_config.sales_tiers),
    updated_at = NOW(),
    updated_by = 'system';

-- ============================================================================
-- 4. RLS (Row Level Security) - Segurança
-- ============================================================================

-- Habilitar RLS nas tabelas
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_config ENABLE ROW LEVEL SECURITY;

-- Política para service_role (backend) ter acesso total
CREATE POLICY "service_role_platform_settings_full_access" ON public.platform_settings
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service_role_commission_config_full_access" ON public.commission_config
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Política para usuários autenticados (revendedoras) poderem ler as configurações públicas
CREATE POLICY "users_view_platform_settings" ON public.platform_settings
    FOR SELECT
    USING (true);

CREATE POLICY "users_view_commission_config" ON public.commission_config
    FOR SELECT
    USING (true);

-- ============================================================================
-- 5. LOGS DE EXECUÇÃO
-- ============================================================================

-- Exibir mensagens de sucesso (comentários SQL)
/*
✅ SQL_SETUP_SPLIT_TABLES.sql executado com sucesso!

Tabelas criadas:
1. ✅ public.platform_settings (configurações da plataforma)
2. ✅ public.commission_config (configuração de tiers)

Dados padrão inseridos:
- 1 registro em platform_settings (id='default', use_live_mode=false)
- 1 registro em commission_config com 4 tiers padrão

Próximos passos:
1. Configure o pagarme_company_recipient_id em platform_settings
2. Configure as chaves de API (test e live)
3. Ajuste os tiers se necessário

Verificar dados:
- SELECT * FROM public.platform_settings;
- SELECT * FROM public.commission_config;
- SELECT sales_tiers FROM public.commission_config WHERE id='default';
*/
