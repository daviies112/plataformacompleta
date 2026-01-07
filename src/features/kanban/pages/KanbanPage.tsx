import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { RefreshCw, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import KanbanColumn from '../components/KanbanColumn';
import { type Lead } from '../components/LeadCard';

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
  'consultor'
] as const;

const STAGE_LABELS: Record<string, string> = {
  'contato-inicial': 'Contato Inicial',
  'formulario-nao-preenchido': 'Formulário Não Preenchido',
  'formulario-aprovado': 'Aprovado',
  'formulario-reprovado': 'Reprovado',
  'cpf-aprovado': 'CPF Aprovado',
  'cpf-reprovado': 'CPF Reprovado',
  'reuniao-pendente': 'Reunião Pendente',
  'reuniao-agendada': 'Reunião Agendada',
  'reuniao-nao-compareceu': 'Reunião Não Compareceu',
  'reuniao-completo': 'Assinatura Pendente',
  'consultor': 'Revendedora',
};

const STAGE_COLORS: Record<string, string> = {
  'contato-inicial': 'bg-gray-200',
  'formulario-nao-preenchido': 'bg-yellow-200',
  'formulario-aprovado': 'bg-green-300',
  'formulario-reprovado': 'bg-red-200',
  'cpf-aprovado': 'bg-teal-200',
  'cpf-reprovado': 'bg-rose-200',
  'reuniao-pendente': 'bg-orange-200',
  'reuniao-agendada': 'bg-amber-200',
  'reuniao-nao-compareceu': 'bg-red-300',
  'reuniao-completo': 'bg-lime-200',
  'consultor': 'bg-purple-200',
};

const COLUMNS = PIPELINE_STAGES.map(stage => ({
  id: stage,
  title: STAGE_LABELS[stage] || stage,
  color: STAGE_COLORS[stage] || 'bg-gray-200',
}));

function getTenantId(): string {
  if (typeof window !== 'undefined') {
    const storedTenantId = localStorage.getItem('tenantId');
    if (storedTenantId) return storedTenantId;
  }
  return import.meta.env.VITE_DEFAULT_TENANT_ID || 'default-tenant';
}

