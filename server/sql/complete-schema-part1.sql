-- ============================================================================
-- SCHEMA COMPLETO SUPABASE - PARTE 1: CONFIGURAÇÕES E NOTIFICAÇÕES
-- ============================================================================
-- Execute este SQL no SQL Editor do Supabase para criar todas as tabelas
-- automaticamente. Use IF NOT EXISTS para evitar erros em tabelas existentes.
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- NOTIFICATION SETTINGS
-- ============================================================================
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

-- ============================================================================
-- BIOMETRIC CREDENTIALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS biometric_credentials (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  credential_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT[],
  device_name TEXT,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biometric_credentials_tenant ON biometric_credentials(tenant_id);

-- ============================================================================
-- CONFIGURATION TABLES - API INTEGRATIONS
-- ============================================================================

-- Pluggy Configuration
CREATE TABLE IF NOT EXISTS pluggy_config (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pluggy_tenant_unique ON pluggy_config(tenant_id);

-- Pluggy Items
CREATE TABLE IF NOT EXISTS pluggy_items (
  id VARCHAR(255) PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  connector_id VARCHAR(255),
  connector_name VARCHAR(255),
  status VARCHAR(100),
  execution_status VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pluggy_items_tenant ON pluggy_items(tenant_id);

-- Supabase Configuration
CREATE TABLE IF NOT EXISTS supabase_config (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  supabase_url TEXT NOT NULL,
  supabase_anon_key TEXT NOT NULL,
  supabase_bucket TEXT DEFAULT 'receipts',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_supabase_tenant_unique ON supabase_config(tenant_id);

-- N8N Configuration
CREATE TABLE IF NOT EXISTS n8n_config (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_n8n_tenant_unique ON n8n_config(tenant_id);

-- Google Calendar Configuration
CREATE TABLE IF NOT EXISTS google_calendar_config (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  refresh_token TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_google_calendar_tenant_unique ON google_calendar_config(tenant_id);

-- Redis Configuration
CREATE TABLE IF NOT EXISTS redis_config (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  redis_url TEXT NOT NULL,
  redis_token TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_redis_tenant_unique ON redis_config(tenant_id);

-- Sentry Configuration
CREATE TABLE IF NOT EXISTS sentry_config (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  dsn TEXT NOT NULL,
  auth_token TEXT,
  organization TEXT,
  project TEXT,
  environment TEXT DEFAULT 'production',
  traces_sample_rate TEXT DEFAULT '0.1',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sentry_tenant_unique ON sentry_config(tenant_id);

-- Resend Configuration
CREATE TABLE IF NOT EXISTS resend_config (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  api_key TEXT NOT NULL,
  from_email TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_resend_tenant_unique ON resend_config(tenant_id);

-- Cloudflare Configuration
CREATE TABLE IF NOT EXISTS cloudflare_config (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  api_token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cloudflare_tenant_unique ON cloudflare_config(tenant_id);

-- Better Stack Configuration
CREATE TABLE IF NOT EXISTS better_stack_config (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  source_token TEXT NOT NULL,
  ingesting_host TEXT DEFAULT 'in.logs.betterstack.com',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_better_stack_tenant_unique ON better_stack_config(tenant_id);

-- BigDataCorp Configuration
CREATE TABLE IF NOT EXISTS bigdatacorp_config (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  token_id TEXT NOT NULL,
  chave_token TEXT NOT NULL,
  supabase_master_url TEXT,
  supabase_master_service_role_key TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bigdatacorp_tenant_unique ON bigdatacorp_config(tenant_id);

-- Supabase Master Configuration
CREATE TABLE IF NOT EXISTS supabase_master_config (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  supabase_master_url TEXT NOT NULL,
  supabase_master_service_role_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_supabase_master_tenant_unique ON supabase_master_config(tenant_id);

-- Evolution API Configuration (WhatsApp)
CREATE TABLE IF NOT EXISTS evolution_api_config (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  instance TEXT DEFAULT 'nexus-whatsapp',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_evolution_api_tenant_unique ON evolution_api_config(tenant_id);

-- 100ms Configuration (Video Conferencing)
CREATE TABLE IF NOT EXISTS hms_100ms_config (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  app_access_key TEXT NOT NULL,
  app_secret TEXT NOT NULL,
  management_token TEXT,
  template_id TEXT,
  api_base_url TEXT DEFAULT 'https://api.100ms.live/v2',
  room_design_config JSONB DEFAULT '{
    "branding": {
      "logo": null,
      "logoSize": 40,
      "logoPosition": "left",
      "companyName": "",
      "showCompanyName": true,
      "showLogoInLobby": true,
      "showLogoInMeeting": true,
      "showLogoInEnd": true
    },
    "colors": {
      "background": "#0f172a",
      "controlsBackground": "#18181b",
      "controlsText": "#ffffff",
      "primaryButton": "#3b82f6",
      "dangerButton": "#ef4444",
      "avatarBackground": "#3b82f6",
      "avatarText": "#ffffff",
      "participantNameBackground": "rgba(0, 0, 0, 0.6)",
      "participantNameText": "#ffffff"
    },
    "lobby": {
      "title": "Pronto para participar?",
      "subtitle": "",
      "buttonText": "Participar agora",
      "showDeviceSelectors": true,
      "showCameraPreview": true,
      "backgroundImage": null
    },
    "meeting": {
      "showParticipantCount": true,
      "showMeetingCode": true,
      "showRecordingIndicator": true,
      "enableReactions": true,
      "enableChat": true,
      "enableScreenShare": true,
      "enableRaiseHand": true
    },
    "endScreen": {
      "title": "Reunião Encerrada",
      "message": "Obrigado por participar!",
      "showFeedback": false,
      "redirectUrl": null
    }
  }'::jsonb,
  n8n_api_key TEXT,
  n8n_api_key_created_at TIMESTAMP,
  company_slug TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hms_100ms_tenant_unique ON hms_100ms_config(tenant_id);

-- Total Express Configuration (Shipping)
CREATE TABLE IF NOT EXISTS total_express_config (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  "user" TEXT NOT NULL,
  password TEXT NOT NULL,
  reid TEXT NOT NULL,
  service TEXT DEFAULT 'EXP',
  test_mode BOOLEAN DEFAULT TRUE,
  profit_margin REAL DEFAULT 1.40,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_total_express_tenant_unique ON total_express_config(tenant_id);

-- ============================================================================
-- PARTE 1 COMPLETA
-- Continue com complete-schema-part2.sql
-- ============================================================================
