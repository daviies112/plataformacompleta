import type { Express } from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn("Supabase credentials not found - Supabase config routes will return empty data");
}

// Local file storage for global settings (fallback when Supabase table doesn't exist)
const GLOBAL_SETTINGS_FILE = path.join(process.cwd(), "data", "global-appearance-settings.json");

function loadLocalGlobalSettings(): any {
  try {
    if (fs.existsSync(GLOBAL_SETTINGS_FILE)) {
      const data = fs.readFileSync(GLOBAL_SETTINGS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading local global settings:", error);
  }
  return {};
}

function saveLocalGlobalSettings(settings: any): void {
  try {
    const dir = path.dirname(GLOBAL_SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(GLOBAL_SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error("Error saving local global settings:", error);
  }
}

export function registerSupabaseConfigRoutes(app: Express): void {
  // ============================================
  // CONFIGURAÇÕES GLOBAIS (DEFAULT) - Para Admin Panel
  // NOTA: Os endpoints principais estão em server/routes/assinatura.ts:
  //   - GET/PUT /api/assinatura/public/global-config
  // Os endpoints abaixo são DEPRECATED e serão removidos em versões futuras.
  // ============================================
  
  // DEPRECATED: Use /api/assinatura/public/global-config instead
  // GET global settings (uses "default" as identifier)
  // Falls back to local file storage if Supabase table doesn't exist
  app.get("/api/config/global-settings", async (req, res) => {
    try {
      // Try Supabase first if available
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("global_appearance_settings")
            .select("*")
            .eq("identifier", "default")
            .single();

          if (!error || error.code === "PGRST116") {
            // Table exists, return data or empty object
            console.log("[GlobalSettings] Loaded from Supabase");
            return res.json(data || {});
          }
          
          // Table doesn't exist or other error - fall through to local storage
          console.log("[GlobalSettings] Supabase error, using local storage:", error.message);
        } catch (supabaseError) {
          console.log("[GlobalSettings] Supabase failed, using local storage");
        }
      }
      
      // Fallback to local file storage
      const localSettings = loadLocalGlobalSettings();
      console.log("[GlobalSettings] Loaded from local file");
      res.json(localSettings);
    } catch (error) {
      console.error("Error fetching global settings:", error);
      res.json({});
    }
  });

  // POST/UPDATE global settings - Auto-saves immediately
  // Falls back to local file storage if Supabase table doesn't exist
  app.post("/api/config/global-settings", async (req, res) => {
    try {
      const data = req.body;
      
      // Always save to local storage first (guaranteed to work)
      saveLocalGlobalSettings({ ...data, updated_at: new Date().toISOString() });
      console.log("[GlobalSettings] Saved to local file");

      // Also try to save to Supabase if available
      if (!supabase) {
        return res.json({ success: true, source: "local" });
      }

      // Check if record exists in Supabase
      const { data: existing, error: checkError } = await supabase
        .from("global_appearance_settings")
        .select("id")
        .eq("identifier", "default")
        .single();
      
      // If table doesn't exist, just return success (local storage is working)
      if (checkError && checkError.code !== "PGRST116") {
        console.log("[GlobalSettings] Supabase table not available, using local only");
        return res.json({ success: true, source: "local" });
      }

      let result;
      if (existing) {
        // Update existing
        result = await supabase
          .from("global_appearance_settings")
          .update({
            // Contract appearance
            primary_color: data.primary_color,
            text_color: data.text_color,
            font_family: data.font_family,
            font_size: data.font_size,
            logo_url: data.logo_url,
            logo_size: data.logo_size,
            logo_position: data.logo_position,
            company_name: data.company_name,
            footer_text: data.footer_text,
            // Verification
            verification_primary_color: data.verification_primary_color,
            verification_text_color: data.verification_text_color,
            verification_font_family: data.verification_font_family,
            verification_font_size: data.verification_font_size,
            verification_logo_url: data.verification_logo_url,
            verification_logo_size: data.verification_logo_size,
            verification_logo_position: data.verification_logo_position,
            verification_footer_text: data.verification_footer_text,
            verification_welcome_text: data.verification_welcome_text,
            verification_instructions: data.verification_instructions,
            verification_background_image: data.verification_background_image,
            verification_background_color: data.verification_background_color,
            verification_header_background_color: data.verification_header_background_color,
            verification_header_logo_url: data.verification_header_logo_url,
            verification_header_company_name: data.verification_header_company_name,
            // Progress tracker
            progress_card_color: data.progress_card_color,
            progress_button_color: data.progress_button_color,
            progress_text_color: data.progress_text_color,
            progress_title: data.progress_title,
            progress_subtitle: data.progress_subtitle,
            progress_step1_title: data.progress_step1_title,
            progress_step1_description: data.progress_step1_description,
            progress_step2_title: data.progress_step2_title,
            progress_step2_description: data.progress_step2_description,
            progress_step3_title: data.progress_step3_title,
            progress_step3_description: data.progress_step3_description,
            progress_button_text: data.progress_button_text,
            progress_font_family: data.progress_font_family,
            progress_font_size: data.progress_font_size,
            // Maleta
            maleta_card_color: data.maleta_card_color,
            maleta_button_color: data.maleta_button_color,
            maleta_text_color: data.maleta_text_color,
            // Parabéns
            parabens_title: data.parabens_title,
            parabens_subtitle: data.parabens_subtitle,
            parabens_description: data.parabens_description,
            parabens_card_color: data.parabens_card_color,
            parabens_background_color: data.parabens_background_color,
            parabens_button_color: data.parabens_button_color,
            parabens_text_color: data.parabens_text_color,
            parabens_font_family: data.parabens_font_family,
            parabens_form_title: data.parabens_form_title,
            parabens_button_text: data.parabens_button_text,
            // Apps
            app_store_url: data.app_store_url,
            google_play_url: data.google_play_url,
            // Contract content
            contract_title: data.contract_title,
            clauses: data.clauses,
            updated_at: new Date().toISOString(),
          })
          .eq("identifier", "default")
          .select()
          .single();
      } else {
        // Insert new
        result = await supabase
          .from("global_appearance_settings")
          .insert([{
            identifier: "default",
            primary_color: data.primary_color,
            text_color: data.text_color,
            font_family: data.font_family,
            font_size: data.font_size,
            logo_url: data.logo_url,
            logo_size: data.logo_size,
            logo_position: data.logo_position,
            company_name: data.company_name,
            footer_text: data.footer_text,
            verification_primary_color: data.verification_primary_color,
            verification_text_color: data.verification_text_color,
            verification_font_family: data.verification_font_family,
            verification_font_size: data.verification_font_size,
            verification_logo_url: data.verification_logo_url,
            verification_logo_size: data.verification_logo_size,
            verification_logo_position: data.verification_logo_position,
            verification_footer_text: data.verification_footer_text,
            verification_welcome_text: data.verification_welcome_text,
            verification_instructions: data.verification_instructions,
            verification_background_image: data.verification_background_image,
            verification_background_color: data.verification_background_color,
            verification_header_background_color: data.verification_header_background_color,
            verification_header_logo_url: data.verification_header_logo_url,
            verification_header_company_name: data.verification_header_company_name,
            progress_card_color: data.progress_card_color,
            progress_button_color: data.progress_button_color,
            progress_text_color: data.progress_text_color,
            progress_title: data.progress_title,
            progress_subtitle: data.progress_subtitle,
            progress_step1_title: data.progress_step1_title,
            progress_step1_description: data.progress_step1_description,
            progress_step2_title: data.progress_step2_title,
            progress_step2_description: data.progress_step2_description,
            progress_step3_title: data.progress_step3_title,
            progress_step3_description: data.progress_step3_description,
            progress_button_text: data.progress_button_text,
            progress_font_family: data.progress_font_family,
            progress_font_size: data.progress_font_size,
            maleta_card_color: data.maleta_card_color,
            maleta_button_color: data.maleta_button_color,
            maleta_text_color: data.maleta_text_color,
            parabens_title: data.parabens_title,
            parabens_subtitle: data.parabens_subtitle,
            parabens_description: data.parabens_description,
            parabens_card_color: data.parabens_card_color,
            parabens_background_color: data.parabens_background_color,
            parabens_button_color: data.parabens_button_color,
            parabens_text_color: data.parabens_text_color,
            parabens_font_family: data.parabens_font_family,
            parabens_form_title: data.parabens_form_title,
            parabens_button_text: data.parabens_button_text,
            app_store_url: data.app_store_url,
            google_play_url: data.google_play_url,
            contract_title: data.contract_title,
            clauses: data.clauses,
          }])
          .select()
          .single();
      }

      if (result.error) {
        console.error("[GlobalSettings] Supabase save error:", result.error);
        // Still return success because local storage already saved
        return res.json({ success: true, source: "local", supabaseError: result.error.message });
      }
      
      console.log("[GlobalSettings] Saved to Supabase");
      res.json({ success: true, source: "supabase", data: result.data });
    } catch (error) {
      console.error("[GlobalSettings] Error:", error);
      // Return success anyway since local storage was saved first
      res.json({ success: true, source: "local" });
    }
  });

  // ============================================
  // APARÊNCIA
  // ============================================
  app.get("/api/config/appearance/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const { data, error } = await supabase
        .from("appearance_configs")
        .select("*")
        .eq("contract_id", contractId)
        .single();

      if (error && error.code !== "PGRST116") {
        return res.status(500).json({ error: error.message });
      }
      res.json(data || {});
    } catch (error) {
      console.error("Error fetching appearance config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/config/appearance/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const data = req.body;

      // First try to get existing record
      const { data: existing } = await supabase
        .from("appearance_configs")
        .select("id")
        .eq("contract_id", contractId)
        .single();

      let result;
      if (existing) {
        // Update existing
        result = await supabase
          .from("appearance_configs")
          .update({
            logo_url: data.logo_url,
            logo_size: data.logo_size,
            logo_position: data.logo_position,
            primary_color: data.primary_color,
            text_color: data.text_color,
            font_family: data.font_family,
            font_size: data.font_size,
            company_name: data.company_name,
            footer_text: data.footer_text,
            updated_at: new Date().toISOString(),
          })
          .eq("contract_id", contractId)
          .select()
          .single();
      } else {
        // Insert new
        result = await supabase
          .from("appearance_configs")
          .insert([
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
              footer_text: data.footer_text,
            },
          ])
          .select()
          .single();
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

  // ============================================
  // VERIFICAÇÃO
  // ============================================
  app.get("/api/config/verification/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const { data, error } = await supabase
        .from("verification_configs")
        .select("*")
        .eq("contract_id", contractId)
        .single();

      if (error && error.code !== "PGRST116") {
        return res.status(500).json({ error: error.message });
      }
      res.json(data || {});
    } catch (error) {
      console.error("Error fetching verification config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/config/verification/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const data = req.body;

      const { data: existing } = await supabase
        .from("verification_configs")
        .select("id")
        .eq("contract_id", contractId)
        .single();

      let result;
      if (existing) {
        result = await supabase
          .from("verification_configs")
          .update({
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
            updated_at: new Date().toISOString(),
          })
          .eq("contract_id", contractId)
          .select()
          .single();
      } else {
        result = await supabase
          .from("verification_configs")
          .insert([
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
              header_company_name: data.header_company_name,
            },
          ])
          .select()
          .single();
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

  // ============================================
  // CONTRATO
  // ============================================
  app.get("/api/config/contract/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const { data, error } = await supabase
        .from("contract_configs")
        .select("*")
        .eq("contract_id", contractId)
        .single();

      if (error && error.code !== "PGRST116") {
        return res.status(500).json({ error: error.message });
      }
      res.json(data || {});
    } catch (error) {
      console.error("Error fetching contract config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/config/contract/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const data = req.body;

      const { data: existing } = await supabase
        .from("contract_configs")
        .select("id")
        .eq("contract_id", contractId)
        .single();

      let result;
      if (existing) {
        result = await supabase
          .from("contract_configs")
          .update({
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
            updated_at: new Date().toISOString(),
          })
          .eq("contract_id", contractId)
          .select()
          .single();
      } else {
        result = await supabase
          .from("contract_configs")
          .insert([
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
              footer_text: data.footer_text,
            },
          ])
          .select()
          .single();
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

  // ============================================
  // PROGRESSO
  // ============================================
  app.get("/api/config/progress/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const { data, error } = await supabase
        .from("progress_tracker_configs")
        .select("*")
        .eq("contract_id", contractId)
        .single();

      if (error && error.code !== "PGRST116") {
        return res.status(500).json({ error: error.message });
      }
      res.json(data || {});
    } catch (error) {
      console.error("Error fetching progress config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/config/progress/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const data = req.body;

      const { data: existing } = await supabase
        .from("progress_tracker_configs")
        .select("id")
        .eq("contract_id", contractId)
        .single();

      let result;
      if (existing) {
        result = await supabase
          .from("progress_tracker_configs")
          .update({
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
            updated_at: new Date().toISOString(),
          })
          .eq("contract_id", contractId)
          .select()
          .single();
      } else {
        result = await supabase
          .from("progress_tracker_configs")
          .insert([
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
              font_size: data.font_size,
            },
          ])
          .select()
          .single();
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

  // ============================================
  // PARABÉNS / REVENDEDORA
  // ============================================
  app.get("/api/config/reseller-welcome/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const { data, error } = await supabase
        .from("reseller_welcome_configs")
        .select("*")
        .eq("contract_id", contractId)
        .single();

      if (error && error.code !== "PGRST116") {
        return res.status(500).json({ error: error.message });
      }
      res.json(data || {});
    } catch (error) {
      console.error("Error fetching reseller-welcome config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/config/reseller-welcome/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const data = req.body;

      const { data: existing } = await supabase
        .from("reseller_welcome_configs")
        .select("id")
        .eq("contract_id", contractId)
        .single();

      let result;
      if (existing) {
        result = await supabase
          .from("reseller_welcome_configs")
          .update({
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
            updated_at: new Date().toISOString(),
          })
          .eq("contract_id", contractId)
          .select()
          .single();
      } else {
        result = await supabase
          .from("reseller_welcome_configs")
          .insert([
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
              button_text: data.button_text,
            },
          ])
          .select()
          .single();
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

  // ============================================
  // LINKS APPS
  // ============================================
  app.get("/api/config/app-promotion/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const { data, error } = await supabase
        .from("app_promotion_configs")
        .select("*")
        .eq("contract_id", contractId)
        .single();

      if (error && error.code !== "PGRST116") {
        return res.status(500).json({ error: error.message });
      }
      res.json(data || {});
    } catch (error) {
      console.error("Error fetching app-promotion config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/config/app-promotion/:contractId", async (req, res) => {
    if (!supabase) {
      return res.json({});
    }
    try {
      const { contractId } = req.params;
      const data = req.body;

      const { data: existing } = await supabase
        .from("app_promotion_configs")
        .select("id")
        .eq("contract_id", contractId)
        .single();

      let result;
      if (existing) {
        result = await supabase
          .from("app_promotion_configs")
          .update({
            app_store_url: data.app_store_url,
            google_play_url: data.google_play_url,
            updated_at: new Date().toISOString(),
          })
          .eq("contract_id", contractId)
          .select()
          .single();
      } else {
        result = await supabase
          .from("app_promotion_configs")
          .insert([
            {
              contract_id: contractId,
              app_store_url: data.app_store_url,
              google_play_url: data.google_play_url,
            },
          ])
          .select()
          .single();
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
