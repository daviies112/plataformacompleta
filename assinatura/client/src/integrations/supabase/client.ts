/**
 * SUPABASE CLIENT INITIALIZATION
 * 
 * IMPORTANTE: Este arquivo é crítico para a funcionalidade do app!
 * 
 * 🔑 COMO FUNCIONA:
 * 1. React/Vite não consegue acessar REACT_APP_* vars (precisa VITE_*)
 * 2. O server tem acesso a process.env.REACT_APP_SUPABASE_*
 * 3. Solução: Endpoint /api/config/supabase fornece credenciais ao cliente
 * 
 * 📊 FLUXO:
 * App inicia → initializeSupabase()
 *   ↓
 * Tenta env vars locais (VITE_*)
 *   ↓
 * Se vazio → fetch GET /api/config/supabase
 *   ↓
 * Server retorna { url, key } de process.env
 *   ↓
 * Client cria Supabase instance
 *
 * 🐛 DEBUG:
 * - Se "Supabase not configured" no console → check /api/config/supabase
 * - Verificar: curl http://localhost:5000/api/config/supabase
 * - Se vazio → secrets não estão setados no servidor
 * 
 * 📝 NÃO DELETAR:
 * - async initializeSupabase() é chamado no module load
 * - Mock client é importante para rodar sem Supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.REACT_APP_SUPABASE_URL || '';
let SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

let supabase: SupabaseClient<Database>;

/**
 * Inicializa cliente Supabase
 * 
 * Estratégia:
 * 1. Tenta usar env vars locais (VITE_SUPABASE_*)
 * 2. Se vazio, faz fetch para /api/config/supabase
 * 3. Se conseguir credentials, cria client real
 * 4. Se não, cria mock client para evitar crashes
 */
async function initializeSupabase() {
  // PASSO 1: Se env vars não tem credenciais, busca do server
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    try {
      const response = await fetch('/api/config/supabase');
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      const config = await response.json();
      SUPABASE_URL = config.url;
      SUPABASE_PUBLISHABLE_KEY = config.key;
      
      if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
        console.info('✅ Supabase credentials loaded from server');
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch Supabase config:', error);
      // Continua mesmo se falhar (usará mock client)
    }
  }

  // PASSO 2: Se tem credentials, cria client real
  if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
    supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  } else {
    // PASSO 3: Sem credentials, usa mock client (não quebra a app)
    console.warn('⚠️ Supabase not configured - using mock client for offline mode');
    
    // Mock client retorna dados vazios mas não causa erros
    supabase = {
      from: () => ({
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }), order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
      }),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
    } as unknown as SupabaseClient<Database>;
  }
}

// Inicializa ao carregar este módulo
initializeSupabase();

export { supabase };