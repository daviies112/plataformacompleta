/**
 * Query Optimizer Module
 * Advanced query optimization for Supabase with pagination, caching, and aggregation
 * Optimized for 1000+ clients performance
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { cache } from './cache';
import crypto from 'crypto';

/**
 * Predefined field sets for optimized queries
 */
export const FIELD_SETS = {
  minimal: 'id, title',
  compact: 'id, title, status, created_at',
  full: '*'
} as const;

/**
 * Pagination parameters interface
 */
export interface PaginationParams {
  from: number;
  to: number;
  limit: number;
}

/**
 * Cursor pagination result interface
 */
export interface CursorPageResult<T = any> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Get pagination parameters with bandwidth optimization
 * @param page - Current page number (1-based)
 * @param perPage - Items per page (max 50 for bandwidth optimization)
 * @returns Pagination parameters for Supabase range query
 */
export function getPaginationParams(page: number = 1, perPage: number = 20): PaginationParams {
  const limit = Math.min(Math.max(perPage, 1), 50);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  console.log(`📄 Pagination: page=${page}, perPage=${perPage}, limit=${limit}, range=[${from}, ${to}]`);

  return { from, to, limit };
}

/**
 * Get page using cursor-based pagination (more efficient than offset)
 * @param supabase - Supabase client instance
 * @param table - Table name
 * @param cursor - ID of last item from previous page (null for first page)
 * @param limit - Number of items per page (default 20, max 50)
 * @returns Cursor page result with data and pagination info
 */
export async function getCursorPage<T = any>(
  supabase: SupabaseClient,
  table: string,
  cursor: string | null = null,
  limit: number = 20
): Promise<CursorPageResult<T>> {
  const pageLimit = Math.min(Math.max(limit, 1), 50);

  console.log(`🔍 Cursor pagination: table=${table}, cursor=${cursor || 'null'}, limit=${pageLimit}`);

  try {
    let query = supabase
      .from(table)
      .select('*')
      .order('id', { ascending: true })
      .limit(pageLimit);

    if (cursor) {
      query = query.gt('id', cursor);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`❌ Cursor pagination error for table ${table}:`, error);
      throw error;
    }

    const nextCursor = data && data.length > 0 ? data[data.length - 1].id : null;
    const hasMore = data ? data.length === pageLimit : false;

    console.log(`✅ Cursor page loaded: ${data?.length || 0} items, nextCursor=${nextCursor}, hasMore=${hasMore}`);

    return {
      data: (data as T[]) || [],
      nextCursor,
      hasMore
    };
  } catch (error) {
    console.error(`❌ Error in getCursorPage:`, error);
    throw error;
  }
}

/**
 * Get user statistics using server-side aggregation
 * @param supabase - Supabase client instance
 * @param userId - User ID for statistics
 * @returns Statistics object
 * 
 * SQL Function to create in Supabase:
 * 
 * CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
 * RETURNS JSON AS $$
 * DECLARE
 *   result JSON;
 * BEGIN
 *   SELECT json_build_object(
 *     'total_items', COUNT(*),
 *     'completed_items', COUNT(*) FILTER (WHERE status = 'completed'),
 *     'pending_items', COUNT(*) FILTER (WHERE status = 'pending'),
 *     'in_progress_items', COUNT(*) FILTER (WHERE status = 'in_progress'),
 *     'total_value', COALESCE(SUM(value), 0),
 *     'avg_value', COALESCE(AVG(value), 0),
 *     'last_updated', MAX(updated_at)
 *   )
 *   INTO result
 *   FROM your_table_name
 *   WHERE user_id = p_user_id;
 *   
 *   RETURN result;
 * END;
 * $$ LANGUAGE plpgsql;
 * 
 * Grant execute permission:
 * GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO authenticated;
 */
