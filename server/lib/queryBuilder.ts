/**
 * Query Builder with Redis caching for optimized database queries
 * Reduces database load for 1000+ clients
 */

import { cache } from './cache';

export interface QueryOptions {
  cacheKey?: string;
  cacheTTL?: number;
  skipCache?: boolean;
}

export interface PaginationOptions {
  page?: number;
  perPage?: number;
}

/**
 * Generic query wrapper with caching
 */
export async function cachedQuery<T>(
  queryFn: () => Promise<T>,
  options: QueryOptions = {}
): Promise<T> {
  const {
    cacheKey,
    cacheTTL = 300, // 5 minutes default
    skipCache = false,
  } = options;

  // Skip cache if requested or no cache key
  if (skipCache || !cacheKey) {
    return await queryFn();
  }

  // Try to get from cache
  return await cache.wrap<T>(cacheKey, cacheTTL, queryFn);
}

/**
 * Pagination helper
 */
export function getPagination(options: PaginationOptions = {}) {
  const page = Math.max(1, options.page || 1);
  const perPage = Math.min(100, Math.max(1, options.perPage || 20));
  const offset = (page - 1) * perPage;
  
  return {
    limit: perPage,
    offset,
    page,
    perPage,
  };
}

/**
 * Build cache key from parameters
 */
export function buildCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join(':');
  
  return `${prefix}:${sortedParams}`;
}

/**
 * Invalidate cache by pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  await cache.delPattern(pattern);
  console.log(`🗑️ Cache invalidado: ${pattern}`);
}

/**
 * Invalidate multiple cache patterns
 */
export async function invalidateMultiple(patterns: string[]): Promise<void> {
  await Promise.all(patterns.map(pattern => invalidateCache(pattern)));
}

/**
 * Query builder class for common patterns
 */
export class CachedQueryBuilder<T> {
  private baseKey: string;
  private queryFn: (params: any) => Promise<T>;
  private defaultTTL: number;

  constructor(
    baseKey: string,
    queryFn: (params: any) => Promise<T>,
    defaultTTL: number = 300
  ) {
    this.baseKey = baseKey;
    this.queryFn = queryFn;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Execute query with caching
   */
  async execute(params: Record<string, any> = {}, ttl?: number): Promise<T> {
    const cacheKey = buildCacheKey(this.baseKey, params);
    
    return await cache.wrap<T>(
      cacheKey,
      ttl || this.defaultTTL,
      () => this.queryFn(params)
    );
  }

  /**
   * Execute query without cache
   */
  async fresh(params: Record<string, any> = {}): Promise<T> {
    return await this.queryFn(params);
  }

  /**
   * Invalidate cache for this query
   */
  async invalidate(params?: Record<string, any>): Promise<void> {
    if (params) {
      const cacheKey = buildCacheKey(this.baseKey, params);
      await cache.del(cacheKey);
    } else {
      await cache.delPattern(`${this.baseKey}:*`);
    }
  }
}

/**
 * Create a cached query builder
 */
export function createCachedQuery<T>(
  baseKey: string,
  queryFn: (params: any) => Promise<T>,
  defaultTTL: number = 300
): CachedQueryBuilder<T> {
  return new CachedQueryBuilder(baseKey, queryFn, defaultTTL);
}

/**
 * Common query patterns
 */

// Get by ID with cache
export function createGetByIdQuery<T>(
  tableName: string,
  queryFn: (id: string) => Promise<T | null>,
  ttl: number = 300
) {
  return createCachedQuery<T | null>(
    `${tableName}:id`,
    (params: { id: string }) => queryFn(params.id),
    ttl
  );
}

// List with filters and pagination
export function createListQuery<T>(
  tableName: string,
  queryFn: (params: any) => Promise<T[]>,
  ttl: number = 300
) {
  return createCachedQuery<T[]>(
    `${tableName}:list`,
    queryFn,
    ttl
  );
}

// Count query
export function createCountQuery(
  tableName: string,
  queryFn: (params: any) => Promise<number>,
  ttl: number = 600 // Count queries can be cached longer
) {
  return createCachedQuery<number>(
    `${tableName}:count`,
    queryFn,
    ttl
  );
}

/**
 * Cache invalidation strategies
 */

// Invalidate on create
export async function invalidateOnCreate(tableName: string, userId?: string) {
  const patterns = [
    `${tableName}:list:*`,
    `${tableName}:count:*`,
  ];
  
  if (userId) {
    patterns.push(`${tableName}:user:${userId}:*`);
  }
  
  await invalidateMultiple(patterns);
}

// Invalidate on update
export async function invalidateOnUpdate(tableName: string, id: string, userId?: string) {
  const patterns = [
    `${tableName}:id:id:${id}`,
    `${tableName}:list:*`,
  ];
  
  if (userId) {
    patterns.push(`${tableName}:user:${userId}:*`);
  }
  
  await invalidateMultiple(patterns);
}

// Invalidate on delete
export async function invalidateOnDelete(tableName: string, id: string, userId?: string) {
  const patterns = [
    `${tableName}:id:id:${id}`,
    `${tableName}:list:*`,
    `${tableName}:count:*`,
  ];
  
  if (userId) {
    patterns.push(`${tableName}:user:${userId}:*`);
  }
  
  await invalidateMultiple(patterns);
}

/**
 * Batch query helper
 */
export async function batchQuery<T>(
  ids: string[],
  getByIdFn: (id: string) => Promise<T | null>
): Promise<(T | null)[]> {
  // Execute queries in parallel
  return await Promise.all(ids.map(id => getByIdFn(id)));
}

/**
 * Query with fallback
 */
export async function queryWithFallback<T>(
  primaryFn: () => Promise<T>,
  fallbackFn: () => Promise<T>,
  options: { timeout?: number; retries?: number } = {}
): Promise<T> {
  const { timeout = 5000, retries = 1 } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), timeout);
      });

      // Race between query and timeout
      const result = await Promise.race([primaryFn(), timeoutPromise]);
      return result;
    } catch (error) {
      lastError = error as Error;
      console.error(`Query attempt ${attempt + 1} failed:`, error);
    }
  }

  console.log('Using fallback query');
  try {
    return await fallbackFn();
  } catch (fallbackError) {
    throw lastError || fallbackError;
  }
}

/**
 * Export helpers
 */
export const QueryUtils = {
  buildCacheKey,
  getPagination,
  invalidateCache,
  invalidateMultiple,
  invalidateOnCreate,
  invalidateOnUpdate,
  invalidateOnDelete,
  createCachedQuery,
  createGetByIdQuery,
  createListQuery,
  createCountQuery,
  batchQuery,
  queryWithFallback,
};

export default QueryUtils;