async function generateLeadHashAsync(lead: any): Promise<string> {
  const relevantFields = {
    id: lead.id,
    name: lead.name || lead.nome,
    pipelineStatus: lead.pipelineStatus,
    formStatus: lead.formStatus,
    cpfStatus: lead.cpfStatus,
    meetingStatus: lead.meetingStatus,
    qualificationStatus: lead.qualificationStatus,
    updatedAt: lead.updatedAt,
    pontuacao: lead.pontuacao,
  };
  const data = new TextEncoder().encode(JSON.stringify(relevantFields));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateLeadHashSync(lead: any): string {
  const relevantFields = {
    id: lead.id,
    name: lead.name || lead.nome,
    pipelineStatus: lead.pipelineStatus,
    formStatus: lead.formStatus,
    cpfStatus: lead.cpfStatus,
    meetingStatus: lead.meetingStatus,
    qualificationStatus: lead.qualificationStatus,
    updatedAt: lead.updatedAt,
    pontuacao: lead.pontuacao,
  };
  return JSON.stringify(relevantFields);
}

function transformApiLead(apiLead: any): Lead {
  return {
    id: String(apiLead.id || apiLead.idx || Math.random()),
    name: apiLead.name || apiLead.nome || apiLead.nome_completo || 'Sem nome',
    phone: apiLead.phone || apiLead.telefone || '',
    email: apiLead.email || apiLead.email_principal || '',
    pipelineStatus: apiLead.pipelineStatus || 'contato-inicial',
    createdAt: apiLead.createdAt,
    updatedAt: apiLead.updatedAt,
    formStatus: apiLead.formStatus,
    formularioEnviadoEm: apiLead.formularioEnviadoEm,
    formularioAbertoEm: apiLead.formularioAbertoEm,
    formularioConcluidoEm: apiLead.formularioConcluidoEm,
    cpfStatus: apiLead.cpfStatus,
    cpfCheckedAt: apiLead.cpfCheckedAt,
    cpfRisco: apiLead.cpfRisco,
    cpfProcessos: apiLead.cpfProcessos,
    meetingStatus: apiLead.meetingStatus,
    meetingScheduledAt: apiLead.meetingScheduledAt,
    reuniaoData: apiLead.reuniaoData,
    reuniaoHora: apiLead.reuniaoHora,
    reuniaoTipo: apiLead.reuniaoTipo,
    reuniaoLink: apiLead.reuniaoLink,
    reuniaoTitulo: apiLead.reuniaoTitulo,
    consultorNome: apiLead.consultorNome,
    meeting: apiLead.meeting,
    qualificationStatus: apiLead.qualificationStatus,
    pontuacao: apiLead.pontuacao,
    hasContact: apiLead.hasContact,
    hasForm: apiLead.hasForm,
    hasCpf: apiLead.hasCpf,
    hasMeeting: apiLead.hasMeeting,
    timeline: apiLead.timeline,
    statusAtendimento: apiLead.status_atendimento || apiLead.statusAtendimento,
    setorAtual: apiLead.setor_atual || apiLead.setorAtual,
    ativo: apiLead.ativo,
    tipoReuniaoAtual: apiLead.tipo_reuniao_atual || apiLead.tipoReuniaoAtual,
    primeiroContato: apiLead.primeiro_contato || apiLead.primeiroContato,
    ultimoContato: apiLead.ultimo_contato || apiLead.ultimoContato,
    ultimaAtividade: apiLead.ultima_atividade || apiLead.ultimaAtividade,
    totalRegistros: apiLead.total_registros || apiLead.totalRegistros,
    registrosDadosCliente: apiLead.registros_dados_cliente || apiLead.registrosDadosCliente,
    totalMensagensChat: apiLead.total_mensagens_chat || apiLead.totalMensagensChat,
    totalTranscricoes: apiLead.total_transcricoes || apiLead.totalTranscricoes,
    fontesDados: apiLead.fontes_dados || apiLead.fontesDados,
    temDadosCliente: apiLead.tem_dados_cliente || apiLead.temDadosCliente,
    temHistoricoChat: apiLead.tem_historico_chat || apiLead.temHistoricoChat,
    temTranscricoes: apiLead.tem_transcricoes || apiLead.temTranscricoes,
    mensagensCliente: apiLead.mensagens_cliente || apiLead.mensagensCliente,
    mensagensAgente: apiLead.mensagens_agente || apiLead.mensagensAgente,
    primeiraMensagem: apiLead.primeira_mensagem || apiLead.primeiraMensagem,
    ultimaMensagem: apiLead.ultima_mensagem || apiLead.ultimaMensagem,
    ultimoResumoEstruturado: apiLead.ultimo_resumo_estruturado || apiLead.ultimoResumoEstruturado,
    todas_mensagens_chat: apiLead.todas_mensagens_chat || apiLead.todasMensagensChat,
    cpf: apiLead.cpf,
    cpfData: apiLead.cpfData || apiLead.cpf_data,
    resultadoReuniao: apiLead.resultado_reuniao || apiLead.resultadoReuniao,
    form: apiLead.form,
  };
}

export default function KanbanPage() {
  const tenantId = getTenantId();
  const queryClient = useQueryClient();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatedLeadIds, setUpdatedLeadIds] = useState<Set<string>>(new Set());
  const [refreshStats, setRefreshStats] = useState<{ updated: number; total: number; lastRefresh?: Date } | null>(null);
  const previousLeadsHashRef = useRef<Map<string, string>>(new Map());
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHashInitializedRef = useRef(false);

  const { data: leads = [], isLoading, error, refetch, isFetching } = useQuery<Lead[]>({
    queryKey: ['/api/leads-pipeline', tenantId],
    queryFn: async () => {
      console.log('[KanbanPage] Fetching leads for tenant:', tenantId);
      const response = await fetch(`/api/leads-pipeline/${tenantId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[KanbanPage] API error:', errorText);
        throw new Error(errorText || 'Failed to fetch leads');
      }
      
      const result = await response.json();
      console.log('[KanbanPage] API response received, success:', result.success, 'leads count:', result.data?.leads?.length);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch leads');
      }
      
      const transformedLeads = (result.data?.leads || []).map(transformApiLead);
      console.log('[KanbanPage] Transformed leads count:', transformedLeads.length);
      return transformedLeads;
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (leads.length > 0 && !isHashInitializedRef.current) {
      const initializeHashes = async () => {
        const hashMap = new Map<string, string>();
        for (const lead of leads) {
          const hash = await generateLeadHashAsync(lead);
          hashMap.set(lead.id, hash);
        }
        previousLeadsHashRef.current = hashMap;
        isHashInitializedRef.current = true;
        console.log(`[KanbanPage] Hash map inicializado com ${hashMap.size} leads`);
      };
      initializeHashes();
    }
  }, [leads]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const handleSmartRefresh = useCallback(async () => {
    setIsRefreshing(true);
    
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    setUpdatedLeadIds(new Set());
    
    try {
      const result = await refetch();
      const newLeads = result.data || [];
      
      const changedIds = new Set<string>();
      const newHashMap = new Map<string, string>();
      
      for (const lead of newLeads) {
        const hash = await generateLeadHashAsync(lead);
        newHashMap.set(lead.id, hash);
        
        const previousHash = previousLeadsHashRef.current.get(lead.id);
        if (previousHash && previousHash !== hash) {
          changedIds.add(lead.id);
          console.log(`[KanbanPage] Lead atualizado: ${lead.id} - ${lead.name}`);
        } else if (!previousHash && isHashInitializedRef.current) {
          changedIds.add(lead.id);
          console.log(`[KanbanPage] Novo lead: ${lead.id} - ${lead.name}`);
        }
      }
      
      previousLeadsHashRef.current = newHashMap;
      setUpdatedLeadIds(changedIds);
      setRefreshStats({
        updated: changedIds.size,
        total: newLeads.length,
        lastRefresh: new Date(),
      });
      
      console.log(`[KanbanPage] Atualização inteligente: ${changedIds.size} leads atualizados de ${newLeads.length} total`);
      
      if (changedIds.size > 0) {
        highlightTimeoutRef.current = setTimeout(() => {
          setUpdatedLeadIds(new Set());
          highlightTimeoutRef.current = null;
        }, 5000);
      }
    } catch (error) {
      console.error('[KanbanPage] Erro ao atualizar:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const leadsWithUpdateStatus = useMemo(() => {
    return leads.map(lead => ({
      ...lead,
      _justUpdated: updatedLeadIds.has(lead.id),
    }));
  }, [leads, updatedLeadIds]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando leads...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive mb-2">Erro ao carregar leads</p>
          <p className="text-muted-foreground text-sm">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-card-border bg-card">
        <div className="container-luxury">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Pipeline de Leads</h1>
              <p className="text-muted-foreground mt-1">
                Gerencie seus leads através do funil de vendas
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {refreshStats && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  {refreshStats.updated > 0 ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      <Check className="w-3 h-3 mr-1" />
                      {refreshStats.updated} atualizado{refreshStats.updated > 1 ? 's' : ''}
                    </Badge>
                  ) : refreshStats.lastRefresh ? (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Sem alterações
                    </span>
                  ) : null}
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSmartRefresh}
                disabled={isRefreshing || isFetching}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${(isRefreshing || isFetching) ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Atualizando...' : 'Atualizar'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-luxury py-8">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              leads={leadsWithUpdateStatus.filter((lead) => lead.pipelineStatus === column.id)}
              updatedLeadIds={updatedLeadIds}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
