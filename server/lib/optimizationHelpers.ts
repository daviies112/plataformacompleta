/**
 * Optimization Helpers
 * High-level helper functions to simplify usage of optimization modules
 * Designed for 1000+ clients performance optimization
 */

import { cache } from './cache';
import { 
  trackAccessAndGetTTL,
  setCompressedCache,
  getCompressedCache 
} from './cacheStrategies';
import { 
  FIELD_SETS,
  getPaginationParams,
  getCursorPage,
  createOptimizedQuery,
  type CursorPageResult
} from './queryOptimizer';
import { createBatcher, RequestBatcher } from './requestBatcher';
import { getUsageStats } from './limitMonitor';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Options for withCache helper
 */
export interface CacheOptions {
  ttl?: number;
  compress?: boolean;
  useProgressiveTTL?: boolean;
}

/**
 * Options for withOptimizedQuery helper
 */
export interface OptimizedQueryOptions {
  fieldSet?: 'minimal' | 'compact' | 'full';
  pageSize?: number;
  page?: number;
  useCursor?: boolean;
  cursor?: string | null;
  enableCache?: boolean;
  cacheTTL?: number;
}

/**
 * Result from withOptimizedQuery
 */
export interface OptimizedQueryResult<T = any> {
  data: T[];
  pagination: {
    page?: number;
    pageSize?: number;
    total?: number;
    cursor?: string | null;
    hasMore?: boolean;
  };
  cached: boolean;
}

/**
 * Helper 1: withCache
 * Wrapper para executar função com cache automático usando progressive TTL
 * 
 * @template T - Type of the returned data
 * @param {string} key - Cache key
 * @param {() => Promise<T>} fn - Function to execute if cache miss
 * @param {CacheOptions} [options] - Cache options
 * @param {number} [options.ttl] - Custom TTL in seconds (overrides progressive TTL)
 * @param {boolean} [options.compress=false] - Enable compression for data > 10KB
 * @param {boolean} [options.useProgressiveTTL=true] - Use progressive TTL based on access count
 * @returns {Promise<T>} Cached or fresh data
 * 
 * @example
 * ```typescript
 * const userData = await withCache(
 *   `user:${userId}:profile`,
 *   () => fetchUserProfile(userId),
 *   { compress: true, useProgressiveTTL: true }
 * );
 * ```
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const {
    ttl,
    compress = false,
    useProgressiveTTL = true
  } = options;

  try {
    // Check cache first (with compression support if enabled)
    if (compress) {
      const cached = await getCompressedCache<T>(key);
      if (cached !== null) {
        console.log(`✅ [withCache] Cache HIT (compressed): ${key}`);
        return cached;
      }
    } else {
      const cached = await cache.get<T>(key);
      if (cached !== null) {
        console.log(`✅ [withCache] Cache HIT: ${key}`);
        return cached;
      }
    }

    // Cache miss - execute function
    console.log(`⚠️ [withCache] Cache MISS: ${key}`);
    const data = await fn();

    // Determine TTL
    let finalTTL: number;
    if (ttl !== undefined) {
      finalTTL = ttl;
    } else if (useProgressiveTTL) {
      finalTTL = await trackAccessAndGetTTL(key);
    } else {
      finalTTL = 300; // Default 5 minutes
    }

    // Store in cache with compression if enabled
    if (compress) {
      await setCompressedCache(key, data, finalTTL);
      console.log(`💾 [withCache] Cached with compression: ${key} (TTL: ${finalTTL}s)`);
    } else {
      await cache.set(key, data, finalTTL);
      console.log(`💾 [withCache] Cached: ${key} (TTL: ${finalTTL}s)`);
    }

    return data;
  } catch (error) {
    console.error(`❌ [withCache] Error for key ${key}:`, error);
    throw error;
  }
}

/**
 * Helper 2: withOptimizedQuery
 * Wrapper para executar query otimizada com field sets, pagination e cache
 * 
 * @template T - Type of the query result
 * @param {SupabaseClient} supabase - Supabase client instance
 * @param {string} table - Table name
 * @param {OptimizedQueryOptions} [options] - Query options
 * @param {string} [options.fieldSet='full'] - Field set to use (minimal/compact/full)
 * @param {number} [options.pageSize=20] - Items per page
 * @param {number} [options.page=1] - Page number (for offset pagination)
 * @param {boolean} [options.useCursor=false] - Use cursor-based pagination
 * @param {string|null} [options.cursor] - Cursor for pagination
 * @param {boolean} [options.enableCache=false] - Enable query caching
 * @param {number} [options.cacheTTL=300] - Cache TTL in seconds
 * @returns {Promise<OptimizedQueryResult<T>>} Query result with pagination metadata
 * 
 * @example
 * ```typescript
 * // Offset pagination with caching
 * const result = await withOptimizedQuery(supabase, 'projects', {
 *   fieldSet: 'compact',
 *   page: 1,
 *   pageSize: 20,
 *   enableCache: true
 * });
 * 
 * // Cursor pagination
 * const result = await withOptimizedQuery(supabase, 'tasks', {
 *   fieldSet: 'minimal',
 *   useCursor: true,
 *   cursor: lastId,
 *   pageSize: 50
 * });
 * ```
 */
