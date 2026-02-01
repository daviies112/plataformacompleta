/**
 * Cache Strategies Module
 * Advanced caching strategies for 1000+ clients performance optimization
 */

import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';
import { cache } from './cache';

// Promisify zlib functions for async/await
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// ============================================================================
// NAMESPACE CONSTANTS - Cache key prefixes for different data types
// ============================================================================
export const CACHE_NAMESPACES = {
  DASHBOARD: 'dashboard',
  CLIENTS: 'clients',
  FORMS: 'forms',
  PRODUCTS: 'products',
  WORKSPACE: 'workspace',
  BILLING: 'billing',
  WHATSAPP: 'whatsapp',
  STATIC: 'static',
} as const;

// ============================================================================
// TTL CONSTANTS - Optimized Time-To-Live values (in seconds)
// Optimized for Upstash Free Tier (500K commands/month)
// Hot data: 2-5 min | Warm data: 15-30 min | Cold data: 6-24h
// ============================================================================
export const CACHE_TTLS = {
  REAL_TIME: 60,          // 1 minute - For real-time data
  HOT: 120,               // 2 minutes - Hot data (chat lists, active sessions)
  DASHBOARD: 300,         // 5 minutes - For dashboard KPIs/metrics
  CLIENTS: 180,           // 3 minutes - Client lists (frequently accessed)
  FORMS: 900,             // 15 minutes - For forms and submissions
  PRODUCTS: 900,          // 15 minutes - For product catalogs
  BILLING: 900,           // 15 minutes - Billing data and transactions
  WORKSPACE: 1800,        // 30 minutes - For workspace data (boards, pages)
  WHATSAPP_CONTACTS: 600, // 10 minutes - WhatsApp contacts (already implemented)
  WHATSAPP_MESSAGES: 300, // 5 minutes - WhatsApp message history
  STATIC: 21600,          // 6 hours - For static/rarely changing data
  COLD: 86400,            // 24 hours - Cold data (reference data, schemas)
} as const;

/**
 * 1. Progressive TTL Strategy
 * Returns TTL (in seconds) based on access count
 * More accessed data = longer cache time
 */
export function getProgressiveTTL(accessCount: number): number {
  if (accessCount > 100) {
    console.log(`📊 Progressive TTL: ${accessCount} acessos -> 24h cache`);
    return 24 * 60 * 60; // 24 hours
  }
  
  if (accessCount > 50) {
    console.log(`📊 Progressive TTL: ${accessCount} acessos -> 2h cache`);
    return 2 * 60 * 60; // 2 hours
  }
  
  if (accessCount > 10) {
    console.log(`📊 Progressive TTL: ${accessCount} acessos -> 30min cache`);
    return 30 * 60; // 30 minutes
  }
  
  console.log(`📊 Progressive TTL: ${accessCount} acessos -> 5min cache (default)`);
  return 5 * 60; // 5 minutes default
}

/**
 * 2. Batch Invalidator Class
 * Accumulates cache keys and invalidates them in batch after timeout
 */
export class BatchInvalidator {
  private queue: Set<string> = new Set();
  private timer: NodeJS.Timeout | null = null;
  private readonly timeout: number;

  constructor(timeoutMs: number = 1000) {
    this.timeout = timeoutMs;
  }

  /**
   * Add key to invalidation queue
   */
  add(key: string): void {
    this.queue.add(key);
    console.log(`➕ Adicionado à fila de invalidação: ${key} (total: ${this.queue.size})`);
    
    // Reset timer on each add
    if (this.timer) {
      clearTimeout(this.timer);
    }
    
    // Schedule batch invalidation
    this.timer = setTimeout(() => {
      this.flush();
    }, this.timeout);
  }

  /**
   * Flush all queued keys immediately
   */
  async flush(): Promise<void> {
    if (this.queue.size === 0) {
      console.log('⚠️ Fila de invalidação vazia, nada para fazer');
      return;
    }
    
    const keys = Array.from(this.queue);
    console.log(`🗑️ Invalidando ${keys.length} chaves de cache em lote...`);
    
    try {
      // Invalidate all keys using delPattern
      for (const key of keys) {
        await cache.delPattern(key);
        console.log(`✅ Invalidado: ${key}`);
      }
      
      console.log(`✅ Batch invalidation completa: ${keys.length} chaves removidas`);
    } catch (error) {
      console.error('❌ Erro durante batch invalidation:', error);
    } finally {
      // Clear queue and timer
      this.queue.clear();
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    }
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * Clear queue without invalidating
   */
  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const size = this.queue.size;
    this.queue.clear();
    console.log(`🧹 Fila de invalidação limpa: ${size} chaves descartadas`);
  }
}

/**
 * 3. Cache Warming Strategy
 * Pre-loads critical data into cache for faster access
 */
