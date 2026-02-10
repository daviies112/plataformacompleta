import type { Express, Request, Response } from "express";
import { db } from "../db";
import { 
  configurationsWhatsapp, 
  insertConfigurationWhatsappSchema,
  leads,
  insertLeadSchema,
  whatsappLabels,
  insertWhatsappLabelSchema,
  type InsertConfigurationWhatsapp,
  type ConfigurationWhatsapp,
  type InsertLead,
  type Lead,
  type InsertWhatsappLabel,
  type WhatsappLabel
} from "../../shared/db-schema";
import { eq, desc, and } from "drizzle-orm";

// ============================================================================
// STORAGE LAYER - Database operations
// ============================================================================

class WhatsAppStorage {
  // Configuration methods - 🔐 MULTI-TENANT: Requires tenantId
  async getConfiguration(tenantId: string): Promise<ConfigurationWhatsapp | undefined> {
    if (!tenantId) {
      console.error('❌ [WHATSAPP_CONFIG] tenantId é obrigatório');
      return undefined;
    }

    const results = await db
      .select()
      .from(configurationsWhatsapp)
      .where(eq(configurationsWhatsapp.tenantId, tenantId))
      .limit(1);
    
    return results[0];
  }

  async setConfiguration(tenantId: string, config: InsertConfigurationWhatsapp): Promise<ConfigurationWhatsapp> {
    if (!tenantId) {
      throw new Error('❌ [WHATSAPP_CONFIG] tenantId é obrigatório');
    }
    
    // Check if configuration already exists
    const existing = await this.getConfiguration(tenantId);
    
    if (existing) {
      // Update existing configuration
      const updated = await db
        .update(configurationsWhatsapp)
        .set({
          apiUrlWhatsapp: config.apiUrlWhatsapp,
          apiKeyWhatsapp: config.apiKeyWhatsapp,
          instanceWhatsapp: config.instanceWhatsapp,
          updatedAtWhatsapp: new Date(),
        })
        .where(eq(configurationsWhatsapp.tenantId, tenantId))
        .returning();
      
      return updated[0];
    } else {
      // Insert new configuration
      const inserted = await db
        .insert(configurationsWhatsapp)
        .values({
          tenantId,
          apiUrlWhatsapp: config.apiUrlWhatsapp,
          apiKeyWhatsapp: config.apiKeyWhatsapp,
          instanceWhatsapp: config.instanceWhatsapp,
        })
        .returning();
      
      return inserted[0];
    }
  }

  // Lead methods
  async getLeads(tenantId: string, filters?: { formStatus?: string; qualificationStatus?: string }): Promise<any[]> {
    let query = db.select().from(leads);
    
    const conditions = [eq(leads.tenantId, tenantId)];
    if (filters?.formStatus) {
      conditions.push(eq(leads.formStatus, filters.formStatus));
    }
    if (filters?.qualificationStatus) {
      conditions.push(eq(leads.qualificationStatus, filters.qualificationStatus));
    }
    
    query = query.where(and(...conditions));
    
    const leadsList = await query.orderBy(desc(leads.createdAt));
    
    // Buscar todas as labels uma vez para performance
    const allLabels = await this.getLabels();
    const defaultLabel = allLabels.find(l => l.formStatus === 'not_sent') || allLabels[0];
    
    // Adicionar label apropriada a cada lead
    return leadsList.map(lead => {
      // PASSO 1: Tentar match EXATO (formStatus + qualificationStatus)
      let matchedLabel = allLabels.find(label => {
        return label.formStatus === lead.formStatus && 
               label.qualificationStatus === lead.qualificationStatus;
      });
      
      // PASSO 2: Se não houver match exato, tentar match PARCIAL (formStatus + null)
      if (!matchedLabel) {
        matchedLabel = allLabels.find(label => {
          return label.formStatus === lead.formStatus && 
                 label.qualificationStatus === null;
        });
      }
      
      // PASSO 3: Usar label padrão "Contato Inicial" se não houver nenhum match
      if (!matchedLabel) {
        matchedLabel = defaultLabel;
      }
      
      return {
        ...lead,
        label: matchedLabel || { nome: 'Sem Etiqueta', cor: 'hsl(0, 0%, 50%)' }
      };
    });
  }

