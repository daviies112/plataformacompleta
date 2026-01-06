import type { Express } from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn("Supabase credentials not found - Supabase config routes will return empty data");
}

export function registerSupabaseConfigRoutes(app: Express): void {
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
