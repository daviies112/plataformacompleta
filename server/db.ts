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
  if (!finalDbUrl && process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_SERVICE_ROLE) {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const serviceRole = process.env.REACT_APP_SUPABASE_SERVICE_ROLE;
    
    // Extrair o ID do projeto da URL (ex: https://xyz.supabase.co -> xyz)
    const projectId = supabaseUrl.split('//')[1]?.split('.')[0];
    if (projectId) {
      // Supabase PostgreSQL costuma seguir este padrão de URL
      // Importante: A senha do banco de dados (postgres) pode não ser a Service Role Key.
      // No entanto, em muitos setups do Replit, o usuário tenta usar o que tem disponível.
      // Se o DATABASE_URL for fornecido diretamente nos Secrets, ele terá precedência.
      finalDbUrl = `postgresql://postgres:${serviceRole}@db.${projectId}.supabase.co:5432/postgres`;
      console.log('🏗️ Constructed DATABASE_URL from Supabase secrets for project:', projectId);
    }
  }

  // Tentar também os segredos sem o prefixo REACT_APP_
  if (!finalDbUrl && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const projectId = supabaseUrl.split('//')[1]?.split('.')[0];
    if (projectId) {
      finalDbUrl = `postgresql://postgres:${serviceRole}@db.${projectId}.supabase.co:5432/postgres`;
      console.log('🏗️ Constructed DATABASE_URL from direct Supabase secrets for project:', projectId);
    }
  }

  if (finalDbUrl) {
    try {
      // Remover query params que podem causar problemas com o driver node-postgres
      const cleanDbUrl = finalDbUrl.split('?')[0];
      
      console.log('🔌 Connecting to database with SSL:', !cleanDbUrl.includes('localhost'));
      
      pool = new Pool({ 
        connectionString: cleanDbUrl,
        connectionTimeoutMillis: 15000,
        max: 20,
        ssl: false
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
