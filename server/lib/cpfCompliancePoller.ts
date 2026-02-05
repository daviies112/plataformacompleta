import { db } from '../db';
import { leads, whatsappLabels, bigdatacorpConfig, supabaseConfig } from '../../shared/db-schema';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { getSupabaseMaster, getSupabaseMasterForTenant, isSupabaseMasterConfigured, type DatacorpCheck } from './supabaseMaster';
import { tenantIdToUUID } from './cryptoCompliance';
import { getClienteSupabase, isClienteSupabaseConfigured } from './clienteSupabase';
import { getClientSupabaseClient } from './multiTenantSupabase';
import { normalizeCPF, decryptCPF } from './crypto';
import { isBigdatacorpConfigured } from './bigdatacorpClient';
import { checkCompliance } from './datacorpCompliance';
import { decrypt } from './credentialsManager';
import fs from 'fs';
import path from 'path';

/**
 * CPF Compliance Poller Service
 * 
 * Monitora periodicamente consultas de CPF no Supabase Master e atualiza
 * automaticamente as etiquetas WhatsApp dos leads correspondentes.
 * 
 * OBJETIVO: Garantir que leads com CPF aprovado/reprovado tenham a etiqueta
 * correta no dashboard WhatsApp.
 * 
 * FLUXO:
 * 1. Busca consultas de CPF no Supabase Master que foram atualizadas
 * 2. Para cada consulta com status 'approved' ou 'rejected':
 *    - Busca o lead correspondente via submission_id ou telefone
 *    - Atualiza o formStatus do lead para 'cpf_approved' ou 'cpf_rejected'
 *    - Isso automaticamente atribui a etiqueta correta (Rosa ou Ciano)
 */

interface CPFPollerState {
  lastPolledAt: string | null;
  totalProcessed: number;
  totalErrors: number;
  lastError: string | null;
}

const CPF_POLLER_STATE_FILE = path.join(process.cwd(), 'data', 'cpf_compliance_poller_state.json');

let cpfPollerState: CPFPollerState = {
  lastPolledAt: null,
  totalProcessed: 0,
  totalErrors: 0,
  lastError: null
};

function loadCPFPollerState(): void {
  try {
    const dataDir = path.dirname(CPF_POLLER_STATE_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(CPF_POLLER_STATE_FILE)) {
      const data = fs.readFileSync(CPF_POLLER_STATE_FILE, 'utf8');
      cpfPollerState = JSON.parse(data);
      console.log(`📄 [CPFPoller] Estado carregado: ${cpfPollerState.totalProcessed} consultas processadas`);
    }
  } catch (error) {
    console.error('❌ [CPFPoller] Erro ao carregar estado:', error);
  }
}

function saveCPFPollerState(): void {
  try {
    const dataDir = path.dirname(CPF_POLLER_STATE_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(CPF_POLLER_STATE_FILE, JSON.stringify(cpfPollerState, null, 2), 'utf8');
  } catch (error) {
    console.error('❌ [CPFPoller] Erro ao salvar estado:', error);
  }
}

/**
 * Busca a etiqueta WhatsApp pelo formStatus
 */
async function getWhatsAppLabelByFormStatus(formStatus: string): Promise<{ id: string; nome: string } | null> {
  try {
    const label = await db.select()
      .from(whatsappLabels)
      .where(and(
        eq(whatsappLabels.formStatus, formStatus),
        isNull(whatsappLabels.qualificationStatus),
        eq(whatsappLabels.ativo, true)
      ))
      .limit(1)
      .then(rows => rows[0] || null);

    return label ? { id: label.id, nome: label.nome } : null;
  } catch (error: any) {
    console.error(`❌ [CPFPoller] Erro ao buscar etiqueta para ${formStatus}:`, error);
    return null;
  }
}

/**
 * Atualiza o lead com o status de CPF e a etiqueta correspondente
 * 
 * ATUALIZA:
 * - formStatus: 'cpf_approved' ou 'cpf_rejected' (para etiquetas WhatsApp)
 * - whatsappLabelId: etiqueta correspondente
 * - cpfCheckId: referência ao datacorp_checks.id
 * - cpfStatus: 'approved' ou 'rejected'
 * - cpfCheckedAt: timestamp da conclusão da verificação
 * - pipelineStatus: 'cpf-aprovado' ou 'cpf-reprovado' (para Kanban)
 */
async function updateLeadWithCPFStatus(
  leadId: string,
  cpfStatus: 'approved' | 'rejected',
  checkId: string
): Promise<boolean> {
  try {
    const formStatus = cpfStatus === 'approved' ? 'cpf_approved' : 'cpf_rejected';
    const pipelineStatus = cpfStatus === 'approved' ? 'cpf-aprovado' : 'cpf-reprovado';
    const label = await getWhatsAppLabelByFormStatus(formStatus);

    if (!label) {
      console.warn(`⚠️ [CPFPoller] Etiqueta não encontrada para formStatus: ${formStatus}`);
    }

    const updateData: any = {
      formStatus: formStatus,
      cpfStatus: cpfStatus,
      cpfCheckedAt: new Date(),
      pipelineStatus: pipelineStatus,
      updatedAt: new Date(),
    };

    if (label) {
      updateData.whatsappLabelId = label.id;
    }

    if (checkId && !checkId.startsWith('cliente-')) {
      updateData.cpfCheckId = checkId;
    }

    await db.update(leads)
      .set(updateData)
      .where(eq(leads.id, leadId));

    console.log(`✅ [CPFPoller] Lead ${leadId} atualizado: cpfStatus=${cpfStatus}, pipelineStatus=${pipelineStatus}${label ? `, etiqueta="${label.nome}"` : ''}`);
    return true;
  } catch (error: any) {
    console.error(`❌ [CPFPoller] Erro ao atualizar lead ${leadId}:`, error);
    return false;
  }
}

/**
 * Busca lead pelo submission_id
 */
async function findLeadBySubmissionId(submissionId: string, tenantId: string): Promise<{ id: string } | null> {
  try {
    const lead = await db.select({ id: leads.id })
      .from(leads)
      .where(and(
        eq(leads.submissionId, submissionId),
        eq(leads.tenantId, tenantId)
      ))
      .limit(1)
      .then(rows => rows[0] || null);

    return lead;
  } catch (error: any) {
    console.error(`❌ [CPFPoller] Erro ao buscar lead por submissionId:`, error);
    return null;
  }
}

/**
 * Normaliza telefone removendo caracteres especiais e sufixos WhatsApp
 */
function normalizeTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '').replace(/@s\.whatsapp\.net$/, '').replace(/@c\.us$/, '');
}

