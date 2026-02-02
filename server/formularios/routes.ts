import type { Express } from "express";
import { storage } from "./storage.js";
import { db } from "./db.js";
import { eq, desc } from "drizzle-orm";
import { insertFormSchema, insertFormSubmissionSchema, insertFormTemplateSchema, insertCompletionPageSchema, appSettings, leads, whatsappLabels, supabaseConfig, formTenantMapping } from "../../shared/db-schema";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { getDynamicSupabaseClient } from "./utils/supabaseClient.js";
import { convertKeysToCamelCase, convertKeysToSnakeCase, parseJsonbFields, stringifyJsonbFields } from "./utils/caseConverter.js";
import * as leadService from "./services/leadService.js";
import { leadTrackingService } from "./services/leadTracking.js";
import { leadSyncService } from "./services/leadSync.js";
import { normalizarTelefone } from './utils/phone.js';
import { normalizePhone } from './utils/phoneNormalizer.js';
import { encrypt, decrypt } from '../lib/credentialsManager.js';
import { ensureCompleteRegistrationTemplate, cloneFormFromTemplate, addStandardFieldsToForm } from "./services/templateSeeder.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const uploadsDir = path.join(__dirname, "..", "client_form", "public", "uploads", "logos");
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

export function registerRoutes(app: Express) {
  // Get all forms
  app.get("/api/forms", async (req, res) => {
    try {
      const supabaseUrl = req.headers['x-supabase-url'] as string;
      const supabaseKey = req.headers['x-supabase-key'] as string;
      
      const supabase = await getDynamicSupabaseClient(supabaseUrl, supabaseKey);
      
      if (supabase) {
        console.log('🔍 [GET /api/forms] Buscando do Supabase...');
        
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
          return parseJsonbFields(camelForm, ['questions', 'designConfig', 'scoreTiers', 'welcomeConfig']);
        });
        
        return res.json(formattedData);
      }
      
      console.log('🔍 [GET /api/forms] Buscando do PostgreSQL local...');
      const forms = await storage.getForms();
      res.json(forms);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get form by ID
  app.get("/api/forms/:id", async (req, res) => {
    try {
      const supabaseUrl = req.headers['x-supabase-url'] as string;
      const supabaseKey = req.headers['x-supabase-key'] as string;
      
      const supabase = await getDynamicSupabaseClient(supabaseUrl, supabaseKey);
      
      if (supabase) {
        console.log('🔍 [GET /api/forms/:id] Buscando do Supabase...');
        
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .eq('id', req.params.id)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            return res.status(404).json({ error: "Form not found" });
          }
          throw error;
        }
        
        const camelData = convertKeysToCamelCase(data);
        const parsedData = parseJsonbFields(camelData, ['questions', 'designConfig', 'scoreTiers', 'welcomeConfig', 'elements', 'completionPageConfig']);
        
        return res.json(parsedData);
      }
      
      const form = await storage.getFormById(req.params.id);
      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }
      res.json(form);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create form
  app.post("/api/forms", async (req, res) => {
    try {
      const supabaseUrl = req.headers['x-supabase-url'] as string;
      const supabaseKey = req.headers['x-supabase-key'] as string;
      
      const supabase = await getDynamicSupabaseClient(supabaseUrl, supabaseKey);
      
      if (supabase) {
        console.log('📝 [POST /api/forms] Salvando no Supabase...');
        
        const snakeData = convertKeysToSnakeCase(req.body);
        const stringifiedData = stringifyJsonbFields(snakeData, ['questions', 'design_config', 'score_tiers', 'welcome_config', 'elements', 'completion_page_config']);
        
        const { data, error } = await supabase
          .from('forms')
          .insert(stringifiedData)
          .select()
          .single();
        
        if (error) {
          console.error('❌ [SUPABASE] Erro ao criar form:', error);
          throw error;
        }
        
        console.log('✅ [SUPABASE] Formulário criado com sucesso!');
        
        const camelData = convertKeysToCamelCase(data);
        const parsedData = parseJsonbFields(camelData, ['questions', 'designConfig', 'scoreTiers', 'welcomeConfig', 'elements', 'completionPageConfig']);
        
        return res.status(201).json(parsedData);
      }
      
      console.log('📝 [POST /api/forms] Salvando no PostgreSQL local...');
      const validatedData = insertFormSchema.parse(req.body);
      const form = await storage.createForm(validatedData);
      res.status(201).json(form);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update form
  app.patch("/api/forms/:id", async (req, res) => {
    try {
      const supabaseUrl = req.headers['x-supabase-url'] as string;
      const supabaseKey = req.headers['x-supabase-key'] as string;
      
      const supabase = await getDynamicSupabaseClient(supabaseUrl, supabaseKey);
      
      if (supabase) {
        console.log('📝 [PATCH /api/forms/:id] Atualizando no Supabase...');
        
        const updateData = convertKeysToSnakeCase(req.body);
        const stringifiedData = stringifyJsonbFields(updateData, ['questions', 'design_config', 'score_tiers', 'welcome_config', 'elements', 'completion_page_config']);
        stringifiedData.updated_at = new Date().toISOString();
        
        const { data, error } = await supabase
          .from('forms')
          .update(stringifiedData)
          .eq('id', req.params.id)
          .select()
          .single();
        
        if (error) throw error;
        
        console.log('✅ [SUPABASE] Formulário atualizado com sucesso!');
        
        const camelData = convertKeysToCamelCase(data);
        const parsedData = parseJsonbFields(camelData, ['questions', 'designConfig', 'scoreTiers', 'welcomeConfig', 'elements', 'completionPageConfig']);
        
        return res.json(parsedData);
      }
      
      const form = await storage.updateForm(req.params.id, req.body);
      res.json(form);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete form
  app.delete("/api/forms/:id", async (req, res) => {
    try {
      const supabaseUrl = req.headers['x-supabase-url'] as string;
      const supabaseKey = req.headers['x-supabase-key'] as string;
      
      const supabase = await getDynamicSupabaseClient(supabaseUrl, supabaseKey);
      
      if (supabase) {
        console.log('🗑️ [DELETE /api/forms/:id] Deletando do Supabase...');
        
        const { error } = await supabase
          .from('forms')
          .delete()
          .eq('id', req.params.id);
        
        if (error) throw error;
        
        console.log('✅ [SUPABASE] Formulário deletado com sucesso!');
        return res.status(204).send();
      }
      
      await storage.deleteForm(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all submissions
  app.get("/api/submissions", async (req, res) => {
    try {
      const supabaseUrl = req.headers['x-supabase-url'] as string;
      const supabaseKey = req.headers['x-supabase-key'] as string;
      
      const supabase = await getDynamicSupabaseClient(supabaseUrl, supabaseKey);
      
      if (supabase) {
        console.log('🔍 [GET /api/submissions] Buscando do Supabase...');
        
        const { data, error } = await supabase
          .from('form_submissions')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log(`📊 [SUPABASE] ${data?.length || 0} submission(s) encontrada(s)`);
        
        const formattedData = (data || []).map((submission: any) => {
          const camelSubmission = convertKeysToCamelCase(submission);
          return parseJsonbFields(camelSubmission, ['answers']);
        });
        
        return res.json(formattedData);
      }
      
      const submissions = await storage.getAllSubmissions();
      res.json(submissions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get form submissions
  app.get("/api/forms/:id/submissions", async (req, res) => {
    try {
      const supabaseUrl = req.headers['x-supabase-url'] as string;
      const supabaseKey = req.headers['x-supabase-key'] as string;
      
      const supabase = await getDynamicSupabaseClient(supabaseUrl, supabaseKey);
      
      if (supabase) {
        console.log('🔍 [GET /api/forms/:id/submissions] Buscando do Supabase...');
        
        const { data, error } = await supabase
          .from('form_submissions')
          .select('*')
          .eq('form_id', req.params.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log(`📊 [SUPABASE] ${data?.length || 0} submission(s) encontrada(s)`);
        
        const formattedData = (data || []).map((submission: any) => {
          const camelSubmission = convertKeysToCamelCase(submission);
          return parseJsonbFields(camelSubmission, ['answers']);
        });
        
        return res.json(formattedData);
      }
      
      const submissions = await storage.getFormSubmissions(req.params.id);
      res.json(submissions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create form submission
  app.post("/api/submissions", async (req, res) => {
    try {
      // 🔥 DEBUG: Log completo do body recebido
      console.log('📱 [POST /api/submissions] =====================================');
      console.log('📱 [POST /api/submissions] Body recebido:', JSON.stringify(req.body, null, 2));
      console.log('📱 [POST /api/submissions] contactPhone recebido:', req.body.contactPhone);
      console.log('📱 [POST /api/submissions] =====================================');
      
      const supabaseUrl = req.headers['x-supabase-url'] as string;
      const supabaseKey = req.headers['x-supabase-key'] as string;
      
      const supabase = await getDynamicSupabaseClient(supabaseUrl, supabaseKey);
      
      // 🔥 MULTI-TENANT SECURITY: Obter tenant_id da sessão ou lookup via form_tenant_mapping
      let tenantId = (req.session as any)?.tenantId;
      
      // Se não há sessão (formulário público), buscar tenant_id via form_tenant_mapping
      if (!tenantId) {
        console.log('🔍 [POST /api/submissions] Sem sessão - buscando tenant_id via form_tenant_mapping...');
        const formMapping = await db
          .select({ tenantId: formTenantMapping.tenantId })
          .from(formTenantMapping)
          .where(eq(formTenantMapping.formId, req.body.formId))
          .limit(1);
        
        if (formMapping.length > 0) {
          tenantId = formMapping[0].tenantId;
          console.log(`✅ [POST /api/submissions] Tenant ID encontrado no mapping: ${tenantId}`);
        } else {
          console.error(`❌ [POST /api/submissions] Form ${req.body.formId} não encontrado no form_tenant_mapping`);
          return res.status(400).json({ 
            error: 'Cannot determine tenant_id for this form. Form may not be properly configured.' 
          });
        }
      }
      
      console.log(`🏢 [POST /api/submissions] Tenant ID: ${tenantId}`);

      if (supabase) {
        console.log('📝 [POST /api/submissions] Salvando no Supabase...');
        
        // 🔥 REMOVER campos extras que o Supabase não aceita como colunas
        // Esses campos vêm do front e agora são colunas separadas
        // Também limpamos nomes variados que possam ter sido usados
        const { 
          _contactData, _addressData, 
          contact_data, address_data, 
          contactData, addressData,
          ...restBodySupabase 
        } = req.body;
        
        const snakeData = convertKeysToSnakeCase(restBodySupabase);
        const stringifiedData = stringifyJsonbFields(snakeData, ['answers']);
        
        // 🔥 ADICIONAR tenant_id ao payload (CRÍTICO PARA MULTI-TENANT SECURITY)
        stringifiedData.tenant_id = tenantId;
        
        console.log('📱 [POST /api/submissions] Payload para Supabase (limpo):', JSON.stringify(stringifiedData, null, 2));
        
        const { data, error } = await supabase
          .from('form_submissions')
          .insert(stringifiedData)
          .select()
          .single();
        
        if (error) {
          console.error('❌ [SUPABASE] Erro ao criar submission:', error);
          // Fallback: Tentar salvar apenas campos essenciais se o erro for de coluna
          if (error.message?.includes('column')) {
            console.warn('⚠️ Erro de coluna detectado, tentando salvar apenas campos mapeados...');
            const essentialFields = [
              'form_id', 'answers', 'total_score', 'passed', 'tenant_id',
              'contact_name', 'contact_email', 'contact_phone', 'contact_cpf',
              'participant_id', 'instagram_handle', 'birth_date',
              'address_cep', 'address_street', 'address_number', 'address_complement',
              'address_neighborhood', 'address_city', 'address_state'
            ];
            const filteredData: any = {};
            essentialFields.forEach(field => {
              if (stringifiedData[field] !== undefined) filteredData[field] = stringifiedData[field];
            });
            
            const { data: retryData, error: retryError } = await supabase
              .from('form_submissions')
              .insert(filteredData)
              .select()
              .single();
              
            if (retryError) throw retryError;
            return res.status(201).json(convertKeysToCamelCase(retryData));
          }
          throw error;
        }
        
        console.log('✅ [SUPABASE] Submission criada com sucesso!');
        
        const camelData = convertKeysToCamelCase(data);
        const parsedData = parseJsonbFields(camelData, ['answers']);
        
        // 🔥 SINCRONIZAR LEAD AUTOMATICAMENTE
        if (parsedData.contactPhone) {
          try {
            console.log('📞 [SUPABASE] Sincronizando lead para submission:', parsedData.id);
            await leadSyncService.syncSubmissionToLead({
              ...parsedData,
              tenantId: tenantId
            });
          } catch (error) {
            console.error('❌ [SUPABASE] Erro ao sincronizar lead:', error);
          }
        }
        
        return res.status(201).json(parsedData);
      }
      
      console.log('📝 [POST /api/submissions] Salvando no PostgreSQL local...');
      
      // 🔥 REMOVER campos extras para o PostgreSQL local também
      const { 
        _contactData, _addressData, 
        contact_data, address_data, 
        contactData, addressData,
        ...restBodyLocal 
      } = req.body;
      const camelBody = convertKeysToCamelCase(restBodyLocal);
      
      // Adicionar tenantId e garantir que answers seja mantido
      const submissionData = {
        ...camelBody,
        tenantId: tenantId,
        answers: req.body.answers
      };
      
      const submission = await storage.createFormSubmission(submissionData);
      
      // 🔥 SINCRONIZAR LEAD AUTOMATICAMENTE (PostgreSQL local)
      if (submission.contactPhone) {
        try {
          console.log('📞 [PostgreSQL] Sincronizando lead para submission:', submission.id);
          await leadSyncService.syncSubmissionToLead({
            ...submission,
            tenantId: tenantId
          });
        } catch (error) {
          console.error('❌ [PostgreSQL] Erro ao sincronizar lead:', error);
        }
      }
      
      res.status(201).json(submission);
    } catch (error: any) {
      console.error('❌ [POST /api/submissions] Erro geral:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all templates
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getFormTemplates();
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get template by ID
  app.get("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.getFormTemplateById(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create template
  app.post("/api/templates", async (req, res) => {
    try {
      const validatedData = insertFormTemplateSchema.parse(req.body);
      const template = await storage.createFormTemplate(validatedData);
      res.status(201).json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================================
  // STANDARD FIELDS SYSTEM - Complete Registration Template Endpoints
  // ============================================================================

  // Create or get complete registration template for current tenant
  app.post("/api/form-templates/complete-registration", async (req, res) => {
    try {
      const supabaseUrl = req.headers['x-supabase-url'] as string;
      const supabaseKey = req.headers['x-supabase-key'] as string;
      
      console.log('📝 [POST /api/form-templates/complete-registration] Creating template...');
      
      const template = await ensureCompleteRegistrationTemplate({
        supabaseUrl,
        supabaseKey
      });
      
      console.log('✅ Template ensured successfully');
      res.status(201).json(template);
    } catch (error: any) {
      console.error('❌ Error ensuring template:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Clone form from template
  app.post("/api/forms/from-template/:templateId", async (req, res) => {
    try {
      const supabaseUrl = req.headers['x-supabase-url'] as string;
      const supabaseKey = req.headers['x-supabase-key'] as string;
      const { templateId } = req.params;
      const { title, description, passingScore } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }
      
      console.log(`📝 [POST /api/forms/from-template/:templateId] Cloning form from template ${templateId}...`);
      
      const form = await cloneFormFromTemplate(
        templateId,
        { title, description, passingScore },
        { supabaseUrl, supabaseKey }
      );
      
      console.log('✅ Form cloned successfully');
      res.status(201).json(form);
    } catch (error: any) {
      console.error('❌ Error cloning form:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add standard fields to existing form
  app.post("/api/forms/:formId/add-standard-fields", async (req, res) => {
    try {
      const supabaseUrl = req.headers['x-supabase-url'] as string;
      const supabaseKey = req.headers['x-supabase-key'] as string;
      const { formId } = req.params;
      
      console.log(`📝 [POST /api/forms/:formId/add-standard-fields] Adding standard fields to form ${formId}...`);
      
      const form = await addStandardFieldsToForm(
        formId,
        { supabaseUrl, supabaseKey }
      );
      
      console.log('✅ Standard fields added successfully');
      res.json(form);
    } catch (error: any) {
      console.error('❌ Error adding standard fields:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all completion pages
  app.get("/api/completion-pages", async (req, res) => {
    try {
      const pages = await storage.getCompletionPages();
      res.json(pages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get completion page by ID
  app.get("/api/completion-pages/:id", async (req, res) => {
    try {
      const page = await storage.getCompletionPageById(req.params.id);
      if (!page) {
        return res.status(404).json({ error: "Completion page not found" });
      }
      res.json(page);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create completion page
  app.post("/api/completion-pages", async (req, res) => {
    try {
      const validatedData = insertCompletionPageSchema.parse(req.body);
      const page = await storage.createCompletionPage(validatedData);
      res.status(201).json(page);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update completion page
  app.patch("/api/completion-pages/:id", async (req, res) => {
    try {
      const page = await storage.updateCompletionPage(req.params.id, req.body);
      res.json(page);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete completion page
  app.delete("/api/completion-pages/:id", async (req, res) => {
    try {
      await storage.deleteCompletionPage(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get app settings (Supabase credentials)
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getAppSettings();
      
      if (!settings) {
        return res.json({ 
          supabaseUrl: null, 
          supabaseAnonKey: null 
        });
      }
      
      res.json({
        supabaseUrl: settings.supabaseUrl,
        supabaseAnonKey: settings.supabaseAnonKey
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Save app settings (Supabase credentials)
  app.post("/api/settings", async (req, res) => {
    try {
      const { supabaseUrl, supabaseAnonKey } = req.body;
      
      // ✅ CORREÇÃO: Permitir strings vazias para limpar configurações
      if (supabaseUrl === undefined || supabaseAnonKey === undefined) {
        return res.status(400).json({ 
          error: "URL do Supabase e Chave Anônima devem ser fornecidos" 
        });
      }
      
      // Salvar na tabela app_settings (sistema antigo, não criptografado)
      const settings = await storage.saveAppSettings({
        supabaseUrl,
        supabaseAnonKey
      });
      
      // ✅ CORREÇÃO CRÍTICA: Também salvar na tabela supabase_config (sistema novo, criptografado)
      // Isso garante que ambos os endpoints funcionem corretamente
      if (supabaseUrl && supabaseAnonKey) {
        const encryptedUrl = encrypt(supabaseUrl);
        const encryptedKey = encrypt(supabaseAnonKey);
        
        const existingConfig = await db.select().from(supabaseConfig).limit(1);
        
        if (existingConfig[0]) {
          await db
            .update(supabaseConfig)
            .set({
              supabaseUrl: encryptedUrl,
              supabaseAnonKey: encryptedKey,
              supabaseBucket: 'receipts',
              updatedAt: new Date(),
            })
            .where(eq(supabaseConfig.id, existingConfig[0].id));
          
          console.log("✅ Configuração do Supabase atualizada também em supabase_config (criptografada)");
        } else {
          await db.insert(supabaseConfig).values({
            supabaseUrl: encryptedUrl,
            supabaseAnonKey: encryptedKey,
            supabaseBucket: 'receipts',
          });
          
          console.log("✅ Configuração do Supabase salva também em supabase_config (criptografada)");
        }
      } else {
        // Se as credenciais forem vazias, limpar também a tabela supabase_config
        await db.delete(supabaseConfig);
        console.log("ℹ️ Configurações do Supabase removidas de supabase_config");
      }
      
      const message = (supabaseUrl && supabaseAnonKey) 
        ? "Configurações salvas com sucesso!" 
        : "Configurações removidas. Usando PostgreSQL local.";
      
      res.json({
        message,
        settings: {
          supabaseUrl: settings.supabaseUrl,
          supabaseAnonKey: settings.supabaseAnonKey
        }
      });
    } catch (error: any) {
      console.error("Erro ao salvar configurações do Supabase:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Upload logo
  app.post("/api/upload/logo", upload.single('logo'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const logoUrl = `/uploads/logos/${req.file.filename}`;
      res.json({ url: logoUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // WHATSAPP PLATFORM ROUTES - Evolution API integration
  // ============================================================================

  // WhatsApp Configuration endpoints
  app.post("/api/config", async (req, res) => {
    try {
      const { insertConfigurationSchema } = await import("../../shared/db-schema.js");
      const config = insertConfigurationSchema.parse(req.body);
      const savedConfig = await storage.setConfiguration(config);
      res.json({ success: true, config: savedConfig });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.get("/api/config/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const config = await storage.getConfiguration(userId);
      if (!config) {
        return res.status(404).json({ success: false, error: "Configuration not found" });
      }
      res.json({ success: true, config });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Generic Evolution API proxy
  app.post("/api/evolution/proxy", async (req, res) => {
    try {
      const { userId, method = "GET", endpoint, body } = req.body;

      const config = await storage.getConfiguration(userId || "default");
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

  // Fetch chats
  app.post("/api/evolution/chats", async (req, res) => {
    try {
      const { userId } = req.body;

      const config = await storage.getConfiguration(userId || "default");
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

      // Função helper para extrair o melhor nome disponível do chat
      const extractBestName = (chat: any): string | undefined => {
        const sanitizeName = (name?: string): string | undefined => {
          if (!name) return undefined;
          
          const trimmed = name.trim();
          if (!trimmed) return undefined;
          
          const lowered = trimmed.toLowerCase();
          
          // Filtrar palavras genéricas e mensagens comuns
          const messagePatterns = [
            'você', 'voce', 'you', 'me', 'eu',
            'obrigada', 'obrigado', 'olá', 'ola', 'oi', 'ok', 'sim', 'não', 'nao',
            'bom dia', 'boa tarde', 'boa noite', 'tudo bem', 'video', 're:', 'fwd:',
            'https://', 'http://', 'www.'
          ];
          
          if (messagePatterns.some(pattern => lowered.includes(pattern))) {
            return undefined;
          }
          
          // Se tem muita pontuação ou é muito longo, provavelmente é mensagem
          const punctuationCount = (trimmed.match(/[.,!?;:]/g) || []).length;
          if (punctuationCount > 1 || trimmed.length > 40) return undefined;
          
          return trimmed;
        };
        
        // Prioridade: contact.name > pushName > contact.pushName
        // Evitar chat.name e chat.shortName pois podem conter mensagens
        return sanitizeName(chat.contact?.name) ||
               sanitizeName(chat.pushName) ||
               sanitizeName(chat.contact?.pushName) ||
               sanitizeName(chat.contact?.verifiedName) ||
               sanitizeName(chat.contact?.notify) ||
               undefined;
      };

      if (Array.isArray(chatsData) && chatsData.length > 0) {
        console.log("📊 Sample chat structure:", JSON.stringify(chatsData[0], null, 2));
        console.log("📊 Sample chat keys:", Object.keys(chatsData[0]));
        
        // 🔥 CRIAR/ATUALIZAR LEADS AUTOMATICAMENTE
        console.log("🔄 Processando leads para", chatsData.length, "conversas...");
        for (const chat of chatsData) {
          try {
            // Extrai telefone do remoteJid (ex: 553188892566@s.whatsapp.net)
            const telefone = leadService.extrairTelefoneWhatsApp(chat.remoteJid || '');
            
            if (telefone && !chat.isGroup) {
              // Extrair melhor nome disponível
              const bestName = extractBestName(chat);
              
              // Busca ou cria o lead
              await leadService.buscarOuCriarLead({
                telefone,
                nome: bestName,
                whatsappId: chat.id || chat.remoteJid,
                whatsappInstance: config.instanceWhatsapp,
              });
            }
          } catch (error) {
            console.error("⚠️ Erro ao processar lead:", error);
            // Continua processando os outros chats
          }
        }
        console.log("✅ Leads processados");
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

  // Fetch contacts
  app.post("/api/evolution/contacts", async (req, res) => {
    try {
      const { userId } = req.body;

      const config = await storage.getConfiguration(userId || "default");
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

  // Fetch messages for a chat
  app.post("/api/evolution/messages", async (req, res) => {
    try {
      const { userId, chatId, limit = 100 } = req.body;

      const config = await storage.getConfiguration(userId || "default");
      if (!config || !chatId) {
        return res.status(400).json({ 
          error: "Missing required parameters: userId or chatId" 
        });
      }

      const baseUrl = config.apiUrlWhatsapp.replace(/\/$/, "");
      const encodedInstance = encodeURIComponent(config.instanceWhatsapp);
      const url = `${baseUrl}/chat/findMessages/${encodedInstance}`;

      const messageLimit = Math.min(Math.max(1, limit), 1000);
      console.log(`Fetching messages from: ${url} (limit: ${messageLimit})`);

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
          limit: messageLimit,
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

  // Send text message
  app.post("/api/evolution/send-message", async (req, res) => {
    try {
      const { userId, number, text } = req.body;

      const config = await storage.getConfiguration(userId || "default");
      if (!config || !number || !text) {
        return res.status(400).json({
          success: false,
          error: "Missing required parameters",
          details: "userId, number, and text are required",
        });
      }

      const baseUrl = config.apiUrlWhatsapp.replace(/\/$/, "");
      const encodedInstance = encodeURIComponent(config.instanceWhatsapp);

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

  // Send media (image, video, document)
  app.post("/api/evolution/send-media", async (req, res) => {
    try {
      const { userId, number, mediatype, mimetype, media, caption, fileName } = req.body;

      const config = await storage.getConfiguration(userId || "default");
      if (!config || !number || !mediatype || !mimetype || !media) {
        return res.status(400).json({
          success: false,
          error: "Missing required parameters",
          details: "userId, number, mediatype, mimetype, and media are required",
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

  // Send audio
  app.post("/api/evolution/send-audio", async (req, res) => {
    try {
      const { userId, number, audioBase64 } = req.body;

      const config = await storage.getConfiguration(userId || "default");
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

  // Proxy media (download media from Evolution API)
  app.post("/api/evolution/proxy-media", async (req, res) => {
    try {
      const { userId, messageKey } = req.body;

      const config = await storage.getConfiguration(userId || "default");
      if (!config || !messageKey) {
        return res.status(400).json({
          error: "Missing required parameters: userId or messageKey",
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

  // ============================================================================
  // LEADS API - Sistema de Qualificação com 5 Badges
  // ============================================================================

  // Função helper para mapear status do lead para badge
  function getFormBadgeStatus(lead: any): {
    badgeType: 'not_started' | 'incomplete' | 'completed' | 'approved' | 'rejected';
    badgeLabel: string;
  } {
    const formStatus = lead.formStatus || 'not_sent';
    const qualificationStatus = lead.qualificationStatus || 'pending';

    // 1. Não fez formulário (nem enviado)
    if (formStatus === 'not_sent') {
      return {
        badgeType: 'not_started',
        badgeLabel: 'Não fez formulário'
      };
    }

    // 2. Formulário incompleto (enviado mas não completado)
    if (formStatus === 'sent' || formStatus === 'incomplete') {
      return {
        badgeType: 'incomplete',
        badgeLabel: 'Formulário incompleto'
      };
    }

    // 3. Formulário completo mas ainda pendente
    if (formStatus === 'completed' && qualificationStatus === 'pending') {
      return {
        badgeType: 'completed',
        badgeLabel: 'Formulário completo'
      };
    }

    // 4. Aprovado
    if (qualificationStatus === 'approved') {
      return {
        badgeType: 'approved',
        badgeLabel: 'Aprovado'
      };
    }

    // 5. Não aprovado (rejected)
    if (qualificationStatus === 'rejected') {
      return {
        badgeType: 'rejected',
        badgeLabel: 'Não Aprovado'
      };
    }

    // Default: não fez formulário
    return {
      badgeType: 'not_started',
      badgeLabel: 'Não fez formulário'
    };
  }

  // GET /api/leads/whatsapp-status - Retorna status de todos os leads para o WhatsApp
  // ATUALIZADO: Retorna apenas leads com formulário e normaliza telefones corretamente
  app.get("/api/leads/whatsapp-status", async (req, res) => {
    try {
      console.log('📊 [GET /api/leads/whatsapp-status] Buscando status de leads...');
      
      const allLeads = await storage.getLeads();
      
      // Filtra apenas leads que têm alguma interação com formulário
      const leadsComFormulario = allLeads.filter(lead => 
        lead.formularioEnviado || 
        lead.formularioAberto || 
        lead.formularioIniciado || 
        lead.formularioConcluido
      );
      
      console.log(`✅ Encontrados ${leadsComFormulario.length} leads com formulário (de ${allLeads.length} total)`);
      
      // Mapear para formato simples com badge e telefone normalizado
      const leadsStatus = leadsComFormulario.map(lead => {
        const telefoneNormalizado = normalizePhone(lead.telefoneNormalizado || lead.telefone);
        
        console.log(`📱 Lead: ${lead.nome || 'Sem nome'} | Telefone: ${telefoneNormalizado} | Status: ${lead.formStatus}`);
        
        return {
          id: lead.id,
          telefone: lead.telefone,
          telefoneNormalizado: telefoneNormalizado,
          nome: lead.nome,
          whatsappId: lead.whatsappId,
          formStatus: lead.formStatus,
          qualificationStatus: lead.qualificationStatus,
          pontuacao: lead.pontuacao,
          formularioEnviado: lead.formularioEnviado,
          formularioAberto: lead.formularioAberto,
          formularioIniciado: lead.formularioIniciado,
          formularioConcluido: lead.formularioConcluido,
          badge: getFormBadgeStatus(lead),
          updatedAt: lead.updatedAt
        };
      });

      console.log(`✅ Retornando ${leadsStatus.length} leads processados`);
      res.json(leadsStatus);
    } catch (error: any) {
      console.error("❌ [GET /api/leads/whatsapp-status] Erro:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/leads/status/:telefone - Busca status de um lead específico por telefone
  // NOVO: Aceita telefone em QUALQUER formato (normaliza automaticamente)
  app.get("/api/leads/status/:telefone", async (req, res) => {
    try {
      const { telefone } = req.params;
      
      console.log(`🔍 [GET /api/leads/status/:telefone] Buscando status para: ${telefone}`);
      
      // Normaliza o telefone recebido
      const telefoneNormalizado = normalizePhone(telefone);
      
      if (!telefoneNormalizado) {
        console.log('❌ Telefone inválido');
        return res.status(400).json({
          success: false,
          error: 'Telefone inválido'
        });
      }

      console.log(`   Telefone normalizado: ${telefoneNormalizado}`);

      // Busca lead pelo telefone normalizado
      const lead = await storage.getLeadByTelefone(telefoneNormalizado);

      if (!lead) {
        console.log(`❌ Lead não encontrado para telefone: ${telefoneNormalizado}`);
        return res.json({
          success: true,
          exists: false
        });
      }

      console.log(`✅ Lead encontrado: ${lead.nome || 'Sem nome'}`);
      console.log(`   Form status: ${lead.formStatus}`);
      console.log(`   Qualification: ${lead.qualificationStatus}`);
      console.log(`   Pontuação: ${lead.pontuacao}`);

      res.json({
        success: true,
        exists: true,
        lead: {
          id: lead.id,
          nome: lead.nome,
          telefone: telefoneNormalizado,
          formStatus: lead.formStatus,
          qualificationStatus: lead.qualificationStatus,
          pontuacao: lead.pontuacao,
          formularioEnviado: lead.formularioEnviado,
          formularioAberto: lead.formularioAberto,
          formularioIniciado: lead.formularioIniciado,
          formularioConcluido: lead.formularioConcluido,
          updatedAt: lead.updatedAt
        }
      });

    } catch (error: any) {
      console.error('❌ [GET /api/leads/status/:telefone] Erro:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // POST /api/leads/status/batch - Buscar status de múltiplos leads de uma vez (OTIMIZAÇÃO)
  app.post("/api/leads/status/batch", async (req, res) => {
    try {
      const { telefones } = req.body;
      
      if (!Array.isArray(telefones) || telefones.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'telefones deve ser um array não vazio'
        });
      }

      console.log(`🔍 [POST /api/leads/status/batch] Buscando status para ${telefones.length} telefones`);
      
      // Normaliza todos os telefones e busca os leads
      const results = await Promise.all(
        telefones.map(async (telefone) => {
          const telefoneLimpo = telefone.replace(/@s\.whatsapp\.net$/, '').replace(/@c\.us$/, '').replace(/@g\.us$/, '');
          const telefoneNormalizado = normalizePhone(telefoneLimpo);
          
          if (!telefoneNormalizado) {
            return {
              telefone: telefone,
              success: true,
              exists: false
            };
          }

          const lead = await storage.getLeadByTelefone(telefoneNormalizado);

          if (!lead) {
            return {
              telefone: telefone,
              success: true,
              exists: false
            };
          }

          return {
            telefone: telefone,
            success: true,
            exists: true,
            lead: {
              id: lead.id,
              nome: lead.nome,
              telefone: telefoneNormalizado,
              formStatus: lead.formStatus,
              qualificationStatus: lead.qualificationStatus,
              pontuacao: lead.pontuacao,
              formularioEnviado: lead.formularioEnviado,
              formularioAberto: lead.formularioAberto,
              formularioIniciado: lead.formularioIniciado,
              formularioConcluido: lead.formularioConcluido,
              updatedAt: lead.updatedAt
            }
          };
        })
      );

      console.log(`✅ [BATCH] Processados ${results.length} telefones (${results.filter(r => r.exists).length} com leads)`);

      res.json({
        success: true,
        results
      });

    } catch (error: any) {
      console.error('❌ [POST /api/leads/status/batch] Erro:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // POST /api/leads/create-or-update - Criar ou atualizar lead por telefone
  app.post("/api/leads/create-or-update", async (req, res) => {
    try {
      const { telefone, nome, whatsappId, whatsappInstance } = req.body;

      if (!telefone) {
        return res.status(400).json({ error: "Telefone é obrigatório" });
      }

      // Normalizar telefone (remover caracteres especiais)
      const telefoneNormalizado = telefone.replace(/\D/g, '');

      // Verificar se lead já existe
      let lead = await storage.getLeadByTelefone(telefoneNormalizado);

      if (lead) {
        // Atualizar lead existente
        lead = await storage.updateLead(lead.id, {
          nome: nome || lead.nome,
          whatsappId: whatsappId || lead.whatsappId,
          whatsappInstance: whatsappInstance || lead.whatsappInstance
        });
      } else {
        // Criar novo lead
        lead = await storage.createLead({
          telefone,
          telefoneNormalizado,
          nome,
          whatsappId,
          whatsappInstance,
          formStatus: 'not_sent',
          qualificationStatus: 'pending'
        });
      }

      res.json({
        lead,
        badge: getFormBadgeStatus(lead)
      });
    } catch (error: any) {
      console.error("Error creating/updating lead:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/leads/by-phone/:phone - Buscar lead por telefone
  app.get("/api/leads/by-phone/:phone", async (req, res) => {
    try {
      const telefoneNormalizado = req.params.phone.replace(/\D/g, '');
      const lead = await storage.getLeadByTelefone(telefoneNormalizado);

      if (!lead) {
        return res.status(404).json({ error: "Lead não encontrado" });
      }

      res.json({
        lead,
        badge: getFormBadgeStatus(lead)
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // ROTAS DE TRACKING REAL DE LEADS
  // ============================================================================

  // 1. POST /api/leads/criar-sessao - Criar sessão de formulário
  app.post("/api/leads/criar-sessao", async (req, res) => {
    try {
      console.log('📝 [POST /api/leads/criar-sessao] Iniciando criação de sessão...');
      const { telefone, formularioId, diasExpiracao } = req.body;
      
      if (!telefone || !formularioId) {
        console.log('❌ Validação falhou: telefone ou formularioId ausente');
        return res.status(400).json({ 
          success: false,
          error: "Telefone e formularioId são obrigatórios" 
        });
      }

      console.log('📞 Telefone:', telefone, '| FormularioId:', formularioId);
      
      const result = await leadTrackingService.criarSessaoFormulario(
        telefone,
        formularioId,
        diasExpiracao
      );

      console.log('✅ Sessão criada com sucesso:', result.token);
      
      res.status(200).json({ 
        success: true, 
        data: result 
      });
    } catch (error: any) {
      console.error("❌ [POST /api/leads/criar-sessao] Erro:", error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });

  // 2. POST /api/leads/validar-token - Validar token e registrar abertura
  app.post("/api/leads/validar-token", async (req, res) => {
    try {
      console.log('🔍 [POST /api/leads/validar-token] Validando token...');
      const { token } = req.body;
      
      if (!token) {
        console.log('❌ Validação falhou: token ausente');
        return res.status(400).json({ 
          valid: false,
          erro: "Token é obrigatório" 
        });
      }

      const ip = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      console.log('🔑 Token:', token.substring(0, 10) + '...', '| IP:', ip);
      
      const result = await leadTrackingService.validarTokenERegistrarAbertura(
        token,
        ip,
        userAgent
      );

      if (!result.valido) {
        console.log('⚠️ Token inválido ou expirado:', result.erro);
        return res.status(200).json({ 
          valid: false, 
          erro: result.erro 
        });
      }

      console.log('✅ Token válido - Primeira abertura:', result.primeiraAbertura);
      console.log('📋 Dados pré-preenchidos:', result.dadosPreenchidos);
      
      res.status(200).json({ 
        valid: true, 
        data: {
          lead: result.lead,
          sessao: result.sessao,
          primeiraAbertura: result.primeiraAbertura,
          dadosPreenchidos: result.dadosPreenchidos
        }
      });
    } catch (error: any) {
      console.error("❌ [POST /api/leads/validar-token] Erro:", error);
      res.status(500).json({ 
        valid: false,
        erro: error.message 
      });
    }
  });

  // 3. POST /api/leads/registrar-inicio - Registrar início do preenchimento
  app.post("/api/leads/registrar-inicio", async (req, res) => {
    try {
      console.log('✏️ [POST /api/leads/registrar-inicio] Registrando início...');
      const { token, campoInicial, valor } = req.body;
      
      if (!token) {
        console.log('❌ Validação falhou: token ausente');
        return res.status(400).json({ 
          success: false,
          error: "Token é obrigatório" 
        });
      }

      console.log('📝 Campo inicial:', campoInicial, '| Token:', token.substring(0, 10) + '...');
      
      await leadTrackingService.registrarInicioPreenchimento(
        token,
        campoInicial,
        valor
      );

      console.log('✅ Início registrado com sucesso');
      
      res.status(200).json({ 
        success: true 
      });
    } catch (error: any) {
      console.error("❌ [POST /api/leads/registrar-inicio] Erro:", error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });

  // 4. POST /api/leads/atualizar-progresso - Atualizar progresso
  app.post("/api/leads/atualizar-progresso", async (req, res) => {
    try {
      console.log('📊 [POST /api/leads/atualizar-progresso] Atualizando progresso...');
      const { token, camposPreenchidos, totalCampos } = req.body;
      
      if (!token || !camposPreenchidos || !totalCampos) {
        console.log('❌ Validação falhou: parâmetros ausentes');
        return res.status(400).json({ 
          success: false,
          error: "Token, camposPreenchidos e totalCampos são obrigatórios" 
        });
      }

      console.log('📈 Progresso: campos preenchidos -', Object.keys(camposPreenchidos).length, '/', totalCampos);
      
      const result = await leadTrackingService.atualizarProgresso(
        token,
        camposPreenchidos,
        totalCampos
      );

      console.log('✅ Progresso atualizado:', result.progresso + '%');
      
      res.status(200).json({ 
        success: true,
        progresso: result.progresso,
        camposPreenchidos: result.camposPreenchidos,
        totalCampos: result.totalCampos
      });
    } catch (error: any) {
      console.error("❌ [POST /api/leads/atualizar-progresso] Erro:", error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });

  // 5. POST /api/leads/finalizar - Finalizar formulário
  app.post("/api/leads/finalizar", async (req, res) => {
    try {
      console.log('🎯 [POST /api/leads/finalizar] Finalizando formulário...');
      const { token, respostas, formularioId } = req.body;
      
      if (!token || !respostas || !formularioId) {
        console.log('❌ Validação falhou: parâmetros ausentes');
        return res.status(400).json({ 
          success: false,
          error: "Token, respostas e formularioId são obrigatórios" 
        });
      }

      const ip = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      console.log('📋 Finalizando formulário:', formularioId, '| IP:', ip);
      
      const result = await leadTrackingService.finalizarFormulario(
        token,
        respostas,
        {
          ip,
          userAgent,
          formularioId
        }
      );

      console.log('✅ Formulário finalizado -', result.qualificacao, '| Tempo:', result.tempoPreenchimento, 's');
      
      res.status(200).json({ 
        success: true,
        lead: result.lead,
        qualificacao: result.qualificacao,
        tempoPreenchimento: result.tempoPreenchimento
      });
    } catch (error: any) {
      console.error("❌ [POST /api/leads/finalizar] Erro:", error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });

  // 6. GET /api/leads/status/:telefone - Buscar status real do lead
  app.get("/api/leads/status/:telefone", async (req, res) => {
    try {
      console.log('🔎 [GET /api/leads/status/:telefone] Buscando status...');
      const { telefone } = req.params;
      
      if (!telefone) {
        console.log('❌ Validação falhou: telefone ausente');
        return res.status(400).json({ 
          success: false,
          error: "Telefone é obrigatório" 
        });
      }

      console.log('📞 Buscando status para telefone:', telefone);
      
      const result = await leadTrackingService.buscarStatusReal(telefone);

      console.log('✅ Status encontrado - Lead existe:', result.existe);
      
      res.status(200).json({ 
        success: true, 
        data: result 
      });
    } catch (error: any) {
      console.error("❌ [GET /api/leads/status/:telefone] Erro:", error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });

  // GET /api/formulario/sessao/:token - Obter dados da sessão por token
  app.get("/api/formulario/sessao/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const sessao = await storage.getSessaoByToken(token);
      
      if (!sessao) {
        return res.status(404).json({ error: "Sessão não encontrada" });
      }

      // Verifica expiração
      if (sessao.expiresAt && new Date(sessao.expiresAt) < new Date()) {
        return res.status(410).json({ error: "Link expirado" });
      }

      // Busca lead associado
      const lead = await storage.getLeads();
      const leadData = lead.find(l => l.id === sessao.leadId);

      res.json({
        sessao,
        lead: leadData,
      });
    } catch (error: any) {
      console.error("Error getting session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // LEAD SYNC API - Sincronização entre Submissions e Leads
  // ============================================================================

  // POST /api/leads/sync-from-submissions - Sincronizar todas as submissions com leads
  app.post("/api/leads/sync-from-submissions", async (req, res) => {
    try {
      console.log('🔄 [POST /api/leads/sync-from-submissions] Iniciando sincronização em massa...');
      
      const result = await leadSyncService.syncAllSubmissionsToLeads();
      
      console.log(`✅ [POST /api/leads/sync-from-submissions] Sincronização concluída: ${result.synced} sucesso, ${result.errors} erros`);
      
      res.status(200).json({
        success: result.success,
        message: `Sincronização concluída: ${result.synced} leads sincronizados, ${result.errors} erros`,
        synced: result.synced,
        errors: result.errors,
        details: result.details
      });
    } catch (error: any) {
      console.error("❌ [POST /api/leads/sync-from-submissions] Erro:", error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });

  // POST /api/leads/sync-submission/:submissionId - Sincronizar uma submission específica
  app.post("/api/leads/sync-submission/:submissionId", async (req, res) => {
    try {
      const { submissionId } = req.params;
      console.log(`🔄 [POST /api/leads/sync-submission/:submissionId] Sincronizando submission ${submissionId}...`);
      
      // Buscar a submission do PostgreSQL local
      const submission = await storage.getFormSubmissionById(submissionId);
      
      if (!submission) {
        console.warn(`⚠️ [POST /api/leads/sync-submission/:submissionId] Submission não encontrada: ${submissionId}`);
        return res.status(404).json({
          success: false,
          message: 'Submission não encontrada'
        });
      }
      
      const result = await leadSyncService.syncSubmissionToLead({
        id: submission.id,
        formId: submission.formId,
        contactPhone: submission.contactPhone,
        contactName: submission.contactName,
        contactEmail: submission.contactEmail,
        totalScore: submission.totalScore,
        passed: submission.passed,
      });
      
      if (result.success) {
        console.log(`✅ [POST /api/leads/sync-submission/:submissionId] Sincronização bem-sucedida: ${result.leadId}`);
        res.status(200).json({
          success: true,
          message: result.message,
          leadId: result.leadId
        });
      } else {
        console.warn(`⚠️ [POST /api/leads/sync-submission/:submissionId] ${result.message}`);
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error: any) {
      console.error("❌ [POST /api/leads/sync-submission/:submissionId] Erro:", error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });

  // POST /api/leads/sync-from-supabase - Sincronizar submissions do Supabase para leads do PostgreSQL local
  app.post("/api/leads/sync-from-supabase", async (req, res) => {
    try {
      console.log('🔄 [POST /api/leads/sync-from-supabase] Iniciando sincronização Supabase → PostgreSQL...');
      
      // PRIORIDADE 1: Banco de dados (app_settings) - Melhor prática
      let supabaseUrl: string | null = null;
      let supabaseKey: string | null = null;
      let source = 'não configurado';
      
      try {
        const settingsResult = await db.select().from(appSettings).limit(1);
        const settings = settingsResult[0];
        if (settings?.supabaseUrl && settings?.supabaseAnonKey) {
          supabaseUrl = settings.supabaseUrl;
          supabaseKey = settings.supabaseAnonKey;
          source = 'banco de dados (app_settings)';
          console.log('✅ Usando credenciais do banco de dados (app_settings)');
        }
      } catch (error) {
        console.warn('⚠️ Erro ao buscar credenciais do banco:', error);
      }
      
      // PRIORIDADE 2: Variáveis de ambiente (Secrets) - Fallback portátil
      if (!supabaseUrl || !supabaseKey) {
        supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || null;
        supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || null;
        if (supabaseUrl && supabaseKey) {
          source = 'Secrets (fallback)';
          console.log('✅ Usando credenciais dos Secrets (fallback)');
        }
      }
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('⚠️ Supabase não configurado em nenhuma fonte');
        return res.status(400).json({
          success: false,
          message: 'Supabase não configurado. Configure em /configuracoes (banco) ou em Tools → Secrets (SUPABASE_URL e SUPABASE_ANON_KEY)'
        });
      }

      console.log(`📡 Usando credenciais Supabase de: ${source}`);
      
      const supabase = await getDynamicSupabaseClient(supabaseUrl, supabaseKey);
      if (!supabase) {
        console.error('❌ Erro ao conectar no Supabase');
        return res.status(500).json({
          success: false,
          message: 'Erro ao conectar no Supabase'
        });
      }

      // Buscar todas as submissions do Supabase
      console.log('📡 Buscando submissions do Supabase...');
      const { data: submissions, error } = await supabase
        .from('form_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar submissions do Supabase:', error);
        throw error;
      }

      console.log(`📊 Total de submissions encontradas no Supabase: ${submissions?.length || 0}`);

      if (!submissions || submissions.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'Nenhuma submission encontrada no Supabase',
          synced: 0,
          errors: 0,
          details: []
        });
      }

      const results = {
        success: true,
        synced: 0,
        errors: 0,
        details: [] as any[]
      };

      // Sincronizar cada submission DIRETAMENTE no PostgreSQL local
      // (sem usar o leadSyncService que pode redirecionar para o Supabase)
      for (const submission of submissions) {
        const camelData = convertKeysToCamelCase(submission);
        
        try {
          if (!camelData.contactPhone) {
            results.errors++;
            results.details.push({
              submissionId: camelData.id,
              contactName: camelData.contactName,
              contactPhone: camelData.contactPhone,
              success: false,
              message: 'Telefone não fornecido'
            });
            continue;
          }

          const telefoneNormalizado = normalizarTelefone(camelData.contactPhone);
          const agora = new Date();
          const statusQualificacao = camelData.passed ? 'aprovado' : 'reprovado';
          const qualificationStatus = camelData.passed ? 'approved' : 'rejected';

          // Buscar lead existente no PostgreSQL local
          const existingLead = await db.select()
            .from(leads)
            .where(eq(leads.telefoneNormalizado, telefoneNormalizado))
            .limit(1)
            .then(rows => rows[0] || null);

          if (existingLead) {
            // Atualizar lead existente
            await db.update(leads)
              .set({
                nome: existingLead.nome || camelData.contactName || null,
                email: existingLead.email || camelData.contactEmail || null,
                formularioConcluido: true,
                formularioConcluidoEm: agora,
                formStatus: 'completed',
                statusQualificacao: statusQualificacao,
                qualificationStatus: qualificationStatus,
                pontuacao: camelData.totalScore,
                updatedAt: agora,
              })
              .where(eq(leads.id, existingLead.id));

            console.log(`✅ Lead atualizado: ${camelData.contactName} (${telefoneNormalizado})`);
          } else {
            // Criar novo lead
            await db.insert(leads).values({
              telefone: camelData.contactPhone,
              telefoneNormalizado: telefoneNormalizado,
              nome: camelData.contactName || null,
              email: camelData.contactEmail || null,
              origem: 'formulario',
              formularioConcluido: true,
              formularioConcluidoEm: agora,
              formStatus: 'completed',
              statusQualificacao: statusQualificacao,
              qualificationStatus: qualificationStatus,
              pontuacao: camelData.totalScore,
            });

            console.log(`✅ Novo lead criado: ${camelData.contactName} (${telefoneNormalizado})`);
          }

          results.synced++;
          results.details.push({
            submissionId: camelData.id,
            contactName: camelData.contactName,
            contactPhone: camelData.contactPhone,
            telefoneNormalizado,
            success: true,
            message: 'Lead sincronizado com sucesso'
          });

        } catch (error: any) {
          results.errors++;
          console.error(`❌ Erro ao sincronizar submission ${camelData.id}:`, error);
          results.details.push({
            submissionId: camelData.id,
            contactName: camelData.contactName,
            contactPhone: camelData.contactPhone,
            success: false,
            message: error.message
          });
        }
      }

      console.log(`✅ [POST /api/leads/sync-from-supabase] Concluído: ${results.synced} sucesso, ${results.errors} erros`);

      res.status(200).json({
        success: true,
        message: `Sincronização Supabase → PostgreSQL concluída: ${results.synced} leads sincronizados, ${results.errors} erros`,
        synced: results.synced,
        errors: results.errors,
        details: results.details
      });
    } catch (error: any) {
      console.error("❌ [POST /api/leads/sync-from-supabase] Erro:", error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });

  // ============================================================================
  // WHATSAPP LABELS - Etiquetas Personalizáveis
  // ============================================================================

  // GET /api/whatsapp/labels - Listar todas as etiquetas
  app.get("/api/whatsapp/labels", async (req, res) => {
    try {
      const labels = await db.select()
        .from(whatsappLabels)
        .where(eq(whatsappLabels.ativo, true))
        .orderBy(whatsappLabels.ordem);
      
      res.json(labels);
    } catch (error: any) {
      console.error("❌ [GET /api/whatsapp/labels] Erro:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/whatsapp/labels - Criar nova etiqueta
  app.post("/api/whatsapp/labels", async (req, res) => {
    try {
      const newLabel = await db.insert(whatsappLabels)
        .values(req.body)
        .returning();
      
      res.status(201).json(newLabel[0]);
    } catch (error: any) {
      console.error("❌ [POST /api/whatsapp/labels] Erro:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // PUT /api/whatsapp/labels/:id - Atualizar etiqueta
  app.put("/api/whatsapp/labels/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { id: _id, createdAt, updatedAt, ...updateData } = req.body;
      
      const updatedLabel = await db.update(whatsappLabels)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(whatsappLabels.id, id))
        .returning();
      
      if (!updatedLabel.length) {
        return res.status(404).json({ error: "Etiqueta não encontrada" });
      }
      
      res.json(updatedLabel[0]);
    } catch (error: any) {
      console.error("❌ [PUT /api/whatsapp/labels/:id] Erro:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE /api/whatsapp/labels/:id - Deletar etiqueta (soft delete)
  app.delete("/api/whatsapp/labels/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deletedLabel = await db.update(whatsappLabels)
        .set({ 
          ativo: false,
          updatedAt: new Date(),
        })
        .where(eq(whatsappLabels.id, id))
        .returning();
      
      if (!deletedLabel.length) {
        return res.status(404).json({ error: "Etiqueta não encontrada" });
      }
      
      res.json({ success: true, message: "Etiqueta removida" });
    } catch (error: any) {
      console.error("❌ [DELETE /api/whatsapp/labels/:id] Erro:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/whatsapp/labels/reset - Resetar para etiquetas padrão
  app.post("/api/whatsapp/labels/reset", async (req, res) => {
    try {
      // Desativar todas as etiquetas atuais
      await db.update(whatsappLabels)
        .set({ ativo: false, updatedAt: new Date() })
        .where(eq(whatsappLabels.ativo, true));
      
      // Criar etiquetas padrão
      const defaultLabels = [
        {
          nome: 'Formulário não enviado',
          cor: 'hsl(210, 40%, 50%)',
          formStatus: 'not_sent',
          qualificationStatus: null,
          ordem: 1,
          ativo: true,
        },
        {
          nome: 'Formulário incompleto',
          cor: 'hsl(39, 100%, 50%)',
          formStatus: 'incomplete',
          qualificationStatus: null,
          ordem: 2,
          ativo: true,
        },
        {
          nome: 'Formulário aprovado',
          cor: 'hsl(142, 71%, 45%)',
          formStatus: 'completed',
          qualificationStatus: 'approved',
          ordem: 3,
          ativo: true,
        },
        {
          nome: 'Formulário reprovado',
          cor: 'hsl(0, 84%, 60%)',
          formStatus: 'completed',
          qualificationStatus: 'rejected',
          ordem: 4,
          ativo: true,
        },
      ];
      
      const newLabels = await db.insert(whatsappLabels)
        .values(defaultLabels)
        .returning();
      
      res.json({
        success: true,
        message: "Etiquetas resetadas para padrão",
        labels: newLabels,
      });
    } catch (error: any) {
      console.error("❌ [POST /api/whatsapp/labels/reset] Erro:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // CAPTURA AUTOMÁTICA DE DADOS DO WHATSAPP
  // ============================================================================

  // GET /api/whatsapp/contact/:phoneNumber - Alias para captura de dados do WhatsApp (usado pelo frontend)
  app.get("/api/whatsapp/contact/:phoneNumber", async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      console.log('🔍 [GET /api/whatsapp/contact] Buscando dados para:', phoneNumber);

      // Busca configuração do WhatsApp
      const config = await storage.getConfiguration("default");
      
      // Se não tiver Evolution API configurada, retorna apenas o número
      if (!config) {
        console.log('⚠️ Evolution API não configurada - retornando apenas número');
        return res.json({
          success: true,
          contact: {
            telefone: phoneNumber,
            nome: null,
            profilePicUrl: null,
          },
          source: 'fallback'
        });
      }

      // Formata o número para o formato WhatsApp
      let numeroFormatado = phoneNumber;
      if (!numeroFormatado.includes('@')) {
        numeroFormatado = `${phoneNumber}@s.whatsapp.net`;
      }

      const baseUrl = config.apiUrlWhatsapp.replace(/\/$/, "");
      const encodedInstance = encodeURIComponent(config.instanceWhatsapp);
      
      // Busca informações do contato na Evolution API
      const url = `${baseUrl}/chat/findContacts/${encodedInstance}`;

      console.log('📡 Buscando contato na Evolution API:', url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          apikey: config.apiKeyWhatsapp,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        console.warn('⚠️ Evolution API retornou erro:', response.status);
        return res.json({
          success: true,
          contact: {
            telefone: phoneNumber,
            nome: null,
            profilePicUrl: null,
          },
          source: 'fallback'
        });
      }

      const contactsData = await response.json();
      const contacts = Array.isArray(contactsData) ? contactsData : contactsData.contacts || [];

      console.log(`📊 Total de contatos retornados pela Evolution API: ${contacts.length}`);
      
      // Debug: mostrar estrutura completa dos primeiros contatos
      if (contacts.length > 0) {
        console.log('📝 Estrutura do primeiro contato:', JSON.stringify(contacts[0], null, 2));
        
        // Procurar por "Gleice" especificamente para debug
        const gleice = contacts.find((c: any) => 
          (c.pushName || c.name || '').toLowerCase().includes('gleice')
        );
        if (gleice) {
          console.log('🎯 Contato Gleice encontrado:', JSON.stringify(gleice, null, 2));
        }
      }

      // Normaliza o número de busca removendo caracteres não numéricos
      const normalizedSearchNumber = phoneNumber.replace(/\D/g, '');
      console.log(`🔍 Número normalizado para busca: ${normalizedSearchNumber}`);

      // Busca o contato específico com normalização de números
      const contact = contacts.find((c: any) => {
        // IMPORTANTE: usar remoteJid PRIMEIRO, pois id é um UUID do banco!
        const contactNumber = c.remoteJid?.replace('@s.whatsapp.net', '') || 
                             c.id?.replace('@s.whatsapp.net', '') ||
                             '';
        const normalizedContactNumber = contactNumber.replace(/\D/g, '');
        
        // Tenta match exato ou match com/sem código do país
        const match = normalizedContactNumber === normalizedSearchNumber ||
                     normalizedContactNumber === normalizedSearchNumber.slice(-10) || // últimos 10 dígitos
                     normalizedContactNumber === normalizedSearchNumber.slice(-11) || // últimos 11 dígitos
                     normalizedSearchNumber.endsWith(normalizedContactNumber);
        
        if (match) {
          console.log(`✅ Match encontrado! Contato: ${contactNumber}, Busca: ${phoneNumber}`);
        }
        
        return match;
      });

      const contactName = contact ? (contact.pushName || contact.name || contact.verifiedName) : null;
      const contactProfilePic = contact ? contact.profilePicUrl : null;

      // Se encontrou o contato E tem nome, retorna
      if (contact && contactName) {
        console.log('✅ Contato encontrado com nome:', contactName);
        return res.json({
          success: true,
          contact: {
            telefone: phoneNumber,
            nome: contactName,
            profilePicUrl: contactProfilePic || null,
          },
          source: 'evolution-api-contacts'
        });
      }

      // Se encontrou o contato mas SEM nome, ou não encontrou, busca nos chats para tentar achar o nome
      if (contact) {
        console.log('ℹ️ Contato encontrado mas sem nome, buscando nos chats para complementar...');
      } else {
        console.log('ℹ️ Contato não encontrado na lista de contatos, buscando nos chats...');
      }
      
      try {
        const chatsUrl = `${baseUrl}/chat/findChats/${encodedInstance}`;
        console.log('📡 Buscando nos chats da Evolution API:', chatsUrl);

        const chatsResponse = await fetch(chatsUrl, {
          method: "POST",
          headers: {
            apikey: config.apiKeyWhatsapp,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        if (chatsResponse.ok) {
          const chatsData = await chatsResponse.json();
          const chats = Array.isArray(chatsData) ? chatsData : chatsData.chats || [];
          
          console.log(`📊 Total de chats retornados: ${chats.length}`);
          
          // Debug: log da estrutura de um chat
          if (chats.length > 0) {
            console.log('📝 Estrutura do primeiro chat:', JSON.stringify(chats[0], null, 2));
          }
          
          // Debug: procurar chats com número parecido com o que estamos buscando
          const similarChats = chats.filter((c: any) => {
            const chatNumber = c.remoteJid?.replace('@s.whatsapp.net', '') || c.id?.replace('@s.whatsapp.net', '') || '';
            return chatNumber.includes('55319715') || chatNumber.includes('31971529') || chatNumber.includes('971529');
          });
          
          if (similarChats.length > 0) {
            console.log('🔍 Chats com números similares encontrados:', 
              similarChats.map((c: any) => ({
                id: c.id,
                name: c.pushName || c.name,
                number: (c.id || '').replace('@s.whatsapp.net', '')
              }))
            );
          } else {
            console.log('ℹ️ Nenhum chat com número similar a 55319715 encontrado');
            // Mostrar alguns exemplos de números de chat
            const samples = chats.slice(0, 10).map((c: any) => ({
              name: c.pushName || c.name,
              number: (c.remoteJid || c.id || '').replace('@s.whatsapp.net', '')
            }));
            console.log('📝 Exemplos de números nos chats:', samples);
          }

          // Busca o chat pelo número
          const chat = chats.find((c: any) => {
            // IMPORTANTE: usar remoteJid PRIMEIRO, pois id é um UUID do banco!
            const chatNumber = c.remoteJid?.replace('@s.whatsapp.net', '') || 
                              c.id?.replace('@s.whatsapp.net', '') ||
                              '';
            const normalizedChatNumber = chatNumber.replace(/\D/g, '');
            
            const match = normalizedChatNumber === normalizedSearchNumber ||
                         normalizedChatNumber === normalizedSearchNumber.slice(-10) ||
                         normalizedChatNumber === normalizedSearchNumber.slice(-11) ||
                         normalizedSearchNumber.endsWith(normalizedChatNumber);
            
            return match;
          });

          if (chat) {
            const chatName = chat.pushName || chat.name || chat.verifiedName || null;
            const chatProfilePic = chat.profilePicUrl || null;
            console.log('✅ Chat encontrado:', chatName);
            
            // Mescla dados: nome do chat + foto do contato (ou do chat se contato não tiver)
            return res.json({
              success: true,
              contact: {
                telefone: phoneNumber,
                nome: chatName,
                profilePicUrl: contactProfilePic || chatProfilePic,
              },
              source: contact ? 'evolution-api-contact+chat' : 'evolution-api-chats'
            });
          }
        }
      } catch (chatsError) {
        console.error('⚠️ Erro ao buscar chats:', chatsError);
      }

      // Se não encontrou em nenhum lugar ou encontrou mas sem nome/foto, retorna o que tiver
      if (contact) {
        console.log('ℹ️ Contato encontrado mas sem nome nos chats também');
        return res.json({
          success: true,
          contact: {
            telefone: phoneNumber,
            nome: null,
            profilePicUrl: contactProfilePic,
          },
          source: 'evolution-api-contacts-no-name'
        });
      }
      
      console.log('ℹ️ Contato/Chat não encontrado na Evolution API');
      return res.json({
        success: true,
        contact: {
          telefone: phoneNumber,
          nome: null,
          profilePicUrl: null,
        },
        source: 'not-found'
      });

    } catch (error: any) {
      console.error('❌ [GET /api/whatsapp/contact] Erro:', error);
      // Em caso de erro, retorna apenas o número
      return res.json({
        success: true,
        contact: {
          telefone: req.params.phoneNumber,
          nome: null,
          profilePicUrl: null,
        },
        source: 'error'
      });
    }
  });

  // GET /api/whatsapp/contact-info/:numero - Buscar informações do contato via Evolution API
  app.get("/api/whatsapp/contact-info/:numero", async (req, res) => {
    try {
      const { numero } = req.params;
      console.log('🔍 [GET /api/whatsapp/contact-info] Buscando dados para:', numero);

      // Busca configuração do WhatsApp
      const config = await storage.getConfiguration("default");
      
      // Se não tiver Evolution API configurada, retorna apenas o número
      if (!config) {
        console.log('⚠️ Evolution API não configurada - retornando apenas número');
        return res.json({
          success: true,
          contact: {
            telefone: numero,
            nome: null,
            profilePicUrl: null,
          },
          source: 'fallback'
        });
      }

      // Formata o número para o formato WhatsApp
      let numeroFormatado = numero;
      if (!numeroFormatado.includes('@')) {
        numeroFormatado = `${numero}@s.whatsapp.net`;
      }

      const baseUrl = config.apiUrlWhatsapp.replace(/\/$/, "");
      const encodedInstance = encodeURIComponent(config.instanceWhatsapp);
      
      // Busca informações do contato na Evolution API
      const url = `${baseUrl}/chat/findContacts/${encodedInstance}`;

      console.log('📡 Buscando contato na Evolution API:', url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          apikey: config.apiKeyWhatsapp,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        console.warn('⚠️ Evolution API retornou erro:', response.status);
        return res.json({
          success: true,
          contact: {
            telefone: numero,
            nome: null,
            profilePicUrl: null,
          },
          source: 'fallback'
        });
      }

      const contactsData = await response.json();
      const contacts = Array.isArray(contactsData) ? contactsData : contactsData.contacts || [];

      console.log(`📊 Total de contatos retornados pela Evolution API: ${contacts.length}`);

      // Normaliza o número de busca removendo caracteres não numéricos
      const normalizedSearchNumber = numero.replace(/\D/g, '');
      console.log(`🔍 Número normalizado para busca: ${normalizedSearchNumber}`);

      // Busca o contato específico com normalização de números
      const contact = contacts.find((c: any) => {
        // IMPORTANTE: usar remoteJid PRIMEIRO, pois id é um UUID do banco!
        const contactNumber = c.remoteJid?.replace('@s.whatsapp.net', '') || 
                             c.id?.replace('@s.whatsapp.net', '') ||
                             '';
        const normalizedContactNumber = contactNumber.replace(/\D/g, '');
        
        // Tenta match exato ou match com/sem código do país
        const match = normalizedContactNumber === normalizedSearchNumber ||
                     normalizedContactNumber === normalizedSearchNumber.slice(-10) || // últimos 10 dígitos
                     normalizedContactNumber === normalizedSearchNumber.slice(-11) || // últimos 11 dígitos
                     normalizedSearchNumber.endsWith(normalizedContactNumber);
        
        if (match) {
          console.log(`✅ Match encontrado! Contato: ${contactNumber}, Busca: ${numero}`);
        }
        
        return match;
      });

      if (contact) {
        console.log('✅ Contato encontrado:', contact.pushName || contact.name);
        return res.json({
          success: true,
          contact: {
            telefone: numero,
            nome: contact.pushName || contact.name || contact.verifiedName || null,
            profilePicUrl: contact.profilePicUrl || null,
          },
          source: 'evolution-api'
        });
      }

      // Se não encontrou o contato, retorna apenas o número
      console.log('ℹ️ Contato não encontrado na Evolution API');
      return res.json({
        success: true,
        contact: {
          telefone: numero,
          nome: null,
          profilePicUrl: null,
        },
        source: 'not-found'
      });

    } catch (error: any) {
      console.error('❌ [GET /api/whatsapp/contact-info] Erro:', error);
      // Em caso de erro, retorna apenas o número
      return res.json({
        success: true,
        contact: {
          telefone: req.params.numero,
          nome: null,
          profilePicUrl: null,
        },
        source: 'error'
      });
    }
  });

  // POST /api/whatsapp/track-form-start - Alias para tracking do formulário (usado pelo frontend)
  app.post("/api/whatsapp/track-form-start", async (req, res) => {
    try {
      const { formId, telefone } = req.body;
      
      if (!telefone) {
        return res.status(400).json({ 
          success: false, 
          error: "Telefone é obrigatório" 
        });
      }

      console.log('📝 [POST /api/whatsapp/track-form-start] Registrando início:', { formId, telefone });

      // Normaliza o telefone
      const telefoneNormalizado = normalizarTelefone(telefone);

      // Busca ou cria o lead
      const lead = await leadService.buscarOuCriarLead({
        telefone,
        telefoneNormalizado,
      });

      // Atualiza status para "iniciado" se ainda não foi
      if (!lead.formularioIniciado) {
        await db.update(leads)
          .set({
            formularioIniciado: true,
            formularioIniciadoEm: new Date(),
            formStatus: 'incomplete',
            updatedAt: new Date(),
          })
          .where(eq(leads.id, lead.id));

        console.log('✅ Status atualizado para: incomplete (formulário iniciado)');
      }

      res.json({
        success: true,
        message: "Início de preenchimento registrado",
        leadId: lead.id,
      });

    } catch (error: any) {
      console.error('❌ [POST /api/whatsapp/track-form-start] Erro:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // POST /api/forms/track-start - Registrar início de preenchimento do formulário
  app.post("/api/forms/track-start", async (req, res) => {
    try {
      const { formId, telefone } = req.body;
      
      if (!telefone) {
        return res.status(400).json({ 
          success: false, 
          error: "Telefone é obrigatório" 
        });
      }

      console.log('📝 [POST /api/forms/track-start] Registrando início:', { formId, telefone });

      // Normaliza o telefone
      const telefoneNormalizado = normalizarTelefone(telefone);

      // Busca ou cria o lead
      const lead = await leadService.buscarOuCriarLead({
        telefone,
        telefoneNormalizado,
      });

      // Atualiza status para "iniciado" se ainda não foi
      if (!lead.formularioIniciado) {
        await db.update(leads)
          .set({
            formularioIniciado: true,
            formularioIniciadoEm: new Date(),
            formStatus: 'incomplete',
            updatedAt: new Date(),
          })
          .where(eq(leads.id, lead.id));

        console.log('✅ Status atualizado para: incomplete (formulário iniciado)');
      }

      res.json({
        success: true,
        message: "Início de preenchimento registrado",
        leadId: lead.id,
      });

    } catch (error: any) {
      console.error('❌ [POST /api/forms/track-start] Erro:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });
}
