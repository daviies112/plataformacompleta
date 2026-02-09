import { createClient } from '@supabase/supabase-js';

let supabaseClient: any = null;
let supabasePromise: Promise<any> | null = null;

export let supabase: any = null;

/**
 * Check if current path is a public route that doesn't need Supabase
 * Returns true for routes that should skip Supabase initialization
 */
function isPublicRoute(): boolean {
  if (typeof window === 'undefined') return false;
  
  const path = window.location.pathname;
  return (
    path.startsWith('/reuniao/') ||
    path.startsWith('/reuniao-publica/') ||
    path.startsWith('/assinar/') ||
    path.startsWith('/f/') ||
    path.startsWith('/form/') ||
    path.startsWith('/formulario/') ||
    path.startsWith('/loja/') ||
    path.startsWith('/checkout/') ||
    /^\/[^/]+\/form\//.test(path) ||
    /^\/[^/]+\/[a-z0-9-]+$/.test(path) // company/roomId pattern
  );
}

/**
 * Fetch with minimal retry - optimized for fast fallback
 * Only retries once on 5xx errors, returns null immediately otherwise
 */
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 300
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = baseDelay * attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const result = await fn();
      return result;
      
    } catch (error) {
      lastError = error as Error;
      if (attempt >= maxRetries - 1) {
        break;
      }
    }
  }
  
  throw lastError || new Error('Failed to fetch Supabase credentials');
}

/**
 * Fetches Supabase credentials from backend API
 * Optimized for fast return - no blocking retries for public routes
 * 
 * IMPORTANT: Returns null IMMEDIATELY for:
 * - Public routes (no API call made at all)
 * - 401 (not authenticated) - normal for public routes
 * - 4xx errors - client errors, no retry needed
 * - Empty credentials - Supabase not configured
 * 
 * Only retries once on 5xx (server errors)
 */
async function fetchSupabaseConfig() {
  // Skip API call entirely for public routes - they don't need Supabase
  if (isPublicRoute()) {
    return null;
  }
  
  try {
    return await fetchWithRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      try {
        const response = await fetch('/api/config/supabase/credentials', {
          signal: controller.signal,
          credentials: 'include'
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          if (response.status >= 500) {
            throw new Error(`Server error ${response.status}`);
          }
          return null;
        }
        
        const data = await response.json();
        
        if (data.success && data.credentials?.url && data.credentials?.anonKey) {
          console.log('✅ Credenciais Supabase carregadas da API (runtime)');
          return {
            url: data.credentials.url,
            anonKey: data.credentials.anonKey
          };
        }
        
        return null;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          console.log('[Supabase] Timeout - retornando null');
          return null;
        }
        throw error;
      }
    }, 2, 300);
    
  } catch (error) {
    console.log('[Supabase] No credentials provided. Using stub client.');
    return null;
  }
}

export function clearSupabaseCache() {
  supabaseClient = null;
  supabase = null;
  supabasePromise = null;
}

export async function reloadSupabaseCredentials(): Promise<boolean> {
  clearSupabaseCache();
  
  try {
    const client = await getSupabaseClient();
    return client !== null;
  } catch (error) {
    return false;
  }
}

export async function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (supabasePromise) {
    return supabasePromise;
  }

  supabasePromise = (async () => {
    try {
      const apiCreds = await fetchSupabaseConfig();
      
      if (!apiCreds) {
        supabaseClient = null;
        supabase = null;
        supabasePromise = null;
        return null;
      }

      const { url: supabaseUrl, anonKey: supabaseAnonKey } = apiCreds;

      try {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
        supabase = supabaseClient;
        return supabaseClient;
      } catch (error) {
        supabaseClient = null;
        supabase = null;
        supabasePromise = null;
        return null;
      }
    } catch (error) {
      supabaseClient = null;
      supabase = null;
      supabasePromise = null;
      return null;
    }
  })();

  return supabasePromise;
}

export interface DashboardCompleteV5 {
  telefone: string;
  nome_completo: string;
  email_principal: string;
  status_atendimento: string;
  setor_atual: string | null;
  ativo: boolean | null;
  tipo_reuniao_atual: string | null;
  primeiro_contato: string;
  ultimo_contato: string;
  total_registros: number;
  registros_dados_cliente: number;
  total_mensagens_chat: number;
  total_transcricoes: number;
  fontes_dados: number;
  tem_dados_cliente: boolean;
  tem_historico_chat: boolean;
  tem_transcricoes: boolean;
  ultima_atividade: string;
  id_reuniao_atual: string | null;
  ultima_transcricao: string;
  mensagens_cliente: string;
  mensagens_agente: string;
  todas_mensagens_chat?: string;
  primeira_mensagem?: string;
  ultima_mensagem?: string;
  ultima_transcricao_completa?: string;
  ultimo_resumo_estruturado?: string;
}