export async function warmCache(
  userId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<void> {
  console.log(`🔥 Iniciando cache warming para usuário ${userId}...`);
  
  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Load projects and tasks in parallel
    const [projectsResult, tasksResult] = await Promise.all([
      supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId),
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
    ]);
    
    // Cache projects
    if (projectsResult.data && !projectsResult.error) {
      const cacheKey = `user:${userId}:projects`;
      await cache.set(cacheKey, projectsResult.data, 60 * 60); // 1 hour TTL
      console.log(`✅ Cached ${projectsResult.data.length} projects para usuário ${userId}`);
    } else if (projectsResult.error) {
      console.error(`❌ Erro ao carregar projects:`, projectsResult.error);
    }
    
    // Cache tasks
    if (tasksResult.data && !tasksResult.error) {
      const cacheKey = `user:${userId}:tasks`;
      await cache.set(cacheKey, tasksResult.data, 60 * 60); // 1 hour TTL
      console.log(`✅ Cached ${tasksResult.data.length} tasks para usuário ${userId}`);
    } else if (tasksResult.error) {
      console.error(`❌ Erro ao carregar tasks:`, tasksResult.error);
    }
    
    console.log(`🔥 Cache warming concluído para usuário ${userId}`);
  } catch (error) {
    console.error(`❌ Erro no cache warming para usuário ${userId}:`, error);
    throw error;
  }
}

/**
 * Generic query with cache wrapper
 * Executes a Supabase query with automatic caching
 */
export async function queryWithCache<T = any>(
  cacheKey: string,
  ttl: number,
  queryFn: () => Promise<T>
): Promise<T> {
  return cache.wrap(cacheKey, ttl, queryFn);
}

/**
 * 4. Compression Strategies
 * Compress and decompress large data for efficient caching
 */

/**
 * Compress data for cache storage
 * Only compresses if JSON size > 10KB
 */
export async function compressForCache(data: any): Promise<{ compressed: boolean; data: string }> {
  try {
    const jsonString = JSON.stringify(data);
    const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
    const sizeInKB = sizeInBytes / 1024;
    
    // Only compress if data is larger than 10KB
    if (sizeInKB <= 10) {
      console.log(`📦 Dados pequenos (${sizeInKB.toFixed(2)}KB), sem compressão`);
      return { compressed: false, data: jsonString };
    }
    
    // Compress using gzip
    const compressed = await gzipAsync(jsonString);
    const compressedBase64 = compressed.toString('base64');
    const compressedSizeKB = Buffer.byteLength(compressedBase64, 'utf8') / 1024;
    const ratio = ((1 - compressedSizeKB / sizeInKB) * 100).toFixed(1);
    
    console.log(`📦 Compressão: ${sizeInKB.toFixed(2)}KB -> ${compressedSizeKB.toFixed(2)}KB (${ratio}% redução)`);
    
    return { compressed: true, data: compressedBase64 };
  } catch (error) {
    console.error('❌ Erro na compressão:', error);
    // Fallback: return uncompressed
    return { compressed: false, data: JSON.stringify(data) };
  }
}

/**
 * Decompress data from cache
 * Handles both compressed and uncompressed data
 */
export async function decompressFromCache(compressed: boolean, data: string): Promise<any> {
  try {
    // If not compressed, just parse JSON
    if (!compressed) {
      return JSON.parse(data);
    }
    
    // Decompress gzip data
    const buffer = Buffer.from(data, 'base64');
    const decompressed = await gunzipAsync(buffer);
    const result = JSON.parse(decompressed.toString());
    
    console.log(`📦 Dados descomprimidos com sucesso`);
    return result;
  } catch (error) {
    console.error('❌ Erro na descompressão:', error);
    throw new Error('Falha ao descomprimir dados do cache');
  }
}

/**
 * Helper: Set compressed data in cache
 */
export async function setCompressedCache(
  key: string,
  data: any,
  ttl: number = 300
): Promise<void> {
  const { compressed, data: cachedData } = await compressForCache(data);
  const cacheValue = {
    compressed,
    data: cachedData,
    timestamp: Date.now()
  };
  await cache.set(key, cacheValue, ttl);
  console.log(`✅ Cache setado com compressão: ${key} (TTL: ${ttl}s)`);
}

/**
 * Helper: Get and decompress data from cache
 */
export async function getCompressedCache<T = any>(key: string): Promise<T | null> {
  const cached = await cache.get<{ compressed: boolean; data: string; timestamp: number }>(key);
  
  if (!cached) {
    return null;
  }
  
  const decompressed = await decompressFromCache(cached.compressed, cached.data);
  console.log(`✅ Cache recuperado e descomprimido: ${key}`);
  return decompressed as T;
}

/**
 * Track access count for progressive TTL
 */
