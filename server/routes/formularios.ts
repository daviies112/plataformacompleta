import { Router, Request } from 'express';
import { db } from '../db';
import { appSettings, formTemplates, forms, formTenantMapping } from '../../shared/db-schema';
import { eq, desc, sql } from 'drizzle-orm';
import { getGlobalSupabaseClient } from '../lib/supabaseAutoConnect';
import { getClientSupabaseClient } from '../lib/multiTenantSupabase';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { STANDARD_REGISTRATION_FIELDS, DEFAULT_REGISTRATION_DESIGN_CONFIG, getStandardFields, removeDuplicateCpfCnpj, type QuestionField } from '../formularios/services/standardFields.js';
import { requireTenant } from '../middleware/requireTenant';
import { generateCompanySlug } from '../formularios/utils/slugGenerator';
import { getCompanySlug, getCompanySlugFromDb } from '../lib/tenantSlug';

const router = Router();

const DEFAULT_SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Helper: Gera URL dinâmica do formulário baseada no domínio atual
 * NÃO armazena URL estática - sempre gera baseado no ambiente atual
 */
function generateDynamicFormUrl(companySlug: string, formSlug: string): string {
  const domain = process.env.APP_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0] ||
    (process.env.REPL_SLUG && process.env.REPL_OWNER ?
      `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` :
      'localhost:5000');
  const protocol = domain.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${domain}/formulario/${companySlug}/form/${formSlug}`;
}

/**
 * Helper: Busca ou cria configurações no PostgreSQL LOCAL
 */
async function getOrCreateLocalAppSettings() {
  const existing = await db.select().from(appSettings).limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Criar configuração padrão
  const newSettings = await db.insert(appSettings).values({
    id: DEFAULT_SETTINGS_ID,
    companyName: 'Minha Empresa',
    companySlug: 'empresa',
  }).returning();

  return newSettings[0];
}

/**
 * Obtém cliente Supabase usando as credenciais do tenant (multi-tenant)
 * Prioridade:
 * 1. Credenciais do tenant no banco de dados (se tenantId disponível)
 * 2. Variáveis de ambiente (fallback)
 */
async function getSupabaseClientForFormularios(req?: Request): Promise<SupabaseClient | null> {
  const tenantId = req?.session?.tenantId || (req?.headers?.['x-tenant-id'] as string);
  if (tenantId) {
    const tenantClient = await getClientSupabaseClient(tenantId);
    if (tenantClient) {
      console.log(`✅ [FORMS] Usando Supabase do tenant: ${tenantId}`);
      return tenantClient;
    }
  }

  // Fallback: Tentar cliente global
  const globalClient = getGlobalSupabaseClient();
  if (globalClient) {
    console.log('✅ [FORMS] Usando cliente Supabase global');
    return globalClient;
  }

  // Fallback final: Usar environment variables (com trim)
  const url = (process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const anonKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

  if (!url || !anonKey) {
    console.error('❌ [FORMS] Supabase não configurado - nem tenant, nem env vars');
    return null;
  }

  console.log('⚠️ [FORMS] Usando Supabase de environment variables (não recomendado para multi-tenant)');
  return createClient(url, anonKey);
}

/**
 * Busca ou cria configurações no SUPABASE (não PostgreSQL local)
 */
async function getOrCreateAppSettingsInSupabase(supabase: SupabaseClient) {
  // Buscar configuração existente no Supabase
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', DEFAULT_SETTINGS_ID)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  // Se não existir, criar no Supabase
  if (!data) {
    const { data: newData, error: insertError } = await supabase
      .from('app_settings')
      .insert({
        id: DEFAULT_SETTINGS_ID,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return newData;
  }

  return data;
}

/**
 * Obtém o slug da empresa do hms_100ms_config, Supabase ou banco local
 * Usado para construir URLs profissionais: /formulario/{companySlug}/form/{formId}
 * Prioridade: hms_100ms_config > Supabase company_settings > fallback
 */
async function getCompanySlugFromSupabase(supabase: SupabaseClient, tenantId?: string): Promise<string> {
  try {
    if (tenantId) {
      try {
        const hmsSlug = await getCompanySlugFromDb(tenantId);
        if (hmsSlug) {
          console.log(`✅ [FORMS] Company slug from hms_100ms_config: ${hmsSlug}`);
          return hmsSlug;
        }
      } catch (e) {
        console.warn('⚠️ [FORMS] hms_100ms_config check failed, trying Supabase');
      }
    }

    const { data: companySettings, error } = await supabase
      .from('company_settings')
      .select('company_name, company_slug')
      .limit(1)
      .single();

    if (!error && companySettings?.company_slug) {
      console.log(`✅ [FORMS] Company slug encontrado: ${companySettings.company_slug}`);
      return companySettings.company_slug;
    }

    if (!error && companySettings?.company_name) {
      const generatedSlug = generateCompanySlug(companySettings.company_name);
      console.log(`✅ [FORMS] Company slug gerado do nome: ${generatedSlug}`);
      return generatedSlug;
    }

    console.log('⚠️ [FORMS] Company settings não encontrado, usando fallback "empresa"');
    return 'empresa';
  } catch (err) {
    console.warn('⚠️ [FORMS] Erro ao buscar company slug:', err);
    return 'empresa';
  }
}

/**
 * GET /api/formularios/ativo - Busca formulário ativo do PostgreSQL LOCAL primeiro
 * Funciona sem Supabase - URL é gerada dinamicamente
 */
router.get('/ativo', async (req, res) => {
  try {
    // PRIORIDADE 1: Buscar do PostgreSQL LOCAL
    const localSettings = await db.select().from(appSettings).limit(1);

    if (localSettings.length > 0 && localSettings[0].activeFormId) {
      const settings = localSettings[0];
      console.log(`✅ [FORMS/ativo] Formulário ativo encontrado no PostgreSQL local: ${settings.activeFormId}`);

      // Buscar mapeamento para obter slug correto
      const mappingResult = await db
        .select({
          slug: formTenantMapping.slug,
          companySlug: formTenantMapping.companySlug
        })
        .from(formTenantMapping)
        .where(eq(formTenantMapping.formId, settings.activeFormId))
        .limit(1);

      let formSlug = settings.activeFormId;
      let companySlug = settings.companySlug || 'empresa';

      const resolvedTenantId = req.session?.tenantId || (req.headers['x-tenant-id'] as string);
      if (resolvedTenantId) {
        try {
          const hmsSlug = await getCompanySlugFromDb(resolvedTenantId);
          if (hmsSlug) {
            companySlug = hmsSlug;
            console.log(`✅ [FORMS/ativo] Company slug from tenantSlug: ${companySlug}`);
          }
        } catch (e) {
          console.warn('⚠️ [FORMS/ativo] Fallback to settings/mapping slug');
        }
      }

      if (mappingResult.length > 0) {
        formSlug = mappingResult[0].slug || settings.activeFormId;
        if (!req.session?.tenantId) {
          companySlug = mappingResult[0].companySlug || companySlug;
        }
      }

      // Gerar URL dinâmica baseada no domínio atual
      const dynamicUrl = generateDynamicFormUrl(companySlug, formSlug);

      let localFormResult: any[] = [];
      try {
        localFormResult = await db
          .select()
          .from(forms)
          .where(eq(forms.id, settings.activeFormId))
          .limit(1);
      } catch (localFormErr) {
        console.warn('⚠️ [FORMS/ativo] Tabela forms local não disponível, usando Supabase fallback:', localFormErr instanceof Error ? localFormErr.message : localFormErr);
      }

      if (localFormResult.length > 0) {
        const form = localFormResult[0];
        return res.json({
          id: form.id,
          title: form.title,
          description: form.description,
          questions: form.questions,
          designConfig: form.designConfig,
          createdAt: form.createdAt,
          updatedAt: form.updatedAt,
          url: dynamicUrl,
          companySlug,
          formSlug
        });
      }

      // Tentar buscar no Supabase se não encontrado localmente
      const supabase = await getSupabaseClientForFormularios(req);
      if (supabase) {
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .eq('id', settings.activeFormId)
          .single();

        if (!error && data) {
          return res.json({
            id: data.id,
            title: data.title,
            description: data.description,
            questions: data.questions,
            designConfig: data.design_config,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            url: dynamicUrl,
            companySlug,
            formSlug
          });
        }
      }
    }

    // PRIORIDADE 2: Tentar buscar do Supabase se PostgreSQL local não tem configuração
    const supabase = await getSupabaseClientForFormularios(req);

    if (supabase) {
      try {
        const supabaseSettings = await getOrCreateAppSettingsInSupabase(supabase);

        if (supabaseSettings.active_form_id) {
          const { data, error } = await supabase
            .from('forms')
            .select('*')
            .eq('id', supabaseSettings.active_form_id)
            .single();

          if (!error && data) {
            // Obter slug da empresa - priorizar hms100msConfig via getCompanySlug
            let companySlug = 'empresa';
            if (req.session?.tenantId) {
              try {
                const hmsSlug = await getCompanySlugFromDb(req.session.tenantId);
                if (hmsSlug) companySlug = hmsSlug;
              } catch (e) { }
            }
            if (!companySlug || companySlug === 'empresa') {
              try {
                companySlug = await getCompanySlugFromSupabase(supabase, req.session?.tenantId);
              } catch (e) { }
            }

            const formSlug = data.slug || data.id;
            const dynamicUrl = generateDynamicFormUrl(companySlug, formSlug);

            // Sincronizar com PostgreSQL local
            const localSettingsSync = await getOrCreateLocalAppSettings();
            await db.update(appSettings)
              .set({
                activeFormId: supabaseSettings.active_form_id,
                activeFormUrl: dynamicUrl,
                companySlug: companySlug,
                updatedAt: new Date()
              })
              .where(eq(appSettings.id, localSettingsSync.id));

            return res.json({
              id: data.id,
              title: data.title,
              description: data.description,
              questions: data.questions,
              designConfig: data.design_config,
              createdAt: data.created_at,
              updatedAt: data.updated_at,
              url: dynamicUrl,
              companySlug,
              formSlug
            });
          }
        }
      } catch (e) {
        console.warn('⚠️ [FORMS/ativo] Erro ao buscar do Supabase:', e);
      }
    }

    return res.status(404).json({
      error: 'Nenhum formulário ativo configurado',
      message: 'Configure um formulário como ativo primeiro'
    });
  } catch (error) {
    console.error('Erro ao buscar formulário ativo:', error);
    res.status(500).json({
      error: 'Erro ao buscar formulário ativo',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * PUT /api/formularios/config/ativo - Salva formulário ativo no PostgreSQL LOCAL
 * Funciona sem Supabase - busca formulário do banco local ou Supabase se disponível
 */
router.put('/config/ativo', async (req, res) => {
  try {
    // 🔐 CORREÇÃO: Aceitar companySlug do body da requisição
    // Isso permite que o frontend envie o company_slug correto (ex: "elena")
    // em vez de depender da busca no Supabase que pode falhar e retornar "empresa"
    const { formId, companySlug: requestedCompanySlug } = req.body;

    if (!formId) {
      return res.status(400).json({
        error: 'formId é obrigatório'
      });
    }

    console.log(`📝 [FORMS] Salvando formulário ativo: ${formId}`);
    if (requestedCompanySlug) {
      console.log(`📝 [FORMS] Company slug recebido do frontend: ${requestedCompanySlug}`);
    }

    // 🔐 PRIORIDADE 0: Usar getCompanySlug (hms100msConfig) para consistência com meetings/signatures
    // Se companySlug foi passado no body, usar como override; senão, buscar de hms100msConfig
    let companySlug = requestedCompanySlug || 'empresa';
    const tenantId = (req as any).tenantId || (req as any).user?.tenantId || req.session?.tenantId || (req.headers['x-tenant-id'] as string);
    if (!requestedCompanySlug && tenantId) {
      try {
        const hmsSlug = await getCompanySlugFromDb(tenantId);
        if (hmsSlug) {
          companySlug = hmsSlug;
          console.log(`✅ [FORMS] Company slug from tenantSlug (hms100msConfig): ${companySlug}`);
        }
      } catch (e) {
        console.warn('⚠️ [FORMS] Fallback to default slug');
      }
    }
    let formSlug = formId; // Fallback: usar ID como slug
    let formTitle = 'Formulário';
    let formFound = false;

    // Verificar no mapping local
    const mappingResult = await db
      .select({
        formId: formTenantMapping.formId,
        slug: formTenantMapping.slug,
        companySlug: formTenantMapping.companySlug,
        tenantId: formTenantMapping.tenantId
      })
      .from(formTenantMapping)
      .where(eq(formTenantMapping.formId, formId))
      .limit(1);

    if (mappingResult.length > 0) {
      const mapping = mappingResult[0];
      // 🔐 CORREÇÃO: Se requestedCompanySlug foi passado, usar ele em vez do armazenado
      // Isso permite atualizar o companySlug para o valor correto
      if (!requestedCompanySlug) {
        companySlug = mapping.companySlug || 'empresa';
      }
      formSlug = mapping.slug || formId;
      formFound = true;
      console.log(`✅ [FORMS] Formulário encontrado no mapping: ${companySlug}/${formSlug}`);
    }

    // PRIORIDADE 2: Buscar direto na tabela forms local
    if (!formFound) {
      try {
        const localFormResult = await db
          .select({ id: forms.id, title: forms.title, slug: forms.slug })
          .from(forms)
          .where(eq(forms.id, formId))
          .limit(1);

        if (localFormResult.length > 0) {
          const localForm = localFormResult[0];
          formTitle = localForm.title || 'Formulário';
          formSlug = localForm.slug || formId;
          formFound = true;
          console.log(`✅ [FORMS] Formulário encontrado no PostgreSQL local: ${formTitle}`);
        }
      } catch (localFormErr) {
        console.warn('⚠️ [FORMS] Tabela forms local não disponível, tentando Supabase:', localFormErr instanceof Error ? localFormErr.message : localFormErr);
      }
    }

    // PRIORIDADE 3: Tentar buscar no Supabase se disponível
    let supabaseFormData: any = null;
    if (!formFound) {
      const supabase = await getSupabaseClientForFormularios(req);
      if (supabase) {
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('*')
          .eq('id', formId)
          .single();

        if (!formError && formData) {
          supabaseFormData = formData;
          formTitle = formData.title || 'Formulário';
          formSlug = formData.slug || formId;
          formFound = true;
          console.log(`✅ [FORMS] Formulário encontrado no Supabase: ${formTitle}`);

          // 🔐 CORREÇÃO: Só buscar company_slug do Supabase se NÃO foi passado no body
          // Se requestedCompanySlug foi passado, ele já está em companySlug e deve ser usado
          if (!requestedCompanySlug) {
            try {
              companySlug = await getCompanySlugFromSupabase(supabase, tenantId);
            } catch (e) {
              console.warn('⚠️ [FORMS] Não foi possível obter company_slug do Supabase');
            }
          } else {
            console.log(`📝 [FORMS] Usando companySlug do body da requisição: ${companySlug}`);
          }

          // 🔐 CRÍTICO: Copiar formulário do Supabase para PostgreSQL local
          // Isso garante que o formulário funcione mesmo após exportar a plataforma
          try {
            const existingLocal = await db
              .select({ id: forms.id })
              .from(forms)
              .where(eq(forms.id, formId))
              .limit(1);

            if (existingLocal.length === 0) {
              console.log(`📥 [FORMS] Copiando formulário do Supabase para PostgreSQL local...`);

              await db.insert(forms).values({
                id: formData.id,
                title: formData.title,
                description: formData.description || '',
                questions: formData.questions || [],
                elements: formData.elements || [],
                designConfig: formData.design_config || {},
                scoreTiers: formData.score_tiers || [],
                tags: formData.tags || [],
                slug: formData.slug || formId,
                isPublic: true,
                tenantId: tenantId || 'default',
                createdAt: new Date(formData.created_at || Date.now()),
                updatedAt: new Date()
              });

              console.log(`✅ [FORMS] Formulário copiado com sucesso para PostgreSQL local!`);
            } else {
              // Atualizar formulário existente
              await db.update(forms)
                .set({
                  title: formData.title,
                  description: formData.description || '',
                  questions: formData.questions || [],
                  elements: formData.elements || [],
                  designConfig: formData.design_config || {},
                  scoreTiers: formData.score_tiers || [],
                  tags: formData.tags || [],
                  slug: formData.slug || formId,
                  isPublic: true,
                  updatedAt: new Date()
                })
                .where(eq(forms.id, formId));

              console.log(`✅ [FORMS] Formulário atualizado no PostgreSQL local!`);
            }
          } catch (copyError) {
            console.error(`⚠️ [FORMS] Erro ao copiar formulário para local:`, copyError);
          }
        }
      }
    }

    if (!formFound) {
      return res.status(404).json({
        error: 'Formulário não encontrado',
        message: 'O formulário não foi encontrado no banco de dados local nem no Supabase'
      });
    }

    // Gerar URL dinâmica (não armazena URL estática)
    const formUrl = generateDynamicFormUrl(companySlug, formSlug);
    console.log(`📍 [FORMS] URL dinâmica gerada: ${formUrl}`);

    // Buscar ou criar app_settings no PostgreSQL LOCAL
    const settings = await getOrCreateLocalAppSettings();

    // Atualizar no PostgreSQL LOCAL
    await db.update(appSettings)
      .set({
        activeFormId: formId,
        activeFormUrl: formUrl,
        companySlug: companySlug,
        updatedAt: new Date()
      })
      .where(eq(appSettings.id, settings.id));

    console.log('✅ Formulário ativo salvo no PostgreSQL LOCAL:');
    console.log('   - ID:', formId);
    console.log('   - Slug:', formSlug);
    console.log('   - Company Slug:', companySlug);
    console.log('   - URL:', formUrl);

    // 🔐 CRITICAL: Criar/atualizar formTenantMapping com isPublic=true
    // Isso é ESSENCIAL para que o formulário seja acessível via URL pública
    try {
      const existingMapping = await db
        .select()
        .from(formTenantMapping)
        .where(eq(formTenantMapping.formId, formId))
        .limit(1);

      const effectiveTenantId = tenantId || 'default';

      if (existingMapping.length > 0) {
        // Atualizar mapping existente para marcar como público
        await db.update(formTenantMapping)
          .set({
            isPublic: true,
            slug: formSlug,
            companySlug: companySlug,
            updatedAt: new Date()
          })
          .where(eq(formTenantMapping.formId, formId));
        console.log('✅ [FORMS] formTenantMapping atualizado com isPublic=true');
      } else {
        // Criar novo mapping
        await db.insert(formTenantMapping)
          .values({
            formId: formId,
            tenantId: tenantId,
            slug: formSlug,
            companySlug: companySlug,
            isPublic: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        console.log('✅ [FORMS] formTenantMapping criado com isPublic=true');
      }

      // Também atualizar is_public na tabela forms se existir localmente
      try {
        const localFormExists = await db
          .select({ id: forms.id })
          .from(forms)
          .where(eq(forms.id, formId))
          .limit(1);

        if (localFormExists.length > 0) {
          await db.update(forms)
            .set({
              isPublic: true,
              slug: formSlug,
              updatedAt: new Date()
            })
            .where(eq(forms.id, formId));
          console.log('✅ [FORMS] Tabela forms atualizada com is_public=true');
        }
      } catch (formsTableErr) {
        console.warn('⚠️ [FORMS] Tabela forms local não disponível para atualizar is_public:', formsTableErr instanceof Error ? formsTableErr.message : formsTableErr);
      }
    } catch (mappingError) {
      console.error('⚠️ [FORMS] Erro ao atualizar formTenantMapping:', mappingError);
      // Não falhar a operação principal se o mapping falhar
    }

    // TAMBÉM atualizar no Supabase se disponível (sincronização)
    const supabase = await getSupabaseClientForFormularios(req);
    if (supabase) {
      try {
        const supabaseSettings = await getOrCreateAppSettingsInSupabase(supabase);
        await supabase
          .from('app_settings')
          .update({
            active: true,
            active_form_id: formId,
            active_form_url: formUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', supabaseSettings.id);
        console.log('✅ Também sincronizado com Supabase (active=true)');
      } catch (e) {
        console.warn('⚠️ [FORMS] Não foi possível sincronizar com Supabase:', e);
      }
    }

    res.json({
      message: 'Formulário ativo configurado com sucesso',
      activeFormId: formId,
      activeFormUrl: formUrl,
      companySlug,
      formSlug
    });
  } catch (error) {
    console.error('Erro ao configurar formulário ativo:', error);
    res.status(500).json({
      error: 'Erro ao configurar formulário ativo',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * GET /api/formularios/config/ativo - Busca formulário ativo do PostgreSQL LOCAL
 * Funciona sem Supabase - URL é gerada dinamicamente
 */
router.get('/config/ativo', async (req, res) => {
  try {
    // PRIORIDADE 1: Buscar do PostgreSQL LOCAL
    const localSettings = await db.select().from(appSettings).limit(1);

    if (localSettings.length > 0 && localSettings[0].activeFormId) {
      const settings = localSettings[0];
      console.log(`✅ [FORMS] Formulário ativo encontrado no PostgreSQL local: ${settings.activeFormId}`);

      // Buscar mapeamento para obter slug correto
      const mappingResult = await db
        .select({
          slug: formTenantMapping.slug,
          companySlug: formTenantMapping.companySlug
        })
        .from(formTenantMapping)
        .where(eq(formTenantMapping.formId, settings.activeFormId))
        .limit(1);

      let formSlug = settings.activeFormId;
      let companySlug = settings.companySlug || 'empresa';

      const resolvedTenantId2 = req.session?.tenantId || (req.headers['x-tenant-id'] as string);
      if (resolvedTenantId2) {
        try {
          const hmsSlug = await getCompanySlugFromDb(resolvedTenantId2);
          if (hmsSlug) {
            companySlug = hmsSlug;
            console.log(`✅ [FORMS/config/ativo] Company slug from tenantSlug: ${companySlug}`);
          }
        } catch (e) {
          console.warn('⚠️ [FORMS/config/ativo] Fallback to settings/mapping slug');
        }
      }

      if (mappingResult.length > 0) {
        formSlug = mappingResult[0].slug || settings.activeFormId;
        if (!req.session?.tenantId) {
          companySlug = mappingResult[0].companySlug || companySlug;
        }
      }

      // Gerar URL dinâmica baseada no domínio atual
      const dynamicUrl = generateDynamicFormUrl(companySlug, formSlug);

      let localFormResult: any[] = [];
      try {
        localFormResult = await db
          .select()
          .from(forms)
          .where(eq(forms.id, settings.activeFormId))
          .limit(1);
      } catch (localFormErr) {
        console.warn('⚠️ [FORMS/config/ativo] Tabela forms local não disponível, usando Supabase fallback:', localFormErr instanceof Error ? localFormErr.message : localFormErr);
      }

      if (localFormResult.length > 0) {
        const form = localFormResult[0];
        return res.json({
          id: form.id,
          title: form.title,
          description: form.description,
          questions: form.questions,
          designConfig: form.designConfig,
          createdAt: form.createdAt,
          updatedAt: form.updatedAt,
          url: dynamicUrl,
          companySlug,
          formSlug
        });
      }

      // Tentar buscar no Supabase se não encontrado localmente
      const supabase = await getSupabaseClientForFormularios(req);
      if (supabase) {
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .eq('id', settings.activeFormId)
          .single();

        if (!error && data) {
          return res.json({
            id: data.id,
            title: data.title,
            description: data.description,
            questions: data.questions,
            designConfig: data.design_config,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            url: dynamicUrl,
            companySlug,
            formSlug
          });
        }
      }
    }

    // PRIORIDADE 2: Tentar buscar do Supabase se PostgreSQL local não tem configuração
    const supabase = await getSupabaseClientForFormularios(req);

    if (supabase) {
      try {
        const supabaseSettings = await getOrCreateAppSettingsInSupabase(supabase);

        if (supabaseSettings.active_form_id) {
          const { data, error } = await supabase
            .from('forms')
            .select('*')
            .eq('id', supabaseSettings.active_form_id)
            .single();

          if (!error && data) {
            let companySlug = 'empresa';
            if (req.session?.tenantId) {
              try {
                const hmsSlug = await getCompanySlugFromDb(req.session.tenantId);
                if (hmsSlug) companySlug = hmsSlug;
              } catch (e) { }
            }
            if (!companySlug || companySlug === 'empresa') {
              try {
                companySlug = await getCompanySlugFromSupabase(supabase, req.session?.tenantId);
              } catch (e) { }
            }

            const formSlug = data.slug || data.id;
            const dynamicUrl = generateDynamicFormUrl(companySlug, formSlug);

            // Sincronizar com PostgreSQL local
            const localSettings = await getOrCreateLocalAppSettings();
            await db.update(appSettings)
              .set({
                activeFormId: supabaseSettings.active_form_id,
                activeFormUrl: dynamicUrl,
                companySlug: companySlug,
                updatedAt: new Date()
              })
              .where(eq(appSettings.id, localSettings.id));

            return res.json({
              id: data.id,
              title: data.title,
              description: data.description,
              questions: data.questions,
              designConfig: data.design_config,
              createdAt: data.created_at,
              updatedAt: data.updated_at,
              url: dynamicUrl,
              companySlug,
              formSlug
            });
          }
        }
      } catch (e) {
        console.warn('⚠️ [FORMS] Erro ao buscar do Supabase:', e);
      }
    }

    return res.status(404).json({
      error: 'Nenhum formulário ativo configurado',
      message: 'Configure um formulário como ativo primeiro'
    });
  } catch (error) {
    console.error('Erro ao buscar formulário ativo:', error);
    res.status(500).json({
      error: 'Erro ao buscar formulário ativo',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// ============================================================================
// STANDARD FIELDS SYSTEM - Complete Registration Template Endpoints
// ============================================================================

/**
 * POST /api/formularios/form-templates/complete-registration
 * Creates or retrieves complete registration template for current tenant
 * 🔐 SECURITY: requireTenant middleware ensures multi-tenant isolation
 */
router.post('/form-templates/complete-registration', requireTenant, async (req, res) => {
  try {
    // 🔐 Extract and validate tenantId from authenticated session
    const tenantId = req.session?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: 'Sessão inválida - tenantId não encontrado',
        code: 'TENANT_ID_MISSING'
      });
    }

    console.log(`📝 [POST /form-templates/complete-registration] Creating template for tenant: ${tenantId}`);

    const supabase = await getSupabaseClientForFormularios(req);

    const templateData = {
      name: "Formulário Completo de Cadastro",
      description: "Template completo com todos os campos essenciais de cadastro de clientes (CPF/CNPJ, Nome, Email, Contato, Endereço, etc.)",
      thumbnail_url: null,
      is_default: true,
      design_config: DEFAULT_REGISTRATION_DESIGN_CONFIG,
      questions: STANDARD_REGISTRATION_FIELDS,
      tenant_id: tenantId // 🔐 SECURITY: Always include tenantId
    };

    if (supabase) {
      // Multi-tenant: Use Supabase
      console.log(`✅ [FORMS] Using Supabase for tenant: ${tenantId}`);

      // 🔐 SECURITY: Filter by tenantId to ensure multi-tenant isolation
      const { data: existing, error: searchError } = await supabase
        .from('form_templates')
        .select('*')
        .eq('name', templateData.name)
        .eq('tenant_id', tenantId)
        .eq('is_default', true)
        .maybeSingle();

      if (searchError && searchError.code !== 'PGRST116') {
        throw searchError;
      }

      if (existing) {
        console.log('✅ Template already exists for tenant');
        return res.status(201).json(existing);
      }

      // 🔐 SECURITY: Insert with tenantId
      const { data, error } = await supabase
        .from('form_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Template created successfully for tenant');
      return res.status(201).json(data);
    } else {
      // Local database
      console.log(`📝 Using local database for tenant: ${tenantId}`);

      // 🔐 SECURITY: Filter by tenantId
      const existing = await db.select()
        .from(formTemplates)
        .where(
          sql`${formTemplates.name} = ${templateData.name} AND ${formTemplates.tenantId} = ${tenantId}`
        )
        .limit(1);

      if (existing.length > 0) {
        console.log('✅ Template already exists locally');
        return res.status(201).json(existing[0]);
      }

      // 🔐 SECURITY: Insert with tenantId (schema requires it)
      const localTemplateData = {
        name: templateData.name,
        description: templateData.description,
        thumbnailUrl: templateData.thumbnail_url,
        isDefault: templateData.is_default,
        designConfig: templateData.design_config,
        questions: templateData.questions,
        tenantId: tenantId // 🔐 CRITICAL: Insert tenantId in local DB
      };

      const result = await db.insert(formTemplates).values(localTemplateData).returning();
      console.log('✅ Template created successfully locally with tenantId');
      return res.status(201).json(result[0]);
    }
  } catch (error: any) {
    console.error('❌ Error ensuring template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/formularios/forms/from-template/:templateId
 * Clones a form from a template
 * 🔐 SECURITY: requireTenant middleware ensures multi-tenant isolation
 */
router.post('/forms/from-template/:templateId', requireTenant, async (req, res) => {
  try {
    // 🔐 Extract and validate tenantId from authenticated session
    const tenantId = req.session?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: 'Sessão inválida - tenantId não encontrado',
        code: 'TENANT_ID_MISSING'
      });
    }

    const { templateId } = req.params;
    const { title, description, passingScore } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    console.log(`📝 [POST /forms/from-template/:templateId] Cloning form from template ${templateId} for tenant: ${tenantId}...`);

    const supabase = await getSupabaseClientForFormularios(req);

    if (supabase) {
      // Multi-tenant: Use Supabase
      console.log(`✅ [FORMS] Using Supabase for tenant: ${tenantId}`);

      // 🔐 SECURITY: Get template with tenantId filter
      const { data: template, error: templateError } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', templateId)
        .eq('tenant_id', tenantId)
        .single();

      if (templateError) {
        throw new Error(`Template not found or access denied: ${templateError.message}`);
      }

      // 🔐 SECURITY: Create new form with tenantId
      const newForm = {
        title: title,
        description: description || template.description,
        questions: template.questions,
        design_config: template.design_config,
        passing_score: passingScore || 0,
        score_tiers: null,
        tenant_id: tenantId // 🔐 CRITICAL: Include tenantId
      };

      const { data, error } = await supabase
        .from('forms')
        .insert(newForm)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Form cloned from template successfully');
      return res.status(201).json(data);
    } else {
      // Local database
      console.log(`📝 Using local database for tenant: ${tenantId}`);

      // 🔐 SECURITY: Filter template by tenantId
      const template = await db.select()
        .from(formTemplates)
        .where(
          sql`${formTemplates.id} = ${templateId} AND ${formTemplates.tenantId} = ${tenantId}`
        )
        .limit(1);

      if (template.length === 0) {
        throw new Error("Template not found or access denied");
      }

      // 🔐 SECURITY: Insert form with tenantId (schema requires it)
      const newForm = {
        title: title,
        description: description || template[0].description || undefined,
        questions: template[0].questions,
        designConfig: template[0].designConfig,
        passingScore: passingScore || 0,
        scoreTiers: null,
        tenantId: tenantId // 🔐 CRITICAL: Insert tenantId in local DB
      };

      const result = await db.insert(forms).values(newForm).returning();
      console.log('✅ Form cloned from template successfully with tenantId');
      return res.status(201).json(result[0]);
    }
  } catch (error: any) {
    console.error('❌ Error cloning form:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/formularios/forms/:formId/add-standard-fields
 * Adds standard fields to an existing form (prevents CPF/CNPJ duplication)
 * 🔐 SECURITY: requireTenant middleware ensures multi-tenant isolation
 */
router.post('/forms/:formId/add-standard-fields', requireTenant, async (req, res) => {
  try {
    // 🔐 Extract and validate tenantId from authenticated session
    const tenantId = req.session?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: 'Sessão inválida - tenantId não encontrado',
        code: 'TENANT_ID_MISSING'
      });
    }

    const { formId } = req.params;

    console.log(`📝 [POST /forms/:formId/add-standard-fields] Adding standard fields to form ${formId} for tenant: ${tenantId}...`);

    const supabase = await getSupabaseClientForFormularios(req);

    if (supabase) {
      // Multi-tenant: Use Supabase
      console.log(`✅ [FORMS] Using Supabase for tenant: ${tenantId}`);

      // 🔐 SECURITY: Get form with tenantId filter
      const { data: form, error: formError } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .eq('tenant_id', tenantId)
        .single();

      if (formError) {
        throw new Error(`Form not found or access denied: ${formError.message}`);
      }

      const existingQuestions = Array.isArray(form.questions) ? form.questions : [];

      // Get standard fields with unique IDs
      const nextId = existingQuestions.length + 1;
      const standardFields = getStandardFields(`q${nextId}_`);

      // Remove duplicate CPF/CNPJ fields
      const fieldsToAdd = removeDuplicateCpfCnpj(existingQuestions, standardFields);

      // Merge questions
      const updatedQuestions = [...existingQuestions, ...fieldsToAdd];

      // 🔐 SECURITY: Update with tenantId filter to prevent cross-tenant modification
      const { data: updatedForm, error: updateError } = await supabase
        .from('forms')
        .update({
          questions: updatedQuestions,
          updated_at: new Date().toISOString()
        })
        .eq('id', formId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      console.log(`✅ Added ${fieldsToAdd.length} standard fields to form`);
      return res.json(updatedForm);
    } else {
      // Local database
      console.log(`📝 Using local database for tenant: ${tenantId}`);

      // 🔐 SECURITY: Filter form by tenantId
      const formResult = await db.select()
        .from(forms)
        .where(
          sql`${forms.id} = ${formId} AND ${forms.tenantId} = ${tenantId}`
        )
        .limit(1);

      if (formResult.length === 0) {
        throw new Error("Form not found or access denied");
      }

      const form = formResult[0];
      const existingQuestions = Array.isArray(form.questions) ? form.questions as QuestionField[] : [];

      // Get standard fields with unique IDs
      const nextId = existingQuestions.length + 1;
      const standardFields = getStandardFields(`q${nextId}_`);

      // Remove duplicate CPF/CNPJ fields
      const fieldsToAdd = removeDuplicateCpfCnpj(existingQuestions, standardFields);

      // Merge questions
      const updatedQuestions = [...existingQuestions, ...fieldsToAdd];

      // 🔐 SECURITY: Update with tenantId filter to prevent cross-tenant modification
      const result = await db.update(forms)
        .set({
          questions: updatedQuestions as any,
          updatedAt: new Date()
        })
        .where(
          sql`${forms.id} = ${formId} AND ${forms.tenantId} = ${tenantId}`
        )
        .returning();

      console.log(`✅ Added ${fieldsToAdd.length} standard fields to form`);
      return res.json(result[0]);
    }
  } catch (error: any) {
    console.error('❌ Error adding standard fields:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
