/**
 * Limit Monitor - FREE Tier Usage Monitoring
 * Monitors Redis and Supabase usage limits for free tier plans
 */

import { cache } from './cache';
import { CACHE_NAMESPACES } from './cacheStrategies';

// Limit constants for FREE tier (UPDATED March 2025: Redis 500K/month)
const LIMITS = {
  redis: {
    monthly: 500000,  // 500K commands/month (updated from 10K/day)
    warning: 400000,  // 80%
    critical: 475000, // 95%
  },
  supabase: {
    bandwidth: 2 * 1024 * 1024 * 1024, // 2GB
    storage: 500 * 1024 * 1024,        // 500MB
    warning: 0.8,
    critical: 0.95,
  },
};

// Tracking variables (Supabase bandwidth - no auto-reset needed, tracked separately)
let supabaseBandwidthUsed = 0;

// Types
interface LimitStatus {
  service: string;
  status: 'ok' | 'warning' | 'critical';
  used: number;
  limit: number;
  percentage: number;
}

interface MonitorSummary {
  timestamp: Date;
  services: LimitStatus[];
  overallStatus: 'ok' | 'warning' | 'critical';
}

/**
 * Get emoji for status
 */
function getStatusEmoji(status: 'ok' | 'warning' | 'critical'): string {
  switch (status) {
    case 'ok':
      return '🟢';
    case 'warning':
      return '🟡';
    case 'critical':
      return '🔴';
    default:
      return '⚪';
  }
}

/**
 * Check Redis command limits (UPDATED: uses monthly quota)
 */
async function checkRedisLimits(): Promise<LimitStatus> {
  const stats = await cache.getStats();
  const used = stats.redis.commandsThisMonth;
  const limit = LIMITS.redis.monthly;
  const percentage = (used / limit) * 100;

  let status: 'ok' | 'warning' | 'critical' = 'ok';

  if (used >= LIMITS.redis.critical) {
    console.error(`🔴 CRITICAL: Redis commands at ${percentage.toFixed(1)}% this month (${used}/${limit})`);
    status = 'critical';
  } else if (used >= LIMITS.redis.warning) {
    console.warn(`🟡 WARNING: Redis commands at ${percentage.toFixed(1)}% this month (${used}/${limit})`);
    status = 'warning';
  }

  return {
    service: 'Redis (Monthly)',
    status,
    used,
    limit,
    percentage,
  };
}

/**
 * Check Supabase bandwidth limits
 */
function checkSupabaseBandwidth(): LimitStatus {
  const used = supabaseBandwidthUsed;
  const limit = LIMITS.supabase.bandwidth;
  const percentage = (used / limit) * 100;

  let status: 'ok' | 'warning' | 'critical' = 'ok';

  if (percentage >= 95) {
    console.error(`🔴 CRITICAL: Supabase bandwidth at ${percentage.toFixed(1)}% (${(used / (1024 * 1024)).toFixed(2)}MB/${(limit / (1024 * 1024)).toFixed(2)}MB)`);
    status = 'critical';
  } else if (percentage >= 80) {
    console.warn(`🟡 WARNING: Supabase bandwidth at ${percentage.toFixed(1)}% (${(used / (1024 * 1024)).toFixed(2)}MB/${(limit / (1024 * 1024)).toFixed(2)}MB)`);
    status = 'warning';
  }

  return {
    service: 'Supabase Bandwidth',
    status,
    used,
    limit,
    percentage,
  };
}

/**
 * Track bandwidth usage
 */
export function trackBandwidth(bytes: number): void {
  supabaseBandwidthUsed += bytes;
}

/**
 * Main monitoring function
 */
