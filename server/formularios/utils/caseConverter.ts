export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function convertKeysToSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToSnakeCase(item));
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const snakeKey = toSnakeCase(key);
        converted[snakeKey] = convertKeysToSnakeCase(obj[key]);
      }
    }
    return converted;
  }
  
  return obj;
}

export function convertKeysToCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamelCase(item));
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const camelKey = toCamelCase(key);
        converted[camelKey] = convertKeysToCamelCase(obj[key]);
      }
    }
    return converted;
  }
  
  return obj;
}

export function parseJsonbFields(obj: any, fields: string[]): any {
  const parsed = { ...obj };
  
  for (const field of fields) {
    if (parsed[field] && typeof parsed[field] === 'string') {
      try {
        const jsonData = JSON.parse(parsed[field]);
        parsed[field] = convertKeysToCamelCase(jsonData);
      } catch (e) {
        console.error(`Error parsing JSONB field ${field}:`, e);
      }
    } else if (parsed[field] && typeof parsed[field] === 'object') {
      parsed[field] = convertKeysToCamelCase(parsed[field]);
    }
  }
  
  return parsed;
}

export function stringifyJsonbFields(obj: any, fields: string[]): any {
  const stringified = { ...obj };
  
  for (const field of fields) {
    if (stringified[field] && typeof stringified[field] === 'object') {
      stringified[field] = JSON.stringify(stringified[field]);
    }
  }
  
  return stringified;
}

/**
 * Mapeia TODOS os campos do frontend para colunas válidas do Supabase forms table
 * Esta função é CRÍTICA para garantir que todos os dados sejam salvos corretamente
 * 
 * Colunas Supabase forms:
 * - id, title, description
 * - welcome_title, welcome_message (extraídos de welcomeConfig)
 * - questions (JSONB - elementos do formulário)
 * - passing_score
 * - score_tiers (JSONB)
 * - design_config (JSONB - inclui welcomeScreen config extras)
 * - completion_page_id (FK - não usar completion_page_config diretamente)
 * - slug, status, tags, is_public
 * - created_at, updated_at
 */
