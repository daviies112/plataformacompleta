/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  🚀 HIGH-PERFORMANCE CACHE FOR PUBLIC ROUTES - CRITICAL FILE  🚀          ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  This module provides multi-layer caching for public routes.              ║
 * ║  Goal: reduce load times from >15 seconds to <1 second.                   ║
 * ║                                                                           ║
 * ║  CACHES:                                                                  ║
 * ║  - Supabase credentials (by tenantId) - 5 min TTL                         ║
 * ║  - Form data (by formId or slug) - 5 min TTL                              ║
 * ║  - Form tenant mappings - 10 min TTL                                      ║
 * ║  - Meeting data (by meetingId) - 2 min TTL                                ║
 * ║  - Room design config - 2 min TTL                                         ║
 * ║  - Contract global config - 5 min TTL                                     ║
 * ║                                                                           ║
 * ║  CACHE LAYERS:                                                            ║
 * ║  1. In-memory (NodeCache) - 3ms response                                  ║
 * ║  2. Disk cache (JSON files) - survives restarts                           ║
 * ║  3. Local DB with timeout - prevents blocking                             ║
 * ║  4. Supabase fallback - reliable when local DB fails                      ║
 * ║                                                                           ║
 * ║  🔴 NEVER:                                                                 ║
 * ║  - Remove or bypass cache functions                                       ║
 * ║  - Add blocking operations without timeouts                               ║
 * ║  - Increase TTL excessively (causes stale data)                           ║
 * ║                                                                           ║
 * ║  📖 Documentation: docs/PUBLIC_FORM_PERFORMANCE_FIX.md                    ║
 * ║  💰 Cost to discover this fix: $30+ in debugging time                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import NodeCache from 'node-cache';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Cache instances with appropriate TTLs
// Short TTL for credentials (5 min) - security consideration
const credentialsCache = new NodeCache({ stdTTL: 300, checkperiod: 60, useClones: false });

// Longer TTL for form data (5 min) - data can be stale for a bit
const formCache = new NodeCache({ stdTTL: 300, checkperiod: 60, useClones: false });

// Tenant mapping cache (10 min) - rarely changes
const tenantMappingCache = new NodeCache({ stdTTL: 600, checkperiod: 120, useClones: false });

// Meeting cache (2 min) - meetings need fresher data
const meetingCache = new NodeCache({ stdTTL: 120, checkperiod: 30, useClones: false });

// Supabase client cache - reuse clients
const supabaseClientCache = new Map<string, SupabaseClient>();

// Global config cache
const globalConfigCache = new NodeCache({ stdTTL: 300, checkperiod: 60, useClones: false });

export interface CachedCredentials {
  url: string;
  anonKey: string;
}

export interface CachedFormTenantMapping {
  tenantId: string;
  isPublic: boolean;
  formId: string;
}

/**
 * Get Supabase credentials from cache or database
 * Caches result to avoid repeated DB queries
 */
