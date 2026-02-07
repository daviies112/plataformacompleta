import type { Express } from "express";
import { storage } from "../formularios/storage";
import { db } from "../formularios/db";
import { eq, desc, and, isNull } from "drizzle-orm";
import { insertFormSchema, insertFormSubmissionSchema, insertFormTemplateSchema, insertCompletionPageSchema, appSettings, leads, whatsappLabels, supabaseConfig, forms, formTenantMapping, formSubmissions } from "../../shared/db-schema";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { getDynamicSupabaseClient as getFormSupabaseClient } from "../formularios/utils/supabaseClient";
import { getDynamicSupabaseClient } from "../lib/multiTenantSupabase";
import { convertKeysToCamelCase, convertKeysToSnakeCase, parseJsonbFields, stringifyJsonbFields, mapFormDataToSupabase, SUPABASE_FORMS_VALID_FIELDS, reconstructFormDataFromSupabase } from "../formularios/utils/caseConverter";
import * as leadService from "../formularios/services/leadService";
import { leadTrackingService } from "../formularios/services/leadTracking";
import { leadSyncService } from "../formularios/services/leadSync";
import { normalizarTelefone } from '../formularios/utils/phone';
import { normalizePhone } from '../formularios/utils/phoneNormalizer';
import { encrypt, decrypt } from '../lib/credentialsManager';
import { enrichFormsWithSubmissionCount } from "../formularios/utils/formEnrichment";
import { generateFormSlug, generateUniqueFormSlug, generateCompanySlug } from '../formularios/utils/slugGenerator';
import { authenticateToken } from '../middleware/auth';
import { getEvolutionApiCredentials, EvolutionApiCredentials } from '../lib/credentialsDb';
// 🚀 PERFORMANCE: Import optimized cache for public routes
import { 
  getCachedSupabaseClient, 
  getCachedSupabaseCredentials, 
  hasCachedSupabaseConfig,
  getCachedForm,
  setCachedForm,
  getCachedFormTenantMapping,
  setCachedFormTenantMapping,
  invalidateFormCache,
  getPublicFormUltraFast,
  removePersistentFormMapping
} from '../lib/publicCache';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Helper function to get Evolution API credentials for a tenant
 * 🔐 MULTI-TENANT: Uses evolution_api_config table
 */
async function getEvolutionConfig(tenantId: string): Promise<{ apiUrlWhatsapp: string; apiKeyWhatsapp: string; instanceWhatsapp: string } | null> {
  if (!tenantId || tenantId === 'default') {
    console.warn('[EVOLUTION] No valid tenantId provided');
    return null;
  }
  
  const creds = await getEvolutionApiCredentials(tenantId);
  if (!creds) {
    console.log(`[EVOLUTION] No credentials found for tenant: ${tenantId}`);
    return null;
  }
  
  return {
    apiUrlWhatsapp: creds.apiUrl,
    apiKeyWhatsapp: creds.apiKey,
    instanceWhatsapp: creds.instance || 'default-instance'
  };
}

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
 * Helper function to check if a tenant has Supabase configured
 * 🔐 MULTI-TENANT: Verifica se o tenant tem credenciais Supabase configuradas
 * 🚀 PERFORMANCE: Uses in-memory cache to avoid DB query on every request
 * 
 * @param tenantId - ID do tenant para verificar
 * @returns true se Supabase está configurado, false caso contrário
 */
async function hasSupabaseConfigured(tenantId: string): Promise<boolean> {
  if (!tenantId) return false;
  // 🚀 PERFORMANCE: Use cached check instead of DB query
  return hasCachedSupabaseConfig(tenantId);
}

/**
 * Helper function to get Supabase client with proper credentials
 * 🔐 MULTI-TENANT: Usa tenantId para buscar credenciais isoladas
 * 🚀 PERFORMANCE: Uses in-memory cache to avoid DB query and client creation on every request
 * 
 * @param tenantId - ID do tenant (userId) para buscar credenciais específicas
 * @returns Cliente Supabase ou null se não configurado
 */
async function getSupabaseClient(tenantId?: string) {
  if (!tenantId) return null;
  // 🚀 PERFORMANCE: Use cached Supabase client
  return getCachedSupabaseClient(tenantId);
}

/**
 * Resolve tenant ID for public form access by querying global mapping table
 * 🔐 MULTI-TENANT SECURITY: Single source of truth para forms (local + Supabase)
 * 
 * @param identifier - Form ID (UUID) or form slug to resolve
 * @param isUUID - true if identifier is a UUID, false if it's a slug
 * @returns tenantId if form exists and is public, null otherwise
 */
/**
 * 🔐 SECURITY HELPER: Verify if a form is publicly accessible
 * Prevents leaking private form data through storage fallbacks
 * 
 * @param formId - The UUID of the form to check
 * @returns true if the form is marked as public, false otherwise
 */
async function assertPublicFormAccess(formId: string): Promise<boolean> {
  try {
    // 1. First check formTenantMapping - this is the authoritative source
    const mappingCheck = await db
      .select({ isPublic: formTenantMapping.isPublic })
      .from(formTenantMapping)
      .where(eq(formTenantMapping.formId, formId))
      .limit(1);
    
    if (mappingCheck.length > 0) {
      // Form is in mapping - use its isPublic flag
      const isPublic = mappingCheck[0].isPublic === true;
      if (!isPublic) {
        console.log(`🔒 [SECURITY] assertPublicFormAccess: Form ${formId} is in mapping but NOT public`);
      }
      return isPublic;
    }
    
    // 2. If not in mapping, check the forms table
    let formCheck: any[] = [];
    try {
      formCheck = await db
        .select({ isPublic: forms.isPublic })
        .from(forms)
        .where(eq(forms.id, formId))
        .limit(1);
    } catch (localDbError) {
      console.log('⚠️ [SECURITY] Local forms table not available, skipping forms table check');
    }
    
    if (formCheck.length > 0) {
      // Form exists - isPublic: null/undefined = public (legacy), false = private, true = public
      const isPublic = formCheck[0].isPublic !== false;
      if (!isPublic) {
        console.log(`🔒 [SECURITY] assertPublicFormAccess: Form ${formId} exists but isPublic=false`);
      }
      return isPublic;
    }
    
    // 3. Form not found anywhere - deny access
    console.log(`🔒 [SECURITY] assertPublicFormAccess: Form ${formId} not found in any table`);
    return false;
  } catch (error) {
    console.error(`[SECURITY] Error in assertPublicFormAccess for form ${formId}:`, error);
    return false; // Fail closed - deny access on error
  }
}

async function resolvePublicFormTenant(identifier: string, isUUID: boolean = true, companySlug?: string): Promise<string | null> {
  try {
    // 🚀 PERFORMANCE: Check in-memory cache first
    const cachedMapping = getCachedFormTenantMapping(identifier);
    if (cachedMapping) {
      if (!cachedMapping.isPublic) {
        return null;
      }
      return cachedMapping.tenantId;
    }
    
    // Query global mapping table (works for both local + Supabase forms)
    let mappingRecord;
    
    if (isUUID) {
      mappingRecord = await db
        .select({ tenantId: formTenantMapping.tenantId, isPublic: formTenantMapping.isPublic, formId: formTenantMapping.formId })
        .from(formTenantMapping)
        .where(eq(formTenantMapping.formId, identifier))
        .limit(1);
    } else if (companySlug) {
      mappingRecord = await db
        .select({ tenantId: formTenantMapping.tenantId, isPublic: formTenantMapping.isPublic, formId: formTenantMapping.formId })
        .from(formTenantMapping)
        .where(and(eq(formTenantMapping.slug, identifier), eq(formTenantMapping.companySlug, companySlug)))
        .limit(1);
    } else {
      const allMatches = await db
        .select({ tenantId: formTenantMapping.tenantId, isPublic: formTenantMapping.isPublic, formId: formTenantMapping.formId, companySlug: formTenantMapping.companySlug })
        .from(formTenantMapping)
        .where(eq(formTenantMapping.slug, identifier));
      
      if (allMatches.length > 1) {
        return null;
      }
      mappingRecord = allMatches;
    }
    
    if (mappingRecord.length > 0) {
      const mapping = mappingRecord[0];
      
      // 🚀 PERFORMANCE: Cache the mapping result
      setCachedFormTenantMapping(identifier, {
        tenantId: mapping.tenantId,
        isPublic: mapping.isPublic === true,
        formId: mapping.formId
      });
      
      if (!mapping.isPublic) {
        return null;
      }
      return mapping.tenantId;
    }
    
    // 🚀 PERFORMANCE: Se não encontrou no mapping, retorna null imediatamente
    // O FormMappingSync job irá popular o mapping periodicamente
    // REMOVIDO: Fallback lento que iterava TODOS os tenants do Supabase (causava 15+ segundos de delay)
    console.log(`⚠️ [PUBLIC] Form ${identifier} not found in mapping - returning null (sync job will populate)`);
    return null;
  } catch (error) {
    console.error('[SECURITY] Error resolving public form tenant:', error);
    return null;
  }
}

