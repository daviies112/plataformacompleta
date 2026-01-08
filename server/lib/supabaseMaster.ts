import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { log } from '../vite';
import { db } from '../db';
import { supabaseMasterConfig } from '../../shared/db-schema';
import { eq } from 'drizzle-orm';
import { decrypt } from './credentialsManager';

/*
 * SUPABASE MASTER - CACHE GLOBAL MULTI-TENANT
 * 
 * SEGURANÇA CRÍTICA:
 * - Este cliente usa SERVICE_ROLE_KEY que BYPASSA Row Level Security (RLS)
 * - RLS DEVE estar habilitado nas tabelas para proteção em caso de comprometimento
 * - Queries de leitura global (cache) são seguras pois não expõem tenant_id ao cliente
 * - Queries de escrita preservam tenant_id correto para isolamento nos dashboards
 * - Payload completo é clonado entre tenants para economia - dados já são públicos via API
 * 
 * REQUISITOS DE SEGURANÇA NO SUPABASE MASTER:
 * 1. RLS habilitado em datacorp_checks e compliance_audit_log
 * 2. Service role key NUNCA deve ser exposta ao frontend
 * 3. API backend faz validação adicional de tenant_id antes de retornar dados
 * 4. CPF nunca é armazenado em texto pleno (apenas hash SHA-256 + encrypted AES-256)
 */

let supabaseMasterClient: SupabaseClient | null = null;
let cachedCredentials: { url: string; key: string } | null = null;

export interface SupabaseMasterCredentials {
  url: string;
  serviceRoleKey: string;
  source: 'database' | 'environment';
}

export async function getSupabaseMasterCredentials(tenantId?: string): Promise<SupabaseMasterCredentials | null> {
  try {
    // Priority 1: Database configuration (per-tenant)
    if (tenantId) {
      const configFromDb = await db.select().from(supabaseMasterConfig)
        .where(eq(supabaseMasterConfig.tenantId, tenantId))
        .limit(1);
      
      if (configFromDb[0]) {
        const decryptedUrl = decrypt(configFromDb[0].supabaseMasterUrl);
        const decryptedKey = decrypt(configFromDb[0].supabaseMasterServiceRoleKey);
        
        // Clean URL
        const cleanUrl = decryptedUrl.trim().replace(/\/+$/, '');
        const cleanKey = decryptedKey.trim();

        log(`✅ Supabase Master: Credenciais carregadas do banco para tenant ${tenantId}`);
        return {
          url: cleanUrl,
          serviceRoleKey: cleanKey,
          source: 'database'
        };
      }
    }
    
    // Priority 2: Try to get ANY available config from database (for default-tenant or when specific tenant has no config)
    try {
      const anyConfig = await db.select().from(supabaseMasterConfig).limit(1);
      if (anyConfig[0]) {
        const decryptedUrl = decrypt(anyConfig[0].supabaseMasterUrl);
        const decryptedKey = decrypt(anyConfig[0].supabaseMasterServiceRoleKey);
        
        // Clean URL
        const cleanUrl = decryptedUrl.trim().replace(/\/+$/, '');
        const cleanKey = decryptedKey.trim();

        log(`✅ Supabase Master: Usando credenciais de ${anyConfig[0].tenantId} (fallback para ${tenantId || 'sem tenant'})`);
        return {
          url: cleanUrl,
          serviceRoleKey: cleanKey,
          source: 'database'
        };
      }
    } catch (e) {
      // Silent fail - try environment variables next
    }
    
    // Priority 3: Environment variables (fallback)
    const urlFromEnv = process.env.SUPABASE_MASTER_URL;
    const keyFromEnv = process.env.SUPABASE_MASTER_SERVICE_ROLE_KEY;
    
    if (urlFromEnv && keyFromEnv) {
      log('✅ Supabase Master: Credenciais carregadas de variáveis de ambiente');
      return {
        url: urlFromEnv,
        serviceRoleKey: keyFromEnv,
        source: 'environment'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar credenciais do Supabase Master:', error);
    
    // Fallback to environment variables on error
    const urlFromEnv = process.env.SUPABASE_MASTER_URL;
    const keyFromEnv = process.env.SUPABASE_MASTER_SERVICE_ROLE_KEY;
    
    if (urlFromEnv && keyFromEnv) {
      return {
        url: urlFromEnv,
        serviceRoleKey: keyFromEnv,
        source: 'environment'
      };
    }
    
    return null;
  }
}

export async function getSupabaseMasterForTenant(tenantId: string): Promise<SupabaseClient> {
  const credentials = await getSupabaseMasterCredentials(tenantId);
  
  if (!credentials) {
    log('⚠️  Supabase MESTRE não configurado. Configure na seção Supabase Master das Configurações ou via variáveis de ambiente.');
    throw new Error(
      'Supabase MESTRE não configurado. Para produção multi-tenant, você precisa configurar um Supabase separado para cache centralizado.'
    );
  }
  
  // Check if we can reuse cached client
  if (supabaseMasterClient && cachedCredentials?.url === credentials.url && cachedCredentials?.key === credentials.serviceRoleKey) {
    return supabaseMasterClient;
  }
  
  // Create new client with a reliable fetch wrapper
  supabaseMasterClient = createClient(
    credentials.url,
    credentials.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        fetch: (url: any, options: any) => import('node-fetch').then(({ default: fetch }) => fetch(url, options))
      }
    }
  );
  
  cachedCredentials = { url: credentials.url, key: credentials.serviceRoleKey };
  log(`✅ Supabase MESTRE conectado (fonte: ${credentials.source})`);
  return supabaseMasterClient;
}

