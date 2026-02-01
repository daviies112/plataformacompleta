/**
 * 🚀 SUPABASE AUTO-CONNECT
 * 
 * Sistema automatizado que:
 * 1. Valida credenciais do Supabase (BANCO PRIMEIRO, depois secrets)
 * 2. Conecta automaticamente em todas as 12 tabelas
 * 3. Verifica permissões e estrutura
 * 4. Economiza créditos fazendo tudo de forma automática
 * 
 * Prioridade de credenciais:
 * 1. Banco de dados (supabase_config)
 * 2. Secrets do Replit (fallback)
 * 3. null (não configurado)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Logger simples (console.log com prefixo)
const log = (message: string) => {
  console.log(`[SUPABASE-AUTO] ${message}`);
};

// Tabelas que devem ser conectadas automaticamente
const REQUIRED_TABLES = [
  // WORKSPACE (3 tabelas)
  { name: 'workspace_pages', module: 'Workspace', required: true },
  { name: 'workspace_databases', module: 'Workspace', required: true },
  { name: 'workspace_boards', module: 'Workspace', required: true },
  
  // FORMULÁRIOS (2 tabelas)
  { name: 'forms', module: 'Formulários', required: true },
  { name: 'form_submissions', module: 'Formulários', required: true },
  
  // PRODUTO (5 tabelas)
  { name: 'products', module: 'Produto', required: false },
  { name: 'suppliers', module: 'Produto', required: false },
  { name: 'resellers', module: 'Produto', required: false },
  { name: 'categories', module: 'Produto', required: false },
  { name: 'print_queue', module: 'Produto', required: false },
  
  // FATURAMENTO (1 tabela)
  { name: 'files', module: 'Faturamento', required: false },
  
  // DASHBOARD (1 tabela - legacy)
  { name: 'clientes_completos', module: 'Dashboard', required: false },
];

interface ConnectionResult {
  success: boolean;
  url: string;
  tablesConnected: string[];
  tablesMissing: string[];
  errors: string[];
}

let globalSupabaseClient: SupabaseClient | null = null;

/**
 * Obtém ou cria o cliente global do Supabase
 */
export function getGlobalSupabaseClient(): SupabaseClient | null {
  return globalSupabaseClient;
}

/**
 * Valida e extrai credenciais do Supabase
 * 
 * SYSTEM-LEVEL: Usa apenas environment variables (não DB) para evitar dependência de tenantId
 * Prioridade:
 * 1. Secrets do Replit (process.env)
 * 2. null (não configurado)
 */
async function getSupabaseCredentials(): Promise<{ url: string; anonKey: string; source: string } | null> {
  // SYSTEM-LEVEL: Usar environment variables (prioridade para REACT_APP_)
  // Fallback independente para cada variável, com trim() para remover espaços
  let supabaseUrl = (process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  let supabaseAnonKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  
  // Validar formato da URL
  if (!supabaseUrl.startsWith('http')) {
    log('❌ SUPABASE_URL dos Secrets inválida - deve começar com http:// ou https://');
    return null;
  }
  
  // Validar que a chave não está vazia
  if (supabaseAnonKey.length < 20) {
    log('❌ SUPABASE_ANON_KEY dos Secrets inválida - chave muito curta');
    return null;
  }
  
  log('✅ Credenciais carregadas dos SECRETS (system-level)');
  return { url: supabaseUrl, anonKey: supabaseAnonKey, source: 'secrets' };
}

/**
 * Testa conexão com uma tabela específica
 */
async function testTableConnection(
  client: SupabaseClient,
  tableName: string
): Promise<boolean> {
  try {
    const { error, count } = await client
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      // Se a tabela não existe ou não tem permissão, retorna false
      if (error.code === 'PGRST116' || error.message.includes('not found')) {
        return false;
      }
      log(`⚠️  Tabela '${tableName}': ${error.message}`);
      return false;
    }
    
    // log(`✅ Tabela '${tableName}': ${count ?? 0} registros`);
    return true;
  } catch (error: any) {
    log(`❌ Erro ao testar tabela '${tableName}': ${error.message}`);
    return false;
  }
}

/**
 * 🚀 AUTO-CONECTA ao Supabase e verifica todas as tabelas
 * 
 * Chamado automaticamente no startup do servidor
 * Retorna resultado detalhado da conexão
 */
