import { useState } from 'react';
import { 
  Phone, Mail, Clock, User, FileText, Shield, Calendar, 
  MessageCircle, Video, Database, Activity,
  CheckCircle2, XCircle, Bot, UserIcon, AlertTriangle, Gavel, 
  ClipboardList, BarChart3, Users
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export interface FormularioEnvio {
  id?: string;
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

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  pipelineStatus: string;
  createdAt?: string;
  updatedAt?: string;
  formStatus?: string;
  formularioEnviadoEm?: string;
  formularioAbertoEm?: string;
  formularioConcluidoEm?: string;
  formularioUrl?: string;
  hasFormularioEnvio?: boolean;
  formularioEnvio?: FormularioEnvio;
  cpfStatus?: string;
  cpfCheckedAt?: string;
  cpfRisco?: number;
  cpfProcessos?: number;
  cpfData?: {
    cpf?: string;
    risco?: number;
    processos?: number;
    decisoes?: any[];
    checkedAt?: string;
    dataConsulta?: string;
    status?: string;
    dados?: any;
    checkId?: string;
    aprovado?: boolean;
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
    payload?: {
      nomeCompleto?: string;
      dataNascimento?: string;
      situacaoCadastral?: string;
      processos?: Array<{
        numero?: string;
        tribunal?: string;
        tipo?: string;
        status?: string;
        dataDistribuicao?: string;
        valor?: number;
        polo?: string;
        assunto?: string;
      }>;
      Result?: Array<{
        BasicData?: {
          Name?: string;
          CPF?: string;
          BirthDate?: string;
          TaxIdStatus?: string;
          TaxIdStatusDate?: string;
        };
        Lawsuits?: {
          TotalLawsuits?: number;
          AsAuthor?: number;
          AsDefendant?: number;
          FirstLawsuitDate?: string;
          LastLawsuitDate?: string;
          Last30Days?: number;
          Last90Days?: number;
          Last180Days?: number;
          Last365Days?: number;
        };
      }>;
      [key: string]: any;
    };
  };
  meetingStatus?: string;
  meetingScheduledAt?: string;
  reuniaoData?: string;
  reuniaoHora?: string;
  reuniaoTipo?: string;
  reuniaoLink?: string;
  reuniaoTitulo?: string;
  consultorNome?: string;
  meeting?: {
    tipo?: string;
    link?: string;
    titulo?: string;
    status?: string;
    data?: string;
    hora?: string;
    local?: string;
    consultorNome?: string;
    consultorEmail?: string;
    resultadoReuniao?: string;
    motivoRecusa?: string;
  };
  qualificationStatus?: string;
  pontuacao?: number;
  hasContact?: boolean;
  hasForm?: boolean;
  hasCpf?: boolean;
  hasMeeting?: boolean;
  timeline?: Array<{
    id: string;
    type: string;
    stage: string;
    title: string;
    description?: string;
    status?: string;
    timestamp: string;
  }>;
  statusAtendimento?: string;
  setorAtual?: string;
  ativo?: boolean;
  tipoReuniaoAtual?: string;
  primeiroContato?: string;
  ultimoContato?: string;
  ultimaAtividade?: string;
  totalRegistros?: number;
  registrosDadosCliente?: number;
  totalMensagensChat?: number;
  totalTranscricoes?: number;
  fontesDados?: string;
  temDadosCliente?: boolean;
  temHistoricoChat?: boolean;
  temTranscricoes?: boolean;
  mensagensCliente?: number;
  mensagensAgente?: number;
  primeiraMensagem?: string;
  ultimaMensagem?: string;
  ultimoResumoEstruturado?: string;
  todas_mensagens_chat?: string;
  chatHistory?: {
    sessionId: string;
    telefone: string;
    telefoneNormalizado: string;
    messages: Array<{
      id: number;
      type: 'human' | 'ai';
      content: string;
      timestamp?: string;
    }>;
    totalMessages: number;
    extractedName?: string;
    firstMessageAt?: string;
    lastMessageAt?: string;
  };
  cpf?: string;
  resultadoReuniao?: string;
  form?: {
    id?: string;
    name?: string;
    answers?: Record<string, any>;
    submittedAt?: string;
    completedAt?: string;
  };
}

interface LeadCardProps {
  lead: Lead;
  isUpdated?: boolean;
}

function formatDate(dateString?: string): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function formatShortDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return '-';
  }
}

function formatFullDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'N/A';
  }
}

