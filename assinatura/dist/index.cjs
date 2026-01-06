var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  auditTrail: () => auditTrail,
  contracts: () => contracts,
  insertAuditTrailSchema: () => insertAuditTrailSchema,
  insertContractPartialSchema: () => insertContractPartialSchema,
  insertContractSchema: () => insertContractSchema,
  insertSignatureLogSchema: () => insertSignatureLogSchema,
  insertUserSchema: () => insertUserSchema,
  signatureLogs: () => signatureLogs,
  users: () => users
});
import { pgTable, text, varchar, boolean, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  cpf: varchar("cpf", { length: 14 }).notNull().unique(),
  nome_completo: varchar("nome_completo", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  telefone: varchar("telefone", { length: 20 }),
  cep: varchar("cep", { length: 10 }),
  rua: varchar("rua", { length: 255 }),
  numero: varchar("numero", { length: 20 }),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  endereco_completo: text("endereco_completo"),
  govbr_verified: boolean("govbr_verified").default(false),
  govbr_nivel_conta: varchar("govbr_nivel_conta", { length: 20 }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var contracts = pgTable("contracts", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  contract_html: text("contract_html").notNull(),
  contract_pdf_url: text("contract_pdf_url"),
  status: varchar("status", { length: 50 }).default("pending"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  signed_at: timestamp("signed_at", { withTimezone: true }),
  protocol_number: varchar("protocol_number", { length: 50 }).unique(),
  client_name: varchar("client_name").notNull().default(""),
  client_cpf: varchar("client_cpf").notNull().default(""),
  client_email: varchar("client_email").notNull().default(""),
  client_phone: varchar("client_phone"),
  access_token: uuid("access_token").defaultRandom().unique(),
  logo_url: text("logo_url"),
  logo_size: varchar("logo_size", { length: 20 }).default("medium"),
  logo_position: varchar("logo_position", { length: 20 }).default("center"),
  primary_color: varchar("primary_color", { length: 7 }),
  text_color: varchar("text_color", { length: 7 }).default("#333333"),
  font_family: varchar("font_family", { length: 100 }),
  font_size: varchar("font_size", { length: 20 }),
  company_name: varchar("company_name", { length: 255 }),
  footer_text: text("footer_text"),
  maleta_card_color: varchar("maleta_card_color", { length: 7 }).default("#dbeafe"),
  maleta_button_color: varchar("maleta_button_color", { length: 7 }).default("#22c55e"),
  maleta_text_color: varchar("maleta_text_color", { length: 7 }).default("#1e40af"),
  verification_primary_color: varchar("verification_primary_color", { length: 7 }),
  verification_text_color: varchar("verification_text_color", { length: 7 }).default("#000000"),
  verification_font_family: varchar("verification_font_family", { length: 100 }),
  verification_font_size: varchar("verification_font_size", { length: 20 }),
  verification_logo_url: text("verification_logo_url"),
  verification_logo_size: varchar("verification_logo_size", { length: 20 }),
  verification_logo_position: varchar("verification_logo_position", { length: 20 }),
  verification_footer_text: text("verification_footer_text"),
  verification_background_image: text("verification_background_image"),
  verification_background_color: varchar("verification_background_color", { length: 7 }).default("#ffffff"),
  verification_icon_url: text("verification_icon_url"),
  verification_welcome_text: varchar("verification_welcome_text", { length: 255 }),
  verification_instructions: text("verification_instructions"),
  verification_header_background_color: varchar("verification_header_background_color", { length: 7 }).default("#2c3e50"),
  verification_header_logo_url: text("verification_header_logo_url"),
  verification_header_company_name: varchar("verification_header_company_name", { length: 255 }),
  progress_card_color: varchar("progress_card_color", { length: 7 }).default("#dbeafe"),
  progress_button_color: varchar("progress_button_color", { length: 7 }).default("#22c55e"),
  progress_text_color: varchar("progress_text_color", { length: 7 }).default("#1e40af"),
  progress_title: varchar("progress_title", { length: 100 }).default("Assinatura Digital"),
  progress_subtitle: text("progress_subtitle"),
  progress_step1_title: varchar("progress_step1_title", { length: 255 }),
  progress_step1_description: text("progress_step1_description"),
  progress_step2_title: varchar("progress_step2_title", { length: 255 }),
  progress_step2_description: text("progress_step2_description"),
  progress_step3_title: varchar("progress_step3_title", { length: 255 }),
  progress_step3_description: text("progress_step3_description"),
  progress_button_text: varchar("progress_button_text", { length: 255 }),
  progress_font_family: varchar("progress_font_family", { length: 100 }),
  progress_font_size: varchar("progress_font_size", { length: 20 }),
  app_store_url: text("app_store_url"),
  google_play_url: text("google_play_url"),
  selfie_photo: text("selfie_photo"),
  document_photo: text("document_photo"),
  signed_contract_html: text("signed_contract_html")
});
var signatureLogs = pgTable("signature_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  contract_id: uuid("contract_id").references(() => contracts.id, { onDelete: "cascade" }),
  ip_address: varchar("ip_address", { length: 45 }).notNull(),
  user_agent: text("user_agent"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  govbr_token_hash: varchar("govbr_token_hash", { length: 255 }),
  govbr_auth_time: timestamp("govbr_auth_time", { withTimezone: true }),
  signature_valid: boolean("signature_valid").default(true),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var auditTrail = pgTable("audit_trail", {
  id: uuid("id").defaultRandom().primaryKey(),
  contract_id: uuid("contract_id").references(() => contracts.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(),
  user_id: uuid("user_id").references(() => users.id),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow()
});
var insertUserSchema = createInsertSchema(users).omit({ id: true, created_at: true });
var insertContractSchema = z.object({
  user_id: z.string().uuid().nullable().optional(),
  contract_html: z.string(),
  contract_pdf_url: z.string().nullable().optional(),
  status: z.string().optional(),
  signed_at: z.union([z.instanceof(Date), z.string().datetime(), z.null()]).optional(),
  protocol_number: z.string().optional(),
  client_name: z.string(),
  client_cpf: z.string(),
  client_email: z.string(),
  client_phone: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  logo_size: z.enum(["small", "medium", "large"]).optional(),
  logo_position: z.enum(["center", "left", "right"]).optional(),
  primary_color: z.string().nullable().optional(),
  text_color: z.string().nullable().optional(),
  font_family: z.string().nullable().optional(),
  font_size: z.string().nullable().optional(),
  company_name: z.string().nullable().optional(),
  footer_text: z.string().nullable().optional(),
  maleta_card_color: z.string().nullable().optional(),
  maleta_button_color: z.string().nullable().optional(),
  maleta_text_color: z.string().nullable().optional(),
  verification_primary_color: z.string().nullable().optional(),
  verification_font_family: z.string().nullable().optional(),
  verification_font_size: z.string().nullable().optional(),
  verification_logo_url: z.string().nullable().optional(),
  verification_logo_size: z.enum(["small", "medium", "large"]).optional(),
  verification_logo_position: z.enum(["center", "left", "right"]).optional(),
  verification_footer_text: z.string().nullable().optional(),
  verification_background_image: z.string().nullable().optional(),
  verification_icon_url: z.string().nullable().optional(),
  verification_welcome_text: z.string().nullable().optional(),
  verification_instructions: z.string().nullable().optional(),
  verification_background_color: z.string().nullable().optional(),
  verification_header_background_color: z.string().nullable().optional(),
  verification_header_logo_url: z.string().nullable().optional(),
  verification_header_company_name: z.string().nullable().optional(),
  progress_card_color: z.string().nullable().optional(),
  progress_button_color: z.string().nullable().optional(),
  progress_text_color: z.string().nullable().optional(),
  progress_title: z.string().nullable().optional(),
  progress_subtitle: z.string().nullable().optional(),
  progress_step1_title: z.string().nullable().optional(),
  progress_step1_description: z.string().nullable().optional(),
  progress_step2_title: z.string().nullable().optional(),
  progress_step2_description: z.string().nullable().optional(),
  progress_button_text: z.string().nullable().optional(),
  progress_font_family: z.string().nullable().optional(),
  progress_font_size: z.string().nullable().optional(),
  app_store_url: z.string().nullable().optional(),
  google_play_url: z.string().nullable().optional()
}).transform((data) => ({
  ...data,
  signed_at: data.signed_at && typeof data.signed_at === "string" ? new Date(data.signed_at) : data.signed_at
}));
var insertContractPartialSchema = z.object({
  user_id: z.string().uuid().nullable().optional(),
  contract_html: z.string().optional(),
  contract_pdf_url: z.string().nullable().optional(),
  status: z.string().optional(),
  signed_at: z.union([z.instanceof(Date), z.string().datetime(), z.null()]).optional(),
  protocol_number: z.string().optional(),
  client_name: z.string().optional(),
  client_cpf: z.string().optional(),
  client_email: z.string().optional(),
  client_phone: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  logo_size: z.enum(["small", "medium", "large"]).optional(),
  logo_position: z.enum(["center", "left", "right"]).optional(),
  primary_color: z.string().nullable().optional(),
  text_color: z.string().nullable().optional(),
  font_family: z.string().nullable().optional(),
  font_size: z.string().nullable().optional(),
  company_name: z.string().nullable().optional(),
  footer_text: z.string().nullable().optional(),
  maleta_card_color: z.string().nullable().optional(),
  maleta_button_color: z.string().nullable().optional(),
  maleta_text_color: z.string().nullable().optional(),
  verification_primary_color: z.string().nullable().optional(),
  verification_font_family: z.string().nullable().optional(),
  verification_font_size: z.string().nullable().optional(),
  verification_logo_url: z.string().nullable().optional(),
  verification_logo_size: z.enum(["small", "medium", "large"]).optional(),
  verification_logo_position: z.enum(["center", "left", "right"]).optional(),
  verification_footer_text: z.string().nullable().optional(),
  verification_background_image: z.string().nullable().optional(),
  verification_icon_url: z.string().nullable().optional(),
  verification_welcome_text: z.string().nullable().optional(),
  verification_instructions: z.string().nullable().optional(),
  verification_background_color: z.string().nullable().optional(),
  verification_header_background_color: z.string().nullable().optional(),
  verification_header_logo_url: z.string().nullable().optional(),
  verification_header_company_name: z.string().nullable().optional(),
  progress_card_color: z.string().nullable().optional(),
  progress_button_color: z.string().nullable().optional(),
  progress_text_color: z.string().nullable().optional(),
  progress_title: z.string().nullable().optional(),
  progress_subtitle: z.string().nullable().optional(),
  progress_step1_title: z.string().nullable().optional(),
  progress_step1_description: z.string().nullable().optional(),
  progress_step2_title: z.string().nullable().optional(),
  progress_step2_description: z.string().nullable().optional(),
  progress_button_text: z.string().nullable().optional(),
  progress_font_family: z.string().nullable().optional(),
  progress_font_size: z.string().nullable().optional(),
  app_store_url: z.string().nullable().optional(),
  google_play_url: z.string().nullable().optional()
}).transform((data) => ({
  ...data,
  signed_at: data.signed_at && typeof data.signed_at === "string" ? new Date(data.signed_at) : data.signed_at
}));
var insertSignatureLogSchema = z.object({
  contract_id: z.string().uuid(),
  ip_address: z.string(),
  user_agent: z.string().optional(),
  timestamp: z.union([z.instanceof(Date), z.string().datetime()]),
  govbr_token_hash: z.string().nullable().optional(),
  govbr_auth_time: z.union([z.instanceof(Date), z.string().datetime(), z.null()]).optional(),
  signature_valid: z.boolean().optional()
}).transform((data) => ({
  ...data,
  timestamp: typeof data.timestamp === "string" ? new Date(data.timestamp) : data.timestamp,
  govbr_auth_time: data.govbr_auth_time && typeof data.govbr_auth_time === "string" ? new Date(data.govbr_auth_time) : data.govbr_auth_time
}));
var insertAuditTrailSchema = createInsertSchema(auditTrail).omit({ id: true, timestamp: true });

// server/db.ts
var { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq } from "drizzle-orm";
var DatabaseStorage = class {
  async getUser(id) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }
  async getUserByCpf(cpf) {
    const result = await db.select().from(users).where(eq(users.cpf, cpf)).limit(1);
    return result[0];
  }
  async createUser(user) {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }
  async upsertUser(user) {
    const existing = await this.getUserByCpf(user.cpf);
    if (existing) {
      const result = await db.update(users).set(user).where(eq(users.cpf, user.cpf)).returning();
      return result[0];
    }
    return this.createUser(user);
  }
  async getAllContracts() {
    return db.select().from(contracts).orderBy(contracts.created_at);
  }
  async getContract(id) {
    const result = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
    return result[0];
  }
  async getContractByToken(token) {
    const result = await db.select().from(contracts).where(eq(contracts.access_token, token)).limit(1);
    return result[0];
  }
  async createContract(contract) {
    const result = await db.insert(contracts).values(contract).returning();
    return result[0];
  }
  async updateContract(id, updateData) {
    const result = await db.update(contracts).set(updateData).where(eq(contracts.id, id)).returning();
    return result[0];
  }
  async createSignatureLog(log2) {
    const result = await db.insert(signatureLogs).values(log2).returning();
    return result[0];
  }
  async createAuditTrail(audit) {
    const result = await db.insert(auditTrail).values(audit).returning();
    return result[0];
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import { z as z2 } from "zod";
function registerRoutes(app2) {
  app2.get("/api/contracts", async (_req, res) => {
    try {
      const contracts2 = await storage.getAllContracts();
      res.json(contracts2);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/contracts/by-id/:id", async (req, res) => {
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
  app2.get("/api/contracts/:token", async (req, res) => {
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
  app2.post("/api/contracts", async (req, res) => {
    try {
      const validatedData = insertContractSchema.parse(req.body);
      const contract = await storage.createContract(validatedData);
      res.status(201).json(contract);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating contract:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.patch("/api/contracts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertContractPartialSchema.parse(req.body);
      const contract = await storage.updateContract(id, validatedData);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating contract:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/contracts/:id/finalize", async (req, res) => {
    try {
      const { id } = req.params;
      const { selfie_photo, document_photo, signed_contract_html, status } = req.body;
      const contract = await storage.updateContract(id, {
        selfie_photo,
        document_photo,
        signed_contract_html,
        status: status || "signed",
        signed_at: /* @__PURE__ */ new Date()
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
  app2.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.upsertUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/signature-logs", async (req, res) => {
    try {
      const validatedData = insertSignatureLogSchema.parse(req.body);
      const log2 = await storage.createSignatureLog(validatedData);
      res.status(201).json(log2);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating signature log:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/audit-trail", async (req, res) => {
    try {
      const validatedData = insertAuditTrailSchema.parse(req.body);
      const audit = await storage.createAuditTrail(validatedData);
      res.status(201).json(audit);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating audit trail:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

// server/supabase-routes.ts
import { createClient } from "@supabase/supabase-js";
var supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
var supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
var supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn("Supabase credentials not found - Supabase config routes will return empty data");
}
function registerSupabaseConfigRoutes(app2) {
  app2.get("/api/config/appearance/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const { data, error } = await supabase.from("appearance_configs").select("*").eq("contract_id", contractId).single();
      if (error && error.code !== "PGRST116") {
        return res.status(500).json({ error: error.message });
      }
      res.json(data || {});
    } catch (error) {
      console.error("Error fetching appearance config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/config/appearance/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const data = req.body;
      const { data: existing } = await supabase.from("appearance_configs").select("id").eq("contract_id", contractId).single();
      let result;
      if (existing) {
        result = await supabase.from("appearance_configs").update({
          logo_url: data.logo_url,
          logo_size: data.logo_size,
          logo_position: data.logo_position,
          primary_color: data.primary_color,
          text_color: data.text_color,
          font_family: data.font_family,
          font_size: data.font_size,
          company_name: data.company_name,
          footer_text: data.footer_text,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("contract_id", contractId).select().single();
      } else {
        result = await supabase.from("appearance_configs").insert([
          {
            contract_id: contractId,
            logo_url: data.logo_url,
            logo_size: data.logo_size,
            logo_position: data.logo_position,
            primary_color: data.primary_color,
            text_color: data.text_color,
            font_family: data.font_family,
            font_size: data.font_size,
            company_name: data.company_name,
            footer_text: data.footer_text
          }
        ]).select().single();
      }
      if (result.error) {
        return res.status(500).json({ error: result.error.message });
      }
      res.json(result.data);
    } catch (error) {
      console.error("Error saving appearance config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/config/verification/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const { data, error } = await supabase.from("verification_configs").select("*").eq("contract_id", contractId).single();
      if (error && error.code !== "PGRST116") {
        return res.status(500).json({ error: error.message });
      }
      res.json(data || {});
    } catch (error) {
      console.error("Error fetching verification config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/config/verification/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const data = req.body;
      const { data: existing } = await supabase.from("verification_configs").select("id").eq("contract_id", contractId).single();
      let result;
      if (existing) {
        result = await supabase.from("verification_configs").update({
          primary_color: data.primary_color,
          text_color: data.text_color,
          font_family: data.font_family,
          font_size: data.font_size,
          logo_url: data.logo_url,
          logo_size: data.logo_size,
          logo_position: data.logo_position,
          footer_text: data.footer_text,
          welcome_text: data.welcome_text,
          instructions: data.instructions,
          security_text: data.security_text,
          background_image: data.background_image,
          background_color: data.background_color,
          icon_url: data.icon_url,
          header_background_color: data.header_background_color,
          header_logo_url: data.header_logo_url,
          header_company_name: data.header_company_name,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("contract_id", contractId).select().single();
      } else {
        result = await supabase.from("verification_configs").insert([
          {
            contract_id: contractId,
            primary_color: data.primary_color,
            text_color: data.text_color,
            font_family: data.font_family,
            font_size: data.font_size,
            logo_url: data.logo_url,
            logo_size: data.logo_size,
            logo_position: data.logo_position,
            footer_text: data.footer_text,
            welcome_text: data.welcome_text,
            instructions: data.instructions,
            security_text: data.security_text,
            background_image: data.background_image,
            background_color: data.background_color,
            icon_url: data.icon_url,
            header_background_color: data.header_background_color,
            header_logo_url: data.header_logo_url,
            header_company_name: data.header_company_name
          }
        ]).select().single();
      }
      if (result.error) {
        return res.status(500).json({ error: result.error.message });
      }
      res.json(result.data);
    } catch (error) {
      console.error("Error saving verification config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/config/contract/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const { data, error } = await supabase.from("contract_configs").select("*").eq("contract_id", contractId).single();
      if (error && error.code !== "PGRST116") {
        return res.status(500).json({ error: error.message });
      }
      res.json(data || {});
    } catch (error) {
      console.error("Error fetching contract config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/config/contract/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const data = req.body;
      const { data: existing } = await supabase.from("contract_configs").select("id").eq("contract_id", contractId).single();
      let result;
      if (existing) {
        result = await supabase.from("contract_configs").update({
          title: data.title,
          clauses: data.clauses,
          logo_url: data.logo_url,
          logo_size: data.logo_size,
          logo_position: data.logo_position,
          primary_color: data.primary_color,
          text_color: data.text_color,
          font_family: data.font_family,
          font_size: data.font_size,
          company_name: data.company_name,
          footer_text: data.footer_text,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("contract_id", contractId).select().single();
      } else {
        result = await supabase.from("contract_configs").insert([
          {
            contract_id: contractId,
            title: data.title,
            clauses: data.clauses,
            logo_url: data.logo_url,
            logo_size: data.logo_size,
            logo_position: data.logo_position,
            primary_color: data.primary_color,
            text_color: data.text_color,
            font_family: data.font_family,
            font_size: data.font_size,
            company_name: data.company_name,
            footer_text: data.footer_text
          }
        ]).select().single();
      }
      if (result.error) {
        return res.status(500).json({ error: result.error.message });
      }
      res.json(result.data);
    } catch (error) {
      console.error("Error saving contract config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/config/progress/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const { data, error } = await supabase.from("progress_tracker_configs").select("*").eq("contract_id", contractId).single();
      if (error && error.code !== "PGRST116") {
        return res.status(500).json({ error: error.message });
      }
      res.json(data || {});
    } catch (error) {
      console.error("Error fetching progress config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/config/progress/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const data = req.body;
      const { data: existing } = await supabase.from("progress_tracker_configs").select("id").eq("contract_id", contractId).single();
      let result;
      if (existing) {
        result = await supabase.from("progress_tracker_configs").update({
          card_color: data.card_color,
          button_color: data.button_color,
          text_color: data.text_color,
          title: data.title,
          subtitle: data.subtitle,
          step1_title: data.step1_title,
          step1_description: data.step1_description,
          step2_title: data.step2_title,
          step2_description: data.step2_description,
          step3_title: data.step3_title,
          step3_description: data.step3_description,
          button_text: data.button_text,
          font_family: data.font_family,
          font_size: data.font_size,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("contract_id", contractId).select().single();
      } else {
        result = await supabase.from("progress_tracker_configs").insert([
          {
            contract_id: contractId,
            card_color: data.card_color,
            button_color: data.button_color,
            text_color: data.text_color,
            title: data.title,
            subtitle: data.subtitle,
            step1_title: data.step1_title,
            step1_description: data.step1_description,
            step2_title: data.step2_title,
            step2_description: data.step2_description,
            step3_title: data.step3_title,
            step3_description: data.step3_description,
            button_text: data.button_text,
            font_family: data.font_family,
            font_size: data.font_size
          }
        ]).select().single();
      }
      if (result.error) {
        return res.status(500).json({ error: result.error.message });
      }
      res.json(result.data);
    } catch (error) {
      console.error("Error saving progress config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/config/reseller-welcome/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const { data, error } = await supabase.from("reseller_welcome_configs").select("*").eq("contract_id", contractId).single();
      if (error && error.code !== "PGRST116") {
        return res.status(500).json({ error: error.message });
      }
      res.json(data || {});
    } catch (error) {
      console.error("Error fetching reseller-welcome config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/config/reseller-welcome/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const data = req.body;
      const { data: existing } = await supabase.from("reseller_welcome_configs").select("id").eq("contract_id", contractId).single();
      let result;
      if (existing) {
        result = await supabase.from("reseller_welcome_configs").update({
          title: data.title,
          subtitle: data.subtitle,
          description: data.description,
          card_color: data.card_color,
          background_color: data.background_color,
          button_color: data.button_color,
          text_color: data.text_color,
          font_family: data.font_family,
          form_title: data.form_title,
          button_text: data.button_text,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("contract_id", contractId).select().single();
      } else {
        result = await supabase.from("reseller_welcome_configs").insert([
          {
            contract_id: contractId,
            title: data.title,
            subtitle: data.subtitle,
            description: data.description,
            card_color: data.card_color,
            background_color: data.background_color,
            button_color: data.button_color,
            text_color: data.text_color,
            font_family: data.font_family,
            form_title: data.form_title,
            button_text: data.button_text
          }
        ]).select().single();
      }
      if (result.error) {
        return res.status(500).json({ error: result.error.message });
      }
      res.json(result.data);
    } catch (error) {
      console.error("Error saving reseller-welcome config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/config/app-promotion/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const { data, error } = await supabase.from("app_promotion_configs").select("*").eq("contract_id", contractId).single();
      if (error && error.code !== "PGRST116") {
        return res.status(500).json({ error: error.message });
      }
      res.json(data || {});
    } catch (error) {
      console.error("Error fetching app-promotion config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/config/app-promotion/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const data = req.body;
      const { data: existing } = await supabase.from("app_promotion_configs").select("id").eq("contract_id", contractId).single();
      let result;
      if (existing) {
        result = await supabase.from("app_promotion_configs").update({
          app_store_url: data.app_store_url,
          google_play_url: data.google_play_url,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("contract_id", contractId).select().single();
      } else {
        result = await supabase.from("app_promotion_configs").insert([
          {
            contract_id: contractId,
            app_store_url: data.app_store_url,
            google_play_url: data.google_play_url
          }
        ]).select().single();
      }
      if (result.error) {
        return res.status(500).json({ error: result.error.message });
      }
      res.json(result.data);
    } catch (error) {
      console.error("Error saving app-promotion config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
      }
    }
  });
  app2.use(vite.middlewares);
  app2.use("/{*splat}", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("/{*splat}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json({ limit: "50mb" }));
app.use(express2.urlencoded({ extended: false, limit: "50mb" }));
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  registerRoutes(app);
  registerSupabaseConfigRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  app.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
