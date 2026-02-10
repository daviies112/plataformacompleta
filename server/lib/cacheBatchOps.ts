/**
 * Batch Operations for Redis
 * Reduces command count by batching multiple get/set operations
 * Optimized for Upstash Free Tier (10K commands/day)
 */

import { cache } from './cache';

/**
 * Batch get multiple keys with a single pipeline
 * Saves (N-1) Redis commands for N keys
 */
export async function batchGet<T = any>(keys: string[]): Promise<Map<string, T | null>> {
  const results = new Map<string, T | null>();
  
  if (keys.length === 0) return results;
  
  try {
    // Use Promise.all to fetch all at once
    const values = await Promise.all(
      keys.map(key => cache.get<T>(key))
    );
    
    keys.forEach((key, index) => {
      results.set(key, values[index]);
    });
    
    return results;
  } catch (error) {
    console.error('Batch GET error:', error);
    return results;
  }
}

/**
 * Batch set multiple key-value pairs
 * Saves (N-1) Redis commands for N pairs
 */
export async function batchSet(
  entries: Array<{ key: string; value: any; ttl?: number }>
): Promise<boolean> {
  if (entries.length === 0) return true;
  
  try {
    // Set all in parallel
    await Promise.all(
      entries.map(({ key, value, ttl }) => cache.set(key, value, ttl || 300))
    );
    
    console.log(`✅ Batch SET: ${entries.length} keys`);
    return true;
  } catch (error) {
    console.error('Batch SET error:', error);
    return false;
  }
}

/**
 * Batch delete multiple keys
 * Saves (N-1) Redis commands for N keys
 */
export async function batchDelete(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  
  try {
    await Promise.all(keys.map(key => cache.del(key)));
    console.log(`✅ Batch DELETE: ${keys.length} keys`);
    return keys.length;
  } catch (error) {
    console.error('Batch DELETE error:', error);
    return 0;
  }
}

/**
 * Smart cache preload - loads multiple related keys at once
 * Example: preload all dashboard data in one go
 */
export async function preloadCache(
  prefix: string,
  fetchFn: () => Promise<Record<string, any>>,
  ttl: number = 300
): Promise<void> {
  try {
    const data = await fetchFn();
    const entries = Object.entries(data).map(([key, value]) => ({
      key: `${prefix}:${key}`,
      value,
      ttl,
    }));
    
    await batchSet(entries);
    console.log(`✅ Preloaded ${entries.length} keys with prefix: ${prefix}`);
  } catch (error) {
    console.error('Preload cache error:', error);
  }
}

/**
 * Invalidate cache by pattern (optimized)
 * Instead of KEYS + DEL, use pre-tracked keys
 */
export class CacheRegistry {
  private static prefixes = new Map<string, Set<string>>();
  
  /**
   * Register a key with its prefix for later batch invalidation
   */
  static register(prefix: string, key: string): void {
    if (!this.prefixes.has(prefix)) {
      this.prefixes.set(prefix, new Set());
    }
    this.prefixes.get(prefix)!.add(key);
  }
  
  /**
   * Invalidate all keys with a prefix (without KEYS command)
   */
  static async invalidatePrefix(prefix: string): Promise<number> {
    const keys = this.prefixes.get(prefix);
    if (!keys || keys.size === 0) return 0;
    
    const deleted = await batchDelete(Array.from(keys));
    this.prefixes.delete(prefix);
    
    console.log(`✅ Invalidated ${deleted} keys with prefix: ${prefix}`);
    return deleted;
  }
  
  /**
   * Get all registered prefixes
   */
  static getPrefixes(): string[] {
    return Array.from(this.prefixes.keys());
  }
}
