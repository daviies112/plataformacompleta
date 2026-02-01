/**
 * Lead Journey Aggregator
 * 
 * Combines data from 4 Supabase tables into a unified lead journey:
 * 1. dados_cliente - Initial contact data (contato inicial)
 * 2. form_submissions - Form data (formulário aprovado/reprovado)
 * 3. cpf_compliance_resultados - CPF check results (CPF aprovado/reprovado)
 * 4. reunioes - Meeting data (reuniões)
 * 
 * The journey shows accumulated progression through the pipeline stages.
 */

import { getClientSupabaseClientStrict } from './multiTenantSupabase';
import { getClienteSupabase, isClienteSupabaseConfigured } from './clienteSupabase';
import { normalizePhone } from '../formularios/utils/phoneNormalizer.js';
import { isSupabaseMasterConfigured, getSupabaseMasterForTenant, type DatacorpCheck } from './supabaseMaster';
import { decryptCPF } from './crypto';

export interface ContactData {
  id: string;
  nome: string;
  email?: string;
  telefone: string;
  telefoneNormalizado?: string;
  cpf?: string;
  origem?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FormData {
  id: string;
  formId?: string;
  formStatus: string;
  passed?: boolean;
  totalScore?: number;
  answers?: Record<string, any>;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactCpf?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CpfData {
  id: number | string;
  cpf: string;
  nome?: string;
  telefone?: string;
  status: string;
  dados?: boolean;
  risco?: number;
  processos?: number;
  aprovado: boolean;
  dataConsulta: string;
  checkId?: string;
  // Full BigDataCorp API response data
  queryId?: string;
  tempoResposta?: number;
  matchKeys?: string;
  statusCode?: number;
  statusMessage?: string;
  comoAutor?: number;
  comoReu?: number;
  primeiroProcesso?: string;
  ultimoProcesso?: string;
  ultimos30Dias?: number;
  ultimos90Dias?: number;
  ultimos180Dias?: number;
  ultimos365Dias?: number;
  payload?: any;
}

export interface MeetingData {
  id?: string | number;
  idReuniao?: string; // String ID like "reuniao-davi-2025-12-16-11h"
  titulo?: string; // Meeting title
  status?: string;
  data?: string;
  hora?: string;
  local?: string;
  tipo?: 'presencial' | 'online' | string;
  link?: string;
  consultorNome?: string;
  consultorEmail?: string;
  resultadoReuniao?: 'aprovado' | 'em_analise' | 'recusado' | string;
  motivoRecusa?: string;
  compareceu?: boolean; // Whether client attended the meeting (from reunioes table)
  dataInicio?: string; // Meeting start date/time for attendance check
}

export interface TimelineEvent {
  id: string;
  type: 'contact' | 'form' | 'cpf' | 'meeting';
  stage: string;
  title: string;
  description?: string;
  status?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface DashboardData {
  totalMensagensChat?: number;
  mensagensCliente?: string;
  mensagensAgente?: string;
  totalTranscricoes?: number;
  primeiroContato?: string;
  ultimoContato?: string;
  primeiraMensagem?: string;
  ultimaMensagem?: string;
  temDadosCliente?: boolean;
  temHistoricoChat?: boolean;
  temTranscricoes?: boolean;
  statusAtendimento?: string;
  setorAtual?: string;
  ativo?: boolean;
  tipoReuniaoAtual?: string;
  ultimaAtividade?: string;
  totalRegistros?: number;
  registrosDadosCliente?: number;
  fontesDados?: string;
  ultimoResumoEstruturado?: string;
  todasMensagensChat?: string;
}

export interface FormularioEnvioData {
  id: string;
  formId?: string;
  telefone?: string;
  telefoneNormalizado?: string;
  nome?: string;
  formUrl?: string;
  enviadoEm?: string;
  status?: string;
  tentativas?: number;
  ultimaTentativa?: string;
  createdAt?: string;
}

export interface AssinaturaData {
  id: string;
  clientName: string;
  clientCpf?: string;
  clientEmail?: string;
  clientPhone?: string;
  status: 'pending' | 'signed' | 'completed' | string;
  accessToken?: string;
  protocolNumber?: string;
  createdAt?: string;
  signedAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: number;
  type: 'human' | 'ai';
  content: string;
  timestamp?: string;
}

export interface ChatHistoryData {
  sessionId: string;
  telefone: string;
  telefoneNormalizado: string;
  messages: ChatMessage[];
  totalMessages: number;
  extractedName?: string;
  firstMessageAt?: string;
  lastMessageAt?: string;
}

export interface LeadJourney {
  id: string;
  tenantId: string;
  telefone: string;
  telefoneNormalizado: string;
  nome: string;
  email?: string;
  cpf?: string;
  pipelineStatus: string;
  pipelineStageLabel: string;
  contact?: ContactData;
  form?: FormData;
  cpfData?: CpfData;
  meeting?: MeetingData;
  dashboard?: DashboardData;
  formularioEnvio?: FormularioEnvioData;
  assinatura?: AssinaturaData;
  chatHistory?: ChatHistoryData;
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
  // Dashboard fields exposed at top level for easier frontend access
  totalMensagensChat?: number;
  mensagensCliente?: string;
  mensagensAgente?: string;
  totalTranscricoes?: number;
  primeiroContato?: string;
  ultimoContato?: string;
  primeiraMensagem?: string;
  ultimaMensagem?: string;
  temDadosCliente?: boolean;
  temHistoricoChat?: boolean;
  temTranscricoes?: boolean;
  statusAtendimento?: string;
  setorAtual?: string;
  ativo?: boolean;
  tipoReuniaoAtual?: string;
  ultimaAtividade?: string;
  totalRegistros?: number;
  registrosDadosCliente?: number;
  fontesDados?: string;
  ultimoResumoEstruturado?: string;
  todasMensagensChat?: string;
}

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

const STAGE_LABELS: Record<string, string> = {
  'contato-inicial': 'Contato Inicial',
  'formulario-nao-preenchido': 'Formulário Não Preenchido',
  'formulario-aprovado': 'Formulário Aprovado',
  'formulario-reprovado': 'Formulário Reprovado',
  'cpf-aprovado': 'CPF Aprovado',
  'cpf-reprovado': 'CPF Reprovado',
  'reuniao-pendente': 'Reunião Pendente',
  'reuniao-agendada': 'Reunião Agendada',
  'reuniao-nao-compareceu': 'Reunião Não Compareceu',
  'reuniao-completo': 'Reunião Completa',
  'assinatura-pendente': 'Assinatura Pendente',
  'revendedora': 'Revendedora',
  'consultor': 'Consultor'
};

function normalizeTelefone(telefone: string | null | undefined): string {
  if (!telefone) return '';
  // Use the proper phone normalizer that adds country code and 9th digit
  // This ensures 553192267220 and 31992267220 both normalize to +5531992267220
  return normalizePhone(telefone);
}

function normalizeCPF(cpf: string | null | undefined): string {
  if (!cpf) return '';
  return cpf.replace(/\D/g, '');
}

function determinePipelineStatus(journey: Partial<LeadJourney> & { formularioEnvio?: any; assinatura?: AssinaturaData }): string {
  const { meeting, cpfData, form, formularioEnvio, assinatura } = journey;
  
  if (meeting?.resultadoReuniao) {
    return 'consultor';
  }
  
  if (assinatura) {
    const statusLower = (assinatura.status || '').toLowerCase().trim();
    if (statusLower === 'completed' || statusLower === 'signed') {
      return 'revendedora';
    }
    if (statusLower === 'pending') {
      return 'assinatura-pendente';
    }
  }
  
  if (meeting?.status === 'realizada') {
    return 'reuniao-completo';
  }
  
  if (meeting?.status === 'nao_compareceu' || meeting?.status === 'naocompareceu') {
    return 'reuniao-nao-compareceu';
  }
  
  // FIX: Check compareceu boolean field for meetings with status 'agendada'
  // If compareceu === false AND the meeting date has passed, it's "não compareceu"
  if (meeting?.compareceu === false) {
    // Check if meeting date has passed (if available)
    const meetingDate = meeting.dataInicio || meeting.data;
    if (meetingDate) {
      const meetingDateTime = new Date(meetingDate);
      const now = new Date();
      if (meetingDateTime < now) {
        console.log(`📋 [determinePipelineStatus] Meeting compareceu=false and date ${meetingDate} has passed → reuniao-nao-compareceu`);
        return 'reuniao-nao-compareceu';
      }
    } else {
      // No date to check, but compareceu is explicitly false
      console.log(`📋 [determinePipelineStatus] Meeting compareceu=false (no date to verify) → reuniao-nao-compareceu`);
      return 'reuniao-nao-compareceu';
    }
  }
  
  if (meeting?.status === 'agendada' || meeting?.status === 'agendado') {
    return 'reuniao-agendada';
  }
  
  if (meeting?.status === 'pendente' && meeting?.data) {
    return 'reuniao-pendente';
  }
  
  // === FIX: Check form rejection FIRST before CPF ===
  // This ensures leads with rejected forms (passed=false) appear in REPROVADO column
  // regardless of their CPF check status
  if (form) {
    const passedValue = form.passed;
    
    // Check for rejection first
    const isFormRejected = passedValue === false || 
                           passedValue === 'false' ||
                           passedValue === 'rejected' ||
                           passedValue === 'reprovado' ||
                           passedValue === 0;
    
    if (isFormRejected) {
      console.log(`📋 [determinePipelineStatus] Form REJECTED - passed=${JSON.stringify(passedValue)} (type: ${typeof passedValue}) → formulario-reprovado`);
      return 'formulario-reprovado';
    }
  }
  
  if (cpfData) {
    // FIX: More robust status checking with case-insensitive matching and Portuguese status values
    const statusLower = (cpfData.status || '').toLowerCase().trim();
    const isRejected = statusLower === 'rejected' || 
                       statusLower === 'reprovado' || 
                       cpfData.aprovado === false;
    const isApproved = statusLower === 'approved' || 
                       statusLower === 'aprovado' || 
                       cpfData.aprovado === true;
    
    if (isRejected) {
      return 'cpf-reprovado';
    }
    if (isApproved) {
      return 'cpf-aprovado';
    }
    // Log when cpfData exists but status is unclear (helps debugging)
    console.log(`⚠️ [determinePipelineStatus] CPF data exists but status unclear: status="${cpfData.status}", aprovado=${cpfData.aprovado}`);
  }
  
  // Check for form approval (after CPF checks, since rejection was already handled above)
  if (form) {
    // FIX: Robust passed field checking - handle boolean, string, and edge cases
    const passedValue = form.passed;
    
    // Log the actual value for debugging
    if (passedValue !== undefined && passedValue !== null) {
      console.log(`📋 [determinePipelineStatus] Form passed value: ${JSON.stringify(passedValue)} (type: ${typeof passedValue})`);
    }
    
    // Check for rejection: boolean false, string "false", "rejected", "reprovado", or 0
    const isFormRejected = passedValue === false || 
                           passedValue === 'false' ||
                           passedValue === 'rejected' ||
                           passedValue === 'reprovado' ||
                           passedValue === 0;
    
    // Check for approval: boolean true, string "true", "approved", "aprovado", or 1
    const isFormApproved = passedValue === true || 
                           passedValue === 'true' ||
                           passedValue === 'approved' ||
                           passedValue === 'aprovado' ||
                           passedValue === 1;
    
    if (isFormRejected) {
      return 'formulario-reprovado';
    }
    if (isFormApproved) {
      return 'formulario-aprovado';
    }
    
    // If form exists but passed is undefined/null, log for debugging
    if (passedValue === undefined || passedValue === null) {
      console.log(`⚠️ [determinePipelineStatus] Form exists but passed is ${passedValue} - treating as pending/contato-inicial`);
    }
  }
  
  if (formularioEnvio && !form) {
    return 'formulario-nao-preenchido';
  }
  
  return 'contato-inicial';
}

function createTimeline(journey: Partial<LeadJourney> & { formularioEnvio?: any }): TimelineEvent[] {
  const timeline: TimelineEvent[] = [];
  
  if (journey.contact) {
    timeline.push({
      id: `contact-${journey.contact.id}`,
      type: 'contact',
      stage: 'contato-inicial',
      title: 'Contato Inicial',
      description: `${journey.contact.nome} adicionado como contato`,
      timestamp: journey.contact.createdAt,
      metadata: {
        origem: journey.contact.origem,
        telefone: journey.contact.telefone
      }
    });
  }
  
  if (journey.formularioEnvio && !journey.form) {
    const envioTimestamp = journey.formularioEnvio.enviado_em || 
                           journey.formularioEnvio.enviadoEm || 
                           journey.formularioEnvio.created_at || 
                           journey.formularioEnvio.createdAt ||
                           new Date().toISOString();
    timeline.push({
      id: `form-envio-${journey.formularioEnvio.id}`,
      type: 'form',
      stage: 'formulario-nao-preenchido',
      title: 'Formulário Não Preenchido',
      description: 'Formulário enviado, aguardando preenchimento',
      status: 'enviado',
      timestamp: envioTimestamp,
      metadata: {
        formId: journey.formularioEnvio.form_id || journey.formularioEnvio.formId,
        enviado: true
      }
    });
  }
  
  if (journey.form) {
    let formTitle = 'Formulário';
    let formDescription = 'Formulário processado';
    let formStage = 'contato-inicial';
    
    // FIX: Robust passed checking - consistent with determinePipelineStatus
    const passedValue = journey.form.passed;
    const isFormRejected = passedValue === false || 
                           passedValue === 'false' ||
                           passedValue === 'rejected' ||
                           passedValue === 'reprovado' ||
                           passedValue === 0;
    const isFormApproved = passedValue === true || 
                           passedValue === 'true' ||
                           passedValue === 'approved' ||
                           passedValue === 'aprovado' ||
                           passedValue === 1;
    
    if (isFormApproved) {
      formTitle = 'Formulário Aprovado';
      formDescription = `Score: ${journey.form.totalScore || 'N/A'}`;
      formStage = 'formulario-aprovado';
    } else if (isFormRejected) {
      formTitle = 'Formulário Reprovado';
      formDescription = `Score: ${journey.form.totalScore || 'N/A'}`;
      formStage = 'formulario-reprovado';
    } else {
      formTitle = 'Formulário Preenchido';
      formDescription = 'Aguardando avaliação';
    }
    
    timeline.push({
      id: `form-${journey.form.id}`,
      type: 'form',
      stage: formStage,
      title: formTitle,
      description: formDescription,
      status: journey.form.formStatus,
      timestamp: journey.form.updatedAt || journey.form.createdAt,
      metadata: {
        formId: journey.form.formId,
        passed: journey.form.passed,
        totalScore: journey.form.totalScore
      }
    });
  }
  
  if (journey.cpfData) {
    const cpfAprovado = journey.cpfData.aprovado || journey.cpfData.status === 'approved';
    
    timeline.push({
      id: `cpf-${journey.cpfData.id}`,
      type: 'cpf',
      stage: cpfAprovado ? 'cpf-aprovado' : 'cpf-reprovado',
      title: cpfAprovado ? 'CPF Aprovado' : 'CPF Reprovado',
      description: `Risco: ${journey.cpfData.risco || 0}% | Processos: ${journey.cpfData.processos || 0}`,
      status: journey.cpfData.status,
      timestamp: journey.cpfData.dataConsulta,
      metadata: {
        risco: journey.cpfData.risco,
        processos: journey.cpfData.processos,
        dados: journey.cpfData.dados
      }
    });
  }
  
  if (journey.meeting) {
    let meetingTitle = 'Reunião';
    let meetingStage = 'reuniao-pendente';
    let meetingDescription = '';
    
    if (journey.meeting.resultadoReuniao) {
      meetingTitle = 'Consultor Atribuído';
      meetingStage = 'consultor';
      meetingDescription = `Resultado: ${journey.meeting.resultadoReuniao}`;
      if (journey.meeting.consultorNome) {
        meetingDescription += ` | Consultor: ${journey.meeting.consultorNome}`;
      }
    } else if (journey.meeting.status === 'realizada') {
      meetingTitle = 'Reunião Realizada';
      meetingStage = 'reuniao-completo';
    } else if (journey.meeting.status === 'nao_compareceu' || journey.meeting.status === 'naocompareceu') {
      meetingTitle = 'Reunião Não Compareceu';
      meetingStage = 'reuniao-nao-compareceu';
      meetingDescription = 'Cliente não compareceu à reunião';
    } else if (journey.meeting.compareceu === false) {
      // FIX: Check compareceu boolean field - if false, client didn't attend
      meetingTitle = 'Reunião Não Compareceu';
      meetingStage = 'reuniao-nao-compareceu';
      meetingDescription = 'Cliente não compareceu à reunião';
      if (journey.meeting.data) {
        meetingDescription += ` (${journey.meeting.data})`;
      }
    } else if (journey.meeting.status === 'agendada' || journey.meeting.status === 'agendado') {
      meetingTitle = 'Reunião Agendada';
      meetingStage = 'reuniao-agendada';
      if (journey.meeting.data) {
        meetingDescription = `Data: ${journey.meeting.data}`;
        if (journey.meeting.hora) {
          meetingDescription += ` às ${journey.meeting.hora}`;
        }
      }
    } else if (journey.meeting.status === 'pendente') {
      meetingTitle = 'Reunião Pendente';
      meetingDescription = 'Aguardando agendamento';
    }
    
    const meetingTimestamp = journey.meeting.data 
      ? new Date(journey.meeting.data).toISOString() 
      : new Date().toISOString();
    
    timeline.push({
      id: `meeting-${journey.meeting.id || 'pending'}`,
      type: 'meeting',
      stage: meetingStage,
      title: meetingTitle,
      description: meetingDescription,
      status: journey.meeting.status,
      timestamp: meetingTimestamp,
      metadata: {
        tipo: journey.meeting.tipo,
        local: journey.meeting.local,
        link: journey.meeting.link,
        consultorNome: journey.meeting.consultorNome
      }
    });
  }
  
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  return timeline;
}

/**
 * Fetches data from dados_cliente table
 */
async function fetchDadosCliente(tenantId: string): Promise<Map<string, any>> {
  // 🔐 SECURITY FIX: Require valid tenantId - no 'default-tenant' bypass
  if (!tenantId || tenantId === 'default-tenant') {
    console.log('⚠️ [LeadJourneyAggregator] tenantId inválido para fetchDadosCliente - retornando vazio');
    return new Map();
  }
  
  let supabase = await getClientSupabaseClientStrict(tenantId);
  
  // 🔐 SECURITY FIX: Removed fallback to getClienteSupabase
  // Each tenant MUST have their own Supabase credentials configured.
  // Fallbacks could expose data from another tenant.
  
  if (!supabase) {
    console.log(`ℹ️ [LeadJourneyAggregator] Supabase não configurado para tenant ${tenantId} - retornando dados vazios`);
    return new Map();
  }
  
  try {
    let query = supabase
      .from('dados_cliente')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    
    // 🔐 SECURITY FIX: ALWAYS filter by tenant_id - no bypass
    query = query.eq('tenant_id', tenantId);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ [LeadJourneyAggregator] Erro ao buscar dados_cliente:', error.message);
      return new Map();
    }
    
    const clienteMap = new Map<string, any>();
    for (const cliente of (data || [])) {
      const telefoneNorm = normalizeTelefone(cliente.telefone_normalizado || cliente.telefone);
      if (telefoneNorm) {
        clienteMap.set(telefoneNorm, cliente);
      }
    }
    
    console.log(`✅ [LeadJourneyAggregator] Carregados ${clienteMap.size} clientes de dados_cliente`);
    return clienteMap;
  } catch (error: any) {
    console.error('❌ [LeadJourneyAggregator] Exceção ao buscar dados_cliente:', error.message);
    return new Map();
  }
}

/**
 * Fetches data from n8n_chat_histories table
 * Returns a map keyed by normalized phone number (extracted from session_id)
 */
async function fetchN8nChatHistories(tenantId: string): Promise<Map<string, ChatHistoryData>> {
  // 🔐 SECURITY FIX: Require valid tenantId - no 'default-tenant' bypass
  if (!tenantId || tenantId === 'default-tenant') {
    console.log('⚠️ [LeadJourneyAggregator] tenantId inválido para fetchN8nChatHistories - retornando vazio');
    return new Map();
  }
  
  let supabase = await getClientSupabaseClientStrict(tenantId);
  
  // 🔐 SECURITY FIX: Removed fallback to getClienteSupabase
  // Each tenant MUST have their own Supabase credentials configured.
  
  if (!supabase) {
    console.log(`ℹ️ [LeadJourneyAggregator] Supabase não configurado para tenant ${tenantId} - retornando chat vazio`);
    return new Map();
  }
  
  try {
    const { data, error } = await supabase
      .from('n8n_chat_histories')
      .select('*')
      .order('id', { ascending: true })
      .limit(5000);
    
    if (error) {
      console.error('❌ [LeadJourneyAggregator] Erro ao buscar n8n_chat_histories:', error.message);
      return new Map();
    }
    
    // Group messages by session_id (phone number)
    const chatMap = new Map<string, ChatHistoryData>();
    
    for (const record of (data || [])) {
      // Extract phone from session_id (e.g., "553192267220@s.whatsapp.net" -> "553192267220")
      const sessionId = record.session_id || '';
      const phoneMatch = sessionId.match(/^(\d+)@/);
      const telefone = phoneMatch ? phoneMatch[1] : sessionId;
      const telefoneNorm = normalizeTelefone(telefone);
      
      if (!telefoneNorm) continue;
      
      // Parse message content
      const messageData = record.message || {};
      const messageType = messageData.type as 'human' | 'ai';
      const messageContent = messageData.content || '';
      
      const chatMessage: ChatMessage = {
        id: record.id,
        type: messageType,
        content: messageContent
      };
      
      if (chatMap.has(telefoneNorm)) {
        const existing = chatMap.get(telefoneNorm)!;
        existing.messages.push(chatMessage);
        existing.totalMessages++;
        
        // Try to extract name from human messages
        if (!existing.extractedName && messageType === 'human') {
          const extractedName = extractNameFromMessage(messageContent);
          if (extractedName) {
            existing.extractedName = extractedName;
          }
        }
      } else {
        // Try to extract name from first human message
        let extractedName: string | undefined;
        if (messageType === 'human') {
          extractedName = extractNameFromMessage(messageContent);
        }
        
        chatMap.set(telefoneNorm, {
          sessionId,
          telefone,
          telefoneNormalizado: telefoneNorm,
          messages: [chatMessage],
          totalMessages: 1,
          extractedName
        });
      }
    }
    
    console.log(`✅ [LeadJourneyAggregator] Carregados ${chatMap.size} sessões de chat de n8n_chat_histories`);
    return chatMap;
  } catch (error: any) {
    console.error('❌ [LeadJourneyAggregator] Exceção ao buscar n8n_chat_histories:', error.message);
    return new Map();
  }
}

/**
 * Tries to extract a name from a chat message content
 * Looks for patterns like "Meu nome é X", "Me chamo X", etc.
 */
function extractNameFromMessage(content: string): string | undefined {
  if (!content) return undefined;
  
  const patterns = [
    /meu nome [eé] (.+?)(?:\.|,|!|\?|$)/i,
    /me chamo (.+?)(?:\.|,|!|\?|$)/i,
    /sou (?:o |a )?(.+?)(?:\.|,|!|\?|$)/i,
    /(?:^|\s)nome[:\s]+(.+?)(?:\.|,|!|\?|$)/i,
    /aqui [eé] (?:o |a )?(.+?)(?:\.|,|!|\?|$)/i
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Validate: name should be 2-50 chars, contain only letters/spaces
      if (name.length >= 2 && name.length <= 50 && /^[a-zA-ZÀ-ÿ\s]+$/.test(name)) {
        // Capitalize first letter of each word
        return name.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }
    }
  }
  
  return undefined;
}

/**
 * Fetches data from form_submissions table
 * 
 * FIX: Include submissions where tenant_id matches OR is null
 * This allows form submissions created before multi-tenant setup to be matched
 * 
 * Returns a map with multiple keys for the same submission:
 * - tel:+5531999999999 (phone-based)
 * - cpf:12345678901 (CPF-based)
 * - name:davi emerick (name-based, lowercase)
 */
async function fetchFormSubmissions(tenantId: string): Promise<Map<string, any>> {
  // 🔐 SECURITY FIX: Require valid tenantId - no 'default-tenant' bypass
  if (!tenantId || tenantId === 'default-tenant') {
    console.log('⚠️ [LeadJourneyAggregator] tenantId inválido para fetchFormSubmissions - retornando vazio');
    return new Map();
  }
  
  let supabase = await getClientSupabaseClientStrict(tenantId);
  
  // 🔐 SECURITY FIX: Removed fallback to getClienteSupabase
  // Each tenant MUST have their own Supabase credentials configured.
  
  if (!supabase) {
    console.log(`ℹ️ [LeadJourneyAggregator] Supabase não configurado para tenant ${tenantId} - retornando forms vazios`);
    return new Map();
  }
  
  try {
    let query = supabase
      .from('form_submissions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(500);
    
    // 🔐 SECURITY FIX: ALWAYS filter by tenant_id - no bypass
    if (tenantId === 'system') {
      // System tenant gets null-tenant submissions (legacy data)
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    } else {
      // Other tenants only get their own data
      query = query.eq('tenant_id', tenantId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ [LeadJourneyAggregator] Erro ao buscar form_submissions:', error.message);
      return new Map();
    }
    
    const submissionsMap = new Map<string, any>();
    let phoneCount = 0;
    let cpfCount = 0;
    let nameCount = 0;
    
    for (const submission of (data || [])) {
      // Index by phone
      const telefoneNorm = normalizeTelefone(submission.contact_phone);
      if (telefoneNorm) {
        if (!submissionsMap.has(`tel:${telefoneNorm}`)) {
          submissionsMap.set(`tel:${telefoneNorm}`, submission);
          phoneCount++;
        }
      }
      
      // Also index by CPF for better matching
      const cpfNorm = normalizeCPF(submission.contact_cpf);
      if (cpfNorm && cpfNorm.length === 11) {
        if (!submissionsMap.has(`cpf:${cpfNorm}`)) {
          submissionsMap.set(`cpf:${cpfNorm}`, submission);
          cpfCount++;
        }
      }
      
      // Also index by name (lowercase) for fallback matching
      const nameNorm = submission.contact_name?.trim()?.toLowerCase();
      if (nameNorm && nameNorm.length > 2) {
        if (!submissionsMap.has(`name:${nameNorm}`)) {
          submissionsMap.set(`name:${nameNorm}`, submission);
          nameCount++;
        }
      }
    }
    
    console.log(`✅ [LeadJourneyAggregator] Carregados ${data?.length || 0} form_submissions (${phoneCount} por tel, ${cpfCount} por cpf, ${nameCount} por nome)`);
    return submissionsMap;
  } catch (error: any) {
    console.error('❌ [LeadJourneyAggregator] Exceção ao buscar form_submissions:', error.message);
    return new Map();
  }
}

/**
 * Fetches data from cpf_compliance_resultados table
 * Note: tenant_id filtering applied for multi-tenant isolation
 */
async function fetchCpfComplianceResults(tenantId: string): Promise<Map<string, any>> {
  // 🔐 SECURITY FIX: Require valid tenantId - no 'default-tenant' bypass
  if (!tenantId || tenantId === 'default-tenant') {
    console.log('⚠️ [LeadJourneyAggregator] tenantId inválido para fetchCpfComplianceResults - retornando vazio');
    return new Map();
  }
  
  let supabase = await getClientSupabaseClientStrict(tenantId);
  
  // 🔐 SECURITY FIX: Removed fallback to getClienteSupabase
  // Each tenant MUST have their own Supabase credentials configured.
  
  if (!supabase) {
    console.log(`ℹ️ [LeadJourneyAggregator] Supabase não configurado para tenant ${tenantId} - retornando CPF vazio`);
    return new Map();
  }
  
  try {
    let query = supabase
      .from('cpf_compliance_resultados')
      .select('*')
      .order('data_consulta', { ascending: false })
      .limit(500);
    
    // 🔐 SECURITY FIX: ALWAYS filter by tenant_id - no bypass
    query = query.eq('tenant_id', tenantId);
    
    const { data, error } = await query;
    
    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.log('ℹ️ [LeadJourneyAggregator] Tabela cpf_compliance_resultados não existe - tentando cpf_compliance_results');
        
        let altQuery = supabase
          .from('cpf_compliance_results')
          .select('*')
          .order('data_consulta', { ascending: false })
          .limit(500);
        
        // 🔐 SECURITY FIX: ALWAYS filter by tenant_id - no bypass
        altQuery = altQuery.eq('tenant_id', tenantId);
        
        const { data: altData, error: altError } = await altQuery;
        
        if (altError) {
          console.log('ℹ️ [LeadJourneyAggregator] Nenhuma tabela de CPF compliance no Cliente - tentando Supabase Master');
          return await fetchCpfFromMaster(tenantId);
        }
        
        if (!altData || altData.length === 0) {
          console.log('ℹ️ [LeadJourneyAggregator] Tabela cpf_compliance_results vazia - tentando Supabase Master');
          return await fetchCpfFromMaster(tenantId);
        }
        
        const cpfMap = new Map<string, any>();
        for (const result of (altData || [])) {
          const cpfNorm = normalizeCPF(result.cpf);
          const telefoneNorm = normalizeTelefone(result.telefone);
          
          if (cpfNorm && !cpfMap.has(`cpf:${cpfNorm}`)) {
            cpfMap.set(`cpf:${cpfNorm}`, result);
          }
          if (telefoneNorm && !cpfMap.has(`tel:${telefoneNorm}`)) {
            cpfMap.set(`tel:${telefoneNorm}`, result);
          }
          // FIX: Add name-based matching for better lead association
          const personName = result.nome;
          if (personName && personName.trim().length > 2 && !cpfMap.has(`name:${personName.toLowerCase()}`)) {
            cpfMap.set(`name:${personName.toLowerCase()}`, result);
          }
        }
        
        console.log(`✅ [LeadJourneyAggregator] Carregados ${cpfMap.size / 3} CPF compliance results (alt table)`);
        return cpfMap;
      }
      
      console.error('❌ [LeadJourneyAggregator] Erro ao buscar cpf_compliance_resultados:', error.message);
      return await fetchCpfFromMaster(tenantId);
    }
    
    if (!data || data.length === 0) {
      console.log('ℹ️ [LeadJourneyAggregator] Tabela cpf_compliance_resultados vazia - tentando Supabase Master');
      return await fetchCpfFromMaster(tenantId);
    }
    
    const cpfMap = new Map<string, any>();
    for (const result of (data || [])) {
      const cpfNorm = normalizeCPF(result.cpf);
      const telefoneNorm = normalizeTelefone(result.telefone);
      
      if (cpfNorm && !cpfMap.has(`cpf:${cpfNorm}`)) {
        cpfMap.set(`cpf:${cpfNorm}`, result);
      }
      if (telefoneNorm && !cpfMap.has(`tel:${telefoneNorm}`)) {
        cpfMap.set(`tel:${telefoneNorm}`, result);
      }
      // FIX: Add name-based matching for better lead association
      const personName = result.nome;
      if (personName && personName.trim().length > 2 && !cpfMap.has(`name:${personName.toLowerCase()}`)) {
        cpfMap.set(`name:${personName.toLowerCase()}`, result);
      }
    }
    
    console.log(`✅ [LeadJourneyAggregator] Carregados ${cpfMap.size / 3} CPF compliance results`);
    return cpfMap;
  } catch (error: any) {
    console.error('❌ [LeadJourneyAggregator] Exceção ao buscar CPF compliance:', error.message);
    return await fetchCpfFromMaster(tenantId);
  }
}

/**
 * Fallback: Fetches CPF data from Supabase Master datacorp_checks table
 * Used when Cliente tables don't exist or are empty
 * 
 * FIX: Since datacorp_checks doesn't have a telefone column, we also fetch
 * phone numbers from form_submissions using submission_id for phone-based matching
 */
async function fetchCpfFromMaster(tenantId: string): Promise<Map<string, any>> {
  try {
    const isMasterConfigured = await isSupabaseMasterConfigured(tenantId);
    if (!isMasterConfigured) {
      console.log('ℹ️ [LeadJourneyAggregator] Supabase Master não configurado');
      return new Map();
    }

    console.log('🔄 [LeadJourneyAggregator] Buscando CPF data do Supabase Master (datacorp_checks)...');
    
    const masterSupabase = await getSupabaseMasterForTenant(tenantId);
    
    const { data: checks, error } = await masterSupabase
      .from('datacorp_checks')
      .select('*')
      .in('status', ['approved', 'rejected'])
      .order('consulted_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('❌ [LeadJourneyAggregator] Erro ao buscar datacorp_checks do Master:', error.message);
      return new Map();
    }

    if (!checks || checks.length === 0) {
      console.log('ℹ️ [LeadJourneyAggregator] Nenhum check CPF encontrado no Master');
      return new Map();
    }

    // FIX: Build a map of submission_id -> phone number from form_submissions
    // This enables phone-based matching since datacorp_checks doesn't have telefone column
    const submissionPhoneMap = new Map<string, string>();
    const submissionIds = checks
      .filter(c => c.submission_id)
      .map(c => c.submission_id);
    
    if (submissionIds.length > 0) {
      try {
        const clientSupabase = await getClientSupabaseClientStrict(tenantId);
        if (clientSupabase) {
          const { data: submissions, error: subError } = await clientSupabase
            .from('form_submissions')
            .select('id, contact_phone, contact_cpf')
            .in('id', submissionIds);
          
          if (!subError && submissions) {
            for (const sub of submissions) {
              if (sub.contact_phone) {
                submissionPhoneMap.set(sub.id, sub.contact_phone);
              }
            }
            console.log(`📞 [LeadJourneyAggregator] Encontrados ${submissionPhoneMap.size} telefones via form_submissions`);
          }
        }
      } catch (e: any) {
        console.log(`⚠️ [LeadJourneyAggregator] Erro ao buscar telefones de form_submissions: ${e.message}`);
      }
    }

    const cpfMap = new Map<string, any>();
    let cpfEntriesCount = 0;
    let telEntriesCount = 0;
    
    for (const check of checks) {
      let cpfValue: string | null = null;
      
      // Priority 1: Use person_cpf field if available (already decrypted/formatted)
      if (check.person_cpf) {
        cpfValue = check.person_cpf.replace(/\D/g, '');
        if (cpfValue.length === 11) {
          console.log(`✅ [LeadJourneyAggregator] CPF obtido de person_cpf (check ${check.id})`);
        } else {
          cpfValue = null;
        }
      }
      
      // Priority 2: Try to decrypt CPF from encrypted field
      if (!cpfValue && check.cpf_encrypted) {
        try {
          cpfValue = decryptCPF(check.cpf_encrypted);
        } catch (e: any) {
          console.log(`⚠️ [LeadJourneyAggregator] Falha ao descriptografar CPF (check ${check.id}): ${e.message}`);
        }
      }
      
      // Priority 3: Try to get CPF from payload
      if (!cpfValue && check.payload) {
        try {
          const payload = check.payload as any;
          if (payload?.Result?.[0]?.BasicData?.CPF) {
            cpfValue = payload.Result[0].BasicData.CPF.replace(/\D/g, '');
          }
        } catch {
          // Silent fail - payload structure might vary
        }
      }
      
      // FIX: Get phone number from multiple sources:
      // 1. person_phone field (saved directly in datacorp_checks when calling checkCompliance with personPhone)
      // 2. telefone field (legacy field, may be null)
      // 3. form_submissions via submission_id (fallback)
      let telefone = check.person_phone || check.telefone;
      if (!telefone && check.submission_id) {
        telefone = submissionPhoneMap.get(check.submission_id);
      }
      const telefoneNorm = normalizeTelefone(telefone);
      
      // Get person_name for name-based matching (important when decryption fails and no phone)
      const personName = check.person_name?.trim() || '';
      
      // Extract detailed BigDataCorp API response data from payload
      // Actual BigDataCorp payload structure:
      // {
      //   QueryId: "...",
      //   ElapsedMilliseconds: 171,
      //   Status: { processes: [{ Code: 0, Message: "OK" }] },
      //   Result: [{
      //     MatchKeys: "doc{...}",
      //     Processes: {
      //       TotalLawsuits: 0,
      //       TotalLawsuitsAsAuthor: 0,
      //       TotalLawsuitsAsDefendant: 0,
      //       Last30DaysLawsuits: 0,
      //       Last90DaysLawsuits: 0,
      //       Last180DaysLawsuits: 0,
      //       Last365DaysLawsuits: 0,
      //       Lawsuits: [...]
      //     }
      //   }]
      // }
      const payload = check.payload as any;
      let queryId = payload?.QueryId || check.id;
      let tempoResposta = payload?.ElapsedMilliseconds || check.response_time_ms || 0;
      let matchKeys = '';
      let statusCode = 0;
      let statusMessage = 'OK';
      let comoAutor = 0;
      let comoReu = 0;
      let primeiroProcesso: string | undefined;
      let ultimoProcesso: string | undefined;
      let ultimos30Dias = 0;
      let ultimos90Dias = 0;
      let ultimos180Dias = 0;
      let ultimos365Dias = 0;
      let totalProcessos = 0;
      
      // Extract status from Status.processes array
      if (payload?.Status?.processes?.[0]) {
        statusCode = payload.Status.processes[0].Code ?? 0;
        statusMessage = payload.Status.processes[0].Message || 'OK';
      }
      
      // Extract from Result array with safe null checks
      const result0 = payload?.Result?.[0];
      if (result0) {
        // Get MatchKeys - prioritize the actual field from BigDataCorp
        matchKeys = result0.MatchKeys || '';
        
        // Fall back to BasicData.CPF if MatchKeys is empty
        if (!matchKeys) {
          const basicData = result0.BasicData;
          if (basicData?.CPF) {
            matchKeys = `doc{${basicData.CPF.replace(/\D/g, '')}}`;
          }
        }
        
        // Extract from Processes object (correct structure)
        const processes = result0.Processes;
        if (processes) {
          totalProcessos = processes.TotalLawsuits || 0;
          comoAutor = processes.TotalLawsuitsAsAuthor || 0;
          comoReu = processes.TotalLawsuitsAsDefendant || 0;
          ultimos30Dias = processes.Last30DaysLawsuits || 0;
          ultimos90Dias = processes.Last90DaysLawsuits || 0;
          ultimos180Dias = processes.Last180DaysLawsuits || 0;
          ultimos365Dias = processes.Last365DaysLawsuits || 0;
          
          // Try to get first/last lawsuit dates from the Lawsuits array
          const lawsuitsArray = processes.Lawsuits;
          if (lawsuitsArray && Array.isArray(lawsuitsArray) && lawsuitsArray.length > 0) {
            // Sort by date to get first and last
            const sorted = [...lawsuitsArray].sort((a, b) => {
              const dateA = new Date(a.DistributionDate || a.Date || 0).getTime();
              const dateB = new Date(b.DistributionDate || b.Date || 0).getTime();
              return dateA - dateB;
            });
            primeiroProcesso = sorted[0]?.DistributionDate || sorted[0]?.Date;
            ultimoProcesso = sorted[sorted.length - 1]?.DistributionDate || sorted[sorted.length - 1]?.Date;
          }
        }
      }
      
      const result = {
        id: check.id,
        cpf: cpfValue || '',
        nome: personName,
        telefone: telefone || null,
        status: check.status,
        dados: !!check.payload,
        risco: check.risk_score || 0,
        processos: totalProcessos || (check.payload as any)?.totalLawsuits || 0,
        aprovado: check.status === 'approved',
        dataConsulta: check.consulted_at,
        data_consulta: check.consulted_at,
        checkId: check.id,
        check_id: check.id,
        // Full BigDataCorp API response data
        queryId,
        tempoResposta,
        matchKeys,
        statusCode,
        statusMessage,
        comoAutor,
        comoReu,
        primeiroProcesso,
        ultimoProcesso,
        ultimos30Dias,
        ultimos90Dias,
        ultimos180Dias,
        ultimos365Dias,
        payload: check.payload
      };

      // Add entry by CPF (primary matching method)
      if (cpfValue) {
        const cpfNorm = normalizeCPF(cpfValue);
        if (cpfNorm && !cpfMap.has(`cpf:${cpfNorm}`)) {
          cpfMap.set(`cpf:${cpfNorm}`, result);
          cpfEntriesCount++;
        }
      }
      
      // Add entry by phone (secondary matching method)
      if (telefoneNorm && !cpfMap.has(`tel:${telefoneNorm}`)) {
        cpfMap.set(`tel:${telefoneNorm}`, result);
        telEntriesCount++;
      }
      
      // Add entry by person_name (tertiary matching method - important for when decryption fails)
      if (personName && !cpfMap.has(`name:${personName.toLowerCase()}`)) {
        cpfMap.set(`name:${personName.toLowerCase()}`, result);
      }
    }

    console.log(`✅ [LeadJourneyAggregator] Carregados ${cpfEntriesCount} CPF entries e ${telEntriesCount} telefone entries do Supabase Master (+ name entries)`);
    return cpfMap;
  } catch (error: any) {
    console.error('❌ [LeadJourneyAggregator] Exceção ao buscar CPF do Master:', error.message);
    return new Map();
  }
}

/**
 * Fetches data from reuniao table (singular) and reunioes (plural), merging results
 */
async function fetchReunioes(tenantId: string): Promise<Map<string, any>> {
  const supabase = await getClientSupabaseClientStrict(tenantId);
  if (!supabase) return new Map();
  
  // Query BOTH tables and merge results (in case data is in different tables)
  const tableNames = ['reuniao', 'reunioes'];
  const reunioesMap = new Map<string, any>();
  let totalLoaded = 0;
  
  for (const tableName of tableNames) {
    try {
      let query = supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      // Note: reuniao table might not have tenant_id column
      // Only filter by tenant_id if needed and column exists
      
      const { data, error } = await query;
      
      if (error) {
        // Handle table not found errors (various error formats from Supabase/PostgREST)
        const isTableNotFound = error.code === '42P01' || 
          error.message.includes('does not exist') ||
          error.message.includes('Could not find the table') ||
          error.message.includes('schema cache');
        
        if (isTableNotFound) {
          console.log(`ℹ️ [LeadJourneyAggregator] Tabela ${tableName} não acessível, tentando próxima...`);
          continue;
        }
        
        console.error(`❌ [LeadJourneyAggregator] Erro ao buscar ${tableName}:`, error.message);
        continue;
      }
      
      let tableCount = 0;
      for (const reuniao of (data || [])) {
        const rawPhone = reuniao.telefone_normalizado || reuniao.telefone;
        const telefoneNorm = normalizeTelefone(rawPhone);
        console.log(`📞 [Reuniao] Raw: ${rawPhone?.substring(0, 20)}... → Normalized: ${telefoneNorm}, status: ${reuniao.status}`);
        
        // Map the meeting status to normalized format
        if (reuniao.status) {
          // Normalize status variations
          const statusLower = reuniao.status.toLowerCase();
          if (statusLower === 'agendado') {
            reuniao.status = 'agendada'; // Normalize to feminine form expected by pipeline
            console.log(`🔄 [Reuniao] Status normalized: agendado → agendada`);
          }
        }
        
        if (telefoneNorm) {
          const existing = reunioesMap.get(telefoneNorm);
          // Prefer records with a status over records without status
          // Or add if no existing record
          if (!existing || (!existing.status && reuniao.status)) {
            if (!existing) {
              tableCount++;
              reunioesMap.set(telefoneNorm, reuniao);
            } else {
              // MERGE fields from existing record when replacing
              // Keep tipo_reuniao, link_reuniao and other fields from existing if new record doesn't have them
              console.log(`🔄 [Reuniao] Merging existing record (status: ${existing.status}, tipo: ${existing.tipo_reuniao}) with new record (status: ${reuniao.status}, tipo: ${reuniao.tipo_reuniao})`);
              const mergedReuniao = {
                ...existing,  // Keep all existing fields
                ...reuniao,   // Override with new record fields
                // Explicitly preserve these if new record doesn't have them
                tipo_reuniao: reuniao.tipo_reuniao || existing.tipo_reuniao,
                link_reuniao: reuniao.link_reuniao || existing.link_reuniao,
                consultor: reuniao.consultor || existing.consultor,
                consultor_nome: reuniao.consultor_nome || existing.consultor_nome,
                consultor_email: reuniao.consultor_email || existing.consultor_email,
                resultado_reuniao: reuniao.resultado_reuniao || existing.resultado_reuniao,
                motivo_recusa: reuniao.motivo_recusa || existing.motivo_recusa,
              };
              reunioesMap.set(telefoneNorm, mergedReuniao);
              console.log(`✅ [Reuniao] Merged result - tipo: ${mergedReuniao.tipo_reuniao}, link: ${mergedReuniao.link_reuniao ? 'present' : 'missing'}`);
            }
          }
        }
      }
      
      if (tableCount > 0) {
        console.log(`✅ [LeadJourneyAggregator] Carregadas ${tableCount} reuniões da tabela ${tableName}`);
        console.log(`📋 [Reuniao] Phones in map: ${Array.from(reunioesMap.keys()).join(', ')}`);
        totalLoaded += tableCount;
      }
    } catch (error: any) {
      console.error(`❌ [LeadJourneyAggregator] Exceção ao buscar ${tableName}:`, error.message);
      continue;
    }
  }
  
  if (totalLoaded > 0) {
    console.log(`✅ [LeadJourneyAggregator] Total: ${reunioesMap.size} reuniões carregadas`);
  } else {
    console.log('ℹ️ [LeadJourneyAggregator] Nenhuma tabela de reuniões encontrada - usando dados de dados_cliente');
  }
  
  return reunioesMap;
}

/**
 * Fetches data from dashboard tables (clientes_completos)
 * This table contains chat history, message counts, and other engagement data
 */
async function fetchDashboardCompleto(tenantId: string): Promise<Map<string, any>> {
  // 🔐 SECURITY FIX: Require valid tenantId - no 'default-tenant' bypass
  if (!tenantId || tenantId === 'default-tenant') {
    console.log('⚠️ [LeadJourneyAggregator] tenantId inválido para fetchDashboardCompleto - retornando vazio');
    return new Map();
  }
  
  const supabase = await getClientSupabaseClientStrict(tenantId);
  if (!supabase) return new Map();
  
  const tablesToTry = ['clientes_completos'];
  
  for (const tableName of tablesToTry) {
    try {
      console.log(`🔄 [LeadJourneyAggregator] Tentando buscar dados de dashboard da tabela: ${tableName}`);
      
      let query = supabase
        .from(tableName)
        .select('*')
        .limit(500);
      
      // 🔐 SECURITY FIX: ALWAYS filter by tenant_id - no bypass
      query = query.eq('tenant_id', tenantId);
      
      const { data, error } = await query;
      
      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log(`ℹ️ [LeadJourneyAggregator] Tabela ${tableName} não existe, tentando próxima...`);
          continue;
        }
        
        console.error(`❌ [LeadJourneyAggregator] Erro ao buscar ${tableName}:`, error.message);
        continue;
      }
      
      const dashboardMap = new Map<string, any>();
      const rawData = data || [];
      console.log(`📊 [LeadJourneyAggregator] ${tableName} raw count: ${rawData.length}`);
      
      for (const record of rawData) {
        // Map fields from clientes_completos to the internal structure if needed
        // The expected structure is defined in DashboardData interface
        const mappedRecord = {
          ...record,
          // Field mapping for clientes_completos (fallback to record fields if already correctly named)
          total_mensagens_chat: record.total_mensagens_chat ?? record.mensagens_total ?? 0,
          primeiro_contato: record.primeiro_contato ?? record.created_at,
          ultimo_contato: record.ultimo_contato ?? record.updated_at ?? record.created_at,
          status_atendimento: record.status_atendimento ?? record.status
        };

        const telefoneNorm = normalizeTelefone(record.telefone);
        if (telefoneNorm && !dashboardMap.has(telefoneNorm)) {
          dashboardMap.set(telefoneNorm, mappedRecord);
        }
      }
      
      console.log(`✅ [LeadJourneyAggregator] Carregados ${dashboardMap.size} registros de ${tableName}`);
      return dashboardMap;
    } catch (error: any) {
      console.error(`❌ [LeadJourneyAggregator] Exceção ao buscar ${tableName}:`, error.message);
      continue;
    }
  }

  console.warn('⚠️ [LeadJourneyAggregator] Nenhuma tabela de dashboard encontrada');
  return new Map();
}

