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

  app.use("/auth", authRoutes);
  app.use("/api/biometric", biometricRoutes);
  
  // 🌐 PUBLIC ROUTES - Must be registered BEFORE the global /api middleware
  registerFormulariosCompleteRoutes(app);
  
  // Compliance routes (CPF check) - public access allowed with DEMO fallback
  // Must be registered BEFORE routes that apply requireTenant to all /api paths
  app.use(setupComplianceRoutes());
  
  // Leads Pipeline routes - Kanban pipeline management with unified leads view
  // MUST be registered BEFORE generic /api routes that apply requireTenant
  // In development mode, skip requireTenant since tenantId comes from URL parameter
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    app.use("/api/leads-pipeline", leadsPipelineRoutes);
  } else {
    app.use("/api/leads-pipeline", requireTenant, leadsPipelineRoutes);
  }
  
  // Export routes - MUST be registered BEFORE the global /api middleware
  // In development mode, allow access without tenant requirement
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
  
  // Note: leads-pipeline routes registered above (before requireTenant middleware)
  
  app.use(formsAutomationAPIRoutes);

  // ============================================================================
  // KANBAN PLATFORM ROUTES - Lead pipeline management
  // ============================================================================
  const { kanbanStorage } = await import("./storage/kanbanStorage");
  const { insertKanbanLeadSchema } = await import("../shared/db-schema");
  const { z } = await import("zod");

  // Get all kanban leads
  app.get("/api/kanban-leads", requireTenant, async (req, res) => {
    try {
      const leads = await kanbanStorage.getAllLeads();
      res.json(leads);
    } catch (error) {
      console.error('Error fetching kanban leads:', error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  // Get single kanban lead
  app.get("/api/kanban-leads/:id", requireTenant, async (req, res) => {
    try {
      const lead = await kanbanStorage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error('Error fetching kanban lead:', error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });

  // Create kanban lead
  app.post("/api/kanban-leads", requireTenant, async (req, res) => {
    try {
      const validatedData = insertKanbanLeadSchema.parse(req.body);
      const lead = await kanbanStorage.createLead(validatedData);
      res.status(201).json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error('Error creating kanban lead:', error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  // Update kanban lead
  app.patch("/api/kanban-leads/:id", requireTenant, async (req, res) => {
    try {
      const lead = await kanbanStorage.updateLead(req.params.id, req.body);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error('Error updating kanban lead:', error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  // Delete kanban lead
  app.delete("/api/kanban-leads/:id", requireTenant, async (req, res) => {
    try {
      const success = await kanbanStorage.deleteLead(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting kanban lead:', error);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  // Logo upload endpoint
  app.post("/api/upload/logo", requireTenant, logoUpload.single('logo'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Nenhum arquivo foi enviado'
        });
      }

      const fileUrl = `/uploads/logos/${req.file.filename}`;
      
      res.json({
        success: true,
        url: fileUrl
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      res.status(500).json({
        success: false,
        error: 'Falha ao fazer upload da logo'
      });
    }
  });

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return httpServer;
}
