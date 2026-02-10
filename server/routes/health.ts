/**
 * Health and Quotas Monitoring Endpoint
 * Real-time visibility into FREE tier usage
 * 
 * CONFIGURATION MODE:
 * Returns config_pending status when no database is connected,
 * allowing the app to show a preview while waiting for Supabase configuration.
 */

import express from 'express';
import { cache } from '../lib/cache';
import { getUsageStats } from '../lib/limitMonitor';
import { db, isDatabaseConnected } from '../db';
import { sentryConfig, betterStackConfig, redisConfig, appSettings } from '../../shared/db-schema';
import { isSupabaseConfigured, getEffectiveSupabaseConfig } from '../lib/supabaseFileConfig';

const router = express.Router();

/**
 * GET /api/health
 * Basic health check - system-wide status without tenant-specific data
 * Returns config_pending when database is not connected
 */
router.get('/', async (req, res) => {
  try {
    const dbConnected = isDatabaseConnected();
    const supabaseConfigured = isSupabaseConfigured();
    const effectiveConfig = getEffectiveSupabaseConfig();
    
    if (!dbConnected) {
      const health = {
        status: 'config_pending',
        message: 'Aguardando configuração do Supabase. Acesse /configuracoes para configurar.',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: process.memoryUsage().heapUsed / 1024 / 1024,
          total: process.memoryUsage().heapTotal / 1024 / 1024,
          percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
        },
        configuration: {
          database: 'not_configured',
          supabase: supabaseConfigured ? 'configured' : 'not_configured',
          supabaseUrl: effectiveConfig?.url ? maskUrl(effectiveConfig.url) : null,
        },
        nextSteps: [
          '1. Acesse /configuracoes',
          '2. Configure as credenciais do Supabase',
          '3. Reinicie o servidor para conectar ao banco de dados',
        ],
      };
      
      return res.json(health);
    }
    
    let sentryCount: any[] = [];
    let betterStackCount: any[] = [];
    let redisCount: any[] = [];
    let settingsCount: any[] = [];
    
    try {
      sentryCount = await db!.select().from(sentryConfig);
      betterStackCount = await db!.select().from(betterStackConfig);
      redisCount = await db!.select().from(redisConfig);
      settingsCount = await db!.select().from(appSettings);
    } catch (dbError) {
      const errorMessage = (dbError as Error).message;
      const errorCause = (dbError as any)?.cause?.message || '';
      if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('connection') || 
          errorMessage.includes('Failed query') || errorCause.includes('ENOTFOUND')) {
        return res.json({
          status: 'database_error',
          message: 'DATABASE_URL inválida. Corrija a Connection String do Supabase.',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: {
            used: process.memoryUsage().heapUsed / 1024 / 1024,
            total: process.memoryUsage().heapTotal / 1024 / 1024,
            percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
          },
          configuration: {
            database: 'error',
            supabase_js: supabaseConfigured ? 'configured' : 'not_configured',
            supabaseUrl: effectiveConfig?.url ? maskUrl(effectiveConfig.url) : null,
          },
          error: 'DATABASE_URL hostname inválido. Use o formato: postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres',
          nextSteps: [
            '1. No Supabase Dashboard, vá em Settings → Database',
            '2. Copie a "Connection String" (URI)',
            '3. Atualize DATABASE_URL no Replit Secrets',
            '4. Reinicie o servidor',
          ],
        });
      }
      throw dbError;
    }
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed / 1024 / 1024,
        total: process.memoryUsage().heapTotal / 1024 / 1024,
        percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
      },
      integrations: {
        sentry: {
          configured: sentryCount.length > 0,
          status: sentryCount.length > 0 ? 'active' : 'not_configured',
        },
        betterStack: {
          configured: betterStackCount.length > 0,
          status: betterStackCount.length > 0 ? 'active' : 'not_configured',
        },
        redis: {
          configured: redisCount.length > 0,
          status: redisCount.length > 0 ? 'active' : 'not_configured',
        },
        supabase: {
          configured: settingsCount.length > 0 && settingsCount.some(s => s.supabaseUrl && s.supabaseAnonKey),
          status: settingsCount.some(s => s.supabaseUrl && s.supabaseAnonKey) ? 'active' : 'not_configured',
        },
      },
    };
    
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/health/quotas
 * Detailed quota usage for all services
 */