export async function getCachedSupabaseCredentials(tenantId: string): Promise<CachedCredentials | null> {
  if (!tenantId) return null;
  
  const cacheKey = `supabase:creds:${tenantId}`;
  
  // Check cache first
  const cached = credentialsCache.get<CachedCredentials>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    // Usar query direta no pool para evitar problemas com Drizzle schema cache
    const { pool } = await import('../db');
    if (pool) {
      // Tenta garantir que a tabela existe via SQL bruto se necessário
      try {
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
      } catch (e: any) {}

      // 🔐 BUSCA PRIORITÁRIA: Tenta tenant específico, depois 'system'
      let result = await pool.query('SELECT * FROM supabase_config WHERE tenant_id = $1 LIMIT 1', [tenantId]);
      
      if (result.rows.length === 0 && tenantId !== 'system') {
        console.log(`ℹ️ [PUBLIC_CACHE] Credenciais não encontradas para ${tenantId}, tentando system...`);
        result = await pool.query('SELECT * FROM supabase_config WHERE tenant_id = $1 LIMIT 1', ['system']);
      }

      if (result.rows.length > 0) {
        const config = result.rows[0];
        
        // No Replit, as credenciais no banco podem não estar criptografadas
        // Verificamos se o dado parece estar criptografado (não começa com http/ey)
        const isEncrypted = (str: string) => {
          if (!str) return false;
          // Se começar com http (URL) ou ey (JWT/Anon Key), não está criptografado
          if (str.startsWith('http') || str.startsWith('ey')) return false;
          // Caso contrário, assumimos que está criptografado
          return true;
        };
        const { decrypt } = await import('./credentialsManager');

        let url = config.supabase_url;
        let anonKey = config.supabase_anon_key;

        try {
          if (isEncrypted(url)) url = decrypt(url);
          if (isEncrypted(anonKey)) anonKey = decrypt(anonKey);
        } catch (e) {}

        const dbCreds = {
          url,
          anonKey,
          bucket: config.supabase_bucket || 'receipts'
        };
        
        console.log(`✅ [PUBLIC_CACHE] Credenciais encontradas no banco para ${tenantId} (ou fallback)`);
        credentialsCache.set(cacheKey, dbCreds);
        return dbCreds;
      }
    }
    
    // Fallback: tentar ler do arquivo/env se não achou no banco
    const { getSupabaseCredentialsFromEnv } = await import('./credentialsDb');
    const envCreds = await getSupabaseCredentialsFromEnv();
    if (envCreds) {
      const result = { url: envCreds.url, anonKey: envCreds.anonKey };
      credentialsCache.set(cacheKey, result);
      return result;
    }
    
    return null;
  } catch (error) {
    console.error(`[PUBLIC_CACHE] Error getting credentials for ${tenantId}:`, error);
    return null;
  }
}

/**
 * Get cached Supabase client - reuses existing clients
 */