/**
 * Fetches data from formulario_envios table
 * Used to determine if a form was sent but not filled out
 * 
 * FIX: Include records where tenant_id matches OR is null
 */
async function fetchFormularioEnvios(tenantId: string): Promise<Map<string, any>> {
  // 🔐 SECURITY FIX: Require valid tenantId - no 'default-tenant' bypass
  if (!tenantId || tenantId === 'default-tenant') {
    console.log('⚠️ [LeadJourneyAggregator] tenantId inválido para fetchFormularioEnvios - retornando vazio');
    return new Map();
  }
  
  const supabase = await getClientSupabaseClientStrict(tenantId);
  if (!supabase) return new Map();
  
  try {
    let query = supabase
      .from('formulario_envios')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    
    // 🔐 SECURITY FIX: ALWAYS filter by tenant_id - no bypass
    if (tenantId === 'system') {
      // System tenant gets null-tenant records (legacy data)
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    } else {
      // Other tenants only get their own data
      query = query.eq('tenant_id', tenantId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.log('ℹ️ [LeadJourneyAggregator] Tabela formulario_envios não existe');
        return new Map();
      }
      
      console.error('❌ [LeadJourneyAggregator] Erro ao buscar formulario_envios:', error.message);
      return new Map();
    }
    
    const enviosMap = new Map<string, any>();
    for (const envio of (data || [])) {
      const telefoneNorm = normalizeTelefone(envio.telefone_normalizado || envio.telefone);
      if (telefoneNorm && !enviosMap.has(telefoneNorm)) {
        enviosMap.set(telefoneNorm, envio);
      }
    }
    
    console.log(`✅ [LeadJourneyAggregator] Carregados ${enviosMap.size} registros de formulario_envios`);
    return enviosMap;
  } catch (error: any) {
    console.error('❌ [LeadJourneyAggregator] Exceção ao buscar formulario_envios:', error.message);
    return new Map();
  }
}

