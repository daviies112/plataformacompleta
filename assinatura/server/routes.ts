import type { Express } from "express";
import { storage } from "./storage";
import { insertContractSchema, insertContractPartialSchema, insertSignatureLogSchema, insertUserSchema, insertAuditTrailSchema } from "@shared/schema";
import { z } from "zod";
import { validateDocument, quickValidate } from "./document-validator";

/**
 * API ROUTES - EXPRESS SERVER
 * 
 * IMPORTANTE: O endpoint /api/config/supabase é crítico!
 * 
 * Por que existe:
 * - React/Vite não consegue acessar REACT_APP_* environment variables
 * - Vite só funciona com VITE_* prefixed variables
 * - Mas nossos secrets estão como REACT_APP_* (padrão Replit/CRA)
 * - Server (Node.js) TEM acesso a REACT_APP_* via process.env
 * - Solução: Fornecer credenciais via REST endpoint
 * 
 * Fluxo:
 * Client → GET /api/config/supabase → Server → fetch env vars → return JSON
 * 
 * ⚠️ SEGURANÇA:
 * - VITE_SUPABASE_PUBLISHABLE_KEY é pública (anon key)
 * - Não expor secrets (REACT_APP_SUPABASE_SECRET_KEY se existisse)
 * - Usar apenas anon key para reduzir security surface
 */
export function registerRoutes(app: Express): void {
  // ==================== CONFIG ENDPOINTS ====================
  
  /**
   * GET /api/config/supabase
   * Retorna credenciais Supabase públicas (anon key) ao cliente
   * 
   * Response:
   * {
   *   "url": "https://xxxxx.supabase.co",
   *   "key": "eyJhbGc..." (anon key)
   * }
   * 
   * Debug:
   * curl http://localhost:5000/api/config/supabase
   */
  app.get("/api/config/supabase", (_req, res) => {
    // Tenta ambas variáveis (REACT_APP_* e VITE_*)
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
    
    if (supabaseUrl && supabaseKey) {
      res.json({
        url: supabaseUrl,
        key: supabaseKey
      });
    } else {
      // Retorna vazio se não houver credentials (client usará mock mode)
      res.json({
        url: '',
        key: ''
      });
    }
  });

  // ==================== DOCUMENT VALIDATION ENDPOINTS ====================
  // These endpoints are public (no auth required) as they're used during the signature flow

  /**
   * POST /api/assinatura/public/validate-document
   * Validates a Brazilian document image (CNH, RG, Passport)
   * Detects selfies and validates document characteristics
   * 
   * Request Body:
   * {
   *   "image": "base64 encoded image (with or without data URL prefix)",
   *   "documentType": "CNH" | "RG" | "PASSAPORTE" | "auto",
   *   "side": "front" | "back" (optional, for RG)
   * }
   * 
   * Response:
   * {
   *   "valid": boolean,
   *   "isSelfie": boolean,
   *   "confidence": number (0-100),
   *   "issues": string[],
   *   "documentType": string | null
   * }
   */
  app.post("/api/assinatura/public/validate-document", async (req, res) => {
    try {
      const { image, documentType, side } = req.body;
      
      if (!image) {
        return res.status(400).json({
          valid: false,
          isSelfie: false,
          confidence: 0,
          issues: ['Imagem não fornecida'],
          documentType: null
        });
      }
      
      if (!documentType) {
        return res.status(400).json({
          valid: false,
          isSelfie: false,
          confidence: 0,
          issues: ['Tipo de documento não especificado'],
          documentType: null
        });
      }
      
      const result = await validateDocument(image, documentType, side);
      res.json(result);
    } catch (error) {
      console.error("Error validating document:", error);
      res.status(500).json({
        valid: false,
        isSelfie: false,
        confidence: 0,
        issues: ['Erro interno ao validar documento'],
        documentType: null
      });
    }
  });

  /**
   * POST /api/assinatura/public/validate-document/quick
   * Quick pre-upload validation check
   * Only checks basic image validity and obvious selfie detection
   * 
   * Request Body:
   * {
   *   "image": "base64 encoded image"
   * }
   * 
   * Response:
   * {
   *   "valid": boolean,
   *   "reason": string
   * }
   */
  app.post("/api/assinatura/public/validate-document/quick", (req, res) => {
    try {
      const { image } = req.body;
      
      if (!image) {
        return res.json({
          valid: false,
          reason: 'Imagem não fornecida'
        });
      }
      
      const result = quickValidate(image);
      res.json(result);
    } catch (error) {
      console.error("Error in quick validation:", error);
      res.json({
        valid: false,
        reason: 'Erro ao processar imagem'
      });
    }
  });

  // ==================== CONTRACT ENDPOINTS ====================

  app.get("/api/contracts", async (_req, res) => {
    try {
      const contracts = await storage.getAllContracts();
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/contracts/by-id/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const contract = await storage.getContract(id);
      
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      
      res.json(contract);
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/contracts/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const contract = await storage.getContractByToken(token);
      
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      
      res.json(contract);
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/contracts", async (req, res) => {
    try {
      const validatedData = insertContractSchema.parse(req.body);
      const contract = await storage.createContract(validatedData);
      res.status(201).json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating contract:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/contracts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertContractPartialSchema.parse(req.body);
      const contract = await storage.updateContract(id, validatedData);
      
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      
      res.json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating contract:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/contracts/:id/finalize", async (req, res) => {
    try {
      const { id } = req.params;
      const { selfie_photo, document_photo, signed_contract_html, status } = req.body;
      
      const contract = await storage.updateContract(id, {
        selfie_photo,
        document_photo,
        signed_contract_html,
        status: status || 'signed',
        signed_at: new Date(),
      });
      
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      
      res.json(contract);
    } catch (error) {
      console.error("Error finalizing contract:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/contracts/:id/mark-signed", async (req, res) => {
    try {
      const { id } = req.params;
      
      const existingContract = await storage.getContractById(id);
      if (!existingContract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      
      if (existingContract.status === 'signed') {
        return res.json({ success: true, message: "Contract already signed", contract: existingContract });
      }
      
      if (existingContract.status !== 'contract_signed') {
        return res.status(400).json({ 
          error: "Contract must be in 'contract_signed' status to mark as fully signed",
          currentStatus: existingContract.status
        });
      }
      
      const contract = await storage.updateContract(id, {
        status: 'signed',
      });
      
      await storage.createAuditTrail({
        contract_id: id,
        action: 'signed',
        metadata: {
          previous_status: 'contract_signed',
          completed_residence_proof: true,
          completed_app_download_step: true,
        },
      });
      
      console.log(`[Assinatura] Contract ${id} marked as fully signed after completing all steps`);
      
      res.json({ success: true, contract });
    } catch (error) {
      console.error("Error marking contract as signed:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.upsertUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/signature-logs", async (req, res) => {
    try {
      const validatedData = insertSignatureLogSchema.parse(req.body);
      const log = await storage.createSignatureLog(validatedData);
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating signature log:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/audit-trail", async (req, res) => {
    try {
      const validatedData = insertAuditTrailSchema.parse(req.body);
      const audit = await storage.createAuditTrail(validatedData);
      res.status(201).json(audit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating audit trail:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