/**
 * Interface para resultado de CPF do Supabase Cliente
 */
interface CPFComplianceResultFromCliente {
  id: number;
  cpf: string;
  nome: string | null;
  telefone: string | null;
  status: string;
  dados: boolean;
  risco: number;
  processos: number;
  aprovado: boolean;
  data_consulta: string;
  check_id: string | null;
  processado_whatsapp?: boolean;
}

/**
 * Busca telefone de uma submission pelo CPF no Supabase
 * Usado quando a tabela cpf_compliance_results não tem a coluna telefone
 */
async function findPhoneByCPFInSubmissions(cpf: string): Promise<string | null> {
  try {
    const isConfigured = await isClienteSupabaseConfigured();
    if (!isConfigured) return null;

    const supabase = await getClienteSupabase();
    const normalizedCPF = normalizeCPF(cpf);
    
    // Buscar submission pelo CPF
    const { data, error } = await supabase
      .from('form_submissions')
      .select('contact_phone')
      .eq('contact_cpf', normalizedCPF)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0].contact_phone || null;
  } catch (e) {
    return null;
  }
}

/**
 * Busca consultas CPF pendentes do Supabase Cliente
 * 
 * ESTRATÉGIA ROBUSTA (3 níveis de fallback):
 * 1. Tenta buscar com colunas telefone e processado_whatsapp (tabelas completas)
 * 2. Se falhar, busca sem essas colunas e enriquece com telefone via form_submissions
 * 3. Usa cache local para controlar quais já foram processados
 */
