import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Supabase PRINCIPAL (do dono) - para autenticacao centralizada
// Usa as credenciais do owner que ficam fixas nos secrets
// IMPORTANTE: Configurar SUPABASE_OWNER_URL e SUPABASE_OWNER_SERVICE_KEY para habilitar multi-tenant

// Tentar carregar do arquivo de configuracao como fallback
function loadSupabaseConfigFromFile(): { url: string; key: string } | null {
  try {
    const configPath = path.join(process.cwd(), 'data', 'supabase-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.supabaseUrl && config.supabaseAnonKey) {
        console.log('[SUPABASE_OWNER] Usando credenciais do arquivo de configuracao');
        return { url: config.supabaseUrl, key: config.supabaseAnonKey };
      }
    }
  } catch (e) {
    console.warn('[SUPABASE_OWNER] Erro ao carregar config do arquivo:', e);
  }
  return null;
}

// Prioridade: env vars > arquivo de configuracao
let supabaseOwnerUrl = process.env.SUPABASE_OWNER_URL || '';
let supabaseOwnerKey = process.env.SUPABASE_OWNER_SERVICE_KEY || '';

// Fallback para arquivo de configuracao
if (!supabaseOwnerUrl || !supabaseOwnerKey) {
  const fileConfig = loadSupabaseConfigFromFile();
  if (fileConfig) {
    supabaseOwnerUrl = fileConfig.url;
    supabaseOwnerKey = fileConfig.key;
  }
}

export const supabaseOwner: SupabaseClient | null = (supabaseOwnerUrl && supabaseOwnerKey) 
  ? createClient(supabaseOwnerUrl, supabaseOwnerKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Helper para criar cliente Supabase específico do cliente logado
export function createClientSupabase(supabaseUrl: string | null, supabaseKey: string | null) {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export const SUPABASE_CONFIGURED = !!(supabaseOwnerUrl && supabaseOwnerKey);
