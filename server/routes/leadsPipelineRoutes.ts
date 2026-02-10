import express from 'express';
import { z } from 'zod';
import { db } from '../db';
import { leads, dadosCliente } from '../../shared/db-schema';
import { eq, and, sql } from 'drizzle-orm';
import { getClientSupabaseClientStrict } from '../lib/multiTenantSupabase';
import { aggregateLeadJourneys, LeadJourney } from '../lib/leadJourneyAggregator';
import { normalizePhone } from '../formularios/utils/phoneNormalizer.js';

const router = express.Router();

// In-memory cache for leads data to avoid long Supabase fetches on every request
// This prevents browser timeouts in Replit's proxy environment
interface LeadsCacheEntry {
  data: any[];
  timestamp: number;
  tenantId: string;
}

const leadsCache = new Map<string, LeadsCacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache
const CACHE_WAIT_TIMEOUT_MS = 4500; // Wait up to 4.5s for cache (Replit proxy timeout is ~5s)

// Export function to invalidate cache (used by mutations)
export function invalidateLeadsCache(tenantId?: string) {
  if (tenantId) {
    leadsCache.delete(tenantId);
    console.log(`[LeadsCache] Invalidated cache for tenant: ${tenantId}`);
  } else {
    leadsCache.clear();
    console.log('[LeadsCache] Invalidated all caches');
  }
}

// Background refresh function - non-blocking
async function refreshLeadsCacheBackground(tenantId: string) {
  try {
    console.log(`[LeadsCache] Background refresh for tenant: ${tenantId}`);
    const journeys = await aggregateLeadJourneys(tenantId);
    const transformedLeads = journeys.map(journey => transformJourneyToLead(journey));
    
    leadsCache.set(tenantId, {
      data: transformedLeads,
      timestamp: Date.now(),
      tenantId
    });
    console.log(`[LeadsCache] Cached ${transformedLeads.length} leads for tenant: ${tenantId}`);
  } catch (error) {
    console.error(`[LeadsCache] Background refresh failed:`, error);
  }
}

// Track pending refreshes to avoid duplicate fetches
const pendingRefreshes = new Map<string, Promise<void>>();

// Get cached leads or fetch synchronously if cache miss
function getCachedLeads(tenantId: string): { data: any[] | null; isStale: boolean; isPending: boolean } {
  const cached = leadsCache.get(tenantId);
  const isPending = pendingRefreshes.has(tenantId);
  
  if (!cached) {
    return { data: null, isStale: true, isPending };
  }
  
  const age = Date.now() - cached.timestamp;
  const isStale = age > CACHE_TTL_MS;
  
  return { data: cached.data, isStale, isPending };
}

// Wait for pending refresh with timeout
async function waitForPendingRefresh(tenantId: string, timeoutMs: number = CACHE_WAIT_TIMEOUT_MS): Promise<boolean> {
  const pending = pendingRefreshes.get(tenantId);
  if (!pending) return false;
  
  try {
    await Promise.race([
      pending,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
    ]);
    return true; // Refresh completed
  } catch {
    return false; // Timeout
  }
}

// Debug endpoint to test if basic responses work
router.get('/ping', (req, res) => {
  console.log('[LeadsPipeline] PING received');
  res.json({ success: true, message: 'pong', timestamp: new Date().toISOString() });
});

const PIPELINE_STAGES = [
  'contato-inicial',
  'formulario-nao-preenchido',
  'formulario-aprovado',
  'formulario-reprovado',
  'cpf-aprovado',
  'cpf-reprovado',
  'reuniao-pendente',
  'reuniao-agendada',
  'reuniao-nao-compareceu',
  'reuniao-completo',
  'assinatura-pendente',
  'revendedora',
  'consultor'
] as const;

type PipelineStage = typeof PIPELINE_STAGES[number];

const updateLeadSchema = z.object({
  pipelineStatus: z.enum(PIPELINE_STAGES).optional(),
  meetingStatus: z.enum(['pending', 'scheduled', 'completed', 'cancelled']).optional(),
  cpfStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
  qualificationStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
  observacoes: z.string().optional(),
  consultorNome: z.string().optional(),
  consultorEmail: z.string().optional(),
  reuniaoData: z.string().optional(),
  reuniaoHora: z.string().optional(),
  reuniaoLocal: z.string().optional(),
  reuniaoTipo: z.enum(['presencial', 'online']).optional(),
  reuniaoLink: z.string().optional(),
  resultadoReuniao: z.enum(['aprovado', 'em_analise', 'recusado']).optional(),
  motivoRecusa: z.string().optional(),
});

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function transformRowToCamelCase(row: Record<string, any>): Record<string, any> {
  const transformed: Record<string, any> = {};
  for (const key of Object.keys(row)) {
    transformed[snakeToCamel(key)] = row[key];
  }
  return transformed;
}

/**
 * Transform Supabase form_submission to lead format for Kanban display
 * This enables direct Supabase queries when local leads table is empty
 */
