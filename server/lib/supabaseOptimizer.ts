/**
 * Supabase Optimizer
 * Reduces bandwidth and request count for FREE tier (2GB/month, 500MB storage)
 * Implements: batching, compression, selective fields, pagination, caching
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cache } from './cache';
import { trackBandwidth } from './limitMonitor';
import { smartCache, CacheKeys, TTL_STRATEGIES } from './cacheStrategies';

/**
 * Field sets for selective querying
 * Reduces bandwidth by fetching only needed fields
 */
export const FIELD_SETS = {
  // Forms - diferentes níveis de detalhamento
  forms: {
    list: 'id,name,created_at,status',
    detail: 'id,name,fields,created_at,updated_at,status',
    full: '*',
  },
  
  // Form submissions
  submissions: {
    list: 'id,form_id,status,created_at',
    detail: 'id,form_id,data,status,created_at',
    full: '*',
  },
  
  // Workspace pages
  pages: {
    list: 'id,title,parent_id,created_at',
    detail: 'id,title,blocks,parent_id,created_at,updated_at',
    full: '*',
  },
  
  // Workspace boards
  boards: {
    list: 'id,name,created_at',
    detail: 'id,name,columns,created_at',
    full: '*',
  },
  
  // Products
  products: {
    list: 'id,name,price,status',
    detail: 'id,name,description,price,category,status',
    full: '*',
  },
};

/**
 * Pagination config
 */
export const PAGINATION = {
  defaultPageSize: 20,
  maxPageSize: 100,
};

/**
 * Optimized Supabase client wrapper
 */
export class OptimizedSupabaseClient {
  private client: SupabaseClient;
  private tenantId: string;
  private bandwidthTracking = true;
  
