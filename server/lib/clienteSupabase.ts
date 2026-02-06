import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { log } from '../production';
import { db } from '../db';
import { supabaseConfig } from '../../shared/db-schema';
import { decrypt } from './credentialsManager';
import { getSupabaseFileConfig } from './supabaseFileConfig';
import { getClientSupabaseClient } from './multiTenantSupabase';

let clienteSupabaseClient: SupabaseClient | null = null;
let cachedCredentials: { url: string; anonKey: string; timestamp: number } | null = null;

// Cache expiry: 1 hora (3600000ms)
const CACHE_EXPIRY_MS = 3600000;

/**
 * Invalida o cache de credenciais, forçando refetch na próxima chamada
 */
export function invalidateClienteCache(): void {
  clienteSupabaseClient = null;
  cachedCredentials = null;
  log('🔄 Cache de credenciais do Supabase CLIENTE invalidado');
}

/**
 * Verifica se o cache de credenciais expirou
 * Retorna false se não há cache (permite criar novo)
 * Retorna true apenas se cache existe MAS expirou
 */
function isCacheExpired(): boolean {
  if (!cachedCredentials) return false; // Sem cache = não expirado, permite criar
  const age = Date.now() - cachedCredentials.timestamp;
  return age > CACHE_EXPIRY_MS;
}

/**
 * Busca credenciais do Supabase do CLIENTE
 * Prioridade: 1. Banco de dados (supabase_config), 2. Secrets do Replit
 * Para operações de sistema (como CPFPoller), busca qualquer tenant configurado
 */
async function getClienteCredentials(): Promise<{ url: string; anonKey: string } | null> {
  // Prioridade 1: Buscar do banco de dados (supabase_config)
  try {
    // Busca qualquer tenant que tenha credenciais configuradas
    const configs = await db.select()
      .from(supabaseConfig)
      .limit(1)
      .execute();
    
    if (configs.length > 0) {
      const config = configs[0];
      try {
        const isEncrypted = (str: string) => {
          if (!str) return false;
          if (str.startsWith('http') || str.startsWith('ey')) return false;
          return true;
        };
        const url = isEncrypted(config.supabaseUrl) ? decrypt(config.supabaseUrl) : config.supabaseUrl;
        const anonKey = isEncrypted(config.supabaseAnonKey) ? decrypt(config.supabaseAnonKey) : config.supabaseAnonKey;
        
        if (url && anonKey) {
          if (!url.startsWith('http')) {
            log('❌ SUPABASE_URL do banco inválida - deve começar com http:// ou https://');
          } else if (anonKey.length < 20) {
            log('❌ SUPABASE_ANON_KEY do banco inválida - chave muito curta');
          } else {
            log('✅ Credenciais do Supabase CLIENTE carregadas do banco de dados');
            return { url, anonKey };
          }
        }
      } catch (decryptError: any) {
        log(`⚠️ Erro ao descriptografar credenciais: ${decryptError.message}`);
      }
    }
  } catch (error: any) {
    log(`⚠️  Erro ao buscar credenciais do banco: ${error.message}`);
  }
  
  // Prioridade 2: Buscar do arquivo de configuração (data/supabase-config.json)
  try {
    const fileConfig = getSupabaseFileConfig();
    if (fileConfig?.supabaseUrl && fileConfig?.supabaseAnonKey) {
      const url = fileConfig.supabaseUrl.trim();
      const anonKey = fileConfig.supabaseAnonKey.trim();
      
      if (url.startsWith('http') && anonKey.length >= 20) {
        log('✅ Credenciais do Supabase CLIENTE carregadas do arquivo de configuração');
        return { url, anonKey };
      }
    }
  } catch (error: any) {
    log(`⚠️ Erro ao buscar credenciais do arquivo: ${error.message}`);
  }
  
  // Prioridade 3: Fallback para Secrets do Replit (com trim para remover espaços)
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
  
  if (supabaseAnonKey.length < 20) {
    log('❌ SUPABASE_ANON_KEY dos Secrets inválida - chave muito curta');
    return null;
  }
  
  log('⚠️  Credenciais do Supabase CLIENTE carregadas dos SECRETS (fallback)');
  return { url: supabaseUrl, anonKey: supabaseAnonKey };
}

