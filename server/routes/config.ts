/**
 * Configuration endpoints for new integrations
 * Redis, Sentry, Resend, Cloudflare, Better Stack
 */

import type { Express } from "express";
import { db } from "../db";
import { 
  redisConfig, 
  sentryConfig, 
  resendConfig, 
  cloudflareConfig, 
  betterStackConfig,
  bigdatacorpConfig,
  supabaseMasterConfig,
  cacheConfig,
  optimizerConfig,
  monitoringConfig,
  appSettings,
  supabaseConfig,
  hms100msConfig
} from "../../shared/db-schema";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from '../lib/credentialsManager';
import { authenticateConfig, AuthRequest } from '../middleware/configAuth';
import { createRateLimiter } from '../middleware/rateLimiter';
import { authenticateToken } from '../middleware/auth';
import { 
  saveSupabaseFileConfig, 
  getEffectiveSupabaseConfig,
  getSupabaseFileConfig 
} from '../lib/supabaseFileConfig';
import axios from 'axios';
import Redis from 'ioredis';

export function setupConfigRoutes(app: Express) {
  
  // Rate limiter específico para config (30 req/min para evitar abuso)
  const configLimiter = createRateLimiter({
    windowMs: 60000, // 1 minuto
    max: 30,
    message: 'Muitas requisições de configuração. Tente novamente em 1 minuto.',
    keyGenerator: (req) => `config:${req.ip}:${req.path}`,
  });
  
  // ===== REDIS CONFIGURATION =====
  
  app.get("/api/config/redis", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(redisConfig)
        .where(eq(redisConfig.tenantId, tenantId))
        .limit(1);
      
      if (configFromDb[0]) {
        return res.json({
          configured: true,
          createdAt: configFromDb[0].createdAt,
          updatedAt: configFromDb[0].updatedAt,
        });
      }
      
      return res.json({
        configured: false,
      });
    } catch (error) {
      console.error("Erro ao buscar configuração do Redis:", error);
      return res.json({
        configured: false,
      });
    }
  });

  app.get("/api/config/redis/credentials", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(redisConfig)
        .where(eq(redisConfig.tenantId, tenantId))
        .limit(1);
      
      if (configFromDb[0]) {
        const decryptedUrl = decrypt(configFromDb[0].redisUrl);
        const decryptedToken = configFromDb[0].redisToken ? decrypt(configFromDb[0].redisToken) : null;
        
        return res.json({
          success: true,
          credentials: {
            url: decryptedUrl,
            token: decryptedToken,
          }
        });
      }
      
      return res.status(404).json({
        success: false,
        error: "Credenciais não encontradas"
      });
    } catch (error) {
      console.error("Erro ao buscar credenciais do Redis:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao buscar credenciais",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });
  
  app.post("/api/config/redis", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      let { redisUrl, redisToken } = req.body;
      const tenantId = req.user!.tenantId;
      
      if (!redisUrl) {
        return res.status(400).json({
          error: "redisUrl é obrigatório",
        });
      }
      
      // Limpar URL se usuário colou o comando CLI completo do Upstash
      // Exemplo: "redis-cli --tls -u redis://..." → "redis://..."
      if (redisUrl.includes('redis-cli')) {
        const match = redisUrl.match(/redis:\/\/[^\s]+/);
        if (match) {
          redisUrl = match[0];
          console.log('✅ URL do Redis limpa automaticamente:', redisUrl.replace(/:[^:]*@/, ':***@'));
        }
      }
      
      // Validar formato da URL
      if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
        return res.status(400).json({
          error: "URL do Redis inválida. Deve começar com redis:// ou rediss://",
        });
      }
      
      const encryptedUrl = encrypt(redisUrl);
      const encryptedToken = redisToken ? encrypt(redisToken) : null;
      
      const existingConfig = await db.select().from(redisConfig)
        .where(eq(redisConfig.tenantId, tenantId))
        .limit(1);
      
      if (existingConfig[0]) {
        await db
          .update(redisConfig)
          .set({
            redisUrl: encryptedUrl,
            redisToken: encryptedToken,
            updatedAt: new Date(),
          })
          .where(and(
            eq(redisConfig.id, existingConfig[0].id),
            eq(redisConfig.tenantId, tenantId)
          ));
        
        console.log(`✅ Configuração do Redis atualizada para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais atualizadas com sucesso",
        });
      } else {
        await db.insert(redisConfig).values({
          tenantId,
          redisUrl: encryptedUrl,
          redisToken: encryptedToken,
        });
        
        console.log(`✅ Configuração do Redis salva para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais salvas com sucesso",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do Redis:", error);
      return res.status(500).json({
        error: "Erro ao salvar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  app.post("/api/config/redis/test", async (req, res) => {
    try {
      const { redisUrl, redisToken } = req.body;
      
      if (!redisUrl) {
        return res.status(400).json({
          success: false,
          error: "redisUrl é obrigatório",
        });
      }
      
      // Validate URL format
      if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
        return res.status(400).json({
          success: false,
          error: "URL do Redis inválida. Deve começar com redis:// ou rediss://",
        });
      }
      
      // Test connection with a temporary Redis instance
      const redisConfig: any = {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        connectTimeout: 5000,
        retryStrategy: () => null, // Don't retry on test
      };
      
      // Enable TLS if URL uses rediss:// or is Upstash
      const isSecure = redisUrl.startsWith('rediss://') || redisUrl.includes('upstash.io');
      if (isSecure) {
        redisConfig.tls = {
          rejectUnauthorized: true
        };
      }
      
      const testRedis = new Redis(redisUrl, redisConfig);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          testRedis.disconnect();
          resolve(res.status(408).json({
            success: false,
            error: "Timeout ao conectar no Redis. Verifique a URL e tente novamente.",
          }));
        }, 5000);
        
        testRedis.on('error', (err: Error) => {
          clearTimeout(timeout);
          testRedis.disconnect();
          console.error('Erro ao testar Redis:', err);
          resolve(res.status(400).json({
            success: false,
            error: `Erro ao conectar: ${err.message}`,
          }));
        });
        
        testRedis.on('connect', async () => {
          try {
            // Try PING command
            const pong = await testRedis.ping();
            clearTimeout(timeout);
            testRedis.disconnect();
            
            if (pong === 'PONG') {
              resolve(res.json({
                success: true,
                message: "Conexão com Redis estabelecida com sucesso! ✅",
                connected: true,
              }));
            } else {
              resolve(res.status(400).json({
                success: false,
                error: "Redis respondeu mas PING falhou",
              }));
            }
          } catch (pingError) {
            clearTimeout(timeout);
            testRedis.disconnect();
            resolve(res.status(400).json({
              success: false,
              error: `Erro ao fazer PING: ${pingError instanceof Error ? pingError.message : 'Erro desconhecido'}`,
            }));
          }
        });
      });
    } catch (error) {
      console.error("Erro ao testar configuração do Redis:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao testar conexão",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  app.get("/api/config/redis/telemetry", async (req, res) => {
    try {
      const { cache } = await import('../lib/cache');
      const stats = await cache.getStats();
      
      // Calculate metrics
      const totalCommands = stats.redis.commandsThisMonth || 0;
      const limit = 500000; // Upstash Free Tier limit
      const usagePercent = Math.min((totalCommands / limit) * 100, 100);
      
      // Get Redis INFO if connected
      let storageUsedKB = 0;
      let hitRate = 0;
      
      if (stats.redisConnected) {
        try {
          // Try to get detailed stats from cache implementation
          const memStats = stats.memoryStats;
          hitRate = memStats && memStats.hits && memStats.misses
            ? (memStats.hits / (memStats.hits + memStats.misses)) * 100
            : 0;
        } catch (err) {
          console.log('Não foi possível calcular hit rate:', err);
        }
      }
      
      return res.json({
        success: true,
        telemetry: {
          totalCommands,
          limit,
          usagePercent: parseFloat(usagePercent.toFixed(2)),
          hitRate: parseFloat(hitRate.toFixed(2)),
          storageUsedKB,
          storageLimit: 262144, // 256 MB in KB
          redisConnected: stats.redisConnected,
          monthKey: stats.redis.monthKey,
        },
      });
    } catch (error) {
      console.error("Erro ao buscar telemetria do Redis:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao buscar telemetria",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  app.post("/api/config/redis/migrate", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      // Check if REDIS_URL exists in environment (Replit Secrets)
      const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
      const redisToken = process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_TOKEN;
      
      if (!redisUrl) {
        return res.status(404).json({
          success: false,
          error: "Nenhuma credencial Redis encontrada nos Secrets",
        });
      }
      
      // Encrypt and save to database
      const encryptedUrl = encrypt(redisUrl);
      const encryptedToken = redisToken ? encrypt(redisToken) : null;
      
      const existingConfig = await db.select().from(redisConfig)
        .where(eq(redisConfig.tenantId, tenantId))
        .limit(1);
      
      if (existingConfig[0]) {
        await db
          .update(redisConfig)
          .set({
            redisUrl: encryptedUrl,
            redisToken: encryptedToken,
            updatedAt: new Date(),
          })
          .where(and(
            eq(redisConfig.id, existingConfig[0].id),
            eq(redisConfig.tenantId, tenantId)
          ));
      } else {
        await db.insert(redisConfig).values({
          tenantId,
          redisUrl: encryptedUrl,
          redisToken: encryptedToken,
        });
      }
      
      console.log(`✅ Credenciais Redis migradas para tenant ${tenantId}`);
      
      return res.json({
        success: true,
        message: "Credenciais migradas com sucesso! Agora você pode remover REDIS_URL dos Secrets.",
      });
    } catch (error) {
      console.error("Erro ao migrar configuração do Redis:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao migrar credenciais",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // ===== SENTRY CONFIGURATION =====
  
  app.get("/api/config/sentry", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(sentryConfig)
        .where(eq(sentryConfig.tenantId, tenantId))
        .limit(1);
      
      if (configFromDb[0]) {
        let dsn = configFromDb[0].dsn;
        
        // Try to decrypt if encrypted, otherwise use plain value
        try {
          dsn = decrypt(dsn);
        } catch {
          // If decrypt fails, assume it's plain text (from env vars)
          // This happens when credentials are initialized from environment
        }
        
        return res.json({
          configured: true,
          dsn: dsn,
          environment: configFromDb[0].environment || 'production',
          tracesSampleRate: configFromDb[0].tracesSampleRate || '0.1',
          createdAt: configFromDb[0].createdAt,
          updatedAt: configFromDb[0].updatedAt,
        });
      }
      
      return res.json({
        configured: false,
      });
    } catch (error) {
      console.error("Erro ao buscar configuração do Sentry:", error);
      return res.status(500).json({
        configured: false,
        error: "Erro ao buscar configuração do Sentry"
      });
    }
  });

  app.get("/api/config/sentry/credentials", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(sentryConfig)
        .where(eq(sentryConfig.tenantId, tenantId))
        .limit(1);
      
      if (configFromDb[0]) {
        const decryptedDsn = decrypt(configFromDb[0].dsn);
        const decryptedToken = configFromDb[0].authToken ? decrypt(configFromDb[0].authToken) : null;
        
        return res.json({
          success: true,
          credentials: {
            dsn: decryptedDsn,
            authToken: decryptedToken,
            organization: configFromDb[0].organization,
            project: configFromDb[0].project,
            environment: configFromDb[0].environment,
            tracesSampleRate: configFromDb[0].tracesSampleRate,
          }
        });
      }
      
      return res.status(404).json({
        success: false,
        error: "Credenciais não encontradas"
      });
    } catch (error) {
      console.error("Erro ao buscar credenciais do Sentry:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao buscar credenciais",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });
  
  app.post("/api/config/sentry", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const { dsn, authToken, organization, project, environment, tracesSampleRate } = req.body;
      const tenantId = req.user!.tenantId;
      
      if (!dsn) {
        return res.status(400).json({
          error: "DSN é obrigatório",
        });
      }
      
      const encryptedDsn = encrypt(dsn);
      const encryptedToken = authToken ? encrypt(authToken) : null;
      
      const existingConfig = await db.select().from(sentryConfig)
        .where(eq(sentryConfig.tenantId, tenantId))
        .limit(1);
      
      if (existingConfig[0]) {
        await db
          .update(sentryConfig)
          .set({
            dsn: encryptedDsn,
            authToken: encryptedToken,
            organization: organization || null,
            project: project || null,
            environment: environment || 'production',
            tracesSampleRate: tracesSampleRate || '0.1',
            updatedAt: new Date(),
          })
          .where(and(
            eq(sentryConfig.id, existingConfig[0].id),
            eq(sentryConfig.tenantId, tenantId)
          ));
        
        console.log(`✅ Configuração do Sentry atualizada para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais atualizadas com sucesso",
        });
      } else {
        await db.insert(sentryConfig).values({
          tenantId,
          dsn: encryptedDsn,
          authToken: encryptedToken,
          organization: organization || null,
          project: project || null,
          environment: environment || 'production',
          tracesSampleRate: tracesSampleRate || '0.1',
        });
        
        console.log(`✅ Configuração do Sentry salva para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais salvas com sucesso",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do Sentry:", error);
      return res.status(500).json({
        error: "Erro ao salvar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // ===== RESEND CONFIGURATION =====
  
  app.get("/api/config/resend", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(resendConfig)
        .where(eq(resendConfig.tenantId, tenantId))
        .limit(1);
      
      if (configFromDb[0]) {
        return res.json({
          configured: true,
          fromEmail: configFromDb[0].fromEmail,
          createdAt: configFromDb[0].createdAt,
          updatedAt: configFromDb[0].updatedAt,
        });
      }
      
      return res.json({
        configured: false,
      });
    } catch (error) {
      console.error("Erro ao buscar configuração do Resend:", error);
      return res.json({
        configured: false,
      });
    }
  });

  app.get("/api/config/resend/credentials", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(resendConfig)
        .where(eq(resendConfig.tenantId, tenantId))
        .limit(1);
      
      if (configFromDb[0]) {
        const decryptedApiKey = decrypt(configFromDb[0].apiKey);
        
        return res.json({
          success: true,
          credentials: {
            apiKey: decryptedApiKey,
            fromEmail: configFromDb[0].fromEmail,
          }
        });
      }
      
      return res.status(404).json({
        success: false,
        error: "Credenciais não encontradas"
      });
    } catch (error) {
      console.error("Erro ao buscar credenciais do Resend:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao buscar credenciais",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });
  
  app.post("/api/config/resend", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const { apiKey, fromEmail } = req.body;
      const tenantId = req.user!.tenantId;
      
      if (!apiKey || !fromEmail) {
        return res.status(400).json({
          error: "apiKey e fromEmail são obrigatórios",
        });
      }
      
      const encryptedApiKey = encrypt(apiKey);
      
      const existingConfig = await db.select().from(resendConfig)
        .where(eq(resendConfig.tenantId, tenantId))
        .limit(1);
      
      if (existingConfig[0]) {
        await db
          .update(resendConfig)
          .set({
            apiKey: encryptedApiKey,
            fromEmail,
            updatedAt: new Date(),
          })
          .where(and(
            eq(resendConfig.id, existingConfig[0].id),
            eq(resendConfig.tenantId, tenantId)
          ));
        
        console.log(`✅ Configuração do Resend atualizada para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais atualizadas com sucesso",
        });
      } else {
        await db.insert(resendConfig).values({
          tenantId,
          apiKey: encryptedApiKey,
          fromEmail,
        });
        
        console.log(`✅ Configuração do Resend salva para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais salvas com sucesso",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do Resend:", error);
      return res.status(500).json({
        error: "Erro ao salvar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // ===== HMS 100MS CONFIGURATION =====

  app.get("/api/config/hms100ms", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(hms100msConfig)
        .where(eq(hms100msConfig.tenantId, tenantId))
        .limit(1);

      if (configFromDb[0]) {
        return res.json({
          configured: true,
          templateId: configFromDb[0].templateId,
          createdAt: configFromDb[0].createdAt,
          updatedAt: configFromDb[0].updatedAt,
        });
      }

      return res.json({
        configured: false,
      });
    } catch (error) {
      console.error("Erro ao buscar configuração do HMS 100ms:", error);
      return res.json({
        configured: false,
      });
    }
  });

  app.get("/api/config/hms100ms/credentials", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(hms100msConfig)
        .where(eq(hms100msConfig.tenantId, tenantId))
        .limit(1);

      if (configFromDb[0]) {
        const decryptedAccessKey = decrypt(configFromDb[0].appAccessKey);
        const decryptedSecret = decrypt(configFromDb[0].appSecret);

        return res.json({
          success: true,
          credentials: {
            appAccessKey: decryptedAccessKey,
            appSecret: decryptedSecret,
            templateId: configFromDb[0].templateId,
          }
        });
      }

      return res.status(404).json({
        success: false,
        error: "Credenciais não encontradas"
      });
    } catch (error) {
      console.error("Erro ao buscar credenciais do HMS 100ms:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao buscar credenciais",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  app.post("/api/config/hms100ms", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const { appAccessKey, appSecret, templateId } = req.body;
      const tenantId = req.user!.tenantId;

      if (!appAccessKey || !appSecret) {
        return res.status(400).json({
          error: "appAccessKey e appSecret são obrigatórios",
        });
      }

      const encryptedAccessKey = encrypt(appAccessKey);
      const encryptedSecret = encrypt(appSecret);

      const existingConfig = await db.select().from(hms100msConfig)
        .where(eq(hms100msConfig.tenantId, tenantId))
        .limit(1);

      if (existingConfig[0]) {
        await db
          .update(hms100msConfig)
          .set({
            appAccessKey: encryptedAccessKey,
            appSecret: encryptedSecret,
            templateId: templateId || null,
            updatedAt: new Date(),
          })
          .where(and(
            eq(hms100msConfig.id, existingConfig[0].id),
            eq(hms100msConfig.tenantId, tenantId)
          ));

        console.log(`✅ Configuração do HMS 100ms atualizada para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais atualizadas com sucesso",
        });
      } else {
        await db.insert(hms100msConfig).values({
          tenantId,
          appAccessKey: encryptedAccessKey,
          appSecret: encryptedSecret,
          templateId: templateId || null,
        });

        console.log(`✅ Configuração do HMS 100ms salva para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais salvas com sucesso",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do HMS 100ms:", error);
      return res.status(500).json({
        error: "Erro ao salvar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  app.post("/api/config/hms100ms/test", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const { appAccessKey, appSecret } = req.body;

      if (!appAccessKey || !appSecret) {
        return res.status(400).json({
          success: false,
          error: "appAccessKey e appSecret são obrigatórios",
        });
      }

      // Test by trying to generate a management token
      try {
        const { generateManagementToken } = await import('../services/meetings/hms100ms');
        const token = generateManagementToken(appAccessKey, appSecret);
        
        // Try a simple API call to validate
        await axios.get('https://api.100ms.live/v2/rooms', {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 1 }
        });

        return res.json({
          success: true,
          message: "Conexão com 100ms validada com sucesso! ✅",
        });
      } catch (apiError: any) {
        console.error('Erro ao testar 100ms:', apiError.response?.data || apiError.message);
        return res.status(400).json({
          success: false,
          error: `Falha na validação: ${apiError.response?.data?.message || apiError.message}`,
        });
      }
    } catch (error) {
      console.error("Erro ao testar HMS 100ms:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao testar conexão",
      });
    }
  });

  app.post("/api/config/hms100ms", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const { appAccessKey, appSecret, templateId } = req.body;
      const tenantId = req.user!.tenantId;

      if (!appAccessKey || !appSecret) {
        return res.status(400).json({
          error: "appAccessKey e appSecret são obrigatórios",
        });
      }

      const encryptedKey = encrypt(appAccessKey);
      const encryptedSecret = encrypt(appSecret);

      const existingConfig = await db.select().from(hms100msConfig)
        .where(eq(hms100msConfig.tenantId, tenantId))
        .limit(1);

      if (existingConfig[0]) {
        await db
          .update(hms100msConfig)
          .set({
            appAccessKey: encryptedKey,
            appSecret: encryptedSecret,
            templateId: templateId || null,
            updatedAt: new Date(),
          })
          .where(and(
            eq(hms100msConfig.id, existingConfig[0].id),
            eq(hms100msConfig.tenantId, tenantId)
          ));

        console.log(`✅ Configuração do HMS 100ms atualizada para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais atualizadas com sucesso",
        });
      } else {
        await db.insert(hms100msConfig).values({
          tenantId,
          appAccessKey: encryptedKey,
          appSecret: encryptedSecret,
          templateId: templateId || null,
        });

        console.log(`✅ Configuração do HMS 100ms salva para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais salvas com sucesso",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do HMS 100ms:", error);
      return res.status(500).json({
        error: "Erro ao salvar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  app.post("/api/config/hms100ms/test", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const { appAccessKey, appSecret } = req.body;

      if (!appAccessKey || !appSecret) {
        return res.status(400).json({
          success: false,
          error: "appAccessKey e appSecret são obrigatórios",
        });
      }

      // Simple validation by trying to generate a management token
      // In a real scenario, we could call an HMS API endpoint
      try {
        const { gerarTokenParticipante } = await import('../services/meetings/hms100ms');
        // If this doesn't throw, credentials format is likely okay
        gerarTokenParticipante("test-room", "test-user", "host", appAccessKey, appSecret);

        return res.json({
          success: true,
          message: "Credenciais do 100ms validadas com sucesso! ✅",
        });
      } catch (err: any) {
        return res.status(400).json({
          success: false,
          error: `Erro ao validar credenciais: ${err.message}`,
        });
      }
    } catch (error) {
      console.error("Erro ao testar configuração do HMS 100ms:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao testar conexão",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // ===== CLOUDFLARE CONFIGURATION =====
  
  app.get("/api/config/cloudflare", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(cloudflareConfig)
        .where(eq(cloudflareConfig.tenantId, tenantId))
        .limit(1);
      
      if (configFromDb[0]) {
        return res.json({
          configured: true,
          createdAt: configFromDb[0].createdAt,
          updatedAt: configFromDb[0].updatedAt,
        });
      }
      
      return res.json({
        configured: false,
      });
    } catch (error) {
      console.error("Erro ao buscar configuração do Cloudflare:", error);
      return res.json({
        configured: false,
      });
    }
  });

  app.get("/api/config/cloudflare/credentials", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(cloudflareConfig)
        .where(eq(cloudflareConfig.tenantId, tenantId))
        .limit(1);
      
      if (configFromDb[0]) {
        const decryptedZoneId = decrypt(configFromDb[0].zoneId);
        const decryptedApiToken = decrypt(configFromDb[0].apiToken);
        
        return res.json({
          success: true,
          credentials: {
            zoneId: decryptedZoneId,
            apiToken: decryptedApiToken,
          }
        });
      }
      
      return res.status(404).json({
        success: false,
        error: "Credenciais não encontradas"
      });
    } catch (error) {
      console.error("Erro ao buscar credenciais do Cloudflare:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao buscar credenciais",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });
  
  app.post("/api/config/cloudflare", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const { zoneId, apiToken } = req.body;
      const tenantId = req.user!.tenantId;
      
      if (!zoneId || !apiToken) {
        return res.status(400).json({
          error: "zoneId e apiToken são obrigatórios",
        });
      }
      
      const encryptedZoneId = encrypt(zoneId);
      const encryptedApiToken = encrypt(apiToken);
      
      const existingConfig = await db.select().from(cloudflareConfig)
        .where(eq(cloudflareConfig.tenantId, tenantId))
        .limit(1);
      
      if (existingConfig[0]) {
        await db
          .update(cloudflareConfig)
          .set({
            zoneId: encryptedZoneId,
            apiToken: encryptedApiToken,
            updatedAt: new Date(),
          })
          .where(and(
            eq(cloudflareConfig.id, existingConfig[0].id),
            eq(cloudflareConfig.tenantId, tenantId)
          ));
        
        console.log(`✅ Configuração do Cloudflare atualizada para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais atualizadas com sucesso",
        });
      } else {
        await db.insert(cloudflareConfig).values({
          tenantId,
          zoneId: encryptedZoneId,
          apiToken: encryptedApiToken,
        });
        
        console.log(`✅ Configuração do Cloudflare salva para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais salvas com sucesso",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do Cloudflare:", error);
      return res.status(500).json({
        error: "Erro ao salvar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // ===== BETTER STACK CONFIGURATION =====
  
  app.get("/api/config/better-stack", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(betterStackConfig)
        .where(eq(betterStackConfig.tenantId, tenantId))
        .limit(1);
      
      if (configFromDb[0]) {
        return res.json({
          configured: true,
          createdAt: configFromDb[0].createdAt,
          updatedAt: configFromDb[0].updatedAt,
        });
      }
      
      return res.json({
        configured: false,
      });
    } catch (error) {
      console.error("Erro ao buscar configuração do Better Stack:", error);
      return res.json({
        configured: false,
      });
    }
  });

  app.get("/api/config/better-stack/credentials", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(betterStackConfig)
        .where(eq(betterStackConfig.tenantId, tenantId))
        .limit(1);
      
      if (configFromDb[0]) {
        const decryptedToken = decrypt(configFromDb[0].sourceToken);
        
        return res.json({
          success: true,
          credentials: {
            sourceToken: decryptedToken,
            ingestingHost: configFromDb[0].ingestingHost || 'in.logs.betterstack.com',
          }
        });
      }
      
      return res.status(404).json({
        success: false,
        error: "Credenciais não encontradas"
      });
    } catch (error) {
      console.error("Erro ao buscar credenciais do Better Stack:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao buscar credenciais",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });
  
  app.post("/api/config/better-stack", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const { sourceToken, ingestingHost } = req.body;
      const tenantId = req.user!.tenantId;
      
      if (!sourceToken) {
        return res.status(400).json({
          error: "sourceToken é obrigatório",
        });
      }
      
      const encryptedToken = encrypt(sourceToken);
      const hostToUse = ingestingHost || "in.logs.betterstack.com";
      
      const existingConfig = await db.select().from(betterStackConfig)
        .where(eq(betterStackConfig.tenantId, tenantId))
        .limit(1);
      
      if (existingConfig[0]) {
        await db
          .update(betterStackConfig)
          .set({
            sourceToken: encryptedToken,
            ingestingHost: hostToUse,
            updatedAt: new Date(),
          })
          .where(and(
            eq(betterStackConfig.id, existingConfig[0].id),
            eq(betterStackConfig.tenantId, tenantId)
          ));
        
        console.log(`✅ Configuração do Better Stack atualizada para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais atualizadas com sucesso",
        });
      } else {
        await db.insert(betterStackConfig).values({
          tenantId,
          sourceToken: encryptedToken,
          ingestingHost: hostToUse,
        });
        
        console.log(`✅ Configuração do Better Stack salva para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais salvas com sucesso",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do Better Stack:", error);
      return res.status(500).json({
        error: "Erro ao salvar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // ===== BIGDATACORP CONFIGURATION (CPF Consultation) =====

  app.get("/api/config/bigdatacorp", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(bigdatacorpConfig)
        .where(eq(bigdatacorpConfig.tenantId, tenantId))
        .limit(1);
      
      if (configFromDb[0]) {
        return res.json({
          configured: true,
          createdAt: configFromDb[0].createdAt,
          updatedAt: configFromDb[0].updatedAt,
        });
      }
      
      return res.json({
        configured: false,
      });
    } catch (error) {
      console.error("Erro ao buscar configuração do BigDataCorp:", error);
      return res.json({
        configured: false,
      });
    }
  });

  app.get("/api/config/bigdatacorp/credentials", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(bigdatacorpConfig)
        .where(eq(bigdatacorpConfig.tenantId, tenantId))
        .limit(1);
      
      if (configFromDb[0]) {
        return res.json({
          success: true,
          credentials: {
            tokenId: decrypt(configFromDb[0].tokenId),
            chaveToken: decrypt(configFromDb[0].chaveToken),
            supabaseMasterUrl: configFromDb[0].supabaseMasterUrl ? decrypt(configFromDb[0].supabaseMasterUrl) : null,
            supabaseMasterServiceRoleKey: configFromDb[0].supabaseMasterServiceRoleKey ? decrypt(configFromDb[0].supabaseMasterServiceRoleKey) : null,
          }
        });
      }
      
      return res.status(404).json({
        success: false,
        error: "Credenciais não encontradas"
      });
    } catch (error) {
      console.error("Erro ao buscar credenciais do BigDataCorp:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao buscar credenciais",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  app.post("/api/config/bigdatacorp", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const { tokenId, chaveToken, supabaseMasterUrl, supabaseMasterServiceRoleKey } = req.body;
      const tenantId = req.user!.tenantId;
      
      if (!tokenId || !chaveToken) {
        return res.status(400).json({
          error: "tokenId e chaveToken são obrigatórios",
        });
      }
      
      const encryptedTokenId = encrypt(tokenId);
      const encryptedChaveToken = encrypt(chaveToken);
      const encryptedMasterUrl = supabaseMasterUrl ? encrypt(supabaseMasterUrl) : null;
      const encryptedMasterKey = supabaseMasterServiceRoleKey ? encrypt(supabaseMasterServiceRoleKey) : null;
      
      const existingConfig = await db.select().from(bigdatacorpConfig)
        .where(eq(bigdatacorpConfig.tenantId, tenantId))
        .limit(1);
      
      if (existingConfig[0]) {
        await db
          .update(bigdatacorpConfig)
          .set({
            tokenId: encryptedTokenId,
            chaveToken: encryptedChaveToken,
            supabaseMasterUrl: encryptedMasterUrl,
            supabaseMasterServiceRoleKey: encryptedMasterKey,
            updatedAt: new Date(),
          })
          .where(and(
            eq(bigdatacorpConfig.id, existingConfig[0].id),
            eq(bigdatacorpConfig.tenantId, tenantId)
          ));
        
        console.log(`✅ Configuração do BigDataCorp atualizada para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais atualizadas com sucesso",
        });
      } else {
        await db.insert(bigdatacorpConfig).values({
          tenantId,
          tokenId: encryptedTokenId,
          chaveToken: encryptedChaveToken,
          supabaseMasterUrl: encryptedMasterUrl,
          supabaseMasterServiceRoleKey: encryptedMasterKey,
        });
        
        console.log(`✅ Configuração do BigDataCorp salva para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais salvas com sucesso",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do BigDataCorp:", error);
      return res.status(500).json({
        error: "Erro ao salvar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  app.post("/api/config/bigdatacorp/test", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const { tokenId, chaveToken } = req.body;
      
      if (!tokenId || !chaveToken) {
        return res.status(400).json({
          success: false,
          error: "tokenId e chaveToken são obrigatórios",
        });
      }
      
      const testResponse = await axios.post(
        'https://plataforma.bigdatacorp.com.br/pessoas',
        {
          Datasets: 'basic_data',
          q: 'doc{00000000000}'
        },
        {
          headers: {
            AccessToken: chaveToken,
            TokenId: tokenId,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 10000,
        }
      );
      
      if (testResponse.data && testResponse.data.Status) {
        return res.json({
          success: true,
          message: "Conexão com BigDataCorp estabelecida com sucesso! ✅",
          connected: true,
        });
      }
      
      return res.status(400).json({
        success: false,
        error: "Resposta inválida da API BigDataCorp",
      });
    } catch (error: any) {
      console.error("Erro ao testar BigDataCorp:", error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        return res.status(401).json({
          success: false,
          error: "Credenciais inválidas. Verifique TOKEN_ID e CHAVE_TOKEN.",
        });
      }
      
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao testar conexão",
      });
    }
  });

  // ===== SUPABASE MASTER CONFIGURATION =====
  
  app.get("/api/config/supabase-master", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(supabaseMasterConfig)
        .where(eq(supabaseMasterConfig.tenantId, tenantId))
        .limit(1);
      
      if (configFromDb[0]) {
        return res.json({
          configured: true,
          createdAt: configFromDb[0].createdAt,
          updatedAt: configFromDb[0].updatedAt,
        });
      }
      
      // Fallback: check environment variables
      if (process.env.SUPABASE_MASTER_URL && process.env.SUPABASE_MASTER_SERVICE_ROLE_KEY) {
        return res.json({
          configured: true,
          source: 'environment',
        });
      }
      
      return res.json({
        configured: false,
      });
    } catch (error) {
      console.error("Erro ao buscar configuração do Supabase Master:", error);
      return res.json({
        configured: false,
      });
    }
  });

  app.get("/api/config/supabase-master/credentials", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(supabaseMasterConfig)
        .where(eq(supabaseMasterConfig.tenantId, tenantId))
        .limit(1);
      
      if (configFromDb[0]) {
        const decryptedUrl = decrypt(configFromDb[0].supabaseMasterUrl);
        const decryptedKey = decrypt(configFromDb[0].supabaseMasterServiceRoleKey);
        
        return res.json({
          success: true,
          credentials: {
            url: decryptedUrl,
            serviceRoleKey: decryptedKey,
          },
          source: 'database'
        });
      }
      
      // Fallback to environment variables
      if (process.env.SUPABASE_MASTER_URL && process.env.SUPABASE_MASTER_SERVICE_ROLE_KEY) {
        return res.json({
          success: true,
          credentials: {
            url: process.env.SUPABASE_MASTER_URL,
            serviceRoleKey: '********', // Don't expose env secrets
          },
          source: 'environment'
        });
      }
      
      return res.status(404).json({
        success: false,
        error: "Credenciais não encontradas"
      });
    } catch (error) {
      console.error("Erro ao buscar credenciais do Supabase Master:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao buscar credenciais",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });
  
  app.post("/api/config/supabase-master", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const { supabaseMasterUrl, supabaseMasterServiceRoleKey } = req.body;
      const tenantId = req.user!.tenantId;
      
      if (!supabaseMasterUrl || !supabaseMasterServiceRoleKey) {
        return res.status(400).json({
          error: "URL e Service Role Key são obrigatórios",
        });
      }
      
      // Validate URL format
      if (!supabaseMasterUrl.includes('supabase.co') && !supabaseMasterUrl.includes('supabase.in')) {
        return res.status(400).json({
          error: "URL do Supabase inválida. Deve ser uma URL do Supabase.",
        });
      }
      
      const encryptedUrl = encrypt(supabaseMasterUrl);
      const encryptedKey = encrypt(supabaseMasterServiceRoleKey);
      
      const existingConfig = await db.select().from(supabaseMasterConfig)
        .where(eq(supabaseMasterConfig.tenantId, tenantId))
        .limit(1);
      
      if (existingConfig[0]) {
        await db
          .update(supabaseMasterConfig)
          .set({
            supabaseMasterUrl: encryptedUrl,
            supabaseMasterServiceRoleKey: encryptedKey,
            updatedAt: new Date(),
          })
          .where(and(
            eq(supabaseMasterConfig.id, existingConfig[0].id),
            eq(supabaseMasterConfig.tenantId, tenantId)
          ));
        
        console.log(`✅ Configuração do Supabase Master atualizada para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais atualizadas com sucesso",
        });
      } else {
        await db.insert(supabaseMasterConfig).values({
          tenantId,
          supabaseMasterUrl: encryptedUrl,
          supabaseMasterServiceRoleKey: encryptedKey,
        });
        
        console.log(`✅ Configuração do Supabase Master salva para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais salvas com sucesso",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do Supabase Master:", error);
      return res.status(500).json({
        error: "Erro ao salvar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  app.post("/api/config/supabase-master/test", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const { supabaseMasterUrl, supabaseMasterServiceRoleKey } = req.body;
      
      if (!supabaseMasterUrl || !supabaseMasterServiceRoleKey) {
        return res.status(400).json({
          success: false,
          error: "URL e Service Role Key são obrigatórios",
        });
      }
      
      // Test connection by attempting to create a Supabase client and query
      const { createClient } = await import('@supabase/supabase-js');
      const testClient = createClient(supabaseMasterUrl, supabaseMasterServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      
      // Try a simple query to verify connection
      const { error } = await testClient.from('datacorp_checks').select('id').limit(1);
      
      if (error && !error.message.includes('does not exist')) {
        // If table doesn't exist, that's okay - connection works
        if (error.code === 'PGRST116' || error.code === '42P01') {
          return res.json({
            success: true,
            message: "Conexão com Supabase Master estabelecida! ✅ (Tabela datacorp_checks não encontrada, mas conexão OK)",
            connected: true,
          });
        }
        
        return res.status(400).json({
          success: false,
          error: `Erro ao conectar: ${error.message}`,
        });
      }
      
      return res.json({
        success: true,
        message: "Conexão com Supabase Master estabelecida com sucesso! ✅",
        connected: true,
      });
    } catch (error: any) {
      console.error("Erro ao testar Supabase Master:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao testar conexão",
      });
    }
  });

  // ===== CACHE CONFIGURATION =====
  
  app.get("/api/config/cache", authenticateConfig, async (req, res) => {
    try {
      const configFromDb = await db.select().from(cacheConfig).limit(1);
      
      if (configFromDb[0]) {
        return res.json({
          configured: true,
          createdAt: configFromDb[0].createdAt,
          updatedAt: configFromDb[0].updatedAt,
        });
      }
      
      return res.json({
        configured: false,
      });
    } catch (error) {
      console.error("Erro ao buscar configuração do Cache:", error);
      return res.json({
        configured: false,
      });
    }
  });

  app.get("/api/config/cache/settings", authenticateConfig, async (req, res) => {
    try {
      const configFromDb = await db.select().from(cacheConfig).limit(1);
      
      if (configFromDb[0]) {
        return res.json({
          success: true,
          settings: {
            progressiveTtlEnabled: configFromDb[0].progressiveTtlEnabled,
            accessThresholdHigh: configFromDb[0].accessThresholdHigh,
            accessThresholdMedium: configFromDb[0].accessThresholdMedium,
            accessThresholdLow: configFromDb[0].accessThresholdLow,
            ttlHigh: configFromDb[0].ttlHigh,
            ttlMedium: configFromDb[0].ttlMedium,
            ttlLow: configFromDb[0].ttlLow,
            ttlDefault: configFromDb[0].ttlDefault,
            batchInvalidationEnabled: configFromDb[0].batchInvalidationEnabled,
            batchInvalidationDelay: configFromDb[0].batchInvalidationDelay,
            cacheWarmingEnabled: configFromDb[0].cacheWarmingEnabled,
            cacheWarmingTables: configFromDb[0].cacheWarmingTables,
            compressionEnabled: configFromDb[0].compressionEnabled,
            compressionThreshold: configFromDb[0].compressionThreshold,
            createdAt: configFromDb[0].createdAt,
            updatedAt: configFromDb[0].updatedAt,
          }
        });
      }
      
      return res.status(404).json({
        success: false,
        error: "Configurações não encontradas"
      });
    } catch (error) {
      console.error("Erro ao buscar configurações do Cache:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao buscar configurações",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });
  
  app.post("/api/config/cache", authenticateConfig, async (req, res) => {
    try {
      const {
        progressiveTtlEnabled,
        accessThresholdHigh,
        accessThresholdMedium,
        accessThresholdLow,
        ttlHigh,
        ttlMedium,
        ttlLow,
        ttlDefault,
        batchInvalidationEnabled,
        batchInvalidationDelay,
        cacheWarmingEnabled,
        cacheWarmingTables,
        compressionEnabled,
        compressionThreshold
      } = req.body;
      
      const existingConfig = await db.select().from(cacheConfig).limit(1);
      
      if (existingConfig[0]) {
        await db
          .update(cacheConfig)
          .set({
            progressiveTtlEnabled: progressiveTtlEnabled ?? existingConfig[0].progressiveTtlEnabled,
            accessThresholdHigh: accessThresholdHigh ?? existingConfig[0].accessThresholdHigh,
            accessThresholdMedium: accessThresholdMedium ?? existingConfig[0].accessThresholdMedium,
            accessThresholdLow: accessThresholdLow ?? existingConfig[0].accessThresholdLow,
            ttlHigh: ttlHigh ?? existingConfig[0].ttlHigh,
            ttlMedium: ttlMedium ?? existingConfig[0].ttlMedium,
            ttlLow: ttlLow ?? existingConfig[0].ttlLow,
            ttlDefault: ttlDefault ?? existingConfig[0].ttlDefault,
            batchInvalidationEnabled: batchInvalidationEnabled ?? existingConfig[0].batchInvalidationEnabled,
            batchInvalidationDelay: batchInvalidationDelay ?? existingConfig[0].batchInvalidationDelay,
            cacheWarmingEnabled: cacheWarmingEnabled ?? existingConfig[0].cacheWarmingEnabled,
            cacheWarmingTables: cacheWarmingTables ?? existingConfig[0].cacheWarmingTables,
            compressionEnabled: compressionEnabled ?? existingConfig[0].compressionEnabled,
            compressionThreshold: compressionThreshold ?? existingConfig[0].compressionThreshold,
            updatedAt: new Date(),
          })
          .where(eq(cacheConfig.id, existingConfig[0].id));
        
        console.log("✅ Configuração do Cache atualizada");
        return res.json({
          success: true,
          message: "Configurações atualizadas com sucesso",
        });
      } else {
        await db.insert(cacheConfig).values({
          progressiveTtlEnabled,
          accessThresholdHigh,
          accessThresholdMedium,
          accessThresholdLow,
          ttlHigh,
          ttlMedium,
          ttlLow,
          ttlDefault,
          batchInvalidationEnabled,
          batchInvalidationDelay,
          cacheWarmingEnabled,
          cacheWarmingTables,
          compressionEnabled,
          compressionThreshold,
        });
        
        console.log("✅ Configuração do Cache salva");
        return res.json({
          success: true,
          message: "Configurações salvas com sucesso",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do Cache:", error);
      return res.status(500).json({
        error: "Erro ao salvar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // ===== OPTIMIZER CONFIGURATION =====
  
  app.get("/api/config/optimizer", authenticateConfig, async (req, res) => {
    try {
      const configFromDb = await db.select().from(optimizerConfig).limit(1);
      
      if (configFromDb[0]) {
        return res.json({
          configured: true,
          createdAt: configFromDb[0].createdAt,
          updatedAt: configFromDb[0].updatedAt,
        });
      }
      
      return res.json({
        configured: false,
      });
    } catch (error) {
      console.error("Erro ao buscar configuração do Optimizer:", error);
      return res.json({
        configured: false,
      });
    }
  });

  app.get("/api/config/optimizer/settings", authenticateConfig, async (req, res) => {
    try {
      const configFromDb = await db.select().from(optimizerConfig).limit(1);
      
      if (configFromDb[0]) {
        return res.json({
          success: true,
          settings: {
            defaultFieldSet: configFromDb[0].defaultFieldSet,
            defaultPageSize: configFromDb[0].defaultPageSize,
            maxPageSize: configFromDb[0].maxPageSize,
            paginationType: configFromDb[0].paginationType,
            queryCachingEnabled: configFromDb[0].queryCachingEnabled,
            queryCacheTtl: configFromDb[0].queryCacheTtl,
            aggregationEnabled: configFromDb[0].aggregationEnabled,
            aggregationFunctions: configFromDb[0].aggregationFunctions,
            createdAt: configFromDb[0].createdAt,
            updatedAt: configFromDb[0].updatedAt,
          }
        });
      }
      
      return res.status(404).json({
        success: false,
        error: "Configurações não encontradas"
      });
    } catch (error) {
      console.error("Erro ao buscar configurações do Optimizer:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao buscar configurações",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });
  
  app.post("/api/config/optimizer", authenticateConfig, async (req, res) => {
    try {
      const {
        defaultFieldSet,
        defaultPageSize,
        maxPageSize,
        paginationType,
        queryCachingEnabled,
        queryCacheTtl,
        aggregationEnabled,
        aggregationFunctions
      } = req.body;
      
      const existingConfig = await db.select().from(optimizerConfig).limit(1);
      
      if (existingConfig[0]) {
        await db
          .update(optimizerConfig)
          .set({
            defaultFieldSet: defaultFieldSet ?? existingConfig[0].defaultFieldSet,
            defaultPageSize: defaultPageSize ?? existingConfig[0].defaultPageSize,
            maxPageSize: maxPageSize ?? existingConfig[0].maxPageSize,
            paginationType: paginationType ?? existingConfig[0].paginationType,
            queryCachingEnabled: queryCachingEnabled ?? existingConfig[0].queryCachingEnabled,
            queryCacheTtl: queryCacheTtl ?? existingConfig[0].queryCacheTtl,
            aggregationEnabled: aggregationEnabled ?? existingConfig[0].aggregationEnabled,
            aggregationFunctions: aggregationFunctions ?? existingConfig[0].aggregationFunctions,
            updatedAt: new Date(),
          })
          .where(eq(optimizerConfig.id, existingConfig[0].id));
        
        console.log("✅ Configuração do Optimizer atualizada");
        return res.json({
          success: true,
          message: "Configurações atualizadas com sucesso",
        });
      } else {
        await db.insert(optimizerConfig).values({
          defaultFieldSet,
          defaultPageSize,
          maxPageSize,
          paginationType,
          queryCachingEnabled,
          queryCacheTtl,
          aggregationEnabled,
          aggregationFunctions,
        });
        
        console.log("✅ Configuração do Optimizer salva");
        return res.json({
          success: true,
          message: "Configurações salvas com sucesso",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do Optimizer:", error);
      return res.status(500).json({
        error: "Erro ao salvar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // ===== MONITORING CONFIGURATION =====
  
  app.get("/api/config/monitoring", authenticateConfig, async (req, res) => {
    try {
      const configFromDb = await db.select().from(monitoringConfig).limit(1);
      
      if (configFromDb[0]) {
        return res.json({
          configured: true,
          createdAt: configFromDb[0].createdAt,
          updatedAt: configFromDb[0].updatedAt,
        });
      }
      
      return res.json({
        configured: false,
      });
    } catch (error) {
      console.error("Erro ao buscar configuração do Monitoring:", error);
      return res.json({
        configured: false,
      });
    }
  });

  app.get("/api/config/monitoring/settings", authenticateConfig, async (req, res) => {
    try {
      const configFromDb = await db.select().from(monitoringConfig).limit(1);
      
      if (configFromDb[0]) {
        return res.json({
          success: true,
          settings: {
            monitoringEnabled: configFromDb[0].monitoringEnabled,
            monitoringInterval: configFromDb[0].monitoringInterval,
            redisCommandsDaily: configFromDb[0].redisCommandsDaily,
            redisWarningThreshold: configFromDb[0].redisWarningThreshold,
            redisCriticalThreshold: configFromDb[0].redisCriticalThreshold,
            supabaseBandwidthMonthly: configFromDb[0].supabaseBandwidthMonthly,
            supabaseStorageLimit: configFromDb[0].supabaseStorageLimit,
            supabaseWarningThreshold: configFromDb[0].supabaseWarningThreshold,
            supabaseCriticalThreshold: configFromDb[0].supabaseCriticalThreshold,
            alertsEnabled: configFromDb[0].alertsEnabled,
            alertEmail: configFromDb[0].alertEmail,
            autoActionsEnabled: configFromDb[0].autoActionsEnabled,
            createdAt: configFromDb[0].createdAt,
            updatedAt: configFromDb[0].updatedAt,
          }
        });
      }
      
      return res.status(404).json({
        success: false,
        error: "Configurações não encontradas"
      });
    } catch (error) {
      console.error("Erro ao buscar configurações do Monitoring:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao buscar configurações",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });
  
  app.post("/api/config/monitoring", authenticateConfig, async (req, res) => {
    try {
      const {
        monitoringEnabled,
        monitoringInterval,
        redisCommandsDaily,
        redisWarningThreshold,
        redisCriticalThreshold,
        supabaseBandwidthMonthly,
        supabaseStorageLimit,
        supabaseWarningThreshold,
        supabaseCriticalThreshold,
        alertsEnabled,
        alertEmail,
        autoActionsEnabled
      } = req.body;
      
      const existingConfig = await db.select().from(monitoringConfig).limit(1);
      
      if (existingConfig[0]) {
        await db
          .update(monitoringConfig)
          .set({
            monitoringEnabled: monitoringEnabled ?? existingConfig[0].monitoringEnabled,
            monitoringInterval: monitoringInterval ?? existingConfig[0].monitoringInterval,
            redisCommandsDaily: redisCommandsDaily ?? existingConfig[0].redisCommandsDaily,
            redisWarningThreshold: redisWarningThreshold ?? existingConfig[0].redisWarningThreshold,
            redisCriticalThreshold: redisCriticalThreshold ?? existingConfig[0].redisCriticalThreshold,
            supabaseBandwidthMonthly: supabaseBandwidthMonthly ?? existingConfig[0].supabaseBandwidthMonthly,
            supabaseStorageLimit: supabaseStorageLimit ?? existingConfig[0].supabaseStorageLimit,
            supabaseWarningThreshold: supabaseWarningThreshold ?? existingConfig[0].supabaseWarningThreshold,
            supabaseCriticalThreshold: supabaseCriticalThreshold ?? existingConfig[0].supabaseCriticalThreshold,
            alertsEnabled: alertsEnabled ?? existingConfig[0].alertsEnabled,
            alertEmail: alertEmail ?? existingConfig[0].alertEmail,
            autoActionsEnabled: autoActionsEnabled ?? existingConfig[0].autoActionsEnabled,
            updatedAt: new Date(),
          })
          .where(eq(monitoringConfig.id, existingConfig[0].id));
        
        console.log("✅ Configuração do Monitoring atualizada");
        return res.json({
          success: true,
          message: "Configurações atualizadas com sucesso",
        });
      } else {
        await db.insert(monitoringConfig).values({
          monitoringEnabled,
          monitoringInterval,
          redisCommandsDaily,
          redisWarningThreshold,
          redisCriticalThreshold,
          supabaseBandwidthMonthly,
          supabaseStorageLimit,
          supabaseWarningThreshold,
          supabaseCriticalThreshold,
          alertsEnabled,
          alertEmail,
          autoActionsEnabled,
        });
        
        console.log("✅ Configuração do Monitoring salva");
        return res.json({
          success: true,
          message: "Configurações salvas com sucesso",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do Monitoring:", error);
      return res.status(500).json({
        error: "Erro ao salvar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // ===== SUPABASE CONFIGURATION =====
  // IMPORTANTE: Endpoint NÃO-autenticado para permitir acesso de forms públicos
  // Anon key é credencial pública (seguro expor), NUNCA expor service_role_key
  
  app.get("/api/config/supabase", configLimiter, async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Audit log - registrar requisição
      console.log(`[AUDIT] GET /api/config/supabase - IP: ${req.ip} - ${new Date().toISOString()}`);
      
      // PUBLIC ENDPOINT: Priority order - env vars > database
      const urlFromEnv = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
      const keyFromEnv = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      
      if (urlFromEnv && keyFromEnv) {
        const responseTime = Date.now() - startTime;
        console.log(`[AUDIT] ✅ Supabase config fornecido de environment variables - ${responseTime}ms`);
        
        return res.json({
          url: urlFromEnv,
          anonKey: keyFromEnv,
        });
      }
      
      // Fallback para Database (permite formulários públicos acessarem Supabase)
      // SEGURANÇA: anonKey é credencial pública, não há risco em expor
      try {
        const { getSupabaseCredentials } = await import('../lib/credentialsDb.js');
        
        // Buscar primeiro tenant configurado (assumindo single-tenant ou shared credentials)
        const credentials = await getSupabaseCredentials('dev-daviemericko_gmail_com');
        
        if (credentials) {
          const responseTime = Date.now() - startTime;
          console.log(`[AUDIT] ✅ Supabase config fornecido do banco de dados - ${responseTime}ms`);
          
          return res.json({
            url: credentials.url,
            anonKey: credentials.anonKey,
          });
        }
      } catch (dbError) {
        console.error(`[AUDIT] ⚠️ Erro ao buscar do DB:`, dbError);
      }
      
      // Não configurado - retornar objeto vazio (frontend deve lidar gracefully)
      const responseTime = Date.now() - startTime;
      console.log(`[AUDIT] ⚠️ Supabase NÃO configurado em environment variables nem database - ${responseTime}ms`);
      
      return res.json({
        url: '',
        anonKey: '',
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`[AUDIT] ❌ Erro ao buscar config Supabase - ${responseTime}ms:`, error);
      
      // Retornar vazio em caso de erro (frontend deve funcionar sem Supabase)
      return res.json({
        url: '',
        anonKey: '',
      });
    }
  });

  app.get("/api/config/supabase/credentials", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      // Get tenantId from authenticated user (set by authenticateConfig middleware)
      const tenantId = req.user?.tenantId || req.session?.tenantId;
      
      if (!tenantId) {
        console.log('⚠️ [SUPABASE] Nenhum tenantId encontrado - retornando 401');
        return res.status(401).json({
          success: false,
          error: 'Autenticação necessária para acessar credenciais'
        });
      }
      
      console.log(`🔍 [SUPABASE] Buscando credenciais para tenant: ${tenantId}`);
      
      // Try database first
      try {
        const { getSupabaseCredentials } = await import('../lib/credentialsDb.js');
        const credentials = await getSupabaseCredentials(tenantId);
        
        if (credentials) {
          console.log("✅ Supabase credentials loaded from database");
          return res.json({
            success: true,
            credentials: {
              url: credentials.url,
              anonKey: credentials.anonKey,
              bucket: credentials.bucket || 'receipts',
            },
            source: 'database'
          });
        }
      } catch (dbError) {
        console.warn("⚠️ Database unavailable for Supabase credentials, trying file fallback:", dbError instanceof Error ? dbError.message : 'Unknown error');
      }
      
      // Fallback to file-based config
      const fileConfig = getEffectiveSupabaseConfig();
      if (fileConfig) {
        console.log("✅ Supabase credentials loaded from file-based config");
        return res.json({
          success: true,
          credentials: {
            url: fileConfig.url,
            anonKey: fileConfig.anonKey,
            bucket: 'receipts',
          },
          source: 'file'
        });
      }
      
      // Fallback para Secrets (compatibilidade durante migração)
      const urlFromEnv = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
      const keyFromEnv = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      
      if (urlFromEnv && keyFromEnv) {
        console.log("⚠️ Usando credenciais do Supabase dos environment variables (fallback)");
        return res.json({
          success: true,
          credentials: {
            url: urlFromEnv,
            anonKey: keyFromEnv,
            bucket: 'receipts',
          },
          source: 'environment'
        });
      }
      
      return res.status(404).json({
        success: false,
        error: "Credenciais não encontradas. Configure através da interface de administração ou environment variables."
      });
    } catch (error) {
      console.error("Erro ao buscar credenciais do Supabase:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao buscar credenciais",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });
  
  app.post("/api/config/supabase", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const { supabaseUrl, supabaseAnonKey, supabaseBucket } = req.body;
      const tenantId = req.user!.tenantId;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(400).json({
          error: "supabaseUrl e supabaseAnonKey são obrigatórios",
        });
      }
      
      if (!supabaseUrl.startsWith('http')) {
        return res.status(400).json({
          error: "URL inválida - deve começar com http:// ou https://",
        });
      }
      
      let savedToDatabase = false;
      let savedToFile = false;
      
      // Try database first
      try {
        const encryptedUrl = encrypt(supabaseUrl);
        const encryptedAnonKey = encrypt(supabaseAnonKey);
        
        const existingConfig = await db.select().from(supabaseConfig)
          .where(eq(supabaseConfig.tenantId, tenantId))
          .limit(1);
        
        if (existingConfig[0]) {
          await db
            .update(supabaseConfig)
            .set({
              supabaseUrl: encryptedUrl,
              supabaseAnonKey: encryptedAnonKey,
              supabaseBucket: supabaseBucket || 'receipts',
              updatedAt: new Date(),
            })
            .where(and(
              eq(supabaseConfig.id, existingConfig[0].id),
              eq(supabaseConfig.tenantId, tenantId)
            ));
          
          console.log(`✅ Supabase config updated in database for tenant ${tenantId}`);
        } else {
          await db.insert(supabaseConfig).values({
            tenantId,
            supabaseUrl: encryptedUrl,
            supabaseAnonKey: encryptedAnonKey,
            supabaseBucket: supabaseBucket || 'receipts',
          });
          
          console.log(`✅ Supabase config created in database for tenant ${tenantId}`);
        }
        
        savedToDatabase = true;
        
        // Migration: clean up old credentials from app_settings
        try {
          const oldSettings = await db.select().from(appSettings).limit(1);
          if (oldSettings[0] && (oldSettings[0].supabaseUrl || oldSettings[0].supabaseAnonKey)) {
            await db
              .update(appSettings)
              .set({
                supabaseUrl: null,
                supabaseAnonKey: null,
                updatedAt: new Date(),
              })
              .where(eq(appSettings.id, oldSettings[0].id));
            
            console.log("✅ Old credentials removed from app_settings (auto migration)");
          }
        } catch (migrationError) {
          console.warn("⚠️ Warning cleaning old credentials:", migrationError);
        }
      } catch (dbError) {
        console.warn("⚠️ Database unavailable, using file-based storage fallback:", dbError instanceof Error ? dbError.message : 'Unknown error');
      }
      
      // If database failed, fallback to file-based storage
      if (!savedToDatabase) {
        const fileSaved = saveSupabaseFileConfig({
          supabaseUrl,
          supabaseAnonKey,
        });
        
        if (fileSaved) {
          savedToFile = true;
          console.log("✅ Supabase config saved to file (database unavailable)");
        } else {
          console.error("❌ Failed to save Supabase config to both database and file");
          return res.status(500).json({
            error: "Erro ao salvar configuração",
            message: "Database unavailable and file save failed",
          });
        }
      }
      
      // Clear Supabase client cache to force reconnection
      try {
        const { clearSupabaseCache } = await import('../lib/supabaseClient.js');
        clearSupabaseCache();
        console.log("✅ Supabase cache cleared - next request will use new credentials");
      } catch (cacheError) {
        console.warn("⚠️ Could not clear Supabase cache:", cacheError);
      }
      
      const storageMethod = savedToDatabase ? 'database' : 'file';
      return res.json({
        success: true,
        message: `Credenciais salvas com sucesso! (storage: ${storageMethod})`,
        storage: storageMethod,
      });
    } catch (error) {
      console.error("Erro ao salvar configuração do Supabase:", error);
      return res.status(500).json({
        error: "Erro ao salvar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // Testar acesso a todas as tabelas do Supabase
  app.get("/api/config/supabase/test-tables", authenticateConfig, async (req, res) => {
    try {
      const { testAllTables } = await import('../lib/multiTenantSupabase.js');
      
      // Testar para o cliente padrão '1'
      const testResults = await testAllTables('1');
      
      if (!testResults.connected) {
        return res.status(400).json({
          success: false,
          error: "Supabase não configurado",
          tables: {}
        });
      }
      
      return res.json({
        success: true,
        ...testResults
      });
    } catch (error) {
      console.error("Erro ao testar tabelas do Supabase:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao testar tabelas",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // Update Supabase app_settings (company_slug) and forms (is_public)
  app.post("/api/config/forms/public-settings", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, error: "Tenant não identificado" });
      }
      
      const { companySlug, markAllPublic, formIds } = req.body;
      
      console.log(`📋 [PublicSettings] Atualizando configurações para tenant: ${tenantId}`);
      console.log(`📋 [PublicSettings] companySlug: ${companySlug}, markAllPublic: ${markAllPublic}`);
      
      const { getSupabaseClient } = await import('../lib/multiTenantSupabase.js');
      const supabase = await getSupabaseClient(tenantId);
      
      if (!supabase) {
        return res.status(400).json({ 
          success: false, 
          error: "Supabase não configurado para este tenant" 
        });
      }
      
      const results: any = { updated: false, companySlugUpdated: false, formsUpdated: 0 };
      
      // Update company_slug in app_settings
      if (companySlug) {
        const normalizedSlug = companySlug.toLowerCase().trim().replace(/\s+/g, '-');
        console.log(`📋 [PublicSettings] Atualizando company_slug para: ${normalizedSlug}`);
        
        const { error: updateError } = await supabase
          .from('app_settings')
          .update({ company_slug: normalizedSlug })
          .eq('id', 1);
        
        if (updateError) {
          console.error(`❌ [PublicSettings] Erro ao atualizar company_slug:`, updateError);
        } else {
          console.log(`✅ [PublicSettings] company_slug atualizado para: ${normalizedSlug}`);
          results.companySlugUpdated = true;
          results.companySlug = normalizedSlug;
        }
      }
      
      // Mark forms as public
      if (markAllPublic) {
        console.log(`📋 [PublicSettings] Marcando formulários como públicos...`);
        
        let updateQuery = supabase.from('forms').update({ is_public: true });
        
        if (formIds && Array.isArray(formIds) && formIds.length > 0) {
          updateQuery = updateQuery.in('id', formIds);
        }
        
        const { error: formsError, count } = await updateQuery;
        
        if (formsError) {
          console.error(`❌ [PublicSettings] Erro ao atualizar forms:`, formsError);
        } else {
          console.log(`✅ [PublicSettings] Formulários marcados como públicos`);
          results.formsUpdated = count || 'todos';
        }
      }
      
      results.updated = results.companySlugUpdated || results.formsUpdated > 0;
      
      if (results.updated) {
        console.log(`✅ [PublicSettings] Configurações atualizadas com sucesso`);
        console.log(`💡 [PublicSettings] Execute sincronização de forms para propagar mudanças`);
      }
      
      return res.json({
        success: true,
        message: "Configurações atualizadas no Supabase",
        results
      });
    } catch (error) {
      console.error("❌ [PublicSettings] Erro ao atualizar configurações:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao atualizar configurações",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // ===== 100MS CONFIGURATION =====

  app.get("/api/config/hms100ms", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(hms100msConfig)
        .where(eq(hms100msConfig.tenantId, tenantId))
        .limit(1);
      
      if (configFromDb[0]) {
        return res.json({
          configured: true,
          createdAt: configFromDb[0].createdAt,
          updatedAt: configFromDb[0].updatedAt,
        });
      }
      
      return res.json({
        configured: false,
      });
    } catch (error) {
      console.error("Erro ao buscar configuração do 100ms:", error);
      return res.json({
        configured: false,
      });
    }
  });

  app.get("/api/config/hms100ms/sync-from-env", async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user?.tenantId || "system";
      
      // Verificar se há secrets no environment
      const envHmsKey = process.env.HMS_APP_ACCESS_KEY?.trim();
      const envHmsSecret = process.env.HMS_APP_SECRET?.trim();
      const envHmsToken = process.env.HMS_MANAGEMENT_TOKEN?.trim();
      const envHmsTemplateId = process.env.HMS_TEMPLATE_ID?.trim();
      const envHmsApiUrl = process.env.HMS_API_BASE_URL?.trim() || 'https://api.100ms.live/v2';
      
      // Verificar se há configuração no banco
      const existingConfig = await db.select().from(hms100msConfig)
        .where(eq(hms100msConfig.tenantId, tenantId))
        .limit(1);
      
      // Se há config no banco, retornar ela descriptografada
      if (existingConfig[0]) {
        const decryptedKey = decrypt(existingConfig[0].appAccessKey);
        const decryptedSecret = decrypt(existingConfig[0].appSecret);
        const decryptedToken = existingConfig[0].managementToken ? decrypt(existingConfig[0].managementToken) : null;
        const templateId = existingConfig[0].templateId;
        
        console.log(`✅ [HMS100ms] Config carregada do banco de dados para tenant ${tenantId}`);
        
        return res.json({
          success: true,
          credentials: {
            appAccessKey: decryptedKey,
            appSecret: decryptedSecret,
            managementToken: decryptedToken,
            templateId: templateId,
            apiBaseUrl: existingConfig[0].apiBaseUrl,
          },
          storedInDb: true,
          syncedFromEnv: false
        });
      }
      
      // Se não há config no banco MAS há valores no environment, salvar automaticamente!
      if (envHmsKey && envHmsSecret) {
        const encryptedKey = encrypt(envHmsKey);
        const encryptedSecret = encrypt(envHmsSecret);
        const encryptedToken = envHmsToken ? encrypt(envHmsToken) : null;
        
        try {
          await db.insert(hms100msConfig).values({
            tenantId,
            appAccessKey: encryptedKey,
            appSecret: encryptedSecret,
            managementToken: encryptedToken,
            templateId: envHmsTemplateId || null,
            apiBaseUrl: envHmsApiUrl,
          });
          
          console.log(`✅ [HMS100ms] Credenciais sincronizadas do environment para banco de dados para tenant ${tenantId}`);
          console.log(`   📋 Campos salvos: Key=${!!envHmsKey}, Secret=${!!envHmsSecret}, Token=${!!envHmsToken}, TemplateId=${!!envHmsTemplateId}, URL=${!!envHmsApiUrl}`);
          
          return res.json({
            success: true,
            credentials: {
              appAccessKey: envHmsKey,
              appSecret: envHmsSecret,
              managementToken: envHmsToken || "",
              templateId: envHmsTemplateId || "",
              apiBaseUrl: envHmsApiUrl,
            },
            storedInDb: true,
            syncedFromEnv: true,
            message: "✅ Todas as 5 credenciais foram sincronizadas do environment!"
          });
        } catch (dbError) {
          console.error("❌ Erro ao salvar credenciais no banco:", dbError);
          // Se falhar ao salvar, ainda retorna os valores do env para o frontend
          return res.json({
            success: true,
            credentials: {
              appAccessKey: envHmsKey,
              appSecret: envHmsSecret,
              managementToken: envHmsToken || "",
              templateId: envHmsTemplateId || "",
              apiBaseUrl: envHmsApiUrl,
            },
            storedInDb: false,
            syncedFromEnv: false,
            dbError: "Falha ao salvar no banco, mas valores do env estão disponíveis"
          });
        }
      }
      
      // Se não há config no banco e nem no environment
      console.log(`⚠️  [HMS100ms] Nenhuma configuração encontrada (banco ou environment)`);
      
      return res.json({
        success: true,
        credentials: {
          appAccessKey: "",
          appSecret: "",
          managementToken: "",
          templateId: "",
          apiBaseUrl: envHmsApiUrl,
        },
        storedInDb: false,
        syncedFromEnv: false,
        message: "Nenhuma credencial de 100ms configurada"
      });
    } catch (error) {
      console.error("Erro ao sincronizar credenciais do 100ms:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao sincronizar credenciais",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  app.get("/api/config/hms100ms/credentials", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(hms100msConfig)
        .where(eq(hms100msConfig.tenantId, tenantId))
        .limit(1);
      
      if (configFromDb[0]) {
        const decryptedKey = decrypt(configFromDb[0].appAccessKey);
        const decryptedSecret = decrypt(configFromDb[0].appSecret);
        const decryptedToken = configFromDb[0].managementToken ? decrypt(configFromDb[0].managementToken) : null;
        const templateId = configFromDb[0].templateId;
        
        return res.json({
          success: true,
          credentials: {
            appAccessKey: decryptedKey,
            appSecret: decryptedSecret,
            managementToken: decryptedToken,
            templateId: templateId,
            apiBaseUrl: configFromDb[0].apiBaseUrl,
          }
        });
      }
      
      return res.status(404).json({
        success: false,
        error: "Credenciais não encontradas"
      });
    } catch (error) {
      console.error("Erro ao buscar credenciais do 100ms:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao buscar credenciais",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });
  
  app.post("/api/config/hms100ms", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      let { appAccessKey, appSecret, managementToken, templateId, apiBaseUrl } = req.body;
      const tenantId = req.user!.tenantId;
      
      if (!appAccessKey || !appSecret) {
        return res.status(400).json({
          error: "appAccessKey e appSecret são obrigatórios",
        });
      }
      
      const encryptedKey = encrypt(appAccessKey);
      const encryptedSecret = encrypt(appSecret);
      const encryptedToken = managementToken ? encrypt(managementToken) : null;
      
      const existingConfig = await db.select().from(hms100msConfig)
        .where(eq(hms100msConfig.tenantId, tenantId))
        .limit(1);
      
      if (existingConfig[0]) {
        await db
          .update(hms100msConfig)
          .set({
            appAccessKey: encryptedKey,
            appSecret: encryptedSecret,
            managementToken: encryptedToken,
            templateId: templateId || existingConfig[0].templateId,
            apiBaseUrl: apiBaseUrl || existingConfig[0].apiBaseUrl,
            updatedAt: new Date(),
          })
          .where(and(
            eq(hms100msConfig.id, existingConfig[0].id),
            eq(hms100msConfig.tenantId, tenantId)
          ));
        
        console.log(`✅ Configuração do 100ms atualizada para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais atualizadas com sucesso",
        });
      } else {
        await db.insert(hms100msConfig).values({
          tenantId,
          appAccessKey: encryptedKey,
          appSecret: encryptedSecret,
          managementToken: encryptedToken,
          templateId: templateId,
          apiBaseUrl: apiBaseUrl || 'https://api.100ms.live/v2',
        });
        
        console.log(`✅ Configuração do 100ms salva para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais salvas com sucesso",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do 100ms:", error);
      return res.status(500).json({
        error: "Erro ao salvar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  app.post("/api/config/hms100ms/test", async (req, res) => {
    try {
      const { appAccessKey, appSecret } = req.body;
      
      if (!appAccessKey || !appSecret) {
        return res.status(400).json({
          success: false,
          error: "appAccessKey e appSecret são obrigatórios",
        });
      }
      
      // Test connection with a temporary request to 100ms API
      const { generateManagementToken } = await import('../services/meetings/hms100ms');
      const token = generateManagementToken(appAccessKey, appSecret);
      
      const testResponse = await axios.get('https://api.100ms.live/v2/rooms', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 5000,
      });
      
      if (testResponse.status === 200) {
        return res.json({
          success: true,
          message: "Credenciais validadas com sucesso",
        });
      }
      
      return res.status(400).json({
        success: false,
        error: "Credenciais inválidas",
      });
    } catch (error: any) {
      console.error("Erro ao testar credenciais do 100ms:", error.message);
      return res.status(400).json({
        success: false,
        error: "Credenciais inválidas ou 100ms API indisponível",
        message: error.message,
      });
    }
  });
}