export async function getCachedSupabaseClient(tenantId: string): Promise<SupabaseClient | null> {
  if (!tenantId) return null;
  
  // Check client cache first
  const existingClient = supabaseClientCache.get(tenantId);
  if (existingClient) {
    return existingClient;
  }
  
  const credentials = await getCachedSupabaseCredentials(tenantId);
  if (!credentials) return null;
  
  // Create and cache client
  const client = createClient(credentials.url, credentials.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  supabaseClientCache.set(tenantId, client);
  return client;
}

/**
 * Check if tenant has Supabase configured (cached)
 */
export async function hasCachedSupabaseConfig(tenantId: string): Promise<boolean> {
  if (!tenantId) return false;
  const credentials = await getCachedSupabaseCredentials(tenantId);
  return credentials !== null;
}

/**
 * Get cached form tenant mapping
 */
export function getCachedFormTenantMapping(formIdOrSlug: string): CachedFormTenantMapping | null {
  const cacheKey = `form:mapping:${formIdOrSlug}`;
  return tenantMappingCache.get<CachedFormTenantMapping>(cacheKey) || null;
}

/**
 * Set cached form tenant mapping
 */
export function setCachedFormTenantMapping(formIdOrSlug: string, mapping: CachedFormTenantMapping): void {
  const cacheKey = `form:mapping:${formIdOrSlug}`;
  tenantMappingCache.set(cacheKey, mapping);
}

/**
 * Get cached form data
 */
export function getCachedForm(formIdOrSlug: string): any | null {
  const cacheKey = `form:data:${formIdOrSlug}`;
  return formCache.get<any>(cacheKey) || null;
}

/**
 * Set cached form data
 */
export function setCachedForm(formIdOrSlug: string, formData: any): void {
  const cacheKey = `form:data:${formIdOrSlug}`;
  formCache.set(cacheKey, formData);
  
  // Also cache by ID if we have a slug
  if (formData && formData.id && formData.id !== formIdOrSlug) {
    const idCacheKey = `form:data:${formData.id}`;
    formCache.set(idCacheKey, formData);
  }
}

/**
 * Get cached meeting data
 */
export function getCachedMeeting(roomIdOrMeetingId: string): any | null {
  const cacheKey = `meeting:data:${roomIdOrMeetingId}`;
  return meetingCache.get<any>(cacheKey) || null;
}

/**
 * Set cached meeting data
 */
export function setCachedMeeting(roomIdOrMeetingId: string, meetingData: any): void {
  const cacheKey = `meeting:data:${roomIdOrMeetingId}`;
  meetingCache.set(cacheKey, meetingData);
  
  // Also cache by alternate ID
  if (meetingData) {
    if (meetingData.id && meetingData.id !== roomIdOrMeetingId) {
      meetingCache.set(`meeting:data:${meetingData.id}`, meetingData);
    }
    if (meetingData.roomId100ms && meetingData.roomId100ms !== roomIdOrMeetingId) {
      meetingCache.set(`meeting:data:${meetingData.roomId100ms}`, meetingData);
    }
  }
}

/**
 * Get cached room design config
 */
export function getCachedRoomDesign(meetingId: string): any | null {
  const cacheKey = `meeting:design:${meetingId}`;
  return meetingCache.get<any>(cacheKey) || null;
}

/**
 * Set cached room design config
 */
export function setCachedRoomDesign(meetingId: string, designData: any): void {
  const cacheKey = `meeting:design:${meetingId}`;
  meetingCache.set(cacheKey, designData);
}

/**
 * Get cached full meeting (meeting + design combined)
 */
export function getCachedMeetingFull(meetingId: string): any | null {
  const cacheKey = `meeting:full:${meetingId}`;
  return meetingCache.get<any>(cacheKey) || null;
}

/**
 * Set cached full meeting (meeting + design combined)
 */
export function setCachedMeetingFull(meetingId: string, fullData: any): void {
  const cacheKey = `meeting:full:${meetingId}`;
  meetingCache.set(cacheKey, fullData);
}

/**
 * Get cached global config (for assinatura)
 */
export function getCachedGlobalConfig(configType: string): any | null {
  const cacheKey = `config:global:${configType}`;
  return globalConfigCache.get<any>(cacheKey) || null;
}

/**
 * Set cached global config
 */
export function setCachedGlobalConfig(configType: string, config: any): void {
  const cacheKey = `config:global:${configType}`;
  globalConfigCache.set(cacheKey, config);
}

/**
 * Invalidate form cache
 */
export function invalidateFormCache(formIdOrSlug: string): void {
  formCache.del(`form:data:${formIdOrSlug}`);
  tenantMappingCache.del(`form:mapping:${formIdOrSlug}`);
}

/**
 * Invalidate meeting cache
 */
export function invalidateMeetingCache(meetingId: string): void {
  meetingCache.del(`meeting:data:${meetingId}`);
  meetingCache.del(`meeting:design:${meetingId}`);
  meetingCache.del(`meeting:full:${meetingId}`);
}

export function invalidateAllMeetingDesignCaches(): void {
  const keys = meetingCache.keys();
  for (const key of keys) {
    if (key.startsWith('meeting:design:') || key.startsWith('meeting:full:')) {
      meetingCache.del(key);
    }
  }
}

/**
 * Invalidate credentials cache for tenant
 */
export function invalidateCredentialsCache(tenantId: string): void {
  credentialsCache.del(`supabase:creds:${tenantId}`);
  supabaseClientCache.delete(tenantId);
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    credentials: {
      keys: credentialsCache.keys().length,
      stats: credentialsCache.getStats()
    },
    forms: {
      keys: formCache.keys().length,
      stats: formCache.getStats()
    },
    tenantMappings: {
      keys: tenantMappingCache.keys().length,
      stats: tenantMappingCache.getStats()
    },
    meetings: {
      keys: meetingCache.keys().length,
      stats: meetingCache.getStats()
    },
    supabaseClients: supabaseClientCache.size,
    globalConfig: {
      keys: globalConfigCache.keys().length,
      stats: globalConfigCache.getStats()
    }
  };
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  credentialsCache.flushAll();
  formCache.flushAll();
  tenantMappingCache.flushAll();
  meetingCache.flushAll();
  globalConfigCache.flushAll();
  supabaseClientCache.clear();
  console.log('[PUBLIC_CACHE] All caches cleared');
}

