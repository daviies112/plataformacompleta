import { getSupabaseClient } from '@/lib/supabase';

export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  tables?: string[];
}> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
    }

    // Testar conexão básica
    const { data, error } = await supabase.from('products').select('count');
    
    if (error) {
      // Se der erro de tabela não encontrada
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return {
          success: false,
          message: 'Tabelas ainda não foram criadas. Execute o SQL do arquivo supabase-setup.sql no painel do Supabase.',
        };
      }
      return {
        success: false,
        message: `Erro na conexão: ${error.message}`,
      };
    }

    // Verificar todas as tabelas
    const tables = ['products', 'suppliers', 'resellers', 'categories', 'print_queue'];
    const tableChecks = await Promise.all(
      tables.map(async (table) => {
        const { error } = await supabase.from(table).select('count').limit(1);
        return { table, exists: !error };
      })
    );

    const existingTables = tableChecks.filter(t => t.exists).map(t => t.table);
    const missingTables = tableChecks.filter(t => !t.exists).map(t => t.table);

    if (missingTables.length > 0) {
      return {
        success: false,
        message: `Tabelas faltando: ${missingTables.join(', ')}. Execute o SQL completo.`,
        tables: existingTables,
      };
    }

    return {
      success: true,
      message: 'Conexão com Supabase estabelecida com sucesso! Todas as tabelas estão prontas.',
      tables: existingTables,
    };
  } catch (error) {
    return {
      success: false,
      message: `Erro inesperado: ${error}`,
    };
  }
}
