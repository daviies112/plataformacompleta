/**
 * Template Seeder Service
 * 
 * 🔐 SECURITY: This service handles creation and management of form templates
 * with strict multi-tenant isolation support.
 * 
 * ⚠️ IMPORTANT: All functions require tenantId as first parameter
 * ❌ NEVER accept supabaseUrl/supabaseKey from external sources
 * ✅ ALWAYS filter by tenantId in all queries
 * ✅ ALWAYS insert tenantId in all create operations
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { convertKeysToCamelCase, convertKeysToSnakeCase, parseJsonbFields, stringifyJsonbFields } from "../utils/caseConverter.js";
import { STANDARD_REGISTRATION_FIELDS, DEFAULT_REGISTRATION_DESIGN_CONFIG, getStandardFields, removeDuplicateCpfCnpj, type QuestionField } from "./standardFields.js";
import { db } from "../db.js";
import { formTemplates, forms } from "../../../shared/db-schema.js";
import { sql } from "drizzle-orm";

/**
 * 🔐 SECURITY: Ensures a complete registration template exists for a tenant
 * Returns existing template or creates a new one
 * 
 * @param tenantId - MANDATORY tenant ID for multi-tenant isolation
 * @param supabase - OPTIONAL Supabase client (if null, uses local DB)
 */
export async function ensureCompleteRegistrationTemplate(
  tenantId: string,
  supabase?: SupabaseClient | null
): Promise<any> {
  if (!tenantId) {
    throw new Error("🔐 SECURITY: tenantId is required");
  }
  
  const templateData = {
    name: "Formulário Completo de Cadastro",
    description: "Template completo com todos os campos essenciais de cadastro de clientes (CPF/CNPJ, Nome, Email, Contato, Endereço, etc.)",
    thumbnailUrl: null,
    isDefault: true,
    designConfig: DEFAULT_REGISTRATION_DESIGN_CONFIG,
    questions: STANDARD_REGISTRATION_FIELDS
  };
  
  if (supabase) {
    // Multi-tenant: Use Supabase
    console.log(`🔐 [TEMPLATE SEEDER] Using Supabase for tenant: ${tenantId}`);
    
    // 🔐 SECURITY: Filter by tenantId AND name
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
      const camelData = convertKeysToCamelCase(existing);
      return parseJsonbFields(camelData, ['questions', 'designConfig']);
    }
    
    // 🔐 SECURITY: Create with tenantId
    const snakeData = convertKeysToSnakeCase({
      ...templateData,
      tenantId: tenantId // 🔐 CRITICAL: Always include tenantId
    });
    const stringifiedData = stringifyJsonbFields(snakeData, ['questions', 'design_config']);
    
    const { data, error } = await supabase
      .from('form_templates')
      .insert(stringifiedData)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Template created successfully for tenant');
    const camelData = convertKeysToCamelCase(data);
    return parseJsonbFields(camelData, ['questions', 'designConfig']);
    
  } else {
    // Local database
    console.log(`🔐 [TEMPLATE SEEDER] Using local database for tenant: ${tenantId}`);
    
    // 🔐 SECURITY: Filter by tenantId AND name
    const existing = await db.select()
      .from(formTemplates)
      .where(
        sql`${formTemplates.name} = ${templateData.name} AND ${formTemplates.tenantId} = ${tenantId}`
      )
      .limit(1);
    
    if (existing.length > 0) {
      console.log('✅ Template already exists locally');
      return existing[0];
    }
    
    // 🔐 SECURITY: Insert with tenantId (schema requires it)
    const result = await db.insert(formTemplates).values({
      ...templateData,
      tenantId: tenantId // 🔐 CRITICAL: Always insert tenantId
    }).returning();
    
    console.log('✅ Template created successfully locally with tenantId');
    return result[0];
  }
}

/**
 * 🔐 SECURITY: Clones a form from a template
 * Creates a new form with the template's questions and design
 * 
 * @param tenantId - MANDATORY tenant ID for multi-tenant isolation
 * @param templateId - Template ID to clone from
 * @param formData - Form data (title, description, passingScore)
 * @param supabase - OPTIONAL Supabase client (if null, uses local DB)
 */
export async function cloneFormFromTemplate(
  tenantId: string,
  templateId: string,
  formData: {
    title: string;
    description?: string;
    passingScore?: number;
  },
  supabase?: SupabaseClient | null
): Promise<any> {
  if (!tenantId) {
    throw new Error("🔐 SECURITY: tenantId is required");
  }
  
  if (supabase) {
    // Multi-tenant: Use Supabase
    console.log(`🔐 [TEMPLATE SEEDER] Cloning form for tenant: ${tenantId}`);
    
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
      title: formData.title,
      description: formData.description || template.description,
      questions: template.questions,
      design_config: template.design_config,
      passing_score: formData.passingScore || 0,
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
    const camelData = convertKeysToCamelCase(data);
    return parseJsonbFields(camelData, ['questions', 'designConfig', 'scoreTiers']);
    
  } else {
    // Local database
    console.log(`🔐 [TEMPLATE SEEDER] Using local database for tenant: ${tenantId}`);
    
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
      title: formData.title,
      description: formData.description || template[0].description || undefined,
      questions: template[0].questions,
      designConfig: template[0].designConfig,
      passingScore: formData.passingScore || 0,
      scoreTiers: null,
      tenantId: tenantId // 🔐 CRITICAL: Insert tenantId
    };
    
    const result = await db.insert(forms).values(newForm).returning();
    console.log('✅ Form cloned from template successfully with tenantId');
    return result[0];
  }
}

/**
 * 🔐 SECURITY: Adds standard fields to an existing form
 * Prevents duplication of CPF/CNPJ field if already present
 * 
 * @param tenantId - MANDATORY tenant ID for multi-tenant isolation
 * @param formId - Form ID to add fields to
 * @param supabase - OPTIONAL Supabase client (if null, uses local DB)
 */
export async function addStandardFieldsToForm(
  tenantId: string,
  formId: string,
  supabase?: SupabaseClient | null
): Promise<any> {
  if (!tenantId) {
    throw new Error("🔐 SECURITY: tenantId is required");
  }
  
  if (supabase) {
    // Multi-tenant: Use Supabase
    console.log(`🔐 [TEMPLATE SEEDER] Adding standard fields for tenant: ${tenantId}`);
    
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
    
    // 🔐 SECURITY: Update with tenantId filter
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
    const camelData = convertKeysToCamelCase(updatedForm);
    return parseJsonbFields(camelData, ['questions', 'designConfig', 'scoreTiers']);
    
  } else {
    // Local database
    console.log(`🔐 [TEMPLATE SEEDER] Using local database for tenant: ${tenantId}`);
    
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
    
    // 🔐 SECURITY: Update with tenantId filter
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
    return result[0];
  }
}
