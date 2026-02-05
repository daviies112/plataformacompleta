import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { db } from '../../db.js';
import { supabaseConfig } from '../../../shared/db-schema.js';
import { decrypt } from '../../lib/credentialsManager.js';
import { getEffectiveSupabaseConfig } from '../../lib/supabaseFileConfig.js';

let cachedSupabaseClient: SupabaseClient | null = null;
let cachedCredentials: { url: string; key: string; tenantId: string } | null = null;

export interface SupabaseCredentialsFromDb {
  url: string;
  anonKey: string;
  bucket: string;
  tenantId: string;
}

/**
 * DEFAULT_TENANT_ID for single-tenant development environments
 * This ensures automation uses the same tenantId as the logged-in user
 * Must be set via environment variable for security
 */
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'system';

/**
 * Busca credenciais do Supabase diretamente das variáveis de ambiente (Secrets)
 * Usado como fallback quando não há credenciais no banco de dados
 */
function getSupabaseCredentialsFromEnv(): SupabaseCredentialsFromDb | null {
  const url = (process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const anonKey = (process.env.REACT_APP_SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  
  if (url && anonKey) {
    console.log(`✅ [SUPABASE] Credenciais carregadas dos SECRETS (tenant: ${DEFAULT_TENANT_ID})`);
    return { 
      url, 
      anonKey, 
      bucket: 'receipts',
      tenantId: DEFAULT_TENANT_ID
    };
  }
  
  return null;
}

/**
 * Busca credenciais do Supabase diretamente do banco de dados (tabela supabase_config)
 * Usa descriptografia AES-256-GCM para as credenciais armazenadas
 * 
 * FALLBACK: Se não encontrar no banco, tenta usar variáveis de ambiente (Secrets)
 */
async function getSupabaseCredentialsFromDatabase(): Promise<SupabaseCredentialsFromDb | null> {
  try {
    console.log('🔍 [SUPABASE] Buscando credenciais do banco de dados (supabase_config)...');
    
    // Tentar buscar do banco, mas falhar silenciosamente se a tabela não existir
    let configs = [];
    try {
      configs = await db.select()
        .from(supabaseConfig)
        .limit(1)
        .execute();
    } catch (dbError: any) {
      if (dbError.message?.includes('does not exist')) {
        console.log('⚠️ [SUPABASE] Tabela supabase_config não encontrada, usando fallbacks');
      } else {
        throw dbError;
      }
    }
    
    if (configs.length === 0) {
      // PRIORIDADE: Tentar usar variáveis de ambiente (Secrets)
      const envCredentials = getSupabaseCredentialsFromEnv();
      if (envCredentials) {
        return envCredentials;
      }
      
      console.log('⚠️ [SUPABASE] Nenhuma configuração encontrada no banco ou Secrets');
      return null;
    }
    
    const config = configs[0];
    
    try {
      // Tentar descriptografar primeiro (formato novo)
      let url: string;
      let anonKey: string;
      
      try {
        url = decrypt(config.supabaseUrl);
        anonKey = decrypt(config.supabaseAnonKey);
        console.log(`✅ [SUPABASE] Credenciais descriptografadas com sucesso (tenant: ${config.tenantId})`);
      } catch (decryptError: any) {
        // Fallback: dados podem estar em texto plano (formato legado)
        if (config.supabaseUrl.startsWith('http')) {
          console.log('⚠️ [SUPABASE] Usando credenciais em texto plano (formato legado)');
          url = config.supabaseUrl;
          anonKey = config.supabaseAnonKey;
        } else {
          throw decryptError;
        }
      }
      
      return {
        url,
        anonKey,
        bucket: config.supabaseBucket || 'receipts',
        tenantId: config.tenantId
      };
    } catch (decryptError: any) {
      console.error('❌ [SUPABASE] Erro ao descriptografar credenciais:', decryptError.message);
      
      // FALLBACK: Tentar usar variáveis de ambiente (Secrets)
      const envCredentials = getSupabaseCredentialsFromEnv();
      if (envCredentials) {
        console.log('✅ [SUPABASE] Usando credenciais dos Secrets como fallback após erro de descriptografia');
        return envCredentials;
      }
      
      return null;
    }
  } catch (error: any) {
    console.error('❌ [SUPABASE] Erro ao buscar credenciais:', error.message);
    
    // FALLBACK: Tentar usar variáveis de ambiente (Secrets)
    const envCredentials = getSupabaseCredentialsFromEnv();
    if (envCredentials) {
      return envCredentials;
    }
    
    return null;
  }
}

/**
 * Obtém cliente Supabase dinâmico
 * 
 * Prioridade:
 * 1. Credenciais passadas como parâmetro (para compatibilidade com requisições HTTP)
 * 2. Credenciais do banco de dados (supabase_config) - PARA POLLING E BACKGROUND JOBS
 * 
 * NÃO usa mais variáveis de ambiente - tudo vem do banco de dados!
 */
export async function getDynamicSupabaseClient(supabaseUrl?: string, supabaseKey?: string): Promise<SupabaseClient | null> {
  // Se headers foram fornecidos, use-os (para compatibilidade com requisições HTTP)
  if (supabaseUrl && supabaseKey) {
    if (
      cachedSupabaseClient &&
      cachedCredentials &&
      cachedCredentials.url === supabaseUrl &&
      cachedCredentials.key === supabaseKey
    ) {
      console.log('✅ [SUPABASE] Usando cliente cache (headers)');
      return cachedSupabaseClient;
    }

    try {
      console.log('🔄 [SUPABASE] Criando novo cliente com headers...');
      cachedSupabaseClient = createClient(supabaseUrl, supabaseKey);
      cachedCredentials = { url: supabaseUrl, key: supabaseKey, tenantId: 'header' };
      console.log('✅ [SUPABASE] Cliente criado com sucesso:', supabaseUrl);
      return cachedSupabaseClient;
    } catch (error) {
      console.error('❌ [SUPABASE] Erro ao criar cliente:', error);
      return null;
    }
  }

  // Busca do banco de dados (supabase_config) - para polling e background jobs
  try {
    const credentials = await getSupabaseCredentialsFromDatabase();
    
    if (!credentials) {
      console.log('⚠️ [SUPABASE] Credenciais não configuradas no banco de dados');
      return null;
    }
    
    const dbUrl = credentials.url;
    const dbKey = credentials.anonKey;

    // Verifica se pode usar o cache
    if (
      cachedSupabaseClient &&
      cachedCredentials &&
      cachedCredentials.url === dbUrl &&
      cachedCredentials.key === dbKey
    ) {
      console.log('✅ [SUPABASE] Usando cliente cache (banco)');
      return cachedSupabaseClient;
    }

    console.log('🔄 [SUPABASE] Criando novo cliente com credenciais do banco...');
    cachedSupabaseClient = createClient(dbUrl, dbKey);
    cachedCredentials = { url: dbUrl, key: dbKey, tenantId: credentials.tenantId };
    console.log('✅ [SUPABASE] Cliente criado com sucesso:', dbUrl);
    return cachedSupabaseClient;
  } catch (error) {
    console.error('❌ [SUPABASE] Erro ao buscar/criar cliente:', error);
    return null;
  }
}

/**
 * Obtém o tenantId do cliente Supabase atual (do cache)
 */
export function getCurrentSupabaseTenantId(): string | null {
  return cachedCredentials?.tenantId || null;
}

/**
 * Limpa o cache do cliente Supabase
 */
export function clearSupabaseClientCache() {
  cachedSupabaseClient = null;
  cachedCredentials = null;
  console.log('🗑️ [SUPABASE] Cache do cliente limpo');
}

/**
 * Obtém todas as configurações de Supabase de todos os tenants
 * Útil para operações em lote que precisam processar múltiplos tenants
 * 
 * PRIORIDADE:
 * 1. Banco de dados (supabase_config table) - para multi-tenant
 * 2. Arquivo de configuração (data/supabase-config.json) - para single-tenant
 * 3. Variáveis de ambiente (Secrets) - fallback final
 */
export async function getAllSupabaseConfigs(): Promise<SupabaseCredentialsFromDb[]> {
  try {
    const configs = await db.select()
      .from(supabaseConfig)
      .execute();
    
    const results: SupabaseCredentialsFromDb[] = [];
    
    for (const config of configs) {
      try {
        let url: string;
        let anonKey: string;
        
        try {
          url = decrypt(config.supabaseUrl);
          anonKey = decrypt(config.supabaseAnonKey);
        } catch (decryptError: any) {
          if (config.supabaseUrl.startsWith('http')) {
            url = config.supabaseUrl;
            anonKey = config.supabaseAnonKey;
          } else {
            throw decryptError;
          }
        }
        
        results.push({
          url,
          anonKey,
          bucket: config.supabaseBucket || 'receipts',
          tenantId: config.tenantId
        });
      } catch (error) {
        console.error(`❌ [SUPABASE] Erro ao descriptografar config do tenant ${config.tenantId}`);
      }
    }
    
    if (results.length > 0) {
      console.log(`✅ [SUPABASE] ${results.length} configuração(ões) encontrada(s) no banco de dados`);
      return results;
    }
    
    console.log('⚠️ [SUPABASE] Nenhuma config no banco, tentando arquivo/env...');
    const fileConfig = getEffectiveSupabaseConfig();
    if (fileConfig) {
      console.log(`✅ [SUPABASE] Usando configuração do arquivo/env (tenant: ${DEFAULT_TENANT_ID})`);
      return [{
        url: fileConfig.url,
        anonKey: fileConfig.anonKey,
        bucket: 'receipts',
        tenantId: DEFAULT_TENANT_ID
      }];
    }
    
    console.log('⚠️ [SUPABASE] Nenhuma configuração encontrada em nenhuma fonte');
    return [];
  } catch (error) {
    console.error('❌ [SUPABASE] Erro ao buscar configs do banco:', error);
    
    const fileConfig = getEffectiveSupabaseConfig();
    if (fileConfig) {
      console.log(`✅ [SUPABASE] Fallback: usando configuração do arquivo/env (tenant: ${DEFAULT_TENANT_ID})`);
      return [{
        url: fileConfig.url,
        anonKey: fileConfig.anonKey,
        bucket: 'receipts',
        tenantId: DEFAULT_TENANT_ID
      }];
    }
    
    return [];
  }
}