async function fetchPendingCPFResults(): Promise<CPFComplianceResultFromCliente[]> {
  try {
    const isConfigured = await isClienteSupabaseConfigured();
    if (!isConfigured) {
      console.log('⚠️ [CPFPoller] Supabase do cliente não configurado');
      return [];
    }

    const supabase = await getClienteSupabase();
    
    // ESTRATÉGIA 1: Tentar com todas as colunas (tabela completa)
    try {
      const { data, error } = await supabase
        .from('cpf_compliance_results')
        .select('*')
        .not('telefone', 'is', null)
        .or('processado_whatsapp.is.null,processado_whatsapp.eq.false')
        .in('status', ['approved', 'rejected'])
        .order('data_consulta', { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        console.log(`📊 [CPFPoller] Encontradas ${data.length} consultas pendentes com telefone direto`);
        return data;
      }
      
      // Se o erro for sobre coluna inexistente, continuar para estratégias alternativas
      if (error && (error.message.includes('telefone') || error.message.includes('processado_whatsapp'))) {
        console.log('⚠️ [CPFPoller] Colunas telefone/processado_whatsapp não existem - usando estratégia via form_submissions');
      } else if (error) {
        console.error(`❌ [CPFPoller] Erro ao buscar resultados CPF:`, error.message);
      }
    } catch (e: any) {
      console.log('⚠️ [CPFPoller] Tentando estratégia via form_submissions...');
    }

    // ESTRATÉGIA 2: Buscar apenas campos básicos e enriquecer com telefone via form_submissions
    console.log('📱 [CPFPoller] Buscando resultados CPF e telefones via form_submissions...');
    
    const { data: allData, error: allError } = await supabase
      .from('cpf_compliance_results')
      .select('id, cpf, nome, status, dados, risco, processos, aprovado, data_consulta, check_id')
      .in('status', ['approved', 'rejected'])
      .order('data_consulta', { ascending: false })
      .limit(50);

    if (allError) {
      console.error(`❌ [CPFPoller] Erro ao buscar resultados CPF:`, allError.message);
      return [];
    }

    if (!allData || allData.length === 0) {
      console.log('ℹ️ [CPFPoller] Nenhum resultado CPF encontrado');
      return [];
    }

    // Filtrar localmente os já processados
    const processedIds = await getLocallyProcessedCPFResults();
    const pendingData = allData.filter(r => !processedIds.has(r.id));
    
    if (pendingData.length === 0) {
      console.log('ℹ️ [CPFPoller] Todos os resultados já foram processados');
      return [];
    }

    console.log(`📊 [CPFPoller] ${pendingData.length} resultados pendentes - buscando telefones via form_submissions...`);

    // Enriquecer cada resultado com telefone via form_submissions
    const enrichedResults: CPFComplianceResultFromCliente[] = [];
    
    for (const result of pendingData) {
      const telefone = await findPhoneByCPFInSubmissions(result.cpf);
      
      if (telefone) {
        enrichedResults.push({
          ...result,
          telefone: telefone,
          processado_whatsapp: false
        });
        console.log(`📞 [CPFPoller] Telefone encontrado para CPF ${result.cpf.substring(0, 3)}...: ${telefone.substring(0, 6)}...`);
      } else {
        // Mesmo sem telefone, marcar como processado para não tentar novamente
        await markLocallyProcessedCPFResult(result.id);
        console.log(`ℹ️ [CPFPoller] CPF ${result.cpf.substring(0, 3)}... sem telefone em form_submissions - marcado como processado`);
      }
    }
    
    console.log(`📊 [CPFPoller] ${enrichedResults.length} resultados com telefone encontrado (de ${pendingData.length} pendentes)`);
    return enrichedResults;
  } catch (error: any) {
    console.error(`❌ [CPFPoller] Erro ao buscar resultados CPF:`, error.message);
    return [];
  }
}

// Cache local de IDs já processados (para quando a coluna processado_whatsapp não existe)
const LOCAL_PROCESSED_IDS_FILE = path.join(process.cwd(), 'data', 'cpf_processed_ids.json');

async function getLocallyProcessedCPFResults(): Promise<Set<number>> {
  try {
    if (fs.existsSync(LOCAL_PROCESSED_IDS_FILE)) {
      const data = fs.readFileSync(LOCAL_PROCESSED_IDS_FILE, 'utf8');
      const ids = JSON.parse(data);
      return new Set(ids);
    }
  } catch (e) {
    // Silently fail
  }
  return new Set();
}

async function markLocallyProcessedCPFResult(resultId: number): Promise<void> {
  try {
    const processedIds = await getLocallyProcessedCPFResults();
    processedIds.add(resultId);
    
    const dataDir = path.dirname(LOCAL_PROCESSED_IDS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(LOCAL_PROCESSED_IDS_FILE, JSON.stringify([...processedIds]), 'utf8');
  } catch (e) {
    console.error('❌ [CPFPoller] Erro ao salvar IDs processados localmente:', e);
  }
}

/**
 * Marca um resultado CPF como processado (etiqueta WhatsApp atualizada)
 * Tenta atualizar no Supabase, mas usa cache local se a coluna não existir
 */
async function markCPFResultAsProcessed(resultId: number): Promise<boolean> {
  try {
    const isConfigured = await isClienteSupabaseConfigured();
    if (!isConfigured) {
      // Fallback para cache local
      await markLocallyProcessedCPFResult(resultId);
      return true;
    }

    const supabase = await getClienteSupabase();
    
    try {
      const { error } = await supabase
        .from('cpf_compliance_results')
        .update({ processado_whatsapp: true })
        .eq('id', resultId);

      if (error) {
        // Se o erro for sobre coluna inexistente, usar cache local
        if (error.message.includes('processado_whatsapp')) {
          console.log('⚠️ [CPFPoller] Coluna processado_whatsapp não existe - usando cache local');
          await markLocallyProcessedCPFResult(resultId);
          return true;
        }
        console.error(`❌ [CPFPoller] Erro ao marcar resultado como processado:`, error.message);
        return false;
      }
    } catch (e: any) {
      // Fallback para cache local
      await markLocallyProcessedCPFResult(resultId);
      return true;
    }

    return true;
  } catch (error: any) {
    console.error(`❌ [CPFPoller] Erro ao marcar resultado como processado:`, error.message);
    // Tentar cache local como último recurso
    await markLocallyProcessedCPFResult(resultId);
    return true;
  }
}

/**
 * Busca lead pelo telefone normalizado
 */
async function findLeadByPhone(phone: string, tenantId: string): Promise<{ id: string } | null> {
  try {
    const normalizedPhone = normalizeTelefone(phone);
    
    console.log(`🔍 [CPFPoller] Buscando lead pelo telefone: ${normalizedPhone.substring(0, 6)}...`);

    const lead = await db.select({ id: leads.id })
      .from(leads)
      .where(and(
        eq(leads.telefoneNormalizado, normalizedPhone),
        eq(leads.tenantId, tenantId)
      ))
      .limit(1)
      .then(rows => rows[0] || null);

    if (lead) {
      console.log(`✅ [CPFPoller] Lead encontrado: ${lead.id}`);
    } else {
      console.log(`ℹ️ [CPFPoller] Lead não encontrado para telefone ${normalizedPhone.substring(0, 6)}...`);
    }

    return lead;
  } catch (error: any) {
    console.error(`❌ [CPFPoller] Erro ao buscar lead por telefone:`, error.message);
    return null;
  }
}

/**
 * Busca lead pelo CPF normalizado (cpfNormalizado)
 * 
 * ESTRATÉGIA DE MATCHING:
 * 1. Busca exata pelo cpfNormalizado (apenas números)
 * 2. Retorna todos os leads que correspondem (multi-tenant)
 */
async function findLeadByCPF(cpf: string): Promise<{ id: string; tenantId: string }[]> {
  try {
    const normalizedCPF = normalizeCPF(cpf);
    
    console.log(`🔍 [CPFPoller] Buscando lead pelo CPF: ${normalizedCPF.substring(0, 3)}...${normalizedCPF.substring(8)}`);

    const foundLeads = await db.select({ id: leads.id, tenantId: leads.tenantId })
      .from(leads)
      .where(eq(leads.cpfNormalizado, normalizedCPF));

    if (foundLeads.length > 0) {
      console.log(`✅ [CPFPoller] Encontrados ${foundLeads.length} lead(s) com este CPF`);
    } else {
      console.log(`ℹ️ [CPFPoller] Lead não encontrado para CPF ${normalizedCPF.substring(0, 3)}...${normalizedCPF.substring(8)}`);
    }

    return foundLeads.filter(l => l.tenantId !== null) as { id: string; tenantId: string }[];
  } catch (error: any) {
    console.error(`❌ [CPFPoller] Erro ao buscar lead por CPF:`, error.message);
    return [];
  }
}

/**
 * Busca leads pelo telefone normalizado (sem filtro de tenant - para multi-tenant)
 */
async function findLeadsByPhone(phone: string): Promise<{ id: string; tenantId: string }[]> {
  try {
    const normalizedPhone = normalizeTelefone(phone);
    
    console.log(`🔍 [CPFPoller] Buscando leads pelo telefone (multi-tenant): ${normalizedPhone.substring(0, 6)}...`);

    const foundLeads = await db.select({ id: leads.id, tenantId: leads.tenantId })
      .from(leads)
      .where(eq(leads.telefoneNormalizado, normalizedPhone));

    if (foundLeads.length > 0) {
      console.log(`✅ [CPFPoller] Encontrados ${foundLeads.length} lead(s) com este telefone`);
    } else {
      console.log(`ℹ️ [CPFPoller] Lead não encontrado para telefone ${normalizedPhone.substring(0, 6)}...`);
    }

    return foundLeads.filter(l => l.tenantId !== null) as { id: string; tenantId: string }[];
  } catch (error: any) {
    console.error(`❌ [CPFPoller] Erro ao buscar leads por telefone:`, error.message);
    return [];
  }
}

/**
 * Extrai o CPF da consulta (descriptografando se necessário)
 * Tenta múltiplas fontes para máxima compatibilidade com dados legados
 */
function extractCPFFromCheck(check: DatacorpCheck): string | null {
  try {
    // ESTRATÉGIA 1: CPF criptografado (preferido)
    if (check.cpf_encrypted) {
      return decryptCPF(check.cpf_encrypted);
    }
    
    // ESTRATÉGIA 2: CPF formatado em person_cpf (dados legados)
    const checkAny = check as any;
    if (checkAny.person_cpf) {
      // Remove formatação (pontos e traços)
      return checkAny.person_cpf.replace(/\D/g, '');
    }
    
    // ESTRATÉGIA 3: Tentar extrair do payload se existir
    if (check.payload) {
      try {
        const payload = check.payload as any;
        if (payload?.Result?.[0]?.BasicData?.CPF) {
          return payload.Result[0].BasicData.CPF.replace(/\D/g, '');
        }
      } catch {
        // Silently fail payload extraction
      }
    }
    
    console.log(`ℹ️ [CPFPoller] Check ${check.id} não possui CPF extraível`);
    return null;
  } catch (error: any) {
    console.error(`❌ [CPFPoller] Erro ao extrair CPF:`, error.message);
    return null;
  }
}

/**
 * Processa um resultado CPF do Supabase Cliente e atualiza o lead
 * 
 * FLUXO DE BUSCA (com prioridade para CPF):
 * 1. PRIMEIRO: Busca lead pelo CPF/cpfNormalizado
 * 2. FALLBACK: Se não encontrar, busca pelo telefone
 * 3. Atualiza o lead com cpfStatus, cpfCheckId, cpfCheckedAt, pipelineStatus
 * 4. Marca o resultado como processado
 */
async function processCPFResultFromCliente(result: CPFComplianceResultFromCliente): Promise<boolean> {
  try {
    const cpf = result.cpf;
    const telefone = result.telefone;
    
    console.log(`🔄 [CPFPoller] Processando resultado CPF #${result.id} com status ${result.status}...`);

    let matchedLeads: { id: string; tenantId: string }[] = [];

    // ESTRATÉGIA 1: Buscar pelo CPF (prioritário)
    if (cpf) {
      console.log(`🔍 [CPFPoller] Tentando buscar lead pelo CPF: ${cpf.substring(0, 3)}...`);
      matchedLeads = await findLeadByCPF(cpf);
      
      if (matchedLeads.length > 0) {
        console.log(`✅ [CPFPoller] Lead(s) encontrado(s) via CPF: ${matchedLeads.length}`);
      }
    }

    // ESTRATÉGIA 2: Fallback para telefone se não encontrou pelo CPF
    if (matchedLeads.length === 0 && telefone) {
      console.log(`🔍 [CPFPoller] CPF não encontrou leads, tentando buscar pelo telefone: ${telefone.substring(0, 6)}...`);
      matchedLeads = await findLeadsByPhone(telefone);
      
      if (matchedLeads.length > 0) {
        console.log(`✅ [CPFPoller] Lead(s) encontrado(s) via telefone: ${matchedLeads.length}`);
      }
    }

    // Se não encontrou por nenhuma estratégia
    if (matchedLeads.length === 0) {
      console.log(`ℹ️ [CPFPoller] Lead não encontrado por CPF ou telefone - pulando resultado #${result.id}`);
      await markCPFResultAsProcessed(result.id);
      return true;
    }

    // Atualizar todos os leads correspondentes
    const cpfStatus = result.status === 'approved' ? 'approved' : 'rejected';
    let allSuccess = true;
    
    for (const lead of matchedLeads) {
      const success = await updateLeadWithCPFStatus(lead.id, cpfStatus, result.check_id || `cliente-${result.id}`);
      if (success) {
        console.log(`🏷️ [CPFPoller] Lead ${lead.id} (tenant: ${lead.tenantId?.substring(0, 8)}...) atualizado com CPF ${cpfStatus}`);
      } else {
        allSuccess = false;
      }
    }

    // Marcar resultado como processado
    if (allSuccess) {
      await markCPFResultAsProcessed(result.id);
      console.log(`✅ [CPFPoller] Resultado #${result.id} marcado como processado`);
    }

    return allSuccess;
  } catch (error: any) {
    console.error(`❌ [CPFPoller] Erro ao processar resultado ${result.id}:`, error);
    return false;
  }
}

/**
 * Busca submission pelo CPF no Supabase do cliente
 * Retorna o telefone do contato para buscar o lead
 * (Usado como fallback para dados antigos sem telefone direto)
 */
async function findSubmissionByCPF(cpf: string): Promise<{ id: string; contact_phone: string } | null> {
  try {
    const isConfigured = await isClienteSupabaseConfigured();
    if (!isConfigured) {
      console.log('⚠️ [CPFPoller] Supabase do cliente não configurado - não é possível buscar por CPF');
      return null;
    }

    const supabase = await getClienteSupabase();
    const normalizedCPF = normalizeCPF(cpf);
    
    console.log(`🔍 [CPFPoller] Buscando submission pelo CPF: ${normalizedCPF.substring(0, 3)}...${normalizedCPF.substring(8)}`);

    const { data, error } = await supabase
      .from('form_submissions')
      .select('id, contact_phone')
      .eq('contact_cpf', normalizedCPF)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`ℹ️ [CPFPoller] Nenhuma submission encontrada para o CPF`);
        return null;
      }
      console.error(`❌ [CPFPoller] Erro ao buscar submission por CPF:`, error.message);
      return null;
    }

    if (!data || !data.contact_phone) {
      console.log(`ℹ️ [CPFPoller] Submission encontrada mas sem telefone`);
      return null;
    }

    console.log(`✅ [CPFPoller] Submission encontrada: ${data.id}, telefone: ${data.contact_phone.substring(0, 6)}...`);
    return { id: data.id, contact_phone: data.contact_phone };
  } catch (error: any) {
    console.error(`❌ [CPFPoller] Erro ao buscar submission por CPF:`, error.message);
    return null;
  }
}