  async getLeadById(id: string, tenantId: string): Promise<any | undefined> {
    const results = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.tenantId, tenantId)))
      .limit(1);
    
    const lead = results[0];
    if (!lead) return undefined;
    
    // Adicionar label ao lead individual
    const allLabels = await this.getLabels();
    const defaultLabel = allLabels.find(l => l.formStatus === 'not_sent') || allLabels[0];
    
    // PASSO 1: Tentar match EXATO (formStatus + qualificationStatus)
    let matchedLabel = allLabels.find(label => {
      return label.formStatus === lead.formStatus && 
             label.qualificationStatus === lead.qualificationStatus;
    });
    
    // PASSO 2: Se não houver match exato, tentar match PARCIAL (formStatus + null)
    if (!matchedLabel) {
      matchedLabel = allLabels.find(label => {
        return label.formStatus === lead.formStatus && 
               label.qualificationStatus === null;
      });
    }
    
    // PASSO 3: Usar label padrão "Contato Inicial" se não houver nenhum match
    if (!matchedLabel) {
      matchedLabel = defaultLabel;
    }
    
    return {
      ...lead,
      label: matchedLabel || { nome: 'Sem Etiqueta', cor: 'hsl(0, 0%, 50%)' }
    };
  }

  async getLeadByPhone(telefoneNormalizado: string, tenantId: string): Promise<Lead | undefined> {
    const results = await db
      .select()
      .from(leads)
      .where(and(eq(leads.telefoneNormalizado, telefoneNormalizado), eq(leads.tenantId, tenantId)))
      .limit(1);
    
    return results[0];
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    // Garantir que leads sem formStatus definido iniciam como "not_sent" (Contato Inicial)
    const leadData = {
      ...lead,
      formStatus: lead.formStatus || 'not_sent',
      qualificationStatus: lead.qualificationStatus || null,
      pontuacao: lead.pontuacao !== undefined ? lead.pontuacao : null,
    };
    
    const inserted = await db
      .insert(leads)
      .values(leadData)
      .returning();
    
    return inserted[0];
  }

  async updateLead(id: string, updates: Partial<InsertLead>): Promise<Lead> {
    const updated = await db
      .update(leads)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();
    
    return updated[0];
  }

  async deleteLead(id: string): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }

  // Label methods
  async getLabels(): Promise<WhatsappLabel[]> {
    return await db
      .select()
      .from(whatsappLabels)
      .where(eq(whatsappLabels.ativo, true))
      .orderBy(whatsappLabels.ordem);
  }

  async getLabelById(id: string): Promise<WhatsappLabel | undefined> {
    const results = await db
      .select()
      .from(whatsappLabels)
      .where(eq(whatsappLabels.id, id))
      .limit(1);
    
    return results[0];
  }

  async createLabel(label: InsertWhatsappLabel): Promise<WhatsappLabel> {
    const inserted = await db
      .insert(whatsappLabels)
      .values(label)
      .returning();
    
    return inserted[0];
  }

  async updateLabel(id: string, updates: Partial<InsertWhatsappLabel>): Promise<WhatsappLabel> {
    const updated = await db
      .update(whatsappLabels)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(whatsappLabels.id, id))
      .returning();
    
    return updated[0];
  }

  async deleteLabel(id: string): Promise<void> {
    await db.delete(whatsappLabels).where(eq(whatsappLabels.id, id));
  }
}

const storage = new WhatsAppStorage();

// ============================================================================
// ROUTES REGISTRATION
// ============================================================================

