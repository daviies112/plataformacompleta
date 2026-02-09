import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState, useEffect } from 'react';
import { Users, Search, Mail, Phone, Calendar, MessageCircle, Clock, User, Activity, Database, Video, Bot, UserIcon, RefreshCw, Filter, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { BottomNav } from '@/components/mobile/BottomNav';
import { HorizontalScrollCards, ScrollCard } from '@/components/mobile/HorizontalScrollCards';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const ClientPage = () => {
  const [selectedClient, setSelectedClient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientsData, setClientsData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

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
      const processedClients = dashboardResponse.data.map((client, index) => ({
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
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Ativo</Badge>;
    }
    return <Badge variant="secondary">Inativo</Badge>;
  };

  const getAttendanceStatusBadge = (status: string) => {
    const statusMap = {
      'active': { label: 'Ativo', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      'pause': { label: 'Pausado', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      'waiting': { label: 'Aguardando', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      'inactive': { label: 'Inativo', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' }
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

  const openClientDetails = (client: any) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
  };

  const formatWhatsAppMessages = (selectedClient: any) => {
    if (!selectedClient.todas_mensagens_chat) return [];
    
    const messages = [];
    const rawMessages = selectedClient.todas_mensagens_chat.split('\n\n---\n\n');
    
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

  const truncateText = (text: string, limit: number) => {
    if (!text) return '';
    return text.length > limit ? text.substring(0, limit) + '...' : text;
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
      {isMobile && (
        <div className="px-4 pb-2 pt-0">
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        </div>
      )}

      <div className={cn(
        "relative z-10 container mx-auto animate-fade-in",
        "px-4 md:px-6 lg:px-8",
        "pt-0 pb-4 md:pb-6 lg:pb-8",
        "pb-24 md:pb-8",
        "space-y-4 md:space-y-6"
      )}>
        
        {!isMobile && (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight gradient-text">
                Gerenciamento de Clientes
              </h1>
              <p className="text-base md:text-xl text-muted-foreground/80">
                Visualize e gerencie seus clientes de forma eficiente
              </p>
              
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
            
            <div className="flex items-center gap-3">
              <Button 
                onClick={refetchDashboard}
                disabled={isDashboardLoading}
                variant="outline" 
                size="sm"
                data-testid="button-refresh-clients"
                data-tour="refresh-clients"
                className="touch-manipulation active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isDashboardLoading ? 'animate-spin' : ''}`} />
                {isDashboardLoading ? 'Atualizando...' : 'Atualizar'}
              </Button>
            </div>
          </div>
        )}

        {isMobile && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                {isDashboardLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                    <span>Carregando...</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 text-green-500" />
                    <span className="font-medium">{filteredClients.length} clientes</span>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={refetchDashboard}
                  disabled={isDashboardLoading}
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
                >
                  <RefreshCw className={`w-5 h-5 ${isDashboardLoading ? 'animate-spin' : ''}`} />
                </Button>
                
                <Sheet open={showFilters} onOpenChange={setShowFilters}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
                    >
                      <Filter className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80">
                    <SheetHeader>
                      <SheetTitle>Filtros</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Status</label>
                        <div className="space-y-2">
                          <Button variant="outline" className="w-full justify-start">
                            Todos
                          </Button>
                          <Button variant="outline" className="w-full justify-start">
                            Ativos
                          </Button>
                          <Button variant="outline" className="w-full justify-start">
                            Inativos
                          </Button>
                        </div>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 bg-card/50 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 touch-manipulation active:scale-95"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {!isMobile && (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes por nome, email ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-card/50 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {isMobile ? (
          <div className="space-y-4">
            <HorizontalScrollCards title="Clientes Ativos" showSeeAll={false}>
              {filteredClients.map((client, index) => (
                <ScrollCard key={client.id} width="300px">
                  <Card 
                    className="glass-card border-border/20 hover:shadow-luxury transition-all duration-300 h-full"
                    data-testid={`card-client-${client.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-12 w-12 ring-2 ring-primary/20 flex-shrink-0">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-base">
                              {client.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CL'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base font-bold truncate">{client.name}</CardTitle>
                            <div className="mt-1">
                              {getStatusBadge(client.status)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-center p-2.5 bg-primary/5 rounded-lg">
                          <Activity className="w-4 h-4 mx-auto text-primary mb-1" />
                          <div className="text-sm font-bold">{client.totalTranscriptions}</div>
                          <div className="text-xs text-muted-foreground">Transcrições</div>
                        </div>
                        <div className="text-center p-2.5 bg-secondary/5 rounded-lg">
                          <MessageCircle className="w-4 h-4 mx-auto text-secondary mb-1" />
                          <div className="text-sm font-bold">{client.conversationsCount}</div>
                          <div className="text-xs text-muted-foreground">Conversas</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {client.lastContact}
                        </span>
                        <span className="font-medium text-primary">{client.plan}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleWhatsApp(client.phone)}
                          className="h-11 min-h-[44px] touch-manipulation active:scale-95 transition-transform"
                        >
                          <MessageCircle className="w-4 h-4 mr-1.5" />
                          WhatsApp
                        </Button>
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => openClientDetails(client)}
                          className="h-11 min-h-[44px] touch-manipulation active:scale-95 transition-transform bg-primary hover:bg-primary/90"
                        >
                          Ver Mais
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollCard>
              ))}
            </HorizontalScrollCards>

            <div className="space-y-3 -mx-4 px-4">
              <h3 className="text-lg font-semibold">Todos os Clientes</h3>
              {filteredClients.map((client) => (
                <Card 
                  key={client.id} 
                  className="glass-card border-border/20 hover:shadow-lg transition-all duration-300"
                  onClick={() => openClientDetails(client)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20 flex-shrink-0">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {client.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CL'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold truncate">{client.name}</h4>
                          {getStatusBadge(client.status)}
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{client.phone}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-xs">
                              <Calendar className="w-3 h-3" />
                              {client.lastContact}
                            </span>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                {client.totalTranscriptions}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {client.conversationsCount}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredClients.map((client, index) => (
              <Card 
                key={client.id} 
                className="glass-card border-border/20 hover:shadow-luxury transition-elegant" 
                data-testid={`card-client-${client.id}`} 
                data-tour={index === 0 ? "client-card" : undefined}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {client.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CL'}
                        </AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-lg font-bold">{client.name}</CardTitle>
                    </div>
                    <span data-tour={index === 0 ? "client-status-badge" : undefined}>
                      {getStatusBadge(client.status)}
                    </span>
                  </div>
                  <CardDescription className="space-y-1 mt-3">
                    <div className="flex items-center space-x-2 text-sm">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{client.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="w-4 h-4" />
                      <span>{client.phone}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-primary/5 rounded-lg">
                        <Activity className="w-5 h-5 mx-auto text-primary mb-1" />
                        <div className="text-sm font-bold" data-testid={`text-transcriptions-${client.id}`}>
                          {client.totalTranscriptions}
                        </div>
                        <div className="text-xs text-muted-foreground">Transcrições</div>
                      </div>
                      <div className="text-center p-3 bg-secondary/5 rounded-lg">
                        <MessageCircle className="w-5 h-5 mx-auto text-secondary mb-1" />
                        <div className="text-sm font-bold" data-testid={`text-conversations-${client.id}`}>
                          {client.conversationsCount}
                        </div>
                        <div className="text-xs text-muted-foreground">Conversas</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Plano: <span className="font-medium">{client.plan}</span></span>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{client.lastContact}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleWhatsApp(client.phone)}
                        className="touch-manipulation active:scale-95"
                      >
                        <MessageCircle className="w-4 h-4 mr-1.5" />
                        WhatsApp
                      </Button>
                      <Button 
                        size="sm" 
                        variant="default" 
                        onClick={() => openClientDetails(client)} 
                        data-testid={`button-view-${client.id}`}
                        className="touch-manipulation active:scale-95"
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="glass-card border-border/20" data-tour="clients-stats">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Resumo dos Clientes</CardTitle>
            <CardDescription>Estatísticas gerais da sua base de clientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "grid gap-4 md:gap-6",
              isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-4"
            )}>
              <div className="text-center p-3 md:p-0">
                <div className="text-2xl md:text-3xl font-black gradient-text" data-testid="text-total-clients">
                  {filteredClients.length}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground mt-1">Total de Clientes</div>
              </div>
              <div className="text-center p-3 md:p-0">
                <div className="text-2xl md:text-3xl font-black gradient-text" data-testid="text-active-clients">
                  {filteredClients.filter(c => c.status === 'active').length}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground mt-1">Clientes Ativos</div>
              </div>
              <div className="text-center p-3 md:p-0">
                <div className="text-2xl md:text-3xl font-black gradient-text" data-testid="text-total-transcriptions">
                  {filteredClients.reduce((sum, c) => sum + (c.totalTranscriptions || 0), 0)}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground mt-1">Total de Transcrições</div>
              </div>
              <div className="text-center p-3 md:p-0">
                <div className="text-2xl md:text-3xl font-black gradient-text" data-testid="text-total-conversations">
                  {filteredClients.reduce((sum, c) => sum + c.conversationsCount, 0)}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground mt-1">Total de Conversas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isMobile && <BottomNav />}

      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className={cn(
          "overflow-y-auto",
          isMobile ? "max-w-[95vw] max-h-[85vh] p-4" : "max-w-6xl max-h-[90vh]"
        )} aria-describedby="client-details-description">
          <DialogHeader>
            <DialogTitle className={cn(
              "font-bold gradient-text",
              isMobile ? "text-xl" : "text-2xl"
            )}>
              Detalhes Completos do Cliente
            </DialogTitle>
            <p id="client-details-description" className="text-sm text-muted-foreground">
              Visualização completa dos dados do cliente, incluindo conversações, transcrições e resumos estruturados
            </p>
          </DialogHeader>
          
          {selectedClient && (
            <div className={cn(
              "grid gap-4 md:gap-6 mt-4",
              isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
            )}>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
                    <User className="w-5 h-5" />
                    <span>Informações Pessoais</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
                    <Clock className="w-5 h-5" />
                    <span>Histórico de Contato</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
                    <Video className="w-5 h-5" />
                    <span>Informações de Reunião</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
                    <Activity className="w-5 h-5" />
                    <span>Estatísticas de Atividade</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
                    <Database className="w-5 h-5" />
                    <span>Disponibilidade de Dados</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
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
                </CardContent>
              </Card>

              <Card className={cn(isMobile ? "col-span-1" : "lg:col-span-2")}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
                    <MessageCircle className="w-5 h-5" />
                    <span>Conversação Completa</span>
                    <Badge variant="outline">{selectedClient.total_mensagens_chat} mensagens</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "overflow-y-auto bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/30 p-3 md:p-4 rounded-lg border",
                    isMobile ? "max-h-64" : "max-h-96"
                  )}>
                    {selectedClient && selectedClient.todas_mensagens_chat ? (
                      <div className="space-y-3 md:space-y-4">
                        {formatWhatsAppMessages(selectedClient).map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.isClient ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={cn(
                                "p-2.5 md:p-3 rounded-lg shadow-sm",
                                isMobile ? "max-w-[85%]" : "max-w-[80%]",
                                message.isClient
                                  ? 'bg-blue-500 text-white rounded-br-none border-blue-600'
                                  : 'bg-green-500 text-white rounded-bl-none border-green-600'
                              )}
                            >
                              <div className="space-y-1.5 md:space-y-2">
                                <div className="flex items-center space-x-2">
                                  {message.isClient ? (
                                    <UserIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-100" />
                                  ) : (
                                    <Bot className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-100" />
                                  )}
                                  <span className={cn(
                                    "font-medium",
                                    isMobile ? "text-xs" : "text-xs",
                                    message.isClient ? 'text-blue-100' : 'text-green-100'
                                  )}>
                                    {message.sender}
                                  </span>
                                </div>
                                <p className={cn(
                                  "break-words",
                                  isMobile ? "text-sm" : "text-sm md:text-base"
                                )}>
                                  {message.text}
                                </p>
                                <span className={cn(
                                  "block text-right",
                                  isMobile ? "text-[10px]" : "text-xs",
                                  message.isClient ? 'text-blue-100/80' : 'text-green-100/80'
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
                </CardContent>
              </Card>

            </div>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
};

export default ClientPage;
