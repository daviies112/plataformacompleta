import type { Express } from "express";
import { createServer } from "http";
import multer from "multer";
import path from "path";
import { authRoutes } from "./routes/auth";
import { automationRoutes } from "./routes/automation";
import { setupBillingRoutes } from "./routes/billing";
import { credentialsRoutes } from "./routes/credentials";
import { dashboardRoutes } from "./routes/dashboard";
import { workspaceRoutes } from "./routes/workspace";
import { registerNotificationRoutes } from "./routes/notifications";
import evolutionRoutes from "./routes/evolution";
import whatsappRoutes from "./routes/whatsapp";
import { clientsRoutes } from "./routes/clients";
import { connectionsRoutes } from "./routes/connections";
import biometricRoutes from "./routes/biometric";
import { registerWhatsAppCompleteRoutes } from "./routes/whatsapp-complete";
import { registerFormulariosCompleteRoutes } from "./routes/formularios-complete";
import { exportRoutes } from "./routes/export";
import formulariosRoutes from "./routes/formularios";
import { setupComplianceRoutes } from "./routes/compliance";
import formsAutomationAPIRoutes from "./routes/formsAutomationAPI";
import { requireTenant } from "./middleware/requireTenant";
import { leadsPipelineRoutes } from "./routes/leadsPipelineRoutes";
import { meetingsRouter } from "./routes/meetings";
import assinaturaRoutes from "./routes/assinatura";
import n8nRouter from "./routes/n8n";
import resellerAuthRoutes from "./routes/resellerAuth";
import resellerCatalogRoutes from "./routes/resellerCatalog";
import envioRoutes from "./routes/envio";
import pagarmeRoutes from "./routes/pagarme";
import pagarmePublicRoutes from "./routes/pagarmePublic";
import publicStoreRoutes from "./routes/publicStore";
import walletRoutes from "./routes/wallet";
import splitRoutes from "./routes/split";
import monitoringRoutes from "./routes/monitoring";

// Configure multer for logo uploads
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/logos/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas (PNG, JPG, GIF, WebP)'));
    }
  }
});

