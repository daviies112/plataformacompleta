import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { PremiumCard } from '@/platforms/shared/premium/PremiumCard';
import { PremiumButton } from '@/platforms/shared/premium/PremiumButton';
import { PremiumInput } from '@/platforms/shared/premium/PremiumInput';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Users, Search, Mail, Phone, Calendar, MessageCircle, Clock, User, 
  Activity, Database, Video, Bot, UserIcon, RefreshCw, X,
  CheckCircle, XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientData {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  lastContact?: string;
  conversationsCount: number;
  totalTranscriptions: number;
  plan?: string;
  [key: string]: any;
}

const ClientPage = () => {
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientsData, setClientsData] = useState<ClientData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const { 
    data: dashboardResponse, 
    isLoading: isDashboardLoading, 
    isError: isDashboardError,
    error: dashboardError,
    refetch: refetchDashboard 
  } = useQuery({
    queryKey: ['/api/dashboard/dashboard-data'],
    staleTime: 30000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (dashboardResponse?.success && dashboardResponse?.data) {
      const processedClients = dashboardResponse.data.map((client: any, index: number) => ({
        ...client,
        id: String(client.idx || index + 1),
        name: client.nome_completo,
        email: client.email_principal,
        phone: client.telefone ? client.telefone.replace('@s.whatsapp.net', '').replace('55', '+55 ') : 'N/A',
        status: client.status_atendimento || 'inactive',
        lastContact: client.ultimo_contato ? new Date(client.ultimo_contato).toISOString().split('T')[0] : 'N/A',
        conversationsCount: client.total_mensagens_chat || 0,
        totalTranscriptions: client.total_transcricoes || 0,
        plan: ['Premium', 'Standard', 'Enterprise'][index % 3]
      }));
      
      setClientsData(processedClients);
      console.log(`✅ Clientes carregados: ${processedClients.length} registros de ${dashboardResponse.source || 'supabase'}`);
      
      toast({
        title: "✅ Dados dos clientes atualizados!",
        description: `${processedClients.length} clientes carregados do ${dashboardResponse.source || 'supabase'}`,
        duration: 3000,
      });
    } else if (dashboardResponse?.success && dashboardResponse?.data?.length === 0) {
      setClientsData([]);
      console.log('⚠️ Conexão ativa mas nenhum cliente encontrado');
      toast({
        title: "⚠️ Nenhum cliente encontrado",
        description: `Conectado ao ${dashboardResponse.source || 'supabase'} mas sem dados`,
        duration: 5000,
      });
    } else if (dashboardResponse && !dashboardResponse.success) {
      console.error('❌ Erro na resposta da API:', dashboardResponse);
      toast({
        title: "❌ Erro ao carregar clientes",
        description: dashboardResponse.error || "Erro desconhecido na API",
        duration: 5000,
      });
    }
  }, [dashboardResponse, toast]);

  useEffect(() => {
    if (isDashboardError) {
      console.error('❌ Erro na query do dashboard:', dashboardError);
      toast({
        title: "❌ Erro de conexão",
        description: "Não foi possível conectar com o servidor. Verifique sua conexão.",
        duration: 5000,
      });
    }
  }, [isDashboardError, dashboardError, toast]);

  const filteredClients = clientsData.filter(client =>
    client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone?.includes(searchQuery)
  );

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
          Ativo
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 backdrop-blur-sm">
        <div className="w-2 h-2 rounded-full bg-gray-400 mr-1.5" />
        Inativo
      </Badge>
    );
  };

  const getAttendanceStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      'active': { label: 'Ativo', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
      'pause': { label: 'Pausado', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      'waiting': { label: 'Aguardando', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      'inactive': { label: 'Inativo', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
    };
    
    const config = statusMap[status] || statusMap['inactive'];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const openClientDetails = (client: ClientData) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
  };

  const formatWhatsAppMessages = (client: any) => {
    if (!client.todas_mensagens_chat) return [];
    
    const messages = [];
    const rawMessages = client.todas_mensagens_chat.split('\n\n---\n\n');
    
    rawMessages.forEach((message: string, index: number) => {
      if (message.trim()) {
        const isClient = message.includes('👤');
        const isAgent = message.includes('🤖');
        const cleanMessage = message.replace(/[👤🤖]\s*/, '').trim();
        
        if (cleanMessage && (isClient || isAgent)) {
          messages.push({
            id: index,
            text: cleanMessage,
            isClient: isClient,
            timestamp: new Date(Date.now() - (1000 * 60 * (rawMessages.length - index))).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            sender: isClient ? 'Cliente' : 'Agente AI',
            originalOrder: index
          });
        }
      }
    });
    
    return messages.sort((a, b) => a.originalOrder - b.originalOrder);
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  return (
    <>
      <div className="relative z-10 container mx-auto pt-0 pb-4 sm:pb-6 lg:pb-8 space-y-6 lg:space-y-8 animate-fade-in px-4 sm:px-6 lg:px-8">
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4 lg:gap-3">
              <div className="p-3 lg:p-2.5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                <Users className="h-8 w-8 lg:h-6 lg:w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl lg:text-2xl font-black text-foreground tracking-tight bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
                  Gerenciamento de Clientes
                </h1>
                <p className="text-xl lg:text-sm text-muted-foreground/80 mt-2 lg:mt-1">
                  Visualize e gerencie seus clientes de forma eficiente
                </p>
              </div>
            </div>
            
            <PremiumButton 
              onClick={refetchDashboard}
              disabled={isDashboardLoading}
              variant="secondary"
              size="md"
              isLoading={isDashboardLoading}
              data-testid="button-refresh-clients"
              data-tour="refresh-clients"
              className="w-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              <span>{isDashboardLoading ? 'Atualizando...' : 'Atualizar'}</span>
            </PremiumButton>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {isDashboardLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                <span>Carregando clientes...</span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4 text-green-500" />
                <span>{filteredClients.length} clientes carregados</span>
                {dashboardResponse?.source && (
                  <span className="text-xs">• Fonte: {dashboardResponse.source}</span>
                )}
              </>
            )}
          </div>
        </div>

        <PremiumInput
          icon={Search}
          placeholder="Buscar clientes por nome, email ou telefone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          iconPosition="left"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredClients.map((client, index) => (
            <PremiumCard 
              key={client.id} 
              variant="elevated" 
              padding="lg"
              clickable
              className="group"
              data-testid={`card-client-${client.id}`} 
              data-tour={index === 0 ? "client-card" : undefined}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-base">
                        {client.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CL'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-foreground truncate">{client.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{client.plan}</p>
                    </div>
                  </div>
                  <span data-tour={index === 0 ? "client-status-badge" : undefined}>
                    {getStatusBadge(client.status)}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4 flex-shrink-0 text-primary/70" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4 flex-shrink-0 text-primary/70" />
                    <span>{client.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 flex-shrink-0 text-primary/70" />
                    <span>Último contato: {client.lastContact}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                    <Activity className="w-5 h-5 mx-auto text-primary mb-1" />
                    <div className="text-lg font-bold text-foreground" data-testid={`text-transcriptions-${client.id}`}>
                      {client.totalTranscriptions}
                    </div>
                    <div className="text-xs text-muted-foreground">Transcrições</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                    <MessageCircle className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                    <div className="text-lg font-bold text-foreground" data-testid={`text-conversations-${client.id}`}>
                      {client.conversationsCount}
                    </div>
                    <div className="text-xs text-muted-foreground">Conversas</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <PremiumButton 
                    size="sm" 
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWhatsApp(client.phone);
                    }}
                  >
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    WhatsApp
                  </PremiumButton>
                  <PremiumButton 
                    size="sm" 
                    variant="primary" 
                    onClick={(e) => {
                      e.stopPropagation();
                      openClientDetails(client);
                    }}
                    data-testid={`button-view-${client.id}`}
                  >
                    Ver Detalhes
                  </PremiumButton>
                </div>
              </div>
            </PremiumCard>
          ))}
        </div>

        <PremiumCard variant="elevated" padding="lg" data-tour="clients-stats">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-foreground mb-1">
              Resumo dos Clientes
            </h3>
            <p className="text-sm text-muted-foreground">
              Estatísticas gerais da sua base de clientes
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4">
              <div className="text-3xl lg:text-xl font-black bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent" data-testid="text-total-clients">
                {filteredClients.length}
              </div>
              <div className="text-sm lg:text-xs text-muted-foreground mt-1">Total de Clientes</div>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl lg:text-xl font-black bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 bg-clip-text text-transparent" data-testid="text-active-clients">
                {filteredClients.filter(c => c.status === 'active').length}
              </div>
              <div className="text-sm lg:text-xs text-muted-foreground mt-1">Clientes Ativos</div>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl lg:text-xl font-black bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500 bg-clip-text text-transparent" data-testid="text-total-transcriptions">
                {filteredClients.reduce((sum, c) => sum + (c.totalTranscriptions || 0), 0)}
              </div>
              <div className="text-sm lg:text-xs text-muted-foreground mt-1">Total de Transcrições</div>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl lg:text-xl font-black bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500 bg-clip-text text-transparent" data-testid="text-total-conversations">
                {filteredClients.reduce((sum, c) => sum + c.conversationsCount, 0)}
              </div>
              <div className="text-sm lg:text-xs text-muted-foreground mt-1">Total de Conversas</div>
            </div>
          </div>
        </PremiumCard>
      </div>

      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" aria-describedby="client-details-description">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
              Detalhes Completos do Cliente
            </DialogTitle>
            <p id="client-details-description" className="text-sm text-muted-foreground">
              Visualização completa dos dados do cliente, incluindo conversações, transcrições e resumos estruturados
            </p>
          </DialogHeader>
          
          {selectedClient && (
            <div className="grid gap-6 mt-4 grid-cols-1 lg:grid-cols-2">
              
              <PremiumCard variant="outlined" padding="md">
                <div className="flex items-center space-x-2 mb-4">
                  <User className="w-5 h-5 text-primary" />
                  <h4 className="text-lg font-bold text-foreground">Informações Pessoais</h4>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">Nome Completo:</span>
                    <span className="text-muted-foreground text-right">{selectedClient.nome_completo}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">Email Principal:</span>
                    <span className="text-muted-foreground text-right break-all">{selectedClient.email_principal}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">Telefone:</span>
                    <span className="text-muted-foreground">{selectedClient.phone}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-medium">Status:</span>
                    {getAttendanceStatusBadge(selectedClient.status_atendimento)}
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-medium">Ativo:</span>
                    {selectedClient.ativo ? 
                      <CheckCircle className="w-5 h-5 text-green-500" /> : 
                      <XCircle className="w-5 h-5 text-red-500" />
                    }
                  </div>
                </div>
              </PremiumCard>

              <PremiumCard variant="outlined" padding="md">
                <div className="flex items-center space-x-2 mb-4">
                  <Clock className="w-5 h-5 text-primary" />
                  <h4 className="text-lg font-bold text-foreground">Histórico de Contato</h4>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">Primeiro Contato:</span>
                    <span className="text-muted-foreground text-right">{formatDateTime(selectedClient.primeiro_contato)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">Último Contato:</span>
                    <span className="text-muted-foreground text-right">{formatDateTime(selectedClient.ultimo_contato)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">Última Atividade:</span>
                    <span className="text-muted-foreground text-right">{formatDateTime(selectedClient.ultima_atividade)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">Setor Atual:</span>
                    <span className="text-muted-foreground">{selectedClient.setor_atual || 'N/A'}</span>
                  </div>
                </div>
              </PremiumCard>

              <PremiumCard variant="outlined" padding="md">
                <div className="flex items-center space-x-2 mb-4">
                  <Video className="w-5 h-5 text-primary" />
                  <h4 className="text-lg font-bold text-foreground">Informações de Reunião</h4>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">Tipo de Reunião Atual:</span>
                    <span className="text-muted-foreground">{selectedClient.tipo_reuniao_atual || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">ID Reunião Atual:</span>
                    <span className="text-muted-foreground text-xs break-all">{selectedClient.id_reuniao_atual || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">Última Transcrição:</span>
                    <span className="text-muted-foreground text-right">{formatDateTime(selectedClient.ultima_transcricao)}</span>
                  </div>
                </div>
              </PremiumCard>

              <PremiumCard variant="outlined" padding="md">
                <div className="flex items-center space-x-2 mb-4">
                  <Activity className="w-5 h-5 text-primary" />
                  <h4 className="text-lg font-bold text-foreground">Estatísticas de Atividade</h4>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">Total de Registros:</span>
                    <Badge variant="outline">{selectedClient.total_registros}</Badge>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">Registros Dados Cliente:</span>
                    <Badge variant="outline">{selectedClient.registros_dados_cliente}</Badge>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">Mensagens no Chat:</span>
                    <Badge variant="outline">{selectedClient.total_mensagens_chat}</Badge>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">Transcrições:</span>
                    <Badge variant="outline">{selectedClient.total_transcricoes}</Badge>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">Fontes de Dados:</span>
                    <Badge variant="outline">{selectedClient.fontes_dados}</Badge>
                  </div>
                </div>
              </PremiumCard>

              <PremiumCard variant="outlined" padding="md">
                <div className="flex items-center space-x-2 mb-4">
                  <Database className="w-5 h-5 text-primary" />
                  <h4 className="text-lg font-bold text-foreground">Disponibilidade de Dados</h4>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-medium">Tem Dados Cliente:</span>
                    {selectedClient.tem_dados_cliente ? 
                      <CheckCircle className="w-5 h-5 text-green-500" /> : 
                      <XCircle className="w-5 h-5 text-red-500" />
                    }
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-medium">Tem Histórico Chat:</span>
                    {selectedClient.tem_historico_chat ? 
                      <CheckCircle className="w-5 h-5 text-green-500" /> : 
                      <XCircle className="w-5 h-5 text-red-500" />
                    }
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-medium">Tem Transcrições:</span>
                    {selectedClient.tem_transcricoes ? 
                      <CheckCircle className="w-5 h-5 text-green-500" /> : 
                      <XCircle className="w-5 h-5 text-red-500" />
                    }
                  </div>
                </div>
              </PremiumCard>

              <PremiumCard variant="outlined" padding="md" className="lg:col-span-2">
                <div className="flex items-center space-x-2 mb-4">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <h4 className="text-lg font-bold text-foreground">Conversação Completa</h4>
                  <Badge variant="outline">{selectedClient.total_mensagens_chat} mensagens</Badge>
                </div>
                <div className="max-h-96 overflow-y-auto bg-gradient-to-b from-slate-900/30 to-slate-800/20 p-4 rounded-xl border border-white/10">
                  {selectedClient && selectedClient.todas_mensagens_chat ? (
                    <div className="space-y-4">
                      {formatWhatsAppMessages(selectedClient).map((message: any) => (
                        <div
                          key={message.id}
                          className={`flex ${message.isClient ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={cn(
                              "p-3 rounded-lg shadow-md max-w-[80%]",
                              message.isClient
                                ? 'bg-blue-500 text-white rounded-br-none'
                                : 'bg-emerald-500 text-white rounded-bl-none'
                            )}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                {message.isClient ? (
                                  <UserIcon className="w-4 h-4 text-blue-100" />
                                ) : (
                                  <Bot className="w-4 h-4 text-emerald-100" />
                                )}
                                <span className={cn(
                                  "font-medium text-xs",
                                  message.isClient ? 'text-blue-100' : 'text-emerald-100'
                                )}>
                                  {message.sender}
                                </span>
                              </div>
                              <p className="text-sm md:text-base break-words">
                                {message.text}
                              </p>
                              <span className={cn(
                                "block text-right text-xs",
                                message.isClient ? 'text-blue-100/80' : 'text-emerald-100/80'
                              )}>
                                {message.timestamp}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhuma mensagem disponível
                    </div>
                  )}
                </div>
              </PremiumCard>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientPage;