export async function getStats(supabase: SupabaseClient, userId: string): Promise<any> {
  console.log(`📊 Fetching stats for user: ${userId}`);

  try {
    const { data, error } = await supabase
      .rpc('get_user_stats', { p_user_id: userId });

    if (error) {
      console.error(`❌ Stats aggregation error for user ${userId}:`, error);
      throw error;
    }

    console.log(`✅ Stats loaded for user ${userId}:`, data);
    return data;
  } catch (error) {
    console.error(`❌ Error in getStats:`, error);
    throw error;
  }
}

/**
 * Query builder configuration interface
 */
interface QueryConfig {
  table: string;
  select?: string;
  filters?: Record<string, any>;
  limit?: number;
  order?: { column: string; ascending?: boolean };
}

/**
 * Optimized Query Builder with automatic caching
 */
export class OptimizedQuery {
  private supabase: SupabaseClient;
  private config: QueryConfig;
  private cacheEnabled: boolean = false;
  private cacheTTL: number = 300;

  constructor(supabase: SupabaseClient, table: string) {
    this.supabase = supabase;
    this.config = { table };
    console.log(`🔧 OptimizedQuery initialized for table: ${table}`);
  }

  /**
   * Set fields to select
   */
  select(fields: string = '*'): this {
    this.config.select = fields;
    console.log(`📋 Select fields: ${fields}`);
    return this;
  }

  /**
   * Add where conditions
   */
  where(filters: Record<string, any>): this {
    this.config.filters = { ...this.config.filters, ...filters };
    console.log(`🔍 Where filters:`, filters);
    return this;
  }

  /**
   * Set result limit
   */
  limit(limit: number): this {
    this.config.limit = Math.min(Math.max(limit, 1), 50);
    console.log(`🔢 Limit: ${this.config.limit}`);
    return this;
  }

  /**
   * Set result ordering
   */
  order(column: string, ascending: boolean = true): this {
    this.config.order = { column, ascending };
    console.log(`🔄 Order by: ${column} ${ascending ? 'ASC' : 'DESC'}`);
    return this;
  }

  /**
   * Enable caching for this query
   */
  cached(ttl: number = 300): this {
    this.cacheEnabled = true;
    this.cacheTTL = ttl;
    console.log(`💾 Cache enabled with TTL: ${ttl}s`);
    return this;
  }

  /**
   * Generate unique cache key based on query configuration
   */
  private generateCacheKey(): string {
    const keyData = JSON.stringify(this.config);
    const hash = crypto.createHash('md5').update(keyData).digest('hex');
    const cacheKey = `query:${this.config.table}:${hash}`;
    console.log(`🔑 Cache key generated: ${cacheKey}`);
    return cacheKey;
  }

  /**
   * Execute the query with optional caching
   */
  async execute<T = any>(): Promise<T[]> {
    console.log(`🚀 Executing query for table: ${this.config.table}`);

    const queryFn = async () => {
      let query = this.supabase
        .from(this.config.table)
        .select(this.config.select || '*');

      if (this.config.filters) {
        Object.entries(this.config.filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      if (this.config.order) {
        query = query.order(this.config.order.column, { 
          ascending: this.config.order.ascending 
        });
      }

      if (this.config.limit) {
        query = query.limit(this.config.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`❌ Query execution error:`, error);
        throw error;
      }

      console.log(`✅ Query executed successfully: ${data?.length || 0} rows`);
      return (data as T[]) || [];
    };

    if (this.cacheEnabled) {
      const cacheKey = this.generateCacheKey();
      return cache.wrap<T[]>(cacheKey, this.cacheTTL, queryFn);
    }

    return queryFn();
  }
}

/**
 * Create an optimized query builder instance
 */
export function createOptimizedQuery(supabase: SupabaseClient, table: string): OptimizedQuery {
  return new OptimizedQuery(supabase, table);
}

export default {
  FIELD_SETS,
  getPaginationParams,
  getCursorPage,
  getStats,
  OptimizedQuery,
  createOptimizedQuery
};
