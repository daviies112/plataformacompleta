console.log('[STARTUP] Loading server modules...');

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeSentry, setupSentryMiddleware, setupSentryErrorHandler } from "./lib/sentry";
import { apiLimiter, authLimiter } from "./middleware/rateLimiter";
import { setupConfigRoutes } from "./routes/config";
import { initializeQueues, shutdownQueues } from "./lib/queue";
import { startMonitoring, stopMonitoring } from "./lib/limitMonitor";
import { startAutomation, stopAutomation } from "./lib/automationManager";
import { startAutomaticAlerting, stopAutomaticAlerting } from "./lib/alerting";
import multiTenantAuthRoutes from "./routes/multiTenantAuth";
import { attachUserData, redirectIfNotAuth, requireAuth } from "./middleware/multiTenantAuth";
import { SUPABASE_CONFIGURED } from "./config/supabaseOwner";
import biometricRoutes from "./routes/biometric";
import healthRouter from "./routes/health";
import { cloudflareCache } from "./middleware/cloudflareCache";
import { smartCompression } from "./middleware/compression";
import { db } from "./db";

console.log('[STARTUP] All modules loaded, creating Express app...');

const app = express();

console.log('[STARTUP] Express app created');

// Initialize Sentry first (must be before other middleware)
initializeSentry(app).then(initialized => {
  if (initialized) {
    setupSentryMiddleware(app);
  }
}).catch(console.error);

// Aumentar limite do body para aceitar imagens em Base64
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Configuração de sessão para autenticação multi-tenant
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Middleware para anexar dados do usuário
app.use(attachUserData);

// FREE Tier optimizations - Cloudflare cache headers and compression
app.use(cloudflareCache);
// TEMPORARILY DISABLED: smartCompression causing issues with async response handling
// app.use(smartCompression);

// Debug middleware for leads-pipeline to trace request flow
app.use((req, res, next) => {
  if (req.path.includes('leads-pipeline')) {
    console.log(`[PIPELINE-DEBUG] ${new Date().toISOString()} ${req.method} ${req.path} - Request received`);
    
    // Track when headers are sent
    const originalWriteHead = res.writeHead.bind(res);
    res.writeHead = function(statusCode: number, ...args: any[]) {
      console.log(`[PIPELINE-DEBUG] writeHead called with status ${statusCode}`);
      return originalWriteHead(statusCode, ...args);
    };
    
    // Track when response ends
    const originalEnd = res.end.bind(res);
    res.end = function(...args: any[]) {
      console.log(`[PIPELINE-DEBUG] res.end called`);
      return originalEnd(...args);
    };
    
    res.on('close', () => {
      console.log(`[PIPELINE-DEBUG] Response closed (client disconnected?)`);
    });
    
    res.on('finish', () => {
      console.log(`[PIPELINE-DEBUG] Response finished successfully`);
    });
  }
  next();
});

