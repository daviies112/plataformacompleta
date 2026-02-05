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
      
      // Teste de conexão imediato (em background para não bloquear o startup)
      pool.query('SELECT NOW()').then(() => {
        console.log('✅ Database connection established and verified');
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
