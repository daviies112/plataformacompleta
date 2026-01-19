import { createClient, SupabaseClient } from '@supabase/supabase-js';

const MASTER_URL = process.env.SUPABASE_URL || '';
const MASTER_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabaseMaster: SupabaseClient | null = null;

export function getMasterClient(): SupabaseClient | null {
  if (!MASTER_URL || !MASTER_KEY) {
    console.warn('[MasterSync] Credenciais do Supabase Master não configuradas');
    return null;
  }
  
  if (!supabaseMaster) {
    supabaseMaster = createClient(MASTER_URL, MASTER_KEY);
  }
  
  return supabaseMaster;
}

export interface AdminCredentials {
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_key: string;
  storage_bucket: string;
}

export interface RevendedoraData {
  admin_id: string;
  contract_id: string;
  email: string;
  cpf: string;
  nome: string;
  telefone?: string;
  endereco_rua?: string;
  endereco_numero?: string;
  endereco_cidade?: string;
  endereco_estado?: string;
  endereco_cep?: string;
}

export async function getAdminCredentials(adminId: string): Promise<AdminCredentials | null> {
  const master = getMasterClient();
  if (!master) return null;
  
  try {
    const { data, error } = await master
      .from('admin_supabase_credentials')
      .select('supabase_url, supabase_anon_key, supabase_service_key, storage_bucket')
      .eq('admin_id', adminId)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      console.error(`[MasterSync] Credenciais não encontradas para admin ${adminId}:`, error);
      return null;
    }
    
    return data as AdminCredentials;
  } catch (error) {
    console.error('[MasterSync] Erro ao buscar credenciais:', error);
    return null;
  }
}

export function createTenantClient(credentials: AdminCredentials): SupabaseClient {
  return createClient(credentials.supabase_url, credentials.supabase_service_key || credentials.supabase_anon_key);
}

export async function createRevendedoraFromContract(data: RevendedoraData): Promise<string | null> {
  const master = getMasterClient();
  if (!master) {
    console.error('[MasterSync] Master client não disponível');
    return null;
  }
  
  try {
    const cpfNormalizado = data.cpf.replace(/[^0-9]/g, '');
    
    const { data: revendedora, error } = await master
      .from('revendedoras')
      .upsert({
        admin_id: data.admin_id,
        contract_id: data.contract_id,
        email: data.email.toLowerCase().trim(),
        cpf: cpfNormalizado,
        nome: data.nome,
        telefone: data.telefone || null,
        endereco_rua: data.endereco_rua || null,
        endereco_numero: data.endereco_numero || null,
        endereco_cidade: data.endereco_cidade || null,
        endereco_estado: data.endereco_estado || null,
        endereco_cep: data.endereco_cep || null,
        status: 'ativo',
        contract_signed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'admin_id,cpf'
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('[MasterSync] Erro ao criar revendedora:', error);
      return null;
    }
    
    await master.from('sync_log').insert({
      admin_id: data.admin_id,
      event_type: 'contract_signed',
      source_table: 'contracts',
      source_id: data.contract_id,
      payload: data,
      status: 'success'
    });
    
    console.log(`✅ [MasterSync] Revendedora criada/atualizada: ${data.email} (Admin: ${data.admin_id})`);
    return revendedora?.id || null;
    
  } catch (error) {
    console.error('[MasterSync] Erro ao processar contrato:', error);
    return null;
  }
}

export async function validateRevendedoraLogin(
  email: string, 
  cpf: string
): Promise<{ 
  revendedora: any; 
  adminId: string; 
  credentials: AdminCredentials | null 
} | null> {
  const master = getMasterClient();
  if (!master) return null;
  
  try {
    const cpfNormalizado = cpf.replace(/[^0-9]/g, '');
    
    const { data: revendedora, error } = await master
      .from('revendedoras')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('cpf', cpfNormalizado)
      .eq('status', 'ativo')
      .single();
    
    if (error || !revendedora) {
      console.log(`[MasterSync] Login falhou para: ${email}`);
      return null;
    }
    
    const credentials = await getAdminCredentials(revendedora.admin_id);
    
    return {
      revendedora,
      adminId: revendedora.admin_id,
      credentials
    };
    
  } catch (error) {
    console.error('[MasterSync] Erro no login:', error);
    return null;
  }
}

export async function processPendingSyncEvents(adminId: string, tenantClient: SupabaseClient): Promise<number> {
  const master = getMasterClient();
  if (!master) return 0;
  
  try {
    const { data: pendingEvents, error } = await tenantClient
      .from('sync_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50);
    
    if (error || !pendingEvents?.length) {
      return 0;
    }
    
    let processedCount = 0;
    
    for (const event of pendingEvents) {
      try {
        if (event.event_type === 'contract_signed') {
          const payload = event.payload;
          
          const revendedoraId = await createRevendedoraFromContract({
            admin_id: adminId,
            contract_id: payload.contract_id,
            email: payload.client_email,
            cpf: payload.client_cpf,
            nome: payload.client_name,
            telefone: payload.client_phone,
            endereco_rua: payload.address_street,
            endereco_numero: payload.address_number,
            endereco_cidade: payload.address_city,
            endereco_estado: payload.address_state,
            endereco_cep: payload.address_zipcode
          });
          
          // Só marca como completed se a criação foi bem-sucedida
          if (revendedoraId) {
            await tenantClient.rpc('mark_sync_processed', {
              p_queue_id: event.id,
              p_status: 'completed'
            });
            processedCount++;
          } else {
            // Falha silenciosa - marcar como failed para retry posterior
            await tenantClient.rpc('mark_sync_processed', {
              p_queue_id: event.id,
              p_status: 'failed',
              p_error_message: 'createRevendedoraFromContract retornou null'
            });
          }
        }
      } catch (eventError) {
        console.error(`[MasterSync] Erro ao processar evento ${event.id}:`, eventError);
        
        await tenantClient.rpc('mark_sync_processed', {
          p_queue_id: event.id,
          p_status: 'failed',
          p_error_message: String(eventError)
        });
      }
    }
    
    return processedCount;
    
  } catch (error) {
    console.error('[MasterSync] Erro ao processar eventos:', error);
    return 0;
  }
}

export async function getAllAdminsWithCredentials(): Promise<Array<{ admin_id: string; credentials: AdminCredentials }>> {
  const master = getMasterClient();
  if (!master) return [];
  
  try {
    const { data, error } = await master
      .from('admin_supabase_credentials')
      .select('admin_id, supabase_url, supabase_anon_key, supabase_service_key, storage_bucket')
      .eq('is_active', true);
    
    if (error || !data) return [];
    
    return data.map(row => ({
      admin_id: row.admin_id,
      credentials: {
        supabase_url: row.supabase_url,
        supabase_anon_key: row.supabase_anon_key,
        supabase_service_key: row.supabase_service_key,
        storage_bucket: row.storage_bucket
      }
    }));
    
  } catch (error) {
    console.error('[MasterSync] Erro ao listar admins:', error);
    return [];
  }
}