export function getSupabaseMaster(): SupabaseClient {
  if (supabaseMasterClient) {
    return supabaseMasterClient;
  }

  const SUPABASE_MASTER_URL = process.env.SUPABASE_MASTER_URL;
  const SUPABASE_MASTER_SERVICE_ROLE_KEY = process.env.SUPABASE_MASTER_SERVICE_ROLE_KEY;

  if (!SUPABASE_MASTER_URL || !SUPABASE_MASTER_SERVICE_ROLE_KEY) {
    log('⚠️  Supabase MESTRE não configurado. Configure SUPABASE_MASTER_URL e SUPABASE_MASTER_SERVICE_ROLE_KEY nas secrets ou na seção Supabase Master das Configurações.');
    throw new Error(
      'Supabase MESTRE não configurado. Para produção multi-tenant, você precisa configurar um Supabase separado para cache centralizado.'
    );
  }

  // Create new client with a reliable fetch wrapper
  supabaseMasterClient = createClient(
    SUPABASE_MASTER_URL,
    SUPABASE_MASTER_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        fetch: (url: any, options: any) => import('node-fetch').then(({ default: fetch }) => fetch(url, options))
      }
    }
  );

  cachedCredentials = { url: SUPABASE_MASTER_URL, key: SUPABASE_MASTER_SERVICE_ROLE_KEY };
  log('✅ Supabase MESTRE conectado');
  return supabaseMasterClient;
}

export async function isSupabaseMasterConfigured(tenantId?: string): Promise<boolean> {
  const credentials = await getSupabaseMasterCredentials(tenantId);
  return credentials !== null;
}

export interface DatacorpCheck {
  id: string;
  cpf_hash: string;
  cpf_encrypted: string;
  tenant_id: string;
  lead_id?: string;
  submission_id?: string;
  status: 'approved' | 'rejected' | 'manual_review' | 'error' | 'pending';
  risk_score: number;
  payload: any;
  consulted_at: string;
  expires_at: string;
  source: string;
  api_cost: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ComplianceAuditLog {
  id: string;
  check_id: string;
  tenant_id: string;
  action: 'view' | 'check' | 'reprocess' | 'export' | 'delete';
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

export interface TenantRegistry {
  tenant_id: string;
  tenant_slug: string;
  company_name: string;
  is_active: boolean;
  created_at: string;
}
