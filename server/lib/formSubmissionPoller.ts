import { dataProcessingQueue } from './queue';
import { getAllSupabaseConfigs, SupabaseCredentialsFromDb } from '../formularios/utils/supabaseClient';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

/**
 * Form Submission Poller Service
 * 
 * Monitora periodicamente submissions do Supabase que ainda não foram sincronizadas
 * e enfileira jobs para sincronizar com a tabela local de leads.
 * 
 * OBJETIVO: Garantir que leads e etiquetas WhatsApp estejam sempre atualizados
 * com o status mais recente dos formulários.
 * 
 * MULTI-TENANT: Agora carrega todas as configurações de tenants do banco de dados
 * e itera sobre cada um, garantindo que todos os Supabase sejam polled.
 */

interface PollerState {
  lastSyncedAt: string | null;
  lastSyncedId: string | null;
  lastRunAt: string | null;
  totalSubmissionsProcessed: number;
  totalErrors: number;
  lastError: string | null;
  tenantStates: Record<string, { lastSyncedAt: string | null; lastSyncedId: string | null }>;
}

const POLLER_STATE_FILE = path.join(process.cwd(), 'data', 'form_submission_poller_state.json');

let pollerState: PollerState = {
  lastSyncedAt: null,
  lastSyncedId: null,
  lastRunAt: null,
  totalSubmissionsProcessed: 0,
  totalErrors: 0,
  lastError: null,
  tenantStates: {}
};

function loadPollerState(): void {
  try {
    const dataDir = path.dirname(POLLER_STATE_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(POLLER_STATE_FILE)) {
      const data = fs.readFileSync(POLLER_STATE_FILE, 'utf8');
      const loaded = JSON.parse(data);
      pollerState = {
        ...pollerState,
        ...loaded,
        tenantStates: loaded.tenantStates || {}
      };
      console.log(`📄 [FormPoller] Estado carregado: ${pollerState.totalSubmissionsProcessed} submissions processadas`);
    }
  } catch (error) {
    console.error('❌ [FormPoller] Erro ao carregar estado:', error);
  }
}

function savePollerState(): void {
  try {
    const dataDir = path.dirname(POLLER_STATE_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(POLLER_STATE_FILE, JSON.stringify(pollerState, null, 2), 'utf8');
  } catch (error) {
    console.error('❌ [FormPoller] Erro ao salvar estado:', error);
  }
}

function getTenantState(tenantId: string): { lastSyncedAt: string | null; lastSyncedId: string | null } {
  return pollerState.tenantStates[tenantId] || { lastSyncedAt: null, lastSyncedId: null };
}

function setTenantState(tenantId: string, state: { lastSyncedAt: string | null; lastSyncedId: string | null }): void {
  pollerState.tenantStates[tenantId] = state;
}

/**
 * Busca submissions do Supabase que precisam ser sincronizadas para um tenant específico
 * CRÍTICO: Usa updated_at para detectar MUDANÇAS de status, não apenas novas submissions!
 */
async function fetchUnsyncedSubmissionsForTenant(
  supabase: SupabaseClient,
  tenantId: string
): Promise<any[]> {
  try {
    const tenantState = getTenantState(tenantId);
    
    let query = supabase
      .from('form_submissions')
      .select('*')
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(50);

    if (tenantState.lastSyncedAt && tenantState.lastSyncedId) {
      query = query.or(
        `updated_at.gt.${tenantState.lastSyncedAt},` +
        `and(updated_at.eq.${tenantState.lastSyncedAt},id.gt.${tenantState.lastSyncedId})`
      );
    } else if (tenantState.lastSyncedAt) {
      query = query.gte('updated_at', tenantState.lastSyncedAt);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`❌ [FormPoller] Erro ao buscar submissions para tenant ${tenantId}:`, error);
      pollerState.lastError = error.message;
      pollerState.totalErrors++;
      savePollerState();
      return [];
    }

    console.log(`📊 [FormPoller] Tenant ${tenantId}: ${data?.length || 0} submissions não sincronizadas ou atualizadas`);
    return data || [];

  } catch (error: any) {
    console.error(`❌ [FormPoller] Erro ao buscar submissions para tenant ${tenantId}:`, error);
    pollerState.lastError = error.message;
    pollerState.totalErrors++;
    savePollerState();
    return [];
  }
}

/**
 * Enfileira submission para sincronização
 * Inclui TODOS os campos da submission para garantir que nenhum dado seja perdido
 * 
 * Campos incluídos:
 * - Dados básicos de contato (phone, name, email, cpf)
 * - Instagram handle
 * - Data de nascimento
 * - Endereço completo (cep, street, number, complement, neighborhood, city, state)
 * - Respostas do formulário (answers JSON)
 * - Flags de status do formulário
 */