function transformSubmissionToLead(submission: any): Record<string, any> {
  // FIX: Robust passed checking - handle boolean, string, and edge cases
  let pipelineStatus = 'contato-inicial';
  const formStatus = submission.form_status || 'completed';
  const passedValue = submission.passed;
  
  // Log for debugging
  console.log(`📋 [transformSubmissionToLead] Submission ${submission.id}: passed=${JSON.stringify(passedValue)} (type: ${typeof passedValue})`);
  
  // Check for rejection: boolean false, string "false", "rejected", "reprovado", or 0
  const isRejected = passedValue === false || 
                     passedValue === 'false' ||
                     passedValue === 'rejected' ||
                     passedValue === 'reprovado' ||
                     passedValue === 0;
  
  // Check for approval: boolean true, string "true", "approved", "aprovado", or 1
  const isApproved = passedValue === true || 
                     passedValue === 'true' ||
                     passedValue === 'approved' ||
                     passedValue === 'aprovado' ||
                     passedValue === 1;
  
  if (isApproved) {
    pipelineStatus = 'formulario-aprovado';
  } else if (isRejected) {
    pipelineStatus = 'formulario-reprovado';
  }
  // If passedValue is undefined/null, stay at contato-inicial (will be handled by formulario_envios)
  
  return {
    id: submission.id,
    // 🔐 SECURITY FIX: Never use 'default-tenant' as fallback - require valid tenant_id
    tenantId: submission.tenant_id || '',
    telefone: submission.contact_phone,
    telefoneNormalizado: submission.contact_phone ? normalizePhone(submission.contact_phone) : '',
    nome: submission.contact_name || 'Sem nome',
    email: submission.contact_email,
    origem: 'formulario',
    formStatus: formStatus,
    qualificationStatus: isApproved ? 'approved' : (isRejected ? 'rejected' : 'pending'),
    statusQualificacao: isApproved ? 'aprovado' : (isRejected ? 'reprovado' : 'pendente'),
    pontuacao: submission.total_score || 0,
    pipelineStatus: pipelineStatus,
    calculatedStage: pipelineStatus,
    formularioId: submission.form_id,
    submissionId: submission.id,
    formularioConcluido: formStatus === 'completed',
    formularioConcluidoEm: formStatus === 'completed' ? submission.updated_at : null,
    formularioAberto: ['opened', 'started', 'completed'].includes(formStatus),
    formularioAbertoEm: ['opened', 'started', 'completed'].includes(formStatus) ? submission.created_at : null,
    cpf: submission.contact_cpf,
    createdAt: submission.created_at,
    updatedAt: submission.updated_at,
  };
}

/**
 * Transform dados_cliente from Supabase to lead format for Kanban display
 * Clients in dados_cliente that haven't submitted forms are "contato-inicial"
 */
function transformDadosClienteToLead(cliente: any): Record<string, any> {
  let pipelineStatus = 'contato-inicial';
  
  if (cliente.resultado_reuniao) {
    pipelineStatus = 'consultor';
  } else if (cliente.reuniao_status === 'realizada') {
    pipelineStatus = 'reuniao-completo';
  } else if (cliente.reuniao_status === 'agendada') {
    pipelineStatus = 'reuniao-agendada';
  } else if (cliente.reuniao_status === 'pendente' && cliente.reuniao_data) {
    pipelineStatus = 'reuniao-pendente';
  }
  
  return {
    id: cliente.id,
    // 🔐 SECURITY FIX: Never use 'default-tenant' as fallback - require valid tenant_id
    tenantId: cliente.tenant_id || '',
    telefone: cliente.telefone,
    telefoneNormalizado: cliente.telefone ? normalizePhone(cliente.telefone) : '',
    nome: cliente.nome || 'Sem nome',
    email: cliente.email,
    origem: 'dados_cliente',
    formStatus: 'not_sent',
    qualificationStatus: 'pending',
    statusQualificacao: 'pendente',
    pontuacao: 0,
    pipelineStatus: pipelineStatus,
    calculatedStage: pipelineStatus,
    cpf: cliente.cpf,
    reuniaoStatus: cliente.reuniao_status,
    reuniaoData: cliente.reuniao_data,
    reuniaoHora: cliente.reuniao_hora,
    reuniaoLocal: cliente.reuniao_local,
    reuniaoTipo: cliente.reuniao_tipo,
    reuniaoLink: cliente.reuniao_link,
    consultorNome: cliente.consultor_nome,
    consultorEmail: cliente.consultor_email,
    resultadoReuniao: cliente.resultado_reuniao,
    motivoRecusa: cliente.motivo_recusa,
    createdAt: cliente.created_at,
    updatedAt: cliente.updated_at || cliente.created_at,
  };
}

/**
 * Transform LeadJourney (from aggregator) to the frontend lead format
 * This provides accumulated data from all 4 tables in the Kanban
 */
