import { useState, useEffect, useMemo } from 'react';
import { PremiumCard } from '@/platforms/shared/premium/PremiumCard';
import { PremiumButton } from '@/platforms/shared/premium/PremiumButton';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Video, ChevronLeft, ChevronRight, Users, MapPin, Bell, Loader2, Play, Plus, RefreshCw, ExternalLink, CalendarCheck, CalendarDays, X, ExternalLink as WorkspaceIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isToday, isTomorrow, isYesterday, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { CreateEventModal } from '@/components/calendar/CreateEventModal';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useNotionStore } from '@/stores/notionStore';

const CalendarPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setCurrentBoard, setCurrentDatabase } = useNotionStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [createEventOpen, setCreateEventOpen] = useState(false);

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
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const events = calendarData?.data || [];

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const getEventsForDate = (date: Date) => {
    return events.filter((event: any) => {
      try {
        const eventDate = parseISO(event.date);
        return isSameDay(eventDate, date);
      } catch {
        return false;
      }
    });
  };

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return getEventsForDate(selectedDate);
  }, [selectedDate, events]);

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

  const isEventNow = (event: any): boolean => {
    if (!event.date || !event.time || event.time === 'Dia todo') return false;
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
    if (!event.date || !event.time || event.time === 'Dia todo') return false;
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

  const previousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const handleOpenWorkspace = (event: any) => {
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

      const workspaceType = idParts[1]; // 'board' ou 'db'
      
      if (workspaceType === 'board' || event.id.startsWith('db_')) {
        // Suporte para IDs do WorkspaceCalendarView (db_DBID_ROWID_COLID) ou CalendarPage (workspace_board_...)
        if (workspaceType === 'board') {
          // Format: workspace_board_BOARD_ID_CARD_ID
          if (idParts.length < 4) {
            console.error('[CalendarPage] Invalid board event ID format:', event.id);
            toast.error('Formato de ID de board inválido');
            return;
          }
          
          const boardId = idParts[2];
          const cardId = idParts[3];
          
          console.log('[CalendarPage] Opening board card:', { boardId, cardId });
          
          // Setar o board ativo
          setCurrentBoard(boardId);
          
          toast.success('Abrindo card no workspace...', {
            duration: 1000
          });
          
          // Navegar para workspace com o cardId como parâmetro
          setTimeout(() => {
            navigate(`/workspace?cardId=${cardId}`);
          }, 300);
        } else {
          // Format: db_DB_ID_ROW_ID_COL_ID ou workspace_db_DB_ID_ROW_ID_COL_ID
          const dbId = workspaceType === 'db' ? idParts[2] : idParts[1];
          
          console.log('[CalendarPage] Opening database:', dbId);
          
          // Setar o database ativo
          setCurrentDatabase(dbId);
          
          toast.success('Abrindo workspace...', {
            duration: 1000
          });
          
          setTimeout(() => {
            navigate(`/workspace?dbId=${dbId}`);
          }, 300);
        }
      }
      
    } catch (error) {
      console.error('[CalendarPage] Error handling click:', error);
      toast.error('Erro ao abrir workspace');
    }
  };

  if (isLoading) {
    return (
      <div className="relative z-10 container mx-auto pb-4 space-y-6 animate-fade-in px-4 md:px-6 lg:px-8 sm:pb-6 lg:pb-8">
        <div className="flex items-center justify-center h-96">
          <PremiumCard variant="elevated" padding="lg">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" data-testid="loader-calendar" />
              <span className="text-lg font-semibold text-foreground">Carregando calendário...</span>
            </div>
          </PremiumCard>
        </div>
      </div>
    );
  }

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="relative z-10 container mx-auto pt-0 pb-4 sm:pb-6 lg:pb-8 space-y-6 lg:space-y-8 animate-fade-in px-4 md:px-6 lg:px-8">
      <div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4 lg:gap-3">
            <div className="p-3 lg:p-2.5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
              <Calendar className="h-8 w-8 lg:h-6 lg:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl lg:text-2xl font-black text-foreground tracking-tight bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent" data-testid="text-page-title-calendar">
                Calendário de Reuniões
              </h1>
              <p className="text-xl lg:text-sm text-muted-foreground/80 mt-2 lg:mt-1" data-testid="text-page-subtitle">
                Visualize todos os seus compromissos do Google Calendar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 lg:gap-2">
            <PremiumButton
              onClick={() => refetch()}
              variant="secondary"
              size="md"
              className="w-auto h-10 lg:h-9"
              data-testid="button-refresh-calendar"
            >
              <RefreshCw className="w-4 h-4 lg:w-3.5 lg:h-3.5 mr-2 lg:mr-1.5" />
              <span className="lg:text-xs">Atualizar</span>
            </PremiumButton>
            <PremiumButton
              onClick={() => setCreateEventOpen(true)}
              variant="primary"
              size="md"
              className="w-auto h-10 lg:h-9"
            >
              <Plus className="w-4 h-4 lg:w-3.5 lg:h-3.5 mr-2 lg:mr-1.5" />
              <span className="lg:text-xs">Novo Evento</span>
            </PremiumButton>
          </div>
        </div>

        {/* Modal de Criação de Evento */}
        <CreateEventModal
          open={createEventOpen}
          onOpenChange={setCreateEventOpen}
          defaultDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
        />

        {error && (
          <PremiumCard variant="outlined" padding="md" className="border-destructive/30 bg-destructive/5" data-testid="card-error-calendar">
            <div className="flex items-center gap-2 text-destructive mb-1" data-testid="text-error-title">
              <Bell className="w-5 h-5" />
              <h3 className="font-bold text-xl">Erro ao carregar calendário</h3>
            </div>
            <p className="text-sm text-muted-foreground" data-testid="text-error-description">
              {calendarData?.warning || 'Não foi possível conectar ao Google Calendar. Verifique as configurações.'}
            </p>
            <PremiumButton 
              onClick={() => refetch()} 
              variant="secondary"
              size="md" 
              className="w-auto mt-4"
              data-testid="button-retry-calendar"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </PremiumButton>
          </PremiumCard>
        )}

        {/* Calendário Visual */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PremiumCard variant="elevated" padding="lg">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PremiumButton
                    onClick={previousMonth}
                    variant="secondary"
                    size="sm"
                    className="w-10 h-10 p-0"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </PremiumButton>
                  <h2 className="text-2xl font-bold text-foreground">
                    {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                  </h2>
                  <PremiumButton
                    onClick={nextMonth}
                    variant="secondary"
                    size="sm"
                    className="w-10 h-10 p-0"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </PremiumButton>
                </div>
                <PremiumButton
                  onClick={goToToday}
                  variant="primary"
                  size="sm"
                >
                  Hoje
                </PremiumButton>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const dayEvents = getEventsForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isTodayDate = isToday(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "min-h-24 p-2 border rounded-lg text-left transition-all hover:border-primary/50",
                        isCurrentMonth ? "bg-background" : "bg-muted/30 text-muted-foreground",
                        isTodayDate && "border-primary bg-primary/5 font-bold",
                        isSelected && "ring-2 ring-primary",
                        !isCurrentMonth && "opacity-50"
                      )}
                    >
                      <div className={cn(
                        "text-sm font-semibold mb-1",
                        isTodayDate && "text-primary"
                      )}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event: any, idx: number) => (
                          <div
                            key={idx}
                            className={cn(
                              "text-xs p-1 rounded truncate",
                              event.type === 'video' ? "bg-green-500/20 text-green-700 dark:text-green-300" : "bg-primary/20 text-primary"
                            )}
                            title={event.title}
                          >
                            {event.time !== 'Dia todo' && <span className="font-semibold">{event.time}</span>}{' '}
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-muted-foreground font-semibold">
                            +{dayEvents.length - 3} mais
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </PremiumCard>
          </div>

          <div className="lg:col-span-1">
            <PremiumCard variant="elevated" padding="lg" className="sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-foreground">
                  {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: ptBR }) : 'Selecione um dia'}
                </h3>
                {selectedDate && (
                  <PremiumButton
                    onClick={() => setSelectedDate(null)}
                    variant="secondary"
                    size="sm"
                    className="w-8 h-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </PremiumButton>
                )}
              </div>

              {selectedDate && selectedDateEvents.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {selectedDateEvents.map((event: any, index: number) => {
                    const eventNow = isEventNow(event);
                    const eventSoon = isEventSoon(event);

                    return (
                      <div
                        key={event.id || index}
                        className={cn(
                          "p-4 rounded-lg border",
                          eventNow ? 'border-green-500/50 bg-green-500/5' : 
                          eventSoon ? 'border-primary/50 bg-primary/5' : 'border-border'
                        )}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-foreground flex-1">
                              {event.title || 'Evento sem título'}
                            </h4>
                            {eventNow && (
                              <Badge className="bg-green-500 text-white text-xs shrink-0">
                                AGORA
                              </Badge>
                            )}
                            {eventSoon && !eventNow && (
                              <Badge className="bg-primary text-xs shrink-0">
                                EM BREVE
                              </Badge>
                            )}
                          </div>

                          {event.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {event.description}
                            </p>
                          )}

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>{event.time}{event.duration && ` (${event.duration}min)`}</span>
                          </div>

                          {event.client && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="w-4 h-4" />
                              <span>{event.client}</span>
                            </div>
                          )}

                          {event.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              <span>{event.location}</span>
                            </div>
                          )}

                          {event.meetLink && (
                            <PremiumButton
                              onClick={() => openMeetLink(event.meetLink)}
                              variant="primary"
                              size="sm"
                              className="w-full mt-2 bg-green-600 hover:bg-green-700"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Entrar no Meet
                            </PremiumButton>
                          )}

                          {(event.source === 'workspace_board' || event.source === 'workspace_database') && (
                            <PremiumButton
                              onClick={() => handleOpenWorkspace(event)}
                              variant="primary"
                              size="sm"
                              className="w-full mt-2"
                            >
                              <WorkspaceIcon className="w-4 h-4 mr-2" />
                              Abrir Workspace
                            </PremiumButton>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : selectedDate ? (
                <div className="text-center py-8">
                  <CalendarCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum evento neste dia
                  </p>
                  <PremiumButton
                    onClick={() => setCreateEventOpen(true)}
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Evento
                  </PremiumButton>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">
                    Clique em um dia para ver os eventos
                  </p>
                </div>
              )}
            </PremiumCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