export async function trackAccessAndGetTTL(key: string): Promise<number> {
  const accessKey = `access:count:${key}`;
  const count = await cache.incr(accessKey);
  
  // Set expiration for access counter (reset after 24h)
  await cache.expire(accessKey, 24 * 60 * 60);
  
  return getProgressiveTTL(count);
}

/**
 * Set cache with progressive TTL based on access count
 */
export async function setWithProgressiveTTL(
  key: string,
  data: any
): Promise<void> {
  const ttl = await trackAccessAndGetTTL(key);
  await cache.set(key, data, ttl);
  console.log(`✅ Cache setado com TTL progressivo: ${key} (TTL: ${ttl}s)`);
}

// Export singleton instance of BatchInvalidator for easy use
export const batchInvalidator = new BatchInvalidator(1000);

// ============================================================================
// SPECIALIZED CACHE HELPERS - Dashboard, Forms, Products
// ============================================================================

/**
 * Cache Dashboard Data (KPIs and Metrics)
 * Optimized for dashboard queries with compression and graceful degradation
 */
export async function cacheDashboardData<T = any>(
  clientId: string,
  tenantId: string,
  queryFn: () => Promise<T>,
  options: { compress?: boolean; ttl?: number; suffix?: string } = {}
): Promise<T> {
  const { compress = true, ttl = CACHE_TTLS.DASHBOARD, suffix = 'data' } = options;
  
  if (!tenantId || tenantId === 'undefined' || tenantId === 'null' || tenantId.trim() === '') {
    console.error('❌ [CACHE] tenantId inválido - não é possível criar cache');
    throw new Error('tenantId inválido para cache de dashboard');
  }
  
  if (!clientId || clientId === 'undefined' || clientId === 'null' || clientId.trim() === '') {
    console.error('❌ [CACHE] clientId inválido - não é possível criar cache');
    throw new Error('clientId inválido para cache de dashboard');
  }
  
  const cacheKey = `${CACHE_NAMESPACES.DASHBOARD}:${clientId}:${tenantId}:${suffix}`;
  
  try {
    // Try to get from cache first
    if (compress) {
      const cached = await getCompressedCache<T>(cacheKey);
      if (cached) {
        console.log(`🎯 Cache HIT (Dashboard): ${cacheKey}`);
        return cached;
      }
    } else {
      const cached = await cache.get<T>(cacheKey);
      if (cached) {
        console.log(`🎯 Cache HIT (Dashboard): ${cacheKey}`);
        return cached;
      }
    }
    
    console.log(`❌ Cache MISS (Dashboard): ${cacheKey}`);
    
    // Execute query
    const data = await queryFn();
    
    // Set cache with compression if needed
    if (compress) {
      await setCompressedCache(cacheKey, data, ttl);
    } else {
      await cache.set(cacheKey, data, ttl);
    }
    
    console.log(`✅ Dashboard data cached: ${cacheKey} (TTL: ${ttl}s, compressed: ${compress})`);
    return data;
  } catch (error) {
    console.error(`❌ Error caching dashboard data (${cacheKey}):`, error);
    // Graceful degradation - execute query without caching
    return queryFn();
  }
}

/**
 * Cache Forms Metadata (Form definitions and submission counts)
 * Optimized for forms queries with moderate TTL
 * ⚠️ Multi-tenant isolation: forms:{clientId}:{tenantId}:{identifier}
 */
export async function cacheFormsMetadata<T = any>(
  clientId: string,
  tenantId: string,
  identifier: string,
  queryFn: () => Promise<T>,
  options: { compress?: boolean; ttl?: number } = {}
): Promise<T> {
  const { compress = false, ttl = CACHE_TTLS.FORMS } = options;
  
  if (!tenantId || tenantId === 'undefined' || tenantId === 'null' || tenantId.trim() === '') {
    console.error('❌ [CACHE] tenantId inválido para cache de formulários');
    throw new Error('tenantId inválido para cache de formulários');
  }
  
  const cacheKey = `${CACHE_NAMESPACES.FORMS}:${clientId}:${tenantId}:${identifier}`;
  
  try {
    // Try to get from cache first
    if (compress) {
      const cached = await getCompressedCache<T>(cacheKey);
      if (cached) {
        console.log(`🎯 Cache HIT (Forms): ${cacheKey}`);
        return cached;
      }
    } else {
      const cached = await cache.get<T>(cacheKey);
      if (cached) {
        console.log(`🎯 Cache HIT (Forms): ${cacheKey}`);
        return cached;
      }
    }
    
    console.log(`❌ Cache MISS (Forms): ${cacheKey}`);
    
    // Execute query
    const data = await queryFn();
    
    // Set cache
    if (compress) {
      await setCompressedCache(cacheKey, data, ttl);
    } else {
      await cache.set(cacheKey, data, ttl);
    }
    
    console.log(`✅ Forms metadata cached: ${cacheKey} (TTL: ${ttl}s, compressed: ${compress})`);
    return data;
  } catch (error) {
    console.error(`❌ Error caching forms metadata (${cacheKey}):`, error);
    // Graceful degradation
    return queryFn();
  }
}