/**
 * LEGADO: Processa uma consulta de CPF do Supabase Master
 * Mantido para compatibilidade com consultas antigas sem telefone
 * 
 * FLUXO DE BUSCA (com prioridade para CPF):
 * 1. PRIMEIRO: Busca lead pelo CPF/cpfNormalizado diretamente no banco local
 * 2. Se não encontrar, tenta pelo submission_id
 * 3. FALLBACK: Busca submission via CPF no Supabase cliente -> telefone -> lead
 * 4. Atualiza o lead com cpfStatus, cpfCheckId, cpfCheckedAt, pipelineStatus
 */
async function processCPFCheck(check: DatacorpCheck): Promise<boolean> {
  try {
    // Só processar status approved ou rejected
    if (check.status !== 'approved' && check.status !== 'rejected') {
      return true; // Ignorar outros status (não é erro)
    }

    const tenantId = check.tenant_id;
    const submissionId = check.submission_id;
    let matchedLeads: { id: string; tenantId: string }[] = [];

    console.log(`🔄 [CPFPoller] Processando check ${check.id} com status ${check.status}...`);

    // Extrair CPF da consulta
    const cpf = extractCPFFromCheck(check);

    // ESTRATÉGIA 1: Buscar pelo CPF diretamente no banco (prioritário)
    if (cpf) {
      console.log(`🔍 [CPFPoller] Tentando buscar lead pelo CPF: ${cpf.substring(0, 3)}...`);
      matchedLeads = await findLeadByCPF(cpf);
      
      if (matchedLeads.length > 0) {
        console.log(`✅ [CPFPoller] Lead(s) encontrado(s) via CPF: ${matchedLeads.length}`);
      }
    }

    // ESTRATÉGIA 2: Buscar pelo submission_id (compatibilidade)
    if (matchedLeads.length === 0 && submissionId) {
      console.log(`🔍 [CPFPoller] CPF não encontrou leads, tentando buscar pelo submission_id: ${submissionId}`);
      const lead = await findLeadBySubmissionId(submissionId, tenantId);
      
      if (lead) {
        matchedLeads = [{ id: lead.id, tenantId: tenantId }];
        console.log(`✅ [CPFPoller] Lead encontrado via submission_id: ${lead.id}`);
      }
    }

    // ESTRATÉGIA 3: Fallback via CPF -> submission -> telefone -> lead
    if (matchedLeads.length === 0 && cpf) {
      console.log(`🔍 [CPFPoller] Tentando fallback via submission do cliente...`);
      
      // Buscar submission no Supabase cliente pelo CPF
      const submission = await findSubmissionByCPF(cpf);
      
      if (submission && submission.contact_phone) {
        // Buscar leads pelo telefone da submission
        matchedLeads = await findLeadsByPhone(submission.contact_phone);
        
        if (matchedLeads.length > 0) {
          console.log(`✅ [CPFPoller] Lead(s) encontrado(s) via CPF->submission->telefone: ${matchedLeads.length}`);
        }
      }
    }

    // Se não encontrou lead por nenhuma estratégia
    if (matchedLeads.length === 0) {
      console.log(`ℹ️ [CPFPoller] Lead não encontrado por nenhuma estratégia - pulando check ${check.id}`);
      return true;
    }

    // Atualizar todos os leads correspondentes
    let allSuccess = true;
    
    for (const lead of matchedLeads) {
      const success = await updateLeadWithCPFStatus(lead.id, check.status, check.id);
      if (success) {
        console.log(`🏷️ [CPFPoller] Lead ${lead.id} (tenant: ${lead.tenantId?.substring(0, 8)}...) atualizado com CPF ${check.status}`);
      } else {
        allSuccess = false;
      }
    }

    return allSuccess;
  } catch (error: any) {
    console.error(`❌ [CPFPoller] Erro ao processar check ${check.id}:`, error);
    return false;
  }
}

