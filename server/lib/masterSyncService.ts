import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseOwner, SUPABASE_CONFIGURED } from '../config/supabaseOwner';
import { pool } from '../db';

let supabaseMaster: SupabaseClient | null = null;
let masterInitialized = false;

// Função para obter credenciais em tempo de execução
function getMasterCredentials(): { url: string; key: string } {
  // Prioridade: OWNER > MASTER > genérico
  const url = process.env.SUPABASE_OWNER_URL || process.env.SUPABASE_MASTER_URL || '';
  const key = process.env.SUPABASE_OWNER_SERVICE_KEY || process.env.SUPABASE_MASTER_SERVICE_ROLE_KEY || '';
  return { url, key };
}

export function getMasterClient(): SupabaseClient | null {
  const { url, key } = getMasterCredentials();
  
  if (!url || !key) {
    if (!masterInitialized) {
      console.warn('[MasterSync] Credenciais do Supabase Master/Owner não configuradas (SUPABASE_OWNER_URL/KEY)');
      masterInitialized = true;
    }
    return null;
  }
  
  if (!supabaseMaster) {
    console.log('[MasterSync] Conectando ao Supabase Owner/Master:', url.substring(0, 40) + '...');
    supabaseMaster = createClient(url, key);
  }
  
  return supabaseMaster;
}

export interface AdminCredentials {
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_key: string;
  storage_bucket: string;
  project_name?: string;
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
  // 1. Tentar buscar do Supabase Master (se configurado)
  const master = getMasterClient();
  if (master) {
    try {
      const { data, error } = await master
        .from('admin_supabase_credentials')
        .select('supabase_url, supabase_anon_key, supabase_service_role_key, project_name')
        .eq('admin_id', adminId)
        .maybeSingle();
      
      if (!error && data) {
        console.log(`[MasterSync] Credenciais encontradas no Master para admin ${adminId}`);
        return {
          supabase_url: data.supabase_url,
          supabase_anon_key: data.supabase_anon_key,
          supabase_service_key: data.supabase_service_role_key,
          storage_bucket: '',
          project_name: data.project_name
        };
      }
    } catch (error) {
      console.warn('[MasterSync] Erro ao buscar no Master:', error);
    }
  }
  
  // 2. Fallback: buscar do supabaseOwner (onde estão as revendedoras)
  if (SUPABASE_CONFIGURED && supabaseOwner) {
    try {
      // Tabela admin_supabase_credentials conforme estrutura do usuário
      const { data, error } = await supabaseOwner
        .from('admin_supabase_credentials')
        .select('supabase_url, supabase_anon_key, supabase_service_role_key, project_name')
        .eq('admin_id', adminId)
        .maybeSingle();
      
      if (!error && data) {
        console.log(`[MasterSync] Credenciais encontradas no Owner para admin ${adminId} (${data.project_name})`);
        return {
          supabase_url: data.supabase_url,
          supabase_anon_key: data.supabase_anon_key,
          supabase_service_key: data.supabase_service_role_key,
          storage_bucket: '',
          project_name: data.project_name
        };
      }
      
      console.warn(`[MasterSync] Credenciais não encontradas para admin ${adminId}:`, error?.message);
    } catch (error) {
      console.error('[MasterSync] Erro ao buscar credenciais no Owner:', error);
    }
  }
  
  return null;
}

export function createTenantClient(credentials: AdminCredentials): SupabaseClient {
  return createClient(credentials.supabase_url, credentials.supabase_service_key || credentials.supabase_anon_key);
}

/**
 * Sincroniza as credenciais do admin para a tabela admin_supabase_credentials no Supabase Owner
 * Isso permite que as revendedoras herdem as credenciais do admin
 */
export async function syncAdminCredentialsToOwner(
  adminId: string,
  credentials: {
    supabase_url: string;
    supabase_anon_key: string;
    supabase_service_role_key?: string;
    project_name?: string;
  }
): Promise<boolean> {
  // Tentar sincronizar no Master primeiro, depois no Owner
  const master = getMasterClient();
  const client = master || (SUPABASE_CONFIGURED ? supabaseOwner : null);
  
  if (!client) {
    console.warn('[MasterSync] Nenhum Supabase Owner/Master disponível para sincronizar credenciais');
    return false;
  }
  
  try {
    // Verificar se já existe registro para este admin
    const { data: existing } = await client
      .from('admin_supabase_credentials')
      .select('id')
      .eq('admin_id', adminId)
      .maybeSingle();
    
    // supabase_service_role_key é NOT NULL na tabela - usar anon_key como fallback se não fornecido
    const serviceRoleKey = credentials.supabase_service_role_key || credentials.supabase_anon_key;
    
    if (existing) {
      // Atualizar registro existente
      const { error } = await client
        .from('admin_supabase_credentials')
        .update({
          supabase_url: credentials.supabase_url,
          supabase_anon_key: credentials.supabase_anon_key,
          supabase_service_role_key: serviceRoleKey,
          project_name: credentials.project_name || null
        })
        .eq('admin_id', adminId);
      
      if (error) {
        console.error('[MasterSync] Erro ao atualizar credenciais no Owner:', error);
        return false;
      }
      console.log(`✅ [MasterSync] Credenciais do admin ${adminId} atualizadas no Supabase Owner`);
    } else {
      // Inserir novo registro (created_at tem default no banco)
      const { error } = await client
        .from('admin_supabase_credentials')
        .insert({
          admin_id: adminId,
          supabase_url: credentials.supabase_url,
          supabase_anon_key: credentials.supabase_anon_key,
          supabase_service_role_key: serviceRoleKey,
          project_name: credentials.project_name || null
        });
      
      if (error) {
        console.error('[MasterSync] Erro ao inserir credenciais no Owner:', error);
        return false;
      }
      console.log(`✅ [MasterSync] Credenciais do admin ${adminId} criadas no Supabase Owner`);
    }
    
    return true;
  } catch (error) {
    console.error('[MasterSync] Erro ao sincronizar credenciais:', error);
    return false;
  }
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
    
    // 🔄 AUTO-SYNC: Copiar credenciais do admin para a revendedora automaticamente
    try {
      const adminCredentials = await getAdminCredentials(data.admin_id);
      
      if (adminCredentials) {
        await pool.query(
          `INSERT INTO reseller_supabase_configs (reseller_email, supabase_url, supabase_anon_key, supabase_service_key, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (reseller_email) DO UPDATE SET
           supabase_url = EXCLUDED.supabase_url,
           supabase_anon_key = EXCLUDED.supabase_anon_key,
           supabase_service_key = EXCLUDED.supabase_service_key,
           updated_at = NOW()`,
          [emailNormalizado, adminCredentials.supabase_url, adminCredentials.supabase_anon_key, adminCredentials.supabase_service_key]
        );
        console.log(`✅ [MasterSync] Credenciais Supabase copiadas para: ${emailNormalizado}`);
      } else {
        console.warn(`⚠️ [MasterSync] Admin ${data.admin_id} não tem credenciais em admin_supabase_credentials`);
      }
    } catch (credError) {
      console.error('[MasterSync] Erro ao copiar credenciais:', credError);
    }
    
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
