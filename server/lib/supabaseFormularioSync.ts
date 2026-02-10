import { getGlobalSupabaseClient } from './supabaseAutoConnect';
import type { Formulario } from '../../shared/db-schema';

/**
 * Sincroniza um formulário com o Supabase
 * Se o formulário está marcado como deleted, remove do Supabase
 * Caso contrário, faz upsert (insert ou update)
 */
export async function syncFormularioToSupabase(
  formulario: Formulario & { deleted?: boolean }
): Promise<void> {
  try {
    const supabase = getGlobalSupabaseClient();
    
    if (!supabase) {
      console.log('⚠️ Supabase não configurado - sincronização de formulário ignorada');
      return;
    }

    // Se o formulário foi deletado, remove do Supabase
    if (formulario.deleted) {
      const { error } = await supabase
        .from('formularios')
        .delete()
        .eq('id', formulario.id);

      if (error) {
        console.error('Erro ao deletar formulário do Supabase:', error);
        throw error;
      }

      console.log(`✅ Formulário ${formulario.id} deletado do Supabase`);
      return;
    }

    // Converter camelCase para snake_case para Supabase
    const formularioSupabase = {
      id: formulario.id,
      nome: formulario.nome,
      url: formulario.url,
      ativo: formulario.ativo,
      criado_em: formulario.criadoEm,
      atualizado_em: new Date().toISOString()
    };

    // Upsert no Supabase (insert ou update)
    const { error } = await supabase
      .from('formularios')
      .upsert(formularioSupabase, {
        onConflict: 'id'
      });

    if (error) {
      console.error('Erro ao sincronizar formulário com Supabase:', error);
      throw error;
    }

    console.log(`✅ Formulário "${formulario.nome}" sincronizado com Supabase`);
  } catch (error) {
    console.error('Erro na sincronização com Supabase:', error);
    // Não propaga o erro para não quebrar a funcionalidade local
    // O sistema deve funcionar mesmo se Supabase não estiver disponível
  }
}

/**
 * Busca o formulário ativo do Supabase
 * Usado pelo N8N para obter a URL do formulário ativo
 */
export async function getFormularioAtivoFromSupabase(): Promise<Formulario | null> {
  try {
    const supabase = getGlobalSupabaseClient();
    
    if (!supabase) {
      console.log('⚠️ Supabase não configurado');
      return null;
    }

    const { data, error } = await supabase
      .from('formularios')
      .select('*')
      .eq('ativo', true)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Nenhum resultado encontrado
        console.log('ℹ️ Nenhum formulário ativo encontrado no Supabase');
        return null;
      }
      console.error('Erro ao buscar formulário ativo do Supabase:', error);
      throw error;
    }

    // Converter snake_case para camelCase
    if (data) {
      return {
        id: data.id,
        nome: data.nome,
        url: data.url,
        ativo: data.ativo,
        criadoEm: data.criado_em,
        atualizadoEm: data.atualizado_em
      };
    }

    return null;
  } catch (error) {
    console.error('Erro ao buscar formulário ativo do Supabase:', error);
    return null;
  }
}

/**
 * Sincroniza todos os formulários do banco local para o Supabase
 * Útil para migração inicial ou resincronização
 */
export async function syncAllFormulariosToSupabase(
  formularios: Formulario[]
): Promise<void> {
  try {
    const supabase = getGlobalSupabaseClient();
    
    if (!supabase) {
      console.log('⚠️ Supabase não configurado - sincronização ignorada');
      return;
    }

    console.log(`🔄 Sincronizando ${formularios.length} formulários com Supabase...`);

    for (const formulario of formularios) {
      await syncFormularioToSupabase(formulario);
    }

    console.log(`✅ ${formularios.length} formulários sincronizados com sucesso`);
  } catch (error) {
    console.error('Erro ao sincronizar todos os formulários:', error);
  }
}
