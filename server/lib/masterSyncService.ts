import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Credenciais do Supabase Master (central)
const MASTER_URL = process.env.SUPABASE_URL || '';
const MASTER_KEY = process.env.SERVICE_ROLE_KEY || '';

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
    // Colunas conforme SQL executado: supabase_url, supabase_anon_key, supabase_service_role_key
    const { data, error } = await master
      .from('admin_supabase_credentials')
      .select('supabase_url, supabase_anon_key, supabase_service_role_key')
      .eq('admin_id', adminId)
      .maybeSingle();
    
    if (error || !data) {
      console.warn(`[MasterSync] Credenciais não encontradas para admin ${adminId}:`, error?.message);
      return null;
    }
    
    return {
      supabase_url: data.supabase_url,
      supabase_anon_key: data.supabase_anon_key,
      supabase_service_key: data.supabase_service_role_key,
      storage_bucket: ''
    };
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
    const emailNormalizado = data.email.toLowerCase().trim();
    
    // Primeiro verifica se já existe por email OU cpf
    const { data: existing } = await master
      .from('revendedoras')
      .select('id')
      .or(`email.eq.${emailNormalizado},cpf.eq.${cpfNormalizado}`)
      .maybeSingle();
    
    if (existing) {
      console.log(`[MasterSync] Revendedora já existe: ${emailNormalizado}`);
      return existing.id;
    }
    
    // Usa apenas as colunas que existem na tabela real:
    // id, admin_id, nome, email, cpf, status, senha_hash, created_at
    const { data: revendedora, error } = await master
      .from('revendedoras')
      .insert({
        admin_id: data.admin_id,
        email: emailNormalizado,
        cpf: cpfNormalizado,
        nome: data.nome,
        status: 'ativo'
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('[MasterSync] Erro ao criar revendedora:', error);
      return null;
    }
    
    console.log(`✅ [MasterSync] Revendedora criada: ${emailNormalizado} (Admin: ${data.admin_id})`);
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
    // Usa integration_queue conforme o SQL executado pelo usuário
    const { data: pendingEvents, error } = await tenantClient
      .from('integration_queue')
      .select('*')
      .eq('status', 'pending')
      .eq('entity_type', 'nova_revendedora')
      .order('created_at', { ascending: true })
      .limit(50);
    
    if (error || !pendingEvents?.length) {
      if (error) console.log(`[MasterSync] Erro ao buscar integration_queue: ${error.message}`);
      return 0;
    }
    
    console.log(`📦 [MasterSync] Processando ${pendingEvents.length} eventos de nova_revendedora`);
    let processedCount = 0;
    
    for (const event of pendingEvents) {
      try {
        const payload = event.payload;
        
        // Payload conforme o trigger: nome, email, cpf
        const revendedoraId = await createRevendedoraFromContract({
          admin_id: adminId,
          contract_id: event.id, // Usa ID do evento como referência
          email: payload.email,
          cpf: payload.cpf,
          nome: payload.nome
        });
        
        // Só marca como processed se a criação foi bem-sucedida
        if (revendedoraId) {
          await tenantClient
            .from('integration_queue')
            .update({ status: 'processed' })
            .eq('id', event.id);
          processedCount++;
          console.log(`✅ [MasterSync] Evento ${event.id} processado com sucesso`);
        } else {
          // Falha - marcar como error para retry posterior
          await tenantClient
            .from('integration_queue')
            .update({ status: 'error' })
            .eq('id', event.id);
          console.warn(`⚠️ [MasterSync] Evento ${event.id} falhou`);
        }
      } catch (eventError) {
        console.error(`[MasterSync] Erro ao processar evento ${event.id}:`, eventError);
        
        await tenantClient
          .from('integration_queue')
          .update({ status: 'error' })
          .eq('id', event.id);
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
    // Colunas conforme SQL executado
    const { data, error } = await master
      .from('admin_supabase_credentials')
      .select('admin_id, supabase_url, supabase_anon_key, supabase_service_role_key');
    
    if (error || !data) {
      console.warn('[MasterSync] Nenhum admin encontrado:', error?.message);
      return [];
    }
    
    console.log(`📋 [MasterSync] ${data.length} admins com credenciais encontrados`);
    
    return data.map(row => ({
      admin_id: row.admin_id,
      credentials: {
        supabase_url: row.supabase_url,
        supabase_anon_key: row.supabase_anon_key,
        supabase_service_key: row.supabase_service_role_key,
        storage_bucket: ''
      }
    }));
    
  } catch (error) {
    console.error('[MasterSync] Erro ao listar admins:', error);
    return [];
  }
}