export async function getClienteSupabase(forceRefresh = false): Promise<SupabaseClient> {
  // Se cache expirou ou forceRefresh=true, invalidar
  if (forceRefresh || isCacheExpired()) {
    if (forceRefresh) {
      log('🔄 Forçando refresh de credenciais do Supabase CLIENTE...');
    } else if (cachedCredentials) {
      log('⏰ Cache de credenciais expirado, refazendo fetch...');
    }
    invalidateClienteCache();
  }
  
  // Se já temos um cliente válido, retornar
  if (clienteSupabaseClient && cachedCredentials) {
    return clienteSupabaseClient;
  }

  // Buscar credenciais
  const credentials = await getClienteCredentials();
  
  if (!credentials) {
    log('⚠️  Supabase do CLIENTE não configurado. Configure no banco de dados (via /configuracoes) ou REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY nos Secrets.');
    throw new Error(
      'Supabase do CLIENTE não configurado. Para usar a automação de forms, configure as credenciais do banco do cliente.'
    );
  }

  // Criar cliente
  clienteSupabaseClient = createClient(credentials.url, credentials.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  cachedCredentials = { ...credentials, timestamp: Date.now() };

  log('✅ Supabase do CLIENTE conectado');
  return clienteSupabaseClient;
}

export async function isClienteSupabaseConfigured(): Promise<boolean> {
  if (cachedCredentials) {
    return true;
  }
  
  const credentials = await getClienteCredentials();
  return !!credentials;
}

export interface FormSubmission {
  id: string;
  contact_cpf?: string;
  contact_name?: string;
  contact_email?: string;
  passed?: boolean;
  answers?: any;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export async function fetchApprovedSubmissions(limit = 50, retryOnAuthError = true): Promise<FormSubmission[]> {
  try {
    const supabase = await getClienteSupabase();
    
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('passed', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Se erro de autenticação e ainda não tentamos retry, refetch credenciais
      if (retryOnAuthError && (
        error.message.includes('Invalid API key') ||
        error.message.includes('JWT') ||
        error.message.includes('unauthorized') ||
        error.message.includes('Invalid JWT')
      )) {
        log(`⚠️  Erro de autenticação detectado, invalidando cache e retentando...`);
        invalidateClienteCache();
        return fetchApprovedSubmissions(limit, false); // Retry sem loop infinito
      }
      
      log(`❌ Erro ao buscar submissions aprovadas: ${error.message}`);
      throw new Error(`Falha ao buscar submissions: ${error.message}`);
    }

    log(`✅ Buscadas ${data?.length || 0} submissions aprovadas`);
    return data || [];
  } catch (error: any) {
    log(`❌ Exceção ao buscar submissions: ${error.message}`);
    throw error;
  }
}

export async function getSubmissionById(id: string): Promise<FormSubmission | null> {
  try {
    const supabase = await getClienteSupabase();
    
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        log(`⚠️ Submission não encontrada: ${id}`);
        return null;
      }
      log(`❌ Erro ao buscar submission ${id}: ${error.message}`);
      throw new Error(`Falha ao buscar submission: ${error.message}`);
    }

    log(`✅ Submission encontrada: ${id}`);
    return data;
  } catch (error: any) {
    log(`❌ Exceção ao buscar submission ${id}: ${error.message}`);
    throw error;
  }
}

export async function getAllSubmissions(limit = 100): Promise<FormSubmission[]> {
  try {
    const supabase = await getClienteSupabase();
    
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      log(`❌ Erro ao buscar todas submissions: ${error.message}`);
      throw new Error(`Falha ao buscar submissions: ${error.message}`);
    }

    log(`✅ Buscadas ${data?.length || 0} submissions totais`);
    return data || [];
  } catch (error: any) {
    log(`❌ Exceção ao buscar submissions: ${error.message}`);
    throw error;
  }
}

export interface CPFComplianceResult {
  nome: string | null;
  cpf: string;
  telefone?: string | null;
  status: string;
  dados: boolean;
  risco: number;
  processos: number;
  aprovado: boolean;
  data_consulta: string;
  check_id?: string;
  submission_id?: string; // Form submission ID for deduplication
}