async function enqueueSubmissionSync(submission: any, tenantId: string): Promise<void> {
  try {
    await dataProcessingQueue.add('sync_form_submission', {
      submissionId: submission.id,
      formId: submission.form_id,
      tenantId: tenantId,
      
      // Dados de contato básicos
      contactPhone: submission.contact_phone,
      contactName: submission.contact_name,
      contactEmail: submission.contact_email,
      contactCpf: submission.contact_cpf || null,
      
      // Instagram e data de nascimento
      instagramHandle: submission.instagram_handle || null,
      birthDate: submission.birth_date || null,
      
      // Endereço completo
      addressCep: submission.address_cep || null,
      addressStreet: submission.address_street || null,
      addressNumber: submission.address_number || null,
      addressComplement: submission.address_complement || null,
      addressNeighborhood: submission.address_neighborhood || null,
      addressCity: submission.address_city || null,
      addressState: submission.address_state || null,
      
      // Dados de agendamento (se existirem)
      agendouReuniao: submission.agendou_reuniao ?? null,
      dataAgendamento: submission.data_agendamento || null,
      
      // Respostas completas do formulário
      answers: submission.answers || null,
      
      // Pontuação e status
      totalScore: submission.total_score,
      passed: submission.passed,
      formStatus: submission.form_status || 'completed',
      formularioAberto: submission.formulario_aberto ?? true,
      formularioIniciado: submission.formulario_iniciado ?? true,
      updatedAt: submission.updated_at
    }, {
      maxAttempts: 3,
      ttl: 3600
    });

    console.log(`✅ [FormPoller] Submission ${submission.id} enfileirada para sincronização (tenant: ${tenantId}, cpf: ${submission.contact_cpf ? 'sim' : 'não'}, instagram: ${submission.instagram_handle ? 'sim' : 'não'})`);
  } catch (error: any) {
    console.error(`❌ [FormPoller] Erro ao enfileirar submission ${submission.id}:`, error);
    throw error;
  }
}

/**
 * Executa uma rodada de polling para todos os tenants configurados
 * 
 * MULTI-TENANT: Carrega todas as configurações do banco de dados e
 * itera sobre cada tenant, garantindo que nenhum seja ignorado.
 */
export async function pollFormSubmissions(): Promise<{
  success: boolean;
  processedCount: number;
  error?: string;
  tenantResults?: Record<string, number>;
}> {
  try {
    console.log('🔍 [FormPoller] Iniciando polling de submissions...');
    
    pollerState.lastRunAt = new Date().toISOString();
    
    // Carregar TODAS as configurações de Supabase de todos os tenants
    const allConfigs = await getAllSupabaseConfigs();
    
    if (allConfigs.length === 0) {
      console.log('⚠️ [FormPoller] Nenhuma configuração de Supabase encontrada - pulando polling');
      console.log('💡 [FormPoller] Configure credenciais Supabase em /configuracoes para habilitar polling');
      return { success: true, processedCount: 0 };
    }
    
    console.log(`🏢 [FormPoller] Encontrados ${allConfigs.length} tenant(s) configurados`);
    
    let totalProcessedCount = 0;
    const tenantResults: Record<string, number> = {};
    
    // Processar cada tenant
    for (const config of allConfigs) {
      try {
        console.log(`\n🔄 [FormPoller] Processando tenant: ${config.tenantId}`);
        
        // Criar cliente Supabase para este tenant
        const supabase = createClient(config.url, config.anonKey);
        
        // Buscar submissions não sincronizadas para este tenant
        const submissions = await fetchUnsyncedSubmissionsForTenant(supabase, config.tenantId);
        
        if (submissions.length === 0) {
          console.log(`ℹ️ [FormPoller] Tenant ${config.tenantId}: Nenhuma submission nova`);
          tenantResults[config.tenantId] = 0;
          continue;
        }
        
        // Enfileirar cada submission
        let tenantProcessedCount = 0;
        let lastUpdatedAt: string | null = null;
        let lastId: string | null = null;

        for (const submission of submissions) {
          try {
            await enqueueSubmissionSync(submission, config.tenantId);
            tenantProcessedCount++;
            lastUpdatedAt = submission.updated_at;
            lastId = submission.id;
          } catch (error: any) {
            console.error(`❌ [FormPoller] Erro ao processar submission ${submission.id}:`, error);
            pollerState.totalErrors++;
          }
        }

        // Atualizar estado do tenant
        if (lastUpdatedAt && lastId) {
          setTenantState(config.tenantId, {
            lastSyncedAt: lastUpdatedAt,
            lastSyncedId: lastId
          });
        }
        
        totalProcessedCount += tenantProcessedCount;
        tenantResults[config.tenantId] = tenantProcessedCount;
        
        console.log(`✅ [FormPoller] Tenant ${config.tenantId}: ${tenantProcessedCount} submissions enfileiradas`);
        
      } catch (tenantError: any) {
        console.error(`❌ [FormPoller] Erro ao processar tenant ${config.tenantId}:`, tenantError);
        pollerState.totalErrors++;
        tenantResults[config.tenantId] = -1;
      }
    }

    // Atualizar estatísticas globais
    pollerState.totalSubmissionsProcessed += totalProcessedCount;
    pollerState.lastError = null;
    savePollerState();

    console.log(`\n✅ [FormPoller] Polling concluído: ${totalProcessedCount} submissions enfileiradas de ${allConfigs.length} tenant(s)`);
    
    return {
      success: true,
      processedCount: totalProcessedCount,
      tenantResults
    };

  } catch (error: any) {
    console.error('❌ [FormPoller] Erro no polling:', error);
    pollerState.lastError = error.message;
    pollerState.totalErrors++;
    savePollerState();
    
    return {
      success: false,
      processedCount: 0,
      error: error.message
    };
  }
}

export function getPollerState(): PollerState {
  return { ...pollerState };
}

export function resetPollerCursor(): void {
  pollerState.lastSyncedAt = null;
  pollerState.lastSyncedId = null;
  pollerState.tenantStates = {};
  savePollerState();
  console.log('🔄 [FormPoller] Cursor resetado - próximo poll processará todas as submissions');
}

loadPollerState();
