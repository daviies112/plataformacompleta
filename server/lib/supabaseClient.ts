import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseCredentialsFromEnv as getSupabaseCredentialsFromDb } from './credentialsDb.js';

let cachedSupabaseClient: SupabaseClient | null = null;
let cachedCredentials: { url: string; key: string } | null = null;

/**
 * Obtém cliente Supabase dinâmico
 * 
 * Ordem de prioridade:
 * 1. Credenciais passadas como parâmetros (supabaseUrl, supabaseKey)
 * 2. Credenciais da tabela supabase_config no banco de dados (criptografadas)
 * 3. null (fallback para PostgreSQL local)
 * 
 * @param supabaseUrl - URL do Supabase (opcional, para compatibilidade com headers)
 * @param supabaseKey - Chave anônima do Supabase (opcional, para compatibilidade com headers)
 * @returns Cliente Supabase ou null se não configurado
 */
export async function getSupabaseClient(
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<SupabaseClient | null> {
  // Se headers foram fornecidos, use-os (para compatibilidade)
  if (supabaseUrl && supabaseKey) {
    if (
      cachedSupabaseClient &&
      cachedCredentials &&
      cachedCredentials.url === supabaseUrl &&
      cachedCredentials.key === supabaseKey
    ) {
      console.log('✅ [SUPABASE] Usando cliente em cache (headers)');
      return cachedSupabaseClient;
    }

    try {
      console.log('🔄 [SUPABASE] Criando novo cliente com headers...');
      cachedSupabaseClient = createClient(supabaseUrl, supabaseKey);
      cachedCredentials = { url: supabaseUrl, key: supabaseKey };
      console.log('✅ [SUPABASE] Cliente criado com sucesso:', supabaseUrl);
      return cachedSupabaseClient;
    } catch (error) {
      console.error('❌ [SUPABASE] Erro ao criar cliente:', error);
      return null;
    }
  }

  // Se não foram fornecidos headers, busca do banco de dados (supabase_config)
  try {
    console.log('🔍 [SUPABASE] Buscando credenciais do banco de dados (supabase_config)...');
    const credentials = await getSupabaseCredentialsFromDb();
    
    if (!credentials) {
      console.error('❌ [SUPABASE] Credenciais não encontradas no banco de dados (supabase_config)');
      console.error('❌ [SUPABASE] Configure as credenciais através da interface de administração em /configuracoes');
      return null;
    }
    
    const dbUrl = credentials.url;
    const dbKey = credentials.anonKey;
    console.log('✅ [SUPABASE] Credenciais carregadas e descriptografadas do banco de dados');

    // Verifica se pode usar o cache
    if (
      cachedSupabaseClient &&
      cachedCredentials &&
      cachedCredentials.url === dbUrl &&
      cachedCredentials.key === dbKey
    ) {
      console.log('✅ [SUPABASE] Usando cliente em cache (banco)');
      return cachedSupabaseClient;
    }

    console.log('🔄 [SUPABASE] Criando novo cliente com credenciais do banco...');
    cachedSupabaseClient = createClient(dbUrl, dbKey);
    cachedCredentials = { url: dbUrl, key: dbKey };
    console.log('✅ [SUPABASE] Cliente criado com sucesso:', dbUrl);
    return cachedSupabaseClient;
  } catch (error) {
    console.error('❌ [SUPABASE] Erro ao buscar/criar cliente:', error);
    return null;
  }
}

/**
 * Limpa o cache do cliente Supabase
 * Use quando as credenciais forem atualizadas na UI
 */
export function clearSupabaseCache() {
  cachedSupabaseClient = null;
  cachedCredentials = null;
  console.log('🗑️ [SUPABASE] Cache do cliente limpo');
}

/**
 * Alias para compatibilidade com código existente
 * @deprecated Use getSupabaseClient() instead
 */
export const getDynamicSupabaseClient = getSupabaseClient;