export function mapFormDataToSupabase(frontendData: any): Record<string, any> {
  const mapped: Record<string, any> = {};
  
  // Campos diretos (1:1 mapping)
  if (frontendData.title !== undefined) {
    mapped.title = frontendData.title;
  }
  if (frontendData.description !== undefined) {
    mapped.description = frontendData.description;
  }
  if (frontendData.passingScore !== undefined) {
    mapped.passing_score = frontendData.passingScore;
  }
  if (frontendData.passing_score !== undefined) {
    mapped.passing_score = frontendData.passing_score;
  }
  if (frontendData.slug !== undefined) {
    mapped.slug = frontendData.slug;
  }
  if (frontendData.status !== undefined) {
    mapped.status = frontendData.status;
  }
  if (frontendData.isPublic !== undefined) {
    mapped.is_public = frontendData.isPublic;
  }
  if (frontendData.is_public !== undefined) {
    mapped.is_public = frontendData.is_public;
  }
  if (frontendData.completionPageId !== undefined) {
    mapped.completion_page_id = frontendData.completionPageId;
  }
  if (frontendData.completion_page_id !== undefined) {
    mapped.completion_page_id = frontendData.completion_page_id;
  }
  
  // Questions/Elements → questions JSONB
  if (frontendData.questions !== undefined) {
    mapped.questions = frontendData.questions;
  }
  if (frontendData.elements !== undefined) {
    mapped.questions = frontendData.elements;
  }
  
  // Score Tiers → score_tiers JSONB
  if (frontendData.scoreTiers !== undefined) {
    mapped.score_tiers = frontendData.scoreTiers;
  }
  if (frontendData.score_tiers !== undefined) {
    mapped.score_tiers = frontendData.score_tiers;
  }
  
  // Tags → tags JSONB
  if (frontendData.tags !== undefined) {
    mapped.tags = frontendData.tags;
  }
  
  // =====================================================
  // WELCOME CONFIG - Extrair para colunas separadas
  // welcomeConfig: { title, description, buttonText, logo, logoAlign, titleSize, extendedDescription }
  // =====================================================
  const welcomeConfig = frontendData.welcomeConfig || frontendData.welcome_config;
  if (welcomeConfig) {
    // welcome_title e welcome_message são colunas separadas
    if (welcomeConfig.title !== undefined) {
      mapped.welcome_title = welcomeConfig.title;
    }
    if (welcomeConfig.description !== undefined) {
      mapped.welcome_message = welcomeConfig.description;
    }
  }
  
  // Também aceitar campos legados diretos
  if (frontendData.welcomeTitle !== undefined) {
    mapped.welcome_title = frontendData.welcomeTitle;
  }
  if (frontendData.welcome_title !== undefined) {
    mapped.welcome_title = frontendData.welcome_title;
  }
  if (frontendData.welcomeMessage !== undefined) {
    mapped.welcome_message = frontendData.welcomeMessage;
  }
  if (frontendData.welcome_message !== undefined) {
    mapped.welcome_message = frontendData.welcome_message;
  }
  
  // =====================================================
  // DESIGN CONFIG - Incluir configurações extras do welcome
  // design_config: { colors, typography, logo, spacing, welcomeScreen: {...} }
  // =====================================================
  let designConfig = frontendData.designConfig || frontendData.design_config || {};
  
  // Garantir que designConfig é um objeto
  if (typeof designConfig === 'string') {
    try {
      designConfig = JSON.parse(designConfig);
    } catch (e) {
      designConfig = {};
    }
  }
  
  // Armazenar configurações extras do welcome no design_config
  if (welcomeConfig) {
    const welcomeScreenConfig: Record<string, any> = {};
    
    if (welcomeConfig.buttonText !== undefined) {
      welcomeScreenConfig.buttonText = welcomeConfig.buttonText;
    }
    if (welcomeConfig.button_text !== undefined) {
      welcomeScreenConfig.buttonText = welcomeConfig.button_text;
    }
    if (welcomeConfig.logo !== undefined) {
      welcomeScreenConfig.logo = welcomeConfig.logo;
    }
    if (welcomeConfig.logoAlign !== undefined) {
      welcomeScreenConfig.logoAlign = welcomeConfig.logoAlign;
    }
    if (welcomeConfig.logo_align !== undefined) {
      welcomeScreenConfig.logoAlign = welcomeConfig.logo_align;
    }
    if (welcomeConfig.titleSize !== undefined) {
      welcomeScreenConfig.titleSize = welcomeConfig.titleSize;
    }
    if (welcomeConfig.title_size !== undefined) {
      welcomeScreenConfig.titleSize = welcomeConfig.title_size;
    }
    if (welcomeConfig.extendedDescription !== undefined) {
      welcomeScreenConfig.extendedDescription = welcomeConfig.extendedDescription;
    }
    if (welcomeConfig.extended_description !== undefined) {
      welcomeScreenConfig.extendedDescription = welcomeConfig.extended_description;
    }
    
    // Só adiciona welcomeScreen se tiver algum campo
    if (Object.keys(welcomeScreenConfig).length > 0) {
      designConfig = {
        ...designConfig,
        welcomeScreen: welcomeScreenConfig
      };
    }
  }
  
  // =====================================================
  // COMPLETION PAGE CONFIG - Armazenar no design_config
  // Já que Supabase usa completion_page_id (FK), guardamos config inline no design
  // =====================================================
  const completionConfig = frontendData.completionPageConfig || frontendData.completion_page_config;
  if (completionConfig) {
    designConfig = {
      ...designConfig,
      completionPage: completionConfig
    };
  }
  
  // Se temos algo no designConfig, incluir
  if (Object.keys(designConfig).length > 0) {
    mapped.design_config = designConfig;
  }
  
  // Sempre atualizar updated_at
  mapped.updated_at = new Date().toISOString();
  
  return mapped;
}

/**
 * Lista de campos válidos para a tabela forms do Supabase
 * Usada para validação final antes de enviar
 */