/**
 * Fetches data from assinatura_contracts table
 * Used for Assinatura Pendente and Revendedora stages
 */
async function fetchAssinaturaContracts(tenantId: string): Promise<Map<string, AssinaturaData>> {
  // 🔐 SECURITY FIX: Require valid tenantId - no 'default-tenant' bypass
  if (!tenantId || tenantId === 'default-tenant') {
    console.log('⚠️ [LeadJourneyAggregator] tenantId inválido para fetchAssinaturaContracts - retornando vazio');
    return new Map();
  }
  
  const supabase = await getClientSupabaseClientStrict(tenantId);
  if (!supabase) return new Map();
  
  try {
    // Try 'contracts' table first (correct table name), fallback to 'assinatura_contracts' for compatibility
    let query = supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    
    // 🔐 SECURITY FIX: ALWAYS filter by tenant_id - no bypass
    query = query.eq('tenant_id', tenantId);
    
    let { data, error } = await query;
    
    // Fallback to assinatura_contracts if contracts doesn't exist
    if (error && (error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('schema cache'))) {
      console.log('ℹ️ [LeadJourneyAggregator] Tabela contracts não encontrada, tentando assinatura_contracts...');
      let fallbackQuery = supabase
        .from('assinatura_contracts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      // 🔐 SECURITY FIX: ALWAYS filter by tenant_id - no bypass
      fallbackQuery = fallbackQuery.eq('tenant_id', tenantId);
      
      const fallbackResult = await fallbackQuery;
      data = fallbackResult.data;
      error = fallbackResult.error;
    }
    
    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('schema cache')) {
        console.log('ℹ️ [LeadJourneyAggregator] Nenhuma tabela de contratos encontrada');
        return new Map();
      }
      
      console.error('❌ [LeadJourneyAggregator] Erro ao buscar contratos:', error.message);
      return new Map();
    }
    
    const assinaturaMap = new Map<string, AssinaturaData>();
    for (const contract of (data || [])) {
      const telefoneNorm = normalizeTelefone(contract.client_phone);
      const cpfNorm = normalizeCPF(contract.client_cpf);
      
      const assinaturaData: AssinaturaData = {
        id: contract.id,
        clientName: contract.client_name,
        clientCpf: contract.client_cpf,
        clientEmail: contract.client_email,
        clientPhone: contract.client_phone,
        status: contract.status || 'pending',
        accessToken: contract.access_token,
        protocolNumber: contract.protocol_number,
        createdAt: contract.created_at,
        signedAt: contract.signed_at,
        updatedAt: contract.updated_at
      };
      
      if (telefoneNorm && !assinaturaMap.has(`tel:${telefoneNorm}`)) {
        assinaturaMap.set(`tel:${telefoneNorm}`, assinaturaData);
      }
      if (cpfNorm && !assinaturaMap.has(`cpf:${cpfNorm}`)) {
        assinaturaMap.set(`cpf:${cpfNorm}`, assinaturaData);
      }
    }
    
    // Log contract keys for debugging
    const contractKeys = Array.from(assinaturaMap.keys());
    console.log(`✅ [LeadJourneyAggregator] Carregados ${(data || []).length} contratos da tabela contracts`);
    console.log(`📋 [Contracts] Keys in map: ${contractKeys.slice(0, 10).join(', ')}${contractKeys.length > 10 ? '...' : ''}`);
    return assinaturaMap;
  } catch (error: any) {
    console.error('❌ [LeadJourneyAggregator] Exceção ao buscar assinatura_contracts:', error.message);
    return new Map();
  }
}