/**
 * Executa uma rodada de polling de consultas CPF
 * 
 * NOVA ESTRATÉGIA (prioritária):
 * 1. Busca resultados pendentes do Supabase Cliente (cpf_compliance_results com telefone)
 * 2. Para cada resultado, usa o telefone diretamente para encontrar o lead
 * 3. Marca como processado após sucesso
 * 
 * FALLBACK (compatibilidade):
 * Se não houver resultados no Cliente, busca no Master como antes
 */
export async function pollCPFCompliance(): Promise<{
  success: boolean;
  processedCount: number;
  error?: string;
}> {
  try {
    console.log('🔍 [CPFPoller] Iniciando polling de consultas CPF...');
    cpfPollerState.lastPolledAt = new Date().toISOString();
    
    let processedCount = 0;

    // ESTRATÉGIA 1: Buscar do Supabase Cliente (com telefone direto - mais simples!)
    const isClienteConfigured = await isClienteSupabaseConfigured();
    if (isClienteConfigured) {
      console.log('📱 [CPFPoller] Buscando resultados com telefone do Supabase Cliente...');
      
      const pendingResults = await fetchPendingCPFResults();
      
      if (pendingResults.length > 0) {
        console.log(`📊 [CPFPoller] ${pendingResults.length} resultados pendentes no Cliente`);
        
        for (const result of pendingResults) {
          const success = await processCPFResultFromCliente(result);
          if (success) {
            processedCount++;
          } else {
            cpfPollerState.totalErrors++;
          }
        }
      } else {
        console.log('ℹ️ [CPFPoller] Nenhum resultado pendente no Supabase Cliente');
      }
    }

    // ESTRATÉGIA 2: Fallback para Supabase Master (compatibilidade com dados antigos)
    // Processa TODOS os checks (com ou sem submission_id) para permitir fallback via CPF→telefone
    // Usa verificação sem tenantId para checagem global
    if (processedCount === 0 && await isSupabaseMasterConfigured()) {
      console.log('🔄 [CPFPoller] Verificando Supabase Master (compatibilidade)...');
      
      // Busca credenciais do banco de dados primeiro, depois env vars
      let supabase: ReturnType<typeof getSupabaseMaster>;
      try {
        // Tenta buscar do banco usando fallback (passa undefined para pegar qualquer config)
        supabase = await getSupabaseMasterForTenant('system');
      } catch (e: any) {
        // Fallback para variáveis de ambiente se banco falhar
        console.log('⚠️ [CPFPoller] Fallback para env vars:', e.message);
        supabase = getSupabaseMaster();
      }
      
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: checks, error } = await supabase
        .from('datacorp_checks')
        .select('*')
        .in('status', ['approved', 'rejected'])
        .gte('updated_at', twentyFourHoursAgo)
        .order('updated_at', { ascending: true })
        .limit(20);

      if (error) {
        console.error('❌ [CPFPoller] Erro ao buscar do Master:', error.message);
      } else if (checks && checks.length > 0) {
        console.log(`📊 [CPFPoller] ${checks.length} consultas no Master (fallback)`);
        
        for (const check of checks) {
          const success = await processCPFCheck(check as DatacorpCheck);
          if (success) {
            processedCount++;
          } else {
            cpfPollerState.totalErrors++;
          }
        }
      }
    }

    cpfPollerState.totalProcessed += processedCount;
    cpfPollerState.lastError = null;
    saveCPFPollerState();

    console.log(`✅ [CPFPoller] Polling concluído: ${processedCount} consultas processadas`);
    
    return {
      success: true,
      processedCount
    };

  } catch (error: any) {
    console.error('❌ [CPFPoller] Erro no polling:', error);
    cpfPollerState.lastError = error.message;
    cpfPollerState.totalErrors++;
    saveCPFPollerState();
    
    return {
      success: false,
      processedCount: 0,
      error: error.message
    };
  }
}

/**
 * Retorna o estado atual do poller
 */
export function getCPFPollerState(): CPFPollerState {
  return { ...cpfPollerState };
}

/**
 * Sincroniza manualmente todas as consultas CPF existentes com os leads
 * Útil para migração ou correção de dados
 * 
 * NOTA: Agora processa TODAS as consultas (com ou sem submission_id)
 * pois a busca por CPF via form_submissions funciona como fallback
 */