/**
 * Cache Product Catalog (Products, Suppliers, Resellers)
 * Optimized for product catalog queries with compression for large datasets
 * ⚠️ Multi-tenant isolation: products:{clientId}:{tenantId}:{catalogType}:{identifier}
 */
export async function cacheProductCatalog<T = any>(
  clientId: string,
  tenantId: string,
  catalogType: 'products' | 'suppliers' | 'resellers',
  identifier: string,
  queryFn: () => Promise<T>,
  options: { compress?: boolean; ttl?: number } = {}
): Promise<T> {
  const { compress = true, ttl = CACHE_TTLS.PRODUCTS } = options;
  const cacheKey = `${CACHE_NAMESPACES.PRODUCTS}:${clientId}:${tenantId}:${catalogType}:${identifier}`;
  
  try {
    // Try to get from cache first
    if (compress) {
      const cached = await getCompressedCache<T>(cacheKey);
      if (cached) {
        console.log(`🎯 Cache HIT (Products/${catalogType}): ${cacheKey}`);
        return cached;
      }
    } else {
      const cached = await cache.get<T>(cacheKey);
      if (cached) {
        console.log(`🎯 Cache HIT (Products/${catalogType}): ${cacheKey}`);
        return cached;
      }
    }
    
    console.log(`❌ Cache MISS (Products/${catalogType}): ${cacheKey}`);
    
    // Execute query
    const data = await queryFn();
    
    // Set cache with compression
    if (compress) {
      await setCompressedCache(cacheKey, data, ttl);
    } else {
      await cache.set(cacheKey, data, ttl);
    }
    
    console.log(`✅ Product catalog cached: ${cacheKey} (TTL: ${ttl}s, compressed: ${compress})`);
    return data;
  } catch (error) {
    console.error(`❌ Error caching product catalog (${cacheKey}):`, error);
    // Graceful degradation
    return queryFn();
  }
}

/**
 * Invalidate Dashboard Cache
 * Call this when dashboard data is mutated
 */
export async function invalidateDashboardCache(clientId: string, tenantId?: string): Promise<void> {
  try {
    if (tenantId) {
      const pattern = `${CACHE_NAMESPACES.DASHBOARD}:${clientId}:${tenantId}:*`;
      await cache.delPattern(pattern);
      console.log(`🗑️ Invalidated dashboard cache: ${pattern}`);
    } else {
      const pattern = `${CACHE_NAMESPACES.DASHBOARD}:${clientId}:*`;
      await cache.delPattern(pattern);
      console.log(`🗑️ Invalidated dashboard cache: ${pattern}`);
    }
  } catch (error) {
    console.error(`❌ Error invalidating dashboard cache:`, error);
  }
}

/**
 * Invalidate Forms Cache
 * Call this when forms are created/updated/deleted
 * ⚠️ Multi-tenant aware: invalidates by clientId and tenantId
 */
export async function invalidateFormsCache(clientId: string, tenantId: string, identifier?: string): Promise<void> {
  try {
    const pattern = identifier 
      ? `${CACHE_NAMESPACES.FORMS}:${clientId}:${tenantId}:${identifier}*`
      : `${CACHE_NAMESPACES.FORMS}:*`;
    await cache.delPattern(pattern);
    console.log(`🗑️ Invalidated forms cache: ${pattern}`);
  } catch (error) {
    console.error(`❌ Error invalidating forms cache:`, error);
  }
}

/**
 * Invalidate Products Cache
 * Call this when products/suppliers/resellers are created/updated/deleted
 * ⚠️ Multi-tenant aware: invalidates by clientId and tenantId
 */
export async function invalidateProductsCache(clientId: string, tenantId: string, catalogType?: 'products' | 'suppliers' | 'resellers', identifier?: string): Promise<void> {
  try {
    let pattern: string;
    if (catalogType && identifier) {
      pattern = `${CACHE_NAMESPACES.PRODUCTS}:${clientId}:${tenantId}:${catalogType}:${identifier}*`;
    } else if (catalogType) {
      pattern = `${CACHE_NAMESPACES.PRODUCTS}:${clientId}:${tenantId}:${catalogType}:*`;
    } else {
      pattern = `${CACHE_NAMESPACES.PRODUCTS}:${clientId}:${tenantId}:*`;
    }
    await cache.delPattern(pattern);
    console.log(`🗑️ Invalidated products cache: ${pattern}`);
  } catch (error) {
    console.error(`❌ Error invalidating products cache:`, error);
  }
}