export async function saveComplianceToClienteSupabase(result: CPFComplianceResult, tenantId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    let supabase: SupabaseClient | null = null;
    
    // MULTI-TENANT: Se tenantId for fornecido, usar o Supabase específico do tenant
    if (tenantId) {
      supabase = await getClientSupabaseClient(tenantId);
      if (!supabase) {
        log(`⚠️ [ClienteSupabase] Supabase do tenant ${tenantId.substring(0, 16)}... não configurado - salvamento ignorado`);
        return { success: false, error: `Supabase do tenant ${tenantId.substring(0, 16)}... não configurado` };
      }
      log(`🔐 [ClienteSupabase] Usando Supabase do tenant: ${tenantId.substring(0, 16)}...`);
    } else {
      // Fallback para comportamento legado (qualquer tenant configurado)
      const isConfigured = await isClienteSupabaseConfigured();
      if (!isConfigured) {
        log('⚠️ [ClienteSupabase] Supabase do Cliente não configurado - salvamento de compliance ignorado');
        return { success: false, error: 'Supabase do Cliente não configurado' };
      }
      supabase = await getClienteSupabase();
      log('⚠️ [ClienteSupabase] Usando Supabase legado (sem tenantId) - pode salvar no tenant errado!');
    }
    
    // INSERT simples para manter histórico completo de cada consulta
    // Cada consulta gera um novo registro, permitindo ver todo o histórico
    // IMPORTANTE: processado_whatsapp_n8n=FALSE para N8N detectar e enviar notificação WhatsApp
    const { data, error } = await supabase
      .from('cpf_compliance_results')
      .insert({
        cpf: result.cpf,
        nome: result.nome,
        telefone: result.telefone || null,
        status: result.status,
        dados: result.dados,
        risco: result.risco,
        processos: result.processos,
        aprovado: result.aprovado,
        data_consulta: result.data_consulta,
        check_id: result.check_id,
        submission_id: result.submission_id || null, // For deduplication
        processado_whatsapp_n8n: false  // N8N detecta FALSE e marca TRUE após enviar WhatsApp
      })
      .select();

    if (error) {
      if (error.code === '42P01') {
        log('⚠️ [ClienteSupabase] Tabela cpf_compliance_results não existe no Supabase do Cliente');
        log('📋 [ClienteSupabase] SQL para criar tabela:');
        log(`
CREATE TABLE IF NOT EXISTS cpf_compliance_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cpf VARCHAR(14) NOT NULL,
  nome TEXT,
  telefone VARCHAR(20),
  status VARCHAR(50) NOT NULL,
  dados BOOLEAN DEFAULT false,
  risco NUMERIC(4,2) DEFAULT 0,
  processos INTEGER DEFAULT 0,
  aprovado BOOLEAN DEFAULT false,
  data_consulta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  check_id UUID,
  submission_id VARCHAR(255), -- For deduplication of form submissions
  processado_whatsapp BOOLEAN DEFAULT false,
  processado_whatsapp_n8n BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cpf_compliance_results_cpf ON cpf_compliance_results(cpf);
CREATE INDEX IF NOT EXISTS idx_cpf_compliance_results_status ON cpf_compliance_results(status);
CREATE INDEX IF NOT EXISTS idx_cpf_compliance_results_aprovado ON cpf_compliance_results(aprovado);
CREATE INDEX IF NOT EXISTS idx_cpf_compliance_results_data ON cpf_compliance_results(data_consulta DESC);
CREATE INDEX IF NOT EXISTS idx_cpf_compliance_results_telefone ON cpf_compliance_results(telefone);
CREATE INDEX IF NOT EXISTS idx_cpf_compliance_results_processado ON cpf_compliance_results(processado_whatsapp);
CREATE INDEX IF NOT EXISTS idx_cpf_compliance_results_n8n ON cpf_compliance_results(processado_whatsapp_n8n);
CREATE INDEX IF NOT EXISTS idx_cpf_compliance_results_submission ON cpf_compliance_results(submission_id);

-- Migration for existing tables:
-- ALTER TABLE cpf_compliance_results ADD COLUMN IF NOT EXISTS submission_id VARCHAR(255);
-- CREATE INDEX IF NOT EXISTS idx_cpf_compliance_results_submission ON cpf_compliance_results(submission_id);
        `);
        return { success: false, error: 'Tabela cpf_compliance_results não existe. Crie a tabela no Supabase do Cliente.' };
      }
      
      log(`❌ [ClienteSupabase] Erro ao salvar compliance: ${error.message}`);
      return { success: false, error: error.message };
    }

    log(`✅ [ClienteSupabase] Compliance salvo no Supabase do Cliente: CPF ${result.cpf.substring(0, 3)}... | Status: ${result.status} | Aprovado: ${result.aprovado}`);
    return { success: true };
  } catch (error: any) {
    log(`❌ [ClienteSupabase] Exceção ao salvar compliance: ${error.message}`);
    return { success: false, error: error.message };
  }
}