export const SUPABASE_FORMS_VALID_FIELDS = [
  'title', 
  'description', 
  'welcome_title', 
  'welcome_message',
  'questions', 
  'passing_score', 
  'score_tiers', 
  'design_config',
  'completion_page_id', 
  'is_public', 
  'slug', 
  'status', 
  'tags', 
  'updated_at'
];

/**
 * Reconstrói os dados do formulário do Supabase para o formato esperado pelo frontend
 * Esta função é o INVERSO de mapFormDataToSupabase
 * 
 * Supabase → Frontend:
 * - welcome_title, welcome_message → welcomeConfig.title, welcomeConfig.description
 * - design_config.welcomeScreen → welcomeConfig (buttonText, logo, logoAlign, etc.)
 * - design_config.completionPage → completionPageConfig
 * - questions → questions/elements
 * 
 * IMPORTANTE: Esta função também REMOVE campos internos (welcomeTitle, welcomeMessage)
 * do resultado para evitar conflitos em round-trips de dados.
 */
export function reconstructFormDataFromSupabase(supabaseData: any): Record<string, any> {
  // Start with camelCase converted data
  const result: Record<string, any> = { ...supabaseData };
  
  // Get designConfig for nested properties
  const designConfig = supabaseData.designConfig || supabaseData.design_config || {};
  const welcomeScreen = designConfig.welcomeScreen || designConfig.welcome_screen || {};
  
  // =====================================================
  // RECONSTRUCT WELCOME CONFIG
  // Combinar welcome_title/welcome_message com welcomeScreen extras
  // =====================================================
  const welcomeConfig: Record<string, any> = {};
  
  // Get title and description from welcome_title/welcome_message (camelCase: welcomeTitle/welcomeMessage)
  const welcomeTitle = supabaseData.welcomeTitle ?? supabaseData.welcome_title;
  const welcomeMessage = supabaseData.welcomeMessage ?? supabaseData.welcome_message;
  
  if (welcomeTitle !== undefined && welcomeTitle !== null) {
    welcomeConfig.title = welcomeTitle;
  }
  if (welcomeMessage !== undefined && welcomeMessage !== null) {
    welcomeConfig.description = welcomeMessage;
  }
  
  // Merge welcomeScreen properties into welcomeConfig
  if (welcomeScreen.buttonText !== undefined) {
    welcomeConfig.buttonText = welcomeScreen.buttonText;
  }
  if (welcomeScreen.logo !== undefined) {
    welcomeConfig.logo = welcomeScreen.logo;
  }
  if (welcomeScreen.logoAlign !== undefined) {
    welcomeConfig.logoAlign = welcomeScreen.logoAlign;
  }
  if (welcomeScreen.titleSize !== undefined) {
    welcomeConfig.titleSize = welcomeScreen.titleSize;
  }
  if (welcomeScreen.extendedDescription !== undefined) {
    welcomeConfig.extendedDescription = welcomeScreen.extendedDescription;
  }
  
  // Always add welcomeConfig if it has any content
  // This ensures the frontend always has the expected structure
  if (Object.keys(welcomeConfig).length > 0) {
    result.welcomeConfig = welcomeConfig;
  }
  
  // =====================================================
  // RECONSTRUCT COMPLETION PAGE CONFIG
  // =====================================================
  const completionPage = designConfig.completionPage || designConfig.completion_page;
  if (completionPage && Object.keys(completionPage).length > 0) {
    result.completionPageConfig = completionPage;
  }
  
  // =====================================================
  // CLEAN UP: Remove internal storage fields from response
  // to avoid conflicts in round-trips
  // =====================================================
  
  // Remove welcomeTitle/welcomeMessage as they're now in welcomeConfig
  delete result.welcomeTitle;
  delete result.welcomeMessage;
  delete result.welcome_title;
  delete result.welcome_message;
  
  // Clean up designConfig - remove internal nested structures
  if (result.designConfig) {
    const cleanDesignConfig = { ...result.designConfig };
    delete cleanDesignConfig.welcomeScreen;
    delete cleanDesignConfig.welcome_screen;
    delete cleanDesignConfig.completionPage;
    delete cleanDesignConfig.completion_page;
    
    // Keep designConfig with remaining properties
    result.designConfig = cleanDesignConfig;
  }
  
  return result;
}