export function registerFormulariosCompleteRoutes(app: Express) {
  console.log("📋 Registering Formularios Platform Complete Routes...");
  
  // Get all forms WITH submission counts from form_submissions table
  app.get("/api/forms", authenticateToken, async (req, res) => {
    try {
      const tenantId = (req as any).user!.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Sessão inválida - faça login novamente' });
      }
      
      // 🔐 CORREÇÃO: Usar MESMA função que Workspace usa (getDynamicSupabaseClient de multiTenantSupabase)
      // Esta função NÃO tem negative caching e busca sempre do banco
      const supabase = await getDynamicSupabaseClient(tenantId);
      
      if (supabase) {
        console.log('🔍 [GET /api/forms] Buscando do Supabase (usando mesma lógica do Workspace)...');
        
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('❌ [SUPABASE] Erro ao buscar forms:', error);
          throw error;
        }
        
        console.log(`📊 [SUPABASE] ${data?.length || 0} formulário(s) encontrado(s)`);
        
        // Format data BEFORE enriching with submission counts
        // IMPORTANTE: Usar reconstructFormDataFromSupabase para reconstruir welcomeConfig e completionPageConfig
        const formattedData = (data || []).map((form: any) => {
          const camelForm = convertKeysToCamelCase(form);
          const parsedForm = parseJsonbFields(camelForm, ['questions', 'designConfig', 'scoreTiers', 'tags']);
          return reconstructFormDataFromSupabase(parsedForm);
        });
        
        // CORREÇÃO: Enrich forms with submission counts from form_submissions table
        const enrichedForms = await enrichFormsWithSubmissionCount(supabase, formattedData);
        
        console.log(`✅ [SUPABASE] Retornando ${enrichedForms.length} formulário(s) (usando mesma lógica do Workspace)`);
        // Desabilitar cache HTTP para garantir dados frescos
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        return res.json({
          success: true,
          forms: enrichedForms,
          total: enrichedForms.length
        });
      }
      
      // 🔐 Supabase NÃO configurado → retornar lista vazia
      console.log('⚠️ [GET /api/forms] Supabase NÃO configurado - retornando lista vazia');
      console.log('💡 [GET /api/forms] Configure credenciais Supabase em /configuracoes para ver formulários');
      // Desabilitar cache HTTP para garantir dados frescos após configurar credenciais
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json({
        success: true,
        forms: [],
        total: 0,
        message: 'Configure credenciais do Supabase para ver formulários'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Helper function to check if a string is a valid UUID
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Get form by ID (PUBLIC - no auth required, but allows owner preview)
  app.get("/api/forms/public/:id", async (req, res) => {
    try {
      const formIdOrSlug = req.params.id;
      const isUUID = isValidUUID(formIdOrSlug);
      
      // 🚀 PERFORMANCE: Check form cache first
      const cachedForm = getCachedForm(formIdOrSlug);
      if (cachedForm) {
        res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        return res.json(cachedForm);
      }
      
      // 🔐 PREVIEW MODE: Check if authenticated user is the form owner (skip for public requests)
      const sessionTenantId = (req.session as any)?.tenantId || (req.session as any)?.userId;
      
      if (sessionTenantId) {
        
        // Try to find the form in the authenticated user's Supabase (owner preview mode)
        const ownerSupabase = await getSupabaseClient(sessionTenantId);
        
        if (ownerSupabase) {
          // Se for UUID, buscar por id; se for slug, buscar por slug
          const query = isUUID 
            ? ownerSupabase.from('forms').select('*').eq('id', formIdOrSlug).single()
            : ownerSupabase.from('forms').select('*').eq('slug', formIdOrSlug).single();
          
          const { data: ownerForm, error: ownerError } = await query;
          
          if (!ownerError && ownerForm) {
            console.log(`✅ [PREVIEW] Form ${formIdOrSlug} found in owner's tenant - allowing preview access`);
            const camelForm = convertKeysToCamelCase(ownerForm);
            const parsedForm = parseJsonbFields(camelForm, ['questions', 'designConfig', 'scoreTiers', 'tags']);
            const reconstructedForm = reconstructFormDataFromSupabase(parsedForm);
            res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
            return res.json(reconstructedForm);
          }
          
          if (ownerError && ownerError.code !== 'PGRST116') {
            console.warn(`⚠️ [PREVIEW] Error checking owner access:`, ownerError.message);
          }
        }
        
        // Also check local PostgreSQL for owner's forms
        let localOwnerForm: any[] = [];
        try {
          if (isUUID) {
            localOwnerForm = await db
              .select()
              .from(forms)
              .where(and(eq(forms.id, formIdOrSlug), eq(forms.tenantId, sessionTenantId)))
              .limit(1);
          } else {
            localOwnerForm = await db
              .select()
              .from(forms)
              .where(and(eq(forms.slug, formIdOrSlug), eq(forms.tenantId, sessionTenantId)))
              .limit(1);
          }
        } catch (e) {
          console.log('⚠️ [PREVIEW] Local forms table not available, skipping owner preview check');
        }
        
        if (localOwnerForm.length > 0) {
          console.log(`✅ [PREVIEW] Form ${formIdOrSlug} found in owner's local DB - allowing preview access`);
          // Reconstruir welcomeConfig para dados locais também
          const reconstructedForm = reconstructFormDataFromSupabase(localOwnerForm[0]);
          res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
          return res.json(reconstructedForm);
        }
      }
      
      // 🔐 SEGURANÇA: Para SLUGS, verificar colisões ANTES de qualquer fallback
      // Se houver colisão de slugs entre tenants, NÃO permitir fallbacks - retornar 404 imediatamente
      let hasSlugCollision = false;
      
      if (!isUUID) {
        // Verificar colisão no formTenantMapping
        const allMappingMatches = await db
          .select({ tenantId: formTenantMapping.tenantId })
          .from(formTenantMapping)
          .where(eq(formTenantMapping.slug, formIdOrSlug));
        
        if (allMappingMatches.length > 1) {
          console.warn(`[SECURITY] Multiple tenants have slug "${formIdOrSlug}" in mapping - collision detected`);
          hasSlugCollision = true;
        }
        
        // Também verificar colisão na tabela forms
        if (!hasSlugCollision) {
          try {
            const allFormMatches = await db
              .select({ id: forms.id, tenantId: forms.tenantId })
              .from(forms)
              .where(eq(forms.slug, formIdOrSlug));
            
            if (allFormMatches.length > 1) {
              console.warn(`[SECURITY] Multiple forms have slug "${formIdOrSlug}" - collision detected`);
              hasSlugCollision = true;
            }
          } catch (e) {
            console.log('⚠️ [PUBLIC] Local forms table not available, skipping slug collision check');
          }
        }
        
        // 🔐 SEGURANÇA: Se houver colisão, retornar 404 IMEDIATAMENTE - não tentar fallbacks
        if (hasSlugCollision) {
          console.warn(`[SECURITY] Slug collision detected for "${formIdOrSlug}" - returning 404 to prevent cross-tenant exposure`);
          return res.status(404).json({
            success: false,
            error: 'Form not found or not public'
          });
        }
      }
      
      // 🔐 PUBLIC ACCESS: Resolver tenant via form metadata (requires is_public = true)
      // Passa isUUID para indicar se deve buscar por formId ou slug no mapping
      const tenantId = await resolvePublicFormTenant(formIdOrSlug, isUUID);

      // 🔄 FALLBACK LOCAL: Se não encontrou tenant, tentar buscar diretamente no banco local
      // NOTA: Fallbacks só são seguros porque já verificamos colisões acima para slugs
      if (!tenantId) {
        console.log(`🔍 [PUBLIC FALLBACK] Tenant não encontrado, buscando formulário ${formIdOrSlug} diretamente no banco local...`);
        
        // Buscar formulário diretamente na tabela forms (sem exigir tenant/mapping)
        let localFormResult: any[] = [];
        try {
          if (isUUID) {
            // UUID é único, pode usar limit(1) - seguro por natureza
            localFormResult = await db
              .select()
              .from(forms)
              .where(eq(forms.id, formIdOrSlug))
              .limit(1);
          } else {
            // 🔐 SEGURANÇA: Para slugs, colisões já foram verificadas acima
            // Se chegou aqui, sabemos que não há colisão
            localFormResult = await db
              .select()
              .from(forms)
              .where(eq(forms.slug, formIdOrSlug))
              .limit(1);
          }
        } catch (e) {
          console.log('⚠️ [PUBLIC FALLBACK] Local forms table not available, skipping local lookup');
        }
        
        if (localFormResult.length > 0) {
          const localForm = localFormResult[0];
          
          // Verificar se o formulário é público (isPublic = true ou não especificado)
          if (localForm.isPublic === false) {
            console.log(`🔒 [PUBLIC FALLBACK] Formulário ${formIdOrSlug} encontrado mas não é público`);
            return res.status(404).json({
              success: false,
              error: 'Form not found or not public'
            });
          }
          
          const reconstructedForm = reconstructFormDataFromSupabase(localForm);
          // 🚀 PERFORMANCE: Cache the form for future requests
          setCachedForm(formIdOrSlug, reconstructedForm);
          res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
          return res.json(reconstructedForm);
        }
        
        // Também tentar via storage como último recurso (apenas para UUID)
        // 🔐 SEGURANÇA: Storage fallback só é permitido para UUID (que são únicos globalmente)
        if (isUUID) {
          try {
            const storageForm = await storage.getFormById(formIdOrSlug);
            if (storageForm) {
              // 🔐 SECURITY: Verify form is public before returning via storage fallback
              const isFormPublic = await assertPublicFormAccess(formIdOrSlug);
              if (!isFormPublic) {
                console.log(`🔒 [PUBLIC FALLBACK] Formulário ${formIdOrSlug} encontrado via storage mas não é público`);
                return res.status(404).json({
                  success: false,
                  error: 'Form not found or not public'
                });
              }
              const reconstructedForm = reconstructFormDataFromSupabase(storageForm);
              // 🚀 PERFORMANCE: Cache the form for future requests
              setCachedForm(formIdOrSlug, reconstructedForm);
              res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
              return res.json(reconstructedForm);
            }
          } catch (e) {
            console.log('⚠️ [PUBLIC FALLBACK] Storage/local forms table not available, skipping');
          }
        }
        
        console.log(`❌ [PUBLIC FALLBACK] Formulário ${formIdOrSlug} não encontrado em nenhum lugar`);
        return res.status(404).json({
          success: false,
          error: 'Form not found or not public'
        });
      }

      const supabase = await getSupabaseClient(tenantId);
      
      if (supabase) {
        console.log('🌐 [PUBLIC] [GET /api/forms/public/:id] Buscando do Supabase...');
        
        // Suporta tanto UUID quanto slug
        const query = isUUID
          ? supabase.from('forms').select('*').eq('id', formIdOrSlug).single()
          : supabase.from('forms').select('*').eq('slug', formIdOrSlug).single();
        
        const { data, error } = await query;
        
        if (error) {
          if (error.code === 'PGRST116') {
            console.log(`❌ [PUBLIC] Formulário não encontrado no Supabase`);
            return res.status(404).json({
              success: false,
              error: 'Form not found'
            });
          }
          console.error('❌ [SUPABASE] Erro ao buscar form público:', error);
          throw error;
        }
        
        const camelForm = convertKeysToCamelCase(data);
        const parsedForm = parseJsonbFields(camelForm, ['questions', 'designConfig', 'scoreTiers', 'tags']);
        const reconstructedForm = reconstructFormDataFromSupabase(parsedForm);
        // 🚀 PERFORMANCE: Cache the form for future requests
        setCachedForm(formIdOrSlug, reconstructedForm);
        res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        return res.json(reconstructedForm);
      }
      
      console.log('🌐 [PUBLIC] [GET /api/forms/public/:id] Buscando do PostgreSQL local...');
      // Suporta tanto UUID quanto slug
      let form;
      if (isUUID) {
        // 🔐 SEGURANÇA MULTI-TENANT: Busca por UUID é segura pois UUIDs são únicos globalmente.
        // storage.getFormById() retorna apenas UM resultado por UUID, impossibilitando
        // colisões entre tenants. Mas ainda precisamos verificar se é público.
        try {
          form = await storage.getFormById(formIdOrSlug);
          if (form) {
            // 🔐 SECURITY: Verify form is public before returning via storage
            const isFormPublic = await assertPublicFormAccess(formIdOrSlug);
            if (!isFormPublic) {
              console.log(`🔒 [PUBLIC] Formulário ${formIdOrSlug} encontrado via storage mas não é público`);
              return res.status(404).json({
                success: false,
                error: 'Form not found or not public'
              });
            }
          }
        } catch (e) {
          console.log('⚠️ [PUBLIC] Storage/local forms table not available, skipping storage lookup');
        }
      } else {
        // 🔐 SEGURANÇA: Buscar TODOS os resultados para detectar colisões de slug
        let formBySlug: any[] = [];
        try {
          formBySlug = await db
            .select()
            .from(forms)
            .where(eq(forms.slug, formIdOrSlug));
        } catch (e) {
          console.log('⚠️ [PUBLIC] Local forms table not available, skipping slug lookup');
        }
        
        // 🔐 SEGURANÇA: Se houver mais de um resultado, há colisão de slugs entre tenants
        if (formBySlug.length > 1) {
          console.warn(`[SECURITY] Multiple forms have slug "${formIdOrSlug}" - refusing to resolve to prevent cross-tenant exposure`);
          return res.status(404).json({
            success: false,
            error: 'Form not found'
          });
        }
        
        form = formBySlug.length > 0 ? formBySlug[0] : null;
        
        // 🔐 SECURITY: Verify form is public before returning via slug search
        if (form) {
          const isFormPublic = await assertPublicFormAccess(form.id);
          if (!isFormPublic) {
            console.log(`🔒 [PUBLIC] Formulário ${form.id} encontrado via slug mas não é público`);
            return res.status(404).json({
              success: false,
              error: 'Form not found or not public'
            });
          }
        }
      }
      
      if (!form) {
        console.log(`❌ [PUBLIC] Formulário não encontrado no PostgreSQL local`);
        return res.status(404).json({
          success: false,
          error: 'Form not found'
        });
      }
      console.log(`✅ [PUBLIC] Formulário encontrado:`, form.title);
      // Reconstruir welcomeConfig para dados do storage também
      const reconstructedForm = reconstructFormDataFromSupabase(form);
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.json(reconstructedForm);
    } catch (error: any) {
      console.error('Error fetching public form:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 🚀 OPTIMIZED: Get form + validate token in single request
  // Combines token validation and form lookup to reduce round trips
  app.get("/api/forms/public/with-token/:token", async (req, res) => {
    try {
      const { token } = req.params;
      console.log(`🔑 [GET /api/forms/public/with-token] Validando token e buscando form...`);
      
      if (!token) {
        return res.status(400).json({ 
          valid: false,
          erro: "Token é obrigatório" 
        });
      }

      const ip = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      // Step 1: Validate token using existing service
      const result = await leadTrackingService.validarTokenERegistrarAbertura(
        token,
        ip,
        userAgent
      );

      if (!result.valido) {
        console.log(`⚠️ [WITH-TOKEN] Token inválido ou expirado:`, result.erro);
        return res.status(200).json({ 
          valid: false, 
          erro: result.erro 
        });
      }

      console.log(`✅ [WITH-TOKEN] Token válido - Lead telefone:`, result.lead?.telefone);
      
      // Step 2: Get formularioId from the session/lead data
      const formularioId = result.sessao?.formularioId || result.lead?.formularioId;
      
      if (!formularioId) {
        console.log(`❌ [WITH-TOKEN] FormularioId não encontrado na sessão ou lead`);
        return res.status(200).json({ 
          valid: false, 
          erro: "FormularioId não encontrado para este token" 
        });
      }

      console.log(`📋 [WITH-TOKEN] Buscando formulário:`, formularioId);
      
      // Step 3: Fetch the form using existing logic
      let formData = null;
      
      // Try local PostgreSQL first
      let localFormResult: any[] = [];
      try {
        localFormResult = await db
          .select()
          .from(forms)
          .where(eq(forms.id, formularioId))
          .limit(1);
      } catch (e) {
        console.log('⚠️ [WITH-TOKEN] Local forms table not available, skipping local lookup');
      }
      
      if (localFormResult.length > 0) {
        console.log(`✅ [WITH-TOKEN] Formulário encontrado no banco local`);
        formData = reconstructFormDataFromSupabase(localFormResult[0]);
      } else {
        // Try storage fallback
        try {
          const storageForm = await storage.getFormById(formularioId);
          if (storageForm) {
            console.log(`✅ [WITH-TOKEN] Formulário encontrado via storage`);
            formData = reconstructFormDataFromSupabase(storageForm);
          }
        } catch (e) {
          console.log('⚠️ [WITH-TOKEN] Storage/local forms table not available, skipping');
        }
      }
      
      // If still not found, try Supabase via tenant resolution
      if (!formData) {
        const tenantId = await resolvePublicFormTenant(formularioId, true);
        if (tenantId) {
          const supabase = await getSupabaseClient(tenantId);
          if (supabase) {
            const { data, error } = await supabase
              .from('forms')
              .select('*')
              .eq('id', formularioId)
              .single();
            
            if (!error && data) {
              console.log(`✅ [WITH-TOKEN] Formulário encontrado no Supabase`);
              const camelForm = convertKeysToCamelCase(data);
              const parsedForm = parseJsonbFields(camelForm, ['questions', 'designConfig', 'scoreTiers', 'tags']);
              formData = reconstructFormDataFromSupabase(parsedForm);
            }
          }
        }
      }

      if (!formData) {
        console.log(`❌ [WITH-TOKEN] Formulário ${formularioId} não encontrado em nenhum lugar`);
        return res.status(200).json({ 
          valid: false, 
          erro: "Formulário não encontrado" 
        });
      }

      console.log(`✅ [WITH-TOKEN] Retornando dados combinados - Form:`, formData.title);
      
      // Return combined response with lead data + form
      res.status(200).json({ 
        valid: true, 
        data: {
          lead: result.lead,
          sessao: result.sessao,
          primeiraAbertura: result.primeiraAbertura,
          dadosPreenchidos: result.dadosPreenchidos,
          form: formData
        }
      });
    } catch (error: any) {
      console.error("❌ [GET /api/forms/public/with-token] Erro:", error);
      res.status(500).json({ 
        valid: false,
        erro: error.message 
      });
    }
  });

  // Get form by SLUG (PUBLIC - no auth required)
  // 🔗 SLUG: Endpoint para buscar formulário por slug amigável
  // URL: GET /api/forms/public/by-slug/:companySlug/:formSlug
  app.get("/api/forms/public/by-slug/:companySlug/:formSlug", async (req, res) => {
    try {
      const { companySlug, formSlug } = req.params;
      console.log(`🔗 [SLUG] Buscando formulário: companySlug="${companySlug}", formSlug="${formSlug}"`);
      
      // 🚀 ULTRA-FAST: Try ultra-fast lookup first (with timeouts and fallbacks)
      const ultraFastResult = await getPublicFormUltraFast(companySlug, formSlug);
      if (ultraFastResult) {
        console.log(`✅ [SLUG] Formulário encontrado via ultra-fast (${ultraFastResult.source})`);
        res.set('Cache-Control', 'max-age=300, s-maxage=600, stale-while-revalidate=300, public');
        console.log(`📦 CF Cache-Control: max-age=300, s-maxage=600, stale-while-revalidate=300, public`);
        return res.json(ultraFastResult.formData);
      }
      
      // 🔗 FALLBACK: Standard lookup if ultra-fast fails
      console.log(`⚠️ [SLUG] Ultra-fast lookup failed, trying standard lookup...`);
      
      // 🔗 SLUG: Buscar no formTenantMapping primeiro (fonte única de verdade)
      const mappingResult = await db
        .select({
          formId: formTenantMapping.formId,
          tenantId: formTenantMapping.tenantId,
          isPublic: formTenantMapping.isPublic,
          slug: formTenantMapping.slug,
          companySlug: formTenantMapping.companySlug
        })
        .from(formTenantMapping)
        .where(
          and(
            eq(formTenantMapping.slug, formSlug),
            eq(formTenantMapping.companySlug, companySlug)
          )
        )
        .limit(1);
      
      if (mappingResult.length === 0) {
        // 🔐 CORREÇÃO DEFINITIVA: Buscar no mapping APENAS pelo slug (ignorando companySlug da URL)
        // Isso resolve o problema de mapeamento criado com companySlug errado
        console.log(`🔍 [SLUG FALLBACK 1] Mapping não encontrado com companySlug="${companySlug}", tentando buscar apenas pelo slug="${formSlug}"...`);
        
        // 🔐 SEGURANÇA: Buscar TODOS os resultados para detectar colisões
        const mappingBySlugOnly = await db
          .select({
            formId: formTenantMapping.formId,
            tenantId: formTenantMapping.tenantId,
            isPublic: formTenantMapping.isPublic,
            slug: formTenantMapping.slug,
            companySlug: formTenantMapping.companySlug
          })
          .from(formTenantMapping)
          .where(eq(formTenantMapping.slug, formSlug));
        
        // 🔐 SEGURANÇA: Se houver mais de um resultado, há colisão de slugs entre tenants
        if (mappingBySlugOnly.length > 1) {
          console.warn(`[SECURITY] Multiple tenants have slug "${formSlug}" - refusing to resolve to prevent cross-tenant exposure`);
          return res.status(404).json({
            success: false,
            error: 'Formulário não encontrado'
          });
        }
        
        if (mappingBySlugOnly.length > 0) {
          const foundMapping = mappingBySlugOnly[0];
          console.log(`✅ [SLUG FALLBACK 1] Encontrado! formId="${foundMapping.formId}", companySlug armazenado="${foundMapping.companySlug}"`);
          
          // Verificar se é público
          if (!foundMapping.isPublic) {
            console.log(`🔒 [SLUG FALLBACK 1] Formulário encontrado mas não é público`);
            return res.status(404).json({
              success: false,
              error: 'Formulário não encontrado'
            });
          }
          
          // Buscar formulário no PostgreSQL local
          let localFormById: any[] = [];
          try {
            localFormById = await db
              .select()
              .from(forms)
              .where(eq(forms.id, foundMapping.formId))
              .limit(1);
          } catch (localDbError) {
            console.log('⚠️ [SLUG] Local forms table not available, skipping local lookup');
          }
          
          if (localFormById.length > 0) {
            console.log(`✅ [SLUG FALLBACK 1] Formulário encontrado no banco local:`, localFormById[0].title);
            // Reconstruir welcomeConfig para dados locais também
            const reconstructedForm = reconstructFormDataFromSupabase(localFormById[0]);
            return res.json(reconstructedForm);
          }
          
          try {
            const storageForm = await storage.getFormById(foundMapping.formId);
            if (storageForm) {
              const isFormPublic = await assertPublicFormAccess(foundMapping.formId);
              if (!isFormPublic) {
                console.log(`🔒 [SLUG FALLBACK 1] Formulário ${foundMapping.formId} encontrado via storage mas não é público`);
                return res.status(404).json({
                  success: false,
                  error: 'Formulário não encontrado'
                });
              }
              console.log(`✅ [SLUG FALLBACK 1] Formulário encontrado via storage:`, storageForm.title);
              const reconstructedForm = reconstructFormDataFromSupabase(storageForm);
              return res.json(reconstructedForm);
            }
          } catch (storageError) {
            console.log('⚠️ [SLUG FALLBACK 1] Storage lookup failed (forms table not available), trying Supabase');
          }
          
          // 🔗 FALLBACK 1.5: Buscar no Supabase se não encontrou localmente
          const supabaseFallback = await getSupabaseClient(foundMapping.tenantId);
          if (supabaseFallback) {
            console.log('🌐 [SLUG FALLBACK 1] Não encontrado localmente, buscando no Supabase...');
            const { data: sbData, error: sbError } = await supabaseFallback
              .from('forms')
              .select('*')
              .eq('id', foundMapping.formId)
              .single();
            
            if (!sbError && sbData) {
              console.log(`✅ [SLUG FALLBACK 1] Formulário encontrado no Supabase:`, sbData.title);
              const camelForm = convertKeysToCamelCase(sbData);
              const parsedForm = parseJsonbFields(camelForm, ['questions', 'designConfig', 'scoreTiers', 'tags']);
              const reconstructedForm = reconstructFormDataFromSupabase(parsedForm);
              
              setCachedForm(`${foundMapping.companySlug}:${formSlug}`, reconstructedForm);
              
              res.set('Cache-Control', 'max-age=300, s-maxage=600, stale-while-revalidate=300, public');
              console.log(`📦 CF Cache-Control: max-age=300, s-maxage=600, stale-while-revalidate=300, public`);
              return res.json(reconstructedForm);
            }
          }
        }
        
        // 🔄 FALLBACK 2: Buscar diretamente na tabela forms pelo slug
        console.log(`🔍 [SLUG FALLBACK 2] Mapping não encontrado, buscando diretamente na tabela forms...`);
        
        // 🔐 SEGURANÇA: Buscar TODOS os resultados para detectar colisões
        let localFormBySlug: any[] = [];
        try {
          localFormBySlug = await db
            .select()
            .from(forms)
            .where(eq(forms.slug, formSlug));
        } catch (localDbError) {
          console.log('⚠️ [SLUG] Local forms table not available, skipping local lookup');
        }
        
        // 🔐 SEGURANÇA: Se houver mais de um resultado, há colisão de slugs entre tenants
        if (localFormBySlug.length > 1) {
          console.warn(`[SECURITY] Multiple forms have slug "${formSlug}" - refusing to resolve to prevent cross-tenant exposure`);
          return res.status(404).json({
            success: false,
            error: 'Formulário não encontrado'
          });
        }
        
        if (localFormBySlug.length > 0) {
          const localForm = localFormBySlug[0];
          
          // Verificar se é público
          if (localForm.isPublic === false) {
            console.log(`🔒 [SLUG FALLBACK 2] Formulário encontrado mas não é público`);
            return res.status(404).json({
              success: false,
              error: 'Formulário não encontrado'
            });
          }
          
          console.log(`✅ [SLUG FALLBACK 2] Formulário encontrado:`, localForm.title);
          // Reconstruir welcomeConfig para dados locais também
          const reconstructedForm = reconstructFormDataFromSupabase(localForm);
          return res.json(reconstructedForm);
        }
        
        // 🔄 FALLBACK 3: Se o formSlug parece um UUID, buscar diretamente por ID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(formSlug)) {
          console.log(`🔍 [SLUG FALLBACK 3] formSlug parece UUID, buscando por ID="${formSlug}"...`);
          
          let formById: any[] = [];
          try {
            formById = await db
              .select()
              .from(forms)
              .where(eq(forms.id, formSlug))
              .limit(1);
          } catch (localDbError) {
            console.log('⚠️ [SLUG] Local forms table not available, skipping local lookup');
          }
          
          if (formById.length > 0) {
            const form = formById[0];
            
            if (form.isPublic === false) {
              console.log(`🔒 [SLUG FALLBACK 3] Formulário encontrado por ID mas não é público`);
              return res.status(404).json({
                success: false,
                error: 'Formulário não encontrado'
              });
            }
            
            console.log(`✅ [SLUG FALLBACK 3] Formulário encontrado por ID:`, form.title);
            // Reconstruir welcomeConfig para dados locais também
            const reconstructedForm = reconstructFormDataFromSupabase(form);
            return res.json(reconstructedForm);
          }
        }
        
        // ❌ REMOVED FALLBACK 4: Do NOT return random public forms
        // This was causing the form editor vs public form inconsistency issue
        // If the form isn't found by slug, it should return 404 - never a different form
        
        console.log(`❌ [SLUG] Formulário não encontrado com slug: companySlug="${companySlug}", formSlug="${formSlug}"`);
        return res.status(404).json({
          success: false,
          error: 'Formulário não encontrado'
        });
      }
      
      const mapping = mappingResult[0];
      
      // 🔐 Verificar se o formulário é público
      if (!mapping.isPublic) {
        console.log(`🔒 [SLUG] Formulário encontrado mas não é público: ${mapping.formId}`);
        return res.status(404).json({
          success: false,
          error: 'Formulário não encontrado'
        });
      }
      
      console.log(`✅ [SLUG] Mapeamento encontrado: formId="${mapping.formId}", tenantId="${mapping.tenantId}"`);
      
      // 🔗 PRIORIDADE 1: Buscar no PostgreSQL LOCAL primeiro (funciona sem Supabase)
      console.log('🌐 [SLUG] Buscando dados do PostgreSQL local PRIMEIRO...');
      
      let localFormResult: any[] = [];
      try {
        localFormResult = await db
          .select()
          .from(forms)
          .where(eq(forms.id, mapping.formId))
          .limit(1);
      } catch (localDbError) {
        console.log('⚠️ [SLUG] Local forms table not available, skipping local lookup');
      }
      
      if (localFormResult.length > 0) {
        const localForm = localFormResult[0];
        console.log(`✅ [SLUG] Formulário encontrado no PostgreSQL local:`, localForm.title);
        // Reconstruir welcomeConfig para dados locais também
        const reconstructedForm = reconstructFormDataFromSupabase(localForm);
        return res.json(reconstructedForm);
      }
      
      // 🔗 PRIORIDADE 2: Tentar storage como fallback
      try {
        const storageForm = await storage.getFormById(mapping.formId);
        if (storageForm) {
          const isFormPublic = await assertPublicFormAccess(mapping.formId);
          if (!isFormPublic) {
            console.log(`🔒 [SLUG] Formulário ${mapping.formId} encontrado via storage mas não é público`);
            return res.status(404).json({
              success: false,
              error: 'Formulário não encontrado'
            });
          }
          console.log(`✅ [SLUG] Formulário encontrado via storage:`, storageForm.title);
          const reconstructedForm = reconstructFormDataFromSupabase(storageForm);
          return res.json(reconstructedForm);
        }
      } catch (storageError) {
        console.log('⚠️ [SLUG] Storage lookup failed (forms table not available), skipping to Supabase');
      }
      
      // 🔗 PRIORIDADE 3: Buscar no Supabase se não encontrou localmente
      const supabase = await getSupabaseClient(mapping.tenantId);
      
      if (supabase) {
        console.log('🌐 [SLUG] Não encontrado localmente, buscando no Supabase...');
        
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .eq('id', mapping.formId)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            console.log(`❌ [SLUG] Formulário não encontrado no Supabase: ${mapping.formId}`);
            return res.status(404).json({
              success: false,
              error: 'Formulário não encontrado'
            });
          }
          console.error('❌ [SLUG] Erro ao buscar form no Supabase:', error);
          throw error;
        }
        
        console.log(`✅ [SLUG] Formulário encontrado no Supabase:`, data.title);
        const camelForm = convertKeysToCamelCase(data);
        const parsedForm = parseJsonbFields(camelForm, ['questions', 'designConfig', 'scoreTiers', 'tags']);
        const reconstructedForm = reconstructFormDataFromSupabase(parsedForm);
        
        // 🚀 CACHE: Populate cache for ultra-fast subsequent requests
        setCachedForm(`${companySlug}:${formSlug}`, reconstructedForm);
        
        res.set('Cache-Control', 'max-age=300, s-maxage=600, stale-while-revalidate=300, public');
        console.log(`📦 CF Cache-Control: max-age=300, s-maxage=600, stale-while-revalidate=300, public`);
        return res.json(reconstructedForm);
      }
      
      // Não encontrado em lugar nenhum
      console.log(`❌ [SLUG] Formulário não encontrado em nenhum lugar: ${mapping.formId}`);
      return res.status(404).json({
        success: false,
        error: 'Formulário não encontrado'
      });
    } catch (error: any) {
      console.error('[SLUG] Erro ao buscar formulário por slug:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 🔗 NEW ENDPOINT: Get form by SLUG ONLY (PUBLIC - no auth required)
  // URL: GET /api/forms/public/by-form-slug/:formSlug
  // Este endpoint busca APENAS pelo formSlug, ignorando companySlug completamente
  // Usado como fallback final quando o mapeamento por companySlug falha
  app.get("/api/forms/public/by-form-slug/:formSlug", async (req, res) => {
    try {
      const { formSlug } = req.params;
      console.log(`🔗 [FORM-SLUG] Buscando formulário apenas por slug="${formSlug}"`);
      
      // 🔐 ESTRATÉGIA 1: Buscar TODOS os resultados no formTenantMapping pelo slug para detectar colisões
      const mappingResult = await db
        .select({
          formId: formTenantMapping.formId,
          tenantId: formTenantMapping.tenantId,
          isPublic: formTenantMapping.isPublic,
          slug: formTenantMapping.slug,
          companySlug: formTenantMapping.companySlug
        })
        .from(formTenantMapping)
        .where(eq(formTenantMapping.slug, formSlug));
      
      // 🔐 SEGURANÇA: Se houver mais de um resultado, há colisão de slugs entre tenants
      if (mappingResult.length > 1) {
        console.warn(`[SECURITY] Multiple tenants have slug "${formSlug}" - refusing to resolve to prevent cross-tenant exposure`);
        return res.status(404).json({
          success: false,
          error: 'Formulário não encontrado'
        });
      }
      
      if (mappingResult.length > 0) {
        const mapping = mappingResult[0];
        console.log(`✅ [FORM-SLUG] Encontrado no mapping: formId="${mapping.formId}", companySlug="${mapping.companySlug}"`);
        
        if (!mapping.isPublic) {
          console.log(`🔒 [FORM-SLUG] Formulário não é público`);
          return res.status(404).json({
            success: false,
            error: 'Formulário não encontrado'
          });
        }
        
        // Buscar no PostgreSQL local
        let localFormResult: any[] = [];
        try {
          localFormResult = await db
            .select()
            .from(forms)
            .where(eq(forms.id, mapping.formId))
            .limit(1);
        } catch (e) {
          console.log('⚠️ [FORM-SLUG] Local forms table not available, skipping local lookup');
        }
        
        if (localFormResult.length > 0) {
          console.log(`✅ [FORM-SLUG] Formulário encontrado no banco local:`, localFormResult[0].title);
          // CORREÇÃO: Reconstruir welcomeConfig para dados locais
          const reconstructedForm = reconstructFormDataFromSupabase(localFormResult[0]);
          return res.json(reconstructedForm);
        }
        
        // Tentar via storage
        try {
          const storageForm = await storage.getFormById(mapping.formId);
          if (storageForm) {
            // 🔐 SECURITY: Double-check form is public via assertPublicFormAccess
            const isFormPublic = await assertPublicFormAccess(mapping.formId);
            if (!isFormPublic) {
              console.log(`🔒 [FORM-SLUG] Formulário ${mapping.formId} encontrado via storage mas não é público`);
              return res.status(404).json({
                success: false,
                error: 'Formulário não encontrado'
              });
            }
            console.log(`✅ [FORM-SLUG] Formulário encontrado via storage:`, storageForm.title);
            // CORREÇÃO: Reconstruir welcomeConfig para dados do storage
            const reconstructedForm = reconstructFormDataFromSupabase(storageForm);
            return res.json(reconstructedForm);
          }
        } catch (e) {
          console.log('⚠️ [FORM-SLUG] Storage/local forms table not available, skipping storage lookup');
        }
      }
      
      // 🔐 ESTRATÉGIA 2: Buscar TODOS os resultados na tabela forms pelo slug para detectar colisões
      console.log(`🔍 [FORM-SLUG] Buscando diretamente na tabela forms...`);
      let localFormBySlug: any[] = [];
      try {
        localFormBySlug = await db
          .select()
          .from(forms)
          .where(eq(forms.slug, formSlug));
      } catch (e) {
        console.log('⚠️ [FORM-SLUG] Local forms table not available, skipping slug lookup');
      }
      
      // 🔐 SEGURANÇA: Se houver mais de um resultado, há colisão de slugs entre tenants
      if (localFormBySlug.length > 1) {
        console.warn(`[SECURITY] Multiple forms have slug "${formSlug}" - refusing to resolve to prevent cross-tenant exposure`);
        return res.status(404).json({
          success: false,
          error: 'Formulário não encontrado'
        });
      }
      
      if (localFormBySlug.length > 0) {
        const form = localFormBySlug[0];
        
        if (form.isPublic === false) {
          console.log(`🔒 [FORM-SLUG] Formulário encontrado mas não é público`);
          return res.status(404).json({
            success: false,
            error: 'Formulário não encontrado'
          });
        }
        
        console.log(`✅ [FORM-SLUG] Formulário encontrado diretamente:`, form.title);
        // CORREÇÃO: Reconstruir welcomeConfig para dados locais
        const reconstructedForm = reconstructFormDataFromSupabase(form);
        return res.json(reconstructedForm);
      }
      
      // ESTRATÉGIA 3: Se o slug parece um UUID, buscar por ID
      // 🔐 SEGURANÇA MULTI-TENANT APRIMORADA: Mesmo UUIDs sendo únicos, precisamos verificar
      // se o formulário está registrado no formTenantMapping com isPublic=true.
      // Isso garante que apenas formulários explicitamente marcados como públicos sejam acessíveis.
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(formSlug)) {
        console.log(`🔍 [FORM-SLUG] Slug parece UUID, buscando por ID...`);
        
        // 🔐 SEGURANÇA: Primeiro verificar se o UUID está no formTenantMapping com isPublic=true
        const mappingCheck = await db
          .select({ formId: formTenantMapping.formId, isPublic: formTenantMapping.isPublic })
          .from(formTenantMapping)
          .where(eq(formTenantMapping.formId, formSlug))
          .limit(1);
        
        // 🔐 SEGURANÇA: Se o UUID não está no mapping OU não é público, verificar na tabela forms
        // mas APENAS retornar se isPublic=true na tabela forms também
        const formById = await db
          .select()
          .from(forms)
          .where(eq(forms.id, formSlug))
          .limit(1);
        
        if (formById.length > 0) {
          const form = formById[0];
          
          // 🔐 SEGURANÇA: Verificar isPublic tanto no mapping quanto no form
          const isPublicInMapping = mappingCheck.length > 0 && mappingCheck[0].isPublic === true;
          const isPublicInForm = form.isPublic !== false; // Se undefined ou true, considera público
          
          // 🔐 REGRA DE SEGURANÇA: Formulário só é acessível se:
          // 1. Está no mapping com isPublic=true, OU
          // 2. Não está no mapping MAS tem isPublic=true na tabela forms
          if (mappingCheck.length > 0 && !isPublicInMapping) {
            console.log(`🔒 [FORM-SLUG] Formulário ${formSlug} está no mapping mas não é público`);
            return res.status(404).json({
              success: false,
              error: 'Formulário não encontrado'
            });
          }
          
          if (mappingCheck.length === 0 && !isPublicInForm) {
            console.log(`🔒 [FORM-SLUG] Formulário ${formSlug} não está no mapping e não é público na tabela forms`);
            return res.status(404).json({
              success: false,
              error: 'Formulário não encontrado'
            });
          }
          
          console.log(`✅ [FORM-SLUG] Formulário encontrado por ID:`, form.title);
          console.log(`🔐 [SECURITY] Form ${formSlug} verified: inMapping=${mappingCheck.length > 0}, isPublicMapping=${isPublicInMapping}, isPublicForm=${isPublicInForm}`);
          // CORREÇÃO: Reconstruir welcomeConfig para dados locais
          const reconstructedForm = reconstructFormDataFromSupabase(form);
          return res.json(reconstructedForm);
        }
      }
      
      console.log(`❌ [FORM-SLUG] Formulário não encontrado: slug="${formSlug}"`);
      return res.status(404).json({
        success: false,
        error: 'Formulário não encontrado'
      });
    } catch (error: any) {
      console.error('[FORM-SLUG] Erro ao buscar formulário por slug:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 📝 PUBLIC FORM SUBMISSION ENDPOINT - No auth required
  // POST /api/forms/:formId/submit - Submit form responses
  app.post("/api/forms/:formId/submit", async (req, res) => {
    try {
      const { formId } = req.params;
      const { 
        answers, 
        contactName, 
        contactEmail, 
        contactPhone,
        contactCpf,
        contactInstagram,
        addressData,
        companySlug
      } = req.body;
      
      console.log(`📝 [POST /forms/${formId}/submit] Recebendo submission pública...`);
      console.log(`   - Nome: ${contactName}`);
      console.log(`   - Email: ${contactEmail}`);
      console.log(`   - Telefone: ${contactPhone}`);
      console.log(`   - CPF: ${contactCpf}`);
      console.log(`   - Perguntas respondidas: ${Object.keys(answers || {}).length}`);
      
      if (!answers || Object.keys(answers).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Respostas são obrigatórias'
        });
      }
      
      // Get tenant info from formTenantMapping
      const mappingResult = await db
        .select()
        .from(formTenantMapping)
        .where(eq(formTenantMapping.formId, formId))
        .limit(1);
      
      const tenantId = mappingResult.length > 0 ? mappingResult[0].tenantId : null;
      
      // Try to save to Supabase first (primary storage for multi-tenant)
      let supabaseSuccess = false;
      let submissionId: string | null = null;
      
      if (tenantId) {
        try {
          const supabase = await getSupabaseClient(tenantId);
          
          if (supabase) {
            // Build insert payload with correct column names
            const insertPayload: any = {
              form_id: formId,
              contact_name: contactName || null,
              contact_email: contactEmail || null,
              contact_phone: contactPhone || null,
              contact_cpf: contactCpf || null,
              instagram_handle: contactInstagram || null,
              answers: answers,
              total_score: 0,
              passed: true,
              tenant_id: tenantId
            };
            
            // Add address fields if provided
            if (addressData) {
              insertPayload.address_cep = addressData.cep || null;
              insertPayload.address_street = addressData.street || addressData.logradouro || null;
              insertPayload.address_number = addressData.number || addressData.numero || null;
              insertPayload.address_complement = addressData.complement || addressData.complemento || null;
              insertPayload.address_neighborhood = addressData.neighborhood || addressData.bairro || null;
              insertPayload.address_city = addressData.city || addressData.cidade || null;
              insertPayload.address_state = addressData.state || addressData.estado || null;
            }
            
            console.log('📦 [Supabase] Payload para inserção:', JSON.stringify(insertPayload, null, 2));
            
            const { data: insertedData, error: supabaseError } = await supabase
              .from('form_submissions')
              .insert(insertPayload)
              .select('id')
              .single();
            
            if (supabaseError) {
              console.error('⚠️ [Supabase] Erro ao salvar submission:', supabaseError.message);
              
              // Fallback: try with minimal essential fields only
              if (supabaseError.message?.includes('column')) {
                console.warn('⚠️ Tentando salvar com campos mínimos...');
                const minimalPayload = {
                  form_id: formId,
                  answers: answers,
                  total_score: 0,
                  passed: true,
                  tenant_id: tenantId,
                  contact_name: contactName || null,
                  contact_email: contactEmail || null,
                  contact_phone: contactPhone || null
                };
                
                const { data: retryData, error: retryError } = await supabase
                  .from('form_submissions')
                  .insert(minimalPayload)
                  .select('id')
                  .single();
                  
                if (!retryError && retryData) {
                  supabaseSuccess = true;
                  submissionId = retryData.id;
                  console.log(`✅ [Supabase] Submission salva (modo mínimo): ${submissionId}`);
                }
              }
            } else {
              supabaseSuccess = true;
              submissionId = insertedData?.id;
              console.log(`✅ [Supabase] Submission salva com sucesso: ${submissionId}`);
            }
          }
        } catch (supabaseErr: any) {
          console.error('⚠️ [Supabase] Erro ao conectar:', supabaseErr.message);
        }
      }
      
      // Also save to local PostgreSQL as backup
      try {
        const localResult = await db
          .insert(formSubmissions)
          .values({
            formId,
            // Keep legacy nested data in answers for backward compatibility
            answers: {
              ...answers,
              _contactData: {
                name: contactName,
                email: contactEmail,
                phone: contactPhone,
                cpf: contactCpf,
                instagram: contactInstagram,
              },
              _addressData: addressData
            },
            totalScore: 0,
            passed: true,
            // Also store in dedicated columns for new features
            contactName: contactName || null,
            contactEmail: contactEmail || null,
            contactPhone: contactPhone || null,
            contactCpf: contactCpf || null,
            instagramHandle: contactInstagram || null,
            tenantId: tenantId || null,
            // Address fields
            addressCep: addressData?.cep || null,
            addressStreet: addressData?.street || addressData?.logradouro || null,
            addressNumber: addressData?.number || addressData?.numero || null,
            addressComplement: addressData?.complement || addressData?.complemento || null,
            addressNeighborhood: addressData?.neighborhood || addressData?.bairro || null,
            addressCity: addressData?.city || addressData?.cidade || null,
            addressState: addressData?.state || addressData?.estado || null
          })
          .returning();
        
        if (!submissionId && localResult.length > 0) {
          submissionId = localResult[0].id;
        }
        console.log(`✅ [PostgreSQL] Submission salva localmente: ${localResult[0].id}`);
      } catch (localErr: any) {
        console.error('⚠️ [PostgreSQL] Erro ao salvar localmente:', localErr.message);
        
        // If both failed, return error
        if (!supabaseSuccess) {
          return res.status(500).json({
            success: false,
            error: 'Erro ao salvar resposta. Tente novamente.'
          });
        }
      }
      
      res.status(201).json({
        success: true,
        message: 'Resposta enviada com sucesso!',
        submissionId
      });
    } catch (error: any) {
      console.error('[POST /forms/:formId/submit] Erro:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno ao processar resposta'
      });
    }
  });

  // Get form by ID
  app.get("/api/forms/:id", authenticateToken, async (req, res) => {
    try {
      const tenantId = (req as any).user!.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Sessão inválida - faça login novamente' });
      }
      const supabase = await getSupabaseClient(tenantId);
      
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
        const parsedData = parseJsonbFields(camelData, ['questions', 'designConfig', 'scoreTiers', 'tags']);
        const reconstructedData = reconstructFormDataFromSupabase(parsedData);
        
        return res.json(reconstructedData);
      }
      
      // 🔐 ISOLAMENTO MULTI-TENANT: Filtrar por tenantId para prevenir vazamento
      const formRecord = await db
        .select()
        .from(forms)
        .where(and(eq(forms.id, req.params.id), eq(forms.tenantId, tenantId)))
        .limit(1);
      
      if (formRecord.length === 0) {
        return res.status(404).json({ error: "Form not found" });
      }
      
      // CORREÇÃO: Reconstruir welcomeConfig para dados do PostgreSQL local também
      // Isso garante que o editor mostre os mesmos dados que o formulário público
      const reconstructedForm = reconstructFormDataFromSupabase(formRecord[0]);
      res.json(reconstructedForm);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create form
  app.post("/api/forms", authenticateToken, async (req, res) => {
    try {
      const tenantId = (req as any).user!.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Sessão inválida - faça login novamente' });
      }
      const supabase = await getSupabaseClient(tenantId);
      
      // 🔗 SLUG: Gerar slug único a partir do título
      const title = req.body.title || 'Formulário';
      const baseSlug = generateFormSlug(title);
      console.log(`🔗 [SLUG] Gerando slug para título "${title}" -> base: "${baseSlug}"`);
      
      // 🔗 SLUG: Buscar slugs existentes do tenant para garantir unicidade
      let existingSlugs: string[] = [];
      
      let companySlug = 'empresa';
      try {
        const { getCompanySlug } = await import('../lib/tenantSlug.js');
        companySlug = await getCompanySlug(tenantId);
      } catch (e) {
        console.log('⚠️ [SLUG] Erro ao buscar companySlug do hms100msConfig, usando default');
      }
      
      if (supabase) {
        console.log('📝 [POST /api/forms] Salvando no Supabase...');
        console.log('📦 [POST] Dados recebidos do frontend:', JSON.stringify(req.body, null, 2));
        
        // 🔗 SLUG: Buscar slugs existentes no Supabase
        const { data: existingForms } = await supabase
          .from('forms')
          .select('slug')
          .not('slug', 'is', null);
        
        if (existingForms) {
          existingSlugs = existingForms.map((f: any) => f.slug).filter(Boolean);
        }
        console.log(`🔗 [SLUG] ${existingSlugs.length} slug(s) existente(s) encontrado(s)`);
        
        // 🔗 SLUG: Gerar slug único
        const uniqueSlug = generateUniqueFormSlug(baseSlug, existingSlugs);
        console.log(`🔗 [SLUG] Slug único gerado: "${uniqueSlug}"`);
        
        // =====================================================
        // USAR mapFormDataToSupabase PARA GARANTIR QUE TODOS OS 
        // CAMPOS SEJAM MAPEADOS CORRETAMENTE:
        // - welcomeConfig.title → welcome_title
        // - welcomeConfig.description → welcome_message
        // - welcomeConfig extras (buttonText, logo, etc.) → design_config.welcomeScreen
        // - completionPageConfig → design_config.completionPage
        // - questions/elements → questions
        // - scoreTiers → score_tiers
        // =====================================================
        const snakeData = mapFormDataToSupabase(req.body);
        // Remove updated_at for insert (será criado automaticamente)
        snakeData.created_at = new Date().toISOString();
        // 🔗 SLUG: Incluir slug no form
        snakeData.slug = uniqueSlug;
        
        console.log('📦 [POST] Dados mapeados para Supabase:', JSON.stringify(snakeData, null, 2));
        console.log('📦 [POST] Campos a criar:', Object.keys(snakeData));
        
        const { data, error } = await supabase
          .from('forms')
          .insert(snakeData)
          .select()
          .single();
        
        if (error) {
          console.error('❌ [SUPABASE] Erro ao criar form:', error);
          throw error;
        }
        
        console.log('✅ [SUPABASE] Formulário criado com sucesso!');
        
        // 🔐 ISOLAMENTO MULTI-TENANT: Salvar metadata na tabela de mapeamento global
        // 🔗 SLUG: Incluir slug e companySlug no mapeamento
        try {
          await db.insert(formTenantMapping).values({
            formId: data.id,
            tenantId: tenantId,
            slug: uniqueSlug,
            companySlug: companySlug,
            isPublic: req.body.isPublic !== undefined ? req.body.isPublic : true
          });
          console.log(`✅ [MAPPING] Form ${data.id} registrado com slug "${uniqueSlug}" e companySlug "${companySlug}"`);
        } catch (error) {
          console.error('[MAPPING] Erro ao salvar metadata:', error);
        }
        
        const camelData = convertKeysToCamelCase(data);
        const parsedData = parseJsonbFields(camelData, ['questions', 'designConfig', 'scoreTiers', 'tags']);
        const reconstructedData = reconstructFormDataFromSupabase(parsedData);
        
        return res.status(201).json(reconstructedData);
      }
      
      console.log('📝 [POST /api/forms] Salvando no PostgreSQL local...');
      
      // 🔗 SLUG: Buscar slugs existentes no PostgreSQL local
      const localExistingForms = await db
        .select({ slug: forms.slug })
        .from(forms)
        .where(eq(forms.tenantId, tenantId));
      
      existingSlugs = localExistingForms.map(f => f.slug).filter(Boolean) as string[];
      console.log(`🔗 [SLUG] ${existingSlugs.length} slug(s) existente(s) encontrado(s) no PostgreSQL`);
      
      // 🔗 SLUG: Gerar slug único
      const uniqueSlug = generateUniqueFormSlug(baseSlug, existingSlugs);
      console.log(`🔗 [SLUG] Slug único gerado: "${uniqueSlug}"`);
      
      // 🔐 ISOLAMENTO MULTI-TENANT: Adicionar tenantId e slug ao form antes de salvar
      const formWithTenant = { ...req.body, tenantId, slug: uniqueSlug };
      const validatedData = insertFormSchema.parse(formWithTenant);
      const form = await storage.createForm(validatedData);
      
      // 🔐 ISOLAMENTO MULTI-TENANT: Salvar metadata na tabela de mapeamento global
      // 🔗 SLUG: Incluir slug e companySlug no mapeamento
      try {
        await db.insert(formTenantMapping).values({
          formId: form.id,
          tenantId: tenantId,
          slug: uniqueSlug,
          companySlug: companySlug,
          isPublic: req.body.isPublic !== undefined ? req.body.isPublic : true
        });
        console.log(`✅ [MAPPING] Form ${form.id} registrado com slug "${uniqueSlug}" e companySlug "${companySlug}"`);
      } catch (error) {
        console.error('[MAPPING] Erro ao salvar metadata:', error);
      }
      
      res.status(201).json(form);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update form
  app.patch("/api/forms/:id", authenticateToken, async (req, res) => {
    try {
      // Debug logging for form save issues
      console.log('📝 [PATCH /api/forms/:id] Recebendo requisição de atualização...');
      console.log('📊 [PATCH] Session data:', {
        sessionTenantId: req.session?.tenantId,
        sessionUserId: req.session?.userId,
        sessionEmail: req.session?.userEmail
      });
      console.log('📊 [PATCH] User object:', (req as any).user);
      
      const tenantId = (req as any).user?.tenantId;
      console.log('🔐 [PATCH] TenantId extraído:', tenantId);
      
      if (!tenantId) {
        console.error('❌ [PATCH] TenantId não encontrado - sessão inválida');
        return res.status(401).json({ error: 'Sessão inválida - faça login novamente' });
      }
      const supabase = await getSupabaseClient(tenantId);
      
      let companySlug = 'empresa';
      try {
        const { getCompanySlug } = await import('../lib/tenantSlug.js');
        companySlug = await getCompanySlug(tenantId);
      } catch (e) {
        console.log('⚠️ [PATCH] Erro ao buscar companySlug do hms100msConfig, usando default');
      }
      
      // 🔗 SLUG: Variável para armazenar novo slug se título mudar
      let newSlug: string | null = null;
      let currentSlug: string | null = null;
      
      // 🔗 SLUG: Verificar se o título está sendo atualizado
      if (req.body.title) {
        const newTitle = req.body.title;
        const baseSlug = generateFormSlug(newTitle);
        console.log(`🔗 [SLUG] Título atualizado para "${newTitle}" -> base: "${baseSlug}"`);
        
        // Buscar slugs existentes para garantir unicidade (excluindo o form atual)
        let existingSlugs: string[] = [];
        
        if (supabase) {
          const { data: existingForms } = await supabase
            .from('forms')
            .select('slug, id')
            .not('slug', 'is', null);
          
          if (existingForms) {
            existingSlugs = existingForms
              .filter((f: any) => f.id !== req.params.id)
              .map((f: any) => f.slug)
              .filter(Boolean);
          }
        } else {
          const localExistingForms = await db
            .select({ slug: forms.slug, id: forms.id })
            .from(forms)
            .where(eq(forms.tenantId, tenantId));
          
          existingSlugs = localExistingForms
            .filter(f => f.id !== req.params.id)
            .map(f => f.slug)
            .filter(Boolean) as string[];
        }
        
        console.log(`🔗 [SLUG] ${existingSlugs.length} slug(s) existente(s) encontrado(s) (excluindo form atual)`);
        
        // Gerar slug único
        newSlug = generateUniqueFormSlug(baseSlug, existingSlugs);
        console.log(`🔗 [SLUG] Novo slug gerado: "${newSlug}"`);
      }
      
      const currentMapping = await db
        .select({ slug: formTenantMapping.slug })
        .from(formTenantMapping)
        .where(eq(formTenantMapping.formId, req.params.id))
        .limit(1);
      if (currentMapping.length > 0) {
        currentSlug = currentMapping[0].slug;
      }
      
      if (supabase) {
        console.log('📝 [PATCH /api/forms/:id] Atualizando no Supabase...');
        console.log('📦 [PATCH] Dados recebidos do frontend:', JSON.stringify(req.body, null, 2));
        
        // =====================================================
        // USAR mapFormDataToSupabase PARA GARANTIR QUE TODOS OS 
        // CAMPOS SEJAM MAPEADOS CORRETAMENTE:
        // - welcomeConfig.title → welcome_title
        // - welcomeConfig.description → welcome_message
        // - welcomeConfig extras (buttonText, logo, etc.) → design_config.welcomeScreen
        // - completionPageConfig → design_config.completionPage
        // - questions/elements → questions
        // - scoreTiers → score_tiers
        // =====================================================
        const updateData = mapFormDataToSupabase(req.body);
        
        // 🔗 SLUG: Incluir novo slug se título foi alterado
        if (newSlug) {
          updateData.slug = newSlug;
        }
        
        console.log('📦 [PATCH] Dados mapeados para Supabase:', JSON.stringify(updateData, null, 2));
        console.log('📦 [PATCH] Campos a atualizar:', Object.keys(updateData));
        
        const { data, error } = await supabase
          .from('forms')
          .update(updateData)
          .eq('id', req.params.id)
          .select()
          .single();
        
        if (error) {
          console.error('❌ [SUPABASE] Erro detalhado ao atualizar form:', JSON.stringify(error, null, 2));
          throw error;
        }
        
        console.log('✅ [SUPABASE] Formulário atualizado com sucesso!');
        
        // 🔐 ISOLAMENTO MULTI-TENANT: UPSERT metadata na tabela de mapeamento global
        // 🔗 SLUG: Garantir que o mapeamento existe (fix para formulários sem mapeamento)
        const finalSlug = newSlug || data.slug || req.params.id;
        const isPublic = req.body.isPublic !== undefined ? req.body.isPublic : (data.is_public ?? true);
        
        try {
          await db.insert(formTenantMapping)
            .values({
              formId: req.params.id,
              tenantId: tenantId,
              slug: finalSlug,
              companySlug: companySlug,
              isPublic: isPublic,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .onConflictDoUpdate({
              target: formTenantMapping.formId,
              set: {
                slug: finalSlug,
                companySlug: companySlug,
                isPublic: isPublic,
                updatedAt: new Date()
              }
            });
          console.log(`✅ [MAPPING] Form ${req.params.id} upserted com slug "${finalSlug}" e companySlug "${companySlug}"`);
        } catch (error) {
          console.error('[MAPPING] Erro ao upsert metadata:', error);
        }
        
        const camelData = convertKeysToCamelCase(data);
        const parsedData = parseJsonbFields(camelData, ['questions', 'designConfig', 'scoreTiers', 'tags']);
        const reconstructedData = reconstructFormDataFromSupabase(parsedData);
        
        invalidateFormCache(`${companySlug}:${finalSlug}`);
        invalidateFormCache(req.params.id);
        if (currentSlug && currentSlug !== finalSlug) {
          invalidateFormCache(`${companySlug}:${currentSlug}`);
        }
        removePersistentFormMapping(companySlug, finalSlug);
        
        return res.json(reconstructedData);
      }
      
      // 🔗 SLUG: Incluir novo slug se título foi alterado (PostgreSQL local)
      const updateBody = newSlug ? { ...req.body, slug: newSlug } : req.body;
      const form = await storage.updateForm(req.params.id, updateBody);
      
      // 🔐 ISOLAMENTO MULTI-TENANT: UPSERT metadata na tabela de mapeamento global
      // 🔗 SLUG: Garantir que o mapeamento existe (fix para formulários sem mapeamento)
      const finalSlugLocal = newSlug || form.slug || req.params.id;
      const isPublicLocal = req.body.isPublic !== undefined ? req.body.isPublic : (form.isPublic ?? true);
      
      try {
        await db.insert(formTenantMapping)
          .values({
            formId: req.params.id,
            tenantId: tenantId,
            slug: finalSlugLocal,
            companySlug: companySlug,
            isPublic: isPublicLocal,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .onConflictDoUpdate({
            target: formTenantMapping.formId,
            set: {
              slug: finalSlugLocal,
              companySlug: companySlug,
              isPublic: isPublicLocal,
              updatedAt: new Date()
            }
          });
        console.log(`✅ [MAPPING] Form ${req.params.id} upserted com slug "${finalSlugLocal}" e companySlug "${companySlug}"`);
      } catch (error) {
        console.error('[MAPPING] Erro ao upsert metadata:', error);
      }
      
      invalidateFormCache(`${companySlug}:${finalSlugLocal}`);
      invalidateFormCache(req.params.id);
      if (currentSlug && currentSlug !== finalSlugLocal) {
        invalidateFormCache(`${companySlug}:${currentSlug}`);
      }
      removePersistentFormMapping(companySlug, finalSlugLocal);
      
      res.json(form);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete form
  app.delete("/api/forms/:id", authenticateToken, async (req, res) => {
    try {
      const tenantId = (req as any).user!.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Sessão inválida - faça login novamente' });
      }
      const supabase = await getSupabaseClient(tenantId);
      
      if (supabase) {
        console.log('🗑️ [DELETE /api/forms/:id] Deletando do Supabase...');
        
        const { error } = await supabase
          .from('forms')
          .delete()
          .eq('id', req.params.id);
        
        if (error) throw error;
        
        console.log('✅ [SUPABASE] Formulário deletado com sucesso!');
        
        // 🔐 ISOLAMENTO MULTI-TENANT: Remover metadata da tabela de mapeamento global
        try {
          await db
            .delete(formTenantMapping)
            .where(eq(formTenantMapping.formId, req.params.id));
          console.log(`✅ [MAPPING] Metadata do form ${req.params.id} removida da tabela de mapeamento`);
        } catch (error) {
          console.error('[MAPPING] Erro ao remover metadata:', error);
          // Não bloqueia resposta, mas loga erro
        }
        
        return res.status(204).send();
      }
      
      await storage.deleteForm(req.params.id);
      
      // 🔐 ISOLAMENTO MULTI-TENANT: Remover metadata da tabela de mapeamento global
      try {
        await db
          .delete(formTenantMapping)
          .where(eq(formTenantMapping.formId, req.params.id));
        console.log(`✅ [MAPPING] Metadata do form ${req.params.id} removida da tabela de mapeamento`);
      } catch (error) {
        console.error('[MAPPING] Erro ao remover metadata:', error);
        // Não bloqueia resposta, mas loga erro
      }
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all submissions
  app.get("/api/submissions", authenticateToken, async (req, res) => {
    try {
      const tenantId = (req as any).user!.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Sessão inválida - faça login novamente' });
      }
      
      // 🔐 REGRA: Verificar PRIMEIRO se tenant tem Supabase configurado
      // - Se configurado → usar APENAS Supabase (mesmo que vazio, retornar array vazio)
      // - Se NÃO configurado → usar PostgreSQL local
      const isSupabaseConfigured = await hasSupabaseConfigured(tenantId);
      
      if (isSupabaseConfigured) {
        const supabase = await getSupabaseClient(tenantId);
        
        if (!supabase) {
          console.error('❌ [GET /api/submissions] Supabase configurado mas erro ao criar cliente');
          return res.status(500).json({ error: 'Erro ao conectar com Supabase' });
        }
        
        console.log('🔍 [GET /api/submissions] Buscando do Supabase (APENAS Supabase)...');
        
        const { data, error } = await supabase
          .from('form_submissions')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log(`📊 [SUPABASE] ${data?.length || 0} submission(s) encontrada(s) (SEM fallback local)`);
        
        const formattedData = (data || []).map((submission: any) => {
          const camelSubmission = convertKeysToCamelCase(submission);
          return parseJsonbFields(camelSubmission, ['answers']);
        });
        
        return res.json(formattedData);
      }
      
      // 🔐 Supabase NÃO configurado → usar PostgreSQL local
      console.log('🔍 [GET /api/submissions] Supabase NÃO configurado - buscando do PostgreSQL local...');
      const submissions = await storage.getAllSubmissions();
      res.json(submissions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get form submissions
  app.get("/api/forms/:id/submissions", authenticateToken, async (req, res) => {
    try {
      const tenantId = (req as any).user!.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Sessão inválida - faça login novamente' });
      }
      
      // 🔐 REGRA: Verificar PRIMEIRO se tenant tem Supabase configurado
      // - Se configurado → usar APENAS Supabase (mesmo que vazio, retornar array vazio)
      // - Se NÃO configurado → usar PostgreSQL local
      const isSupabaseConfigured = await hasSupabaseConfigured(tenantId);
      
      if (isSupabaseConfigured) {
        const supabase = await getSupabaseClient(tenantId);
        
        if (!supabase) {
          console.error('❌ [GET /api/forms/:id/submissions] Supabase configurado mas erro ao criar cliente');
          return res.status(500).json({ error: 'Erro ao conectar com Supabase' });
        }
        
        console.log('🔍 [GET /api/forms/:id/submissions] Buscando do Supabase (APENAS Supabase)...');
        
        const { data, error } = await supabase
          .from('form_submissions')
          .select('*')
          .eq('form_id', req.params.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log(`📊 [SUPABASE] ${data?.length || 0} submission(s) encontrada(s) (SEM fallback local)`);
        
        const formattedData = (data || []).map((submission: any) => {
          const camelSubmission = convertKeysToCamelCase(submission);
          return parseJsonbFields(camelSubmission, ['answers']);
        });
        
        return res.json({
          success: true,
          submissions: formattedData,
          total: formattedData.length
        });
      }
      
      // 🔐 Supabase NÃO configurado → usar PostgreSQL local
      console.log('🔍 [GET /api/forms/:id/submissions] Supabase NÃO configurado - buscando do PostgreSQL local...');
      const submissions = await storage.getFormSubmissions(req.params.id);
      res.json({
        success: true,
        submissions: submissions,
        total: submissions.length
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create form submission
  app.post("/api/submissions", async (req, res) => {
    try {
      // 🔐 ISOLAMENTO MULTI-TENANT: Resolver tenant via formId no body
      const formId = req.body.formId;
      if (!formId) {
        return res.status(400).json({ error: 'formId is required' });
      }

      // 🔐 PREVIEW MODE: Allow authenticated form owners to submit to their own forms
      let tenantId = await resolvePublicFormTenant(formId);

      // If form is not public, check if authenticated user is the AUTHORITATIVE owner
      // using the formTenantMapping table as the single source of truth
      if (!tenantId) {
        const sessionTenantId = (req.session as any)?.tenantId || (req.session as any)?.userId;
        
        if (sessionTenantId) {
          // SECURITY: Use formTenantMapping as the authoritative source of form ownership
          // This prevents cross-tenant attacks where a tenant could create a form with the same ID
          const mappingResult = await db
            .select({ tenantId: formTenantMapping.tenantId })
            .from(formTenantMapping)
            .where(eq(formTenantMapping.formId, formId))
            .limit(1);
          
          if (mappingResult.length > 0 && mappingResult[0].tenantId === sessionTenantId) {
            // Form's authoritative owner matches the authenticated session
            console.log(`✅ [PREVIEW] Authenticated owner ${sessionTenantId} verified via formTenantMapping for form ${formId}`);
            tenantId = sessionTenantId;
          } else if (mappingResult.length > 0) {
            // Form exists but belongs to a different tenant - access denied
            console.log(`🚫 [SECURITY] Tenant ${sessionTenantId} attempted to access form ${formId} owned by ${mappingResult[0].tenantId}`);
          }
        }
      }

      if (!tenantId) {
        return res.status(404).json({
          success: false,
          error: 'Form not found or not public'
        });
      }

      const supabase = await getSupabaseClient(tenantId);
      
      
      if (supabase) {
        console.log('📝 [POST /api/submissions] Salvando no Supabase...');
        
        const snakeData = convertKeysToSnakeCase(req.body);
        // NOTA: NÃO usar stringifyJsonbFields - Supabase client já serializa objetos automaticamente
        // 🔐 MULTI-TENANT: Adicionar tenant_id à submission
        snakeData.tenant_id = tenantId;
        
        const { data, error } = await supabase
          .from('form_submissions')
          .insert(snakeData)
          .select()
          .single();
        
        if (error) {
          console.error('❌ [SUPABASE] Erro ao criar submission:', error);
          // 🔄 FALLBACK: Se falhar no Supabase (ex: trigger com coluna inexistente), salvar no PostgreSQL local
          console.log('🔄 [FALLBACK] Tentando salvar no PostgreSQL local...');
          
          try {
            const submissionWithTenant = { ...req.body, tenantId };
            const validatedData = insertFormSubmissionSchema.parse(submissionWithTenant);
            const localSubmission = await storage.createFormSubmission(validatedData);
            
            console.log('✅ [FALLBACK] Submission salva no PostgreSQL local:', localSubmission.id);
            
            // Sincronizar lead
            if (localSubmission.contactPhone) {
              try {
                const syncResult = await leadSyncService.syncSubmissionToLead({
                  id: localSubmission.id,
                  formId: localSubmission.formId,
                  contactPhone: localSubmission.contactPhone,
                  contactName: localSubmission.contactName,
                  contactEmail: localSubmission.contactEmail,
                  totalScore: localSubmission.totalScore,
                  passed: localSubmission.passed,
                  tenantId: tenantId,
                });
                if (syncResult.success) {
                  console.log('✅ [FALLBACK] Lead sincronizado:', syncResult.leadId);
                }
              } catch (syncError) {
                console.error('❌ [FALLBACK] Erro ao sincronizar lead:', syncError);
              }
            }
            
            return res.status(201).json(localSubmission);
          } catch (fallbackError: any) {
            console.error('❌ [FALLBACK] Erro ao salvar no PostgreSQL:', fallbackError);
            throw error; // Lançar erro original do Supabase
          }
        }
        
        console.log('✅ [SUPABASE] Submission criada com sucesso!');
        
        const camelData = convertKeysToCamelCase(data);
        const parsedData = parseJsonbFields(camelData, ['answers']);
        
        // 🔥 SINCRONIZAR LEAD AUTOMATICAMENTE QUANDO FORMULÁRIO É COMPLETADO
        if (parsedData.contactPhone) {
          try {
            console.log('📞 [SUPABASE] Sincronizando lead para submission:', parsedData.id);
            const syncResult = await leadSyncService.syncSubmissionToLead(
              {
                id: parsedData.id,
                formId: parsedData.formId,
                contactPhone: parsedData.contactPhone,
                contactName: parsedData.contactName,
                contactEmail: parsedData.contactEmail,
                totalScore: parsedData.totalScore,
                passed: parsedData.passed,
                tenantId: tenantId, // 🔐 MULTI-TENANT: Passar tenant_id para LeadSync
              },
              { supabaseClient: supabase }
            );
            if (syncResult.success) {
              console.log('✅ [SUPABASE] Lead sincronizado com sucesso:', syncResult.leadId);
            } else {
              console.warn('⚠️ [SUPABASE] Aviso na sincronização:', syncResult.message);
            }
          } catch (error) {
            console.error('❌ [SUPABASE] Erro ao sincronizar lead:', error);
            // Não bloqueia a resposta se falhar
          }
        }
        
        return res.status(201).json(parsedData);
      }
      
      // 🔐 MULTI-TENANT: Adicionar tenantId ao body antes de validar
      const submissionWithTenant = { ...req.body, tenantId };
      const validatedData = insertFormSubmissionSchema.parse(submissionWithTenant);
      const submission = await storage.createFormSubmission(validatedData);
      
      // 🔥 SINCRONIZAR LEAD AUTOMATICAMENTE QUANDO FORMULÁRIO É COMPLETADO (PostgreSQL local)
      if (submission.contactPhone) {
        try {
          console.log('📞 [PostgreSQL] Sincronizando lead para submission:', submission.id);
          const syncResult = await leadSyncService.syncSubmissionToLead({
            id: submission.id,
            formId: submission.formId,
            contactPhone: submission.contactPhone,
            contactName: submission.contactName,
            contactEmail: submission.contactEmail,
            totalScore: submission.totalScore,
            passed: submission.passed,
            tenantId: tenantId, // 🔐 MULTI-TENANT: Passar tenant_id para LeadSync
          });
          if (syncResult.success) {
            console.log('✅ [PostgreSQL] Lead sincronizado com sucesso:', syncResult.leadId);
          } else {
            console.warn('⚠️ [PostgreSQL] Aviso na sincronização:', syncResult.message);
          }
        } catch (error) {
          console.error('❌ [PostgreSQL] Erro ao sincronizar lead:', error);
          // Não bloqueia a resposta se falhar
        }
      }
      
      res.status(201).json(submission);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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

  // Get app settings (Supabase credentials + company info)
  app.get("/api/settings", authenticateToken, async (req, res) => {
    try {
      // 🔐 ISOLAMENTO MULTI-TENANT: Buscar credenciais específicas deste tenant
      const tenantId = (req as any).user!.tenantId;
      
      // ⚠️ SEGURANÇA: Exigir sessão válida para credenciais tenant-specific
      if (!tenantId) {
        return res.status(401).json({ error: 'Sessão inválida - faça login novamente' });
      }
      
      let supabaseUrl = null;
      let supabaseAnonKey = null;
      let dbError = null;
      
      // PRIORIDADE 1: Tentar buscar credenciais específicas do tenant (supabase_config)
      try {
        const tenantConfig = await db
          .select()
          .from(supabaseConfig)
          .where(eq(supabaseConfig.tenantId, tenantId))
          .limit(1);
        
        if (tenantConfig[0]) {
          const isEnc = (s: string) => s && !s.startsWith('http') && !s.startsWith('ey');
          supabaseUrl = isEnc(tenantConfig[0].supabaseUrl) ? decrypt(tenantConfig[0].supabaseUrl) : tenantConfig[0].supabaseUrl;
          supabaseAnonKey = isEnc(tenantConfig[0].supabaseAnonKey) ? decrypt(tenantConfig[0].supabaseAnonKey) : tenantConfig[0].supabaseAnonKey;
          console.log(`[GET /api/settings] ✅ Usando credenciais do tenant ${tenantId} (supabase_config)`);
        }
      } catch (err: any) {
        dbError = err;
        console.warn(`[GET /api/settings] Erro ao buscar credenciais do tenant ${tenantId}:`, err.message);
      }
      
      // PRIORIDADE 2: Buscar company info de app_settings (NÃO credenciais - apenas nome/slug)
      let settings = null;
      try {
        settings = await storage.getAppSettings();
        // ⚠️ NÃO usar credenciais de app_settings - apenas company info
        // (app_settings não tem mais credenciais após migração multi-tenant)
      } catch (err: any) {
        console.warn('[GET /api/settings] Erro ao buscar app_settings:', err.message);
      }
      
      // 🔐 SEGURANÇA: Se tenant não tem credenciais, NÃO retornar credenciais globais de env vars
      // Isso previne vazamento de credenciais para usuários não autorizados
      if (!supabaseUrl && !supabaseAnonKey && !tenantId) {
        console.warn('[GET /api/settings] Requisição sem tenantId - não retornará credenciais globais');
        // Permitir acesso a env vars apenas em modo desenvolvimento sem sessão
        if (process.env.NODE_ENV === 'development') {
          supabaseUrl = process.env.REACT_APP_SUPABASE_URL || null;
          supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || null;
          if (supabaseUrl) {
            console.log('[GET /api/settings] ⚠️ DEV MODE: Usando credenciais dos Secrets (fallback)');
          }
        }
      }
      
      // Company info vem de app_settings (compartilhado entre tenants)
      const companyName = settings?.companyName || null;
      const companySlug = settings?.companySlug || null;
      
      console.log(`[GET /api/settings] Tenant ${tenantId} returning:`, { 
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
        hasCompanyName: !!companyName,
        hasCompanySlug: !!companySlug
      });
      
      res.json({
        supabaseUrl,
        supabaseAnonKey,
        companyName,
        companySlug
      });
    } catch (error: any) {
      console.error('[GET /api/settings] Unexpected error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Save app settings (Supabase credentials + company info)
  app.post("/api/settings", authenticateToken, async (req, res) => {
    try {
      const tenantId = (req as any).user!.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Sessão inválida - faça login novamente' });
      }
      
      const { supabaseUrl, supabaseAnonKey, companyName } = req.body;
      
      // Auto-generate company slug if company name is provided
      let companySlug = null;
      if (companyName && companyName.trim() !== '') {
        companySlug = generateCompanySlug(companyName);
        console.log('[POST /api/settings] Auto-generated slug:', { companyName, companySlug });
      }
      
      console.log('[POST /api/settings] Received:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseAnonKey,
        hasCompanyName: !!companyName,
        companySlug,
        urlLength: supabaseUrl?.length,
        keyLength: supabaseAnonKey?.length
      });
      
      // Allow empty strings for clearing, but validate if values are provided
      if (supabaseUrl === undefined || supabaseAnonKey === undefined) {
        return res.status(400).json({ 
          error: "URL do Supabase e Chave Anônima são obrigatórios" 
        });
      }
      
      // If both are empty strings, treat as clearing configuration
      if (supabaseUrl === "" && supabaseAnonKey === "") {
        
        const settings = await storage.saveAppSettings({
          supabaseUrl: null,
          supabaseAnonKey: null,
          companyName: companyName || null,
          companySlug: companySlug || null
        });
        
        // 🔐 ISOLAMENTO MULTI-TENANT: Limpar APENAS as credenciais deste tenant
        await db.delete(supabaseConfig).where(eq(supabaseConfig.tenantId, tenantId));
        console.log(`ℹ️ Configurações do Supabase removidas para tenant ${tenantId}`);
        
        return res.json({
          message: "Configurações removidas com sucesso!",
          settings: {
            supabaseUrl: null,
            supabaseAnonKey: null,
            companyName: settings.companyName,
            companySlug: settings.companySlug
          }
        });
      }
      
      // If only one is empty, that's an error
      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(400).json({ 
          error: "Ambos URL e Chave Anônima devem ser fornecidos ou ambos devem estar vazios" 
        });
      }
      
      // 🔐 ISOLAMENTO MULTI-TENANT: NÃO salvar credenciais em app_settings (tabela global)
      // Salvar APENAS company info (compartilhada entre tenants)
      console.log('[POST /api/settings] Salvando company info em app_settings (sem credenciais)...');
      const settings = await storage.saveAppSettings({
        supabaseUrl: null,  // ⚠️ NÃO salvar credenciais aqui - apenas em supabase_config
        supabaseAnonKey: null,  // ⚠️ NÃO salvar credenciais aqui - apenas em supabase_config
        companyName: companyName || null,
        companySlug: companySlug || null
      });
      console.log('[POST /api/settings] Company info salva em app_settings:', { 
        id: settings.id,
        companyName: settings.companyName,
        companySlug: settings.companySlug
      });
      
      // ✅ CORREÇÃO CRÍTICA: Also save to supabase_config table (encrypted)
      // This ensures both endpoints work correctly
      const encryptedUrl = encrypt(supabaseUrl);
      const encryptedKey = encrypt(supabaseAnonKey);
      
      const existingConfig = await db
        .select()
        .from(supabaseConfig)
        .where(eq(supabaseConfig.tenantId, tenantId))
        .limit(1);
      
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
        
        console.log(`✅ Configuração do Supabase atualizada para tenant ${tenantId} em supabase_config (criptografada)`);
      } else {
        await db.insert(supabaseConfig).values({
          tenantId,
          supabaseUrl: encryptedUrl,
          supabaseAnonKey: encryptedKey,
          supabaseBucket: 'receipts',
        });
        
        console.log(`✅ Configuração do Supabase salva para tenant ${tenantId} em supabase_config (criptografada)`);
      }
      
      // 🔄 SINCRONIZAÇÃO AUTOMÁTICA: Dispara sync do Supabase após salvar credenciais
      console.log("🔄 [AUTO-SYNC] Disparando sincronização automática do Supabase...");
      
      try {
        const { getDynamicSupabaseClient } = await import("../formularios/utils/supabaseClient");
        const supabase = await getDynamicSupabaseClient(supabaseUrl, supabaseAnonKey);
        
        if (supabase) {
          // Buscar todas as submissions do Supabase
          const { data: submissions, error: fetchError } = await supabase
            .from('form_submissions')
            .select('*');
          
          if (!fetchError && submissions && submissions.length > 0) {
            console.log(`📡 [AUTO-SYNC] ${submissions.length} submissions encontradas - sincronizando...`);
            
            let synced = 0;
            let errors = 0;
            
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
                } else {
                  errors++;
                }
              } catch (syncError: any) {
                errors++;
                console.log(`⚠️  [AUTO-SYNC] Erro ao sincronizar submission ${submission.id}: ${syncError.message}`);
              }
            }
            
            console.log(`✅ [AUTO-SYNC] Sincronização concluída: ${synced} leads sincronizados, ${errors} erros`);
          } else {
            console.log('ℹ️  [AUTO-SYNC] Nenhuma submission encontrada no Supabase');
          }
        }
      } catch (syncError: any) {
        console.log(`⚠️  [AUTO-SYNC] Erro na sincronização automática: ${syncError.message}`);
      }
      
      res.json({
        message: "Configurações salvas com sucesso!",
        settings: {
          supabaseUrl: settings.supabaseUrl,
          supabaseAnonKey: settings.supabaseAnonKey,
          companyName: settings.companyName,
          companySlug: settings.companySlug
        }
      });
    } catch (error: any) {
      console.error("[POST /api/settings] Erro ao salvar configurações do Supabase:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get company slug only (for URL generation)
  app.get("/api/company-slug", async (req, res) => {
    try {
      let companyName = null;
      let companySlug = 'empresa';
      
      const tenantId = req.headers['x-tenant-id'] as string || 
                       (req.session as any)?.tenantId || 
                       (req.session as any)?.userId;

      if (tenantId) {
        try {
          const { getCompanySlugFromDb } = await import('../lib/tenantSlug.js');
          const hmsSlug = await getCompanySlugFromDb(tenantId);
          if (hmsSlug) {
            companySlug = hmsSlug;
            companyName = companySlug.charAt(0).toUpperCase() + companySlug.slice(1);
            console.log('[GET /api/company-slug] Found in hms_100ms_config:', { companyName, companySlug });
          }
        } catch (hmsErr: any) {
          console.warn('[GET /api/company-slug] hms_100ms_config check failed:', hmsErr.message);
        }
      }

      // PRIORITY 1: If still default, try Supabase
      if (companySlug === 'empresa' || !companyName) {
        try {
          const { getSupabaseCredentialsStrict } = await import('../lib/credentialsDb.js');
          const { createClient } = await import('@supabase/supabase-js');
          
          if (!tenantId) {
            console.log('[GET /api/company-slug] No tenantId available - using local database only');
            const localSettings = await storage.getAppSettings();
            companyName = companyName || localSettings?.companyName || null;
            companySlug = (companySlug !== 'empresa' ? companySlug : localSettings?.companySlug) || 'empresa';
          } else {
            const credentials = await getSupabaseCredentialsStrict(tenantId);
            
            if (credentials?.url && credentials?.anonKey) {
              console.log('[GET /api/company-slug] Fetching from Supabase (tenant: ' + tenantId + ')...');
              const supabase = createClient(credentials.url, credentials.anonKey);
              
              const { data: supabaseSettings, error } = await supabase
                .from('company_settings')
                .select('company_name, company_slug')
                .limit(1)
                .single();
              
              if (!error && supabaseSettings) {
                companyName = supabaseSettings.company_name || companyName;
                companySlug = supabaseSettings.company_slug || companySlug;
                console.log('[GET /api/company-slug] Found in Supabase:', { companyName, companySlug });
              } else {
                console.log('[GET /api/company-slug] Not found in Supabase company_settings:', error?.message);
                if (companySlug === 'empresa') {
                  const localSettings = await storage.getAppSettings();
                  companyName = companyName || localSettings?.companyName || null;
                  companySlug = localSettings?.companySlug || 'empresa';
                }
              }
            } else if (companySlug === 'empresa') {
              console.log('[GET /api/company-slug] No Supabase credentials for tenant, using local database');
              const localSettings = await storage.getAppSettings();
              companyName = companyName || localSettings?.companyName || null;
              companySlug = localSettings?.companySlug || 'empresa';
            }
          }
        } catch (err: any) {
          console.warn('[GET /api/company-slug] Database error:', err.message);
          if (companySlug === 'empresa') {
            try {
              const localSettings = await storage.getAppSettings();
              companyName = companyName || localSettings?.companyName || null;
              companySlug = localSettings?.companySlug || 'empresa';
            } catch (localErr: any) {
              console.warn('[GET /api/company-slug] Local DB error:', localErr.message);
            }
          }
        }
      }
      
      console.log('[GET /api/company-slug] Returning:', { 
        companyName, 
        companySlug
      });
      
      res.json({
        companyName,
        companySlug
      });
    } catch (error: any) {
      console.error('[GET /api/company-slug] Error:', error);
      res.json({
        companyName: null,
        companySlug: 'empresa'
      });
    }
  });

  // Test Supabase connection
  app.post("/api/credentials/test/supabase", async (req, res) => {
    try {
      const { supabaseUrl, supabaseAnonKey } = req.body;
      
      console.log('[TEST SUPABASE] Testing connection...');
      
      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(400).json({
          success: false,
          error: "URL e chave do Supabase são necessários"
        });
      }
      
      // Import Supabase client
      const { createClient } = await import('@supabase/supabase-js');
      
      // Create temporary client for testing
      const testClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
      });
      
      // Try to query a simple table to test connection
      const { data, error } = await testClient
        .from('forms')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      
      if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
        console.error('[TEST SUPABASE] Connection failed:', error);
        return res.json({
          success: false,
          message: `Erro na conexão: ${error.message}`
        });
      }
      
      console.log('[TEST SUPABASE] Connection successful!');
      res.json({
        success: true,
        message: "Conexão com Supabase estabelecida com sucesso!"
      });
    } catch (error: any) {
      console.error('[TEST SUPABASE] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
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
      const { insertConfigurationSchema } = await import("@shared/schema");
      const config = insertConfigurationSchema.parse(req.body);
      const savedConfig = await storage.setConfiguration(config);
      res.json({ success: true, config: savedConfig });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.get("/api/config/:tenantId", async (req, res) => {
    try {
      const { tenantId } = req.params;
      const config = await storage.getConfiguration(tenantId);
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
      const { method = "GET", endpoint, body } = req.body;
      const tenantId = (req.session as any)?.tenantId || (req.session as any)?.userId || req.body?.userId;

      const config = await getEvolutionConfig(tenantId);
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
      const tenantId = (req.session as any)?.tenantId || (req.session as any)?.userId || req.body?.userId;

      const config = await getEvolutionConfig(tenantId);
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
              
              // Busca ou cria o lead (com tenantId para multi-tenant)
              await leadService.buscarOuCriarLead({
                telefone,
                nome: bestName,
                whatsappId: chat.id || chat.remoteJid,
                whatsappInstance: config.instanceWhatsapp,
                tenantId: tenantId,
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
      const tenantId = (req.session as any)?.tenantId || (req.session as any)?.userId || req.body?.userId;

      const config = await getEvolutionConfig(tenantId);
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
      const { chatId, limit = 100 } = req.body;
      const tenantId = (req.session as any)?.tenantId || (req.session as any)?.userId || req.body?.userId;

      const config = await getEvolutionConfig(tenantId);
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
      const { number, text } = req.body;
      const tenantId = (req.session as any)?.tenantId || (req.session as any)?.userId || req.body?.userId;

      const config = await getEvolutionConfig(tenantId);
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
      const { number, mediatype, mimetype, media, caption, fileName } = req.body;
      const tenantId = (req.session as any)?.tenantId || (req.session as any)?.userId || req.body?.userId;

      const config = await getEvolutionConfig(tenantId);
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
      const { number, audioBase64 } = req.body;
      const tenantId = (req.session as any)?.tenantId || (req.session as any)?.userId || req.body?.userId;

      const config = await getEvolutionConfig(tenantId);
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
      const { messageKey } = req.body;
      const tenantId = (req.session as any)?.tenantId || (req.session as any)?.userId || req.body?.userId;

      const config = await getEvolutionConfig(tenantId);
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
      
      // Buscar todas as labels para matching
      const allLabels = await db.select().from(whatsappLabels).where(eq(whatsappLabels.ativo, true)).orderBy(whatsappLabels.ordem);
      const defaultLabel = allLabels.find(l => l.formStatus === 'not_sent') || allLabels[0];
      
      console.log(`📋 Encontradas ${allLabels.length} labels ativas para matching`);
      
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
        
        // ✅ MATCHING DE LABELS - Mesmo algoritmo do whatsapp-complete
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
        
        const labelToUse = matchedLabel || { nome: 'Sem Etiqueta', cor: 'hsl(0, 0%, 50%)' };
        
        console.log(`📱 Lead: ${lead.nome || 'Sem nome'} | Telefone: ${telefoneNormalizado} | Status: ${lead.formStatus} | Label: ${labelToUse.nome}`);
        
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
          label: labelToUse, // ✅ ADICIONADO: Inclui label automática do sistema
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
      
      // Buscar todas as labels para matching
      const allLabels = await db.select().from(whatsappLabels).where(eq(whatsappLabels.ativo, true)).orderBy(whatsappLabels.ordem);
      const defaultLabel = allLabels.find(l => l.formStatus === 'not_sent') || allLabels[0];
      
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

          // ✅ MATCHING DE LABELS - Mesmo algoritmo do whatsapp-complete
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
          
          const labelToUse = matchedLabel || { nome: 'Sem Etiqueta', cor: 'hsl(0, 0%, 50%)' };

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
              label: labelToUse, // ✅ ADICIONADO: Inclui label automática
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
          message: 'Supabase não configurado. Configure em /configuracoes (banco) ou em Tools → Secrets (REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY)'
        });
      }

      console.log(`📡 Usando credenciais Supabase de: ${source}`);
      
      // Criar cliente Supabase com as credenciais encontradas
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

          // Buscar etiqueta WhatsApp correspondente (3-tier matching)
          const formStatus = 'completed';
          let matchingLabel = null;
          
          // NÍVEL 1: Match exato (formStatus + qualificationStatus)
          const exactMatch = await db.select()
            .from(whatsappLabels)
            .where(and(
              eq(whatsappLabels.formStatus, formStatus),
              eq(whatsappLabels.qualificationStatus, qualificationStatus)
            ))
            .limit(1)
            .then(rows => rows[0] || null);
          
          if (exactMatch) {
            matchingLabel = exactMatch.id;
          } else {
            // NÍVEL 2: Match parcial (apenas formStatus)
            const partialMatch = await db.select()
              .from(whatsappLabels)
              .where(and(
                eq(whatsappLabels.formStatus, formStatus),
                isNull(whatsappLabels.qualificationStatus)
              ))
              .limit(1)
              .then(rows => rows[0] || null);
            
            if (partialMatch) {
              matchingLabel = partialMatch.id;
            } else {
              // NÍVEL 3: Fallback padrão (not_sent)
              const defaultLabel = await db.select()
                .from(whatsappLabels)
                .where(eq(whatsappLabels.formStatus, 'not_sent'))
                .limit(1)
                .then(rows => rows[0] || null);
              
              if (defaultLabel) {
                matchingLabel = defaultLabel.id;
              }
            }
          }

          // Buscar lead existente no PostgreSQL local
          const tenantId = req.session?.tenantId || '1';
          const existingLead = await db.select()
            .from(leads)
            .where(and(eq(leads.telefoneNormalizado, telefoneNormalizado), eq(leads.tenantId, tenantId)))
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
                whatsappLabelId: matchingLabel,
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
              whatsappLabelId: matchingLabel,
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
