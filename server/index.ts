import 'dotenv/config';
console.log('[STARTUP] Loading server modules...');

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./production";
import { initializeSentry, setupSentryMiddleware, setupSentryErrorHandler } from "./lib/sentry";
import { apiLimiter, authLimiter } from "./middleware/rateLimiter";
import { setupConfigRoutes } from "./routes/config";
import { initializeQueues, shutdownQueues } from "./lib/queue";
import { startMonitoring, stopMonitoring } from "./lib/limitMonitor";
import { startAutomation, stopAutomation } from "./lib/automationManager";
import { startAutomaticAlerting, stopAutomaticAlerting } from "./lib/alerting";
import { startContractSyncPoller, stopContractSyncPoller } from "./lib/contractSyncPoller";
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

// Allow iframe embedding for Replit preview (development only)
app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  // In development (Replit), allow embedding from Replit domains
  // In production, restrict to same-origin
  const isReplit = process.env.REPL_ID || process.env.REPLIT_DEV_DOMAIN;
  if (isReplit) {
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' *.replit.com *.replit.dev *.repl.co *.picard.replit.dev replit.com replit.dev");
  }
  next();
});

// Initialize Sentry first (must be before other middleware)
initializeSentry(app).then(initialized => {
  if (initialized) {
    setupSentryMiddleware(app);
  }
}).catch(console.error);

// Aumentar limite do body para aceitar imagens em Base64
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Confiar em proxies (necessário para Replit e outros ambientes de proxy)
app.set('trust proxy', 1);

// Configuração de sessão para autenticação multi-tenant
// CRITICAL: sameSite: 'lax' é necessário para funcionar em iframes (Replit preview)
// secure: false é OBRIGATÓRIO quando sameSite é 'none'
// proxy: true permite que Express confie no x-forwarded-proto do proxy HTTPS do Replit
app.use(session({
  secret: process.env.SESSION_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET environment variable is required in production');
    }
    return 'dev-secret-only-for-development';
  })(),
  resave: false,
  saveUninitialized: false,
  proxy: true, // CRITICAL: Confiar no proxy HTTPS do Replit
  cookie: {
    secure: false, // OBRIGATÓRIO com sameSite: 'lax'
    httpOnly: true,
    sameSite: 'lax', // CRITICAL: Permite cookies em requisições cross-site (iframe)
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
    res.writeHead = function (statusCode: number, ...args: any[]) {
      console.log(`[PIPELINE-DEBUG] writeHead called with status ${statusCode}`);
      return originalWriteHead(statusCode, ...args);
    };

    // Track when response ends
    const originalEnd = res.end.bind(res);
    res.end = function (...args: any[]) {
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

  // Setup biometric authentication routes (público - para login biométrico)
  app.use('/api/biometric', biometricRoutes);

  // Health check endpoint (público)
  app.use('/api/health', healthRouter);

  // PROTEÇÃO DE ROTAS: Verificar autenticação antes de acessar rotas protegidas
  // Apenas quando Supabase Owner estiver configurado
  if (SUPABASE_CONFIGURED) {
    app.use(redirectIfNotAuth);
    log('🔐 Multi-tenant authentication enabled');
  } else {
    log('⚠️ Multi-tenant authentication disabled - running in open access mode');
  }

  // N8N integration routes - EXEMPT from global auth redirects in server/index.ts
  // They are already registered inside registerRoutes

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
  const port = parseInt(process.env.PORT || '5000', 10);

  // Start server and setup Vite in the callback
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);

    // Setup static files or Vite dev server based on NODE_ENV
    const isProduction = process.env.NODE_ENV === 'production';
    log(`Environment: ${isProduction ? 'production' : 'development'}`);

    if (isProduction) {
      log('Serving static files from dist/');
      serveStatic(app);
    } else {
      log('Setting up Vite development server...');
      import("./vite").then(({ setupVite }) => {
        setupVite(app, server).then(() => {
          log('✅ Vite development server initialized');
        }).catch(err => {
          console.error('❌ Failed to setup Vite:', err);
        });
      }).catch(err => {
        console.error('❌ Failed to load Vite module:', err);
      });
    }

    // Background tasks - Initialize queues and automation
    setImmediate(async () => {
      try {
        // Initialize job queues for background processing
        initializeQueues();
        log('✅ Background job queues initialized');

        // Start form submission polling and automation
        startAutomation();
        log('✅ Form submission automation started');

        // Start monitoring and alerting
        startMonitoring();
        startAutomaticAlerting();
        log('✅ Monitoring and alerting started');

        // Start contract sync poller (Master-Client sync)
        startContractSyncPoller();
        log('✅ Contract sync poller started');

        // Start cache cleanup scheduler (daily cleanup of local cache tables)
        const { startCacheCleanupScheduler } = await import('./lib/cacheCleanup');
        startCacheCleanupScheduler(24);
        log('✅ Cache cleanup scheduler started (every 24h)');
      } catch (error) {
        console.error('❌ Failed to start background services:', error);
      }
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    log('SIGTERM signal received: closing HTTP server');
    stopMonitoring();
    stopAutomation();
    stopAutomaticAlerting();
    stopContractSyncPoller();
    import('./lib/cacheCleanup').then(m => m.stopCacheCleanupScheduler()).catch(() => { });
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
    stopContractSyncPoller();
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