export async function monitor(): Promise<MonitorSummary> {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  🔍 LIMIT MONITOR - FREE TIER         ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Check all services (auto-reset is handled by date-based keys)
  const redisStatus = await checkRedisLimits();
  const supabaseStatus = checkSupabaseBandwidth();

  const services = [redisStatus, supabaseStatus];

  // Display status
  console.log('📊 Service Status:\n');
  
  for (const service of services) {
    const emoji = getStatusEmoji(service.status);
    const usedFormatted = service.service.includes('Bandwidth') 
      ? `${(service.used / (1024 * 1024)).toFixed(2)}MB`
      : service.used.toString();
    const limitFormatted = service.service.includes('Bandwidth')
      ? `${(service.limit / (1024 * 1024)).toFixed(2)}MB`
      : service.limit.toString();

    console.log(`  ${emoji} ${service.service}: ${service.percentage.toFixed(1)}% (${usedFormatted}/${limitFormatted})`);
  }

  // Determine overall status
  const overallStatus = services.some(s => s.status === 'critical') 
    ? 'critical' 
    : services.some(s => s.status === 'warning') 
    ? 'warning' 
    : 'ok';

  // Show recommendations if needed
  if (overallStatus !== 'ok') {
    console.log('\n💡 Recommendations:\n');
    
    if (redisStatus.status === 'warning' || redisStatus.status === 'critical') {
      console.log('  • Optimize cache usage');
      console.log('  • Increase cache TTL to reduce commands');
      console.log('  • Consider upgrading to paid Redis plan');
    }
    
    if (supabaseStatus.status === 'warning' || supabaseStatus.status === 'critical') {
      console.log('  • Reduce API call frequency');
      console.log('  • Implement request batching');
      console.log('  • Consider upgrading Supabase plan');
    }
  }

  console.log('\n' + '─'.repeat(40) + '\n');

  return {
    timestamp: new Date(),
    services,
    overallStatus,
  };
}

// Store the monitoring interval for later cleanup
let monitoringInterval: NodeJS.Timeout | null = null;

/**
 * Start periodic monitoring
 */
export function startMonitoring(intervalMs: number = 300000): NodeJS.Timeout {
  console.log(`🚀 Starting limit monitor (interval: ${intervalMs / 1000}s)`);
  
  // Stop existing monitoring if any
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  
  // Run immediately
  monitor();
  
  // Set interval for periodic monitoring
  monitoringInterval = setInterval(() => {
    monitor();
  }, intervalMs);

  return monitoringInterval;
}

/**
 * Stop monitoring
 */
export function stopMonitoring(): void {
  if (monitoringInterval) {
    console.log('🛑 Stopping limit monitor');
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
}

/**
 * Get current usage stats (UPDATED: includes monthly tracking)
 */
export async function getUsageStats() {
  const stats = await cache.getStats();
  
  return {
    redis: {
      commandsToday: stats.redis.commandsToday,
      commandsThisMonth: stats.redis.commandsThisMonth,
      monthlyLimit: LIMITS.redis.monthly,
      percentage: (stats.redis.commandsThisMonth / LIMITS.redis.monthly) * 100,
      month: stats.redis.monthKey,
    },
    supabase: {
      bandwidthUsed: supabaseBandwidthUsed,
      limit: LIMITS.supabase.bandwidth,
      percentage: (supabaseBandwidthUsed / LIMITS.supabase.bandwidth) * 100,
    },
    lastReset: stats.redis.lastReset,
  };
}

/**
 * Get cache statistics by namespace
 * Provides insights into cache usage per feature area
 */
export async function getCacheStatsByNamespace() {
  const namespaces = Object.values(CACHE_NAMESPACES);
  const stats: Record<string, { keys: number; hits: number; misses: number }> = {};
  
  try {
    for (const namespace of namespaces) {
      // Count keys for this namespace (using a pattern match)
      const pattern = `${namespace}:*`;
      
      // Note: We're using a simple counter approach since KEYS command is expensive
      // In production, we'd track this in a separate counter
      stats[namespace] = {
        keys: 0,  // Would need to implement key counting
        hits: 0,  // Would need to track hits per namespace
        misses: 0, // Would need to track misses per namespace
      };
    }
    
    console.log('📊 Cache Stats by Namespace:');
    for (const [namespace, data] of Object.entries(stats)) {
      console.log(`  • ${namespace}: ${data.keys} keys, ${data.hits} hits, ${data.misses} misses`);
    }
    
    return stats;
  } catch (error) {
    console.error('❌ Error getting cache stats by namespace:', error);
    return stats;
  }
}

/**
 * Enhanced monitoring with namespace telemetry
 */
export async function monitorWithNamespaces(): Promise<MonitorSummary> {
  const summary = await monitor();
  
  // Also show namespace stats
  console.log('📊 Cache Namespace Telemetry:\n');
  await getCacheStatsByNamespace();
  console.log('');
  
  return summary;
}