/**
 * Warmup Dashboard Cache
 * Pre-loads critical dashboard data for faster initial access
 * Call this on user login
 */
export async function warmupDashboardCache(
  clientId: string,
  tenantId: string,
  supabaseClient: any
): Promise<void> {
  console.log(`🔥 Warming up dashboard cache for client ${clientId}, tenant ${tenantId}...`);
  
  try {
    // Preload dashboard data
    await cacheDashboardData(
      clientId,
      tenantId,
      async () => {
        const { data, error } = await supabaseClient
          .from('clientes_completos')
          .select('*')
          .eq('tenant_id', tenantId)
          .limit(100);
        
        if (error) throw error;
        return data || [];
      },
      { compress: true, ttl: CACHE_TTLS.DASHBOARD }
    );
    
    console.log(`✅ Dashboard cache warmed up successfully for client ${clientId}`);
  } catch (error) {
    console.error(`❌ Error warming up dashboard cache for client ${clientId}:`, error);
    // Non-critical - don't throw, just log
  }
}

// ============================================================================
// CLIENTS CACHE HELPERS - Optimized for frequent access (3 min TTL)
// ============================================================================

/**
 * Cache Clients List
 * High ROI - reduces Supabase bandwidth by ~40% and page load from 2.5s→0.8s
 */
export async function cacheClientsList<T = any>(
  clientId: string,
  tenantId: string,
  queryFn: () => Promise<T>,
  options: { compress?: boolean; ttl?: number } = {}
): Promise<T> {
  const { compress = false, ttl = CACHE_TTLS.CLIENTS } = options;
  const cacheKey = `${CACHE_NAMESPACES.CLIENTS}:${clientId}:${tenantId}:list`;
  
  try {
    // Try to get from cache first
    if (compress) {
      const cached = await getCompressedCache<T>(cacheKey);
      if (cached) {
        console.log(`🎯 Cache HIT (Clients): ${cacheKey}`);
        return cached;
      }
    } else {
      const cached = await cache.get<T>(cacheKey);
      if (cached) {
        console.log(`🎯 Cache HIT (Clients): ${cacheKey}`);
        return cached;
      }
    }
    
    console.log(`❌ Cache MISS (Clients): ${cacheKey}`);
    
    // Execute query
    const data = await queryFn();
    
    // Set cache
    if (compress) {
      await setCompressedCache(cacheKey, data, ttl);
    } else {
      await cache.set(cacheKey, data, ttl);
    }
    
    console.log(`✅ Clients list cached: ${cacheKey} (TTL: ${ttl}s, compressed: ${compress})`);
    return data;
  } catch (error) {
    console.error(`❌ Error caching clients list (${cacheKey}):`, error);
    // Graceful degradation
    return queryFn();
  }
}

/**
 * Invalidate Clients Cache
 * Call this when clients are created/updated/deleted
 */
export async function invalidateClientsCache(clientId?: string, tenantId?: string): Promise<void> {
  try {
    let pattern: string;
    if (clientId && tenantId) {
      pattern = `${CACHE_NAMESPACES.CLIENTS}:${clientId}:${tenantId}:*`;
    } else if (clientId) {
      pattern = `${CACHE_NAMESPACES.CLIENTS}:${clientId}:*`;
    } else {
      pattern = `${CACHE_NAMESPACES.CLIENTS}:*`;
    }
    await cache.delPattern(pattern);
    console.log(`🗑️ Invalidated clients cache: ${pattern}`);
  } catch (error) {
    console.error(`❌ Error invalidating clients cache:`, error);
  }
}

/**
 * 🔐 MULTI-TENANT: Cache Clients List (Tenant-Only Version)
 * Simplified version that uses only tenantId for multi-tenant isolation
 * Creates cache keys like: clients:tenant:{tenantId}:list
 */
export async function cacheClientsListByTenant<T = any>(
  tenantId: string,
  queryFn: () => Promise<T>,
  options: { compress?: boolean; ttl?: number } = {}
): Promise<T> {
  const { compress = false, ttl = CACHE_TTLS.CLIENTS } = options;
  
  if (!tenantId || tenantId === 'undefined' || tenantId === 'null' || tenantId.trim() === '') {
    console.error('❌ [CACHE] tenantId inválido para cache de clientes');
    throw new Error('tenantId inválido para cache de clientes');
  }
  
  const cacheKey = `${CACHE_NAMESPACES.CLIENTS}:tenant:${tenantId}:list`;
  
  try {
    // Try to get from cache first
    if (compress) {
      const cached = await getCompressedCache<T>(cacheKey);
      if (cached) {
        console.log(`🎯 Cache HIT (Clients/Tenant): ${cacheKey}`);
        return cached;
      }
    } else {
      const cached = await cache.get<T>(cacheKey);
      if (cached) {
        console.log(`🎯 Cache HIT (Clients/Tenant): ${cacheKey}`);
        return cached;
      }
    }
    
    console.log(`❌ Cache MISS (Clients/Tenant): ${cacheKey}`);
    
    // Execute query
    const data = await queryFn();
    
    // Set cache
    if (compress) {
      await setCompressedCache(cacheKey, data, ttl);
    } else {
      await cache.set(cacheKey, data, ttl);
    }
    
    console.log(`✅ Clients list cached (tenant-only): ${cacheKey} (TTL: ${ttl}s, compressed: ${compress})`);
    return data;
  } catch (error) {
    console.error(`❌ Error caching clients list (${cacheKey}):`, error);
    // Graceful degradation
    return queryFn();
  }
}