export async function autoConnectSupabase(): Promise<ConnectionResult> {
  log('🔌 Iniciando auto-conexão com Supabase...');
  
  const result: ConnectionResult = {
    success: false,
    url: '',
    tablesConnected: [],
    tablesMissing: [],
    errors: [],
  };
  
  // 1. Validar credenciais (banco primeiro, depois secrets)
  const credentials = await getSupabaseCredentials();
  
  if (!credentials) {
    result.errors.push('Credenciais não encontradas');
    log('⚠️  Supabase não configurado em nenhum lugar!');
    log('   Configure no banco de dados (supabase_config) OU nos Replit Secrets');
    log('   Secrets: REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY');
    return result;
  }
  
  result.url = credentials.url;
  log(`✅ Credenciais obtidas de: ${credentials.source === 'database' ? 'BANCO DE DADOS' : 'Secrets (fallback)'}`);
  log(`🌐 URL: ${credentials.url}`);
  
  // 2. Criar cliente global
  try {
    globalSupabaseClient = createClient(credentials.url, credentials.anonKey);
    log('✅ Cliente Supabase criado');
  } catch (error: any) {
    result.errors.push(`Erro ao criar cliente: ${error.message}`);
    log(`❌ Erro ao criar cliente Supabase: ${error.message}`);
    return result;
  }
  
  // 3. Pular teste de autenticação e ir direto para as tabelas reais
  log('✅ Cliente pronto - testando tabelas reais...');
  
  // 4. Verificar todas as tabelas
  log('📊 Verificando tabelas...');
  
  const tablesByModule = new Map<string, { connected: string[], missing: string[] }>();
  
  for (const table of REQUIRED_TABLES) {
    const isConnected = await testTableConnection(globalSupabaseClient, table.name);
    
    if (!tablesByModule.has(table.module)) {
      tablesByModule.set(table.module, { connected: [], missing: [] });
    }
    
    const moduleData = tablesByModule.get(table.module)!;
    
    if (isConnected) {
      result.tablesConnected.push(table.name);
      moduleData.connected.push(table.name);
    } else {
      result.tablesMissing.push(table.name);
      moduleData.missing.push(table.name);
      
      if (table.required) {
        result.errors.push(`Tabela obrigatória '${table.name}' não encontrada`);
      }
    }
  }
  
  // 5. Relatório por módulo
  log('');
  log('╔════════════════════════════════════════╗');
  log('║  📊 SUPABASE AUTO-CONNECT - RESUMO   ║');
  log('╚════════════════════════════════════════╝');
  log(`🌐 URL: ${credentials.url}`);
  log(`📊 Tabelas conectadas: ${result.tablesConnected.length}/${REQUIRED_TABLES.length}`);
  log('');
  
  for (const [module, data] of tablesByModule.entries()) {
    const total = data.connected.length + data.missing.length;
    const status = data.missing.length === 0 ? '✅' : data.connected.length > 0 ? '⚠️' : '❌';
    log(`${status} ${module}: ${data.connected.length}/${total} tabelas`);
    
    if (data.connected.length > 0) {
      log(`   ✅ Conectadas: ${data.connected.join(', ')}`);
    }
    if (data.missing.length > 0) {
      log(`   ⚠️  Faltando: ${data.missing.join(', ')}`);
    }
  }
  
  log('────────────────────────────────────────');
  
  // 6. Resultado final
  result.success = result.tablesConnected.length > 0;
  
  if (result.success) {
    log('✅ Supabase conectado com sucesso!');
    if (result.tablesMissing.length > 0) {
      log(`⚠️  ${result.tablesMissing.length} tabelas não encontradas - crie-as usando supabase-complete-schema.sql`);
    }
  } else {
    log('❌ Falha ao conectar ao Supabase');
  }
  
  log('');
  
  return result;
}

/**
 * Verifica se o Supabase está configurado
 */
export function isSupabaseConfigured(): boolean {
  return globalSupabaseClient !== null;
}

/**
 * Obtém resumo da conexão atual
 */
export function getConnectionSummary(): string {
  if (!globalSupabaseClient) {
    return 'Supabase não configurado';
  }
  
  return 'Supabase conectado (veja logs de startup para detalhes da fonte)';
}