function transformJourneyToLead(journey: LeadJourney): Record<string, any> {
  return {
    id: journey.id,
    tenantId: journey.tenantId,
    name: journey.nome,
    phone: journey.telefone,
    telefone: journey.telefone,
    telefoneNormalizado: journey.telefoneNormalizado,
    nome: journey.nome,
    email: journey.email,
    cpf: journey.cpf,
    origem: journey.contact?.origem || 'supabase',
    pipelineStatus: journey.pipelineStatus,
    calculatedStage: journey.pipelineStatus,
    pipelineStageLabel: journey.pipelineStageLabel,
    formStatus: journey.form?.formStatus || 'not_sent',
    // FIX: Robust passed checking - consistent with leadJourneyAggregator
    qualificationStatus: (() => {
      const passedValue = journey.form?.passed;
      const isApproved = passedValue === true || passedValue === 'true' || 
                         passedValue === 'approved' || passedValue === 'aprovado' || passedValue === 1;
      const isRejected = passedValue === false || passedValue === 'false' || 
                         passedValue === 'rejected' || passedValue === 'reprovado' || passedValue === 0;
      return isApproved ? 'approved' : (isRejected ? 'rejected' : 'pending');
    })(),
    statusQualificacao: (() => {
      const passedValue = journey.form?.passed;
      const isApproved = passedValue === true || passedValue === 'true' || 
                         passedValue === 'approved' || passedValue === 'aprovado' || passedValue === 1;
      const isRejected = passedValue === false || passedValue === 'false' || 
                         passedValue === 'rejected' || passedValue === 'reprovado' || passedValue === 0;
      return isApproved ? 'aprovado' : (isRejected ? 'reprovado' : 'pendente');
    })(),
    pontuacao: journey.form?.totalScore || 0,
    formularioId: journey.form?.formId,
    submissionId: journey.form?.id,
    formularioConcluido: journey.form?.formStatus === 'completed',
    formularioConcluidoEm: journey.form?.formStatus === 'completed' ? journey.form?.updatedAt : null,
    formularioAberto: ['opened', 'started', 'completed'].includes(journey.form?.formStatus || ''),
    formularioAbertoEm: journey.form?.createdAt,
    // FIX: Check both aprovado and status fields for robust CPF status determination
    cpfStatus: (() => {
      if (!journey.cpfData) return undefined;
      const statusLower = (journey.cpfData.status || '').toLowerCase().trim();
      if (journey.cpfData.aprovado === true || statusLower === 'approved' || statusLower === 'aprovado') {
        return 'approved';
      }
      if (journey.cpfData.aprovado === false || statusLower === 'rejected' || statusLower === 'reprovado') {
        return 'rejected';
      }
      return undefined;
    })(),
    cpfCheckedAt: journey.cpfData?.dataConsulta,
    cpfRisco: journey.cpfData?.risco,
    cpfProcessos: journey.cpfData?.processos,
    reuniaoStatus: journey.meeting?.status,
    reuniaoData: journey.meeting?.data,
    reuniaoHora: journey.meeting?.hora,
    reuniaoLocal: journey.meeting?.local,
    reuniaoTipo: journey.meeting?.tipo,
    reuniaoTitulo: journey.meeting?.titulo, // Meeting title like "Reunião Online - Davi Emerick"
    reuniaoLink: journey.meeting?.link,
    consultorNome: journey.meeting?.consultorNome,
    consultorEmail: journey.meeting?.consultorEmail,
    resultadoReuniao: journey.meeting?.resultadoReuniao,
    motivoRecusa: journey.meeting?.motivoRecusa,
    meetingStatus: journey.meeting?.status === 'agendada' ? 'scheduled' :
                   journey.meeting?.status === 'realizada' ? 'completed' :
                   journey.meeting?.status === 'pendente' ? 'pending' : undefined,
    meetingScheduledAt: journey.meeting?.data,
    timeline: journey.timeline,
    contact: journey.contact,
    form: journey.form,
    cpfData: journey.cpfData ? {
      id: journey.cpfData.id,
      cpf: journey.cpfData.cpf,
      nome: journey.cpfData.nome,
      telefone: journey.cpfData.telefone,
      status: journey.cpfData.status,
      risco: journey.cpfData.risco,
      processos: journey.cpfData.processos,
      aprovado: journey.cpfData.aprovado,
      dataConsulta: journey.cpfData.dataConsulta,
      checkId: journey.cpfData.checkId,
      queryId: journey.cpfData.queryId,
      comoAutor: journey.cpfData.comoAutor,
      comoReu: journey.cpfData.comoReu,
    } : undefined,
    meeting: journey.meeting,
    hasContact: !!journey.contact,
    hasForm: !!journey.form,
    hasCpf: !!journey.cpfData,
    hasMeeting: !!journey.meeting,
    hasFormularioEnvio: !!journey.formularioEnvio,
    formularioEnvio: journey.formularioEnvio ? {
      id: journey.formularioEnvio.id,
      formId: journey.formularioEnvio.formId || (journey.formularioEnvio as any).form_id,
      telefone: journey.formularioEnvio.telefone,
      telefoneNormalizado: journey.formularioEnvio.telefoneNormalizado || (journey.formularioEnvio as any).telefone_normalizado,
      nome: journey.formularioEnvio.nome,
      formUrl: journey.formularioEnvio.formUrl || (journey.formularioEnvio as any).form_url,
      enviadoEm: journey.formularioEnvio.enviadoEm || (journey.formularioEnvio as any).enviado_em || journey.formularioEnvio.createdAt,
      status: journey.formularioEnvio.status,
      tentativas: journey.formularioEnvio.tentativas,
      ultimaTentativa: journey.formularioEnvio.ultimaTentativa || (journey.formularioEnvio as any).ultima_tentativa,
      createdAt: journey.formularioEnvio.createdAt || (journey.formularioEnvio as any).created_at,
    } : undefined,
    formularioEnviadoEm: journey.formularioEnvio?.enviadoEm || (journey.formularioEnvio as any)?.enviado_em || journey.formularioEnvio?.createdAt,
    formularioUrl: journey.formularioEnvio?.formUrl || (journey.formularioEnvio as any)?.form_url,
    createdAt: journey.createdAt,
    updatedAt: journey.updatedAt,
    // Dashboard fields from clientes_completos
    statusAtendimento: journey.statusAtendimento,
    setorAtual: journey.setorAtual,
    ativo: journey.ativo,
    tipoReuniaoAtual: journey.tipoReuniaoAtual,
    primeiroContato: journey.primeiroContato,
    ultimoContato: journey.ultimoContato,
    ultimaAtividade: journey.ultimaAtividade,
    totalRegistros: journey.totalRegistros,
    registrosDadosCliente: journey.registrosDadosCliente,
    totalMensagensChat: journey.totalMensagensChat,
    totalTranscricoes: journey.totalTranscricoes,
    fontesDados: journey.fontesDados,
    temDadosCliente: journey.temDadosCliente,
    temHistoricoChat: journey.temHistoricoChat,
    temTranscricoes: journey.temTranscricoes,
    mensagensCliente: journey.mensagensCliente,
    mensagensAgente: journey.mensagensAgente,
    primeiraMensagem: journey.primeiraMensagem,
    ultimaMensagem: journey.ultimaMensagem,
    ultimoResumoEstruturado: journey.ultimoResumoEstruturado,
    todas_mensagens_chat: journey.todasMensagensChat,
    // Chat history from n8n_chat_histories
    chatHistory: journey.chatHistory,
  };
}

/**
 * Fetch leads directly from Supabase with tenant isolation
 * Combines form_submissions AND dados_cliente tables
 * dados_cliente entries without form submissions are "contato-inicial"
 * @param tenantId - Required tenant ID for multi-tenant isolation
 */
