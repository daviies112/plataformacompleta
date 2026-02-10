/**
 * Cache manager with Redis (Upstash) and memory fallback
 * Implements caching layer for 1000+ clients performance optimization
 */

import Redis from 'ioredis';
import NodeCache from 'node-cache';
import { getRedisCredentials } from './credentialsDb';
import { db } from '../db';
import { sql } from 'drizzle-orm';

let redis: Redis | null = null;
const memoryCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Initialize Redis connection with credentials
 * Prioriza environment variables (REDIS_URL/REDIS_TOKEN) sobre banco de dados
 */
async function initializeRedis() {
  if (redis) return redis;

  try {
    // SYSTEM-LEVEL: Usar apenas environment variables (não DB)
    let url = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
    let token = process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_TOKEN;

    if (url) {
      console.log('✅ Redis configurado via environment variables (system-level)');
    }

    if (!url) {
      console.log('ℹ️ Redis não configurado - usando cache em memória');
      return null;
    }

    // Validate Redis URL before attempting connection
    const cleanUrl = url.trim();
    if (cleanUrl === '/' || cleanUrl.length === 0) {
      console.log('ℹ️ URL do Redis inválida ou ausente - usando cache em memória');
      return null;
    }

    // Check if URL is a valid Redis URL format
    if (!cleanUrl.startsWith('redis://') && !cleanUrl.startsWith('rediss://')) {
      console.log('ℹ️ URL do Redis com formato inválido - usando cache em memória');
      return null;
    }

    // Configure Redis with TLS support (required for Upstash)
    const redisConfig: any = {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    };

    // Enable TLS if URL uses rediss:// or is Upstash
    const isSecure = cleanUrl.startsWith('rediss://') || cleanUrl.includes('upstash.io');
    if (isSecure) {
      redisConfig.tls = {
        rejectUnauthorized: true
      };
    }

    redis = new Redis(cleanUrl, redisConfig);

    redis.on('error', (err) => {
      console.error('❌ Redis Error:', err);
    });

    redis.on('connect', () => {
      console.log('✅ Redis conectado com sucesso!');
      console.log(`🔗 Redis URL: ${cleanUrl.substring(0, 30)}...`);
    });

    return redis;
  } catch (error) {
    console.log('ℹ️ Erro ao conectar Redis - usando cache em memória');
    return null;
  }
}

/**
 * Get today's date key for persistent tracking (daily granularity for debugging)
 */
function getTodayKey(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `quota:redis:commands:${year}-${month}-${day}`;
}

/**
 * Get current month key for monthly quota tracking (NEW - 500K/month limit)
 */
function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `quota:redis:commands:monthly:${year}-${month}`;
}

/**
 * Get month identifier for display (YYYY-MM format)
 */
