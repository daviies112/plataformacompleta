/**
 * Database Connection Module
 * 
 * SUPABASE-ONLY MODE:
 * This app is designed to work with Supabase as the primary database.
 * It does NOT require a local PostgreSQL instance.
 * 
 * Configuration Priority:
 * 1. DATABASE_URL environment variable (for direct Supabase PostgreSQL connection)
 * 2. File-based config (data/supabase-config.json) - set via UI
 * 3. No database - app runs in "configuration mode"
 * 
 * When no database is configured:
 * - App starts normally and shows the UI
 * - User configures Supabase via /configuracoes
 * - App connects to Supabase after configuration
 */

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/db-schema";
import { getDatabaseUrl } from "./lib/supabaseFileConfig";

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;
let connectionAttempted = false;

function initializeDatabase(): void {
  if (connectionAttempted) return;
  connectionAttempted = true;
  
  console.log('🐘 Initializing database connection...');
  
  // Prioridade para o DATABASE_URL dos Secrets
  const databaseUrl = process.env.DATABASE_URL || getDatabaseUrl();
  
  // Se não temos DATABASE_URL mas temos os segredos do Supabase, construímos a URL
  let finalDbUrl = databaseUrl;
  
  const sUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const sKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!finalDbUrl && sUrl && sKey) {
    const projectId = sUrl.split('//')[1]?.split('.')[0];
    if (projectId) {
      // Prioridade para modo direto via Secrets se DATABASE_URL estiver ausente
      finalDbUrl = `postgresql://postgres:${sKey}@db.${projectId}.supabase.co:5432/postgres`;
      console.log('🏗️ Constructed DATABASE_URL from Supabase secrets for project:', projectId);
    }
  }

  // Backup final para DATABASE_URL construído manualmente via PG vars se disponível
  if (!finalDbUrl && process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD) {
    finalDbUrl = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'postgres'}`;
    console.log('🏗️ Constructed DATABASE_URL from PG secrets');
  }

  if (finalDbUrl) {
    try {
      // Remover query params que podem causar problemas com o driver node-postgres
      pool = new Pool({ 
        connectionString: finalDbUrl,
        connectionTimeoutMillis: 15000,
        max: 20,
        ssl: { 
          rejectUnauthorized: false
        }
      });
      
      db = drizzle(pool, { schema });
      
      pool.query('SELECT NOW()').then(async () => {
        console.log('✅ Database connection established and verified');
        try {
          await pool!.query(`
            CREATE TABLE IF NOT EXISTS bigdatacorp_config (
              id SERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, token_id TEXT NOT NULL, chave_token TEXT NOT NULL,
              supabase_master_url TEXT, supabase_master_service_role_key TEXT,
              created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_bigdatacorp_tenant_unique ON bigdatacorp_config (tenant_id);
            CREATE TABLE IF NOT EXISTS supabase_master_config (
              id SERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, supabase_master_url TEXT NOT NULL,
              supabase_master_service_role_key TEXT NOT NULL,
              created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_supabase_master_tenant_unique ON supabase_master_config (tenant_id);
            CREATE TABLE IF NOT EXISTS total_express_config (
              id SERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, "user" TEXT NOT NULL, password TEXT NOT NULL,
              reid TEXT NOT NULL, service TEXT DEFAULT 'EXP', test_mode BOOLEAN DEFAULT TRUE,
              profit_margin REAL DEFAULT 1.40,
              created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_total_express_tenant_unique ON total_express_config (tenant_id);
            CREATE TABLE IF NOT EXISTS leads (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              tenant_id TEXT NOT NULL,
              telefone TEXT NOT NULL,
              telefone_normalizado TEXT NOT NULL,
              nome TEXT,
              email TEXT,
              cpf TEXT,
              cpf_normalizado TEXT,
              form_status TEXT DEFAULT 'not_sent',
              cpf_check_id UUID,
              cpf_status TEXT,
              cpf_checked_at TIMESTAMPTZ,
              pipeline_status TEXT DEFAULT 'contato-inicial',
              submission_id UUID,
              whatsapp_label_id UUID,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_telefone_norm_unique ON leads (telefone_normalizado);
            CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads (tenant_id);
            CREATE INDEX IF NOT EXISTS idx_leads_cpf_norm ON leads (cpf_normalizado);
            CREATE TABLE IF NOT EXISTS wallets (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              tenant_id TEXT NOT NULL UNIQUE,
              balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
              currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
              is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
              auto_recharge BOOLEAN NOT NULL DEFAULT FALSE,
              auto_recharge_trigger NUMERIC(10,2),
              auto_recharge_amount NUMERIC(10,2),
              saved_card_token TEXT,
              created_at TIMESTAMP NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_tenant ON wallets (tenant_id);
            ALTER TABLE wallets ADD COLUMN IF NOT EXISTS auto_recharge BOOLEAN NOT NULL DEFAULT FALSE;
            ALTER TABLE wallets ADD COLUMN IF NOT EXISTS auto_recharge_trigger NUMERIC(10,2);
            ALTER TABLE wallets ADD COLUMN IF NOT EXISTS auto_recharge_amount NUMERIC(10,2);
            ALTER TABLE wallets ADD COLUMN IF NOT EXISTS saved_card_token TEXT;
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
            CREATE INDEX IF NOT EXISTS idx_forms_tenant_id ON forms (tenant_id);
            CREATE INDEX IF NOT EXISTS idx_forms_slug_tenant ON forms (slug, tenant_id);
            CREATE TABLE IF NOT EXISTS form_submissions (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              tenant_id TEXT,
              form_id UUID NOT NULL,
              answers JSONB NOT NULL DEFAULT '{}'::jsonb,
              total_score INTEGER NOT NULL DEFAULT 0,
              passed BOOLEAN NOT NULL DEFAULT TRUE,
              participant_id TEXT,
              contact_name TEXT,
              contact_email TEXT,
              contact_phone TEXT,
              contact_cpf TEXT,
              instagram_handle TEXT,
              birth_date DATE,
              address_cep TEXT,
              address_street TEXT,
              address_number TEXT,
              address_complement TEXT,
              address_neighborhood TEXT,
              address_city TEXT,
              address_state TEXT,
              processado_whatsapp BOOLEAN DEFAULT FALSE,
              agendou_reuniao BOOLEAN DEFAULT FALSE,
              data_agendamento TIMESTAMPTZ,
              follow_up_count INTEGER DEFAULT 0,
              ultimo_follow_up TIMESTAMPTZ,
              follow_up_encerrado BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON form_submissions (form_id);
            CREATE INDEX IF NOT EXISTS idx_submissions_tenant ON form_submissions (tenant_id);
            CREATE INDEX IF NOT EXISTS idx_submissions_cpf ON form_submissions (contact_cpf);
            CREATE INDEX IF NOT EXISTS idx_submissions_phone ON form_submissions (contact_phone);
            CREATE TABLE IF NOT EXISTS reunioes (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              tenant_id TEXT NOT NULL,
              usuario_id TEXT,
              nome TEXT,
              email TEXT,
              telefone TEXT,
              titulo TEXT,
              descricao TEXT,
              data_inicio TIMESTAMP NOT NULL,
              data_fim TIMESTAMP NOT NULL,
              duracao INTEGER,
              room_id_100ms TEXT,
              room_code_100ms TEXT,
              link_reuniao TEXT,
              link_publico TEXT,
              status TEXT DEFAULT 'agendada',
              participantes JSONB DEFAULT '[]'::jsonb,
              gravacao_url TEXT,
              metadata JSONB DEFAULT '{}'::jsonb,
              compareceu BOOLEAN DEFAULT FALSE,
              participant_id TEXT,
              form_submission_id TEXT,
              tipo_reuniao TEXT,
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_reunioes_tenant ON reunioes (tenant_id);
            CREATE INDEX IF NOT EXISTS idx_reunioes_usuario ON reunioes (usuario_id);
            CREATE INDEX IF NOT EXISTS idx_reunioes_data_inicio ON reunioes (data_inicio);
            CREATE INDEX IF NOT EXISTS idx_reunioes_status ON reunioes (status);
            CREATE INDEX IF NOT EXISTS idx_reunioes_room_id ON reunioes (room_id_100ms);
            CREATE INDEX IF NOT EXISTS idx_reunioes_compareceu ON reunioes (compareceu);
            CREATE INDEX IF NOT EXISTS idx_reunioes_participant_id ON reunioes (participant_id);
            CREATE INDEX IF NOT EXISTS idx_reunioes_form_submission_id ON reunioes (form_submission_id);
            CREATE TABLE IF NOT EXISTS notification_history (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              tenant_id TEXT NOT NULL,
              user_id TEXT NOT NULL,
              type TEXT NOT NULL,
              title TEXT NOT NULL,
              body TEXT,
              data JSONB,
              devices_sent INTEGER DEFAULT 0,
              success BOOLEAN DEFAULT TRUE,
              read BOOLEAN DEFAULT FALSE,
              read_at TIMESTAMP,
              sent_at TIMESTAMP DEFAULT NOW(),
              device_tokens JSONB
            );
            CREATE INDEX IF NOT EXISTS idx_notification_history_user ON notification_history (user_id);
            CREATE INDEX IF NOT EXISTS idx_notification_history_tenant ON notification_history (tenant_id);
            CREATE TABLE IF NOT EXISTS hms_100ms_config (
              id SERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, app_access_key TEXT, app_secret TEXT,
              template_id TEXT, room_id TEXT, management_token TEXT, subdomain TEXT, company_slug TEXT,
              is_owner BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_hms_100ms_tenant_unique ON hms_100ms_config (tenant_id);
            CREATE TABLE IF NOT EXISTS reseller_supabase_configs (
              id SERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, supabase_url TEXT NOT NULL,
              supabase_anon_key TEXT NOT NULL, supabase_bucket TEXT DEFAULT 'uploads',
              created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS app_settings (
              id SERIAL PRIMARY KEY, tenant_id TEXT,
              company_name TEXT, company_slug TEXT,
              supabase_url TEXT, supabase_anon_key TEXT,
              active_form_id TEXT, active_form_url TEXT,
              redis_commands_today INTEGER DEFAULT 0, redis_commands_date DATE,
              redis_commands_month INTEGER DEFAULT 0, redis_commands_month_start DATE,
              whatsapp_instance TEXT, whatsapp_api_url TEXT, whatsapp_api_key TEXT,
              evolution_api_url TEXT, evolution_api_key TEXT, evolution_instance TEXT,
              n8n_webhook_url TEXT,
              created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_app_settings_tenant_unique ON app_settings (tenant_id);
            CREATE TABLE IF NOT EXISTS form_tenant_mapping (
              id SERIAL PRIMARY KEY, form_id TEXT NOT NULL, tenant_id TEXT NOT NULL,
              supabase_url TEXT, is_public BOOLEAN DEFAULT TRUE, company_slug TEXT,
              created_at TIMESTAMP DEFAULT NOW()
            );
          `);
        } catch (migrationErr) {
          console.warn('⚠️ Auto-migration warning:', migrationErr instanceof Error ? migrationErr.message : migrationErr);
        }
      }).catch(err => {
        console.error('❌ Database connection verification failed:', err);
      });
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      pool = null;
      db = null;
    }
  } else {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ℹ️  MODO CONFIGURAÇÃO - AGUARDANDO SUPABASE                   ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📝 Nenhum banco de dados configurado');
    console.log('🔧 Configure o Supabase via interface em /configuracoes');
    console.log('💡 Após configurar, reinicie o servidor para conectar');
    console.log('');
  }
}

initializeDatabase();

export function isDatabaseConnected(): boolean {
  return db !== null && pool !== null;
}

export function requireDatabase(): ReturnType<typeof drizzle> {
  if (!db) {
    throw new Error('Database not configured. Please configure Supabase via /configuracoes');
  }
  return db;
}

export { pool, db };
