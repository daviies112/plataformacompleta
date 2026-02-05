/**
 * Helper functions to get credentials from PostgreSQL database
 * These functions are used by billing-service and other services
 * 
 * 🔐 MULTI-TENANT: All functions now support tenant_id filtering to ensure proper data isolation
 */

import { db } from '../db';
import { 
  pluggyConfig, 
  supabaseConfig, 
  n8nConfig, 
  redisConfig,
  sentryConfig,
  resendConfig,
  cloudflareConfig,
  betterStackConfig,
  evolutionApiConfig
} from '../../shared/db-schema.js';
import { eq } from 'drizzle-orm';
import { decrypt } from './credentialsManager';

export interface PluggyCredentials {
  clientId: string;
  clientSecret: string;
}

export interface SupabaseCredentials {
  url: string;
  anonKey: string;
  bucket: string;
}

export interface N8nCredentials {
  webhookUrl: string;
}

export interface RedisCredentials {
  url: string;
  token?: string;
}

export interface SentryCredentials {
  dsn: string;
  authToken?: string;
  organization?: string;
  project?: string;
  environment?: string;
  tracesSampleRate?: string;
}

export interface ResendCredentials {
  apiKey: string;
  fromEmail: string;
}

export interface CloudflareCredentials {
  zoneId: string;
  apiToken: string;
}

export interface BetterStackCredentials {
  sourceToken: string;
  ingestingHost?: string;
}

export interface EvolutionApiCredentials {
  apiUrl: string;
  apiKey: string;
  instance?: string;
}

/**
 * Get Pluggy credentials from database
 * 🔐 MULTI-TENANT: Requires explicit tenant_id - NO fallback to env vars
 * Returns null if credentials not found for tenant
 */
export async function getPluggyCredentials(tenantId: string): Promise<PluggyCredentials | null> {
  if (!tenantId) {
    console.error('❌ [PLUGGY] tenantId é obrigatório');
    return null;
  }

  try {
    const configs = await db.select()
      .from(pluggyConfig)
      .where(eq(pluggyConfig.tenantId, tenantId))
      .limit(1)
      .execute();
    
    if (configs.length > 0) {
      const config = configs[0];
      console.log(`✅ [PLUGGY] Credenciais carregadas do banco de dados (tenant: ${tenantId})`);
      return {
        clientId: config.clientId,
        clientSecret: config.clientSecret
      };
    }
    
    console.log(`❌ [PLUGGY] Credenciais não encontradas para tenant ${tenantId}`);
    return null;
  } catch (error) {
    console.error(`❌ [PLUGGY] Erro ao buscar credenciais para tenant ${tenantId}:`, error);
    return null;
  }
}

// Helper function to decrypt Supabase config
function decryptSupabaseConfig(config: typeof supabaseConfig.$inferSelect): SupabaseCredentials | null {
  try {
    let url: string;
    let anonKey: string;
    
    // Verificamos se o dado parece estar criptografado (não começa com http/ey)
    const isEncrypted = (str: string) => {
      if (!str) return false;
      if (str.startsWith('http') || str.startsWith('ey')) return false;
      return true;
    };

    try {
      if (isEncrypted(config.supabaseUrl)) {
        url = decrypt(config.supabaseUrl);
      } else {
        url = config.supabaseUrl;
      }

      if (isEncrypted(config.supabaseAnonKey)) {
        anonKey = decrypt(config.supabaseAnonKey);
      } else {
        anonKey = config.supabaseAnonKey;
      }
      
      console.log(`✅ [SUPABASE] Credenciais processadas com sucesso (tenant: ${config.tenantId})`);
    } catch (decryptError: any) {
      // Fallback: dados podem estar em texto plano
      url = config.supabaseUrl;
      anonKey = config.supabaseAnonKey;
    }
    
    return {
      url,
      anonKey,
      bucket: config.supabaseBucket || 'receipts'
    };
  } catch (decryptError) {
    console.error('❌ [SUPABASE] Erro ao descriptografar credenciais:', decryptError);
    return null;
  }
}

