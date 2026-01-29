/**
 * 🚀 HIGH-PERFORMANCE CACHE FOR PUBLIC ROUTES
 * 
 * This module provides in-memory caching specifically optimized for public routes
 * that don't require authentication. Goal: reduce load times from >15s to <3s.
 * 
 * Caches:
 * - Supabase credentials (by tenantId)
 * - Form data (by formId or slug)
 * - Form tenant mappings
 * - Meeting data (by meetingId or roomId)
 * - Contract global config
 */

import NodeCache from 'node-cache';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
    // Import at top level would cause circular dependency, so lazy import
    const { db } = await import('../db');
    const { supabaseConfig } = await import('../../shared/db-schema');
    const { eq } = await import('drizzle-orm');
    const { decrypt } = await import('./credentialsManager');
    
    const configs = await db.select()
      .from(supabaseConfig)
      .where(eq(supabaseConfig.tenantId, tenantId))
      .limit(1)
      .execute();
    
    if (configs.length === 0) {
      // Cache negative result to avoid repeated DB hits
      credentialsCache.set(cacheKey, null, 60); // Short TTL for negative cache
      return null;
    }
    
    const config = configs[0];
    let url: string;
    let anonKey: string;
    
    try {
      url = decrypt(config.supabaseUrl);
      anonKey = decrypt(config.supabaseAnonKey);
    } catch {
      // Fallback for plaintext credentials (legacy)
      if (config.supabaseUrl.startsWith('http')) {
        url = config.supabaseUrl;
        anonKey = config.supabaseAnonKey;
      } else {
        return null;
      }
    }
    
    const result = { url, anonKey };
    credentialsCache.set(cacheKey, result);
    return result;
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
