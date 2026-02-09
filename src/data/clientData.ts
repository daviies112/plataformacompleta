import { ClientData, ChatMessage, DashboardMetrics } from '@/types/client';
import { getSupabaseClient, DashboardCompleteV5 } from '@/lib/supabase';

// Função para carregar dados da tabela dashboard_completov5
export const loadClientData = async (): Promise<ClientData[]> => {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      console.warn('⚠️ Supabase não configurado - retornando array vazio');
      return [];
    }
    
    const { data, error } = await supabase
      .from('dashboard_completo_v5_base')
      .select('*')
      .order('ultimo_contato', { ascending: false });

    if (error) {
      console.error('Erro ao carregar dados do Supabase:', error);
      return [];
    }

    // Converter os dados do Supabase para o formato ClientData
    return data?.map((item: DashboardCompleteV5): ClientData => ({
      ...item,
      // Garantir que campos booleanos estejam corretos
      tem_dados_cliente: Boolean(item.tem_dados_cliente),
      tem_historico_chat: Boolean(item.tem_historico_chat),
      tem_transcricoes: Boolean(item.tem_transcricoes),
      // Garantir que status_atendimento seja válido
      status_atendimento: (['active', 'pause', 'waiting', 'completed'].includes(item.status_atendimento) 
        ? item.status_atendimento 
        : 'pause') as 'active' | 'pause' | 'waiting' | 'completed',
      // Garantir que id_reuniao_atual seja sempre string (nunca null)
      id_reuniao_atual: item.id_reuniao_atual || '',
    })) || [];
  } catch (error) {
    console.error('Erro ao carregar dados dos clientes:', error);
    return [];
  }
};

// Função para buscar dados de um cliente específico
export const getClientById = async (idx: number): Promise<ClientData | null> => {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      console.warn('⚠️ Supabase não configurado - retornando null');
      return null;
    }
    
    const { data, error} = await supabase
      .from('dashboard_completo_v5_base')
      .select('*')
      .eq('idx', idx)
      .single();

    if (error) {
      console.error('Erro ao buscar cliente:', error);
      return null;
    }

    return data ? {
      ...data,
      tem_dados_cliente: Boolean(data.tem_dados_cliente),
      tem_historico_chat: Boolean(data.tem_historico_chat),
      tem_transcricoes: Boolean(data.tem_transcricoes),
      status_atendimento: (['active', 'pause', 'waiting', 'completed'].includes(data.status_atendimento) 
        ? data.status_atendimento 
        : 'pause') as 'active' | 'pause' | 'waiting' | 'completed',
      id_reuniao_atual: data.id_reuniao_atual || '',
    } : null;
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return null;
  }
};

// Dados baseados no JSON fornecido - fallback
export const clientData: ClientData = {
  idx: 0,
  telefone: "553172380072@s.whatsapp.net",
  nome_completo: "Ellen Viana",
  email_principal: "daviemericko03@gmail.com",
  status_atendimento: "pause",
  setor_atual: null,
  ativo: null,
  tipo_reuniao_atual: null,
  primeiro_contato: "2025-09-11 23:48:58.869+00",
  ultimo_contato: "2025-09-13 12:01:01.959+00",
  total_registros: 19,
  registros_dados_cliente: 2,
  total_mensagens_chat: 14,
  total_transcricoes: 3,
  fontes_dados: 3,
  tem_dados_cliente: true,
  tem_historico_chat: true,
  tem_transcricoes: true,
  ultima_atividade: "2025-09-13 12:01:01.959+00",
  id_reuniao_atual: "sgl265apj20o0e75u6u6ff8do0",
  ultima_transcricao: "2025-09-13 12:01:01.959+00",
  mensagens_cliente: "Marque uma reunião para Ellen Viana e meu email é daviemericko03@gmail.com marque um reunião para dia 12/09/2025 as 12 00 reunião online",
  mensagens_agente: "Perfeito! Reunião marcada para Ellen Viana no dia 12/09/2025 às 12:00 (online). Confirmação enviada para daviemericko03@gmail.com. Alguma preferência específica para a plataforma da reunião?"
};

// Gerar mensagens a partir dos dados das colunas mensagens_cliente e mensagens_agente
export const generateChatFromData = (clientData: ClientData): ChatMessage[] => {
  const messages: ChatMessage[] = [];
  
  // Adicionar mensagens do cliente
  if (clientData.mensagens_cliente) {
    messages.push({
      id: "client_msg_1",
      type: "client",
      message: clientData.mensagens_cliente,
      timestamp: "2025-09-11T23:48:00",
      isRead: true
    });
  }
  
  // Adicionar mensagens do agente
  if (clientData.mensagens_agente) {
    messages.push({
      id: "agent_msg_1",
      type: "agent", 
      message: clientData.mensagens_agente,
      timestamp: "2025-09-11T23:49:00",
      isRead: true
    });
  }
  
  return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const chatMessages: ChatMessage[] = [
  {
    id: "1",
    type: "client",
    message: "Olá, preciso marcar uma reunião",
    timestamp: "2025-09-11T23:48:00",
    isRead: true
  },
  {
    id: "2",
    type: "agent",
    message: "Olá Ellen! Claro, posso te ajudar com isso. Qual seria a data e horário ideais para você?",
    timestamp: "2025-09-11T23:49:00",
    isRead: true
  },
  {
    id: "3",
    type: "client",
    message: clientData.mensagens_cliente,
    timestamp: "2025-09-12T09:15:00",
    isRead: true
  },
  {
    id: "4",
    type: "agent",
    message: clientData.mensagens_agente,
    timestamp: "2025-09-12T09:17:00",
    isRead: true
  },
  {
    id: "5",
    type: "client",
    message: "Pode ser pelo Zoom ou Google Meet",
    timestamp: "2025-09-12T09:20:00",
    isRead: true
  },
  {
    id: "6",
    type: "agent",
    message: "Ótimo! Vou configurar via Google Meet. Link da reunião será enviado 1h antes. Há algo específico que gostaria de discutir na reunião?",
    timestamp: "2025-09-12T09:25:00",
    isRead: true
  },
  {
    id: "7",
    type: "client",
    message: "Quero discutir sobre estratégias de marketing digital",
    timestamp: "2025-09-12T10:30:00",
    isRead: true
  },
  {
    id: "8",
    type: "agent",
    message: "Excelente! Farei um material preparatório sobre estratégias de marketing digital para nossa discussão. Até mais!",
    timestamp: "2025-09-12T10:35:00",
    isRead: true
  },
  {
    id: "9",
    type: "client",
    message: "Obrigada! 😊",
    timestamp: "2025-09-12T10:36:00",
    isRead: true
  }
];


export const dashboardMetrics: DashboardMetrics = {
  total_clients: 1,
  active_conversations: 1,
  response_rate: 100,
  avg_response_time: "2.5min"
};