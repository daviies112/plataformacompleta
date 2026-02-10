import { getClientSupabaseClient } from '../lib/multiTenantSupabase';

export async function fetchSupabaseFiles(clientId: string) {
  const client = await getClientSupabaseClient(clientId);
  
  if (!client) {
    return { success: false, error: 'Cliente Supabase não configurado', data: [] };
  }

  try {
    const { data, error } = await client
      .from('files')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [], error: null };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}
