import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { log } from '../vite';
import { db } from '../db';
import { supabaseMasterConfig } from '../../shared/db-schema';
import { eq } from 'drizzle-orm';
import { decrypt } from './credentialsManager';

function validateServiceRoleKey(key: string): { isValid: boolean; role: string | null; error?: string } {
  try {
    const parts = key.split('.');
    if (parts.length !== 3) {
      return { isValid: false, role: null, error: 'Chave JWT inválida (formato incorreto)' };
    }
    
    const payloadBase64 = parts[1];
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
    const payload = JSON.parse(payloadJson);
    
    const role = payload.role || null;
    
    if (role === 'service_role') {
      return { isValid: true, role };
    } else if (role === 'anon') {
      return { isValid: false, role, error: 'Chave é "anon" - use a "service_role" key do Supabase Dashboard' };
    } else {
      return { isValid: false, role, error: `Role desconhecido: ${role}` };
    }
  } catch (e: any) {
    return { isValid: false, role: null, error: `Erro ao decodificar JWT: ${e.message}` };
  }
}

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
        let decryptedUrl = decrypt(configFromDb[0].supabaseMasterUrl);
        const decryptedKey = decrypt(configFromDb[0].supabaseMasterServiceRoleKey);
        
        // Clean URL and ensure it has https:// prefix
        decryptedUrl = decryptedUrl.trim().replace(/\/+$/, '');
        if (!decryptedUrl.startsWith('http://') && !decryptedUrl.startsWith('https://')) {
          decryptedUrl = `https://${decryptedUrl}`;
        }
        const cleanUrl = decryptedUrl;
        const cleanKey = decryptedKey.trim();

        // Validate that the key is actually a service_role key
        const validation = validateServiceRoleKey(cleanKey);
        if (!validation.isValid) {
          log(`❌ ERRO: Chave do Supabase Master não é service_role!`);
          log(`   Role detectado: ${validation.role || 'desconhecido'}`);
          log(`   Problema: ${validation.error}`);
          log(`   Solução: No Supabase Dashboard > Settings > API, copie a "service_role" key (NÃO a anon key)`);
          // Still return credentials but log the warning - the insert will fail with RLS error
        } else {
          log(`✅ Supabase Master: Credenciais validadas (role: service_role) para tenant ${tenantId}`);
        }

        return {
          url: cleanUrl,
          serviceRoleKey: cleanKey,
          source: 'database'
        };
      }
    }
    
    // 🔐 SECURITY FIX: Remove "any config" fallback that caused multi-tenant data leakage
    // Background jobs that need fallbacks should use getSupabaseMasterCredentialsWithFallback()
    
    // Priority 2: Environment variables (fallback for background jobs ONLY)
    // This should only be used by system-level processes, not user-facing endpoints
    const urlFromEnv = process.env.SUPABASE_MASTER_URL;
    const keyFromEnv = process.env.SUPABASE_MASTER_SERVICE_ROLE_KEY;
    
    if (urlFromEnv && keyFromEnv) {
      log('✅ Supabase Master: Credenciais carregadas de variáveis de ambiente (use com cautela - background jobs only)');
      return {
        url: urlFromEnv,
        serviceRoleKey: keyFromEnv,
        source: 'environment'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar credenciais do Supabase Master:', error);
    return null;
  }
}

/**
 * Get Supabase Master credentials STRICTLY for a specific tenant - NO FALLBACKS
 * 🔐 MULTI-TENANT SECURITY: For user-facing endpoints only
 * 
 * This function ensures complete tenant isolation:
 * - Returns credentials ONLY if explicitly configured for this tenant
 * - NO fallback to other tenants or environment variables
 * - New tenants start with no credentials (must configure their own)
 * 
 * @param tenantId - The tenant ID to get credentials for (required)
 * @returns Credentials if configured for this tenant, null otherwise
 */
export async function getSupabaseMasterCredentialsStrict(tenantId: string): Promise<SupabaseMasterCredentials | null> {
  if (!tenantId) {
    log('❌ [SUPABASE-MASTER-STRICT] tenantId é obrigatório');
    return null;
  }

  try {
    log(`🔍 [SUPABASE-MASTER-STRICT] Buscando credenciais APENAS para tenant ${tenantId}...`);
    const configFromDb = await db.select().from(supabaseMasterConfig)
      .where(eq(supabaseMasterConfig.tenantId, tenantId))
      .limit(1);
    
    if (configFromDb[0]) {
      let decryptedUrl = decrypt(configFromDb[0].supabaseMasterUrl);
      const decryptedKey = decrypt(configFromDb[0].supabaseMasterServiceRoleKey);
      
      decryptedUrl = decryptedUrl.trim().replace(/\/+$/, '');
      if (!decryptedUrl.startsWith('http://') && !decryptedUrl.startsWith('https://')) {
        decryptedUrl = `https://${decryptedUrl}`;
      }

      const validation = validateServiceRoleKey(decryptedKey.trim());
      if (!validation.isValid) {
        log(`⚠️ [SUPABASE-MASTER-STRICT] Chave não é service_role para tenant ${tenantId}: ${validation.error}`);
      }

      log(`✅ [SUPABASE-MASTER-STRICT] Credenciais encontradas para tenant: ${tenantId}`);
      return {
        url: decryptedUrl,
        serviceRoleKey: decryptedKey.trim(),
        source: 'database'
      };
    }
    
    // NO FALLBACKS - Return null if not found for this specific tenant
    log(`ℹ️ [SUPABASE-MASTER-STRICT] Nenhuma credencial configurada para tenant ${tenantId}`);
    return null;
  } catch (error) {
    console.error(`❌ [SUPABASE-MASTER-STRICT] Erro ao buscar credenciais para tenant ${tenantId}:`, error);
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
  
  // Ensure URL has https:// prefix (final check)
  let finalUrl = credentials.url;
  if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
    finalUrl = `https://${finalUrl}`;
    log(`⚠️  URL sem protocolo detectada, adicionando https:// -> ${finalUrl}`);
  }
  
  // Check if we can reuse cached client
  if (supabaseMasterClient && cachedCredentials?.url === finalUrl && cachedCredentials?.key === credentials.serviceRoleKey) {
    return supabaseMasterClient;
  }
  
  log(`🔗 Criando cliente Supabase Master com URL: ${finalUrl}`);
  
  // Create new client - standard approach like working clienteSupabase.ts
  supabaseMasterClient = createClient(
    finalUrl,
    credentials.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  cachedCredentials = { url: finalUrl, key: credentials.serviceRoleKey };
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

  // Create new client - standard approach like working clienteSupabase.ts
  supabaseMasterClient = createClient(
    SUPABASE_MASTER_URL,
    SUPABASE_MASTER_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
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
