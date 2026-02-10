import { createClient } from '@supabase/supabase-js';

/**
 * Lista das 12 tabelas do Supabase organizadas por módulo
 */
export const SUPABASE_TABLES = {
  workspace: ['workspace_pages', 'workspace_databases', 'workspace_boards'],
  forms: ['forms', 'form_submissions'],
  produto: ['products', 'suppliers', 'resellers', 'categories', 'print_queue'],
  billing: ['files'],
  dashboard: ['clientes_completos']
} as const;

/**
 * Lista plana de todas as tabelas para fácil iteração
 */
export const ALL_TABLES = [
  ...SUPABASE_TABLES.workspace,
  ...SUPABASE_TABLES.forms,
  ...SUPABASE_TABLES.produto,
  ...SUPABASE_TABLES.billing,
  ...SUPABASE_TABLES.dashboard
];

export interface TableStatus {
  name: string;
  exists: boolean;
  accessible: boolean;
  error?: string;
  module: string;
}

export interface SupabaseConnectionResult {
  connected: boolean;
  url?: string;
  totalTables: number;
  tablesFound: number;
  tablesMissing: number;
  tables: TableStatus[];
  error?: string;
}

/**
 * Verifica a conexão com o Supabase e testa todas as 12 tabelas
 * 
 * SYSTEM-LEVEL: Usa apenas environment variables (não DB)
 */
export async function verifySupabaseTables(): Promise<SupabaseConnectionResult> {
  // SYSTEM-LEVEL: Usar apenas environment variables (REACT_APP_ tem prioridade)
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  // Verificar se credenciais estão configuradas
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      connected: false,
      totalTables: ALL_TABLES.length,
      tablesFound: 0,
      tablesMissing: ALL_TABLES.length,
      tables: [],
      error: 'Credenciais do Supabase não configuradas. Configure nos Replit Secrets (REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY).'
    };
  }
  
  console.log(`[SUPABASE-VERIFY] Usando credenciais do environment: ${supabaseUrl}`);

  try {
    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Testar conexão básica
    const { error: healthError } = await supabase.from('workspace_pages').select('count', { count: 'exact', head: true });
    
    // Se der erro de autenticação, retornar erro
    if (healthError && healthError.message.includes('JWT')) {
      return {
        connected: false,
        url: supabaseUrl,
        totalTables: ALL_TABLES.length,
        tablesFound: 0,
        tablesMissing: ALL_TABLES.length,
        tables: [],
        error: 'Erro de autenticação: Verifique se a REACT_APP_SUPABASE_ANON_KEY está correta'
      };
    }

    // Verificar cada tabela
    const tableStatuses: TableStatus[] = [];
    let tablesFound = 0;
    let tablesMissing = 0;

    for (const [module, tables] of Object.entries(SUPABASE_TABLES)) {
      for (const tableName of tables) {
        try {
          // Tentar fazer um count na tabela (mais leve que SELECT)
          const { error, count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          if (error) {
            // Tabela não existe ou não é acessível
            tableStatuses.push({
              name: tableName,
              exists: false,
              accessible: false,
              error: error.message,
              module
            });
            tablesMissing++;
          } else {
            // Tabela existe e é acessível
            tableStatuses.push({
              name: tableName,
              exists: true,
              accessible: true,
              module
            });
            tablesFound++;
          }
        } catch (err) {
          tableStatuses.push({
            name: tableName,
            exists: false,
            accessible: false,
            error: err instanceof Error ? err.message : 'Erro desconhecido',
            module
          });
          tablesMissing++;
        }
      }
    }

    return {
      connected: true,
      url: supabaseUrl,
      totalTables: ALL_TABLES.length,
      tablesFound,
      tablesMissing,
      tables: tableStatuses
    };

  } catch (error) {
    return {
      connected: false,
      url: supabaseUrl,
      totalTables: ALL_TABLES.length,
      tablesFound: 0,
      tablesMissing: ALL_TABLES.length,
      tables: [],
      error: error instanceof Error ? error.message : 'Erro ao conectar com Supabase'
    };
  }
}

/**
 * Formata o resultado da verificação para exibição no console
 */
export function formatVerificationResult(result: SupabaseConnectionResult): string {
  const lines: string[] = [];
  
  lines.push('');
  lines.push('╔════════════════════════════════════════════════════════════════╗');
  lines.push('║  🔍 VERIFICAÇÃO AUTOMÁTICA DO SUPABASE                        ║');
  lines.push('╚════════════════════════════════════════════════════════════════╝');
  lines.push('');

  if (!result.connected) {
    lines.push(`❌ Conexão: FALHOU`);
    lines.push(`   Erro: ${result.error}`);
    lines.push('');
    lines.push('📝 Para configurar o Supabase:');
    lines.push('   1. Configure os Replit Secrets:');
    lines.push('      - REACT_APP_SUPABASE_URL');
    lines.push('      - REACT_APP_SUPABASE_ANON_KEY');
    lines.push('   2. Crie as tabelas usando: supabase-complete-schema.sql');
    lines.push('   3. Reinicie o servidor');
    return lines.join('\n');
  }

  lines.push(`✅ Conexão: ESTABELECIDA`);
  lines.push(`🌐 URL: ${result.url}`);
  lines.push(`📊 Status: ${result.tablesFound}/${result.totalTables} tabelas encontradas`);
  lines.push('');

  // Agrupar por módulo
  const modules = ['workspace', 'forms', 'produto', 'billing', 'dashboard'];
  
  for (const module of modules) {
    const moduleTables = result.tables.filter(t => t.module === module);
    const moduleFound = moduleTables.filter(t => t.accessible).length;
    const moduleTotal = moduleTables.length;
    
    const moduleStatus = moduleFound === moduleTotal ? '✅' : moduleFound > 0 ? '⚠️' : '❌';
    const moduleName = module.toUpperCase();
    
    lines.push(`${moduleStatus} ${moduleName} (${moduleFound}/${moduleTotal}):`);
    
    for (const table of moduleTables) {
      const icon = table.accessible ? '  ✅' : '  ❌';
      const status = table.accessible ? 'OK' : `FALTANDO (${table.error?.substring(0, 30)}...)`;
      lines.push(`${icon} ${table.name.padEnd(30)} ${status}`);
    }
    lines.push('');
  }

  if (result.tablesMissing > 0) {
    lines.push('⚠️  ATENÇÃO: Algumas tabelas não foram encontradas!');
    lines.push('');
    lines.push('📝 Para criar as tabelas faltantes:');
    lines.push('   1. Acesse o Supabase: https://app.supabase.com/');
    lines.push('   2. Vá em SQL Editor');
    lines.push('   3. Execute o arquivo: supabase-complete-schema.sql');
    lines.push('   4. Reinicie o servidor para reconectar');
  } else {
    lines.push('🎉 PARABÉNS! Todas as 12 tabelas estão configuradas e acessíveis!');
    lines.push('');
    lines.push('✨ Funcionalidades habilitadas:');
    lines.push('   • Workspace (páginas, boards, databases)');
    lines.push('   • Formulários (forms, submissions)');
    lines.push('   • Produto (products, suppliers, categories)');
    lines.push('   • Faturamento (arquivos e uploads)');
    lines.push('   • Dashboard (métricas e analytics)');
  }

  lines.push('');
  lines.push('════════════════════════════════════════════════════════════════');
  lines.push('');

  return lines.join('\n');
}