export function registerWhatsAppCompleteRoutes(app: Express) {
  // ============================================================================
  // CONFIGURATION ROUTES
  // ============================================================================

  // Get WhatsApp configuration - 🔐 MULTI-TENANT
  app.get("/api/whatsapp-complete/config", async (req: Request, res: Response) => {
    try {
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ success: false, error: "❌ Tenant não autenticado" });
      }

      const config = await storage.getConfiguration(tenantId);
      
      if (!config) {
        return res.status(404).json({ success: false, error: "Configuration not found" });
      }
      
      res.json({ success: true, config });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Save/Update WhatsApp configuration - 🔐 MULTI-TENANT
  app.post("/api/whatsapp-complete/config", async (req: Request, res: Response) => {
    try {
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ success: false, error: "❌ Tenant não autenticado" });
      }

      const config = insertConfigurationWhatsappSchema.parse(req.body);
      const savedConfig = await storage.setConfiguration(tenantId, config);
      res.json({ success: true, config: savedConfig });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ============================================================================
  // LEAD ROUTES
  // ============================================================================

  // Get all leads with optional filters - 🔐 MULTI-TENANT
  app.get("/api/whatsapp-complete/leads", async (req: Request, res: Response) => {
    try {
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ success: false, error: "❌ Tenant não autenticado" });
      }

      const { formStatus, qualificationStatus } = req.query;
      
      const filters: any = {};
      if (formStatus) filters.formStatus = formStatus as string;
      if (qualificationStatus) filters.qualificationStatus = qualificationStatus as string;
      
      const leadsList = await storage.getLeads(tenantId, filters);
      res.json({ success: true, leads: leadsList });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get lead WhatsApp status summary - 🔐 MULTI-TENANT
  app.get("/api/whatsapp-complete/leads/whatsapp-status", async (req: Request, res: Response) => {
    try {
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ success: false, error: "❌ Tenant não autenticado" });
      }

      const allLeads = await storage.getLeads(tenantId);
      
      const summary = {
        total: allLeads.length,
        byFormStatus: {
          not_sent: allLeads.filter(l => l.formStatus === 'not_sent').length,
          sent: allLeads.filter(l => l.formStatus === 'sent').length,
          opened: allLeads.filter(l => l.formStatus === 'opened').length,
          incomplete: allLeads.filter(l => l.formStatus === 'incomplete').length,
          completed: allLeads.filter(l => l.formStatus === 'completed').length,
        },
        byQualification: {
          pending: allLeads.filter(l => l.qualificationStatus === 'pending').length,
          approved: allLeads.filter(l => l.qualificationStatus === 'approved').length,
          rejected: allLeads.filter(l => l.qualificationStatus === 'rejected').length,
        }
      };
      
      res.json({ success: true, summary });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get single lead by ID - 🔐 MULTI-TENANT
  app.get("/api/whatsapp-complete/leads/:id", async (req: Request, res: Response) => {
    try {
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ success: false, error: "❌ Tenant não autenticado" });
      }

      const { id } = req.params;
      const lead = await storage.getLeadById(id, tenantId);
      
      if (!lead) {
        return res.status(404).json({ success: false, error: "Lead not found" });
      }
      
      res.json({ success: true, lead });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create new lead
  app.post("/api/whatsapp-complete/leads", async (req: Request, res: Response) => {
    try {
      const leadData = insertLeadSchema.parse(req.body);
      const newLead = await storage.createLead(leadData);
      res.json({ success: true, lead: newLead });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Update lead
  app.put("/api/whatsapp-complete/leads/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedLead = await storage.updateLead(id, updates);
      res.json({ success: true, lead: updatedLead });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Delete lead
  app.delete("/api/whatsapp-complete/leads/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteLead(id);
      res.json({ success: true, message: "Lead deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================================================
  // LABEL ROUTES
  // ============================================================================

  // Get all labels
  app.get("/api/whatsapp-complete/labels", async (req: Request, res: Response) => {
    try {
      const labelsList = await storage.getLabels();
      res.json({ success: true, labels: labelsList });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get single label by ID
  app.get("/api/whatsapp-complete/labels/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const label = await storage.getLabelById(id);
      
      if (!label) {
        return res.status(404).json({ success: false, error: "Label not found" });
      }
      
      res.json({ success: true, label });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create new label
  app.post("/api/whatsapp-complete/labels", async (req: Request, res: Response) => {
    try {
      const labelData = insertWhatsappLabelSchema.parse(req.body);
      const newLabel = await storage.createLabel(labelData);
      res.json({ success: true, label: newLabel });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Update label
  app.put("/api/whatsapp-complete/labels/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedLabel = await storage.updateLabel(id, updates);
      res.json({ success: true, label: updatedLabel });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Delete label
  app.delete("/api/whatsapp-complete/labels/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteLabel(id);
      res.json({ success: true, message: "Label deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================================================
  // EVOLUTION API PROXY ROUTES (from original routes.ts)
  // ============================================================================

  // Generic Evolution API proxy - 🔐 MULTI-TENANT
  app.post("/api/whatsapp-complete/evolution/proxy", async (req: Request, res: Response) => {
    try {
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "❌ Tenant não autenticado" });
      }

      const { method = "GET", endpoint, body } = req.body;

      const config = await storage.getConfiguration(tenantId);
      if (!config) {
        return res.status(400).json({ error: "Evolution API not configured" });
      }

      const baseUrl = config.apiUrlWhatsapp.replace(/\/$/, "");
      const encodedInstance = encodeURIComponent(config.instanceWhatsapp);
      const finalEndpoint = endpoint || `/instance/connectionState/${encodedInstance}`;
      const url = `${baseUrl}${finalEndpoint}`;

      console.log("Making request to Evolution API:", { url, method });

      const response = await fetch(url, {
        method,
        headers: {
          apikey: config.apiKeyWhatsapp,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      res.json({
        success: response.ok,
        status: response.status,
        data: responseData,
      });
    } catch (error: any) {
      console.error("Evolution proxy error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Fetch chats - 🔐 MULTI-TENANT
  app.post("/api/whatsapp-complete/evolution/chats", async (req: Request, res: Response) => {
    try {
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "❌ Tenant não autenticado" });
      }

      const config = await storage.getConfiguration(tenantId);
      if (!config) {
        return res.status(400).json({ error: "Evolution API not configured" });
      }

      const baseUrl = config.apiUrlWhatsapp.replace(/\/$/, "");
      const encodedInstance = encodeURIComponent(config.instanceWhatsapp);
      const url = `${baseUrl}/chat/findChats/${encodedInstance}`;

      console.log("Fetching chats from:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          apikey: config.apiKeyWhatsapp,
          "Content-Type": "application/json",
        },
      });

      const responseText = await response.text();
      let chatsData;
      try {
        chatsData = JSON.parse(responseText);
      } catch {
        chatsData = { raw: responseText };
      }

      if (!response.ok) {
        return res.json({
          success: false,
          error: `API returned status ${response.status}`,
          details: responseText,
        });
      }

      res.json({
        success: true,
        chats: chatsData,
      });
    } catch (error: any) {
      console.error("Error fetching chats:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Fetch contacts - 🔐 MULTI-TENANT
  app.post("/api/whatsapp-complete/evolution/contacts", async (req: Request, res: Response) => {
    try {
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "❌ Tenant não autenticado" });
      }

      const config = await storage.getConfiguration(tenantId);
      if (!config) {
        return res.status(400).json({ error: "Evolution API not configured" });
      }

      const baseUrl = config.apiUrlWhatsapp.replace(/\/$/, "");
      const encodedInstance = encodeURIComponent(config.instanceWhatsapp);
      const url = `${baseUrl}/chat/findContacts/${encodedInstance}`;

      console.log("Fetching contacts from:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          apikey: config.apiKeyWhatsapp,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const responseData = await response.json();

      if (!response.ok) {
        return res.json({
          success: false,
          error: `Evolution API error: ${response.status}`,
          data: responseData,
        });
      }

      const contacts = Array.isArray(responseData) ? responseData : responseData.contacts || [];

      res.json({
        success: true,
        contacts: contacts,
      });
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Fetch messages for a chat - 🔐 MULTI-TENANT
  app.post("/api/whatsapp-complete/evolution/messages", async (req: Request, res: Response) => {
    try {
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "❌ Tenant não autenticado" });
      }

      const { chatId } = req.body;

      const config = await storage.getConfiguration(tenantId);
      if (!config || !chatId) {
        return res.status(400).json({ 
          error: "Missing required parameters: chatId" 
        });
      }

      const baseUrl = config.apiUrlWhatsapp.replace(/\/$/, "");
      const encodedInstance = encodeURIComponent(config.instanceWhatsapp);
      const url = `${baseUrl}/chat/findMessages/${encodedInstance}`;

      console.log("Fetching messages from:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          apikey: config.apiKeyWhatsapp,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          where: {
            key: {
              remoteJid: chatId,
            },
          },
          limit: 100,
        }),
      });

      const responseText = await response.text();
      let messagesData;
      try {
        messagesData = JSON.parse(responseText);
      } catch {
        messagesData = { raw: responseText };
      }

      if (!response.ok) {
        return res.json({
          success: false,
          error: `API returned status ${response.status}`,
          details: responseText,
        });
      }

      // Extract records array
      let messages: any[] = [];
      if (Array.isArray(messagesData)) {
        messages = messagesData;
      } else if (messagesData?.messages?.records) {
        messages = messagesData.messages.records;
      } else if (messagesData?.records) {
        messages = messagesData.records;
      } else if (messagesData?.messages && Array.isArray(messagesData.messages)) {
        messages = messagesData.messages;
      }

      res.json({
        success: true,
        messages: messages,
      });
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Send text message - 🔐 MULTI-TENANT
  app.post("/api/whatsapp-complete/evolution/send-message", async (req: Request, res: Response) => {
    try {
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "❌ Tenant não autenticado" });
      }

      const { number, text } = req.body;

      const config = await storage.getConfiguration(tenantId);
      if (!config || !number || !text) {
        return res.status(400).json({
          success: false,
          error: "Missing required parameters",
          details: "number and text are required",
        });
      }

      const baseUrl = config.apiUrlWhatsapp.replace(/\/$/, "");
      const encodedInstance = encodeURIComponent(config.instanceWhatsapp);

      // Clean number (remove @s.whatsapp.net if exists)
      let cleanNumber = number;
      if (cleanNumber.includes("@")) {
        cleanNumber = cleanNumber.split("@")[0];
      }

      const url = `${baseUrl}/message/sendText/${encodedInstance}`;

      console.log("Sending message to:", url, "number:", cleanNumber);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          apikey: config.apiKeyWhatsapp,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: cleanNumber,
          text: text,
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = `API returned status ${response.status}`;
        let errorDetails = responseText;

        try {
          const errorData = JSON.parse(responseText);
          if (errorData?.response?.message === "Connection Closed") {
            errorMessage = "WhatsApp não está conectado. Por favor, conecte sua instância primeiro.";
          } else if (errorData?.error) {
            errorMessage = errorData.error;
          }
          errorDetails = JSON.stringify(errorData);
        } catch (parseError) {
          // ignore parse errors
        }

        return res.json({
          success: false,
          error: errorMessage,
          details: errorDetails,
        });
      }

      let messageData;
      try {
        messageData = JSON.parse(responseText);
      } catch {
        messageData = { raw: responseText };
      }

      res.json({
        success: true,
        data: messageData,
      });
    } catch (error: any) {
      console.error("Error sending message:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Send media (image, video, document) - 🔐 MULTI-TENANT
  app.post("/api/whatsapp-complete/evolution/send-media", async (req: Request, res: Response) => {
    try {
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "❌ Tenant não autenticado" });
      }

      const { number, mediatype, mimetype, media, caption, fileName } = req.body;

      const config = await storage.getConfiguration(tenantId);
      if (!config || !number || !mediatype || !mimetype || !media) {
        return res.status(400).json({
          success: false,
          error: "Missing required parameters",
          details: "number, mediatype, mimetype, and media are required",
        });
      }

      if (!["image", "video", "document"].includes(mediatype)) {
        return res.status(400).json({
          success: false,
          error: "Invalid mediatype",
          details: 'mediatype must be "image", "video", or "document"',
        });
      }

      const baseUrl = config.apiUrlWhatsapp.replace(/\/$/, "");
      const encodedInstance = encodeURIComponent(config.instanceWhatsapp);

      // Clean number
      let cleanNumber = number;
      if (cleanNumber.includes("@")) {
        cleanNumber = cleanNumber.split("@")[0];
      }

      const url = `${baseUrl}/message/sendMedia/${encodedInstance}`;

      console.log("Sending media to:", url, "type:", mediatype);

      const requestBody: any = {
        number: cleanNumber,
        mediatype,
        mimetype,
        media,
      };

      if (caption) {
        requestBody.caption = caption;
      }

      if (fileName && mediatype === "document") {
        requestBody.fileName = fileName;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          apikey: config.apiKeyWhatsapp,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = `API returned status ${response.status}`;
        let errorDetails = responseText;

        try {
          const errorData = JSON.parse(responseText);
          if (errorData?.response?.message === "Connection Closed") {
            errorMessage = "WhatsApp não está conectado.";
          } else if (errorData?.error) {
            errorMessage = errorData.error;
          }
          errorDetails = JSON.stringify(errorData);
        } catch (parseError) {
          // ignore
        }

        return res.json({
          success: false,
          error: errorMessage,
          details: errorDetails,
        });
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      res.json({
        success: true,
        data: responseData,
      });
    } catch (error: any) {
      console.error("Error sending media:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Send audio - 🔐 MULTI-TENANT
  app.post("/api/whatsapp-complete/evolution/send-audio", async (req: Request, res: Response) => {
    try {
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "❌ Tenant não autenticado" });
      }

      const { number, audioBase64 } = req.body;

      const config = await storage.getConfiguration(tenantId);
      if (!config || !number || !audioBase64) {
        return res.status(400).json({
          error: "Missing required parameters",
        });
      }

      const baseUrl = config.apiUrlWhatsapp.replace(/\/$/, "");
      const encodedInstance = encodeURIComponent(config.instanceWhatsapp);
      const url = `${baseUrl}/message/sendWhatsAppAudio/${encodedInstance}`;

      console.log("Sending audio to:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          apikey: config.apiKeyWhatsapp,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: number,
          audio: audioBase64,
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        return res.json({
          success: false,
          error: `API returned status ${response.status}`,
          details: responseText,
        });
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      res.json({
        success: true,
        data: responseData,
      });
    } catch (error: any) {
      console.error("Error sending audio:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // ============================================================================
  // SINCRONIZAÇÃO COM SUPABASE form_submissions
  // ============================================================================
  
  // Força sincronização de TODOS os form_submissions do Supabase com leads
  app.post("/api/whatsapp-complete/sync-from-supabase", async (req: Request, res: Response) => {
    try {
      console.log('🔄 [SYNC] Iniciando sincronização manual de form_submissions...');
      
      // Importar serviços necessários
      const { leadSyncService } = await import('../formularios/services/leadSync.js');
      const { getDynamicSupabaseClient } = await import('../formularios/utils/supabaseClient.js');
      
      // Buscar cliente Supabase
      const supabase = await getDynamicSupabaseClient();
      
      if (!supabase) {
        return res.status(400).json({ 
          success: false, 
          error: 'Supabase não configurado' 
        });
      }
      
      // Buscar TODAS as submissions do Supabase
      console.log('📡 [SYNC] Buscando submissions do Supabase...');
      const { data: submissions, error } = await supabase
        .from('form_submissions')
        .select('*');
      
      if (error) {
        console.error('❌ [SYNC] Erro ao buscar submissions:', error);
        return res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
      
      if (!submissions || submissions.length === 0) {
        console.log('ℹ️ [SYNC] Nenhuma submission encontrada no Supabase');
        return res.json({ 
          success: true, 
          message: 'Nenhuma submission para sincronizar',
          synced: 0,
          errors: 0
        });
      }
      
      console.log(`📊 [SYNC] ${submissions.length} submissions encontradas - sincronizando...`);
      
      let synced = 0;
      let errors = 0;
      const results = [];
      
      // Sincronizar cada submission
      for (const submission of submissions) {
        try {
          const result = await leadSyncService.syncSubmissionToLead({
            id: submission.id,
            formId: submission.form_id,
            contactPhone: submission.contact_phone,
            contactName: submission.contact_name,
            contactEmail: submission.contact_email,
            totalScore: submission.total_score,
            passed: submission.passed,
          });
          
          if (result.success) {
            synced++;
            results.push({
              submissionId: submission.id,
              phone: submission.contact_phone,
              status: 'synced',
              leadId: result.leadId
            });
          } else {
            errors++;
            results.push({
              submissionId: submission.id,
              phone: submission.contact_phone,
              status: 'error',
              error: result.message
            });
          }
        } catch (syncError: any) {
          errors++;
          console.error(`⚠️ [SYNC] Erro ao sincronizar submission ${submission.id}:`, syncError);
          results.push({
            submissionId: submission.id,
            phone: submission.contact_phone,
            status: 'error',
            error: syncError.message
          });
        }
      }
      
      console.log(`✅ [SYNC] Sincronização concluída: ${synced} sincronizados, ${errors} erros`);
      
      res.json({ 
        success: true, 
        message: 'Sincronização concluída',
        total: submissions.length,
        synced,
        errors,
        results
      });
    } catch (error: any) {
      console.error('❌ [SYNC] Erro na sincronização:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // ============================================================================
  // CPF COMPLIANCE STATUS FROM SUPABASE MASTER
  // ============================================================================
  
  // Get CPF compliance status for leads - 🔐 MULTI-TENANT
  // Connects to Supabase Master (datacorp_checks) to get CPF status
  app.post("/api/whatsapp-complete/leads/cpf-compliance", async (req: Request, res: Response) => {
    try {
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ success: false, error: "❌ Tenant não autenticado" });
      }

      const { phoneNumbers } = req.body;
      
      if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        return res.json({ success: true, complianceMap: {} });
      }

      console.log(`🔍 [CPF-COMPLIANCE] Buscando status de compliance para ${phoneNumbers.length} números...`);
      
      // Import Supabase Master client
      const { getSupabaseMaster, isSupabaseMasterConfigured } = await import('../lib/supabaseMaster.js');
      const { tenantIdToUUID, hashCPF } = await import('../lib/cryptoCompliance.js');
      
      if (!isSupabaseMasterConfigured()) {
        console.log('⚠️ [CPF-COMPLIANCE] Supabase Master não configurado');
        return res.json({ 
          success: true, 
          complianceMap: {},
          message: 'Supabase Master não configurado - status de CPF não disponível'
        });
      }

      const supabaseMaster = getSupabaseMaster();
      const tenantUUID = tenantIdToUUID(tenantId);
      
      // Get all leads for this tenant with their phones
      const allLeads = await storage.getLeads(tenantId);
      
      // Create a map of normalized phone -> lead with CPF hash
      const phoneToLeadMap: Record<string, { id: string; cpf?: string; cpfHash?: string; submissionId?: string }> = {};
      for (const lead of allLeads) {
        if (lead.telefoneNormalizado) {
          phoneToLeadMap[lead.telefoneNormalizado] = {
            id: lead.id,
            cpf: lead.cpf,
            cpfHash: lead.cpf ? hashCPF(lead.cpf) : undefined,
            submissionId: lead.submissionId
          };
        }
      }
      
      // Also create CPF hash -> phone map for reverse lookup
      const cpfHashToPhoneMap: Record<string, string> = {};
      for (const [phone, lead] of Object.entries(phoneToLeadMap)) {
        if (lead.cpfHash) {
          cpfHashToPhoneMap[lead.cpfHash] = phone;
        }
      }
      
      // Get compliance checks from Supabase Master for this tenant
      const { data: checks, error } = await supabaseMaster
        .from('datacorp_checks')
        .select('*')
        .eq('tenant_id', tenantUUID)
        .gt('expires_at', new Date().toISOString())
        .order('consulted_at', { ascending: false });
      
      if (error) {
        console.error('❌ [CPF-COMPLIANCE] Erro ao buscar checks:', error);
        return res.json({ 
          success: true, 
          complianceMap: {},
          error: error.message
        });
      }
      
      console.log(`📊 [CPF-COMPLIANCE] Encontrados ${checks?.length || 0} checks de compliance`);
      
      // Create compliance map indexed by phone number
      const complianceMap: Record<string, {
        status: string;
        riskScore: number;
        hasCheck: boolean;
        consultedAt?: string;
        totalLawsuits?: number;
        hasActiveCollections?: boolean;
        taxIdStatus?: string;
        personName?: string;
      }> = {};
      
      // Map checks to phone numbers via CPF hash (primary), lead_id, or submission_id
      if (checks && checks.length > 0) {
        for (const check of checks) {
          // First try: Match by CPF hash (most reliable)
          const matchedPhoneByCPF = check.cpf_hash ? cpfHashToPhoneMap[check.cpf_hash] : null;
          
          if (matchedPhoneByCPF && !complianceMap[matchedPhoneByCPF]) {
            const payload = check.payload || {};
            const processData = payload.Result?.[0]?.Processes;
            const basicData = payload._basic_data?.Result?.[0]?.BasicData;
            const collectionsData = payload._collections?.Result?.[0]?.Collections;
            
            complianceMap[matchedPhoneByCPF] = {
              status: check.status,
              riskScore: check.risk_score || 0,
              hasCheck: true,
              consultedAt: check.consulted_at,
              totalLawsuits: processData?.TotalLawsuits || 0,
              hasActiveCollections: collectionsData?.HasActiveCollections || false,
              taxIdStatus: basicData?.TaxIdStatus || 'Não verificado',
              personName: check.person_name || basicData?.Name
            };
            continue;
          }
          
          // Fallback: Match by lead_id or submission_id
          for (const [phone, lead] of Object.entries(phoneToLeadMap)) {
            if (complianceMap[phone]) continue;
            
            const matchByLeadId = check.lead_id && lead.id === check.lead_id;
            const matchBySubmissionId = check.submission_id && lead.submissionId === check.submission_id;
            
            if (matchByLeadId || matchBySubmissionId) {
              const payload = check.payload || {};
              const processData = payload.Result?.[0]?.Processes;
              const basicData = payload._basic_data?.Result?.[0]?.BasicData;
              const collectionsData = payload._collections?.Result?.[0]?.Collections;
              
              complianceMap[phone] = {
                status: check.status,
                riskScore: check.risk_score || 0,
                hasCheck: true,
                consultedAt: check.consulted_at,
                totalLawsuits: processData?.TotalLawsuits || 0,
                hasActiveCollections: collectionsData?.HasActiveCollections || false,
                taxIdStatus: basicData?.TaxIdStatus || 'Não verificado',
                personName: check.person_name || basicData?.Name
              };
              break;
            }
          }
        }
      }
      
      const leadsWithCPF = Object.values(phoneToLeadMap).filter(l => l.cpfHash).length;
      console.log(`📊 [CPF-COMPLIANCE] Leads com CPF cadastrado: ${leadsWithCPF}/${Object.keys(phoneToLeadMap).length}`);
      console.log(`✅ [CPF-COMPLIANCE] Mapa de compliance criado com ${Object.keys(complianceMap).length} entradas`);
      
      res.json({ 
        success: true, 
        complianceMap,
        totalChecks: checks?.length || 0
      });
    } catch (error: any) {
      console.error('❌ [CPF-COMPLIANCE] Erro:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Proxy media (download media from Evolution API) - 🔐 MULTI-TENANT
  app.post("/api/whatsapp-complete/evolution/proxy-media", async (req: Request, res: Response) => {
    try {
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "❌ Tenant não autenticado" });
      }

      const { messageKey } = req.body;

      const config = await storage.getConfiguration(tenantId);
      if (!config || !messageKey) {
        return res.status(400).json({
          error: "Missing required parameters: messageKey",
        });
      }

      const baseUrl = config.apiUrlWhatsapp.replace(/\/$/, "");
      const encodedInstance = encodeURIComponent(config.instanceWhatsapp);
      const url = `${baseUrl}/chat/getBase64FromMediaMessage/${encodedInstance}`;

      console.log("Downloading media from:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          apikey: config.apiKeyWhatsapp,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            key: messageKey,
          },
          convertToMp4: false,
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        return res.json({
          success: false,
          error: `API returned status ${response.status}`,
          details: responseText,
        });
      }

      let mediaData;
      try {
        mediaData = JSON.parse(responseText);
      } catch {
        mediaData = { raw: responseText };
      }

      res.json({
        success: true,
        base64: mediaData.base64,
        mimetype: mediaData.mimetype,
      });
    } catch (error: any) {
      console.error("Error downloading media:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });
}