router.get('/quotas', async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.json({
        status: 'config_pending',
        message: 'Database not configured. Configure Supabase via /configuracoes',
        services: {},
      });
    }
    
    const usage = await getUsageStats();
    const cacheStats = await cache.getStats();
    
    const quotas = {
      timestamp: new Date().toISOString(),
      services: {
        redis: {
          name: 'Upstash Redis FREE',
          limit: usage.redis.monthlyLimit,
          used: usage.redis.commandsThisMonth,
          percentage: usage.redis.percentage,
          status: getStatus(usage.redis.percentage),
          period: 'monthly',
          month: usage.redis.month,
          commandsToday: usage.redis.commandsToday,
        },
        supabase: {
          name: 'Supabase FREE',
          limit: usage.supabase.limit,
          used: usage.supabase.bandwidthUsed,
          percentage: usage.supabase.percentage,
          status: getStatus(usage.supabase.percentage),
          limitFormatted: formatBytes(usage.supabase.limit),
          usedFormatted: formatBytes(usage.supabase.bandwidthUsed),
        },
        cache: {
          redisConnected: cacheStats.redisConnected,
          memoryKeys: cacheStats.memoryKeys,
          memoryStats: cacheStats.memoryStats,
        },
      },
      recommendations: getRecommendations(usage),
    };
    
    res.json(quotas);
  } catch (error) {
    console.error('Error fetching quotas:', error);
    res.status(500).json({ error: 'Failed to fetch quotas' });
  }
});

/**
 * GET /api/health/metrics
 * Prometheus-style metrics
 */
router.get('/metrics', async (req, res) => {
  if (!isDatabaseConnected()) {
    res.setHeader('Content-Type', 'text/plain');
    return res.send('# Database not configured - no metrics available');
  }
  
  const usage = await getUsageStats();
  const cacheStats = await cache.getStats();
  
  const metrics = `
# HELP redis_commands_monthly Redis commands used this month
# TYPE redis_commands_monthly gauge
redis_commands_monthly{tier="free"} ${usage.redis.commandsThisMonth}

# HELP redis_commands_today Redis commands used today
# TYPE redis_commands_today gauge
redis_commands_today{tier="free"} ${usage.redis.commandsToday}

# HELP redis_monthly_limit Redis monthly command limit
# TYPE redis_monthly_limit gauge
redis_monthly_limit{tier="free"} ${usage.redis.monthlyLimit}

# HELP supabase_bandwidth_bytes Supabase bandwidth used this month
# TYPE supabase_bandwidth_bytes gauge
supabase_bandwidth_bytes{tier="free"} ${usage.supabase.bandwidthUsed}

# HELP supabase_bandwidth_limit_bytes Supabase monthly bandwidth limit
# TYPE supabase_bandwidth_limit_bytes gauge
supabase_bandwidth_limit_bytes{tier="free"} ${usage.supabase.limit}

# HELP cache_memory_keys Number of keys in memory cache
# TYPE cache_memory_keys gauge
cache_memory_keys ${cacheStats.memoryKeys}

# HELP cache_redis_connected Redis connection status
# TYPE cache_redis_connected gauge
cache_redis_connected ${cacheStats.redisConnected ? 1 : 0}
`.trim();
  
  res.setHeader('Content-Type', 'text/plain');
  res.send(metrics);
});

/**
 * GET /api/health/sales-debug
 * Debug sales data - check reseller_ids and sales (dev only, no PII)
 * Only available in development or with admin session
 */
