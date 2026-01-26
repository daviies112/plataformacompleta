-- SQL SIMPLIFICADO para criar platform_settings
-- Execute no Supabase SQL Editor
-- Data: 2026-01-26

-- 1. Criar tabela platform_settings (se não existir)
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    pagarme_company_recipient_id VARCHAR(255),
    pagarme_api_key_test VARCHAR(500),
    pagarme_api_key_live VARCHAR(500),
    use_live_mode BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Inserir registro padrão
INSERT INTO public.platform_settings (id, use_live_mode)
VALUES ('default', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 3. Verificar se foi criado
SELECT * FROM public.platform_settings;