export async function syncAllCPFToLeads(): Promise<{
  success: boolean;
  processedCount: number;
  errors: number;
}> {
  try {
    // Usa verificação sem tenantId para checagem global via variáveis de ambiente
    if (!await isSupabaseMasterConfigured()) {
      console.log('⚠️ [CPFPoller] Supabase Master não configurado');
      return { success: false, processedCount: 0, errors: 0 };
    }

    console.log('🔄 [CPFPoller] Sincronizando todas as consultas CPF com leads...');

    // Para sincronização global, usa getSupabaseMaster() que lê variáveis de ambiente
    const supabase = getSupabaseMaster();
    
    const { data: checks, error } = await supabase
      .from('datacorp_checks')
      .select('*')
      .in('status', ['approved', 'rejected'])
      .order('consulted_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('❌ [CPFPoller] Erro ao buscar consultas:', error);
      return { success: false, processedCount: 0, errors: 1 };
    }

    if (!checks || checks.length === 0) {
      console.log('ℹ️ [CPFPoller] Nenhuma consulta CPF encontrada');
      return { success: true, processedCount: 0, errors: 0 };
    }

    console.log(`📊 [CPFPoller] Sincronizando ${checks.length} consultas...`);

    let processedCount = 0;
    let errors = 0;

    for (const check of checks) {
      const success = await processCPFCheck(check as DatacorpCheck);
      if (success) {
        processedCount++;
      } else {
        errors++;
      }
    }

    console.log(`✅ [CPFPoller] Sincronização concluída: ${processedCount} processados, ${errors} erros`);

    return {
      success: true,
      processedCount,
      errors
    };

  } catch (error: any) {
    console.error('❌ [CPFPoller] Erro na sincronização:', error);
    return { success: false, processedCount: 0, errors: 1 };
  }
}

/**
 * Sincroniza consultas CPF do Supabase Master para o Supabase Cliente
 * Isso permite que o cliente tenha seu próprio histórico de consultas
 */
export async function syncMasterToCliente(): Promise<{
  success: boolean;
  synced: number;
  errors: number;
  message: string;
}> {
  try {
    // Usa verificação sem tenantId para checagem global via variáveis de ambiente
    if (!await isSupabaseMasterConfigured()) {
      console.log('⚠️ [CPFSync] Supabase Master não configurado');
      return { success: false, synced: 0, errors: 0, message: 'Supabase Master não configurado' };
    }

    const { isClienteSupabaseConfigured, saveComplianceToClienteSupabase } = await import('./clienteSupabase.js');
    
    const isClienteConfigured = await isClienteSupabaseConfigured();
    if (!isClienteConfigured) {
      console.log('⚠️ [CPFSync] Supabase Cliente não configurado');
      return { success: false, synced: 0, errors: 0, message: 'Supabase Cliente não configurado' };
    }

    console.log('🔄 [CPFSync] Sincronizando consultas do Supabase Master para o Cliente...');

    // Para sincronização global, usa getSupabaseMaster() que lê variáveis de ambiente
    const supabase = getSupabaseMaster();
    
    // Buscar todas as consultas do Master
    const { data: checks, error } = await supabase
      .from('datacorp_checks')
      .select('*')
      .order('consulted_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('❌ [CPFSync] Erro ao buscar consultas do Master:', error);
      return { success: false, synced: 0, errors: 1, message: error.message };
    }

    if (!checks || checks.length === 0) {
      console.log('ℹ️ [CPFSync] Nenhuma consulta encontrada no Master');
      return { success: true, synced: 0, errors: 0, message: 'Nenhuma consulta encontrada no Master' };
    }

    console.log(`📊 [CPFSync] Encontradas ${checks.length} consultas para sincronizar`);

    let synced = 0;
    let errors = 0;

    for (const check of checks) {
      try {
        // Extrair CPF descriptografado
        const cpf = extractCPFFromCheck(check as DatacorpCheck);
        
        if (!cpf) {
          console.log(`⚠️ [CPFSync] Check ${check.id} sem CPF descriptografável`);
          errors++;
          continue;
        }

        // Formatar dados para o Cliente
        const clienteData = {
          cpf: cpf,
          nome: check.person_name || null,
          status: check.status,
          dados: !!check.payload,
          risco: check.risk_score || 0,
          processos: check.payload?.totalLawsuits || 0,
          aprovado: check.status === 'approved',
          data_consulta: check.consulted_at,
          check_id: check.id
        };

        // MULTI-TENANT: Passar tenantId para salvar no Supabase correto do tenant
        const tenantId = check.tenant_id;
        const result = await saveComplianceToClienteSupabase(clienteData, tenantId);
        
        if (result.success) {
          synced++;
        } else {
          errors++;
        }
      } catch (err: any) {
        console.error(`❌ [CPFSync] Erro ao sincronizar check ${check.id}:`, err.message);
        errors++;
      }
    }

    console.log(`✅ [CPFSync] Sincronização concluída: ${synced} sincronizados, ${errors} erros`);

    return {
      success: true,
      synced,
      errors,
      message: `${synced} consultas sincronizadas, ${errors} erros`
    };

  } catch (error: any) {
    console.error('❌ [CPFSync] Erro na sincronização:', error);
    return { success: false, synced: 0, errors: 1, message: error.message };
  }
}

/**
 * Busca todas as consultas CPF do Supabase Master
 * Útil para exibir no dashboard do cliente
 */
export async function fetchAllMasterChecks(): Promise<{
  success: boolean;
  checks: DatacorpCheck[];
  message: string;
}> {
  try {
    // Usa verificação sem tenantId para checagem global via variáveis de ambiente
    if (!await isSupabaseMasterConfigured()) {
      return { success: false, checks: [], message: 'Supabase Master não configurado' };
    }

    // Para busca global, usa getSupabaseMaster() que lê variáveis de ambiente
    const supabase = getSupabaseMaster();
    
    const { data: checks, error } = await supabase
      .from('datacorp_checks')
      .select('*')
      .order('consulted_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('❌ [CPFSync] Erro ao buscar consultas:', error);
      return { success: false, checks: [], message: error.message };
    }

    console.log(`📊 [CPFSync] Encontradas ${checks?.length || 0} consultas no Master`);

    return {
      success: true,
      checks: checks as DatacorpCheck[] || [],
      message: `${checks?.length || 0} consultas encontradas`
    };

  } catch (error: any) {
    console.error('❌ [CPFSync] Erro ao buscar consultas:', error);
    return { success: false, checks: [], message: error.message };
  }
}

// ============================================================
// CPF AUTO-CHECK FOR APPROVED SUBMISSIONS (Supabase-only mode)
// ============================================================

/**
 * State file for tracking processed submissions (idempotency)
 */
const CPF_AUTO_CHECK_STATE_FILE = path.join(process.cwd(), 'data', 'cpf_auto_check_processed.json');

interface CPFAutoCheckState {
  processedSubmissionIds: string[];
  lastRun: string | null;
  totalProcessed: number;
  totalErrors: number;
}

let cpfAutoCheckState: CPFAutoCheckState = {
  processedSubmissionIds: [],
  lastRun: null,
  totalProcessed: 0,
  totalErrors: 0
};