// ==========================================
// 🚀 ULTRA-FAST PUBLIC FORM LOADING
// ==========================================

// Persistent file cache for form mappings (survives server restarts)
const FORM_MAPPING_CACHE_FILE = path.join(process.cwd(), 'data', 'form_mapping_cache.json');

interface PersistentFormMapping {
  formId: string;
  tenantId: string;
  companySlug: string;
  slug: string;
  isPublic: boolean;
  formData?: any;
  cachedAt: number;
}

// In-memory copy of persistent cache
let persistentFormMappings: Map<string, PersistentFormMapping> = new Map();

/**
 * Load persistent form mappings from disk on startup
 */
export function loadPersistentFormMappings(): void {
  try {
    if (fs.existsSync(FORM_MAPPING_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(FORM_MAPPING_CACHE_FILE, 'utf8'));
      persistentFormMappings = new Map(Object.entries(data));
      console.log(`[PUBLIC_CACHE] Loaded ${persistentFormMappings.size} persistent form mappings from disk`);
    }
  } catch (error) {
    console.warn('[PUBLIC_CACHE] Could not load persistent form mappings:', error);
  }
}

/**
 * Save persistent form mappings to disk
 */
function savePersistentFormMappings(): void {
  try {
    const dir = path.dirname(FORM_MAPPING_CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = Object.fromEntries(persistentFormMappings);
    fs.writeFileSync(FORM_MAPPING_CACHE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.warn('[PUBLIC_CACHE] Could not save persistent form mappings:', error);
  }
}

/**
 * Set persistent form mapping (saved to disk)
 */
export function setPersistentFormMapping(
  companySlug: string,
  formSlug: string,
  mapping: PersistentFormMapping
): void {
  const key = `${companySlug}:${formSlug}`;
  persistentFormMappings.set(key, { ...mapping, cachedAt: Date.now() });
  // Also cache by formId
  persistentFormMappings.set(mapping.formId, { ...mapping, cachedAt: Date.now() });
  // Save async (non-blocking)
  setImmediate(savePersistentFormMappings);
}

/**
 * Remove persistent form mapping (invalidate disk cache)
 */
export function removePersistentFormMapping(companySlug: string, formSlug: string): void {
  const key = `${companySlug}:${formSlug}`;
  const mapping = persistentFormMappings.get(key);
  persistentFormMappings.delete(key);
  if (mapping?.formId) {
    persistentFormMappings.delete(mapping.formId);
  }
  setImmediate(savePersistentFormMappings);
}

/**
 * Get persistent form mapping (from disk cache)
 */
export function getPersistentFormMapping(
  companySlug: string,
  formSlug: string
): PersistentFormMapping | null {
  const key = `${companySlug}:${formSlug}`;
  const mapping = persistentFormMappings.get(key);
  if (!mapping) return null;
  
  // Check if cache is still valid (24 hours)
  const maxAge = 24 * 60 * 60 * 1000;
  if (Date.now() - mapping.cachedAt > maxAge) {
    return null; // Expired
  }
  
  return mapping;
}

/**
 * Execute a promise with a timeout
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.warn(`[PUBLIC_CACHE] Query timed out after ${timeoutMs}ms, using fallback`);
      resolve(fallbackValue);
    }, timeoutMs);
    
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        console.warn('[PUBLIC_CACHE] Query failed, using fallback:', error.message);
        resolve(fallbackValue);
      });
  });
}

/**
 * Ultra-fast public form lookup with multiple fallback layers:
 * 1. In-memory cache (instant)
 * 2. Persistent disk cache (fast, survives restarts)
 * 3. Local DB with 1s timeout (may fail in production)
 * 4. Direct Supabase lookup (reliable but slower)
 */
export async function getPublicFormUltraFast(
  companySlug: string,
  formSlug: string
): Promise<{ formData: any; source: string } | null> {
  const startTime = Date.now();
  const cacheKey = `${companySlug}:${formSlug}`;
  
  // Layer 1: In-memory cache (instant)
  const memoryCached = getCachedForm(cacheKey);
  if (memoryCached) {
    console.log(`⚡ [PUBLIC_CACHE] Form found in memory cache (${Date.now() - startTime}ms)`);
    return { formData: memoryCached, source: 'memory' };
  }
  
  // Layer 2: Persistent disk cache (fast)
  const persistentMapping = getPersistentFormMapping(companySlug, formSlug);
  if (persistentMapping?.formData) {
    console.log(`💾 [PUBLIC_CACHE] Form found in persistent cache (${Date.now() - startTime}ms)`);
    // Warm up memory cache
    setCachedForm(cacheKey, persistentMapping.formData);
    return { formData: persistentMapping.formData, source: 'persistent' };
  }
  
  // Layer 3: Local DB with 1 second timeout
  try {
    const localResult = await withTimeout(
      fetchFormFromLocalDB(companySlug, formSlug),
      1000, // 1 second timeout
      null
    );
    
    if (localResult) {
      console.log(`🗄️ [PUBLIC_CACHE] Form found in local DB (${Date.now() - startTime}ms)`);
      // Cache it for future requests
      setCachedForm(cacheKey, localResult);
      setPersistentFormMapping(companySlug, formSlug, {
        formId: localResult.id,
        tenantId: localResult.tenantId || '',
        companySlug,
        slug: formSlug,
        isPublic: true,
        formData: localResult,
        cachedAt: Date.now()
      });
      return { formData: localResult, source: 'localDB' };
    }
  } catch (error) {
    console.warn(`[PUBLIC_CACHE] Local DB lookup failed:`, error);
  }
  
  // Layer 4: Direct Supabase lookup (reliable fallback)
  try {
    const supabaseResult = await fetchFormFromSupabaseDirect(companySlug, formSlug);
    if (supabaseResult) {
      console.log(`☁️ [PUBLIC_CACHE] Form found in Supabase (${Date.now() - startTime}ms)`);
      // Cache it for future requests
      setCachedForm(cacheKey, supabaseResult);
      setPersistentFormMapping(companySlug, formSlug, {
        formId: supabaseResult.id,
        tenantId: supabaseResult.tenantId || '',
        companySlug,
        slug: formSlug,
        isPublic: true,
        formData: supabaseResult,
        cachedAt: Date.now()
      });
      return { formData: supabaseResult, source: 'supabase' };
    }
  } catch (error) {
    console.warn(`[PUBLIC_CACHE] Supabase lookup failed:`, error);
  }
  
  console.log(`❌ [PUBLIC_CACHE] Form not found: ${companySlug}/${formSlug} (${Date.now() - startTime}ms)`);
  return null;
}

/**
 * Fetch form from local PostgreSQL database
 */
async function fetchFormFromLocalDB(companySlug: string, formSlug: string): Promise<any | null> {
  const { db } = await import('../db');
  const { formTenantMapping, forms } = await import('../../shared/db-schema');
  const { eq, and } = await import('drizzle-orm');
  
  // Try mapping first
  const mappingResult = await db
    .select({
      formId: formTenantMapping.formId,
      tenantId: formTenantMapping.tenantId,
      isPublic: formTenantMapping.isPublic
    })
    .from(formTenantMapping)
    .where(
      and(
        eq(formTenantMapping.slug, formSlug),
        eq(formTenantMapping.companySlug, companySlug)
      )
    )
    .limit(1);
  
  if (mappingResult.length > 0 && mappingResult[0].isPublic) {
    let formResult: any[] = [];
    try {
      formResult = await db
        .select()
        .from(forms)
        .where(eq(forms.id, mappingResult[0].formId))
        .limit(1);
    } catch (localDbError) {
      console.log('⚠️ [PUBLIC_CACHE] Local forms table not available, skipping local lookup');
    }
    
    if (formResult.length > 0) {
      return formResult[0];
    }
  }
  
  // Fallback: search by slug directly
  let directResult: any[] = [];
  try {
    directResult = await db
      .select()
      .from(forms)
      .where(eq(forms.slug, formSlug))
      .limit(1);
  } catch (localDbError) {
    console.log('⚠️ [PUBLIC_CACHE] Local forms table not available, skipping slug lookup');
  }
  
  if (directResult.length > 0 && directResult[0].isPublic !== false) {
    return directResult[0];
  }
  
  return null;
}

/**
 * Fetch form directly from Supabase (bypasses local DB entirely)
 */
async function fetchFormFromSupabaseDirect(companySlug: string, formSlug: string): Promise<any | null> {
  const { db } = await import('../db');
  const { supabaseConfig, hms100msConfig } = await import('../../shared/db-schema');
  const { decrypt } = await import('./credentialsManager');
  const { eq } = await import('drizzle-orm');

  const configs = await withTimeout(
    db.select().from(supabaseConfig).execute(),
    500,
    []
  );

  const tenantSlugs = await withTimeout(
    db.select({ tenantId: hms100msConfig.tenantId, companySlug: hms100msConfig.companySlug })
      .from(hms100msConfig)
      .execute(),
    500,
    []
  );
  const slugMap = new Map(tenantSlugs.map(t => [t.tenantId, t.companySlug]));

  const prioritized = [...configs].sort((a, b) => {
    const aMatch = slugMap.get(a.tenantId) === companySlug ? 0 : 1;
    const bMatch = slugMap.get(b.tenantId) === companySlug ? 0 : 1;
    return aMatch - bMatch;
  });

  for (const config of prioritized) {
    const tenantSlug = slugMap.get(config.tenantId);
    if (tenantSlug && tenantSlug !== companySlug) {
      continue;
    }

    try {
      let url: string;
      let anonKey: string;
      
      const isEnc = (s: string) => s && !s.startsWith('http') && !s.startsWith('ey');
      try {
        url = isEnc(config.supabaseUrl) ? decrypt(config.supabaseUrl) : config.supabaseUrl;
        anonKey = isEnc(config.supabaseAnonKey) ? decrypt(config.supabaseAnonKey) : config.supabaseAnonKey;
      } catch {
        if (config.supabaseUrl.startsWith('http')) {
          url = config.supabaseUrl;
          anonKey = config.supabaseAnonKey;
        } else {
          continue;
        }
      }
      
      const supabase = createClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('slug', formSlug)
        .eq('is_public', true)
        .limit(1)
        .maybeSingle();
      
      if (!error && data) {
        const { convertKeysToCamelCase, parseJsonbFields, reconstructFormDataFromSupabase } = await import('../formularios/utils/caseConverter');
        const camelForm = convertKeysToCamelCase(data);
        const parsedForm = parseJsonbFields(camelForm, ['questions', 'designConfig', 'scoreTiers', 'tags']);
        return reconstructFormDataFromSupabase(parsedForm);
      }
    } catch (error) {
      console.warn(`[PUBLIC_CACHE] Supabase tenant ${config.tenantId} failed:`, error);
    }
  }
  
  return null;
}

// Load persistent mappings on module load
loadPersistentFormMappings();
