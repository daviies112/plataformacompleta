import { createClient } from '@supabase/supabase-js';

export const supabaseQuery = {
  formTemplates: () => {
    const { supabase } = getSupabaseClient();
    return supabase.from('form_templates');
  },
  forms: () => {
    const { supabase } = getSupabaseClient();
    return supabase.from('forms');
  },
  formSubmissions: () => {
    const { supabase } = getSupabaseClient();
    return supabase.from('form_submissions');
  },
};

function getSupabaseClient() {
  try {
    const savedConfig = localStorage.getItem('supabase_config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      if (config.url && config.anonKey) {
        console.log('✅ [SUPABASE] Usando credenciais configuradas:', config.url);
        const supabase = createClient(config.url, config.anonKey, {
          auth: {
            storage: localStorage,
            persistSession: true,
            autoRefreshToken: true,
          }
        });
        return { supabase, isConfigured: true };
      }
    }
  } catch (error) {
    console.error('Error loading Supabase config:', error);
  }
  
  console.log('⚠️ [SUPABASE] Usando placeholders (não configurado)');
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
    import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key',
    {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      }
    }
  );
  
  return { supabase, isConfigured: false };
}

export async function testSupabaseConnection(url: string, anonKey: string) {
  try {
    const testClient = createClient(url, anonKey, {
      auth: {
        storage: localStorage,
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    const { data, error } = await testClient
      .from('forms')
      .select('count')
      .limit(1);

    if (error) {
      if (error.message.includes('relation "public.forms" does not exist')) {
        return {
          success: false,
          message: 'Conexão OK, mas tabelas não encontradas. Execute o SQL fornecido na página.'
        };
      }
      return {
        success: false,
        message: error.message
      };
    }

    return {
      success: true,
      message: 'Conexão estabelecida com sucesso! ✓'
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Erro desconhecido ao conectar'
    };
  }
}