export async function withOptimizedQuery<T = any>(
  supabase: SupabaseClient,
  table: string,
  options: OptimizedQueryOptions = {}
): Promise<OptimizedQueryResult<T>> {
  const {
    fieldSet = 'full',
    pageSize = 20,
    page = 1,
    useCursor = false,
    cursor = null,
    enableCache = false,
    cacheTTL = 300
  } = options;

  console.log(`🔍 [withOptimizedQuery] Table: ${table}, FieldSet: ${fieldSet}, UseCursor: ${useCursor}`);

  try {
    let data: T[];
    let pagination: OptimizedQueryResult<T>['pagination'];
    let cached = false;

    // Get field selection
    const fields = FIELD_SETS[fieldSet as keyof typeof FIELD_SETS] || FIELD_SETS.full;

    if (useCursor) {
      // Cursor-based pagination
      const result = await getCursorPage<T>(supabase, table, cursor, pageSize);
      
      data = result.data;
      pagination = {
        cursor: result.nextCursor,
        hasMore: result.hasMore,
        pageSize
      };
      
      console.log(`✅ [withOptimizedQuery] Cursor pagination: ${data.length} items, hasMore: ${result.hasMore}`);
    } else {
      // Offset-based pagination with OptimizedQuery
      const query = createOptimizedQuery(supabase, table)
        .select(fields)
        .limit(pageSize);

      // Apply pagination
      const { from } = getPaginationParams(page, pageSize);
      
      // Enable caching if requested
      if (enableCache) {
        query.cached(cacheTTL);
        cached = true;
      }

      data = await query.execute<T>();
      
      pagination = {
        page,
        pageSize,
        total: data.length
      };
      
      console.log(`✅ [withOptimizedQuery] Offset pagination: page ${page}, ${data.length} items`);
    }

    return {
      data,
      pagination,
      cached
    };
  } catch (error) {
    console.error(`❌ [withOptimizedQuery] Error querying table ${table}:`, error);
    throw error;
  }
}

/**
 * Helper 3: batchApiRequests
 * Agrupa múltiplas requests em batch para reduzir número de chamadas
 * 
 * @template T - Type of request
 * @template R - Type of response
 * @param {T[]} requests - Array of requests to batch
 * @param {(requests: T[]) => Promise<R[]>} batchFn - Function to process batch
 * @param {number} [delay=50] - Delay in ms to accumulate requests
 * @returns {Promise<R[]>} Array of individual results
 * 
 * @example
 * ```typescript
 * // Batch fetch multiple projects
 * const projectIds = ['id1', 'id2', 'id3'];
 * const projects = await batchApiRequests(
 *   projectIds,
 *   async (ids) => {
 *     const { data } = await supabase
 *       .from('projects')
 *       .select('*')
 *       .in('id', ids);
 *     return data;
 *   },
 *   100 // 100ms delay
 * );
 * ```
 */
export async function batchApiRequests<T, R>(
  requests: T[],
  batchFn: (requests: T[]) => Promise<R[]>,
  delay: number = 50
): Promise<R[]> {
  console.log(`📦 [batchApiRequests] Batching ${requests.length} requests (delay: ${delay}ms)`);

  try {
    // Create batcher instance
    const batcher = createBatcher<T, R>(batchFn, delay);

    // Add all requests to batcher
    const promises = requests.map(request => batcher.add(request));

    // Wait for all results
    const results = await Promise.all(promises);

    console.log(`✅ [batchApiRequests] Successfully batched ${requests.length} requests`);

    return results;
  } catch (error) {
    console.error(`❌ [batchApiRequests] Batch processing failed:`, error);
    throw error;
  }
}

/**
 * Helper 4: getOptimizationStats
 * Retorna estatísticas consolidadas de todas as otimizações
 * 
 * @returns {object} Optimization statistics
 * @returns {object} stats.cache - Cache statistics (hit/miss rates, keys)
 * @returns {object} stats.limits - Limit monitoring (Redis/Supabase usage)
 * @returns {object} stats.summary - Overall optimization summary
 * 
 * @example
 * ```typescript
 * const stats = getOptimizationStats();
 * console.log('Cache Hit Rate:', stats.summary.cacheHitRate);
 * console.log('Redis Usage:', stats.limits.redis.percentage);
 * ```
 */