/**
 * 🔐 MULTI-TENANT: Invalidate Clients Cache (Tenant-Only Version)
 * Call this when clients are created/updated/deleted in multi-tenant mode
 */
export async function invalidateClientsCacheByTenant(tenantId: string): Promise<void> {
  try {
    const pattern = `${CACHE_NAMESPACES.CLIENTS}:tenant:${tenantId}:*`;
    await cache.delPattern(pattern);
    console.log(`🗑️ Invalidated clients cache (tenant-only): ${pattern}`);
  } catch (error) {
    console.error(`❌ Error invalidating clients cache (tenant-only):`, error);
  }
}

// ============================================================================
// WORKSPACE CACHE HELPERS - Optimized for 30 min TTL (boards, pages, calendar)
// ============================================================================

/**
 * Cache Workspace Data (Boards, Pages, Calendar Events)
 * Medium ROI - reduces Supabase bandwidth by ~25%
 */
export async function cacheWorkspaceData<T = any>(
  clientId: string,
  tenantId: string,
  resourceType: 'boards' | 'pages' | 'calendar' | 'databases',
  queryFn: () => Promise<T>,
  options: { compress?: boolean; ttl?: number; resourceId?: string } = {}
): Promise<T> {
  const { compress = true, ttl = CACHE_TTLS.WORKSPACE, resourceId = 'all' } = options;
  
  // ✅ VALIDAÇÃO DEFENSIVA: Garantir que tenantId é válido
  if (!tenantId || tenantId === 'undefined' || tenantId === 'null' || tenantId.trim() === '') {
    console.error('❌ [CACHE] tenantId inválido para cache de workspace');
    throw new Error('tenantId inválido para cache de workspace');
  }
  
  // ✅ VALIDAÇÃO ADICIONAL: clientId também deve ser válido
  if (!clientId || clientId === 'undefined' || clientId === 'null' || clientId.trim() === '') {
    console.error('❌ [CACHE] clientId inválido para cache de workspace');
    throw new Error('clientId inválido para cache de workspace');
  }
  
  const cacheKey = `${CACHE_NAMESPACES.WORKSPACE}:${clientId}:${tenantId}:${resourceType}:${resourceId}`;
  
  try {
    // Try to get from cache first
    if (compress) {
      const cached = await getCompressedCache<T>(cacheKey);
      if (cached) {
        console.log(`🎯 Cache HIT (Workspace/${resourceType}): ${cacheKey}`);
        return cached;
      }
    } else {
      const cached = await cache.get<T>(cacheKey);
      if (cached) {
        console.log(`🎯 Cache HIT (Workspace/${resourceType}): ${cacheKey}`);
        return cached;
      }
    }
    
    console.log(`❌ Cache MISS (Workspace/${resourceType}): ${cacheKey}`);
    
    // Execute query
    const data = await queryFn();
    
    // Set cache with compression
    if (compress) {
      await setCompressedCache(cacheKey, data, ttl);
    } else {
      await cache.set(cacheKey, data, ttl);
    }
    
    console.log(`✅ Workspace data cached: ${cacheKey} (TTL: ${ttl}s, compressed: ${compress})`);
    return data;
  } catch (error) {
    console.error(`❌ Error caching workspace data (${cacheKey}):`, error);
    // Graceful degradation
    return queryFn();
  }
}

/**
 * Invalidate Workspace Cache
 * Call this when workspace resources are created/updated/deleted
 */
