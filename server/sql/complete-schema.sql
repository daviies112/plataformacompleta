-- ============================================================================
-- SCHEMA COMPLETO SUPABASE - ARQUIVO ÚNICO CONSOLIDADO
-- ============================================================================
-- Execute este SQL no SQL Editor do Supabase
-- Cria TODAS as tabelas necessárias para a plataforma
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- NOTA: Este arquivo contém APENAS as tabelas principais
-- Execute via `drizzle-kit push` para aplicar o schema completo
-- Este SQL é um BACKUP/FALLBACK caso o Drizzle falhe

-- ============================================================================
-- TABELAS ESSENCIAIS (já criadas automaticamente em server/db.ts)
-- ============================================================================
-- Estas tabelas JÁ SÃO CRIADAS automaticamente quando o servidor conecta
-- Incluídas aqui apenas para referência e execução manual se necessário

-- bigdatacorp_config, supabase_master_config, total_express_config
-- leads, wallets, forms, form_submissions, reunioes
-- notification_history, hms_100ms_config, reseller_supabase_configs
-- app_settings, form_tenant_mapping

-- ============================================================================
-- COMANDO RECOMENDADO: Use Drizzle Push
-- ============================================================================
-- O método RECOMENDADO é usar o Drizzle ORM:
-- 
-- 1. Configure DATABASE_URL no .env:
--    DATABASE_URL="postgresql://postgres.PROJECT_ID:SERVICE_KEY@aws-0-us-west-2.pooler.supabase.com:6543/postgres"
--
-- 2. Execute:
--    npm run db:push
--
-- Isso criará automaticamente TODAS as ~100 tabelas do schema
--
-- ============================================================================

-- Se preferir SQL manual, execute os comandos abaixo:

-- Notification Settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  email_enabled VARCHAR(10) DEFAULT 'true',
  whatsapp_enabled VARCHAR(10) DEFAULT 'false',
  enabled VARCHAR(10) DEFAULT 'true',
  sound VARCHAR(10) DEFAULT 'true',
  vibration VARCHAR(10) DEFAULT 'true',
  badge VARCHAR(10) DEFAULT 'true',
  show_preview VARCHAR(10) DEFAULT 'true',
  quiet_hours_enabled VARCHAR(10) DEFAULT 'false',
  quiet_hours_start VARCHAR(10) DEFAULT '22:00',
  quiet_hours_end VARCHAR(10) DEFAULT '08:00',
  supabase_enabled VARCHAR(10) DEFAULT 'true',
  calendar_enabled VARCHAR(10) DEFAULT 'true',
  pluggy_enabled VARCHAR(10) DEFAULT 'true',
  system_enabled VARCHAR(10) DEFAULT 'true',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_tenant ON notification_settings(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_settings_user_tenant ON notification_settings(user_id, tenant_id);

-- Device Tokens
CREATE TABLE IF NOT EXISTS device_tokens (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  subscription_data TEXT,
  device_type VARCHAR(50),
  device_name TEXT,
  device_model TEXT,
  user_agent TEXT,
  device_info JSON,
  last_active TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_tenant ON device_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_tenant ON device_tokens(user_id, tenant_id);

-- WhatsApp Labels
CREATE TABLE IF NOT EXISTS whatsapp_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cor TEXT NOT NULL,
  form_status TEXT NOT NULL,
  qualification_status TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_labels_status ON whatsapp_labels(form_status, qualification_status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_labels_ordem ON whatsapp_labels(ordem);

-- Completion Pages
CREATE TABLE IF NOT EXISTS completion_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Obrigado!',
  subtitle TEXT,
  success_message TEXT NOT NULL DEFAULT 'Parabéns! Você está qualificado.',
  failure_message TEXT NOT NULL DEFAULT 'Obrigado pela participação.',
  show_score BOOLEAN DEFAULT TRUE,
  show_tier_badge BOOLEAN DEFAULT TRUE,
  logo TEXT,
  logo_align TEXT DEFAULT 'center',
  success_icon_color TEXT DEFAULT 'hsl(142, 71%, 45%)',
  failure_icon_color TEXT DEFAULT 'hsl(0, 84%, 60%)',
  success_icon_image TEXT,
  failure_icon_image TEXT,
  success_icon_type TEXT DEFAULT 'check-circle',
  failure_icon_type TEXT DEFAULT 'x-circle',
  cta_text TEXT,
  cta_url TEXT,
  custom_content TEXT,
  design_config JSONB DEFAULT '{"colors":{"primary":"hsl(221,83%,53%)","secondary":"hsl(210,40%,96%)","background":"hsl(0,0%,100%)","text":"hsl(222,47%,11%)"},"typography":{"fontFamily":"Inter","titleSize":"2xl","textSize":"base"},"spacing":"comfortable"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_completion_pages_created_at ON completion_pages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_completion_pages_tenant ON completion_pages(tenant_id);

-- Forms (já criada em server/db.ts, mas incluída para completude)
CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  welcome_title TEXT,
  welcome_message TEXT,
  welcome_config JSONB,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  elements JSONB,
  passing_score INTEGER NOT NULL DEFAULT 0,
  score_tiers JSONB,
  design_config JSONB,
  completion_page_id UUID,
  tenant_id TEXT NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forms_created_at ON forms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forms_completion_page ON forms(completion_page_id);
CREATE INDEX IF NOT EXISTS idx_forms_tenant_id ON forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_forms_slug_tenant ON forms(slug, tenant_id);

-- Form Tenant Mapping (já criada em server/db.ts)
CREATE TABLE IF NOT EXISTS form_tenant_mapping (
  form_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  slug TEXT,
  company_slug TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_mapping_tenant ON form_tenant_mapping(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_mapping_public ON form_tenant_mapping(is_public);
CREATE INDEX IF NOT EXISTS idx_form_mapping_slug ON form_tenant_mapping(slug);
CREATE INDEX IF NOT EXISTS idx_form_mapping_company_slug ON form_tenant_mapping(company_slug);

-- ============================================================================
-- MENSAGEM IMPORTANTE
-- ============================================================================
-- Este arquivo SQL contém apenas uma AMOSTRA das tabelas
-- 
-- Para criar TODAS as ~100 tabelas, use o comando:
--   npm run db:push
--
-- Isso aplicará automaticamente o schema completo definido em:
--   shared/db-schema.ts (2397 linhas)
--
-- ============================================================================