function getMonthIdentifier(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Calculate TTL until end of current month
 */
function getTTLUntilMonthEnd(): number {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Math.floor((nextMonth.getTime() - now.getTime()) / 1000);
}

/**
 * Track Redis command usage (async, persistent) - DUAL TRACKING: daily + monthly
 */
async function trackRedisCommand(): Promise<void> {
  try {
    const todayKey = getTodayKey();
    const monthKey = getCurrentMonthKey();
    
    if (redis) {
      // Increment daily counter (for debugging/visibility)
      await redis.incr(todayKey);
      await redis.expire(todayKey, 86400 * 2); // Keep for 2 days
      
      // Increment monthly counter (authoritative for 500K quota)
      await redis.incr(monthKey);
      await redis.expire(monthKey, getTTLUntilMonthEnd());
    } else {
      // Database fallback - track both daily and monthly
      const existingRow = await db.execute(sql`SELECT id FROM app_settings LIMIT 1`);
      if (existingRow.rows.length > 0) {
        const rowId = (existingRow.rows[0] as any).id;
        await db.execute(sql`
          UPDATE app_settings SET
            redis_commands_today = CASE 
              WHEN redis_commands_date = CURRENT_DATE 
              THEN redis_commands_today + 1
              ELSE 1
            END,
            redis_commands_date = CURRENT_DATE,
            redis_commands_month = CASE
              WHEN redis_commands_month_start = DATE_TRUNC('month', CURRENT_DATE)
              THEN redis_commands_month + 1
              ELSE 1
            END,
            redis_commands_month_start = DATE_TRUNC('month', CURRENT_DATE)
          WHERE id = ${rowId}
        `);
      }
    }
  } catch (error) {
    // Silent fail - don't block cache operations
  }
}

/**
 * Get current command count for today (daily granularity)
 */
async function getCommandCount(): Promise<{ count: number; date: string }> {
  try {
    const todayKey = getTodayKey();
    const today = new Date().toISOString().split('T')[0];
    
    if (redis) {
      const count = await redis.get(todayKey);
      return {
        count: count ? parseInt(count, 10) : 0,
        date: today,
      };
    } else {
      const result = await db.execute(sql`
        SELECT 
          COALESCE(redis_commands_today, 0) as count,
          COALESCE(redis_commands_date::text, CURRENT_DATE::text) as date
        FROM app_settings 
        LIMIT 1
      `);
      
      const row = result.rows[0] as any;
      if (row && row.date === today) {
        return { count: parseInt(row.count, 10), date: row.date };
      }
      
      return { count: 0, date: today };
    }
  } catch (error) {
    return { count: 0, date: new Date().toISOString().split('T')[0] };
  }
}

/**
 * Get monthly command count (NEW - for 500K quota monitoring)
 */
async function getMonthlyCommandCount(): Promise<{ count: number; month: string }> {
  try {
    const monthKey = getCurrentMonthKey();
    const monthId = getMonthIdentifier();
    
    if (redis) {
      const count = await redis.get(monthKey);
      return {
        count: count ? parseInt(count, 10) : 0,
        month: monthId,
      };
    } else {
      // Database fallback
      const result = await db.execute(sql`
        SELECT 
          COALESCE(redis_commands_month, 0) as count,
          COALESCE(TO_CHAR(redis_commands_month_start, 'YYYY-MM'), ${monthId}) as month
        FROM app_settings 
        LIMIT 1
      `);
      
      const row = result.rows[0] as any;
      if (row && row.month === monthId) {
        return { count: parseInt(row.count, 10), month: row.month };
      }
      
      return { count: 0, month: monthId };
    }
  } catch (error) {
    return { count: 0, month: getMonthIdentifier() };
  }
}

/**
 * Reset daily command counter (no longer needed - auto-resets by date key)
 * @deprecated Use date-based keys instead
 */
export async function resetDailyCommandCounter(): Promise<void> {
  console.log('ℹ️ Daily counter auto-resets by date key - manual reset not needed');
}

/**
 * Cache Manager Class
 */
class CacheManager {
  private redisReady = false;

  constructor() {
    this.init();
  }

  private async init() {
    const redisClient = await initializeRedis();
    this.redisReady = redisClient !== null;
  }

  /**
   * Get value from cache with fallback
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      // Try Redis first if available
      if (redis && this.redisReady) {
        trackRedisCommand();
        const cached = await redis.get(key);
        if (cached) {
          return JSON.parse(cached) as T;
        }
      }
      
      // Fallback to memory cache
      const memoryCached = memoryCache.get<T>(key);
      if (memoryCached !== undefined) {
        return memoryCached;
      }

      return null;
    } catch (error: any) {
      console.error('Cache GET error:', error);
      
      // Re-throw critical Redis limit errors for circuit breaker
      if (error.message?.includes('max requests limit exceeded')) {
        throw error;
      }
      
      // Try memory cache on other Redis errors
      const memoryCached = memoryCache.get<T>(key);
      return memoryCached !== undefined ? memoryCached : null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttl: number = 300): Promise<boolean> {
    const stringValue = JSON.stringify(value);
    
    try {
      // Set in Redis if available
      if (redis && this.redisReady) {
        trackRedisCommand();
        await redis.setex(key, ttl, stringValue);
      }
      
      // Always set in memory cache as backup
      memoryCache.set(key, value, ttl);
      return true;
    } catch (error) {
      console.error('Cache SET error:', error);
      // Fallback to memory cache only
      memoryCache.set(key, value, ttl);
      return false;
    }
  }

  /**
   * Set value in cache only if key doesn't exist (SETNX semantics)
   * Returns true if value was set, false if key already exists
   */
  async trySetNx(key: string, value: any, ttl: number = 300): Promise<boolean> {
    const stringValue = JSON.stringify(value);
    
    try {
      // Try Redis SETNX if available
      if (redis && this.redisReady) {
        trackRedisCommand();
        const result = await redis.set(key, stringValue, 'EX', ttl, 'NX');
        
        // If Redis succeeded, also set in memory cache for consistency
        if (result === 'OK') {
          memoryCache.set(key, value, ttl);
          return true;
        }
        return false; // Key already exists in Redis
      }
      
      // Fallback to memory cache
      const existing = memoryCache.get(key);
      if (existing !== undefined) {
        return false; // Key already exists
      }
      
      memoryCache.set(key, value, ttl);
      return true;
    } catch (error) {
      console.error('Cache SETNX error:', error);
      // On error, try memory cache fallback
      const existing = memoryCache.get(key);
      if (existing !== undefined) {
        return false;
      }
      memoryCache.set(key, value, ttl);
      return true;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    try {
      if (redis && this.redisReady) {
        trackRedisCommand();
        await redis.del(key);
      }
      memoryCache.del(key);
    } catch (error) {
      console.error('Cache DEL error:', error);
      memoryCache.del(key);
    }
  }

  /**
   * Delete keys by pattern (e.g., "user:123:*")
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      if (redis && this.redisReady) {
        trackRedisCommand(); // For KEYS command
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          trackRedisCommand(); // For DEL command
          await redis.del(...keys);
        }
      }
      
      // For memory cache, iterate and delete matching keys
      const allKeys = memoryCache.keys();
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of allKeys) {
        if (regex.test(key)) {
          memoryCache.del(key);
        }
      }
    } catch (error) {
      console.error('Cache DEL Pattern error:', error);
    }
  }

  /**
   * Cache wrapper function with auto-fetch
   */
  async wrap<T = any>(
    key: string, 
    ttl: number, 
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      console.log(`✅ Cache HIT: ${key}`);
      return cached;
    }

    console.log(`⚠️ Cache MISS: ${key}`);
    const data = await fetchFn();
    await this.set(key, data, ttl);
    return data;
  }

  /**
   * Increment counter (for rate limiting)
   */
  async incr(key: string): Promise<number> {
    try {
      if (redis && this.redisReady) {
        trackRedisCommand();
        return await redis.incr(key);
      }
      
      // Memory cache fallback
      const current = memoryCache.get<number>(key) || 0;
      const newValue = current + 1;
      memoryCache.set(key, newValue);
      return newValue;
    } catch (error) {
      console.error('Cache INCR error:', error);
      const current = memoryCache.get<number>(key) || 0;
      const newValue = current + 1;
      memoryCache.set(key, newValue);
      return newValue;
    }
  }

  /**
   * Set expiration for a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      if (redis && this.redisReady) {
        trackRedisCommand();
        const result = await redis.expire(key, seconds);
        return result === 1;
      }
      
      // Memory cache handles TTL automatically
      return true;
    } catch (error) {
      console.error('Cache EXPIRE error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (redis && this.redisReady) {
        trackRedisCommand();
        const result = await redis.exists(key);
        return result === 1;
      }
      
      return memoryCache.has(key);
    } catch (error) {
      console.error('Cache EXISTS error:', error);
      return memoryCache.has(key);
    }
  }

  /**
   * Get cache statistics (UPDATED: includes monthly tracking)
   */
  async getStats() {
    const commandData = await getCommandCount();
    const monthlyData = await getMonthlyCommandCount();
    
    return {
      redisConnected: this.redisReady,
      memoryKeys: memoryCache.keys().length,
      memoryStats: memoryCache.getStats(),
      redis: {
        commandsToday: commandData.count,
        commandsThisMonth: monthlyData.count,
        lastReset: commandData.date,
        monthKey: monthlyData.month,
      },
    };
  }

  /**
   * Flush all cache
   */
  async flush(): Promise<void> {
    try {
      if (redis && this.redisReady) {
        await redis.flushdb();
      }
      memoryCache.flushAll();
      console.log('✅ Cache limpo com sucesso');
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
      memoryCache.flushAll();
    }
  }
}

// Export singleton instance
export const cache = new CacheManager();
export default cache;

/**
 * WhatsApp Contacts Cache Helper
 * Implementa cache de contatos do WhatsApp com Redis
 */

interface ContactInfo {
  name?: string;
  pushName?: string;
  notify?: string;
}

interface ContactsMap {
  contactsByJid: { [remoteJid: string]: ContactInfo };
  fetchedAt: string;
}

/**
 * Format phone number from remoteJid for display
 * Exemplo: "5511999999999@s.whatsapp.net" -> "+55 11 99999-9999"
 */
export function formatPhoneNumber(remoteJid: string): string {
  try {
    const number = remoteJid.split('@')[0];
    
    if (number.length < 10) {
      return number;
    }
    
    if (number.startsWith('55') && number.length >= 12) {
      const countryCode = number.substring(0, 2);
      const ddd = number.substring(2, 4);
      const rest = number.substring(4);
      
      if (rest.length === 9) {
        const firstPart = rest.substring(0, 5);
        const secondPart = rest.substring(5);
        return `+${countryCode} ${ddd} ${firstPart}-${secondPart}`;
      } else if (rest.length === 8) {
        const firstPart = rest.substring(0, 4);
        const secondPart = rest.substring(4);
        return `+${countryCode} ${ddd} ${firstPart}-${secondPart}`;
      }
    }
    
    return `+${number}`;
  } catch (error) {
    return remoteJid;
  }
}

/**
 * Get cached contacts from WhatsApp Evolution API
 * Chave Redis: evolution:contacts:{clientId}:{tenantId}:{instance}
 * TTL: 10 minutos (600 segundos)
 */
export async function getCachedContacts(clientId: string, tenantId: string, config: any): Promise<ContactsMap> {
  const cacheKey = `evolution:contacts:${clientId}:${tenantId}:${config.instance}`;
  const TTL = 600;
  
  try {
    const cached = await cache.get<ContactsMap>(cacheKey);
    
    if (cached && cached.contactsByJid) {
      console.log(`✅ Cache HIT: Contatos do WhatsApp para ${clientId}:${tenantId} (${Object.keys(cached.contactsByJid).length} contatos)`);
      return cached;
    }
    
    console.log(`⚠️ Cache MISS: Buscando contatos da Evolution API para ${clientId}:${tenantId}...`);
    
    const { fetchContacts } = await import('./evolutionApi');
    const contacts = await fetchContacts(config);
    
    const contactsByJid: { [remoteJid: string]: ContactInfo } = {};
    
    if (Array.isArray(contacts)) {
      for (const contact of contacts) {
        if (contact.id) {
          contactsByJid[contact.id] = {
            name: contact.name,
            pushName: contact.pushName,
            notify: contact.notify,
          };
        }
      }
    }
    
    const contactsMap: ContactsMap = {
      contactsByJid,
      fetchedAt: new Date().toISOString(),
    };
    
    await cache.set(cacheKey, contactsMap, TTL);
    console.log(`✅ Contatos cacheados para ${clientId}:${tenantId}: ${Object.keys(contactsByJid).length} contatos (TTL: ${TTL}s)`);
    
    return contactsMap;
  } catch (error) {
    console.error(`❌ Erro ao buscar/cachear contatos para ${clientId}:${tenantId}:`, error);
    return {
      contactsByJid: {},
      fetchedAt: new Date().toISOString(),
    };
  }
}