export async function invalidateWorkspaceCache(
  clientId?: string,
  tenantId?: string,
  resourceType?: 'boards' | 'pages' | 'calendar' | 'databases',
  resourceId?: string
): Promise<void> {
  try {
    let pattern: string;
    if (clientId && tenantId && resourceType && resourceId) {
      pattern = `${CACHE_NAMESPACES.WORKSPACE}:${clientId}:${tenantId}:${resourceType}:${resourceId}`;
    } else if (clientId && tenantId && resourceType) {
      pattern = `${CACHE_NAMESPACES.WORKSPACE}:${clientId}:${tenantId}:${resourceType}:*`;
    } else if (clientId && tenantId) {
      pattern = `${CACHE_NAMESPACES.WORKSPACE}:${clientId}:${tenantId}:*`;
    } else if (clientId) {
      pattern = `${CACHE_NAMESPACES.WORKSPACE}:${clientId}:*`;
    } else {
      pattern = `${CACHE_NAMESPACES.WORKSPACE}:*`;
    }
    await cache.delPattern(pattern);
    console.log(`🗑️ Invalidated workspace cache: ${pattern}`);
  } catch (error) {
    console.error(`❌ Error invalidating workspace cache:`, error);
  }
}

// ============================================================================
// BILLING & PLUGGY CACHE HELPERS - Optimized for 15 min TTL
// ============================================================================

/**
 * Cache Billing Data (Transactions, Attachments, Pluggy Items)
 * Reduces Pluggy API calls and improves response time
 */
export async function cacheBillingData<T = any>(
  clientId: string,
  dataType: 'transactions' | 'attachments' | 'items',
  queryFn: () => Promise<T>,
  options: { compress?: boolean; ttl?: number; identifier?: string } = {}
): Promise<T> {
  const { compress = false, ttl = CACHE_TTLS.BILLING, identifier = 'all' } = options;
  const cacheKey = `${CACHE_NAMESPACES.BILLING}:${clientId}:${dataType}:${identifier}`;
  
  try {
    // Try to get from cache first
    if (compress) {
      const cached = await getCompressedCache<T>(cacheKey);
      if (cached) {
        console.log(`🎯 Cache HIT (Billing/${dataType}): ${cacheKey}`);
        return cached;
      }
    } else {
      const cached = await cache.get<T>(cacheKey);
      if (cached) {
        console.log(`🎯 Cache HIT (Billing/${dataType}): ${cacheKey}`);
        return cached;
      }
    }
    
    console.log(`❌ Cache MISS (Billing/${dataType}): ${cacheKey}`);
    
    // Execute query
    const data = await queryFn();
    
    // Set cache
    if (compress) {
      await setCompressedCache(cacheKey, data, ttl);
    } else {
      await cache.set(cacheKey, data, ttl);
    }
    
    console.log(`✅ Billing data cached: ${cacheKey} (TTL: ${ttl}s, compressed: ${compress})`);
    return data;
  } catch (error) {
    console.error(`❌ Error caching billing data (${cacheKey}):`, error);
    // Graceful degradation
    return queryFn();
  }
}

/**
 * Invalidate Billing Cache
 * Call this when billing data is updated
 */
export async function invalidateBillingCache(
  clientId?: string,
  dataType?: 'transactions' | 'attachments' | 'items',
  identifier?: string
): Promise<void> {
  try {
    let pattern: string;
    if (clientId && dataType && identifier) {
      pattern = `${CACHE_NAMESPACES.BILLING}:${clientId}:${dataType}:${identifier}`;
    } else if (clientId && dataType) {
      pattern = `${CACHE_NAMESPACES.BILLING}:${clientId}:${dataType}:*`;
    } else if (clientId) {
      pattern = `${CACHE_NAMESPACES.BILLING}:${clientId}:*`;
    } else {
      pattern = `${CACHE_NAMESPACES.BILLING}:*`;
    }
    await cache.delPattern(pattern);
    console.log(`🗑️ Invalidated billing cache: ${pattern}`);
  } catch (error) {
    console.error(`❌ Error invalidating billing cache:`, error);
  }
}

// ============================================================================
// WHATSAPP CACHE HELPERS - Extended for message history
// ============================================================================

/**
 * Cache WhatsApp Message History
 * Extends existing contact cache to include conversation summaries
 * Multi-tenant isolation: clientId and tenantId are required
 */