export async function registerRoutes(app: Express) {
  // Create HTTP server
  const httpServer = createServer(app);

  // 🔍 MONITORING ROUTES - Must be registered first (no auth required)
  // Health check and monitoring logs for frontend monitoring system
  app.use("/api", monitoringRoutes);

  app.use("/auth", authRoutes);
  app.use("/api/biometric", biometricRoutes);
  
  // 🌐 PUBLIC ROUTES - Must be registered BEFORE the global /api middleware
  // Public route for client contract access (no auth required)
  app.use("/api/assinatura/public", assinaturaRoutes);
  
  // Public store routes - allows customers to view reseller stores without auth
  app.use("/api/public", publicStoreRoutes);
  
  registerFormulariosCompleteRoutes(app);
  
  // Public endpoint for meeting room design - allows unauthenticated access to room colors
  // Must be registered BEFORE routes with requireTenant middleware
  const { publicRoomDesignRouter } = await import("./routes/meetings");
  app.use("/api/public", publicRoomDesignRouter); // Usar prefixo /api/public para evitar conflito com /api/reunioes protegido
  
  // Recording routes also need to be accessible at /api/100ms/recording/... for frontend compatibility
  // This allows the recording button in Meeting100ms.tsx to work correctly
  app.use("/api", publicRoomDesignRouter);
  
  // N8N integration routes - allows external automation to create meetings
  // Registered early to avoid global auth redirects
  app.use("/api/n8n", n8nRouter);
  
  // Split / Recipient bootstrap routes for Pagar.me configuration
  // REGISTERED EARLY to avoid global /api middleware
  console.log('[Split Routes] Registering split routes early');
  app.use("/api/split", splitRoutes);
  
  // Reseller authentication routes - PUBLIC (login/register don't need auth)
  // Apply JWT fallback middleware for token-based auth (for iframe contexts where cookies fail)
  const { resellerAuthMiddleware } = await import("./routes/resellerAuth");
  app.use("/api/reseller", resellerAuthMiddleware, resellerAuthRoutes);
  app.use("/api/reseller", resellerAuthMiddleware, resellerCatalogRoutes);

  // Public checkout routes - NO AUTH required (for public store purchases)
  // Must be registered BEFORE redirectIfNotAuth middleware
  app.use("/api/public/checkout", pagarmePublicRoutes);
  app.use("/api/public/store", publicStoreRoutes);

  // Public shipping quote route - allows freight calculation without authentication
  const { totalExpressService } = await import("./services/totalExpressService");
  app.post("/api/public/frete/cotar", async (req, res) => {
    try {
      const { cepDestino, peso, altura, largura, comprimento, valorDeclarado } = req.body;

      if (!cepDestino || !peso) {
        return res.status(400).json({ error: "CEP de destino e peso são obrigatórios" });
      }

      const cotacao = await totalExpressService.cotarFrete({
        cepOrigem: "32315090", // Fixed origin CEP (associated with REID)
        cepDestino: String(cepDestino).replace(/\D/g, ''),
        peso: parseFloat(peso) || 0.5,
        altura: parseFloat(altura) || 10,
        largura: parseFloat(largura) || 15,
        comprimento: parseFloat(comprimento) || 20,
        valorDeclarado: parseFloat(valorDeclarado) || 100
      });

      res.json(cotacao);
    } catch (error: any) {
      console.error("[PublicFrete] Erro na cotação:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Import utilities for protection logic
  const { log } = await import("./vite");
  const { SUPABASE_CONFIGURED } = await import("./config/supabaseOwner");
  const { redirectIfNotAuth } = await import("./middleware/multiTenantAuth");
  const { apiLimiter, authLimiter } = await import("./middleware/rateLimiter");

  // Compliance routes (CPF check) - public access allowed with DEMO fallback
  app.use(setupComplianceRoutes());
  
  // PROTEÇÃO DE ROTAS: Verificar autenticação antes de acessar rotas protegidas
  if (SUPABASE_CONFIGURED) {
    app.use(redirectIfNotAuth);
    log('🔐 Multi-tenant authentication enabled');
  }

  // Leads Pipeline routes
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    app.use("/api/leads-pipeline", leadsPipelineRoutes);
  } else {
    app.use("/api/leads-pipeline", requireTenant, leadsPipelineRoutes);
  }
  
  if (isDev) {
    app.use("/api/export", exportRoutes);
  } else {
    app.use("/api/export", requireTenant, exportRoutes);
  }
  
  app.use("/api/automation", requireTenant, automationRoutes);
  app.use("/api", requireTenant, connectionsRoutes);
  setupBillingRoutes(app);
  app.use("/api/credentials", requireTenant, credentialsRoutes);
  app.use("/api/dashboard", requireTenant, dashboardRoutes);
  app.use("/api/workspace", requireTenant, workspaceRoutes);
  app.use("/api/clients", requireTenant, clientsRoutes);
  registerNotificationRoutes(app);
  app.use("/api/evolution", requireTenant, evolutionRoutes);
  app.use("/api/whatsapp", requireTenant, whatsappRoutes);
  registerWhatsAppCompleteRoutes(app);
  
  app.use("/api/formularios", requireTenant, formulariosRoutes);
  app.use("/api/reunioes", requireTenant, meetingsRouter);

  // KANBAN PLATFORM ROUTES
  const { kanbanStorage } = await import("./storage/kanbanStorage");
  const { insertKanbanLeadSchema } = await import("../shared/db-schema");
  const { z } = await import("zod");

  app.get("/api/kanban-leads", requireTenant, async (req, res) => {
    try {
      const leads = await kanbanStorage.getAllLeads();
      res.json(leads);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.post("/api/upload/logo", requireTenant, logoUpload.single('logo'), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
      res.json({ success: true, url: `/uploads/logos/${req.file.filename}` });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Falha ao fazer upload' });
    }
  });

  app.use("/api/assinatura", requireTenant, assinaturaRoutes);
  
  // Envio routes (shipping management)
  app.use("/api/envio", requireTenant, envioRoutes);
  
  // Pagar.me payment routes
  // NOTE: Public checkout routes are registered earlier (before redirectIfNotAuth) at line ~104
  // Webhook endpoint must be PUBLIC for Pagar.me to send payment notifications
  app.use("/api/pagarme/webhook", pagarmeRoutes);
  // All other payment routes require authentication
  app.use("/api/pagarme", requireTenant, pagarmeRoutes);

  // Wallet / Credit System routes
  // Webhook endpoint must be PUBLIC for Pagar.me to credit wallet on payment
  app.use("/api/wallet/webhook", walletRoutes);
  // All other wallet routes require authentication
  app.use("/api/wallet", requireTenant, walletRoutes);

  // Horarios disponiveis routes (meeting schedules)
  const { registerHorariosRoutes } = await import("./routes/horarios");
  registerHorariosRoutes(app);

  return httpServer;
}