async function fetchLeadsFromSupabase(tenantId: string): Promise<any[]> {
  try {
    // 🔐 SECURITY FIX: Validate tenantId to prevent data leakage - reject 'default-tenant'
    if (!tenantId || tenantId.trim() === '' || tenantId === 'default-tenant') {
      console.error('❌ [LeadsPipeline] tenantId inválido para buscar leads - "default-tenant" não é permitido');
      return [];
    }
    
    // 🔐 MULTI-TENANT STRICT: Use tenant-specific Supabase client (no fallbacks)
    const supabase = await getClientSupabaseClientStrict(tenantId);
    
    if (!supabase) {
      console.log(`ℹ️ [LeadsPipeline] Supabase não configurado para tenant ${tenantId} - retornando leads vazios`);
      return [];
    }
    
    console.log(`🔄 [LeadsPipeline] Buscando leads do Supabase para tenant: ${tenantId}`);
    
    const allLeads: any[] = [];
    const phonesSeen = new Set<string>();
    
    // 1. Fetch from form_submissions with tenant filtering
    let submissionsQuery = supabase
      .from('form_submissions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(500);
    
    // 🔐 SECURITY FIX: ALWAYS apply tenant filter - no bypass for 'default-tenant'
    submissionsQuery = submissionsQuery.eq('tenant_id', tenantId);
    
    const { data: submissions, error: submissionsError } = await submissionsQuery;
    
    if (submissionsError) {
      console.error('❌ [LeadsPipeline] Erro ao buscar form_submissions:', submissionsError);
    } else if (submissions && submissions.length > 0) {
      console.log(`✅ [LeadsPipeline] Encontradas ${submissions.length} submissions no Supabase (tenant: ${tenantId})`);
      for (const submission of submissions) {
        const lead = transformSubmissionToLead(submission);
        allLeads.push(lead);
        if (lead.telefoneNormalizado) {
          phonesSeen.add(lead.telefoneNormalizado);
        }
      }
    }
    
    // 2. Fetch from dados_cliente with tenant filtering
    let clientesQuery = supabase
      .from('dados_cliente')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    
    // 🔐 SECURITY FIX: ALWAYS apply tenant filter - no bypass for 'default-tenant'
    clientesQuery = clientesQuery.eq('tenant_id', tenantId);
    
    const { data: clientes, error: clientesError } = await clientesQuery;
    
    if (clientesError) {
      console.error('❌ [LeadsPipeline] Erro ao buscar dados_cliente:', clientesError);
    } else if (clientes && clientes.length > 0) {
      console.log(`✅ [LeadsPipeline] Encontrados ${clientes.length} clientes em dados_cliente (tenant: ${tenantId})`);
      
      for (const cliente of clientes) {
        // Use proper phone normalization for deduplication
        const telefoneNorm = cliente.telefone ? normalizePhone(cliente.telefone) : '';
        
        // Only add if we haven't seen this phone number from form_submissions
        if (!telefoneNorm || !phonesSeen.has(telefoneNorm)) {
          const lead = transformDadosClienteToLead(cliente);
          allLeads.push(lead);
          if (telefoneNorm) {
            phonesSeen.add(telefoneNorm);
          }
        }
      }
    }
    
    if (allLeads.length === 0) {
      console.log(`ℹ️ [LeadsPipeline] Nenhum lead encontrado no Supabase para tenant: ${tenantId}`);
      return [];
    }
    
    console.log(`✅ [LeadsPipeline] Total de ${allLeads.length} leads combinados do Supabase (tenant: ${tenantId})`);
    return allLeads;
    
  } catch (error) {
    console.error('❌ [LeadsPipeline] Erro ao buscar leads do Supabase:', error);
    return [];
  }
}

const UNIFIED_PIPELINE_QUERY = `
  SELECT 
    l.id,
    l.tenant_id,
    l.telefone,
    l.telefone_normalizado,
    l.nome,
    l.email,
    l.origem,
    l.whatsapp_id,
    l.whatsapp_instance,
    l.whatsapp_label_id,
    l.primeira_mensagem_em,
    l.ultima_mensagem_em,
    l.total_mensagens,
    l.formulario_url,
    l.formulario_enviado,
    l.formulario_enviado_em,
    l.formulario_aberto,
    l.formulario_aberto_em,
    l.formulario_visualizacoes,
    l.formulario_iniciado,
    l.formulario_iniciado_em,
    l.formulario_concluido,
    l.formulario_concluido_em,
    l.form_status,
    l.pontuacao,
    l.status_qualificacao,
    l.qualification_status,
    l.motivo_reprovacao,
    l.formulario_id,
    l.submission_id,
    l.cpf,
    l.cpf_normalizado,
    l.cpf_check_id,
    l.cpf_status,
    l.cpf_checked_at,
    l.meeting_id,
    l.meeting_status,
    l.meeting_scheduled_at,
    l.pipeline_status,
    l.ip_address,
    l.user_agent,
    l.tags,
    l.observacoes,
    l.created_at,
    l.updated_at,
    -- Meeting data from dados_cliente
    dc.reuniao_status,
    dc.reuniao_data,
    dc.reuniao_hora,
    dc.reuniao_local,
    dc.reuniao_tipo,
    dc.reuniao_link,
    dc.consultor_nome,
    dc.consultor_email,
    dc.resultado_reuniao,
    dc.motivo_recusa,
    -- Calculated stage based on lead status
    CASE
      WHEN dc.resultado_reuniao IS NOT NULL THEN 'consultor'
      WHEN dc.reuniao_status = 'realizada' OR l.meeting_status = 'completed' THEN 'reuniao-completo'
      WHEN dc.reuniao_status = 'agendada' OR l.meeting_status = 'scheduled' THEN 'reuniao-agendada'
      WHEN dc.reuniao_status = 'pendente' OR l.meeting_status = 'pending' THEN 'reuniao-pendente'
      WHEN l.cpf_status = 'rejected' THEN 'cpf-reprovado'
      WHEN l.cpf_status = 'approved' THEN 'cpf-aprovado'
      WHEN l.qualification_status = 'rejected' THEN 'formulario-reprovado'
      WHEN l.qualification_status = 'approved' THEN 'formulario-aprovado'
      WHEN l.formulario_concluido = true THEN 'formulario-completo'
      WHEN l.formulario_iniciado = true AND l.formulario_concluido = false THEN 'formulario-incompleto'
      WHEN l.formulario_aberto = true THEN 'formulario-aberto'
      WHEN l.formulario_enviado = true THEN 'formulario-enviado'
      ELSE 'contato-inicial'
    END as calculated_stage
  FROM leads l
  LEFT JOIN dados_cliente dc ON l.meeting_id = dc.id
`;

router.get('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Pagination parameters - default 50 leads per page to avoid proxy buffering
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 100); // Max 100 per page
    const stage = req.query.stage as string || null; // Optional filter by stage
    const forceRefresh = req.query.refresh === 'true';

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required'
      });
    }
    
    // Validate tenantId format to prevent SQL injection
    if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tenantId format'
      });
    }

    let allLeads: any[] = [];
    let source = 'supabase-aggregated';

    // Check cache first to avoid browser timeout (Replit proxy has ~5s timeout)
    const cacheState = getCachedLeads(tenantId);
    
    if (cacheState.data && !forceRefresh) {
      // Use cached data for immediate response
      allLeads = cacheState.data;
      source = cacheState.isStale ? 'cache-stale' : 'cache-fresh';
      console.log(`[LeadsPipeline] Using ${source} data (${allLeads.length} leads)`);
      
      // Trigger background refresh if stale
      if (cacheState.isStale && !cacheState.isPending) {
        refreshLeadsCacheBackground(tenantId);
      }
    } else if (cacheState.isPending) {
      // A refresh is already pending - wait for it with full timeout
      console.log('[LeadsPipeline] Waiting for pending refresh...');
      const completed = await waitForPendingRefresh(tenantId);
      
      if (completed) {
        const refreshedCache = getCachedLeads(tenantId);
        if (refreshedCache.data) {
          allLeads = refreshedCache.data;
          source = 'cache-fresh';
          console.log(`[LeadsPipeline] Using freshly cached data (${allLeads.length} leads)`);
        }
      }
      
      // If still no data after waiting, return 202 Accepted with retry-after header
      if (allLeads.length === 0) {
        console.log('[LeadsPipeline] Timeout waiting for data - returning 202 Accepted');
        res.setHeader('Retry-After', '2');
        return res.status(202).json({
          success: true,
          status: 'loading',
          message: 'Data is being prepared. Please retry in 2 seconds.',
          data: {
            stages: [...PIPELINE_STAGES],
            leads: [],
            counts: Object.fromEntries(PIPELINE_STAGES.map(s => [s, 0])),
            source: 'loading',
            pagination: { page: 1, pageSize, totalLeads: 0, totalPages: 0, hasMore: false, isLoading: true }
          }
        });
      }
    } else {
      // No cache - start refresh and wait for it
      console.log('[LeadsPipeline] No cache - starting data fetch...');
      
      // Start refresh promise
      const refreshPromise = (async () => {
        try {
          const journeys = await aggregateLeadJourneys(tenantId);
          const transformedLeads = journeys.map(journey => transformJourneyToLead(journey));
          leadsCache.set(tenantId, { data: transformedLeads, timestamp: Date.now(), tenantId });
          console.log(`[LeadsCache] Initial load: ${transformedLeads.length} leads cached`);
        } catch (error) {
          console.error('[LeadsCache] Initial load failed:', error);
        } finally {
          pendingRefreshes.delete(tenantId);
        }
      })();
      
      pendingRefreshes.set(tenantId, refreshPromise);
      
      // Wait for data with full timeout (4.5s to stay under Replit's 5s proxy limit)
      const completed = await waitForPendingRefresh(tenantId);
      
      if (completed) {
        const refreshedCache = getCachedLeads(tenantId);
        if (refreshedCache.data) {
          allLeads = refreshedCache.data;
          source = 'fresh';
          console.log(`[LeadsPipeline] Fresh data loaded (${allLeads.length} leads)`);
        }
      }
      
      // If still no data after waiting, return 202 Accepted
      if (allLeads.length === 0) {
        console.log('[LeadsPipeline] Returning 202 - data still loading');
        res.setHeader('Retry-After', '2');
        return res.status(202).json({
          success: true,
          status: 'loading',
          message: 'Data is being prepared. Please retry in 2 seconds.',
          data: {
            stages: [...PIPELINE_STAGES],
            leads: [],
            counts: Object.fromEntries(PIPELINE_STAGES.map(s => [s, 0])),
            source: 'loading',
            pagination: { page: 1, pageSize, totalLeads: 0, totalPages: 0, hasMore: false, isLoading: true }
          }
        });
      }
    }

    // Calculate counts BEFORE pagination (always include full counts)
    const counts: Record<string, number> = {};
    PIPELINE_STAGES.forEach(stg => {
      counts[stg] = 0;
    });

    allLeads.forEach(lead => {
      const leadStage = lead.calculatedStage || lead.pipelineStatus || 'contato-inicial';
      if (counts[leadStage] !== undefined) {
        counts[leadStage]++;
      }
    });

    // Filter by stage if specified
    let filteredLeads = allLeads;
    if (stage && PIPELINE_STAGES.includes(stage)) {
      filteredLeads = allLeads.filter(lead => {
        const leadStage = lead.calculatedStage || lead.pipelineStatus || 'contato-inicial';
        return leadStage === stage;
      });
    }

    // Apply pagination
    const totalLeads = filteredLeads.length;
    const totalPages = Math.ceil(totalLeads / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

    // Prepare response data with pagination metadata
    const responseData = {
      success: true,
      data: {
        stages: [...PIPELINE_STAGES],
        leads: paginatedLeads,
        counts,
        source: source,
        pagination: {
          page,
          pageSize,
          totalLeads,
          totalPages,
          hasMore: page < totalPages,
          stageFilter: stage
        }
      }
    };
    
    // Log before sending
    console.log(`[LeadsPipeline] Sending page ${page}/${totalPages} with ${paginatedLeads.length}/${totalLeads} leads...`);
    
    // Set headers to prevent proxy buffering and caching in Replit's environment
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    // Use res.json() - Express handles Content-Type and serialization
    res.json(responseData);
    
    console.log(`[LeadsPipeline] Response sent successfully`);
  } catch (error) {
    console.error('Error fetching leads pipeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leads pipeline',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/:tenantId/stage/:stage', async (req, res) => {
  try {
    const { tenantId, stage } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required'
      });
    }
    
    // Validate tenantId format to prevent SQL injection
    if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tenantId format'
      });
    }

    if (!PIPELINE_STAGES.includes(stage as PipelineStage)) {
      return res.status(400).json({
        success: false,
        error: `Invalid stage. Must be one of: ${PIPELINE_STAGES.join(', ')}`
      });
    }

    let stageLeads: any[] = [];

    // 🔐 MULTI-TENANT STRICT: Use aggregator ONLY - no fallbacks to local DB
    // This ensures tenant isolation: each tenant only sees their own Supabase data
    const journeys = await aggregateLeadJourneys(tenantId);
    
    // Filter by stage - if Supabase is empty, return empty array (no fallback)
    stageLeads = journeys
      .filter(journey => journey.pipelineStatus === stage)
      .map(journey => transformJourneyToLead(journey));
    
    console.log(`[LeadsPipeline] Stage ${stage}: ${stageLeads.length} leads for tenant ${tenantId}`);

    res.json({
      success: true,
      data: {
        stage,
        leads: stageLeads,
        count: stageLeads.length
      }
    });
  } catch (error) {
    console.error('Error fetching leads by stage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leads by stage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.patch('/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;

    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: 'leadId is required'
      });
    }

    const validation = updateLeadSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.issues
      });
    }

    // Try local database first
    let existingLeads: any[] = [];
    let useSupabaseOnly = false;
    
    if (db) {
      try {
        existingLeads = await db
          .select()
          .from(leads)
          .where(eq(leads.id, leadId))
          .limit(1);
      } catch (localError: any) {
        // Local table doesn't exist - use Supabase-only mode
        if (localError.message?.includes('does not exist') || localError.cause?.code === '42P01') {
          console.log('ℹ️ [LeadsPipeline] Tabela leads local não existe - atualizando direto no Supabase');
          useSupabaseOnly = true;
        } else {
          throw localError;
        }
      }
    } else {
      useSupabaseOnly = true;
    }

    // If in Supabase-only mode, update directly in Supabase
    if (useSupabaseOnly || existingLeads.length === 0) {
      const data = validation.data;
      
      // Require tenantId for multi-tenant isolation in Supabase-only mode
      const tenantId = req.body.tenantId || req.query.tenantId;
      if (!tenantId || typeof tenantId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'tenantId é obrigatório para atualizações em modo Supabase'
        });
      }
      
      // 🔐 SECURITY FIX: Reject invalid tenantId values
      if (tenantId === 'default-tenant' || tenantId.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'tenantId inválido - "default-tenant" não é permitido'
        });
      }
      
      // Validate tenantId format to prevent injection
      if (!/^[a-zA-Z0-9-_]+$/.test(tenantId)) {
        return res.status(400).json({
          success: false,
          error: 'Formato inválido de tenantId'
        });
      }
      
      // 🔐 MULTI-TENANT STRICT: Use tenant-specific Supabase client (no fallbacks)
      const supabase = await getClientSupabaseClientStrict(tenantId);
      
      if (!supabase) {
        return res.status(503).json({
          success: false,
          error: `Supabase não configurado para tenant ${tenantId}. Configure via /configuracoes`
        });
      }
      
      const supabaseUpdate: Record<string, any> = {
        updated_at: new Date().toISOString()
      };
      
      // Map all relevant fields to Supabase columns
      if (data.pipelineStatus !== undefined) supabaseUpdate.pipeline_status = data.pipelineStatus;
      if (data.meetingStatus !== undefined) supabaseUpdate.meeting_status = data.meetingStatus;
      if (data.cpfStatus !== undefined) supabaseUpdate.cpf_status = data.cpfStatus;
      if (data.qualificationStatus !== undefined) supabaseUpdate.qualification_status = data.qualificationStatus;
      if (data.observacoes !== undefined) supabaseUpdate.observacoes = data.observacoes;
      
      // Try form_submissions first with tenant isolation
      let { data: updated, error } = await supabase
        .from('form_submissions')
        .update(supabaseUpdate)
        .eq('id', leadId)
        .eq('tenant_id', tenantId) // Multi-tenant isolation
        .select()
        .single();
      
      // If not found in form_submissions, try dados_cliente with tenant isolation
      if (error || !updated) {
        const { data: clientUpdated, error: clientError } = await supabase
          .from('dados_cliente')
          .update({
            ...supabaseUpdate,
            reuniao_status: data.meetingStatus === 'scheduled' ? 'agendada' : 
                           data.meetingStatus === 'completed' ? 'realizada' : 
                           data.meetingStatus === 'cancelled' ? 'cancelada' : 
                           data.meetingStatus === 'pending' ? 'pendente' : undefined
          })
          .eq('id', leadId)
          .eq('tenant_id', tenantId) // Multi-tenant isolation
          .select()
          .single();
        
        if (clientError) {
          console.error('❌ [LeadsPipeline] Erro ao atualizar no Supabase:', clientError);
          return res.status(404).json({
            success: false,
            error: 'Lead não encontrado no Supabase para este tenant'
          });
        }
        
        updated = clientUpdated;
      }
      
      console.log(`✅ [LeadsPipeline] Lead ${leadId} atualizado no Supabase (tenant: ${tenantId}) com sucesso`);
      
      // Invalidate cache after mutation
      invalidateLeadsCache(tenantId);
      
      return res.json({
        success: true,
        data: updated,
        source: 'supabase'
      });
    }

    if (existingLeads.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    const existingLead = existingLeads[0];
    const data = validation.data;

    const updateLeadData: Record<string, any> = {
      updatedAt: new Date()
    };

    if (data.pipelineStatus !== undefined) {
      updateLeadData.pipelineStatus = data.pipelineStatus;
    }
    if (data.meetingStatus !== undefined) {
      updateLeadData.meetingStatus = data.meetingStatus;
    }
    if (data.cpfStatus !== undefined) {
      updateLeadData.cpfStatus = data.cpfStatus;
    }
    if (data.qualificationStatus !== undefined) {
      updateLeadData.qualificationStatus = data.qualificationStatus;
    }
    if (data.observacoes !== undefined) {
      updateLeadData.observacoes = data.observacoes;
    }

    const hasMeetingData = data.meetingStatus !== undefined || 
                          data.consultorNome !== undefined ||
                          data.reuniaoData !== undefined ||
                          data.reuniaoHora !== undefined ||
                          data.reuniaoLocal !== undefined ||
                          data.reuniaoTipo !== undefined ||
                          data.resultadoReuniao !== undefined;

    let meetingRecord = null;

    if (hasMeetingData) {
      const meetingData: Record<string, any> = {
        tenantId: existingLead.tenantId,
        leadId: leadId,
        nome: existingLead.nome || 'Lead',
        telefone: existingLead.telefone,
        telefoneNormalizado: existingLead.telefoneNormalizado,
        email: existingLead.email,
        cpf: existingLead.cpf,
        updatedAt: new Date()
      };

      if (data.consultorNome !== undefined) {
        meetingData.consultorNome = data.consultorNome;
      }
      if (data.consultorEmail !== undefined) {
        meetingData.consultorEmail = data.consultorEmail;
      }
      if (data.reuniaoData !== undefined) {
        meetingData.reuniaoData = new Date(data.reuniaoData);
      }
      if (data.reuniaoHora !== undefined) {
        meetingData.reuniaoHora = data.reuniaoHora;
      }
      if (data.reuniaoLocal !== undefined) {
        meetingData.reuniaoLocal = data.reuniaoLocal;
      }
      if (data.reuniaoTipo !== undefined) {
        meetingData.reuniaoTipo = data.reuniaoTipo;
      }
      if (data.reuniaoLink !== undefined) {
        meetingData.reuniaoLink = data.reuniaoLink;
      }
      if (data.resultadoReuniao !== undefined) {
        meetingData.resultadoReuniao = data.resultadoReuniao;
      }
      if (data.motivoRecusa !== undefined) {
        meetingData.motivoRecusa = data.motivoRecusa;
      }

      if (data.meetingStatus === 'scheduled') {
        meetingData.reuniaoStatus = 'agendada';
      } else if (data.meetingStatus === 'completed') {
        meetingData.reuniaoStatus = 'realizada';
      } else if (data.meetingStatus === 'cancelled') {
        meetingData.reuniaoStatus = 'cancelada';
      } else if (data.meetingStatus === 'pending') {
        meetingData.reuniaoStatus = 'pendente';
      }

      if (existingLead.meetingId) {
        const [updated] = await db
          .update(dadosCliente)
          .set(meetingData)
          .where(eq(dadosCliente.id, existingLead.meetingId))
          .returning();
        
        meetingRecord = updated;
      } else {
        const [created] = await db
          .insert(dadosCliente)
          .values(meetingData)
          .returning();
        
        meetingRecord = created;
        updateLeadData.meetingId = created.id;
      }

      if (data.meetingStatus === 'scheduled' && !updateLeadData.meetingScheduledAt) {
        updateLeadData.meetingScheduledAt = new Date();
      }
    }

    const [updatedLead] = await db
      .update(leads)
      .set(updateLeadData)
      .where(eq(leads.id, leadId))
      .returning();

    const responseData = transformRowToCamelCase({
      ...updatedLead,
      reuniao_status: meetingRecord?.reuniaoStatus,
      reuniao_data: meetingRecord?.reuniaoData,
      reuniao_hora: meetingRecord?.reuniaoHora,
      reuniao_local: meetingRecord?.reuniaoLocal,
      reuniao_tipo: meetingRecord?.reuniaoTipo,
      reuniao_link: meetingRecord?.reuniaoLink,
      consultor_nome: meetingRecord?.consultorNome,
      consultor_email: meetingRecord?.consultorEmail,
      resultado_reuniao: meetingRecord?.resultadoReuniao,
      motivo_recusa: meetingRecord?.motivoRecusa,
    });

    // Invalidate cache after local DB mutation
    if (existingLead?.tenantId) {
      invalidateLeadsCache(existingLead.tenantId);
    }
    
    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lead',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update lead data in Supabase (for Supabase-only mode)
 * This endpoint persists accumulated data when leads move through pipeline stages
 */
router.patch('/supabase/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { tenantId, pipelineStatus, origem, ...updateData } = req.body;

    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: 'leadId is required'
      });
    }
    
    // Validate leadId format (UUID)
    if (!/^[a-f0-9-]{36}$/i.test(leadId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid leadId format'
      });
    }
    
    // SECURITY: Require tenantId for multi-tenant isolation
    if (!tenantId || typeof tenantId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'tenantId é obrigatório para atualizações no Supabase'
      });
    }
    
    // Validate tenantId format to prevent injection
    if (!/^[a-zA-Z0-9-_]+$/.test(tenantId)) {
      return res.status(400).json({
        success: false,
        error: 'Formato inválido de tenantId'
      });
    }
    
    // 🔐 SECURITY FIX: Reject invalid tenantId values
    if (tenantId === 'default-tenant' || tenantId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'tenantId inválido - "default-tenant" não é permitido'
      });
    }

    // 🔐 MULTI-TENANT STRICT: Use tenant-specific Supabase client (no fallbacks)
    const supabase = await getClientSupabaseClientStrict(tenantId);
    
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: `Supabase não configurado para tenant ${tenantId}. Configure em /configuracoes`
      });
    }
    
    console.log(`🔄 [LeadsPipeline] Atualizando lead ${leadId} no Supabase (tenant: ${tenantId})...`);
    
    // Determine which table to update based on origem
    const targetTable = origem === 'dados_cliente' ? 'dados_cliente' : 'form_submissions';
    
    // Build update object with only defined values
    const supabaseUpdate: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    
    // Map frontend camelCase to Supabase snake_case
    if (updateData.nome !== undefined) supabaseUpdate.nome = updateData.nome;
    if (updateData.email !== undefined) supabaseUpdate.email = updateData.email;
    if (updateData.telefone !== undefined) supabaseUpdate.telefone = updateData.telefone;
    if (updateData.cpf !== undefined) supabaseUpdate.cpf = updateData.cpf;
    if (updateData.observacoes !== undefined) supabaseUpdate.observacoes = updateData.observacoes;
    
    // Additional status fields for data accumulation
    if (updateData.cpfStatus !== undefined) supabaseUpdate.cpf_status = updateData.cpfStatus;
    if (updateData.qualificationStatus !== undefined) supabaseUpdate.qualification_status = updateData.qualificationStatus;
    
    // Meeting/reunion fields (for dados_cliente)
    if (updateData.reuniaoStatus !== undefined) supabaseUpdate.reuniao_status = updateData.reuniaoStatus;
    if (updateData.reuniaoData !== undefined) supabaseUpdate.reuniao_data = updateData.reuniaoData;
    if (updateData.reuniaoHora !== undefined) supabaseUpdate.reuniao_hora = updateData.reuniaoHora;
    if (updateData.reuniaoLocal !== undefined) supabaseUpdate.reuniao_local = updateData.reuniaoLocal;
    if (updateData.reuniaoTipo !== undefined) supabaseUpdate.reuniao_tipo = updateData.reuniaoTipo;
    if (updateData.reuniaoLink !== undefined) supabaseUpdate.reuniao_link = updateData.reuniaoLink;
    if (updateData.consultorNome !== undefined) supabaseUpdate.consultor_nome = updateData.consultorNome;
    if (updateData.consultorEmail !== undefined) supabaseUpdate.consultor_email = updateData.consultorEmail;
    if (updateData.resultadoReuniao !== undefined) supabaseUpdate.resultado_reuniao = updateData.resultadoReuniao;
    if (updateData.motivoRecusa !== undefined) supabaseUpdate.motivo_recusa = updateData.motivoRecusa;
    
    // Form-related fields (for form_submissions)
    if (updateData.formStatus !== undefined) supabaseUpdate.form_status = updateData.formStatus;
    if (updateData.totalScore !== undefined) supabaseUpdate.total_score = updateData.totalScore;
    if (updateData.passed !== undefined) supabaseUpdate.passed = updateData.passed;
    
    // Pipeline status - store in both tables if applicable
    if (pipelineStatus !== undefined) {
      supabaseUpdate.pipeline_status = pipelineStatus;
    }
    
    // SECURITY: Apply tenant isolation on all Supabase updates
    const { data: updatedRecord, error: updateError } = await supabase
      .from(targetTable)
      .update(supabaseUpdate)
      .eq('id', leadId)
      .eq('tenant_id', tenantId) // Multi-tenant isolation
      .select()
      .single();
    
    if (updateError) {
      console.error(`❌ [LeadsPipeline] Erro ao atualizar ${targetTable}:`, updateError);
      
      // If update failed on one table, try the other with tenant isolation
      const alternativeTable = targetTable === 'dados_cliente' ? 'form_submissions' : 'dados_cliente';
      
      const { data: altRecord, error: altError } = await supabase
        .from(alternativeTable)
        .update(supabaseUpdate)
        .eq('id', leadId)
        .eq('tenant_id', tenantId) // Multi-tenant isolation
        .select()
        .single();
      
      if (altError) {
        return res.status(500).json({
          success: false,
          error: 'Falha ao atualizar lead no Supabase para este tenant',
          details: updateError.message
        });
      }
      
      console.log(`✅ [LeadsPipeline] Lead atualizado em ${alternativeTable} (tenant: ${tenantId}) com sucesso`);
      
      // Invalidate cache after Supabase mutation
      invalidateLeadsCache(tenantId);
      
      return res.json({
        success: true,
        data: altRecord,
        table: alternativeTable
      });
    }
    
    console.log(`✅ [LeadsPipeline] Lead ${leadId} atualizado em ${targetTable} (tenant: ${tenantId}) com sucesso`);
    
    // Invalidate cache after Supabase mutation
    invalidateLeadsCache(tenantId);
    
    res.json({
      success: true,
      data: updatedRecord,
      table: targetTable
    });
    
  } catch (error) {
    console.error('Error updating lead in Supabase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lead in Supabase',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create a new client in dados_cliente with "contato-inicial" status
 * This persists the label instead of just displaying it
 */
router.post('/supabase/dados-cliente', async (req, res) => {
  try {
    const { tenantId, nome, telefone, email, cpf, origem } = req.body;
    
    if (!tenantId || !nome) {
      return res.status(400).json({
        success: false,
        error: 'tenantId e nome são obrigatórios'
      });
    }
    
    // SECURITY: Validate tenantId format to prevent injection
    if (typeof tenantId !== 'string' || !/^[a-zA-Z0-9-_]+$/.test(tenantId)) {
      return res.status(400).json({
        success: false,
        error: 'Formato inválido de tenantId'
      });
    }
    
    // 🔐 SECURITY FIX: Reject invalid tenantId values
    if (tenantId === 'default-tenant' || tenantId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'tenantId inválido - "default-tenant" não é permitido'
      });
    }
    
    // 🔐 MULTI-TENANT STRICT: Use tenant-specific Supabase client (no fallbacks)
    const supabase = await getClientSupabaseClientStrict(tenantId);
    
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: `Supabase não configurado para tenant ${tenantId}. Configure em /configuracoes`
      });
    }
    
    console.log(`🔄 [LeadsPipeline] Criando novo cliente em dados_cliente...`);
    
    const telefoneNormalizado = telefone?.replace(/\D/g, '') || null;
    
    const { data: newClient, error: insertError } = await supabase
      .from('dados_cliente')
      .insert({
        tenant_id: tenantId,
        nome,
        telefone,
        telefone_normalizado: telefoneNormalizado,
        email,
        cpf,
        reuniao_status: 'pendente',
        pipeline_status: 'contato-inicial',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ [LeadsPipeline] Erro ao criar cliente:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Falha ao criar cliente',
        details: insertError.message
      });
    }
    
    console.log(`✅ [LeadsPipeline] Cliente criado com ID: ${newClient.id}`);
    
    // Invalidate cache after creating new client
    invalidateLeadsCache(tenantId);
    
    res.json({
      success: true,
      data: transformDadosClienteToLead(newClient)
    });
    
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create client',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 🔧 DEBUG: Endpoint to manually clear leads cache for a tenant
// Used when Supabase credentials change and cache needs to be refreshed
router.delete('/:tenantId/cache', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required'
      });
    }
    
    // Validate tenantId format
    if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tenantId format'
      });
    }
    
    // Get cache status before invalidation
    const cacheState = getCachedLeads(tenantId);
    const hadCache = !!cacheState.data;
    const cacheSize = cacheState.data?.length || 0;
    
    // Invalidate the cache
    invalidateLeadsCache(tenantId);
    
    console.log(`🗑️ [LeadsPipeline] Cache cleared for tenant: ${tenantId} (had ${cacheSize} leads)`);
    
    res.json({
      success: true,
      message: `Cache cleared for tenant ${tenantId}`,
      hadCache,
      previousCacheSize: cacheSize
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 🔧 DEBUG: Endpoint to clear all leads cache (admin only)
router.delete('/cache/all', async (req, res) => {
  try {
    const cacheSize = leadsCache.size;
    
    // Clear all cache
    invalidateLeadsCache();
    
    console.log(`🗑️ [LeadsPipeline] All cache cleared (${cacheSize} tenants)`);
    
    res.json({
      success: true,
      message: 'All cache cleared',
      previousCacheSize: cacheSize
    });
  } catch (error) {
    console.error('Error clearing all cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear all cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export const leadsPipelineRoutes = router;