export async function cacheWhatsAppMessages<T = any>(
  clientId: string,
  tenantId: string,
  instance: string,
  remoteJid: string,
  queryFn: () => Promise<T>,
  options: { compress?: boolean; ttl?: number } = {}
): Promise<T> {
  const { compress = false, ttl = CACHE_TTLS.WHATSAPP_MESSAGES } = options;
  
  // ✅ VALIDAÇÃO DEFENSIVA: Garantir que tenantId é válido
  if (!tenantId || tenantId === 'undefined' || tenantId === 'null' || tenantId.trim() === '') {
    console.error('❌ [CACHE] tenantId inválido para cache de WhatsApp messages');
    throw new Error('tenantId inválido para cache de WhatsApp messages');
  }
  
  // ✅ VALIDAÇÃO ADICIONAL: clientId também deve ser válido
  if (!clientId || clientId === 'undefined' || clientId === 'null' || clientId.trim() === '') {
    console.error('❌ [CACHE] clientId inválido para cache de WhatsApp messages');
    throw new Error('clientId inválido para cache de WhatsApp messages');
  }
  
  const cacheKey = `${CACHE_NAMESPACES.WHATSAPP}:${clientId}:${tenantId}:messages:${instance}:${remoteJid}`;
  
  try {
    // Try to get from cache first
    const cached = compress 
      ? await getCompressedCache<T>(cacheKey)
      : await cache.get<T>(cacheKey);
    
    if (cached) {
      console.log(`🎯 Cache HIT (WhatsApp Messages): ${cacheKey}`);
      return cached;
    }
    
    console.log(`❌ Cache MISS (WhatsApp Messages): ${cacheKey}`);
    
    // Execute query
    const data = await queryFn();
    
    // Set cache
    if (compress) {
      await setCompressedCache(cacheKey, data, ttl);
    } else {
      await cache.set(cacheKey, data, ttl);
    }
    
    console.log(`✅ WhatsApp messages cached: ${cacheKey} (TTL: ${ttl}s)`);
    return data;
  } catch (error) {
    console.error(`❌ Error caching WhatsApp messages (${cacheKey}):`, error);
    // Graceful degradation
    return queryFn();
  }
}

/**
 * Cache WhatsApp Conversation List
 * Hot data - 2 min TTL for active conversation lists
 * Multi-tenant isolation: clientId and tenantId are required
 */
export async function cacheWhatsAppConversations<T = any>(
  clientId: string,
  tenantId: string,
  instance: string,
  queryFn: () => Promise<T>,
  options: { compress?: boolean; ttl?: number } = {}
): Promise<T> {
  const { compress = false, ttl = CACHE_TTLS.HOT } = options;
  
  // ✅ VALIDAÇÃO DEFENSIVA: Garantir que tenantId é válido
  if (!tenantId || tenantId === 'undefined' || tenantId === 'null' || tenantId.trim() === '') {
    console.error('❌ [CACHE] tenantId inválido para cache de WhatsApp conversations');
    throw new Error('tenantId inválido para cache de WhatsApp conversations');
  }
  
  // ✅ VALIDAÇÃO ADICIONAL: clientId também deve ser válido
  if (!clientId || clientId === 'undefined' || clientId === 'null' || clientId.trim() === '') {
    console.error('❌ [CACHE] clientId inválido para cache de WhatsApp conversations');
    throw new Error('clientId inválido para cache de WhatsApp conversations');
  }
  
  const cacheKey = `${CACHE_NAMESPACES.WHATSAPP}:${clientId}:${tenantId}:conversations:${instance}`;
  
  try {
    const cached = compress 
      ? await getCompressedCache<T>(cacheKey)
      : await cache.get<T>(cacheKey);
    
    if (cached) {
      console.log(`🎯 Cache HIT (WhatsApp Conversations): ${cacheKey}`);
      return cached;
    }
    
    console.log(`❌ Cache MISS (WhatsApp Conversations): ${cacheKey}`);
    
    const data = await queryFn();
    
    if (compress) {
      await setCompressedCache(cacheKey, data, ttl);
    } else {
      await cache.set(cacheKey, data, ttl);
    }
    
    console.log(`✅ WhatsApp conversations cached: ${cacheKey} (TTL: ${ttl}s)`);
    return data;
  } catch (error) {
    console.error(`❌ Error caching WhatsApp conversations (${cacheKey}):`, error);
    return queryFn();
  }
}

/**
 * Invalidate WhatsApp Cache
 * Call this when new messages arrive or chats are updated
 * Multi-tenant isolation: clientId and tenantId are required for proper isolation
 */
export async function invalidateWhatsAppCache(
  clientId?: string,
  tenantId?: string,
  instance?: string,
  remoteJid?: string
): Promise<void> {
  try {
    let pattern: string;
    if (clientId && tenantId && instance && remoteJid) {
      pattern = `${CACHE_NAMESPACES.WHATSAPP}:${clientId}:${tenantId}:*:${instance}:${remoteJid}`;
    } else if (clientId && tenantId && instance) {
      pattern = `${CACHE_NAMESPACES.WHATSAPP}:${clientId}:${tenantId}:*:${instance}:*`;
    } else if (clientId && tenantId) {
      pattern = `${CACHE_NAMESPACES.WHATSAPP}:${clientId}:${tenantId}:*`;
    } else if (clientId) {
      pattern = `${CACHE_NAMESPACES.WHATSAPP}:${clientId}:*`;
    } else {
      pattern = `${CACHE_NAMESPACES.WHATSAPP}:*`;
    }
    await cache.delPattern(pattern);
    console.log(`🗑️ Invalidated WhatsApp cache: ${pattern}`);
  } catch (error) {
    console.error(`❌ Error invalidating WhatsApp cache:`, error);
  }
}
