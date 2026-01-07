import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Video, Phone, Users, MapPin, Bell, Loader2, Play, Plus, RefreshCw, ExternalLink, CalendarCheck, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isToday, isTomorrow, isYesterday, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/mobile/BottomNav';
import { HorizontalScrollCards, ScrollCard } from '@/components/mobile/HorizontalScrollCards';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { CreateEventModal } from '@/components/calendar/CreateEventModal';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { useNotionStore } from '@/stores/notionStore';

const CalendarPage = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  
  // Zustand store para controlar workspace ativo
  const { setCurrentBoard, setCurrentDatabase } = useNotionStore();

  useEffect(() => {
    document.title = "Calendário de Reuniões | NEXUS Intelligence";
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Gerencie suas reuniões e compromissos conectados ao Google Calendar com a plataforma NEXUS Intelligence.');
    
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', 'Calendário de Reuniões | NEXUS Intelligence');
    
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescription);
    }
    ogDescription.setAttribute('content', 'Gerencie suas reuniões e compromissos conectados ao Google Calendar com a plataforma NEXUS Intelligence.');
    
    let ogType = document.querySelector('meta[property="og:type"]');
    if (!ogType) {
      ogType = document.createElement('meta');
      ogType.setAttribute('property', 'og:type');
      document.head.appendChild(ogType);
    }
    ogType.setAttribute('content', 'website');
    
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute('content', window.location.href);
  }, []);
  
  const { data: calendarData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/dashboard/calendar-events'],
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchInterval: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
  });

  // Listener para recarregar quando as credenciais do Supabase mudarem
  useEffect(() => {
    const handleSupabaseConfigChange = () => {
      console.log('[Calendar] Supabase config changed, refetching...');
      refetch();
    };

    window.addEventListener('supabase-config-changed', handleSupabaseConfigChange);
    return () => window.removeEventListener('supabase-config-changed', handleSupabaseConfigChange);
  }, [refetch]);

  const events = calendarData?.data || [];

  // DEBUG: Log dos dados recebidos (simplificado)
  useEffect(() => {
    if (events.length > 0) {
      console.log('[Calendar] Eventos carregados:', events.length);
    }
  }, [events]);

  // Agrupa eventos por data
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    
    events.forEach((event: any) => {
      try {
        const dateKey = format(parseISO(event.date), 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(event);
      } catch (error) {
        console.error('Erro ao processar evento:', event, error);
      }
    });
    
    return grouped;
  }, [events]);

  // Calcula os dias do mês atual para exibição
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    // Adiciona dias vazios no início para alinhar com o dia da semana
    const startDay = start.getDay();
    const emptyDays = Array(startDay).fill(null);
    
    return [...emptyDays, ...days];
  }, [currentMonth]);

  // Filtra eventos do dia selecionado ou de todos os dias
  const filteredEvents = useMemo(() => {
    if (!selectedDate) {
      return events;
    }
    
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const filtered = eventsByDate[dateKey] || [];
    return filtered;
  }, [selectedDate, events, eventsByDate]);

  const formatEventDate = (dateStr: string): string => {
    try {
      const date = parseISO(dateStr);
      if (isToday(date)) {
        return 'Hoje';
      } else if (isTomorrow(date)) {
        return 'Amanhã';
      } else if (isYesterday(date)) {
        return 'Ontem';
      } else {
        return format(date, "d 'de' MMMM", { locale: ptBR });
      }
    } catch {
      return dateStr;
    }
  };

  const openMeetLink = (meetLink: string) => {
    if (meetLink) {
      window.open(meetLink, '_blank', 'noopener,noreferrer');
    }
  };

  const openGoogleCalendar = () => {
    window.open('https://calendar.google.com/', '_blank', 'noopener,noreferrer');
  };

  const handleEventClick = (event: any) => {
    console.log('[CalendarPage] Event clicked:', event);
    
    // Verificar se é evento workspace
    const isWorkspaceEvent = event.source === 'workspace_database' || 
                            event.source === 'workspace_board';
    
    if (!isWorkspaceEvent) {
      console.log('[CalendarPage] Not a workspace event, ignoring');
      return;
    }

    try {
      // Extrair o ID correto
      const idParts = event.id.split('_');
      
      if (idParts.length < 3) {
        console.error('[CalendarPage] Invalid event ID format:', event.id);
        toast.error('Formato de ID inválido');
        return;
      }

      const itemId = idParts[2]; // board-example ou database-123
      const workspaceType = idParts[1]; // 'board' ou 'database'
      
      console.log('[CalendarPage] Opening workspace:', workspaceType, itemId);
      
      // Setar o item ativo no Zustand store
      if (workspaceType === 'board') {
        setCurrentBoard(itemId);
        console.log('[CalendarPage] Board setado:', itemId);
      } else if (workspaceType === 'database') {
        setCurrentDatabase(itemId);
        console.log('[CalendarPage] Database setado:', itemId);
      }
      
      toast.success('Abrindo workspace...', {
        duration: 1000
      });
      
      // Navegar para a página do workspace
      setTimeout(() => {
        setLocation('/plataforma/workspace');
        console.log('[CalendarPage] Navegado para /plataforma/workspace');
      }, 300);
      
    } catch (error) {
      console.error('[CalendarPage] Error handling click:', error);
      toast.error('Erro ao abrir workspace');
    }
  };

  const isEventNow = (event: any): boolean => {
    if (!event.date || !event.time) return false;
    try {
      const now = new Date();
      const eventDate = parseISO(event.date);
      
      const [hours, minutes] = event.time.split(':').map(Number);
      const eventStart = new Date(eventDate);
      eventStart.setHours(hours, minutes, 0, 0);
      
      const duration = event.duration || 60;
      const eventEnd = new Date(eventStart.getTime() + duration * 60 * 1000);
      
      return now >= eventStart && now < eventEnd;
    } catch {
      return false;
    }
  };

  const isEventSoon = (event: any): boolean => {
    if (!event.date || !event.time) return false;
    try {
      const now = new Date();
      const eventDate = parseISO(event.date);
      
      const [hours, minutes] = event.time.split(':').map(Number);
      const eventStart = new Date(eventDate);
      eventStart.setHours(hours, minutes, 0, 0);
      
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
      return eventStart > now && eventStart <= thirtyMinutesFromNow;
    } catch {
      return false;
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (date: Date) => {
    if (selectedDate && isSameDay(selectedDate, date)) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
    }
  };


  if (isLoading) {
    return (
      <>
        {isMobile && (
          <div className="px-4 pb-2 pt-0">
            <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          </div>
        )}
        
        <div className={cn(
          "relative z-10 container mx-auto pb-4 space-y-6 animate-fade-in",
          "px-4 md:px-6 lg:px-8",
          "sm:pb-6 lg:pb-8",
          isMobile && "pb-24"
        )}>
          <div className="flex items-center justify-center h-96">
            <Card className="glass-card border-border/20 p-4 md:p-8">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" data-testid="loader-calendar" />
                <span className={cn(
                  "font-semibold text-foreground",
                  isMobile ? "text-base" : "text-lg"
                )}>Carregando calendário...</span>
              </div>
            </Card>
          </div>
        </div>
        
        {isMobile && <BottomNav />}
      </>
    );
  }

  const hasEvents = filteredEvents.length > 0;

  return (
    <>
      {isMobile && (
        <div className="px-4 pb-2 pt-0">
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
        </div>
      )}
      
      <div className={cn(
        "relative z-10 container mx-auto pt-0 pb-4 space-y-6 animate-fade-in",
        "px-4 md:px-6 lg:px-8",
        "sm:pb-6 lg:pb-8 lg:space-y-8",
        isMobile && "pb-24"
      )}>
        <div className={cn("space-y-6", !isMobile && "lg:space-y-8")}>
          <div className={cn(
            "flex flex-col gap-4",
            !isMobile && "lg:flex-row lg:items-center lg:justify-between"
          )}>
            <div className="hidden md:block">
              <h1 className="text-4xl font-black text-foreground tracking-tight gradient-text" data-testid="text-page-title-calendar">
                Calendário de Reuniões
              </h1>
              <p className="text-xl text-muted-foreground/80 mt-2" data-testid="text-page-subtitle">
                Gerencie suas reuniões e compromissos conectados ao Google Calendar
              </p>
            </div>
            <div className={cn(
              "flex items-center gap-3",
              isMobile && "flex-wrap"
            )}>
              <Button
                onClick={() => refetch()}
                variant="outline"
                size={isMobile ? "default" : "sm"}
                className={cn(
                  isMobile ? "min-h-[44px] min-w-[44px] flex-1" : "h-10",
                  "touch-manipulation active:scale-95"
                )}
                data-testid="button-refresh-calendar"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              <Button
                onClick={openGoogleCalendar}
                className={cn(
                  isMobile ? "min-h-[44px] min-w-[44px] flex-1" : "h-10",
                  "touch-manipulation active:scale-95"
                )}
                data-testid="button-open-google-calendar"
                data-tour="sync-calendar"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {isMobile ? "Calendar" : "Abrir Google Calendar"}
              </Button>
              <Button
                onClick={() => setCreateEventOpen(true)}
                className={cn(
                  isMobile ? "min-h-[44px] min-w-[44px] flex-1" : "h-10",
                  "touch-manipulation active:scale-95"
                )}
                data-tour="new-event"
                variant="default"
              >
                <Plus className="w-4 h-4 mr-2" />
                {isMobile ? "Novo" : "Nova Reunião"}
              </Button>
            </div>
          </div>

          {/* Modal de Criação de Evento */}
          <CreateEventModal
            open={createEventOpen}
            onOpenChange={setCreateEventOpen}
            defaultDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
          />

          {error && (
            <Card className="glass-card border-border/20 hover:shadow-luxury transition-elegant border-destructive/30 bg-destructive/5" data-testid="card-error-calendar">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className={cn(
                  "text-destructive flex items-center gap-2",
                  isMobile && "text-base"
                )} data-testid="text-error-title">
                  <Bell className="w-5 h-5" />
                  Erro ao carregar calendário
                </CardTitle>
                <CardDescription className={cn(isMobile && "text-sm")} data-testid="text-error-description">
                  {calendarData?.warning || 'Não foi possível conectar ao Google Calendar. Verifique as configurações.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <Button 
                  onClick={() => refetch()} 
                  variant="outline" 
                  size="sm" 
                  className="min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
                  data-testid="button-retry-calendar"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          )}

          {calendarData && (
            <Card className="glass-card border-border/20 hover:shadow-luxury transition-elegant" data-testid="card-status-integration" data-tour="calendar-stats">
              <CardHeader className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className={cn(
                        "font-black gradient-text",
                        isMobile ? "text-base" : "text-xl"
                      )} data-testid="text-status-title">
                        Status da Integração
                      </CardTitle>
                      <CardDescription className={cn(isMobile && "text-xs")} data-testid="text-calendar-description">
                        {isMobile ? "Status da conexão" : "Visualize todos os seus compromissos em tempo real"}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant={calendarData.source === 'google_calendar' || calendarData.source === 'google_calendar_and_ical' ? 'default' : 'secondary'}
                    data-testid="badge-connection-status"
                    className={cn(isMobile && "text-xs")}
                  >
                    {calendarData.source === 'google_calendar' || calendarData.source === 'google_calendar_and_ical' ? 'Conectado' : 'Teste'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground" data-testid="text-status-source">
                    Fonte: {calendarData.source === 'google_calendar' || calendarData.source === 'google_calendar_and_ical' ? 'Google Calendar' : 'Dados mockados'}
                  </p>
                  <p className="text-muted-foreground" data-testid="text-status-total">
                    Total de eventos: {calendarData.total || 0}
                  </p>
                  {calendarData.warning && (
                    <p className="text-amber-600 dark:text-amber-400 text-xs md:text-sm" data-testid="text-status-warning">⚠️ {calendarData.warning}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Calendário Visual */}
          <Card className="glass-card border-border/20 hover:shadow-luxury transition-elegant">
            <CardHeader className="p-4 md:p-6 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className={cn(
                  "font-black gradient-text",
                  isMobile ? "text-base" : "text-xl"
                )}>
                  {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousMonth}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentMonth(new Date());
                      setSelectedDate(null);
                    }}
                    className="h-8 px-2 text-xs"
                  >
                    Hoje
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextMonth}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="space-y-2">
                {/* Cabeçalho dos dias da semana */}
                <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                    <div key={day} className="text-center text-xs md:text-sm font-semibold text-muted-foreground p-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Grade de dias */}
                <div className="grid grid-cols-7 gap-1 md:gap-2">
                  {monthDays.map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="aspect-square" />;
                    }
                    
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayEvents = eventsByDate[dateKey] || [];
                    const hasEventsOnDay = dayEvents.length > 0;
                    const isSelected = selectedDate && isSameDay(selectedDate, day);
                    const isTodayDay = isToday(day);
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleDateClick(day)}
                        className={cn(
                          "aspect-square rounded-lg p-1 md:p-2 transition-all relative",
                          "hover:bg-primary/10 hover:border-primary/30 border-2",
                          isSelected && "bg-primary text-primary-foreground border-primary",
                          !isSelected && isTodayDay && "border-primary/50 bg-primary/5",
                          !isSelected && !isTodayDay && hasEventsOnDay && "border-primary/20",
                          !isSelected && !isTodayDay && !hasEventsOnDay && "border-transparent",
                          !isSameMonth(day, currentMonth) && "opacity-40"
                        )}
                      >
                        <div className="flex flex-col items-center justify-center h-full">
                          <span className={cn(
                            "text-xs md:text-sm font-semibold",
                            isSelected && "text-primary-foreground"
                          )}>
                            {format(day, 'd')}
                          </span>
                          {hasEventsOnDay && (
                            <div className="flex gap-0.5 mt-1">
                              {dayEvents.slice(0, 3).map((_, i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    "w-1 h-1 rounded-full",
                                    isSelected ? "bg-primary-foreground" : "bg-primary"
                                  )}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                {selectedDate && (
                  <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm font-semibold text-primary">
                      {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      {' - '}
                      {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div className={cn(
              "flex items-center justify-between",
              isMobile && "px-0"
            )}>
              <h2 className={cn(
                "font-black gradient-text",
                isMobile ? "text-xl" : "text-2xl"
              )} data-testid="text-section-title-meetings">
                {selectedDate ? `Eventos de ${format(selectedDate, "d 'de' MMMM", { locale: ptBR })}` : 'Todas as Reuniões'}
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs" data-testid="badge-event-count">
                  <CalendarDays className="w-3 h-3 mr-1" />
                  {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''}
                </Badge>
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDate(null)}
                    className="h-8 px-2 text-xs"
                  >
                    Ver todos
                  </Button>
                )}
              </div>
            </div>
            
            {hasEvents ? (
              isMobile ? (
                <HorizontalScrollCards>
                  {filteredEvents.map((event: any, index: number) => {
                    const eventNow = isEventNow(event);
                    const eventSoon = isEventSoon(event);
                    
                    const isWorkspaceEvent = event.source === 'workspace_database' || event.source === 'workspace_board';
                    
                    return (
                      <ScrollCard key={event.id || index} width="300px">
                        <Card 
                          className={cn(
                            "glass-card transition-elegant hover:shadow-luxury h-full",
                            eventNow ? 'border-green-500/50 bg-green-500/5' : 
                            eventSoon ? 'border-primary/50 bg-primary/5' : 'border-border/20',
                            isWorkspaceEvent && 'cursor-pointer hover:border-primary/70'
                          )}
                          data-testid={`card-event-${event.id || index}`}
                          data-tour={index === 0 ? "event-card" : undefined}
                          onClick={() => {
                            console.log('[CalendarPage] Card clicked - Mobile:', event);
                            console.log('[CalendarPage] Is workspace event?', isWorkspaceEvent);
                            if (isWorkspaceEvent) {
                              handleEventClick(event);
                            }
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <h3 className="font-bold text-base text-foreground line-clamp-2" data-testid={`text-event-title-${event.id || index}`}>
                                      {event.title || event.summary || 'Evento sem título'}
                                    </h3>
                                    {isWorkspaceEvent && (
                                      <p className="text-[10px] text-primary font-medium mt-0.5">
                                        Clique para abrir workspace →
                                      </p>
                                    )}
                                  </div>
                                  {eventNow && (
                                    <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 flex-shrink-0">
                                      <div className="w-1.5 h-1.5 bg-white rounded-full mr-1" />
                                      AGORA
                                    </Badge>
                                  )}
                                  {eventSoon && !eventNow && (
                                    <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 flex-shrink-0">
                                      BREVE
                                    </Badge>
                                  )}
                                </div>
                                
                                <Badge 
                                  variant={event.status === 'confirmado' ? 'default' : 
                                           event.status === 'cancelado' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {event.status === 'confirmado' ? 'Confirmado' : 
                                   event.status === 'provisorio' ? 'Provisório' : 
                                   event.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
                                </Badge>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                                  <span className="font-medium text-xs">{formatEventDate(event.date)}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-sm" data-tour={index === 0 ? "event-time-badge" : undefined}>
                                  <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                                  <span className="font-medium text-xs">
                                    {event.time}
                                    {event.duration && <span className="text-muted-foreground ml-1">({event.duration}min)</span>}
                                  </span>
                                </div>
                                
                                {event.client && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Users className="w-4 h-4 text-primary flex-shrink-0" />
                                    <span className="font-medium text-xs line-clamp-1" data-testid={`text-event-client-${event.id || index}`}>{event.client}</span>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-2 pt-2 border-t border-border/20">
                                {isWorkspaceEvent ? (
                                  <Button
                                    onClick={(e) => { 
                                      e.stopPropagation();
                                      console.log('[CalendarPage] Button workspace clicked - Mobile:', event);
                                      handleEventClick(event);
                                    }}
                                    className="w-full min-h-[44px] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm touch-manipulation active:scale-95"
                                    data-testid={`button-workspace-${event.id || index}`}
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Abrir Workspace
                                  </Button>
                                ) : event.meetLink ? (
                                  <Button
                                    onClick={(e) => { e.stopPropagation(); openMeetLink(event.meetLink); }}
                                    className="w-full min-h-[44px] bg-green-600 hover:bg-green-700 text-white font-semibold text-sm touch-manipulation active:scale-95"
                                    data-testid={`button-meet-${event.id || index}`}
                                    data-tour={index === 0 ? "google-meet-link" : undefined}
                                  >
                                    <Play className="w-4 h-4 mr-2" />
                                    Entrar
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={(e) => { e.stopPropagation(); openGoogleCalendar(); }}
                                    variant="outline"
                                    className="w-full min-h-[44px] font-semibold text-sm touch-manipulation active:scale-95"
                                    data-testid={`button-create-link-${event.id || index}`}
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Criar Link
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </ScrollCard>
                    );
                  })}
                </HorizontalScrollCards>
              ) : (
                <div className="space-y-4">
                  {filteredEvents.map((event: any, index: number) => {
                    const eventNow = isEventNow(event);
                    const eventSoon = isEventSoon(event);
                    const isWorkspaceEvent = event.source === 'workspace_database' || event.source === 'workspace_board';
                    
                    return (
                      <Card 
                        key={event.id || index} 
                        className={cn(
                          "glass-card transition-elegant hover:shadow-luxury",
                          eventNow ? 'border-green-500/50 bg-green-500/5' : 
                          eventSoon ? 'border-primary/50 bg-primary/5' : 'border-border/20',
                          isWorkspaceEvent && 'cursor-pointer hover:border-primary/70'
                        )}
                        data-testid={`card-event-${event.id || index}`}
                        data-tour={index === 0 ? "event-card" : undefined}
                        onClick={() => {
                          console.log('[CalendarPage] Card clicked - Desktop:', event);
                          console.log('[CalendarPage] Is workspace event?', isWorkspaceEvent);
                          if (isWorkspaceEvent) {
                            handleEventClick(event);
                          }
                        }}
                      >
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <div className="flex-1">
                                    <h3 className="font-black text-xl text-foreground" data-testid={`text-event-title-${event.id || index}`}>
                                      {event.title || event.summary || 'Evento sem título'}
                                    </h3>
                                    {isWorkspaceEvent && (
                                      <p className="text-xs text-primary font-medium mt-1">
                                        👆 Clique neste card para abrir o workspace
                                      </p>
                                    )}
                                  </div>
                                  
                                  {eventNow && (
                                    <Badge className="bg-green-500 text-white animate-pulse">
                                      <div className="w-2 h-2 bg-white rounded-full mr-2" />
                                      AGORA
                                    </Badge>
                                  )}
                                  
                                  {eventSoon && !eventNow && (
                                    <Badge className="bg-primary text-primary-foreground">
                                      <Clock className="w-3 h-3 mr-1" />
                                      EM BREVE
                                    </Badge>
                                  )}
                                  
                                  <Badge variant={event.status === 'confirmado' ? 'default' : 
                                                 event.status === 'cancelado' ? 'destructive' : 'secondary'}>
                                    {event.status === 'confirmado' ? 'Confirmado' : 
                                     event.status === 'provisorio' ? 'Provisório' : 
                                     event.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
                                  </Badge>
                                </div>
                                
                                {event.description && (
                                  <p className="text-muted-foreground text-sm leading-relaxed" data-testid={`text-event-description-${event.id || index}`}>
                                    {event.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="flex items-center gap-2 text-sm">
                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                  <Calendar className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Data</p>
                                  <p className="font-semibold">{formatEventDate(event.date)}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm" data-tour={index === 0 ? "event-time-badge" : undefined}>
                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                  <Clock className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Horário</p>
                                  <p className="font-semibold">
                                    {event.time}
                                    {event.duration && <span className="text-muted-foreground ml-1">({event.duration}min)</span>}
                                  </p>
                                </div>
                              </div>
                              
                              {event.client && (
                                <div className="flex items-center gap-2 text-sm">
                                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <Users className="w-4 h-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Cliente</p>
                                    <p className="font-semibold" data-testid={`text-event-client-${event.id || index}`}>{event.client}</p>
                                  </div>
                                </div>
                              )}
                              
                              {event.location && (
                                <div className="flex items-center gap-2 text-sm">
                                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <MapPin className="w-4 h-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Local</p>
                                    <p className="font-semibold truncate max-w-[150px]">{event.location}</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-3">
                              {isWorkspaceEvent ? (
                                <Button
                                  onClick={(e) => { 
                                    e.stopPropagation();
                                    console.log('[CalendarPage] Button workspace clicked - Desktop:', event);
                                    handleEventClick(event);
                                  }}
                                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                                  data-testid={`button-workspace-${event.id || index}`}
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Abrir Workspace
                                </Button>
                              ) : (
                                <>
                                  {event.meetLink ? (
                                    <Button
                                      onClick={(e) => { e.stopPropagation(); openMeetLink(event.meetLink); }}
                                      className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                                      data-testid={`button-meet-${event.id || index}`}
                                      data-tour={index === 0 ? "google-meet-link" : undefined}
                                    >
                                      <Play className="w-4 h-4 mr-2" />
                                      Entrar no Meet
                                    </Button>
                                  ) : (
                                    <Button
                                      onClick={(e) => { e.stopPropagation(); openGoogleCalendar(); }}
                                      variant="outline"
                                      data-testid={`button-create-link-${event.id || index}`}
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      Criar Link do Meet
                                    </Button>
                                  )}
                                  
                                  <Button 
                                    variant="outline" 
                                    onClick={(e) => { e.stopPropagation(); openGoogleCalendar(); }}
                                    data-testid={`button-view-google-${event.id || index}`}
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Ver no Google Calendar
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )
            ) : (
              <Card className="glass-card border-border/20 hover:shadow-luxury transition-elegant" data-testid="card-empty-state">
                <CardContent className="p-4 md:p-8 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center">
                      <CalendarCheck className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className={cn(
                        "font-bold text-foreground mb-2",
                        isMobile ? "text-base" : "text-lg"
                      )}>
                        {selectedDate ? 'Nenhum evento neste dia' : 'Nenhum evento encontrado'}
                      </h3>
                      <p className={cn(
                        "text-muted-foreground",
                        isMobile ? "text-sm" : "text-base"
                      )}>
                        {selectedDate 
                          ? 'Selecione outro dia ou adicione um novo evento'
                          : 'Suas reuniões e compromissos aparecerão aqui'
                        }
                      </p>
                    </div>
                    <Button 
                      onClick={openGoogleCalendar}
                      className={cn(
                        isMobile && "min-h-[44px] w-full"
                      )}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Evento no Google Calendar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="glass-card border-border/20 hover:shadow-luxury transition-elegant">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className={cn(
                "font-black gradient-text",
                isMobile ? "text-base" : "text-xl"
              )}>Informações</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="space-y-4">
                <div className={cn(
                  "flex gap-3 p-4 bg-muted/20 rounded-lg border border-border/30",
                  isMobile ? "flex-col" : "flex-col sm:flex-row"
                )}>
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-medium">Visualização:</span>
                    <span className="text-muted-foreground">Mensal</span>
                  </div>
                  {!isMobile && <Separator orientation="vertical" className="hidden sm:block h-4" />}
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-medium">Sincronizando com:</span>
                    <span className="text-muted-foreground">Google Calendar</span>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground space-y-2">
                  <p className={cn(isMobile && "text-xs")}>
                    💡 <strong>Dica:</strong> Clique em qualquer dia para ver os eventos daquele dia
                  </p>
                  <p className={cn(isMobile && "text-xs")}>
                    📅 <strong>Legenda:</strong> Pontos coloridos indicam dias com eventos
                  </p>
                  <p className={cn(isMobile && "text-xs")}>
                    🔄 <strong>Sincronização:</strong> Seus eventos são atualizados automaticamente a cada 5 minutos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {isMobile && <BottomNav />}
    </>
  );
};

export default CalendarPage;