  constructor(url: string, key: string, tenantId: string) {
    this.client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
    });
    this.tenantId = tenantId;
  }
  
  /**
   * Track bandwidth usage
   */
  private trackResponseSize(data: any): void {
    if (!this.bandwidthTracking) return;
    
    try {
      const size = Buffer.byteLength(JSON.stringify(data), 'utf8');
      trackBandwidth(size);
      console.log(`📊 Supabase response: ${(size / 1024).toFixed(2)}KB`);
    } catch (error) {
      console.error('Error tracking bandwidth:', error);
    }
  }
  
  /**
   * Get with cache and selective fields
   */
  async getList<T = any>(
    table: string,
    options: {
      fields?: string;
      filter?: Record<string, any>;
      orderBy?: { column: string; ascending?: boolean };
      page?: number;
      pageSize?: number;
      cache?: boolean;
      cacheTTL?: number;
    } = {}
  ): Promise<{ data: T[]; count: number | null }> {
    const {
      fields = '*',
      filter = {},
      orderBy,
      page = 0,
      pageSize = PAGINATION.defaultPageSize,
      cache: useCache = true,
      cacheTTL = TTL_STRATEGIES.short,
    } = options;
    
    // Build cache key
    const cacheKey = `supabase:${this.tenantId}:${table}:list:${JSON.stringify({
      fields,
      filter,
      orderBy,
      page,
      pageSize,
    })}`;
    
    // Try cache first
    if (useCache) {
      const cached = await cache.get<{ data: T[]; count: number | null }>(cacheKey);
      if (cached) {
        console.log(`✅ Cache HIT: ${table} list`);
        return cached;
      }
    }
    
    // Build query
    let query = this.client
      .from(table)
      .select(fields, { count: 'exact' });
    
    // Apply filters
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
    
    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }
    
    // Apply pagination
    const from = page * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) {
      console.error(`❌ Supabase error: ${table}`, error);
      throw error;
    }
    
    // Track bandwidth
    this.trackResponseSize({ data, count });
    
    // Cache result
    if (useCache && data) {
      await cache.set(cacheKey, { data, count }, cacheTTL);
    }
    
    console.log(`✅ Fetched ${data?.length || 0} rows from ${table} (page ${page})`);
    
    return { data: data || [], count };
  }
  
  /**
   * Get single record with cache
   */
  async getById<T = any>(
    table: string,
    id: string,
    options: {
      fields?: string;
      cache?: boolean;
      cacheTTL?: number;
    } = {}
  ): Promise<T | null> {
    const {
      fields = '*',
      cache: useCache = true,
      cacheTTL = TTL_STRATEGIES.standard,
    } = options;
    
    const cacheKey = `supabase:${this.tenantId}:${table}:${id}`;
    
    // Try cache
    if (useCache) {
      const cached = await cache.get<T>(cacheKey);
      if (cached) {
        console.log(`✅ Cache HIT: ${table}/${id}`);
        return cached;
      }
    }
    
    // Fetch from Supabase
    const { data, error } = await this.client
      .from(table)
      .select(fields)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`❌ Supabase error: ${table}/${id}`, error);
      throw error;
    }
    
    // Track bandwidth
    this.trackResponseSize(data);
    
    // Cache
    if (useCache && data) {
      await cache.set(cacheKey, data, cacheTTL);
    }
    
    return data as T;
  }
  
  /**
   * Batch insert (reduces requests)
   */
  async batchInsert<T = any>(
    table: string,
    records: any[]
  ): Promise<T[]> {
    if (records.length === 0) return [];
    
    console.log(`📦 Batch inserting ${records.length} records into ${table}`);
    
    const { data, error } = await this.client
      .from(table)
      .insert(records)
      .select();
    
    if (error) {
      console.error(`❌ Batch insert error: ${table}`, error);
      throw error;
    }
    
    // Track bandwidth
    this.trackResponseSize(data);
    
    // Invalidate list cache
    await cache.delPattern(`supabase:${this.tenantId}:${table}:list:*`);
    
    console.log(`✅ Inserted ${data?.length || 0} records into ${table}`);
    
    return data || [];
  }
  
  /**
   * Batch update (reduces requests)
   */
  async batchUpdate<T = any>(
    table: string,
    updates: Array<{ id: string; data: any }>
  ): Promise<number> {
    if (updates.length === 0) return 0;
    
    console.log(`📦 Batch updating ${updates.length} records in ${table}`);
    
    // Supabase doesn't have native batch update, so we do it in parallel
    const results = await Promise.all(
      updates.map(({ id, data }) =>
        this.client
          .from(table)
          .update(data)
          .eq('id', id)
      )
    );
    
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error(`❌ Batch update errors: ${errors.length}/${updates.length}`);
    }
    
    // Invalidate caches
    await Promise.all([
      cache.delPattern(`supabase:${this.tenantId}:${table}:list:*`),
      ...updates.map(({ id }) => cache.del(`supabase:${this.tenantId}:${table}:${id}`)),
    ]);
    
    const successCount = updates.length - errors.length;
    console.log(`✅ Updated ${successCount}/${updates.length} records in ${table}`);
    
    return successCount;
  }
  
  /**
   * Smart query with automatic caching and optimization
   */
  async smartQuery<T = any>(
    table: string,
    options: {
      select?: string;
      filters?: Record<string, any>;
      orderBy?: string;
      limit?: number;
      cacheKey?: string;
      cacheTTL?: number;
    }
  ): Promise<T[]> {
    const {
      select = '*',
      filters = {},
      orderBy,
      limit = PAGINATION.defaultPageSize,
      cacheKey: customCacheKey,
      cacheTTL = TTL_STRATEGIES.short,
    } = options;
    
    const cacheKey = customCacheKey || `supabase:${this.tenantId}:${table}:query:${JSON.stringify(options)}`;
    
    return smartCache<T[]>(
      cacheKey,
      async () => {
        let query = this.client.from(table).select(select);
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.eq(key, value);
          }
        });
        
        // Apply ordering
        if (orderBy) {
          query = query.order(orderBy);
        }
        
        // Apply limit
        query = query.limit(limit);
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        this.trackResponseSize(data);
        return data || [];
      },
      'short'
    );
  }
  
  /**
   * Invalidate cache for a table
   */
  async invalidateCache(table: string, id?: string): Promise<void> {
    if (id) {
      await cache.del(`supabase:${this.tenantId}:${table}:${id}`);
    } else {
      await cache.delPattern(`supabase:${this.tenantId}:${table}:*`);
    }
    
    console.log(`🗑️ Cache invalidated: ${table}${id ? '/' + id : ''}`);
  }
}

/**
 * Factory to create optimized Supabase client
 */
export function createOptimizedSupabase(
  url: string,
  key: string,
  tenantId: string
): OptimizedSupabaseClient {
  return new OptimizedSupabaseClient(url, key, tenantId);
}