function getStatusBadge(lead: Lead) {
  if (lead.statusAtendimento === 'active' || lead.ativo === true) {
    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Ativo</Badge>;
  }
  if (lead.statusAtendimento === 'pause') {
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Pausado</Badge>;
  }
  if (lead.pipelineStatus === 'formulario-nao-preenchido') {
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Aguardando Form</Badge>;
  }
  if (lead.qualificationStatus === 'approved') {
    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Aprovado</Badge>;
  }
  if (lead.qualificationStatus === 'rejected') {
    return <Badge variant="destructive" className="text-xs">Reprovado</Badge>;
  }
  if (lead.cpfStatus === 'approved') {
    return <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30 text-xs">CPF OK</Badge>;
  }
  if (lead.cpfStatus === 'rejected') {
    return <Badge variant="destructive" className="text-xs">CPF Rejeitado</Badge>;
  }
  if (lead.formStatus === 'completed') {
    return <Badge variant="secondary" className="text-xs">Formulário Completo</Badge>;
  }
  if (lead.formStatus === 'opened') {
    return <Badge variant="outline" className="text-xs border-zinc-600">Formulário Aberto</Badge>;
  }
  return <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">Novo</Badge>;
}

function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function DataIndicator({ active, label, icon: Icon }: { active?: boolean; label: string; icon: React.ElementType }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 ${active ? 'text-green-400' : 'text-zinc-600'}`}>
            <Icon className="w-3 h-3" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-zinc-800 text-zinc-200 border-zinc-700 text-xs">
          <p>{label}: {active ? 'Sim' : 'Não'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ChatMessage {
  id: number;
  text: string;
  isClient: boolean;
  sender: string;
  originalOrder: number;
}

function formatWhatsAppMessages(lead: Lead): ChatMessage[] {
  // Priority 1: Use chatHistory from n8n_chat_histories (direct messages)
  if (lead.chatHistory?.messages && lead.chatHistory.messages.length > 0) {
    return lead.chatHistory.messages.map((msg, index) => ({
      id: msg.id || index,
      text: msg.content,
      isClient: msg.type === 'human',
      sender: msg.type === 'human' ? 'Cliente' : 'Agente',
      originalOrder: index
    }));
  }
  
  // Priority 2: Use todas_mensagens_chat from dashboard
  if (!lead.todas_mensagens_chat) return [];
  
  const messages: ChatMessage[] = [];
  const rawText = lead.todas_mensagens_chat;
  
  // Split by "---" delimiter (standard format from Supabase)
  const rawMessages: string[] = rawText.split(/\s*---\s*/).filter(m => m.trim());
  
  // Track previous full text for each sender to extract only NEW content
  let lastClientFullText = '';
  let lastAgentFullText = '';
  let messageIndex = 0;
  
  rawMessages.forEach((message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    
    // Detect message sender by emoji (including corrupted/encoded versions)
    // 👤 = client, 🤖 = bot/agent (may appear as ?? or other chars due to encoding)
    const hasClientEmoji = trimmed.includes('👤') || trimmed.startsWith('\uD83D\uDC64');
    // Agent emoji may be corrupted - detect by checking if NOT client and has any emoji-like start
    const hasAgentEmoji = trimmed.includes('🤖') || trimmed.includes('👷') || 
                          trimmed.startsWith('\uD83E\uDD16') ||
                          (trimmed.match(/^[^\u0000-\u007F]/) && !hasClientEmoji);
    
    const isClient = hasClientEmoji;
    
    // Clean message: remove emojis, labels, and any non-ASCII prefix characters
    let cleanMessage = trimmed
      .replace(/^[^\u0000-\u007F]+\s*/g, '') // Remove leading non-ASCII (emojis)
      .replace(/[👤🤖👷]/g, '')
      .replace(/^\s*\[?(cliente|agente|bot|atendente)\]?:?\s*/i, '')
      .trim();
    
    if (!cleanMessage) return;
    
    // Extract only the NEW part from cumulative messages
    // Each block contains all previous messages + the new one
    let newPart = cleanMessage;
    
    if (isClient) {
      if (lastClientFullText && cleanMessage.startsWith(lastClientFullText)) {
        newPart = cleanMessage.substring(lastClientFullText.length).trim();
      }
      lastClientFullText = cleanMessage;
    } else {
      if (lastAgentFullText && cleanMessage.startsWith(lastAgentFullText)) {
        newPart = cleanMessage.substring(lastAgentFullText.length).trim();
      }
      lastAgentFullText = cleanMessage;
    }
    
    // Only add if there's actual new content
    if (newPart && newPart.length > 0) {
      messages.push({
        id: messageIndex++,
        text: newPart,
        isClient: isClient,
        sender: isClient ? 'Cliente' : 'Agente',
        originalOrder: messageIndex
      });
    }
  });
  
  return messages;
}

function getCpfStatusBadge(status?: string) {
  if (status === 'approved' || status === 'aprovado') {
    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Aprovado</Badge>;
  }
  if (status === 'rejected' || status === 'reprovado') {
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Reprovado</Badge>;
  }
  if (status === 'pending' || status === 'pendente') {
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pendente</Badge>;
  }
  return <Badge variant="outline" className="border-zinc-600 text-zinc-400">Não verificado</Badge>;
}

function getMeetingStatusBadge(status?: string) {
  if (status === 'completed' || status === 'realizada') {
    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Realizada</Badge>;
  }
  if (status === 'scheduled' || status === 'agendada') {
    return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Agendada</Badge>;
  }
  if (status === 'no_show' || status === 'nao_compareceu') {
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Não compareceu</Badge>;
  }
  if (status === 'pending' || status === 'pendente') {
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pendente</Badge>;
  }
  return <Badge variant="outline" className="border-zinc-600 text-zinc-400">Não agendada</Badge>;
}

function LeadDetailDialog({ lead }: { lead: Lead }) {
  const [showAllMessages, setShowAllMessages] = useState(false);
  const chatMessages = formatWhatsAppMessages(lead);
  const displayMessages = showAllMessages ? chatMessages : chatMessages.slice(0, 10);

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] bg-zinc-900 border-zinc-700">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-white">
          <Avatar className="h-12 w-12 ring-2 ring-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
              {lead.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CL'}
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="text-xl font-semibold">{lead.name}</span>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(lead)}
              {lead.setorAtual && (
                <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                  {lead.setorAtual}
                </Badge>
              )}
            </div>
          </div>
        </DialogTitle>
      </DialogHeader>

      <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
        <div className="space-y-6">
          
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 uppercase tracking-wide">
              <User className="w-4 h-4" /> Informações Pessoais
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">Nome</div>
                <div className="text-sm text-zinc-200 font-medium">{lead.name || 'N/A'}</div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">CPF</div>
                <div className="text-sm text-zinc-200 font-medium">{lead.cpf || lead.cpfData?.cpf || 'N/A'}</div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </div>
                <div className="text-sm text-zinc-200">{lead.email || 'N/A'}</div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Telefone
                </div>
                <div className="text-sm text-zinc-200">{lead.phone || 'N/A'}</div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700 col-span-2">
                <div className="text-xs text-zinc-500 mb-1">Status</div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(lead)}
                  {lead.pontuacao !== undefined && lead.pontuacao !== null && (
                    <span className="text-xs text-zinc-400">Pontuação: {lead.pontuacao}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-zinc-700" />

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 uppercase tracking-wide">
              <Clock className="w-4 h-4" /> Histórico de Contato
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">Primeiro Contato</div>
                <div className="text-sm text-zinc-200">{formatFullDate(lead.primeiroContato)}</div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">Último Contato</div>
                <div className="text-sm text-zinc-200">{formatFullDate(lead.ultimoContato)}</div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">Última Atividade</div>
                <div className="text-sm text-zinc-200">{formatFullDate(lead.ultimaAtividade)}</div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">Setor Atual</div>
                <div className="text-sm text-zinc-200">{lead.setorAtual || 'N/A'}</div>
              </div>
            </div>
          </div>

          <Separator className="bg-zinc-700" />

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 uppercase tracking-wide">
              <Calendar className="w-4 h-4" /> Informações de Reunião
            </h4>
            {/* Meeting Title - displayed prominently if available */}
            {(lead.reuniaoTitulo || lead.meeting?.titulo) && (
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">Título da Reunião</div>
                <div className="text-sm text-zinc-200 font-medium">{lead.reuniaoTitulo || lead.meeting?.titulo}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">Tipo de Reunião</div>
                <div className="text-sm text-zinc-200">{lead.reuniaoTipo || lead.meeting?.tipo || lead.tipoReuniaoAtual || 'Não definida'}</div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">Status</div>
                {getMeetingStatusBadge(lead.meetingStatus)}
              </div>
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">Data</div>
                <div className="text-sm text-zinc-200">{lead.reuniaoData || lead.meeting?.data ? formatFullDate(lead.reuniaoData || lead.meeting?.data) : 'N/A'}</div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">Hora</div>
                <div className="text-sm text-zinc-200">{lead.reuniaoHora || lead.meeting?.hora || 'N/A'}</div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">Consultor</div>
                <div className="text-sm text-zinc-200">{lead.consultorNome || lead.meeting?.consultorNome || 'N/A'}</div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">Resultado</div>
                <div className="text-sm text-zinc-200">{lead.resultadoReuniao || lead.meeting?.resultadoReuniao || lead.qualificationStatus || 'N/A'}</div>
              </div>
            </div>
            {/* Meeting Link - displayed if available */}
            {(lead.reuniaoLink || lead.meeting?.link) && (
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">Link da Reunião</div>
                <a 
                  href={lead.reuniaoLink || lead.meeting?.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:text-blue-300 underline break-all"
                >
                  {lead.reuniaoLink || lead.meeting?.link}
                </a>
              </div>
            )}
          </div>

          <Separator className="bg-zinc-700" />

          {/* Formulário Não Preenchido - Seção especial no Dialog */}
          {lead.pipelineStatus === 'formulario-nao-preenchido' && lead.formularioEnvio && (
            <>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-yellow-400 flex items-center gap-2 uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4" /> Formulário Aguardando Preenchimento
                </h4>
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                      <div className="text-xs text-zinc-500 mb-1">Status</div>
                      <div className="text-sm text-yellow-400 font-medium">Aguardando Preenchimento</div>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                      <div className="text-xs text-zinc-500 mb-1">Enviado Em</div>
                      <div className="text-sm text-zinc-200">{formatFullDate(lead.formularioEnvio.enviadoEm || lead.formularioEnvio.createdAt)}</div>
                    </div>
                    {lead.formularioEnvio.tentativas && lead.formularioEnvio.tentativas > 1 && (
                      <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                        <div className="text-xs text-zinc-500 mb-1">Tentativas de Envio</div>
                        <div className="text-sm text-zinc-200">{lead.formularioEnvio.tentativas}</div>
                      </div>
                    )}
                    {lead.formularioEnvio.ultimaTentativa && (
                      <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                        <div className="text-xs text-zinc-500 mb-1">Última Tentativa</div>
                        <div className="text-sm text-zinc-200">{formatFullDate(lead.formularioEnvio.ultimaTentativa)}</div>
                      </div>
                    )}
                    {lead.formularioUrl && (
                      <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700 col-span-2">
                        <div className="text-xs text-zinc-500 mb-1">Link do Formulário</div>
                        <a 
                          href={lead.formularioUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-400 hover:text-blue-300 underline break-all"
                        >
                          {lead.formularioUrl}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-yellow-400/70 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>O formulário foi enviado mas ainda não foi preenchido pelo contato</span>
                  </div>
                </div>
              </div>
              <Separator className="bg-zinc-700" />
            </>
          )}

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 uppercase tracking-wide">
              <FileText className="w-4 h-4" /> Respostas do Formulário
            </h4>
            {(() => {
              let answers = lead.form?.answers;
              
              // Handle answers stored as JSON string
              if (typeof answers === 'string') {
                try {
                  answers = JSON.parse(answers);
                } catch (e) {
                  // Keep as string if parsing fails
                }
              }
              
              // Handle array format (from some forms)
              if (Array.isArray(answers) && answers.length > 0) {
                return (
                  <ScrollArea className="max-h-[300px]">
                    <div className="grid grid-cols-2 gap-3">
                      {answers.map((item: any, index: number) => (
                        <div key={item.question_id || index} className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                          <div className="text-xs text-zinc-500 mb-1">
                            {item.question_label || item.question_text || item.question || `Pergunta ${index + 1}`}
                          </div>
                          <div className="text-sm text-zinc-200">
                            {item.answer || item.value || 'N/A'}
                          </div>
                          {item.points !== undefined && (
                            <div className="text-xs text-green-400 mt-1">Pontos: {item.points}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                );
              }
              
              // Handle object format
              if (answers && typeof answers === 'object' && Object.keys(answers).length > 0) {
                return (
                  <ScrollArea className="max-h-[300px]">
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(answers).map(([key, value]) => (
                        <div key={key} className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                          <div className="text-xs text-zinc-500 mb-1">{key}</div>
                          <div className="text-sm text-zinc-200">
                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value || 'N/A')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                );
              }
              
              return (
                <div className="p-4 rounded-lg bg-zinc-800 border border-zinc-700 text-center">
                  <div className="text-sm text-zinc-400">Formulário não preenchido</div>
                </div>
              );
            })()}
            {lead.form?.submittedAt && (
              <div className="text-xs text-zinc-500 mt-2">
                Enviado em: {formatFullDate(lead.form.submittedAt)}
              </div>
            )}
          </div>

          <Separator className="bg-zinc-700" />

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 uppercase tracking-wide">
              <BarChart3 className="w-4 h-4" /> Estatísticas de Atividade
            </h4>
            <div className="grid grid-cols-5 gap-2">
              <div className="text-center p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-2xl font-bold text-white">{lead.totalRegistros || 0}</div>
                <div className="text-xs text-zinc-400">Total Registros</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-2xl font-bold text-white">{lead.registrosDadosCliente || 0}</div>
                <div className="text-xs text-zinc-400">Dados Cliente</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-2xl font-bold text-blue-400">{lead.totalMensagensChat || 0}</div>
                <div className="text-xs text-zinc-400">Mensagens Chat</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-2xl font-bold text-purple-400">{lead.totalTranscricoes || 0}</div>
                <div className="text-xs text-zinc-400">Transcrições</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-lg font-bold text-zinc-300 truncate">{lead.fontesDados || '-'}</div>
                <div className="text-xs text-zinc-400">Fontes</div>
              </div>
            </div>
          </div>

          <Separator className="bg-zinc-700" />

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 uppercase tracking-wide">
              <Database className="w-4 h-4" /> Disponibilidade de Dados
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                lead.temDadosCliente 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-zinc-800 border-zinc-700'
              }`}>
                {lead.temDadosCliente ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-zinc-500" />
                )}
                <div>
                  <div className={`text-sm font-medium ${lead.temDadosCliente ? 'text-green-400' : 'text-zinc-500'}`}>
                    Dados do Cliente
                  </div>
                  <div className="text-xs text-zinc-500">{lead.temDadosCliente ? 'Disponível' : 'Não disponível'}</div>
                </div>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                lead.temHistoricoChat 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-zinc-800 border-zinc-700'
              }`}>
                {lead.temHistoricoChat ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-zinc-500" />
                )}
                <div>
                  <div className={`text-sm font-medium ${lead.temHistoricoChat ? 'text-green-400' : 'text-zinc-500'}`}>
                    Histórico Chat
                  </div>
                  <div className="text-xs text-zinc-500">{lead.temHistoricoChat ? 'Disponível' : 'Não disponível'}</div>
                </div>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                lead.temTranscricoes 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-zinc-800 border-zinc-700'
              }`}>
                {lead.temTranscricoes ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-zinc-500" />
                )}
                <div>
                  <div className={`text-sm font-medium ${lead.temTranscricoes ? 'text-green-400' : 'text-zinc-500'}`}>
                    Transcrições
                  </div>
                  <div className="text-xs text-zinc-500">{lead.temTranscricoes ? 'Disponível' : 'Não disponível'}</div>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-zinc-700" />
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 uppercase tracking-wide">
              <Shield className="w-4 h-4" /> Histórico Completo CPF / Compliance
            </h4>
            
            {/* API Response Metadata Section */}
            {lead.cpfData && (
              <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <div>
                  <div className="text-xs text-blue-400 mb-1">Query ID</div>
                  <div className="text-sm text-zinc-200 font-mono truncate">{lead.cpfData.queryId || lead.cpfData.checkId || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-blue-400 mb-1">Tempo de Resposta</div>
                  <div className="text-sm text-zinc-200">{lead.cpfData.tempoResposta ? `${lead.cpfData.tempoResposta}ms` : 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-blue-400 mb-1">Match Keys</div>
                  <div className="text-sm text-zinc-200 font-mono truncate">{lead.cpfData.matchKeys || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-blue-400 mb-1">Status Consulta</div>
                  <div className="text-sm text-zinc-200">
                    {lead.cpfData.statusCode === 0 || lead.cpfData.statusCode === 200 
                      ? <span className="text-green-400">OK ({lead.cpfData.statusCode})</span>
                      : <span className="text-yellow-400">{lead.cpfData.statusMessage || 'N/A'}</span>
                    }
                  </div>
                </div>
                <div>
                  <div className="text-xs text-blue-400 mb-1">Data da Consulta</div>
                  <div className="text-sm text-zinc-200">{formatFullDate(lead.cpfData.dataConsulta)}</div>
                </div>
                <div>
                  <div className="text-xs text-blue-400 mb-1">Status CPF</div>
                  {getCpfStatusBadge(lead.cpfStatus || lead.cpfData?.status)}
                </div>
              </div>
            )}
            
            {/* Main CPF Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">CPF</div>
                <div className="text-sm text-zinc-200 font-mono">{lead.cpf || lead.cpfData?.cpf || 'N/A'}</div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Nível de Risco
                </div>
                <div className={`text-lg font-bold ${
                  (lead.cpfRisco || lead.cpfData?.risco || 0) > 7 
                    ? 'text-red-400' 
                    : (lead.cpfRisco || lead.cpfData?.risco || 0) > 4 
                      ? 'text-yellow-400' 
                      : 'text-green-400'
                }`}>
                  {lead.cpfRisco ?? lead.cpfData?.risco ?? 'N/A'}%
                </div>
              </div>
            </div>

            {/* Lawsuits Statistics */}
            {lead.cpfData && (
              <div className="space-y-3">
                <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-2">
                  <Gavel className="w-3 h-3" /> Estatísticas de Processos
                </h5>
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-center">
                    <div className={`text-2xl font-bold ${
                      (lead.cpfData?.processos || 0) > 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {lead.cpfData?.processos ?? 0}
                    </div>
                    <div className="text-xs text-zinc-400">Total Processos</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {lead.cpfData?.comoAutor ?? 0}
                    </div>
                    <div className="text-xs text-zinc-400">Como Autor</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-center">
                    <div className="text-2xl font-bold text-orange-400">
                      {lead.cpfData?.comoReu ?? 0}
                    </div>
                    <div className="text-xs text-zinc-400">Como Réu</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-center">
                    <div className={`text-lg font-bold ${lead.cpfData?.aprovado ? 'text-green-400' : 'text-red-400'}`}>
                      {lead.cpfData?.aprovado ? 'Aprovado' : 'Reprovado'}
                    </div>
                    <div className="text-xs text-zinc-400">Decisão</div>
                  </div>
                </div>
                
                {/* Time-based Lawsuits */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700 text-center">
                    <div className="text-lg font-bold text-zinc-300">{lead.cpfData?.ultimos30Dias ?? 0}</div>
                    <div className="text-xs text-zinc-500">30 dias</div>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700 text-center">
                    <div className="text-lg font-bold text-zinc-300">{lead.cpfData?.ultimos90Dias ?? 0}</div>
                    <div className="text-xs text-zinc-500">90 dias</div>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700 text-center">
                    <div className="text-lg font-bold text-zinc-300">{lead.cpfData?.ultimos180Dias ?? 0}</div>
                    <div className="text-xs text-zinc-500">180 dias</div>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700 text-center">
                    <div className="text-lg font-bold text-zinc-300">{lead.cpfData?.ultimos365Dias ?? 0}</div>
                    <div className="text-xs text-zinc-500">365 dias</div>
                  </div>
                </div>
                
                {/* First/Last Lawsuit Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                    <div className="text-xs text-zinc-500 mb-1">Primeiro Processo</div>
                    <div className="text-sm text-zinc-200">{formatFullDate(lead.cpfData?.primeiroProcesso) || 'N/A'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                    <div className="text-xs text-zinc-500 mb-1">Último Processo</div>
                    <div className="text-sm text-zinc-200">{formatFullDate(lead.cpfData?.ultimoProcesso) || 'N/A'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Data Available Indicator */}
            <div className={`p-3 rounded-lg border ${
              (lead.cpfData?.dados || lead.cpfData?.payload) 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-zinc-800 border-zinc-700'
            }`}>
              <div className="text-xs text-zinc-500 mb-1">Dados Disponíveis</div>
              <div className="flex items-center gap-2">
                {(lead.cpfData?.dados || lead.cpfData?.payload) ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400">Sim - Dados completos disponíveis</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-400">Não - Aguardando consulta</span>
                  </>
                )}
              </div>
            </div>

            {/* BigDataCorp API Payload Details */}
            {lead.cpfData?.payload && (
              <div className="space-y-3 mt-4">
                <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Dados do Payload BigDataCorp</h5>
                <div className="grid grid-cols-2 gap-3">
                  {lead.cpfData.payload.Result?.[0]?.BasicData?.Name && (
                    <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700 col-span-2">
                      <div className="text-xs text-zinc-500 mb-1">Nome Completo</div>
                      <div className="text-sm text-zinc-200">{lead.cpfData.payload.Result[0].BasicData.Name}</div>
                    </div>
                  )}
                  {lead.cpfData.payload.nomeCompleto && (
                    <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700 col-span-2">
                      <div className="text-xs text-zinc-500 mb-1">Nome Completo</div>
                      <div className="text-sm text-zinc-200">{lead.cpfData.payload.nomeCompleto}</div>
                    </div>
                  )}
                  {(lead.cpfData.payload.Result?.[0]?.BasicData?.BirthDate || lead.cpfData.payload.dataNascimento) && (
                    <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                      <div className="text-xs text-zinc-500 mb-1">Data de Nascimento</div>
                      <div className="text-sm text-zinc-200">
                        {lead.cpfData.payload.Result?.[0]?.BasicData?.BirthDate || lead.cpfData.payload.dataNascimento}
                      </div>
                    </div>
                  )}
                  {(lead.cpfData.payload.Result?.[0]?.BasicData?.TaxIdStatus || lead.cpfData.payload.situacaoCadastral) && (
                    <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                      <div className="text-xs text-zinc-500 mb-1">Situação Cadastral</div>
                      <div className="text-sm text-zinc-200">
                        {lead.cpfData.payload.Result?.[0]?.BasicData?.TaxIdStatus || lead.cpfData.payload.situacaoCadastral}
                      </div>
                    </div>
                  )}
                </div>

                {/* Try both payload.processos (legacy) and payload.Result[0].Processes.Lawsuits (BigDataCorp actual) */}
                {(() => {
                  // Ensure lawsuits is always an array - BigDataCorp may return different structures
                  let rawLawsuits = lead.cpfData?.payload?.processos || 
                                   lead.cpfData?.payload?.Result?.[0]?.Processes?.Lawsuits;
                  const lawsuits = Array.isArray(rawLawsuits) ? rawLawsuits : [];
                  if (lawsuits.length === 0) return null;
                  return (
                    <div className="space-y-2 mt-3">
                      <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-2">
                        <Gavel className="w-3 h-3" /> Processos Detalhados ({lawsuits.length})
                      </h5>
                      <ScrollArea className="max-h-[200px]">
                        <div className="space-y-2">
                          {lawsuits.map((processo: any, index: number) => (
                            <div key={index} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {(processo.numero || processo.Number || processo.CaseNumber) && (
                                  <div>
                                    <span className="text-zinc-500">Número: </span>
                                    <span className="text-zinc-200 font-mono">{processo.numero || processo.Number || processo.CaseNumber}</span>
                                  </div>
                                )}
                                {(processo.tribunal || processo.Court) && (
                                  <div>
                                    <span className="text-zinc-500">Tribunal: </span>
                                    <span className="text-zinc-200">{processo.tribunal || processo.Court}</span>
                                  </div>
                                )}
                                {(processo.tipo || processo.Type) && (
                                  <div>
                                    <span className="text-zinc-500">Tipo: </span>
                                    <span className="text-zinc-200">{processo.tipo || processo.Type}</span>
                                  </div>
                                )}
                                {(processo.status || processo.Status) && (
                                  <div>
                                    <span className="text-zinc-500">Status: </span>
                                    <span className={`${(processo.status || processo.Status) === 'Ativo' ? 'text-yellow-400' : 'text-zinc-200'}`}>
                                      {processo.status || processo.Status}
                                    </span>
                                  </div>
                                )}
                                {(processo.polo || processo.PartyType) && (
                                  <div>
                                    <span className="text-zinc-500">Polo: </span>
                                    <span className={`${(processo.polo || processo.PartyType) === 'Réu' || (processo.polo || processo.PartyType) === 'Defendant' ? 'text-red-400' : 'text-blue-400'}`}>
                                      {processo.polo || processo.PartyType}
                                    </span>
                                  </div>
                                )}
                                {(processo.valor || processo.Value) && (
                                  <div>
                                    <span className="text-zinc-500">Valor: </span>
                                    <span className="text-zinc-200">
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(processo.valor || processo.Value)}
                                    </span>
                                  </div>
                                )}
                                {(processo.assunto || processo.Subject) && (
                                  <div className="col-span-2">
                                    <span className="text-zinc-500">Assunto: </span>
                                    <span className="text-zinc-200">{processo.assunto || processo.Subject}</span>
                                  </div>
                                )}
                                {(processo.dataDistribuicao || processo.DistributionDate) && (
                                  <div>
                                    <span className="text-zinc-500">Distribuição: </span>
                                    <span className="text-zinc-200">{processo.dataDistribuicao || processo.DistributionDate}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })()}
              </div>
            )}

            {lead.cpfData?.dados && typeof lead.cpfData.dados === 'object' && (
              <div className="mt-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-2">Dados Adicionais</div>
                <ScrollArea className="max-h-[150px]">
                  <pre className="text-xs text-zinc-300 whitespace-pre-wrap">
                    {JSON.stringify(lead.cpfData.dados, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            )}
          </div>

          {lead.ultimoResumoEstruturado && (
            <>
              <Separator className="bg-zinc-700" />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 uppercase tracking-wide">
                  <ClipboardList className="w-4 h-4" /> Último Resumo
                </h4>
                <div className="p-4 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 whitespace-pre-wrap">
                  {lead.ultimoResumoEstruturado}
                </div>
              </div>
            </>
          )}

          <Separator className="bg-zinc-700" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 uppercase tracking-wide">
                <MessageCircle className="w-4 h-4" /> Conversação Completa
                {chatMessages.length > 0 && (
                  <Badge variant="outline" className="ml-2 border-zinc-600 text-zinc-400">
                    {chatMessages.length} mensagens
                  </Badge>
                )}
              </h4>
            </div>
            
            {chatMessages.length === 0 ? (
              <div className="p-4 rounded-lg bg-zinc-800 border border-zinc-700 text-center">
                <MessageCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <div className="text-sm text-zinc-400">Sem dados de conversa disponíveis</div>
                <div className="text-xs text-zinc-500 mt-1">Nenhuma mensagem de chat registrada para este lead</div>
              </div>
            ) : (
              <>
                
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {displayMessages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={`p-3 rounded-lg ${
                        msg.isClient 
                          ? 'bg-blue-500/10 border border-blue-500/30 ml-0 mr-8' 
                          : 'bg-green-500/10 border border-green-500/30 ml-8 mr-0'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {msg.isClient ? (
                          <UserIcon className="w-3 h-3 text-blue-400" />
                        ) : (
                          <Bot className="w-3 h-3 text-green-400" />
                        )}
                        <span className={`text-xs font-medium ${
                          msg.isClient ? 'text-blue-400' : 'text-green-400'
                        }`}>
                          {msg.sender}
                        </span>
                      </div>
                      <div className="text-sm text-zinc-200 whitespace-pre-wrap">
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                {chatMessages.length > 10 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                    onClick={() => setShowAllMessages(!showAllMessages)}
                  >
                    {showAllMessages 
                      ? 'Mostrar menos' 
                      : `Ver todas as ${chatMessages.length} mensagens`
                    }
                  </Button>
                )}
              </>
            )}
          </div>


        </div>
      </ScrollArea>
    </DialogContent>
  );
}

export default function LeadCard({ lead, isUpdated = false }: LeadCardProps) {
  const statusBadge = getStatusBadge(lead);
  const hasStats = (lead.totalMensagensChat && lead.totalMensagensChat > 0) || 
                   (lead.totalTranscricoes && lead.totalTranscricoes > 0);
  const hasActivity = lead.primeiroContato || lead.ultimoContato || lead.ultimaAtividade;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card 
          className={`hover-elevate overflow-visible bg-zinc-900 border-zinc-700 cursor-pointer hover:border-zinc-500 transition-all duration-500 ${
            isUpdated 
              ? 'ring-2 ring-green-500/50 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)] animate-pulse' 
              : ''
          }`} 
          data-testid={`card-lead-${lead.id}`}
        >
          <div className="p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar className="h-8 w-8 ring-1 ring-zinc-700 flex-shrink-0">
                  <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs font-medium">
                    {lead.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CL'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-sm truncate text-white" data-testid={`text-lead-name-${lead.id}`}>
                    {lead.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {statusBadge}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1 mb-2">
              {lead.phone && (
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <Phone className="w-3 h-3 flex-shrink-0 text-zinc-400" />
                  <span className="truncate" data-testid={`text-phone-${lead.id}`}>{lead.phone}</span>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <Mail className="w-3 h-3 flex-shrink-0 text-zinc-400" />
                  <span className="truncate" data-testid={`text-email-${lead.id}`}>{lead.email}</span>
                </div>
              )}
            </div>

            {hasStats && (
              <div className="flex items-center gap-3 py-1.5 border-t border-zinc-700">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-xs text-zinc-400">
                        <MessageCircle className="w-3 h-3" />
                        <span>{lead.totalMensagensChat || 0}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-zinc-800 text-zinc-200 border-zinc-700 text-xs">
                      <p>Total de mensagens no chat</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-xs text-zinc-400">
                        <Video className="w-3 h-3" />
                        <span>{lead.totalTranscricoes || 0}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-zinc-800 text-zinc-200 border-zinc-700 text-xs">
                      <p>Total de transcrições</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="flex items-center gap-1.5 ml-auto">
                  <DataIndicator active={lead.temDadosCliente} label="Dados Cliente" icon={Database} />
                  <DataIndicator active={lead.temHistoricoChat} label="Histórico Chat" icon={MessageCircle} />
                  <DataIndicator active={lead.temTranscricoes} label="Transcrições" icon={Video} />
                </div>
              </div>
            )}

            {/* Formulário Não Preenchido - Seção especial */}
            {lead.pipelineStatus === 'formulario-nao-preenchido' && lead.formularioEnvio && (
              <div className="py-1.5 border-t border-yellow-500/30 bg-yellow-500/5 -mx-3 px-3">
                <div className="flex items-center gap-2 text-xs text-yellow-400">
                  <FileText className="w-3 h-3" />
                  <span>Formulário enviado em {formatShortDate(lead.formularioEnviadoEm || lead.formularioEnvio?.enviadoEm)}</span>
                </div>
                {lead.formularioEnvio?.tentativas && lead.formularioEnvio.tentativas > 1 && (
                  <div className="text-xs text-yellow-500 mt-1">
                    {lead.formularioEnvio.tentativas} tentativas de envio
                  </div>
                )}
              </div>
            )}

            {hasActivity && (
              <div className="flex items-center justify-between gap-2 py-1.5 border-t border-zinc-700 text-xs text-zinc-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Último: {formatShortDate(lead.ultimoContato || lead.ultimaAtividade)}</span>
                </div>
                {lead.setorAtual && (
                  <Badge variant="outline" className="text-[10px] border-zinc-600 text-zinc-400 px-1.5 py-0">
                    {lead.setorAtual}
                  </Badge>
                )}
              </div>
            )}

            {lead.ultimaMensagem && (
              <div className="py-1.5 border-t border-zinc-700">
                <div className="text-xs text-zinc-500 italic truncate">
                  "{truncateText(lead.ultimaMensagem, 60)}"
                </div>
              </div>
            )}
          </div>
        </Card>
      </DialogTrigger>
      <LeadDetailDialog lead={lead} />
    </Dialog>
  );
}