function loadCPFAutoCheckState(): void {
  try {
    const dataDir = path.dirname(CPF_AUTO_CHECK_STATE_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(CPF_AUTO_CHECK_STATE_FILE)) {
      const data = fs.readFileSync(CPF_AUTO_CHECK_STATE_FILE, 'utf8');
      cpfAutoCheckState = JSON.parse(data);
      
      // Keep only last 1000 processed IDs to prevent file from growing too large
      if (cpfAutoCheckState.processedSubmissionIds.length > 1000) {
        cpfAutoCheckState.processedSubmissionIds = cpfAutoCheckState.processedSubmissionIds.slice(-1000);
      }
      
      console.log(`📄 [CPFAutoCheck] Estado carregado: ${cpfAutoCheckState.totalProcessed} consultas processadas`);
    }
  } catch (error) {
    console.error('❌ [CPFAutoCheck] Erro ao carregar estado:', error);
  }
}

function saveCPFAutoCheckState(): void {
  try {
    const dataDir = path.dirname(CPF_AUTO_CHECK_STATE_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(CPF_AUTO_CHECK_STATE_FILE, JSON.stringify(cpfAutoCheckState, null, 2), 'utf8');
  } catch (error) {
    console.error('❌ [CPFAutoCheck] Erro ao salvar estado:', error);
  }
}

/**
 * Busca o tenant_id do formulário pelo form_id
 * O tenant é derivado do user_id do formulário (quem criou)
 */
async function getFormTenantId(formId: string): Promise<string | null> {
  try {
    const supabase = await getClienteSupabase();
    const { data: form, error } = await supabase
      .from('forms')
      .select('user_id, tenant_id')
      .eq('id', formId)
      .single();
    
    if (error || !form) {
      console.log(`⚠️ [CPFAutoCheck] Formulário ${formId} não encontrado`);
      return null;
    }
    
    // Prioridade: tenant_id explícito > user_id como tenant
    const tenantId = form.tenant_id || form.user_id;
    if (tenantId) {
      console.log(`✅ [CPFAutoCheck] Tenant do formulário ${formId}: ${tenantId}`);
      return tenantId;
    }
    
    return null;
  } catch (error: any) {
    console.error(`❌ [CPFAutoCheck] Erro ao buscar tenant do formulário:`, error.message);
    return null;
  }
}

/**
 * Tabelas de submissions suportadas (em ordem de prioridade)
 * Diferentes tenants podem ter esquemas diferentes
 */
const SUBMISSIONS_TABLES = ['form_submissions', 'form_submissions_compliance_tracking'];

/**
 * Busca submissions aprovadas de uma tabela específica do tenant
 */
async function fetchApprovedSubmissionsFromTenant(
  supabase: any,
  tableName: string,
  limit: number = 50
): Promise<{ data: any[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('id, contact_cpf, contact_name, contact_phone, form_id, created_at, passed')
      .eq('passed', true)
      .not('contact_cpf', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return { data, error };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Checks approved form submissions that don't have a CPF compliance check yet.
 * This is for Supabase-only mode where leads come directly from Supabase.
 * 
 * FLOW (MULTI-TENANT):
 * 1. Get all tenants that have BOTH BigDataCorp AND Supabase configured
 * 2. For each tenant, use their specific Supabase client
 * 3. Try to fetch submissions from available tables (form_submissions or form_submissions_compliance_tracking)
 * 4. For each approved submission with CPF, check if compliance already exists
 * 5. If not, trigger checkCompliance() with the correct tenant_id
 * 6. Update state file for idempotency
 */
export async function checkApprovedSubmissionsWithoutCPF(): Promise<{
  success: boolean;
  processedCount: number;
  errors: number;
}> {
  console.log('🔍 [CPFAutoCheck] Verificando leads aprovados sem consulta CPF...');
  
  try {
    let tenants: { tenantId: string }[] = [];
    try {
      tenants = await db.select({ tenantId: bigdatacorpConfig.tenantId })
        .from(bigdatacorpConfig)
        .where(isNotNull(bigdatacorpConfig.tenantId));
    } catch (e) {
      console.log('⚠️ [CPFAutoCheck] Erro ao buscar tenants BigDataCorp, usando fallback');
    }
    
    const tenantsWithBigdataSet = new Set(tenants.map(t => t.tenantId).filter(Boolean));
    if (tenantsWithBigdataSet.size === 0) tenantsWithBigdataSet.add('system');
    
    // 2. Buscar tenants com Supabase configurado
    let tenantsWithSupabase: any[] = [];
    try {
      tenantsWithSupabase = await db.select({
        tenantId: supabaseConfig.tenantId,
        supabaseUrl: supabaseConfig.supabaseUrl,
        supabaseAnonKey: supabaseConfig.supabaseAnonKey
      })
        .from(supabaseConfig)
        .where(isNotNull(supabaseConfig.tenantId));
    } catch (e) {
      console.log('⚠️ [CPFAutoCheck] Erro ao buscar tenants Supabase, usando fallback');
    }
    
    if (tenantsWithSupabase.length === 0) {
      tenantsWithSupabase = [{ tenantId: 'system' }];
    }
    
    // 3. Filtrar apenas tenants que têm AMBOS configurados (BigDataCorp + Supabase)
    const eligibleTenants = tenantsWithSupabase.filter(t => 
      t.tenantId && tenantsWithBigdataSet.has(t.tenantId)
    );
    
    if (eligibleTenants.length === 0) {
      console.log('⚠️ [CPFAutoCheck] Nenhum tenant com BigDataCorp E Supabase configurados - pulando verificação');
      return { success: true, processedCount: 0, errors: 0 };
    }
    
    console.log(`✅ [CPFAutoCheck] Encontrados ${eligibleTenants.length} tenant(s) elegíveis (com BigDataCorp + Supabase)`);

    let totalProcessedCount = 0;
    let totalErrors = 0;

    // 4. Processar cada tenant individualmente
    for (const tenantConfig of eligibleTenants) {
      const tenantId = tenantConfig.tenantId!;
      
      try {
        console.log(`🏢 [CPFAutoCheck] Processando tenant: ${tenantId}`);
        
        // Obter cliente Supabase específico do tenant
        const supabase = await getClientSupabaseClient(tenantId);
        
        if (!supabase) {
          console.log(`⚠️ [CPFAutoCheck] Não foi possível obter cliente Supabase para tenant ${tenantId}`);
          continue;
        }
        
        // 5. Tentar buscar submissions de cada tabela possível
        let submissions: any[] = [];
        let usedTable: string | null = null;
        
        for (const tableName of SUBMISSIONS_TABLES) {
          const { data, error } = await fetchApprovedSubmissionsFromTenant(supabase, tableName);
          
          if (!error && data && data.length > 0) {
            submissions = data;
            usedTable = tableName;
            console.log(`📊 [CPFAutoCheck] Tenant ${tenantId}: ${submissions.length} submissions em '${tableName}'`);
            break;
          } else if (error) {
            // Se o erro é "tabela não existe", tentar a próxima
            if (error.code === 'PGRST205' || error.code === '42P01' || 
                error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
              console.log(`ℹ️ [CPFAutoCheck] Tenant ${tenantId}: Tabela '${tableName}' não existe, tentando próxima...`);
              continue;
            }
            // Outro tipo de erro, logar e continuar
            console.log(`⚠️ [CPFAutoCheck] Tenant ${tenantId}: Erro em '${tableName}': ${error.message}`);
          }
        }
        
        if (submissions.length === 0) {
          console.log(`ℹ️ [CPFAutoCheck] Tenant ${tenantId}: Nenhuma submission aprovada com CPF encontrada`);
          continue;
        }
        
        // Log detalhado para debug - mostrar IDs das submissions encontradas
        console.log(`📋 [CPFAutoCheck] Tenant ${tenantId}: IDs encontrados: ${submissions.map(s => s.id.substring(0, 8)).join(', ')}`);
        
        // 6. Filtrar submissions já processadas (idempotência)
        const pendingSubmissions = submissions.filter(
          s => !cpfAutoCheckState.processedSubmissionIds.includes(s.id)
        );
        
        if (pendingSubmissions.length === 0) {
          // Log detalhado: mostrar o primeiro ID que foi encontrado e já processado
          const firstProcessed = submissions[0];
          console.log(`ℹ️ [CPFAutoCheck] Tenant ${tenantId}: Todas as ${submissions.length} submissions já foram processadas`);
          console.log(`ℹ️ [CPFAutoCheck] Exemplo: ID ${firstProcessed.id.substring(0, 8)}... já está na lista de ${cpfAutoCheckState.processedSubmissionIds.length} processados`);
          continue;
        }
        
        console.log(`📋 [CPFAutoCheck] Tenant ${tenantId}: ${pendingSubmissions.length} submissions pendentes`);
        
        // 7. Processar cada submission
        for (const submission of pendingSubmissions) {
          try {
            const cpf = submission.contact_cpf;
            if (!cpf) continue;
            
            const normalizedCPF = normalizeCPF(cpf);
            
            // Verificar se já existe consulta CPF para este CPF
            const { data: existingResult, error: checkError } = await supabase
              .from('cpf_compliance_results')
              .select('id')
              .eq('cpf', normalizedCPF)
              .limit(1);
            
            if (checkError) {
              // Se tabela não existe, continuar para próxima submission
              if (checkError.code === 'PGRST205' || checkError.code === '42P01' ||
                  checkError.message?.includes('schema cache')) {
                console.log(`⚠️ [CPFAutoCheck] Tenant ${tenantId}: Tabela cpf_compliance_results não existe`);
                break;
              }
              console.error(`❌ [CPFAutoCheck] Erro ao verificar CPF existente:`, checkError.message);
              totalErrors++;
              continue;
            }
            
            // NOTA: SEMPRE consulta CPF, mesmo se já existe consulta anterior
            // Isso garante que os dados estejam sempre atualizados
            if (existingResult && existingResult.length > 0) {
              console.log(`🔄 [CPFAutoCheck] CPF ${normalizedCPF.substring(0, 3)}... já possui consulta anterior - RECONSULTANDO para atualização`);
            }
            
            // 8. Disparar consulta CPF com o tenantId correto
            // IMPORTANT: checkCompliance() now has centralized submission_id deduplication
            // If a check already exists for this submission_id, it will return the existing check
            const timestamp = new Date().toISOString();
            console.log(`🔔 [CPFAutoCheck] ${timestamp} - TRIGGER recebido`);
            console.log(`   📋 Submission ID: ${submission.id}`);
            console.log(`   🏢 Tenant: ${tenantId.substring(0, 8)}...`);
            console.log(`   📋 CPF: ${normalizedCPF.substring(0, 3)}...${normalizedCPF.substring(normalizedCPF.length - 2)}`);
            console.log(`🔍 [CPFAutoCheck] Chamando checkCompliance() para submission ${submission.id}...`);
            
            const result = await checkCompliance(cpf, {
              tenantId: tenantId,
              submissionId: submission.id,
              personName: submission.contact_name || undefined,
              personPhone: submission.contact_phone || undefined,
              createdBy: 'system-cpfautocheck',
            });
            
            const cacheStatus = result.fromCache ? 'DEDUP/CACHE HIT (economia de API)' : 'API CALL (nova consulta)';
            console.log(`✅ [CPFAutoCheck] Consulta concluída para submission ${submission.id}:`);
            console.log(`   📊 Status: ${result.status}`);
            console.log(`   📈 Risk Score: ${result.riskScore}`);
            console.log(`   💾 Resultado: ${cacheStatus}`);
            console.log(`   🏷️ Check ID: ${result.checkId}`);
            
            // Marcar como processado
            cpfAutoCheckState.processedSubmissionIds.push(submission.id);
            cpfAutoCheckState.totalProcessed++;
            totalProcessedCount++;
            
            // Delay para evitar rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (err: any) {
            console.error(`❌ [CPFAutoCheck] Erro ao processar submission ${submission.id}:`, err.message);
            totalErrors++;
            cpfAutoCheckState.totalErrors++;
            cpfAutoCheckState.processedSubmissionIds.push(submission.id);
          }
        }
        
      } catch (tenantError: any) {
        console.error(`❌ [CPFAutoCheck] Erro ao processar tenant ${tenantId}:`, tenantError.message);
        totalErrors++;
      }
    }

    // Atualizar estado
    cpfAutoCheckState.lastRun = new Date().toISOString();
    saveCPFAutoCheckState();

    console.log(`✅ [CPFAutoCheck] Verificação concluída: ${totalProcessedCount} consultas realizadas, ${totalErrors} erros`);

    return {
      success: true,
      processedCount: totalProcessedCount,
      errors: totalErrors
    };

  } catch (error: any) {
    console.error('❌ [CPFAutoCheck] Erro na verificação automática:', error);
    return { success: false, processedCount: 0, errors: 1 };
  }
}

// Load state on module initialization
loadCPFAutoCheckState();

// Carregar estado na inicialização do módulo
loadCPFPollerState();