/**
 * Aggregates lead journeys from all Supabase tables
 * 
 * @param tenantId - Required tenant ID for multi-tenant isolation
 * @returns Array of LeadJourney objects with accumulated data from all stages
 */
export async function aggregateLeadJourneys(tenantId: string): Promise<LeadJourney[]> {
  const supabase = await getClientSupabaseClientStrict(tenantId);
  
  if (!supabase) {
    console.log(`⚠️ [LeadJourneyAggregator] Supabase não configurado para tenant: ${tenantId}`);
    return [];
  }
  
  if (!tenantId || tenantId.trim() === '') {
    console.error('❌ [LeadJourneyAggregator] tenantId é obrigatório');
    return [];
  }
  
  console.log(`🔄 [LeadJourneyAggregator] Agregando jornadas para tenant: ${tenantId}`);
  
  const [clientesMap, submissionsMap, cpfMap, reunioesMap, dashboardMap, formularioEnviosMap, assinaturaMap, chatHistoriesMap] = await Promise.all([
    fetchDadosCliente(tenantId),
    fetchFormSubmissions(tenantId),
    fetchCpfComplianceResults(tenantId),
    fetchReunioes(tenantId),
    fetchDashboardCompleto(tenantId),
    fetchFormularioEnvios(tenantId),
    fetchAssinaturaContracts(tenantId),
    fetchN8nChatHistories(tenantId)
  ]);
  
  const allPhones = new Set<string>();
  
  for (const phone of clientesMap.keys()) allPhones.add(phone);
  
  // Add phones from chat histories (n8n_chat_histories)
  for (const phone of chatHistoriesMap.keys()) allPhones.add(phone);
  
  // submissionsMap now has prefixed keys (tel:, cpf:, name:) - extract only phone numbers
  for (const key of submissionsMap.keys()) {
    if (key.startsWith('tel:')) {
      allPhones.add(key.replace('tel:', ''));
    }
  }
  
  for (const key of cpfMap.keys()) {
    if (key.startsWith('tel:')) allPhones.add(key.replace('tel:', ''));
  }
  for (const phone of reunioesMap.keys()) allPhones.add(phone);
  for (const phone of dashboardMap.keys()) allPhones.add(phone);
  for (const phone of formularioEnviosMap.keys()) allPhones.add(phone);
  
  console.log(`📊 [LeadJourneyAggregator] Total de ${allPhones.size} telefones únicos encontrados`);
  
  const journeys: LeadJourney[] = [];
  
  for (const telefoneNorm of allPhones) {
    if (!telefoneNorm) continue;
    
    const cliente = clientesMap.get(telefoneNorm);
    
    // Try to find submission by multiple methods: phone, CPF, name
    let submission = submissionsMap.get(`tel:${telefoneNorm}`);
    
    // If no match by phone, try by CPF
    const clienteCpf = normalizeCPF(cliente?.cpf);
    if (!submission && clienteCpf && clienteCpf.length === 11) {
      submission = submissionsMap.get(`cpf:${clienteCpf}`);
      if (submission) {
        console.log(`🔗 [LeadJourneyAggregator] Submission encontrada por CPF: ${clienteCpf.substring(0, 3)}...`);
      }
    }
    
    // If still no match, try by name
    const clienteName = cliente?.nome?.trim()?.toLowerCase();
    if (!submission && clienteName && clienteName.length > 2) {
      submission = submissionsMap.get(`name:${clienteName}`);
      if (submission) {
        console.log(`🔗 [LeadJourneyAggregator] Submission encontrada por nome: ${clienteName}`);
      }
    }
    
    let cpfResult: any = null;
    const cpfFromCliente = clienteCpf;
    const cpfFromSubmission = normalizeCPF(submission?.contact_cpf);
    
    // Match by CPF first (primary method)
    if (cpfFromCliente && cpfMap.has(`cpf:${cpfFromCliente}`)) {
      cpfResult = cpfMap.get(`cpf:${cpfFromCliente}`);
    } else if (cpfFromSubmission && cpfMap.has(`cpf:${cpfFromSubmission}`)) {
      cpfResult = cpfMap.get(`cpf:${cpfFromSubmission}`);
    } else if (cpfMap.has(`tel:${telefoneNorm}`)) {
      // Match by phone (secondary method)
      cpfResult = cpfMap.get(`tel:${telefoneNorm}`);
    }
    
    // If no match yet, try matching by person name (tertiary method - important when decryption fails)
    if (!cpfResult) {
      const clienteName = cliente?.nome?.trim()?.toLowerCase();
      const submissionName = submission?.contact_name?.trim()?.toLowerCase();
      
      if (clienteName && cpfMap.has(`name:${clienteName}`)) {
        cpfResult = cpfMap.get(`name:${clienteName}`);
        console.log(`🔗 [LeadJourneyAggregator] Match por nome: ${clienteName}`);
      } else if (submissionName && cpfMap.has(`name:${submissionName}`)) {
        cpfResult = cpfMap.get(`name:${submissionName}`);
        console.log(`🔗 [LeadJourneyAggregator] Match por nome (submission): ${submissionName}`);
      }
    }
    
    let reuniao = reunioesMap.get(telefoneNorm);
    
    if (!reuniao && cliente) {
      if (cliente.reuniao_status || cliente.reuniao_data || cliente.consultor_nome) {
        reuniao = {
          id: cliente.id,
          status: cliente.reuniao_status,
          data: cliente.reuniao_data,
          hora: cliente.reuniao_hora,
          local: cliente.reuniao_local,
          tipo: cliente.reuniao_tipo,
          link: cliente.reuniao_link,
          consultor_nome: cliente.consultor_nome,
          consultor_email: cliente.consultor_email,
          resultado_reuniao: cliente.resultado_reuniao,
          motivo_recusa: cliente.motivo_recusa
        };
      }
    }
    
    const contactData: ContactData | undefined = cliente ? {
      id: cliente.id,
      nome: cliente.nome || 'Sem nome',
      email: cliente.email,
      telefone: cliente.telefone || telefoneNorm,
      telefoneNormalizado: telefoneNorm,
      cpf: cliente.cpf,
      origem: cliente.origem,
      createdAt: cliente.created_at,
      updatedAt: cliente.updated_at
    } : undefined;
    
    // Parse answers if it's a JSON string
    let parsedAnswers = submission?.answers;
    if (typeof parsedAnswers === 'string') {
      try {
        parsedAnswers = JSON.parse(parsedAnswers);
      } catch (e) {
        console.warn('[LeadJourneyAggregator] Failed to parse answers as JSON string');
      }
    }
    
    const formData: FormData | undefined = submission ? {
      id: submission.id,
      formId: submission.form_id,
      formStatus: submission.form_status || 'completed',
      passed: submission.passed,
      totalScore: submission.total_score,
      answers: parsedAnswers,
      contactName: submission.contact_name,
      contactEmail: submission.contact_email,
      contactPhone: submission.contact_phone,
      contactCpf: submission.contact_cpf,
      createdAt: submission.created_at,
      updatedAt: submission.updated_at
    } : undefined;
    
    const cpfData: CpfData | undefined = cpfResult ? {
      id: cpfResult.id,
      cpf: cpfResult.cpf,
      nome: cpfResult.nome,
      telefone: cpfResult.telefone,
      status: cpfResult.status,
      dados: cpfResult.dados,
      risco: cpfResult.risco,
      processos: cpfResult.processos,
      aprovado: cpfResult.aprovado,
      dataConsulta: cpfResult.data_consulta,
      checkId: cpfResult.check_id,
      // Full BigDataCorp API response data
      queryId: cpfResult.queryId,
      tempoResposta: cpfResult.tempoResposta,
      matchKeys: cpfResult.matchKeys,
      statusCode: cpfResult.statusCode,
      statusMessage: cpfResult.statusMessage,
      comoAutor: cpfResult.comoAutor,
      comoReu: cpfResult.comoReu,
      primeiroProcesso: cpfResult.primeiroProcesso,
      ultimoProcesso: cpfResult.ultimoProcesso,
      ultimos30Dias: cpfResult.ultimos30Dias,
      ultimos90Dias: cpfResult.ultimos90Dias,
      ultimos180Dias: cpfResult.ultimos180Dias,
      ultimos365Dias: cpfResult.ultimos365Dias,
      payload: cpfResult.payload
    } : undefined;
    
    // Parse date and time from data_inicio or other date fields
    let meetingDate: string | undefined;
    let meetingTime: string | undefined;
    
    if (reuniao) {
      // Handle data_inicio (ISO format like "2025-12-16 14:00:00+00")
      const dataInicio = reuniao.data_inicio || reuniao.data || reuniao.reuniao_data;
      if (dataInicio) {
        try {
          const dateObj = new Date(dataInicio);
          meetingDate = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
          meetingTime = dateObj.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
        } catch (e) {
          meetingDate = typeof dataInicio === 'string' ? dataInicio.split(' ')[0] : undefined;
          meetingTime = typeof dataInicio === 'string' ? dataInicio.split(' ')[1]?.substring(0, 5) : undefined;
        }
      }
      // Override with explicit hora if available
      if (reuniao.hora || reuniao.reuniao_hora) {
        meetingTime = reuniao.hora || reuniao.reuniao_hora;
      }
    }
    
    // Debug log to trace meeting fields
    if (reuniao) {
      console.log(`🗓️ [Meeting] Building meeting data for ${telefoneNorm}:`);
      console.log(`   tipo_reuniao: ${reuniao.tipo_reuniao}, tipo: ${reuniao.tipo}, reuniao_tipo: ${reuniao.reuniao_tipo}`);
      console.log(`   link_reuniao: ${reuniao.link_reuniao ? 'present' : 'missing'}, link: ${reuniao.link ? 'present' : 'missing'}`);
      console.log(`   status: ${reuniao.status}, titulo: ${reuniao.titulo}, compareceu: ${reuniao.compareceu}`);
    }
    
    const meetingData: MeetingData | undefined = reuniao ? {
      id: reuniao.id,
      idReuniao: reuniao.id_reuniao, // String ID like "reuniao-davi-2025-12-16-11h"
      titulo: reuniao.titulo, // Meeting title
      status: reuniao.status || reuniao.reuniao_status,
      data: meetingDate,
      hora: meetingTime,
      local: reuniao.local || reuniao.reuniao_local,
      tipo: reuniao.tipo_reuniao || reuniao.tipo || reuniao.reuniao_tipo, // "online" or "presencial"
      link: reuniao.link_reuniao || reuniao.link || reuniao.reuniao_link,
      consultorNome: reuniao.consultor || reuniao.consultor_nome,
      consultorEmail: reuniao.consultor_email,
      resultadoReuniao: reuniao.resultado_reuniao || reuniao.resultado,
      motivoRecusa: reuniao.motivo_recusa,
      compareceu: reuniao.compareceu, // Boolean field indicating if client attended
      dataInicio: reuniao.data_inicio // Original start date/time for attendance check
    } : undefined;
    
    // Get dashboard data for this phone
    const dashboardRecord = dashboardMap.get(telefoneNorm);
    const dashboardData: DashboardData | undefined = dashboardRecord ? {
      totalMensagensChat: dashboardRecord.total_mensagens_chat,
      mensagensCliente: dashboardRecord.mensagens_cliente,
      mensagensAgente: dashboardRecord.mensagens_agente,
      totalTranscricoes: dashboardRecord.total_transcricoes,
      primeiroContato: dashboardRecord.primeiro_contato,
      ultimoContato: dashboardRecord.ultimo_contato,
      primeiraMensagem: dashboardRecord.primeira_mensagem,
      ultimaMensagem: dashboardRecord.ultima_mensagem,
      temDadosCliente: dashboardRecord.tem_dados_cliente,
      temHistoricoChat: dashboardRecord.tem_historico_chat,
      temTranscricoes: dashboardRecord.tem_transcricoes,
      statusAtendimento: dashboardRecord.status_atendimento,
      setorAtual: dashboardRecord.setor_atual,
      ativo: dashboardRecord.ativo,
      tipoReuniaoAtual: dashboardRecord.tipo_reuniao_atual,
      ultimaAtividade: dashboardRecord.ultima_atividade,
      totalRegistros: dashboardRecord.total_registros,
      registrosDadosCliente: dashboardRecord.registros_dados_cliente,
      fontesDados: dashboardRecord.fontes_dados,
      ultimoResumoEstruturado: dashboardRecord.ultimo_resumo_estruturado,
      todasMensagensChat: dashboardRecord.todas_mensagens_chat
    } : undefined;
    
    // Get formulario_envios data for this phone
    const formularioEnvio = formularioEnviosMap.get(telefoneNorm);
    
    // Get assinatura data for this phone or CPF
    const cpfNorm = normalizeCPF(cliente?.cpf || submission?.contact_cpf || cpfResult?.cpf);
    const assinaturaData = assinaturaMap.get(`tel:${telefoneNorm}`) || 
                           (cpfNorm ? assinaturaMap.get(`cpf:${cpfNorm}`) : undefined);
    
    // Get chat history data for this phone
    const chatHistoryData = chatHistoriesMap.get(telefoneNorm);
    
    const partialJourney: Partial<LeadJourney> & { formularioEnvio?: any; assinatura?: AssinaturaData; chatHistory?: ChatHistoryData } = {
      contact: contactData,
      form: formData,
      cpfData,
      meeting: meetingData,
      dashboard: dashboardData,
      formularioEnvio,
      assinatura: assinaturaData,
      chatHistory: chatHistoryData
    };
    
    const pipelineStatus = determinePipelineStatus(partialJourney);
    const timeline = createTimeline(partialJourney);
    
    // Include chatHistory.extractedName and formularioEnvio.nome in the name resolution chain
    const nome = cliente?.nome || submission?.contact_name || cpfResult?.nome || formularioEnvio?.nome || chatHistoryData?.extractedName || dashboardRecord?.nome_cliente || dashboardRecord?.nome || 'Sem nome';
    const email = cliente?.email || submission?.contact_email;
    const cpf = cliente?.cpf || submission?.contact_cpf || cpfResult?.cpf;
    const telefone = cliente?.telefone || submission?.contact_phone || cpfResult?.telefone || telefoneNorm;
    
    const createdAt = cliente?.created_at || submission?.created_at || cpfResult?.data_consulta || new Date().toISOString();
    const updatedAt = Math.max(
      new Date(cliente?.updated_at || 0).getTime(),
      new Date(submission?.updated_at || 0).getTime(),
      new Date(cpfResult?.data_consulta || 0).getTime()
    );
    
    const journeyId = cliente?.id || submission?.id || `phone-${telefoneNorm}`;
    
    // Build formularioEnvio data if exists
    const formularioEnvioData: FormularioEnvioData | undefined = formularioEnvio ? {
      id: formularioEnvio.id,
      formId: formularioEnvio.form_id || formularioEnvio.formId,
      telefone: formularioEnvio.telefone,
      telefoneNormalizado: formularioEnvio.telefone_normalizado || normalizeTelefone(formularioEnvio.telefone),
      nome: formularioEnvio.nome || formularioEnvio.contact_name,
      formUrl: formularioEnvio.form_url || formularioEnvio.formUrl,
      enviadoEm: formularioEnvio.enviado_em || formularioEnvio.created_at,
      status: formularioEnvio.status || 'enviado',
      tentativas: formularioEnvio.tentativas || 1,
      ultimaTentativa: formularioEnvio.ultima_tentativa || formularioEnvio.updated_at,
      createdAt: formularioEnvio.created_at
    } : undefined;
    
    const journey: LeadJourney = {
      id: journeyId,
      tenantId: cliente?.tenant_id || submission?.tenant_id || tenantId,
      telefone,
      telefoneNormalizado: telefoneNorm,
      nome,
      email,
      cpf,
      pipelineStatus,
      pipelineStageLabel: STAGE_LABELS[pipelineStatus] || pipelineStatus,
      contact: contactData,
      form: formData,
      cpfData,
      meeting: meetingData,
      dashboard: dashboardData,
      formularioEnvio: formularioEnvioData,
      assinatura: assinaturaData,
      chatHistory: chatHistoryData,
      timeline,
      createdAt,
      updatedAt: updatedAt > 0 ? new Date(updatedAt).toISOString() : createdAt,
      // Dashboard fields at top level for frontend access
      totalMensagensChat: dashboardData?.totalMensagensChat,
      mensagensCliente: dashboardData?.mensagensCliente,
      mensagensAgente: dashboardData?.mensagensAgente,
      totalTranscricoes: dashboardData?.totalTranscricoes,
      primeiroContato: dashboardData?.primeiroContato,
      ultimoContato: dashboardData?.ultimoContato,
      primeiraMensagem: dashboardData?.primeiraMensagem,
      ultimaMensagem: dashboardData?.ultimaMensagem,
      temDadosCliente: dashboardData?.temDadosCliente,
      temHistoricoChat: dashboardData?.temHistoricoChat,
      temTranscricoes: dashboardData?.temTranscricoes,
      statusAtendimento: dashboardData?.statusAtendimento,
      setorAtual: dashboardData?.setorAtual,
      ativo: dashboardData?.ativo,
      tipoReuniaoAtual: dashboardData?.tipoReuniaoAtual,
      ultimaAtividade: dashboardData?.ultimaAtividade,
      totalRegistros: dashboardData?.totalRegistros,
      registrosDadosCliente: dashboardData?.registrosDadosCliente,
      fontesDados: dashboardData?.fontesDados,
      ultimoResumoEstruturado: dashboardData?.ultimoResumoEstruturado,
      todasMensagensChat: dashboardData?.todasMensagensChat
    };
    
    journeys.push(journey);
  }
  
  // Add orphan CPF checks that weren't matched by phone/CPF/name
  // This ensures all CPF checks appear in the Kanban even without a corresponding lead
  const matchedCheckIds = new Set<string>();
  for (const journey of journeys) {
    if (journey.cpfData?.checkId) {
      matchedCheckIds.add(journey.cpfData.checkId);
    }
  }
  
  // Find all checks that weren't matched
  let orphanCount = 0;
  for (const [key, cpfResult] of cpfMap.entries()) {
    // Only process cpf: entries to avoid duplicates (tel: and name: entries point to same check)
    if (!key.startsWith('cpf:') && !key.startsWith('name:')) continue;
    
    const checkId = cpfResult.check_id || cpfResult.checkId || cpfResult.id;
    if (matchedCheckIds.has(checkId)) continue;
    
    // Mark as matched to avoid processing the same check twice (from cpf: and name: entries)
    matchedCheckIds.add(checkId);
    
    const cpfData: CpfData = {
      id: cpfResult.id,
      cpf: cpfResult.cpf,
      nome: cpfResult.nome,
      telefone: cpfResult.telefone,
      status: cpfResult.status,
      dados: cpfResult.dados,
      risco: cpfResult.risco,
      processos: cpfResult.processos,
      aprovado: cpfResult.aprovado,
      dataConsulta: cpfResult.data_consulta,
      checkId,
      // Full BigDataCorp API response data
      queryId: cpfResult.queryId,
      tempoResposta: cpfResult.tempoResposta,
      matchKeys: cpfResult.matchKeys,
      statusCode: cpfResult.statusCode,
      statusMessage: cpfResult.statusMessage,
      comoAutor: cpfResult.comoAutor,
      comoReu: cpfResult.comoReu,
      primeiroProcesso: cpfResult.primeiroProcesso,
      ultimoProcesso: cpfResult.ultimoProcesso,
      ultimos30Dias: cpfResult.ultimos30Dias,
      ultimos90Dias: cpfResult.ultimos90Dias,
      ultimos180Dias: cpfResult.ultimos180Dias,
      ultimos365Dias: cpfResult.ultimos365Dias,
      payload: cpfResult.payload
    };
    
    // FIX: Use robust status checking consistent with determinePipelineStatus
    const statusLower = (cpfData.status || '').toLowerCase().trim();
    const isApproved = statusLower === 'approved' || 
                       statusLower === 'aprovado' || 
                       cpfData.aprovado === true;
    const pipelineStatus = isApproved ? 'cpf-aprovado' : 'cpf-reprovado';
    const telefone = cpfResult.telefone || '';
    const telefoneNorm = normalizeTelefone(telefone);
    
    // FIX: Try to find matching form submission for orphan CPF checks
    let orphanSubmission = null;
    let orphanFormData: FormData | undefined = undefined;
    
    // Try matching by CPF first
    const orphanCpfNorm = normalizeCPF(cpfResult.cpf);
    if (orphanCpfNorm && orphanCpfNorm.length === 11) {
      orphanSubmission = submissionsMap.get(`cpf:${orphanCpfNorm}`);
      if (orphanSubmission) {
        console.log(`🔗 [LeadJourneyAggregator] CPF órfão encontrou form por CPF: ${orphanCpfNorm.substring(0, 3)}...`);
      }
    }
    
    // Try matching by name if no CPF match
    if (!orphanSubmission && cpfResult.nome) {
      const orphanNameNorm = cpfResult.nome.trim().toLowerCase();
      if (orphanNameNorm.length > 2) {
        orphanSubmission = submissionsMap.get(`name:${orphanNameNorm}`);
        if (orphanSubmission) {
          console.log(`🔗 [LeadJourneyAggregator] CPF órfão encontrou form por nome: ${orphanNameNorm}`);
        }
      }
    }
    
    // Try matching by phone if available
    if (!orphanSubmission && telefoneNorm) {
      orphanSubmission = submissionsMap.get(`tel:${telefoneNorm}`);
      if (orphanSubmission) {
        console.log(`🔗 [LeadJourneyAggregator] CPF órfão encontrou form por telefone: ${telefoneNorm.substring(0, 8)}...`);
      }
    }
    
    // Build form data if submission was found
    if (orphanSubmission) {
      let parsedAnswers = orphanSubmission.answers;
      if (typeof parsedAnswers === 'string') {
        try {
          parsedAnswers = JSON.parse(parsedAnswers);
        } catch (e) {
          console.warn('[LeadJourneyAggregator] Failed to parse orphan submission answers');
        }
      }
      
      orphanFormData = {
        id: orphanSubmission.id,
        formId: orphanSubmission.form_id,
        formStatus: orphanSubmission.form_status || 'completed',
        passed: orphanSubmission.passed,
        totalScore: orphanSubmission.total_score,
        answers: parsedAnswers,
        contactName: orphanSubmission.contact_name,
        contactEmail: orphanSubmission.contact_email,
        contactPhone: orphanSubmission.contact_phone,
        contactCpf: orphanSubmission.contact_cpf,
        createdAt: orphanSubmission.created_at,
        updatedAt: orphanSubmission.updated_at
      };
    }
    
    const orphanJourney: LeadJourney = {
      id: `cpf-${checkId}`,
      tenantId: tenantId,
      telefone: telefone || orphanSubmission?.contact_phone || '',
      telefoneNormalizado: telefoneNorm || '',
      nome: cpfResult.nome || orphanSubmission?.contact_name || 'Sem nome',
      email: orphanSubmission?.contact_email || undefined,
      cpf: cpfResult.cpf,
      pipelineStatus,
      pipelineStageLabel: STAGE_LABELS[pipelineStatus] || pipelineStatus,
      contact: undefined,
      form: orphanFormData,
      cpfData,
      meeting: undefined,
      dashboard: undefined,
      timeline: [
        // Add form event if form submission was found
        ...(orphanFormData ? (() => {
          // FIX: Robust passed checking - consistent with determinePipelineStatus
          const passedValue = orphanFormData.passed;
          const isFormRejected = passedValue === false || 
                                 passedValue === 'false' ||
                                 passedValue === 'rejected' ||
                                 passedValue === 'reprovado' ||
                                 passedValue === 0;
          const isFormApproved = passedValue === true || 
                                 passedValue === 'true' ||
                                 passedValue === 'approved' ||
                                 passedValue === 'aprovado' ||
                                 passedValue === 1;
          
          let stage = 'contato-inicial';
          let title = 'Formulário Preenchido';
          
          if (isFormApproved) {
            stage = 'formulario-aprovado';
            title = 'Formulário Aprovado';
          } else if (isFormRejected) {
            stage = 'formulario-reprovado';
            title = 'Formulário Reprovado';
          }
          
          return [{
            id: `form-${orphanFormData.id}`,
            type: 'form' as const,
            stage,
            title,
            description: `Pontuação: ${orphanFormData.totalScore || 0}`,
            status: orphanFormData.formStatus,
            timestamp: orphanFormData.createdAt || '',
            metadata: {
              formId: orphanFormData.formId,
              answers: orphanFormData.answers
            }
          }];
        })() : []),
        // CPF check event
        {
          id: `cpf-${checkId}`,
          type: 'cpf' as const,
          stage: pipelineStatus,
          title: isApproved ? 'CPF Aprovado' : 'CPF Reprovado',
          description: `Risco: ${cpfData.risco || 0}% | Processos: ${cpfData.processos || 0}`,
          status: cpfData.status,
          timestamp: cpfData.dataConsulta,
          metadata: {
            risco: cpfData.risco,
            processos: cpfData.processos
          }
        }
      ],
      createdAt: cpfResult.data_consulta || new Date().toISOString(),
      updatedAt: cpfResult.data_consulta || new Date().toISOString()
    };
    
    journeys.push(orphanJourney);
    orphanCount++;
  }
  
  if (orphanCount > 0) {
    console.log(`📋 [LeadJourneyAggregator] Adicionados ${orphanCount} checks CPF órfãos (sem lead correspondente)`);
  }
  
  // Add orphan formulario_envios that weren't matched to any journey
  // This ensures all forms sent but not filled appear in the Kanban even without a corresponding lead in other tables
  const matchedEnvioPhones = new Set<string>();
  for (const journey of journeys) {
    if (journey.telefoneNormalizado) {
      matchedEnvioPhones.add(journey.telefoneNormalizado);
    }
  }
  
  let orphanEnvioCount = 0;
  for (const [telefoneNorm, envio] of formularioEnviosMap.entries()) {
    if (matchedEnvioPhones.has(telefoneNorm)) continue;
    
    // This is an orphan formulario_envio - create a new journey for it
    const formularioEnvioData: FormularioEnvioData = {
      id: envio.id,
      formId: envio.form_id || envio.formId,
      telefone: envio.telefone,
      telefoneNormalizado: telefoneNorm,
      nome: envio.nome || envio.contact_name,
      formUrl: envio.form_url || envio.formUrl || envio.url_formulario,
      enviadoEm: envio.enviado_em || envio.data_envio || envio.created_at,
      status: envio.status || (envio.preenchido ? 'preenchido' : 'enviado'),
      tentativas: envio.tentativas || envio.follow_up_count || 0,
      ultimaTentativa: envio.ultima_tentativa || envio.ultimo_follow_up || envio.updated_at,
      createdAt: envio.created_at
    };
    
    const envioNome = envio.nome || envio.contact_name || 'Sem nome';
    const envioTelefone = envio.telefone || telefoneNorm;
    
    const orphanEnvioJourney: LeadJourney = {
      id: `envio-${envio.id}`,
      tenantId: envio.tenant_id || tenantId,
      telefone: envioTelefone,
      telefoneNormalizado: telefoneNorm,
      nome: envioNome,
      email: envio.email,
      cpf: undefined,
      pipelineStatus: 'formulario-nao-preenchido',
      pipelineStageLabel: STAGE_LABELS['formulario-nao-preenchido'] || 'Formulário Não Preenchido',
      contact: undefined,
      form: undefined,
      cpfData: undefined,
      meeting: undefined,
      dashboard: undefined,
      formularioEnvio: formularioEnvioData,
      timeline: [
        {
          id: `envio-${envio.id}`,
          type: 'form' as const,
          stage: 'formulario-nao-preenchido',
          title: 'Formulário Enviado',
          description: `Aguardando preenchimento${formularioEnvioData.tentativas > 0 ? ` (${formularioEnvioData.tentativas} tentativas)` : ''}`,
          status: 'enviado',
          timestamp: formularioEnvioData.enviadoEm || formularioEnvioData.createdAt || new Date().toISOString(),
          metadata: {
            formId: formularioEnvioData.formId,
            formUrl: formularioEnvioData.formUrl,
            tentativas: formularioEnvioData.tentativas
          }
        }
      ],
      createdAt: envio.created_at || new Date().toISOString(),
      updatedAt: envio.updated_at || envio.created_at || new Date().toISOString()
    };
    
    journeys.push(orphanEnvioJourney);
    orphanEnvioCount++;
    matchedEnvioPhones.add(telefoneNorm); // Prevent duplicates
  }
  
  if (orphanEnvioCount > 0) {
    console.log(`📋 [LeadJourneyAggregator] Adicionados ${orphanEnvioCount} formulario_envios órfãos (sem lead correspondente)`);
  }
  
  // === FIX: Add orphan form_submissions (filled forms) that weren't matched to any journey ===
  // This ensures rejected forms (passed=false) appear in the Kanban even without dados_cliente/CPF entries
  const matchedSubmissionIds = new Set<string>();
  for (const journey of journeys) {
    if (journey.form?.id) {
      matchedSubmissionIds.add(journey.form.id);
    }
  }
  
  let orphanSubmissionCount = 0;
  // Iterate through all form submissions and find ones that weren't matched
  for (const [key, submission] of submissionsMap.entries()) {
    // Only process once per submission (skip duplicate keys like tel:/cpf:/name:)
    if (!key.startsWith('tel:')) continue;
    if (matchedSubmissionIds.has(submission.id)) continue;
    
    // Check if this submission was already matched by other keys
    const submissionTelNorm = normalizeTelefone(submission.contact_phone);
    if (submissionTelNorm && matchedEnvioPhones.has(submissionTelNorm)) continue;
    
    // This is an orphan form_submission - create a lead for it
    const passedValue = submission.passed;
    const isFormRejected = passedValue === false || 
                           passedValue === 'false' ||
                           passedValue === 'rejected' ||
                           passedValue === 'reprovado' ||
                           passedValue === 0;
    const isFormApproved = passedValue === true || 
                           passedValue === 'true' ||
                           passedValue === 'approved' ||
                           passedValue === 'aprovado' ||
                           passedValue === 1;
    
    let pipelineStatus: string = 'contato-inicial';
    let stageLabel = 'Contato Inicial';
    
    if (isFormApproved) {
      pipelineStatus = 'formulario-aprovado';
      stageLabel = 'Formulário Aprovado';
    } else if (isFormRejected) {
      pipelineStatus = 'formulario-reprovado';
      stageLabel = 'Formulário Reprovado';
    }
    
    console.log(`📋 [LeadJourneyAggregator] Orphan submission found: ${submission.contact_name || 'Sem nome'}, passed=${passedValue} (${typeof passedValue}) → ${pipelineStatus}`);
    
    let parsedAnswers = submission.answers;
    if (typeof parsedAnswers === 'string') {
      try {
        parsedAnswers = JSON.parse(parsedAnswers);
      } catch (e) {
        // Keep as string
      }
    }
    
    const formData: FormData = {
      id: submission.id,
      formId: submission.form_id,
      formStatus: submission.form_status || 'completed',
      passed: submission.passed,
      totalScore: submission.total_score,
      answers: parsedAnswers,
      contactName: submission.contact_name,
      contactEmail: submission.contact_email,
      contactPhone: submission.contact_phone,
      contactCpf: submission.contact_cpf,
      createdAt: submission.created_at,
      updatedAt: submission.updated_at
    };
    
    const telefoneNorm = normalizeTelefone(submission.contact_phone);
    const orphanSubmissionJourney: LeadJourney = {
      id: `submission-${submission.id}`,
      tenantId: submission.tenant_id || tenantId,
      telefone: submission.contact_phone || '',
      telefoneNormalizado: telefoneNorm || '',
      nome: submission.contact_name || 'Sem nome',
      email: submission.contact_email || undefined,
      cpf: submission.contact_cpf || undefined,
      pipelineStatus,
      pipelineStageLabel: STAGE_LABELS[pipelineStatus] || stageLabel,
      contact: undefined,
      form: formData,
      cpfData: undefined,
      meeting: undefined,
      dashboard: undefined,
      timeline: [
        {
          id: `form-${submission.id}`,
          type: 'form' as const,
          stage: pipelineStatus,
          title: isFormApproved ? 'Formulário Aprovado' : (isFormRejected ? 'Formulário Reprovado' : 'Formulário Preenchido'),
          description: `Pontuação: ${submission.total_score || 0}`,
          status: submission.form_status || 'completed',
          timestamp: submission.created_at || new Date().toISOString(),
          metadata: {
            formId: submission.form_id,
            passed: submission.passed,
            totalScore: submission.total_score
          }
        }
      ],
      createdAt: submission.created_at || new Date().toISOString(),
      updatedAt: submission.updated_at || submission.created_at || new Date().toISOString()
    };
    
    journeys.push(orphanSubmissionJourney);
    orphanSubmissionCount++;
    matchedSubmissionIds.add(submission.id);
    if (telefoneNorm) {
      matchedEnvioPhones.add(telefoneNorm);
    }
  }
  
  if (orphanSubmissionCount > 0) {
    console.log(`📋 [LeadJourneyAggregator] Adicionados ${orphanSubmissionCount} form_submissions órfãos (sem lead correspondente)`);
  }
  
  journeys.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  
  console.log(`✅ [LeadJourneyAggregator] Agregadas ${journeys.length} jornadas para tenant: ${tenantId}`);
  
  return journeys;
}

/**
 * Gets a single lead journey by phone number
 */
export async function getLeadJourneyByPhone(tenantId: string, telefone: string): Promise<LeadJourney | null> {
  const telefoneNorm = normalizeTelefone(telefone);
  if (!telefoneNorm) return null;
  
  const journeys = await aggregateLeadJourneys(tenantId);
  return journeys.find(j => j.telefoneNormalizado === telefoneNorm) || null;
}

/**
 * Gets lead journeys filtered by pipeline stage
 */
export async function getLeadJourneysByStage(tenantId: string, stage: string): Promise<LeadJourney[]> {
  const journeys = await aggregateLeadJourneys(tenantId);
  return journeys.filter(j => j.pipelineStatus === stage);
}

/**
 * Gets pipeline stage counts for a tenant
 */
export async function getPipelineStageCounts(tenantId: string): Promise<Record<string, number>> {
  const journeys = await aggregateLeadJourneys(tenantId);
  
  const counts: Record<string, number> = {};
  for (const stage of PIPELINE_STAGES) {
    counts[stage] = 0;
  }
  
  for (const journey of journeys) {
    if (counts[journey.pipelineStatus] !== undefined) {
      counts[journey.pipelineStatus]++;
    }
  }
  
  return counts;
}
