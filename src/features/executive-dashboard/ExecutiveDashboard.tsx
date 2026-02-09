import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart3,
  TrendingUp,
  MessageCircle,
  DollarSign,
  Clock,
  ArrowUpRight,
  Users,
  Calendar,
  Settings,
  Shield,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  Activity,
  Zap,
  TrendingDown
} from 'lucide-react';
import { BottomNav } from '@/components/mobile/BottomNav';
import { HorizontalScrollCards, ScrollCard } from '@/components/mobile/HorizontalScrollCards';
import { MobileMetricsCards } from '@/components/mobile/MobileMetricsCards';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

/**
 * ExecutiveDashboard - Feature Module Compartilhada
 * 
 * Dashboard executivo com métricas de negócio, conexões e automação.
 * Usado tanto na página /formulario quanto mantido como referência.
 * 
 * IMPORTANTE: Este é o dashboard executivo ORIGINAL.
 * Preservado para uso na nova página "Formulário".
 */
const ExecutiveDashboard = () => {
  const { user, client, credentials } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Estados para gerenciamento das conexões e dados
  const [dashboardData, setDashboardData] = useState(null as any);
  const [dataSource, setDataSource] = useState('mock');
  const queryClientInstance = useQueryClient();

  // Use useQuery para buscar conexões com auto-update
  const { data: connectionsResponse, isLoading: isUpdating, refetch: refetchConnections } = useQuery({
    queryKey: ['/api/test-connections'],
    staleTime: 30000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Query para buscar dados do dashboard
  const { data: dashboardResponse, isLoading: isDashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['/api/dashboard/dashboard-data'],
    staleTime: 30000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Query para buscar eventos do calendário
  const { data: calendarResponse, isLoading: isCalendarLoading, refetch: refetchCalendar } = useQuery({
    queryKey: ['/api/dashboard/calendar-events'],
    staleTime: 30000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Estado derivado das conexões com useMemo para evitar temporal dead zone
  const connectionStatus = React.useMemo(() => {
    if (connectionsResponse?.success && connectionsResponse?.connections) {
      return {
        supabase: connectionsResponse.connections.supabase || { status: 'unknown', message: '', hasCredentials: false },
        google_calendar: connectionsResponse.connections.google_calendar || { status: 'unknown', message: '', hasCredentials: false },
        whatsapp: connectionsResponse.connections.whatsapp || { status: 'unknown', message: '', hasCredentials: false },
        overall_status: connectionsResponse.connections.overall_status || 'unknown',
        last_updated: connectionsResponse.connections.timestamp || null
      };
    }
    
    return {
      supabase: { status: 'unknown', message: '', hasCredentials: false },
      google_calendar: { status: 'unknown', message: '', hasCredentials: false },
      whatsapp: { status: 'unknown', message: '', hasCredentials: false },
      overall_status: 'unknown',
      last_updated: null as string | null
    };
  }, [connectionsResponse]);

  // Query para status da automação
  const { data: automationStatusResponse, isLoading: isLoadingAutomationStatus, refetch: refetchAutomationStatus } = useQuery({
    queryKey: ['/api/automation/status'],
    staleTime: 30000,
    refetchInterval: 60000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
  });

  // Query para detecção automática de novos clientes
  const { data: newClientsResponse, isLoading: isCheckingNewClients, refetch: refetchNewClients } = useQuery({
    queryKey: ['/api/check-new-clients'],
    staleTime: 0,
    refetchInterval: 60000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    enabled: false,
  });

  // Processar dados do dashboard quando a resposta muda
  useEffect(() => {
    if (dashboardResponse?.success && dashboardResponse?.data) {
      setDashboardData(dashboardResponse.data);
      setDataSource(dashboardResponse.source || 'supabase');
      console.log(`Dashboard data carregados: ${dashboardResponse.source || 'supabase'}, registros: ${dashboardResponse.data.length}`);
      
      toast({
        title: "Dados do dashboard atualizados!",
        description: `${dashboardResponse.data.length} registros carregados do ${dashboardResponse.source || 'supabase'}`,
        duration: 5000,
      });
    } else if (dashboardResponse?.success && dashboardResponse?.data?.length === 0) {
      setDashboardData([]);
      setDataSource(dashboardResponse.source || 'supabase');
      console.log('Dashboard conectado mas sem dados');
    }
  }, [dashboardResponse, toast]);

  // Processar status das conexões
  useEffect(() => {
    if (connectionsResponse?.success) {
      console.log('Status das conexões atualizado:', connectionsResponse);
    }
  }, [connectionsResponse]);

  // Processar detecção de novos clientes
  useEffect(() => {
    if (newClientsResponse?.success && newClientsResponse?.detection) {
      const { newClientsCount, newClients, source } = newClientsResponse.detection;
      const { results, successCount, errorCount } = newClientsResponse.processing;
      
      console.log(`🔍 Verificação de novos clientes concluída:`, {
        novos: newClientsCount,
        fonte: source,
        processamento: { sucessos: successCount, erros: errorCount }
      });
      
      if (newClientsCount > 0) {
        const clientsNames = newClients.map(c => c.nome_completo).join(', ');
        
        toast({
          title: `🎉 ${newClientsCount} novo(s) cliente(s) detectado(s)!`,
          description: `${clientsNames}. ${successCount > 0 ? `${successCount} reunião(ões) criada(s) automaticamente.` : 'Verifique as configurações do Google Calendar.'}`,
          duration: 8000,
        });
        
        queryClientInstance.invalidateQueries({ queryKey: ['/api/dashboard/dashboard-data'] });
        
        if (results && results.length > 0) {
          results.forEach(result => {
            if (result.success && result.calendarEvent) {
              console.log(`✅ Reunião criada para ${result.client.nome_completo}:`, result.calendarEvent.summary);
            } else if (!result.success) {
              console.warn(`❌ Erro ao processar ${result.client.nome_completo}:`, result.error);
            }
          });
        }
      }
    }
  }, [newClientsResponse, toast, queryClientInstance]);

  // Função para atualizar conexões manualmente
  const updateConnections = async () => {
    await refetchConnections();
    await refetchDashboard();
    await refetchCalendar();
    await refetchNewClients();
  };

  // Função para obter ícone de status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'partial':
        return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
      case 'error':
        return <WifiOff className="w-3 h-3 text-red-500" />;
      default:
        return <WifiOff className="w-3 h-3 text-gray-400" />;
    }
  };

  // Função para obter cor do badge por status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'connected':
        return 'default';
      case 'partial':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Função para calcular métricas baseadas em dados reais
  const calculateRealMetrics = (data: any[]) => {
    if (!data || data.length === 0) return null;
    
    const totalClients = data.length;
    const activeClients = data.filter(item => item.ativo).length;
    const totalMessages = data.reduce((sum, item) => sum + (item.total_mensagens_chat || 0), 0);
    const avgResponseTime = data.filter(item => item.ultimo_contato && item.primeiro_contato)
      .reduce((sum, item) => {
        const first = new Date(item.primeiro_contato);
        const last = new Date(item.ultimo_contato);
        return sum + (last.getTime() - first.getTime());
      }, 0) / totalClients;
    
    return [
      {
        title: 'Clientes Ativos',
        value: activeClients.toString(),
        change: `${Math.round((activeClients / totalClients) * 100)}%`,
        description: 'dos clientes totais',
        icon: MessageCircle,
        color: 'text-blue-500'
      },
      {
        title: 'Total de Mensagens',
        value: totalMessages.toString(),
        change: `+${Math.round(totalMessages / totalClients)}`,
        description: 'média por cliente',
        icon: TrendingUp,
        color: 'text-green-500'
      },
      {
        title: 'Clientes Cadastrados',
        value: totalClients.toString(),
        change: '+100%',
        description: 'base de dados',
        icon: DollarSign,
        color: 'text-secondary'
      },
      {
        title: 'Tempo Médio',
        value: `${Math.round(avgResponseTime / (1000 * 60 * 60))}h`,
        change: '-25%',
        description: 'tempo de ciclo',
        icon: Clock,
        color: 'text-primary'
      }
    ];
  };

  const isUsingRealData = dataSource && (dataSource.includes('supabase') || dataSource === 'real_data') && dashboardData && Array.isArray(dashboardData) && dashboardData.length > 0;
  const currentMetrics = isUsingRealData ? calculateRealMetrics(dashboardData) : null;

  // Dados mock para o dashboard
  const metrics = [
    {
      title: 'Conversas Hoje',
      value: '156',
      change: '+23%',
      description: 'vs ontem',
      icon: MessageCircle,
      color: 'text-blue-500'
    },
    {
      title: 'Taxa de Conversão',
      value: '27.4%',
      change: '+12%',
      description: 'vs semana passada',
      icon: TrendingUp,
      color: 'text-green-500'
    },
    {
      title: 'Clientes Ativos',
      value: '24',
      change: '+8%',
      description: 'vs mês anterior',
      icon: Users,
      color: 'text-secondary'
    },
    {
      title: 'Tempo de Resposta',
      value: '2.3s',
      change: '-15%',
      description: 'média atual',
      icon: Clock,
      color: 'text-primary'
    }
  ];

  const recentActivities = [
    {
      title: 'Nova conversa iniciada',
      description: 'Cliente interessado em consultoria',
      time: '5 min atrás',
      type: 'conversation'
    },
    {
      title: 'Reunião agendada',
      description: 'Reunião com Dr. Silva para amanhã',
      time: '15 min atrás',
      type: 'calendar'
    },
    {
      title: 'Cliente respondeu',
      description: 'Resposta positiva para proposta',
      time: '1 hora atrás',
      type: 'conversation'
    },
    {
      title: 'Novo lead qualificado',
      description: 'Lead com alto potencial identificado',
      time: '2 horas atrás',
      type: 'lead'
    }
  ];

  const [isAutomationOpen, setIsAutomationOpen] = React.useState(!isMobile);

  return (
    <>
      {isMobile && (
        <div className="px-4 pb-2 pt-0">
          <h1 className="text-xl font-bold text-foreground truncate">Dashboard Executivo</h1>
        </div>
      )}

      <div className={cn(
        "relative z-10 container mx-auto space-y-6 lg:space-y-8 animate-fade-in",
        isMobile ? "px-0 pb-20" : "px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8 pt-8"
      )}>
        
        {/* Welcome Header - Hidden on mobile, shown on desktop */}
        <div className={cn("space-y-4 pt-4", isMobile ? "hidden" : "block")}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black text-foreground tracking-tight gradient-text">
                Bem-vindo, {user?.name}
              </h1>
              <p className="text-xl text-muted-foreground/80 mt-2">
                Dashboard executivo para {client?.name}
              </p>
            </div>
            
            <Button 
              onClick={updateConnections}
              disabled={isUpdating}
              className="flex items-center space-x-2 min-w-fit"
              data-testid="button-update-data"
            >
              <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isUpdating ? 'Atualizando...' : 'Atualizar Dados'}</span>
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="px-3 py-1">
              <Shield className="w-3 h-3 mr-1" />
              Plano {client?.plan_type?.toUpperCase()}
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              {user?.role === 'admin' ? 'Administrador' : 'Visualizador'}
            </Badge>
            
            {/* Status das Conexões */}
            <div className="flex items-center space-x-2 ml-2">
              <Badge 
                variant={getStatusBadgeVariant(connectionStatus?.supabase?.status || 'unknown')} 
                className="px-2 py-1 text-xs"
                data-testid="badge-supabase-status"
              >
                {getStatusIcon(connectionStatus?.supabase?.status || 'unknown')}
                <span className="ml-1">Supabase</span>
              </Badge>
              
              <Badge 
                variant={getStatusBadgeVariant(connectionStatus?.google_calendar?.status || 'unknown')} 
                className="px-2 py-1 text-xs"
                data-testid="badge-calendar-status"
              >
                {getStatusIcon(connectionStatus?.google_calendar?.status || 'unknown')}
                <span className="ml-1">Calendar</span>
              </Badge>
              
              <Badge 
                variant={getStatusBadgeVariant(connectionStatus?.whatsapp?.status || 'unknown')} 
                className="px-2 py-1 text-xs"
                data-testid="badge-whatsapp-status"
              >
                {getStatusIcon(connectionStatus?.whatsapp?.status || 'unknown')}
                <span className="ml-1">WhatsApp</span>
              </Badge>
            </div>
          </div>
          
          {/* Indicador de fonte de dados */}
          {dataSource && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              {isUsingRealData ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span>Dados em tempo real conectados ({dataSource})</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-orange-500" />
                  <span>Exibindo dados de demonstração ({dataSource})</span>
                </>
              )}
              {connectionStatus?.last_updated && (
                <span className="text-xs">• Última atualização: {new Date(connectionStatus.last_updated).toLocaleTimeString('pt-BR')}</span>
              )}
            </div>
          )}
        </div>

        {/* Status da Automação */}
        <Collapsible 
          open={isAutomationOpen} 
          onOpenChange={setIsAutomationOpen}
          className={cn(isMobile && "mx-4")}
        >
          <Card className="glass-card border-border/20">
            <CollapsibleTrigger asChild>
              <CardHeader className={cn(
                "cursor-pointer transition-colors hover:bg-muted/5",
                isMobile && "p-4"
              )}>
                <CardTitle className={cn(
                  "flex items-center justify-between",
                  isMobile ? "text-base" : "text-xl"
                )}>
                  <div className="flex items-center space-x-2">
                    <Activity className={cn(
                      "text-secondary",
                      isMobile ? "w-4 h-4" : "w-5 h-5"
                    )} />
                    <span>Status da Automação</span>
                  </div>
                  {isMobile && (
                    <ChevronDown className={cn(
                      "w-5 h-5 transition-transform duration-200",
                      isAutomationOpen && "rotate-180"
                    )} />
                  )}
                </CardTitle>
                <CardDescription className={cn(isMobile ? "text-xs" : "text-sm")}>
                  Sistema automático de detecção de novos clientes
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className={cn(isMobile && "p-4 pt-0")}>
            {isLoadingAutomationStatus ? (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Carregando status da automação...</span>
              </div>
            ) : automationStatusResponse?.success ? (
              <div className="space-y-4">
                {/* Status Geral */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                  <div className="flex items-center space-x-3">
                    {automationStatusResponse.automation.isRunning ? (
                      <Play className="w-5 h-5 text-green-500" />
                    ) : (
                      <Pause className="w-5 h-5 text-orange-500" />
                    )}
                    <div>
                      <div className="font-medium">
                        {automationStatusResponse.automation.isRunning ? 'Automação Ativa' : 'Automação Parada'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Verificação a cada {automationStatusResponse.automation.settings.detectionIntervalMinutes} minutos
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant={automationStatusResponse.automation.isRunning ? 'default' : 'secondary'}
                    className="px-3 py-1"
                  >
                    {automationStatusResponse.automation.isRunning ? 'RODANDO' : 'PARADO'}
                  </Badge>
                </div>

                {/* Estatísticas Globais */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-primary/5">
                    <div className="text-2xl font-bold text-primary">
                      {automationStatusResponse.automation.globalStats.totalExecutions}
                    </div>
                    <div className="text-sm text-muted-foreground">Execuções Totais</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-500/5">
                    <div className="text-2xl font-bold text-green-600">
                      {automationStatusResponse.automation.globalStats.totalNewClientsDetected}
                    </div>
                    <div className="text-sm text-muted-foreground">Novos Clientes</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-500/5">
                    <div className="text-2xl font-bold text-blue-600">
                      {automationStatusResponse.automation.globalStats.totalEventsCreated}
                    </div>
                    <div className="text-sm text-muted-foreground">Eventos Criados</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-500/5">
                    <div className="text-2xl font-bold text-red-600">
                      {automationStatusResponse.automation.globalStats.totalErrors}
                    </div>
                    <div className="text-sm text-muted-foreground">Erros</div>
                  </div>
                </div>

                {/* Status por Cliente */}
                {Object.entries(automationStatusResponse.automation.clientExecutions).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Status por Tenant</h4>
                    {Object.entries(automationStatusResponse.automation.clientExecutions).map(([key, execution]: [string, any]) => (
                      <div key={key} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center space-x-3">
                          <Badge variant={
                            execution.status === 'running' ? 'default' : 
                            execution.status === 'error' ? 'destructive' : 'secondary'
                          }>
                            {execution.status}
                          </Badge>
                          <div>
                            <div className="font-medium text-sm">
                              Cliente {execution.clientId} / Tenant {execution.tenantId}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Última execução: {execution.lastRun ? new Date(execution.lastRun).toLocaleString('pt-BR') : 'Nunca'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>Execuções: {execution.totalExecutions}</div>
                          <div>Novos: {execution.totalNewClientsDetected}</div>
                          <div>Eventos: {execution.totalEventsCreated}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Última Execução */}
                {automationStatusResponse.automation.lastExecution && (
                  <div className="p-3 rounded-lg bg-muted/10 border">
                    <h4 className="font-medium text-sm mb-2">Última Execução</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Horário:</span>{' '}
                        <span className="font-medium">
                          {new Date(automationStatusResponse.automation.lastExecution.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Novos Clientes:</span>{' '}
                        <span className="font-medium text-green-600">
                          {automationStatusResponse.automation.lastExecution.newClientsCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Eventos Criados:</span>{' '}
                        <span className="font-medium text-blue-600">
                          {automationStatusResponse.automation.lastExecution.eventsCreated}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>{' '}
                        <Badge variant={automationStatusResponse.automation.lastExecution.status === 'success' ? 'default' : 'destructive'} className="ml-1">
                          {automationStatusResponse.automation.lastExecution.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Próxima Execução */}
                {automationStatusResponse.automation.nextExecution && (
                  <div className="text-sm text-muted-foreground text-center">
                    Próxima execução em aproximadamente{' '}
                    <span className="font-medium text-foreground">
                      {Math.ceil((new Date(automationStatusResponse.automation.nextExecution).getTime() - Date.now()) / (1000 * 60))} minutos
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span>Não foi possível carregar o status da automação</span>
              </div>
            )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Metrics Cards */}
        {isMobile ? (
          <MobileMetricsCards metrics={currentMetrics || metrics} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {(currentMetrics || metrics).map((metric, index) => {
              const Icon = metric.icon;
              return (
                <Card key={index} className="glass-card hover-scale border-border/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground/90">
                      {metric.title}
                    </CardTitle>
                    <Icon className={`h-5 w-5 ${metric.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black tracking-tight gradient-text">
                      {metric.value}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground/80 mt-2">
                      <span className="text-green-600 font-semibold">{metric.change}</span>
                      <span>{metric.description}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Charts Row */}
        <div className={cn(
          "grid gap-4",
          isMobile ? "grid-cols-1 mx-4" : "md:grid-cols-2 lg:grid-cols-3"
        )}>
          <Card className="glass-card border-border/20">
            <CardHeader>
              <CardTitle className={cn(isMobile ? "text-base" : "text-xl")}>
                Atividades Recentes
              </CardTitle>
              <CardDescription className={cn(isMobile ? "text-xs" : "text-sm")}>
                Últimas interações e eventos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 pb-3 border-b border-border/20 last:border-0 last:pb-0">
                    <div className="p-2 rounded-lg bg-primary/5">
                      {activity.type === 'conversation' && <MessageCircle className="w-4 h-4 text-primary" />}
                      {activity.type === 'calendar' && <Calendar className="w-4 h-4 text-green-500" />}
                      {activity.type === 'lead' && <Users className="w-4 h-4 text-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium text-foreground/90 truncate",
                        isMobile ? "text-sm" : "text-base"
                      )}>
                        {activity.title}
                      </p>
                      <p className={cn(
                        "text-muted-foreground/80 truncate",
                        isMobile ? "text-xs" : "text-sm"
                      )}>
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/20">
            <CardHeader>
              <CardTitle className={cn(isMobile ? "text-base" : "text-xl")}>
                Performance
              </CardTitle>
              <CardDescription className={cn(isMobile ? "text-xs" : "text-sm")}>
                Métricas de desempenho do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-muted-foreground",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    Taxa de resposta
                  </span>
                  <span className={cn(
                    "font-semibold",
                    isMobile ? "text-sm" : "text-base"
                  )}>
                    98.5%
                  </span>
                </div>
                <div className="w-full bg-muted/20 rounded-full h-2">
                  <div className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full" style={{ width: '98.5%' }} />
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className={cn(
                    "text-muted-foreground",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    Satisfação do cliente
                  </span>
                  <span className={cn(
                    "font-semibold",
                    isMobile ? "text-sm" : "text-base"
                  )}>
                    94.2%
                  </span>
                </div>
                <div className="w-full bg-muted/20 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full" style={{ width: '94.2%' }} />
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className={cn(
                    "text-muted-foreground",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    Automação ativa
                  </span>
                  <span className={cn(
                    "font-semibold",
                    isMobile ? "text-sm" : "text-base"
                  )}>
                    87.0%
                  </span>
                </div>
                <div className="w-full bg-muted/20 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full" style={{ width: '87%' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/20">
            <CardHeader>
              <CardTitle className={cn(isMobile ? "text-base" : "text-xl")}>
                Conexões do Sistema
              </CardTitle>
              <CardDescription className={cn(isMobile ? "text-xs" : "text-sm")}>
                Status das integrações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/10">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(connectionStatus?.supabase?.status || 'unknown')}
                    <span className={cn(
                      "font-medium",
                      isMobile ? "text-xs" : "text-sm"
                    )}>
                      Supabase
                    </span>
                  </div>
                  <Badge variant={getStatusBadgeVariant(connectionStatus?.supabase?.status || 'unknown')} className="text-xs">
                    {connectionStatus?.supabase?.status || 'unknown'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/10">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(connectionStatus?.google_calendar?.status || 'unknown')}
                    <span className={cn(
                      "font-medium",
                      isMobile ? "text-xs" : "text-sm"
                    )}>
                      Google Calendar
                    </span>
                  </div>
                  <Badge variant={getStatusBadgeVariant(connectionStatus?.google_calendar?.status || 'unknown')} className="text-xs">
                    {connectionStatus?.google_calendar?.status || 'unknown'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/10">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(connectionStatus?.whatsapp?.status || 'unknown')}
                    <span className={cn(
                      "font-medium",
                      isMobile ? "text-xs" : "text-sm"
                    )}>
                      WhatsApp
                    </span>
                  </div>
                  <Badge variant={getStatusBadgeVariant(connectionStatus?.whatsapp?.status || 'unknown')} className="text-xs">
                    {connectionStatus?.whatsapp?.status || 'unknown'}
                  </Badge>
                </div>

                <Button 
                  variant="outline" 
                  className={cn(
                    "w-full mt-4",
                    isMobile ? "text-xs h-9" : "text-sm"
                  )}
                  onClick={() => navigate('/config')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Gerenciar Conexões
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Adicionar margem inferior extra no mobile para o BottomNav */}
        {isMobile && <div className="h-4" />}
      </div>
    </>
  );
};

export default ExecutiveDashboard;