// Request logging middleware using res.on("finish") to avoid breaking streaming
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  // Use "finish" event instead of monkey-patching res.end/res.json
  // This prevents breaking chunked/streaming responses for large payloads
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Load credentials early to avoid circular dependency issues
    const { ensureCredentialsLoaded } = await import('./lib/credentialsManager');
    ensureCredentialsLoaded();
    log('Credentials manager initialized');
  } catch (error) {
    log('Warning: Failed to initialize credentials manager: ' + (error as Error).message);
    console.error('Credentials manager error:', error);
  }
  
  try {
    // Initialize poller states on startup
    const { initializePollerStates, checkAndResetStaleStates } = await import('./lib/stateReset');
    initializePollerStates();
    checkAndResetStaleStates();
  } catch (error) {
    log('Warning: Failed to initialize poller states: ' + (error as Error).message);
  }
  
  // Setup configuration routes (público)
  setupConfigRoutes(app);
  
  // Setup multi-tenant authentication routes (público - para login)
  app.use('/api/auth', multiTenantAuthRoutes);
  
  // ===== ROTAS NEXUS (Revendedoras) - público para login/register =====
  const resellerAuthRoutes = await import('./routes/resellerAuth');
  app.use('/api/reseller', resellerAuthRoutes.default);
  
  const resellerCatalogRoutes = await import('./routes/resellerCatalog');
  app.use('/api/reseller', resellerCatalogRoutes.default);
  
  const stripePaymentRoutes = await import('./routes/stripePayment');
  app.use('/api/stripe', stripePaymentRoutes.default);
  
  log('✅ Rotas Nexus (Revendedoras) registradas');
  
  // Setup biometric authentication routes (público - para login biométrico)
  app.use('/api/biometric', biometricRoutes);
  
  // Health and quota monitoring endpoint (público - para monitoramento externo)
  app.use('/api/health', healthRouter);
  
  // Supabase file-based configuration routes (público - para setup inicial)
  const supabaseConfigRoutes = await import('./routes/supabaseConfig');
  app.use('/api/config', supabaseConfigRoutes.default);
  
  // Label Designer routes (protegido - requer autenticação)
  const labelDesignerRoutes = await import('./routes/labelDesigner');
  app.use('/api/label-designer', requireAuth, labelDesignerRoutes.default);
  
  // Printer Configuration routes (protegido - requer autenticação)
  const printerConfigRoutes = await import('./routes/printerConfig');
  app.use('/api/printer-config', requireAuth, printerConfigRoutes.default);
  log('🖨️ Printer configuration system initialized');
  
  // Envio/Frete routes (protegido - requer autenticação)
  const envioRoutes = await import('./routes/envio');
  app.use('/api/envio', requireAuth, envioRoutes.default);
  log('📦 Envio/Frete system initialized');
  
  // Serve Label Designer static files
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  app.use('/label-designer', express.static(path.join(__dirname, '..', 'label-designer', 'public')));
  app.use('/label-designer/uploads', express.static(path.join(__dirname, '..', 'label-designer', 'uploads')));
  app.use('/label-designer/extras', express.static(path.join(__dirname, '..', 'label-designer', 'extras')));
  log('🏷️ Label Designer system initialized');
  
  // PROTEÇÃO DE ROTAS: Verificar autenticação antes de acessar rotas protegidas
  // Apenas quando Supabase Owner estiver configurado
  if (SUPABASE_CONFIGURED) {
    app.use(redirectIfNotAuth);
    log('🔐 Multi-tenant authentication enabled');
  } else {
    log('⚠️ Multi-tenant authentication disabled - running in open access mode');
  }
  
  // Apply rate limiting to API routes
  app.use('/api/', apiLimiter);
  app.use('/api/auth', authLimiter);
  
  // Serve uploaded files (logos, etc.) from public/uploads directory
  app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));
  log('📁 Static file serving enabled for /uploads directory');
  
  const server = await registerRoutes(app);

  // Setup Sentry error handler (must be after all routes)
  setupSentryErrorHandler(app);

  // Custom 404 handler for API routes - always return JSON
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ 
        success: false,
        error: 'Endpoint não encontrado',
        path: req.path,
        method: req.method
      });
    }
    next();
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Initialize background job queues after server is listening
    // Use setImmediate to ensure it runs in next tick, not blocking the callback
    setImmediate(async () => {
      // ==== VERIFICAÇÃO DE CREDENCIAIS DO SUPABASE ====
      // Verifica se credenciais estão configuradas (banco ou secrets) e cria alerta se necessário
      try {
        const { checkSupabaseSecrets, createSupabaseSetupAlert, removeSupabaseSetupAlert } = await import('./lib/supabaseSecretsCheck.js');
        const secretsCheck = await checkSupabaseSecrets();
        
        if (!secretsCheck.configured) {
          log(`⚠️  Supabase não configurado - criando guia de setup...`);
          log(`📝 Secrets faltando: ${secretsCheck.missingSecrets.join(', ')}`);
          createSupabaseSetupAlert(secretsCheck.missingSecrets);
        } else {
          log(`✅ Supabase configurado via: ${secretsCheck.source || 'unknown'}`);
          // Credenciais configuradas - remover alerta se existir
          removeSupabaseSetupAlert();
        }
      } catch (error: any) {
        log(`⚠️  Erro ao verificar credenciais do Supabase: ${error.message}`);
      }
      
      // ==== INICIALIZAR INTEGRAÇÕES ====
      // Sincroniza credenciais dos Secrets para o banco de dados
      try {
        const { initializeIntegrations } = await import('./lib/initializeIntegrations.js');
        await initializeIntegrations();
      } catch (error: any) {
        log(`⚠️  Erro ao inicializar integrações: ${error.message}`);
      }
      
      // ==== AUTO-CONEXÃO COM SUPABASE ====
      // Sistema automatizado que detecta e conecta em todas as tabelas
      try {
        const { autoConnectSupabase } = await import('./lib/supabaseAutoConnect.js');
        await autoConnectSupabase();
      } catch (error: any) {
        log(`⚠️  Erro ao auto-conectar Supabase: ${error.message}`);
      }
      
      // ==== VERIFICAÇÃO AUTOMÁTICA DAS 12 TABELAS DO SUPABASE ====
      // Verifica se todas as tabelas estão configuradas e acessíveis
      try {
        const { verifySupabaseTables, formatVerificationResult } = await import('./lib/supabaseTablesVerification.js');
        const result = await verifySupabaseTables();
        const formattedResult = formatVerificationResult(result);
        console.log(formattedResult);
      } catch (error: any) {
        log(`⚠️  Erro ao verificar tabelas do Supabase: ${error.message}`);
      }
      
      // ==== INICIALIZAÇÃO DO BANCO DE DADOS ====
      // Seed de labels e dados padrão (roda apenas se não existirem)
      try {
        const { initializeDatabase } = await import('./lib/databaseSeed.js');
        await initializeDatabase();
      } catch (error: any) {
        log(`⚠️  Erro ao inicializar banco de dados: ${error.message}`);
      }
      
      initializeQueues();
      log('Background job queues initialized');
      
      // Start automation manager (includes form submission sync)
      startAutomation();
      log('Automation manager started');
      
      // Start limit monitoring (runs every 5 minutes by default)
      startMonitoring();
      log('Limit monitoring started');
      
      // Start automatic alerting for quotas (runs every 5 minutes)
      startAutomaticAlerting();
      log('Automatic alerting started');
      
      // ==== SINCRONIZAÇÃO AUTOMÁTICA DO SUPABASE ====
      // 🔐 ISOLAMENTO MULTI-TENANT: Não usar credenciais globais
      // Cada tenant deve configurar suas próprias credenciais via /configuracoes
      // NÃO há mais fallback para environment variables compartilhadas
      try {
        log('');
        log('╔════════════════════════════════════════════════════════════════╗');
        log('║  ℹ️  SINCRONIZAÇÃO AUTOMÁTICA DO SUPABASE                     ║');
        log('╚════════════════════════════════════════════════════════════════╝');
        log('🔐 Sistema multi-tenant ativo');
        log('💡 Cada tenant deve configurar suas credenciais em /configuracoes');
        log('⚠️  Sincronização automática ocorre apenas para tenants configurados');
        log('');
        
        // Verificar quantos tenants têm credenciais configuradas
        const { supabaseConfig } = await import('../shared/db-schema.js');
        const { isNotNull } = await import('drizzle-orm');
        
        const tenantsWithCredentials = await db.select({
          tenantId: supabaseConfig.tenantId
        })
        .from(supabaseConfig)
        .where(isNotNull(supabaseConfig.tenantId))
        .execute();
        
        if (tenantsWithCredentials.length === 0) {
          log('⚠️  Nenhum tenant com credenciais configuradas');
          log('📝 Para habilitar sincronização:');
          log('   1. Faça login no sistema');
          log('   2. Acesse /configuracoes');
          log('   3. Configure credenciais do Supabase');
          log('');
        } else {
          log(`✅ ${tenantsWithCredentials.length} tenant(s) com credenciais configuradas`);
          log('🔄 Sincronização automática ativa para estes tenants');
          log('');
        }
        
        log('✅ Sistema iniciado normalmente');
        log('════════════════════════════════════════════════════════════════');
        log('');
        
      } catch (error: any) {
        log(`⚠️  Erro ao verificar tenants: ${error.message}`);
        log('✅ Sistema iniciado - background jobs irão tentar conectar periodicamente');
      }
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  // Setup Vite AFTER server is listening to avoid blocking port opening
  if (app.get("env") === "development") {
    log('Setting up Vite development server...');
    setupVite(app, server).then(() => {
      log('✅ Vite development server initialized');
    }).catch(err => {
      console.error('❌ Failed to setup Vite:', err);
      console.error('Stack trace:', err.stack);
      process.exit(1);
    });
  } else {
    serveStatic(app);
  }

  // Graceful shutdown
  process.on('SIGTERM', () => {
    log('SIGTERM signal received: closing HTTP server');
    stopMonitoring();
    stopAutomation();
    stopAutomaticAlerting();
    shutdownQueues();
    server.close(() => {
      log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    log('SIGINT signal received: closing HTTP server');
    stopMonitoring();
    stopAutomation();
    stopAutomaticAlerting();
    shutdownQueues();
    server.close(() => {
      log('HTTP server closed');
      process.exit(0);
    });
  });
})().catch((error) => {
  console.error('Fatal error during server startup:', error);
  process.exit(1);
});
