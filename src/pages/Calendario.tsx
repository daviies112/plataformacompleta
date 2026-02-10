import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Video, Clock, User, Calendar as CalendarIcon, Loader2, Plus, ExternalLink, RefreshCw, XCircle, CalendarClock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getSupabaseClient } from "@/lib/supabase";
import { apiRequest } from "@/lib/queryClient";

interface Reuniao {
  id: string;
  tenantId: string;
  usuarioId: string | null;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  titulo: string | null;
  descricao: string | null;
  dataInicio: string;
  dataFim: string;
  duracao: number | null;
  roomId100ms: string | null;
  roomCode100ms: string | null;
  linkReuniao: string | null;
  status: string;
  participantes: any[];
  gravacaoUrl: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string | null;
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  duration?: number;
  isAllDay: boolean;
  type: 'meeting' | 'workspace' | 'ical';
  client?: string;
  status?: string;
  location?: string;
  meetLink?: string;
  source: string;
}

export default function CalendarioPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Reuniao | null>(null);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const cancelMeetingMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const response = await apiRequest('DELETE', `/api/reunioes/${meetingId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Reunião cancelada',
        description: 'A reunião foi cancelada com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['reunioes-calendario'] });
      setSelectedMeeting(null);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao cancelar',
        description: error.message || 'Não foi possível cancelar a reunião.',
      });
    },
  });

  const rescheduleMeetingMutation = useMutation({
    mutationFn: async ({ meetingId, dataInicio }: { meetingId: string; dataInicio: string }) => {
      const response = await apiRequest('PATCH', `/api/reunioes/${meetingId}`, {
        dataInicio,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Reunião reagendada',
        description: 'A reunião foi reagendada com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['reunioes-calendario'] });
      setSelectedMeeting(null);
      setShowRescheduleDialog(false);
      setRescheduleDate('');
      setRescheduleTime('');
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao reagendar',
        description: error.message || 'Não foi possível reagendar a reunião.',
      });
    },
  });

  const handleCancelMeeting = (meetingId: string) => {
    cancelMeetingMutation.mutate(meetingId);
  };

  const handleRescheduleMeeting = () => {
    if (!selectedMeeting || !rescheduleDate || !rescheduleTime) {
      toast({
        variant: 'destructive',
        title: 'Dados incompletos',
        description: 'Por favor, selecione a nova data e horário.',
      });
      return;
    }
    
    const newDateTime = new Date(`${rescheduleDate}T${rescheduleTime}`);
    if (isNaN(newDateTime.getTime())) {
      toast({
        variant: 'destructive',
        title: 'Data inválida',
        description: 'Por favor, verifique a data e horário selecionados.',
      });
      return;
    }

    rescheduleMeetingMutation.mutate({
      meetingId: selectedMeeting.id,
      dataInicio: newDateTime.toISOString(),
    });
  };

  const openRescheduleDialog = () => {
    if (selectedMeeting) {
      const date = parseISO(selectedMeeting.dataInicio);
      setRescheduleDate(format(date, 'yyyy-MM-dd'));
      setRescheduleTime(format(date, 'HH:mm'));
      setShowRescheduleDialog(true);
    }
  };

  // Buscar todos os eventos do calendário (reuniões + tarefas workspace)
  const { data: calendarEvents = [], isLoading: isLoadingEvents, refetch: refetchEvents } = useQuery<CalendarEvent[]>({
    queryKey: ['/api/dashboard/calendar-events'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/dashboard/calendar-events', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          console.log('[Calendario] Eventos recebidos:', data.events?.length || 0);
          return data.events || [];
        }
      } catch (err) {
        console.warn('[Calendario] Erro ao buscar eventos:', err);
      }
      return [];
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Buscar reuniões diretamente do Supabase para detalhes extras
  const { data: reunioes = [], isLoading: isLoadingReunioes, error, refetch } = useQuery<Reuniao[]>({
    queryKey: ['reunioes-calendario', format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      try {
        const supabase = await getSupabaseClient();
        if (supabase) {
          const monthStart = startOfMonth(currentMonth);
          const monthEnd = endOfMonth(currentMonth);
          
          console.log('[Calendario] Buscando reuniões do Supabase para', format(currentMonth, 'MMMM yyyy', { locale: ptBR }));
          
          const { data, error: sbError } = await supabase
            .from('reunioes')
            .select('*')
            .gte('data_inicio', monthStart.toISOString())
            .lte('data_inicio', monthEnd.toISOString())
            .order('data_inicio', { ascending: true });

          if (!sbError && data) {
            console.log('[Calendario] Encontradas', data.length, 'reuniões no Supabase');
            return data.map((r: any) => ({
              id: r.id,
              tenantId: r.tenant_id,
              usuarioId: r.usuario_id,
              nome: r.nome,
              email: r.email,
              telefone: r.telefone,
              titulo: r.titulo,
              descricao: r.descricao,
              dataInicio: r.data_inicio,
              dataFim: r.data_fim,
              duracao: r.duracao,
              roomId100ms: r.room_id_100ms,
              roomCode100ms: r.room_code_100ms,
              linkReuniao: r.link_reuniao,
              status: r.status,
              participantes: r.participantes || [],
              gravacaoUrl: r.gravacao_url,
              metadata: r.metadata,
              createdAt: r.created_at,
              updatedAt: r.updated_at,
            }));
          }
        }
      } catch (sbErr) {
        console.warn('[Calendario] Erro ao acessar Supabase:', sbErr);
      }

      try {
        const res = await fetch('/api/reunioes', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const meetings = Array.isArray(data) ? data : (data.data || []);
          const monthStart = startOfMonth(currentMonth);
          const monthEnd = endOfMonth(currentMonth);
          return meetings.filter((m: any) => {
            const meetingDate = new Date(m.dataInicio);
            return meetingDate >= monthStart && meetingDate <= monthEnd;
          });
        }
      } catch (apiError) {
        console.warn('[Calendario] Erro na API local:', apiError);
      }
      return [];
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const isLoading = isLoadingEvents || isLoadingReunioes;

  // Supabase Realtime Subscription
  useEffect(() => {
    let channel: any;
    const monthKey = format(currentMonth, 'yyyy-MM');

    const setupRealtime = async () => {
      try {
        const supabase = await getSupabaseClient();
        if (!supabase) {
          console.log('[Calendario] Supabase não disponível para realtime');
          return;
        }

        console.log("[Calendario] Configurando Supabase Realtime para 'reunioes'...");
        
        // Remover canais antigos antes de criar um novo para evitar duplicatas
        supabase.removeAllChannels();

        channel = supabase
          .channel('reunioes-calendario-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'reunioes'
            },
            async (payload: any) => {
              console.log('[Calendario] Mudança detectada em reunioes:', payload.eventType, payload.new?.id || payload.old?.id);
              
              // Verificação adicional para garantir que o payload contenha dados válidos
              const meetingId = payload.new?.id || payload.old?.id;
              
              // Invalidar todas as queries de calendário para garantir atualização
              // Usamos invalidateQueries em vez de apenas refetch para garantir que qualquer componente que use esses dados seja atualizado
              await queryClient.invalidateQueries({ 
                queryKey: ['reunioes-calendario'],
                exact: false 
              });
              
              // Invalidar também queries globais de eventos de calendário se existirem
              await queryClient.invalidateQueries({ 
                queryKey: ["/api/dashboard/calendar-events"],
                exact: false
              });
              
              // Trigger refetch imediato para a query atual
              refetch();

              const eventMessages: Record<string, string> = {
                'INSERT': 'criada',
                'UPDATE': 'atualizada', 
                'DELETE': 'removida'
              };

              // Mostrar toast apenas se for uma mudança relevante (opcional, mas bom para UX)
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
                toast({
                  title: "Calendário atualizado",
                  description: `Uma reunião foi ${eventMessages[payload.eventType] || 'modificada'}.`,
                });
              }
            }
          )
          .subscribe((status: string) => {
            console.log("[Calendario] Realtime status:", status);
            if (status === 'SUBSCRIBED') {
              console.log('[Calendario] Inscrito em mudanças em tempo real!');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('[Calendario] Erro ao inscrever. Verifique se Replication está habilitado para tabela "reunioes".');
            }
          });
      } catch (err) {
        console.error("[Calendario] Erro ao configurar realtime:", err);
      }
    };

    setupRealtime();

    return () => {
      if (channel) {
        console.log('[Calendario] Desconectando do realtime');
        channel.unsubscribe();
      }
    };
  }, [queryClient, toast, currentMonth, refetch]);

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOfWeek = useMemo(() => {
    return startOfMonth(currentMonth).getDay();
  }, [currentMonth]);

  const meetingsByDate = useMemo(() => {
    const map = new Map<string, Reuniao[]>();
    reunioes.forEach((reuniao) => {
      const dateKey = format(parseISO(reuniao.dataInicio), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(reuniao);
    });
    return map;
  }, [reunioes]);

  // Mapa de eventos do workspace (tarefas com datas)
  const workspaceEventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    calendarEvents.forEach((event) => {
      // Filtrar apenas eventos de workspace (não reuniões para evitar duplicatas)
      if (event.type === 'workspace' || event.source?.includes('workspace')) {
        const dateKey = event.date;
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(event);
      }
    });
    return map;
  }, [calendarEvents]);

  // Mapa combinado de todos os eventos por data
  const allEventsByDate = useMemo(() => {
    const map = new Map<string, { meetings: Reuniao[], workspaceEvents: CalendarEvent[] }>();
    
    // Adicionar reuniões
    reunioes.forEach((reuniao) => {
      const dateKey = format(parseISO(reuniao.dataInicio), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, { meetings: [], workspaceEvents: [] });
      }
      map.get(dateKey)!.meetings.push(reuniao);
    });
    
    // Adicionar eventos do workspace
    calendarEvents.forEach((event) => {
      if (event.type === 'workspace' || event.source?.includes('workspace')) {
        const dateKey = event.date;
        if (!map.has(dateKey)) {
          map.set(dateKey, { meetings: [], workspaceEvents: [] });
        }
        map.get(dateKey)!.workspaceEvents.push(event);
      }
    });
    
    return map;
  }, [reunioes, calendarEvents]);

  const selectedDateMeetings = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return meetingsByDate.get(dateKey) || [];
  }, [selectedDate, meetingsByDate]);

  const selectedDateWorkspaceEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return workspaceEventsByDate.get(dateKey) || [];
  }, [selectedDate, workspaceEventsByDate]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendada':
        return <Badge variant="secondary">Agendada</Badge>;
      case 'em_andamento':
        return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">Em andamento</Badge>;
      case 'concluida':
        return <Badge variant="outline">Concluída</Badge>;
      case 'cancelada':
        return <Badge variant="destructive">Cancelada</Badge>;
      case 'reagendada':
        return <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-400">Reagendada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleJoinMeeting = (reuniao: Reuniao) => {
    if (reuniao.linkReuniao) {
      window.open(reuniao.linkReuniao, '_blank');
    } else {
      navigate(`/reuniao/${reuniao.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Carregando calendário...</span>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    console.error('[Calendario] Erro ao carregar reuniões:', error);
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4">
        <p className="text-destructive">Erro ao carregar reuniões</p>
        <p className="text-muted-foreground text-sm">Verifique se você está logado e tente novamente.</p>
        <Button onClick={() => refetch()}>Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Calendário</h1>
            <p className="text-muted-foreground">Visualize e gerencie suas reuniões agendadas.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-9 px-3"
            data-testid="button-refresh-calendario"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
        <Button onClick={() => navigate('/reuniao')} data-testid="button-nova-reuniao">
          <Plus className="mr-2 h-4 w-4" />
          Nova Reunião
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <CardTitle className="text-lg font-medium">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                data-testid="button-prev-month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
                data-testid="button-today"
              >
                Hoje
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                data-testid="button-next-month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div
                  key={day}
                  className="bg-muted/50 p-2 text-center text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
              
              {Array.from({ length: firstDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="bg-background p-2 min-h-[80px]" />
              ))}
              
              {daysInMonth.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayMeetings = meetingsByDate.get(dateKey) || [];
                const dayWorkspaceEvents = workspaceEventsByDate.get(dateKey) || [];
                const totalEvents = dayMeetings.length + dayWorkspaceEvents.length;
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      bg-background p-2 min-h-[80px] text-left transition-colors hover-elevate
                      ${isSelected ? 'ring-2 ring-primary ring-inset' : ''}
                      ${isToday ? 'bg-primary/5' : ''}
                    `}
                    data-testid={`calendar-day-${dateKey}`}
                  >
                    <span className={`
                      text-sm font-medium
                      ${isToday ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : ''}
                    `}>
                      {format(day, 'd')}
                    </span>
                    {dayMeetings.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {dayMeetings.slice(0, 2).map((meeting) => (
                          <div
                            key={meeting.id}
                            className="text-xs bg-primary/10 text-primary rounded px-1 py-0.5 truncate"
                          >
                            {format(parseISO(meeting.dataInicio), 'HH:mm')} {meeting.titulo || 'Reunião'}
                          </div>
                        ))}
                      </div>
                    )}
                    {dayWorkspaceEvents.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {dayWorkspaceEvents.slice(0, dayMeetings.length >= 2 ? 0 : 2 - dayMeetings.length).map((event) => (
                          <div
                            key={event.id}
                            className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded px-1 py-0.5 truncate"
                          >
                            {event.time !== '00:00' ? event.time : ''} {event.title.replace('📋 ', '').replace('📊 ', '')}
                          </div>
                        ))}
                      </div>
                    )}
                    {totalEvents > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{totalEvents - 2} mais
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              {selectedDate
                ? format(selectedDate, "d 'de' MMMM", { locale: ptBR })
                : 'Selecione uma data'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {!selectedDate ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                Clique em uma data no calendário para ver os eventos.
              </p>
            ) : (selectedDateMeetings.length === 0 && selectedDateWorkspaceEvents.length === 0) ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm mb-4">
                  Nenhum evento para esta data.
                </p>
                <Button variant="outline" size="sm" onClick={() => navigate('/reuniao')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agendar reunião
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateMeetings.map((reuniao) => (
                  <div
                    key={reuniao.id}
                    className="p-3 border rounded-lg space-y-2 hover-elevate"
                    data-testid={`meeting-card-${reuniao.id}`}
                  >
                    <div 
                      className="cursor-pointer"
                      onClick={() => setSelectedMeeting(reuniao)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium truncate">
                          {reuniao.titulo || 'Reunião sem título'}
                        </h4>
                        {getStatusBadge(reuniao.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(reuniao.dataInicio), 'HH:mm')} - {format(parseISO(reuniao.dataFim), 'HH:mm')}
                        </span>
                      </div>
                      {reuniao.nome && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <User className="h-3 w-3" />
                          {reuniao.nome}
                        </div>
                      )}
                    </div>
                    
                    {/* Botões de Ação Rápida */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        onClick={() => handleJoinMeeting(reuniao)}
                        disabled={reuniao.status === 'cancelada'}
                        className="flex-1"
                        data-testid={`button-entrar-quick-${reuniao.id}`}
                      >
                        <Video className="h-3 w-3 mr-1" />
                        Entrar
                      </Button>
                      
                      {reuniao.linkReuniao && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            navigator.clipboard.writeText(reuniao.linkReuniao!);
                            toast({ title: 'Link copiado!' });
                          }}
                          title="Copiar link"
                          data-testid={`button-copiar-quick-${reuniao.id}`}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                      
                      {reuniao.status !== 'cancelada' && reuniao.status !== 'concluida' && reuniao.status !== 'finalizada' && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedMeeting(reuniao);
                              setTimeout(() => openRescheduleDialog(), 100);
                            }}
                            title="Reagendar"
                            data-testid={`button-reagendar-quick-${reuniao.id}`}
                          >
                            <CalendarClock className="h-3 w-3" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                title="Cancelar"
                                data-testid={`button-cancelar-quick-${reuniao.id}`}
                              >
                                <XCircle className="h-3 w-3 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancelar Reunião</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja cancelar "{reuniao.titulo || 'esta reunião'}"? 
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Voltar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleCancelMeeting(reuniao.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {cancelMeetingMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                  )}
                                  Confirmar Cancelamento
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Eventos do Workspace */}
                {selectedDateWorkspaceEvents.length > 0 && (
                  <>
                    {selectedDateMeetings.length > 0 && (
                      <div className="border-t pt-3 mt-3">
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">Tarefas</h5>
                      </div>
                    )}
                    {selectedDateWorkspaceEvents.map((event) => (
                      <div
                        key={event.id}
                        className="p-3 border rounded-lg border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10"
                        data-testid={`workspace-event-${event.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm truncate text-purple-700 dark:text-purple-400">
                            {event.title.replace('📋 ', '').replace('📊 ', '')}
                          </h4>
                          <Badge variant="outline" className="text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700">
                            Tarefa
                          </Badge>
                        </div>
                        {event.time && event.time !== '00:00' && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                            <Clock className="h-3 w-3" />
                            {event.time}
                          </div>
                        )}
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {event.description}
                          </p>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 w-full"
                          onClick={() => navigate('/workspace')}
                        >
                          Ver no Workspace
                        </Button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedMeeting} onOpenChange={() => setSelectedMeeting(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              {selectedMeeting?.titulo || 'Detalhes da Reunião'}
            </DialogTitle>
            <DialogDescription>
              Informações sobre a reunião agendada
            </DialogDescription>
          </DialogHeader>
          
          {selectedMeeting && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Data</label>
                  <p className="font-medium">
                    {format(parseISO(selectedMeeting.dataInicio), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Horário</label>
                  <p className="font-medium">
                    {format(parseISO(selectedMeeting.dataInicio), 'HH:mm')} - {format(parseISO(selectedMeeting.dataFim), 'HH:mm')}
                  </p>
                </div>
              </div>
              
              {selectedMeeting.nome && (
                <div>
                  <label className="text-sm text-muted-foreground">Participante</label>
                  <p className="font-medium">{selectedMeeting.nome}</p>
                  {selectedMeeting.email && (
                    <p className="text-sm text-muted-foreground">{selectedMeeting.email}</p>
                  )}
                </div>
              )}
              
              {selectedMeeting.descricao && (
                <div>
                  <label className="text-sm text-muted-foreground">Descrição</label>
                  <p className="text-sm">{selectedMeeting.descricao}</p>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Status:</label>
                {getStatusBadge(selectedMeeting.status)}
              </div>
              
              <div className="flex flex-col gap-3 pt-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleJoinMeeting(selectedMeeting)}
                    className="flex-1"
                    disabled={selectedMeeting.status === 'cancelada'}
                    data-testid="button-entrar-reuniao"
                  >
                    <Video className="mr-2 h-4 w-4" />
                    Entrar na Reunião
                  </Button>
                  {selectedMeeting.linkReuniao && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedMeeting.linkReuniao!);
                        toast({ title: 'Link copiado!' });
                      }}
                      data-testid="button-copiar-link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {selectedMeeting.status !== 'cancelada' && selectedMeeting.status !== 'concluida' && (
                  <div className="flex gap-2 border-t pt-3">
                    <Button
                      variant="outline"
                      onClick={openRescheduleDialog}
                      className="flex-1"
                      data-testid="button-reagendar-reuniao"
                    >
                      <CalendarClock className="mr-2 h-4 w-4" />
                      Reagendar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          data-testid="button-cancelar-reuniao"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancelar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancelar Reunião</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja cancelar esta reunião? Esta ação não pode ser desfeita.
                            A sala de vídeo também será desativada.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Voltar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleCancelMeeting(selectedMeeting.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {cancelMeetingMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Confirmar Cancelamento
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Reagendar Reunião
            </DialogTitle>
            <DialogDescription>
              Escolha a nova data e horário para a reunião.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">Nova Data</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                data-testid="input-reschedule-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule-time">Novo Horário</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                data-testid="input-reschedule-time"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRescheduleMeeting}
              disabled={rescheduleMeetingMutation.isPending || !rescheduleDate || !rescheduleTime}
              data-testid="button-confirmar-reagendamento"
            >
              {rescheduleMeetingMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CalendarClock className="mr-2 h-4 w-4" />
              )}
              Confirmar Reagendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