export function getOptimizationStats() {
  console.log('📊 [getOptimizationStats] Collecting optimization statistics...');

  try {
    // Get cache stats
    const cacheStats = cache.getStats();
    
    // Get limit monitor stats
    const limitStats = getUsageStats();

    // Calculate cache hit/miss rate
    const memoryCacheStats = cacheStats.memoryStats;
    const hits = memoryCacheStats.hits || 0;
    const misses = memoryCacheStats.misses || 0;
    const total = hits + misses;
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) : '0.00';

    const stats = {
      cache: {
        redisConnected: cacheStats.redisConnected,
        memoryKeys: cacheStats.memoryKeys,
        hits,
        misses,
        hitRate: `${hitRate}%`,
        redisCommands: cacheStats.redis.commandsToday
      },
      limits: {
        redis: {
          commandsToday: limitStats.redis.commandsToday,
          limit: limitStats.redis.limit,
          percentage: limitStats.redis.percentage.toFixed(2) + '%',
          status: limitStats.redis.percentage >= 95 ? 'critical' : 
                  limitStats.redis.percentage >= 80 ? 'warning' : 'ok'
        },
        supabase: {
          bandwidthUsed: (limitStats.supabase.bandwidthUsed / (1024 * 1024)).toFixed(2) + 'MB',
          limit: (limitStats.supabase.limit / (1024 * 1024)).toFixed(2) + 'MB',
          percentage: limitStats.supabase.percentage.toFixed(2) + '%',
          status: limitStats.supabase.percentage >= 95 ? 'critical' : 
                  limitStats.supabase.percentage >= 80 ? 'warning' : 'ok'
        },
        lastReset: limitStats.lastReset
      },
      summary: {
        cacheHitRate: hitRate + '%',
        totalCacheKeys: cacheStats.memoryKeys,
        redisStatus: cacheStats.redisConnected ? 'connected' : 'disconnected',
        overallStatus: 
          limitStats.redis.percentage >= 95 || limitStats.supabase.percentage >= 95 ? 'critical' :
          limitStats.redis.percentage >= 80 || limitStats.supabase.percentage >= 80 ? 'warning' : 'ok'
      },
      timestamp: new Date().toISOString()
    };

    console.log('✅ [getOptimizationStats] Statistics collected successfully');
    console.log(`   Cache Hit Rate: ${stats.cache.hitRate}`);
    console.log(`   Redis Usage: ${stats.limits.redis.percentage}`);
    console.log(`   Supabase Bandwidth: ${stats.limits.supabase.percentage}`);

    return stats;
  } catch (error) {
    console.error('❌ [getOptimizationStats] Error collecting stats:', error);
    throw error;
  }
}

/**
 * Global batcher instances for common use cases
 * Reuse these instead of creating new batchers for better performance
 */
export const batchers = {
  /**
   * Project fetching batcher
   * Usage: await batchers.projects.add(projectId)
   */
  projects: null as RequestBatcher<string, any> | null,
  
  /**
   * Task fetching batcher
   * Usage: await batchers.tasks.add(taskId)
   */
  tasks: null as RequestBatcher<string, any> | null,
};

/**
 * Initialize global batchers with Supabase client
 * Call this at app startup
 * 
 * @param {SupabaseClient} supabase - Supabase client instance
 * 
 * @example
 * ```typescript
 * initializeBatchers(supabase);
 * 
 * // Later in your code
 * const project = await batchers.projects.add(projectId);
 * ```
 */
export function initializeBatchers(supabase: SupabaseClient): void {
  console.log('🔧 [initializeBatchers] Initializing global batchers...');

  // Project batcher
  batchers.projects = createBatcher(async (projectIds: string[]) => {
    console.log(`📦 [ProjectBatcher] Fetching ${projectIds.length} projects in batch`);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .in('id', projectIds);
    
    if (error) throw error;
    
    // Return in same order as requested
    return projectIds.map(id => data?.find(p => p.id === id) || null);
  });

  // Task batcher
  batchers.tasks = createBatcher(async (taskIds: string[]) => {
    console.log(`📦 [TaskBatcher] Fetching ${taskIds.length} tasks in batch`);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .in('id', taskIds);
    
    if (error) throw error;
    
    // Return in same order as requested
    return taskIds.map(id => data?.find(t => t.id === id) || null);
  });

  console.log('✅ [initializeBatchers] Global batchers initialized');
}

// Export types for external use
export type { CursorPageResult } from './queryOptimizer';
