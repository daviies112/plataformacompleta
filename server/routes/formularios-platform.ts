import type { Express } from "express";
import { storage } from "../formularios/storage";
import { db } from "../formularios/db";
import { eq, desc } from "drizzle-orm";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { getDynamicSupabaseClient } from "../formularios/utils/supabaseClient";
import { convertKeysToCamelCase, convertKeysToSnakeCase, parseJsonbFields, stringifyJsonbFields } from "../formularios/utils/caseConverter";
import * as leadService from "../formularios/services/leadService";
import { leadTrackingService } from "../formularios/services/leadTracking";
import { leadSyncService } from "../formularios/services/leadSync";
import { normalizarTelefone } from '../formularios/utils/phone';
import { normalizePhone } from '../formularios/utils/phoneNormalizer';

// Import schemas from shared
import { 
  insertFormSchema, 
  insertFormSubmissionSchema, 
  insertFormTemplateSchema, 
  insertCompletionPageSchema,
  appSettings,
  leads,
  whatsappLabels,
  forms,
  formSubmissions,
  formTemplates,
  completionPages
} from "@shared/schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const uploadsDir = path.join(__dirname, "..", "..", "public", "uploads", "logos");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, "logo-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * Helper function to get Supabase client with proper credentials
 */
async function getSupabaseClient(tenantId?: string) {
  if (tenantId) {
    const { getSupabaseCredentialsStrict } = await import('../lib/credentialsDb.js');
    const credentials = await getSupabaseCredentialsStrict(tenantId);
    if (credentials) {
      return await getDynamicSupabaseClient(credentials.url, credentials.anonKey);
    }
  }
  
  const { getSupabaseCredentials } = await import('../lib/credentialsManager.js');
  const clientId = '1';
  const credentials = getSupabaseCredentials(clientId);
  
  return credentials 
    ? await getDynamicSupabaseClient(credentials.url, credentials.anonKey)
    : await getDynamicSupabaseClient();
}

/**
 * Register Formularios Platform routes
 * Todas as rotas da plataforma de formulários (forms, submissions, leads, whatsapp)
 */
export function registerFormulariosPlatformRoutes(app: Express) {
  console.log("📋 Registering Formularios Platform routes...");
  
  // Import and register all routes from the platform
  // This is a simplified version - we'll need to import the full routes.ts content
  // For now, let's register the basic routes
  
  // Get all forms
  app.get("/api/formularios/forms", async (req, res) => {
    try {
      const tenantId = (req.session as any)?.tenantId || (req.session as any)?.user?.tenantId;
      console.log(`🔍 [GET /api/formularios/forms] Tenant: ${tenantId || 'não identificado'}`);
      
      const supabase = await getSupabaseClient(tenantId);
      
      if (supabase) {
        console.log('🔍 [GET /api/formularios/forms] Buscando do Supabase...');
        
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('❌ [SUPABASE] Erro ao buscar forms:', error);
          throw error;
        }
        
        console.log(`📊 [SUPABASE] ${data?.length || 0} formulário(s) encontrado(s)`);
        
        const formattedData = (data || []).map((form: any) => {
          const camelForm = convertKeysToCamelCase(form);
          return parseJsonbFields(camelForm, ['questions', 'designConfig', 'scoreTiers']);
        });
        
        return res.json(formattedData);
      }
      
      console.log('🔍 [GET /api/formularios/forms] Buscando do PostgreSQL local...');
      const forms = await storage.getForms();
      res.json(forms);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  console.log("✅ Formularios Platform routes registered");
}