router.get('/sales-debug', async (req: any, res) => {
  try {
    // Restrict to development environment or authenticated admin
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    const isAdmin = req.session?.userRole === 'admin';
    
    if (!isDev && !isAdmin) {
      return res.status(403).json({ 
        error: 'Acesso restrito',
        message: 'Este endpoint só está disponível em ambiente de desenvolvimento ou para administradores autenticados'
      });
    }
    const fs = await import('fs');
    const path = await import('path');
    const { createClient } = await import('@supabase/supabase-js');
    
    const configPath = path.join(process.cwd(), 'data', 'supabase-config.json');
    if (!fs.existsSync(configPath)) {
      return res.json({ error: 'Supabase não configurado' });
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const supabaseUrl = config.url || config.supabaseUrl;
    const supabaseKey = config.serviceRoleKey || config.anonKey || config.supabaseAnonKey;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.json({ error: 'Credenciais incompletas' });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get sales count by reseller_id (no PII exposed)
    const { data: sales, error: salesError } = await supabase
      .from('sales_with_split')
      .select('reseller_id, status, pagarme_order_id, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    
    // Get all reseller_stores (no PII)
    const { data: stores, error: storesError } = await supabase
      .from('reseller_stores')
      .select('id, reseller_id, store_slug, is_published');
    
    // Get unique reseller_ids from sales
    const salesResellerIds = [...new Set((sales || []).map(s => s.reseller_id))];
    const storesResellerIds = [...new Set((stores || []).map(s => s.reseller_id))];
    
    // Count sales per reseller_id
    const salesCountByReseller: Record<string, number> = {};
    (sales || []).forEach(s => {
      salesCountByReseller[s.reseller_id] = (salesCountByReseller[s.reseller_id] || 0) + 1;
    });
    
    // Check specific sale by pagarme_order_id if query param provided
    const searchOrderId = req.query.order_id as string;
    let specificSale = null;
    if (searchOrderId) {
      const { data: foundSale } = await supabase
        .from('sales_with_split')
        .select('id, reseller_id, pagarme_order_id, total_amount, status, created_at')
        .eq('pagarme_order_id', searchOrderId)
        .maybeSingle();
      specificSale = foundSale;
    }
    
    // Get recent sales with pagarme_order_id
    const recentSalesWithOrderId = (sales || [])
      .filter(s => s.pagarme_order_id)
      .slice(0, 5)
      .map(s => ({ reseller_id: s.reseller_id, pagarme_order_id: s.pagarme_order_id, created_at: s.created_at }));
    
    res.json({
      specificSale,
      recentSalesWithOrderId,
      sales: {
        totalCount: sales?.length || 0,
        resellerIds: salesResellerIds,
        countByReseller: salesCountByReseller,
        error: salesError?.message
      },
      stores: {
        count: stores?.length || 0,
        resellerIds: storesResellerIds,
        items: (stores || []).map(s => ({ id: s.id, reseller_id: s.reseller_id, store_slug: s.store_slug, is_published: s.is_published })),
        error: storesError?.message
      },
      howToFix: {
        description: 'Se as vendas não aparecem, o reseller_id no login precisa corresponder ao usado nas vendas.',
        sqlMigration: 'Execute o SQL em /docs/SQL_MIGRATE_RESELLER_ID.sql para migrar os IDs',
        salesResellerIds,
        storesResellerIds
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/health/supabase-tables
 * Check if required tables exist in Supabase CLIENT database
 */
router.get('/supabase-tables', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { createClient } = await import('@supabase/supabase-js');
    
    const configPath = path.join(process.cwd(), 'data', 'supabase-config.json');
    if (!fs.existsSync(configPath)) {
      return res.json({
        status: 'not_configured',
        message: 'Supabase cliente não configurado',
        tables: []
      });
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const supabaseUrl = config.url || config.supabaseUrl;
    const supabaseKey = config.serviceRoleKey || config.anonKey || config.supabaseAnonKey;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.json({
        status: 'missing_credentials',
        message: 'Credenciais do Supabase cliente incompletas',
        configKeys: Object.keys(config),
        tables: []
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const requiredTables = [
      'sales_with_split',
      'reseller_stores',
      'products',
      'bank_accounts',
      'withdrawals',
      'commission_config'
    ];
    
    const tableStatus: { name: string; exists: boolean; count?: number; error?: string }[] = [];
    
    for (const tableName of requiredTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          tableStatus.push({
            name: tableName,
            exists: false,
            error: error.message
          });
        } else {
          tableStatus.push({
            name: tableName,
            exists: true,
            count: count || 0
          });
        }
      } catch (err: any) {
        tableStatus.push({
          name: tableName,
          exists: false,
          error: err.message
        });
      }
    }
    
    const allExist = tableStatus.every(t => t.exists);
    
    res.json({
      status: allExist ? 'ok' : 'missing_tables',
      message: allExist 
        ? 'Todas as tabelas necessárias existem' 
        : 'Algumas tabelas estão faltando. Execute o SQL de criação.',
      supabaseUrl: supabaseUrl.substring(0, 30) + '...',
      tables: tableStatus,
      sqlFile: '/docs/SQL_CREATE_SALES_TABLE.sql'
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host.substring(0, 8)}...`;
  } catch {
    return url.substring(0, 20) + '...';
  }
}

function getStatus(percentage: number): string {
  if (percentage >= 95) return 'critical';
  if (percentage >= 80) return 'warning';
  return 'ok';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getRecommendations(usage: any): string[] {
  const recommendations: string[] = [];
  
  if (usage.redis.percentage > 90) {
    recommendations.push('🔴 CRITICAL: Redis usage > 90%. Consider upgrading to paid plan or optimizing cache usage.');
  } else if (usage.redis.percentage > 80) {
    recommendations.push('🟡 WARNING: Redis usage > 80%. Increase cache TTL or reduce command frequency.');
  }
  
  if (usage.supabase.percentage > 90) {
    recommendations.push('🔴 CRITICAL: Supabase bandwidth > 90%. Enable Cloudflare cache and reduce API calls.');
  } else if (usage.supabase.percentage > 80) {
    recommendations.push('🟡 WARNING: Supabase bandwidth > 80%. Implement request batching and caching.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ All services within acceptable limits.');
  }
  
  return recommendations;
}

export default router;