/**
 * Get Supabase credentials STRICTLY for a specific tenant - NO FALLBACKS
 * 🔐 ADMIN PLATFORM: Ensures complete tenant isolation
 * 
 * This function is used by the admin platform to guarantee that:
 * - Each admin sees ONLY their own credentials
 * - New admins start with EMPTY/ZERO credentials
 * - No data leakage between tenants
 * 
 * @param tenantId - The tenant ID to get credentials for
 * @returns Credentials if configured for this tenant, null otherwise
 */
export async function getSupabaseCredentialsStrict(tenantId: string): Promise<SupabaseCredentials | null> {
  if (!tenantId) {
    console.error('❌ [SUPABASE-STRICT] tenantId é obrigatório');
    return null;
  }

  try {
    console.log(`🔍 [SUPABASE-STRICT] Buscando credenciais APENAS para tenant ${tenantId}...`);
    const configs = await db.select()
      .from(supabaseConfig)
      .where(eq(supabaseConfig.tenantId, tenantId))
      .limit(1)
      .execute();
    
    if (configs.length > 0) {
      const result = decryptSupabaseConfig(configs[0]);
      if (result) {
        console.log(`✅ [SUPABASE-STRICT] Credenciais encontradas para tenant: ${tenantId}`);
        return result;
      }
    }
    
    // NO FALLBACKS - Return null if not found for this specific tenant
    console.log(`ℹ️ [SUPABASE-STRICT] Nenhuma credencial configurada para tenant ${tenantId}`);
    console.log(`💡 [SUPABASE-STRICT] Admin deve configurar suas próprias credenciais em /configuracoes`);
    return null;
  } catch (error) {
    console.warn(`⚠️ [SUPABASE-STRICT] Erro ao buscar credenciais para tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Get Supabase credentials from database
 * 🔐 MULTI-TENANT: First tries database with tenant_id, then falls back to tenant 'system', then env vars
 * 
 * ⚠️ WARNING: This function has fallbacks and should ONLY be used by:
 * - Background jobs (pollers, sync services)
 * - System-level code that needs a Supabase client
 * 
 * For admin platform routes, use getSupabaseCredentialsStrict() instead to ensure tenant isolation.
 */
export async function getSupabaseCredentials(tenantId: string): Promise<SupabaseCredentials | null> {
  // 1. First try with provided tenantId (strict)
  try {
    const { db, pool } = await import('../db');
    const { supabaseConfig } = await import('../../shared/db-schema');
    const { eq } = await import('drizzle-orm');

    // Tenta garantir que a tabela existe via SQL bruto se necessário
    try {
      if (pool) {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS supabase_config (
            id SERIAL PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            supabase_url TEXT NOT NULL,
            supabase_anon_key TEXT NOT NULL,
            supabase_bucket TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
      }
    } catch (e: any) {
      console.error('❌ [SupabaseCredentials] Erro ao garantir tabela supabase_config:', e.message);
    }

    console.log(`🔍 [SUPABASE] Buscando credenciais para tenant ${tenantId}...`);
    
    let configs = [];
    try {
      configs = await db.select()
        .from(supabaseConfig)
        .where(eq(supabaseConfig.tenantId, tenantId))
        .limit(1)
        .execute();
    } catch (e) {
      console.log(`⚠️ [SupabaseCredentials] Erro ao acessar tabela supabase_config para tenant ${tenantId}`);
    }
    
    if (configs && configs.length > 0) {
      const result = decryptSupabaseConfig(configs[0]);
      if (result) {
        console.log(`✅ [SUPABASE] Usando credenciais do tenant: ${tenantId}`);
        return result;
      }
    }
  } catch (error) {
    console.warn(`⚠️ [SUPABASE] Erro ao buscar credenciais para tenant ${tenantId}:`, error);
  }
  
  // 2. Fallback to 'system' tenant
  if (tenantId !== 'system') {
    try {
      const { db } = await import('../db');
      const { supabaseConfig } = await import('../../shared/db-schema');
      const { eq } = await import('drizzle-orm');

      const systemConfigs = await db.select()
        .from(supabaseConfig)
        .where(eq(supabaseConfig.tenantId, 'system'))
        .limit(1)
        .execute();
      
      if (systemConfigs && systemConfigs.length > 0) {
        const result = decryptSupabaseConfig(systemConfigs[0]);
        if (result) {
          return result;
        }
      }
    } catch (error) {}
  }
  
  // 3. Fallback: environment variables (Secrets)
  const envCredentials = await getSupabaseCredentialsFromEnv();
  if (envCredentials) {
    console.log('✅ [SUPABASE] Usando credenciais dos Secrets (fallback)');
    return envCredentials;
  }
  
  return null;
}

export async function getSupabaseCredentialsFromEnv(): Promise<SupabaseCredentials | null> {
  const url = (process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const serviceRole = (process.env.REACT_APP_SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const anonKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  
  const key = serviceRole || anonKey;
  
  if (url && key) {
    console.log('✅ [SYSTEM] Credenciais do Supabase carregadas de environment variables');
    return { url, anonKey: key, bucket: 'receipts' };
  }
  
  return null;
}

/**
 * Get N8N webhook URL from database
 * 🔐 MULTI-TENANT: Requires explicit tenant_id - NO default fallback for security
 */
export async function getN8nCredentials(tenantId: string): Promise<N8nCredentials | null> {
  try {
    // 🔐 Query filtered by tenant
    const configs = await db.select()
      .from(n8nConfig)
      .where(eq(n8nConfig.tenantId, tenantId))
      .limit(1)
      .execute();
    
    if (configs.length > 0) {
      const config = configs[0];
      console.log(`✅ URL do webhook N8N carregada do banco de dados (tenant: ${tenantId})`);
      return {
        webhookUrl: config.webhookUrl
      };
    }
    
    console.log('❌ URL do webhook N8N não encontrada');
    return null;
  } catch (error) {
    console.error('Erro ao buscar URL do webhook N8N:', error);
    return null;
  }
}

/**
 * Get Pluggy API key by authenticating with credentials from database
 * 🔐 MULTI-TENANT: Requires tenantId to fetch credentials
 */
export async function getPluggyApiKey(tenantId: string): Promise<string | null> {
  if (!tenantId) {
    console.error('❌ [PLUGGY] tenantId é obrigatório para obter API key');
    return null;
  }

  const credentials = await getPluggyCredentials(tenantId);
  
  if (!credentials) {
    console.error(`❌ [PLUGGY] Credenciais não encontradas para tenant ${tenantId}`);
    return null;
  }
  
  try {
    const response = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret
      })
    });
    
    if (!response.ok) {
      console.error(`❌ [PLUGGY] Falha na autenticação para tenant ${tenantId}:`, response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.apiKey) {
      console.error(`❌ [PLUGGY] API key não retornada para tenant ${tenantId}`);
      return null;
    }
    
    console.log(`✅ [PLUGGY] API key obtida com sucesso para tenant ${tenantId}`);
    return data.apiKey;
  } catch (error) {
    console.error(`❌ [PLUGGY] Erro ao obter API key para tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Get Redis credentials from database
 * 🔐 MULTI-TENANT: Requires explicit tenant_id - NO fallback to env vars
 * Returns null if credentials not found for tenant
 */
export async function getRedisCredentials(tenantId: string): Promise<RedisCredentials | null> {
  if (!tenantId) {
    console.error('❌ [REDIS] tenantId é obrigatório');
    return null;
  }

  try {
    const configs = await db.select()
      .from(redisConfig)
      .where(eq(redisConfig.tenantId, tenantId))
      .limit(1)
      .execute();
    
    if (configs.length > 0) {
      const config = configs[0];
      console.log(`✅ [REDIS] Credenciais carregadas do banco de dados (tenant: ${tenantId})`);
      return {
        url: decrypt(config.redisUrl),
        token: config.redisToken ? decrypt(config.redisToken) : undefined
      };
    }
    
    console.log(`❌ [REDIS] Credenciais não encontradas para tenant ${tenantId}`);
    return null;
  } catch (error) {
    console.error(`❌ [REDIS] Erro ao buscar credenciais para tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Get Sentry credentials from database
 * 🔐 MULTI-TENANT: Requires explicit tenant_id - NO fallback to env vars
 * Returns null if credentials not found for tenant
 */
export async function getSentryCredentials(tenantId?: string): Promise<SentryCredentials | null> {
  if (!tenantId) {
    console.log('ℹ️  [SENTRY] Serviço multi-tenant - será inicializado quando tenant estiver disponível');
    return null;
  }

  try {
    const configs = await db.select()
      .from(sentryConfig)
      .where(eq(sentryConfig.tenantId, tenantId))
      .limit(1)
      .execute();
    
    if (configs.length > 0) {
      const config = configs[0];
      console.log(`✅ [SENTRY] Credenciais carregadas do banco de dados (tenant: ${tenantId})`);
      return {
        dsn: decrypt(config.dsn),
        authToken: config.authToken ? decrypt(config.authToken) : undefined,
        organization: config.organization || undefined,
        project: config.project || undefined,
        environment: config.environment || 'production',
        tracesSampleRate: config.tracesSampleRate || '0.1'
      };
    }
    
    console.log(`❌ [SENTRY] Credenciais não encontradas para tenant ${tenantId}`);
    return null;
  } catch (error) {
    console.error(`❌ [SENTRY] Erro ao buscar credenciais para tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Get Resend credentials from database
 * 🔐 MULTI-TENANT: Requires explicit tenant_id - NO fallback to env vars
 * Returns null if credentials not found for tenant
 */
export async function getResendCredentials(tenantId?: string): Promise<ResendCredentials | null> {
  if (!tenantId) {
    console.log('ℹ️  [RESEND] Serviço multi-tenant - será inicializado quando tenant estiver disponível');
    return null;
  }

  try {
    const configs = await db.select()
      .from(resendConfig)
      .where(eq(resendConfig.tenantId, tenantId))
      .limit(1)
      .execute();
    
    if (configs.length > 0) {
      const config = configs[0];
      console.log(`✅ [RESEND] Credenciais carregadas do banco de dados (tenant: ${tenantId})`);
      return {
        apiKey: decrypt(config.apiKey),
        fromEmail: config.fromEmail
      };
    }
    
    console.log(`❌ [RESEND] Credenciais não encontradas para tenant ${tenantId}`);
    return null;
  } catch (error) {
    console.error(`❌ [RESEND] Erro ao buscar credenciais para tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Get Cloudflare credentials from database
 * 🔐 MULTI-TENANT: Requires explicit tenant_id - NO fallback to env vars
 * Returns null if credentials not found for tenant
 */
export async function getCloudflareCredentials(tenantId: string): Promise<CloudflareCredentials | null> {
  if (!tenantId) {
    console.error('❌ [CLOUDFLARE] tenantId é obrigatório');
    return null;
  }

  try {
    const configs = await db.select()
      .from(cloudflareConfig)
      .where(eq(cloudflareConfig.tenantId, tenantId))
      .limit(1)
      .execute();
    
    if (configs.length > 0) {
      const config = configs[0];
      console.log(`✅ [CLOUDFLARE] Credenciais carregadas do banco de dados (tenant: ${tenantId})`);
      return {
        zoneId: decrypt(config.zoneId),
        apiToken: decrypt(config.apiToken)
      };
    }
    
    console.log(`❌ [CLOUDFLARE] Credenciais não encontradas para tenant ${tenantId}`);
    return null;
  } catch (error) {
    console.error(`❌ [CLOUDFLARE] Erro ao buscar credenciais para tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Get Better Stack/Logtail credentials from database
 * 🔐 MULTI-TENANT: Requires explicit tenant_id - NO fallback to env vars
 * Returns null if credentials not found for tenant
 */
export async function getBetterStackCredentials(tenantId: string): Promise<BetterStackCredentials | null> {
  if (!tenantId) {
    console.error('❌ [BETTER_STACK] tenantId é obrigatório');
    return null;
  }

  try {
    const configs = await db.select()
      .from(betterStackConfig)
      .where(eq(betterStackConfig.tenantId, tenantId))
      .limit(1)
      .execute();
    
    if (configs.length > 0) {
      const config = configs[0];
      console.log(`✅ [BETTER_STACK] Credenciais carregadas do banco de dados (tenant: ${tenantId})`);
      return {
        sourceToken: decrypt(config.sourceToken),
        ingestingHost: config.ingestingHost || 'in.logs.betterstack.com'
      };
    }
    
    console.log(`❌ [BETTER_STACK] Credenciais não encontradas para tenant ${tenantId}`);
    return null;
  } catch (error) {
    console.error(`❌ [BETTER_STACK] Erro ao buscar credenciais para tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Get Evolution API credentials from environment variables ONLY
 * 🔧 SYSTEM-LEVEL: For background jobs and system-level code that don't have a tenantId
 * Does NOT query the database - only reads from environment variables
 */
export function getEvolutionApiCredentialsFromEnv(): EvolutionApiCredentials | null {
  const apiUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE || 'nexus-whatsapp';
  
  if (apiUrl && apiKey) {
    console.log('✅ [SYSTEM] Credenciais da Evolution API carregadas de environment variables');
    return { apiUrl, apiKey, instance };
  }
  
  console.log('⚠️ [SYSTEM] Credenciais da Evolution API não encontradas em environment variables');
  return null;
}

/**
 * Get Evolution API credentials from database
 * 🔐 MULTI-TENANT: First tries database with tenant_id, then falls back to env vars if not found
 * This allows the system to work with just Secrets configured
 */
export async function getEvolutionApiCredentials(tenantId?: string): Promise<EvolutionApiCredentials | null> {
  // Primeiro tentar do banco de dados se tenantId foi fornecido
  if (tenantId) {
    try {
      const configs = await db.select()
        .from(evolutionApiConfig)
        .where(eq(evolutionApiConfig.tenantId, tenantId))
        .limit(1)
        .execute();
      
      if (configs.length > 0) {
        const config = configs[0];
        console.log(`✅ [EVOLUTION_API] Credenciais carregadas do banco de dados (tenant: ${tenantId})`);
        try {
          return {
            apiUrl: decrypt(config.apiUrl),
            apiKey: decrypt(config.apiKey),
            instance: config.instance || 'nexus-whatsapp'
          };
        } catch (decryptError: any) {
          console.error(`❌ [EVOLUTION_API] Erro ao descriptografar credenciais: ${decryptError.message}`);
        }
      }
    } catch (error) {
      console.error(`❌ [EVOLUTION_API] Erro ao buscar credenciais para tenant ${tenantId}:`, error);
    }
  }
  
  // Tentar buscar do tenant "system" (usado quando credenciais vêm dos Secrets)
  try {
    const systemConfigs = await db.select()
      .from(evolutionApiConfig)
      .where(eq(evolutionApiConfig.tenantId, 'system'))
      .limit(1)
      .execute();
    
    if (systemConfigs.length > 0) {
      const config = systemConfigs[0];
      console.log('✅ [EVOLUTION_API] Credenciais carregadas do banco (tenant: system)');
      try {
        return {
          apiUrl: decrypt(config.apiUrl),
          apiKey: decrypt(config.apiKey),
          instance: config.instance || 'nexus-whatsapp'
        };
      } catch (decryptError: any) {
        console.error(`❌ [EVOLUTION_API] Erro ao descriptografar credenciais: ${decryptError.message}`);
      }
    }
  } catch (error) {
    console.log('⚠️ [EVOLUTION_API] Não foi possível buscar credenciais do tenant system');
  }
  
  // FALLBACK: Tentar variáveis de ambiente (Secrets)
  const envCredentials = getEvolutionApiCredentialsFromEnv();
  if (envCredentials) {
    return envCredentials;
  }
  
  console.log('❌ [EVOLUTION_API] Credenciais não encontradas (nem banco nem Secrets)');
  return null;
}

/**
 * Get Evolution API credentials - simplified version for background jobs
 * Always tries system tenant first, then falls back to env vars
 */
export async function getSystemEvolutionApiCredentials(): Promise<EvolutionApiCredentials | null> {
  return getEvolutionApiCredentials('system');
}
