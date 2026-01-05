import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Database, Kanban, Video, Clock, Loader2, Upload, Download, RefreshCw } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WorkspaceCalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  source: 'database' | 'board' | 'google_calendar';
  sourceId: string;
  description?: string;
  type: 'date' | 'dueDate' | 'calendar_event';
  metadata?: {
    databaseId?: string;
    fieldId?: string;
    boardId?: string;
    cardId?: string;
    googleEventId?: string;
  };
}

interface WorkspaceCalendarViewProps {
  onEventClick?: (event: WorkspaceCalendarEvent) => void;
  showSyncButtons?: boolean;
}

interface ImportDialogState {
  open: boolean;
  event: WorkspaceCalendarEvent | null;
}

export const WorkspaceCalendarView = ({ 
  onEventClick, 
  showSyncButtons = true 
}: WorkspaceCalendarViewProps) => {
  console.log('[WorkspaceCalendarView] Component initialized with:', { 
    onEventClick: typeof onEventClick, 
    hasOnEventClick: !!onEventClick,
    showSyncButtons 
  });

  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [importDialog, setImportDialog] = useState<ImportDialogState>({ open: false, event: null });
  const [selectedDestinationType, setSelectedDestinationType] = useState<'board' | 'database'>('board');
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('');

  const { data: eventsData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/workspace/calendar/events'],
    refetchInterval: 2 * 60 * 1000,
    retry: 2,
  });

  console.log('[WorkspaceCalendarView] Events data:', { 
    eventsData, 
    eventCount: eventsData?.data?.length || 0,
    sampleEvent: eventsData?.data?.[0]
  });

  const { data: workspaceData, isLoading: isLoadingWorkspace } = useQuery({
    queryKey: ['/api/workspace/load'],
    retry: 2,
  });

  const events: WorkspaceCalendarEvent[] = eventsData?.data || [];
  const boards = workspaceData?.data?.boards || [];
  const databases = workspaceData?.data?.databases || [];

  const syncToGoogleMutation = useMutation({
    mutationFn: async (event: WorkspaceCalendarEvent) => {
      const response = await fetch('/api/workspace/calendar/sync-to-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventId: event.id,
          source: event.source,
          sourceId: event.sourceId,
          metadata: event.metadata
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao sincronizar evento');
      }
      return response.json();
    },
    onSuccess: (data, event) => {
      toast.success('Evento sincronizado!', {
        description: `"${event.title}" foi adicionado ao Google Calendar.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace/calendar/events'] });
    },
    onError: (error: Error, event) => {
      toast.error('Erro ao sincronizar', {
        description: error.message || `Não foi possível sincronizar "${event.title}".`,
      });
    },
  });

  const syncFromGoogleMutation = useMutation({
    mutationFn: async ({ event, destinationType, destinationId }: { 
      event: WorkspaceCalendarEvent; 
      destinationType: 'board' | 'database';
      destinationId: string;
    }) => {
      const response = await fetch('/api/workspace/calendar/sync-from-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventId: event.id,
          googleEventId: event.metadata?.googleEventId,
          destinationType,
          destinationId,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao importar evento');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast.success('Evento importado!', {
        description: `"${variables.event.title}" foi adicionado ao workspace.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace/calendar/events'] });
      setImportDialog({ open: false, event: null });
      setSelectedDestinationId('');
    },
    onError: (error: Error, variables) => {
      toast.error('Erro ao importar', {
        description: error.message || `Não foi possível importar "${variables.event.title}".`,
      });
    },
  });

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, WorkspaceCalendarEvent[]> = {};
    events.forEach((event) => {
      try {
        const dateKey = format(parseISO(event.date), 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(event);
      } catch (e) {
        console.error('Invalid date format:', event.date);
      }
    });
    return grouped;
  }, [events]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const startDay = start.getDay();
    const emptyDays = Array(startDay).fill(null);
    return [...emptyDays, ...days];
  }, [currentMonth]);

  const filteredEvents = useMemo(() => {
    if (!selectedDate) return events;
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate[dateKey] || [];
  }, [selectedDate, events, eventsByDate]);

  const eventsBySource = useMemo(() => {
    const grouped = {
      database: filteredEvents.filter(e => e.source === 'database'),
      board: filteredEvents.filter(e => e.source === 'board'),
      google_calendar: filteredEvents.filter(e => e.source === 'google_calendar'),
    };
    return grouped;
  }, [filteredEvents]);

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

  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const handleSyncToGoogle = (event: WorkspaceCalendarEvent) => {
    syncToGoogleMutation.mutate(event);
  };

  const handleOpenImportDialog = (event: WorkspaceCalendarEvent) => {
    setImportDialog({ open: true, event });
    setSelectedDestinationType('board');
    setSelectedDestinationId('');
  };

  const handleImportFromGoogle = () => {
    if (!importDialog.event || !selectedDestinationId) {
      toast.error('Selecione um destino', {
        description: 'Por favor, escolha um board ou database de destino.',
      });
      return;
    }

    syncFromGoogleMutation.mutate({
      event: importDialog.event,
      destinationType: selectedDestinationType,
      destinationId: selectedDestinationId,
    });
  };

  const getSourceBadgeColor = (source: WorkspaceCalendarEvent['source']) => {
    switch (source) {
      case 'database':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'board':
        return 'bg-green-500 hover:bg-green-600';
      case 'google_calendar':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getSourceIcon = (source: WorkspaceCalendarEvent['source']) => {
    switch (source) {
      case 'database':
        return <Database className="w-3 h-3" />;
      case 'board':
        return <Kanban className="w-3 h-3" />;
      case 'google_calendar':
        return <Video className="w-3 h-3" />;
      default:
        return <CalendarIcon className="w-3 h-3" />;
    }
  };

  const getSourceLabel = (source: WorkspaceCalendarEvent['source']) => {
    switch (source) {
      case 'database':
        return 'Database';
      case 'board':
        return 'Board';
      case 'google_calendar':
        return 'Google Calendar';
      default:
        return source;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Erro ao carregar eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Não foi possível carregar os eventos do workspace. Tente novamente.
            </p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">Calendário do Workspace</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {events.length} evento{events.length !== 1 ? 's' : ''} encontrado{events.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card rounded-lg border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold">
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
                    onClick={handleToday}
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
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                    <div key={day} className="text-center text-xs font-semibold text-muted-foreground p-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {monthDays.map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayEvents = eventsByDate[dateKey] || [];
                    const hasEvents = dayEvents.length > 0;
                    const isSelected = selectedDate && isSameDay(selectedDate, day);
                    const isToday = isSameDay(day, new Date());

                    const databaseEvents = dayEvents.filter(e => e.source === 'database');
                    const boardEvents = dayEvents.filter(e => e.source === 'board');
                    const googleEvents = dayEvents.filter(e => e.source === 'google_calendar');

                    return (
                      <button
                        key={index}
                        onClick={() => handleDateClick(day)}
                        className={cn(
                          "aspect-square rounded-md p-1 transition-all relative",
                          "hover:bg-primary/10 hover:border-primary/30 border-2",
                          isSelected && "bg-primary text-primary-foreground border-primary",
                          !isSelected && isToday && "border-primary/50 bg-primary/5",
                          !isSelected && !isToday && hasEvents && "border-primary/20",
                          !isSelected && !isToday && !hasEvents && "border-transparent",
                          !isSameMonth(day, currentMonth) && "opacity-40"
                        )}
                      >
                        <div className="flex flex-col items-center justify-center h-full">
                          <span className={cn(
                            "text-xs font-semibold",
                            isSelected && "text-primary-foreground"
                          )}>
                            {format(day, 'd')}
                          </span>
                          {hasEvents && (
                            <div className="flex gap-0.5 mt-1">
                              {databaseEvents.length > 0 && (
                                <div className={cn(
                                  "w-1 h-1 rounded-full",
                                  isSelected ? "bg-primary-foreground" : "bg-blue-500"
                                )} />
                              )}
                              {boardEvents.length > 0 && (
                                <div className={cn(
                                  "w-1 h-1 rounded-full",
                                  isSelected ? "bg-primary-foreground" : "bg-green-500"
                                )} />
                              )}
                              {googleEvents.length > 0 && (
                                <div className={cn(
                                  "w-1 h-1 rounded-full",
                                  isSelected ? "bg-primary-foreground" : "bg-red-500"
                                )} />
                              )}
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

          <Card className="bg-card rounded-lg border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold">
                  {selectedDate 
                    ? `Eventos de ${format(selectedDate, "d 'de' MMMM", { locale: ptBR })}`
                    : 'Todos os Eventos'
                  }
                </CardTitle>
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
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {filteredEvents.length > 0 ? (
                  <>
                    {eventsBySource.database.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          Databases ({eventsBySource.database.length})
                        </h3>
                        {eventsBySource.database.map((event) => (
                          <div
                            key={event.id}
                            className="border rounded-lg overflow-hidden transition-all hover:shadow-md hover:border-primary/50"
                          >
                            <div className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{event.title}</div>
                                  {event.time && (
                                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                      <Clock className="w-3 h-3" />
                                      {event.time}
                                    </div>
                                  )}
                                  {event.description && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                      {event.description}
                                    </p>
                                  )}
                                </div>
                                <Badge className={`${getSourceBadgeColor(event.source)} text-white shrink-0`}>
                                  {getSourceIcon(event.source)}
                                  <span className="ml-1">{getSourceLabel(event.source)}</span>
                                </Badge>
                              </div>
                            </div>
                            <div className="px-3 py-2 bg-muted/20 border-t space-y-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="w-full bg-primary hover:bg-primary/90"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('[WorkspaceCalendarView] Abrir Database button clicked!', { event });
                                  if (event.metadata?.databaseId) {
                                    // Use a interface onEventClick se fornecida, ou navegue diretamente
                                    if (onEventClick) {
                                      onEventClick(event);
                                    } else {
                                      // Fallback para navegação direta se não houver handler
                                      window.location.href = `/workspace?dbId=${event.metadata.databaseId}`;
                                    }
                                  } else {
                                    onEventClick?.(event);
                                  }
                                }}
                              >
                                <Database className="w-3 h-3 mr-2" />
                                Abrir Database no Workspace
                              </Button>
                              {showSyncButtons && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSyncToGoogle(event);
                                  }}
                                  disabled={syncToGoogleMutation.isPending}
                                >
                                  {syncToGoogleMutation.isPending ? (
                                    <>
                                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                      Sincronizando...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-3 h-3 mr-2" />
                                      Sincronizar com Google Calendar
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {eventsBySource.board.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                          <Kanban className="w-4 h-4" />
                          Boards ({eventsBySource.board.length})
                        </h3>
                        {eventsBySource.board.map((event) => (
                          <div
                            key={event.id}
                            className="border rounded-lg overflow-hidden transition-all hover:shadow-md hover:border-primary/50"
                          >
                            <div className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{event.title}</div>
                                  {event.time && (
                                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                      <Clock className="w-3 h-3" />
                                      {event.time}
                                    </div>
                                  )}
                                  {event.description && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                      {event.description}
                                    </p>
                                  )}
                                </div>
                                <Badge className={`${getSourceBadgeColor(event.source)} text-white shrink-0`}>
                                  {getSourceIcon(event.source)}
                                  <span className="ml-1">{getSourceLabel(event.source)}</span>
                                </Badge>
                              </div>
                            </div>
                            <div className="px-3 py-2 bg-muted/20 border-t space-y-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="w-full bg-primary hover:bg-primary/90"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('[WorkspaceCalendarView] Abrir Board button clicked!', { event });
                                  onEventClick?.(event);
                                }}
                              >
                                <Kanban className="w-3 h-3 mr-2" />
                                Abrir Quadro no Workspace
                              </Button>
                              {showSyncButtons && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSyncToGoogle(event);
                                  }}
                                  disabled={syncToGoogleMutation.isPending}
                                >
                                  {syncToGoogleMutation.isPending ? (
                                    <>
                                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                      Sincronizando...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-3 h-3 mr-2" />
                                      Sincronizar com Google Calendar
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {eventsBySource.google_calendar.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          Google Calendar ({eventsBySource.google_calendar.length})
                        </h3>
                        {eventsBySource.google_calendar.map((event) => (
                          <div
                            key={event.id}
                            className="border rounded-lg overflow-hidden transition-all hover:shadow-md"
                          >
                            <div
                              className="p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                              onClick={(e) => {
                                console.log('[WorkspaceCalendarView] Google Calendar event clicked!', { 
                                  event, 
                                  onEventClick: typeof onEventClick,
                                  hasOnEventClick: !!onEventClick
                                });
                                onEventClick?.(event);
                              }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{event.title}</div>
                                  {event.time && (
                                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                      <Clock className="w-3 h-3" />
                                      {event.time}
                                    </div>
                                  )}
                                  {event.description && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                      {event.description}
                                    </p>
                                  )}
                                </div>
                                <Badge className={`${getSourceBadgeColor(event.source)} text-white shrink-0`}>
                                  {getSourceIcon(event.source)}
                                  <span className="ml-1">{getSourceLabel(event.source)}</span>
                                </Badge>
                              </div>
                            </div>
                            {showSyncButtons && (
                              <div className="px-3 py-2 bg-muted/20 border-t">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenImportDialog(event);
                                  }}
                                  disabled={syncFromGoogleMutation.isPending}
                                >
                                  <Download className="w-3 h-3 mr-2" />
                                  Importar para Workspace
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      {selectedDate 
                        ? 'Nenhum evento nesta data'
                        : 'Nenhum evento encontrado'
                      }
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={importDialog.open} onOpenChange={(open) => setImportDialog({ open, event: importDialog.event })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Importar Evento para Workspace
            </DialogTitle>
            <DialogDescription>
              Escolha onde deseja adicionar o evento "{importDialog.event?.title}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="destination-type">Tipo de Destino</Label>
              <Select value={selectedDestinationType} onValueChange={(value: 'board' | 'database') => {
                setSelectedDestinationType(value);
                setSelectedDestinationId('');
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="board">
                    <div className="flex items-center gap-2">
                      <Kanban className="w-4 h-4" />
                      Board
                    </div>
                  </SelectItem>
                  <SelectItem value="database">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Database
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination-id">
                {selectedDestinationType === 'board' ? 'Selecione o Board' : 'Selecione a Database'}
              </Label>
              {isLoadingWorkspace ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (selectedDestinationType === 'board' ? boards : databases).length === 0 ? (
                <div className="py-4 px-3 text-center text-sm text-muted-foreground border rounded-md bg-muted/20">
                  {selectedDestinationType === 'board' 
                    ? 'Nenhum board disponível. Crie um board primeiro.'
                    : 'Nenhuma database disponível. Crie uma database primeiro.'}
                </div>
              ) : (
                <Select value={selectedDestinationId} onValueChange={setSelectedDestinationId}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Escolha ${selectedDestinationType === 'board' ? 'um board' : 'uma database'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedDestinationType === 'board' ? boards : databases).map((item: any) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title || item.name || 'Sem título'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportDialog({ open: false, event: null })}
              disabled={syncFromGoogleMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImportFromGoogle}
              disabled={!selectedDestinationId || syncFromGoogleMutation.isPending || isLoadingWorkspace || (selectedDestinationType === 'board' ? boards : databases).length === 0}
            >
              {syncFromGoogleMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Importar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

function Label({ htmlFor, children, className }: { htmlFor?: string; children: React.ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}>
      {children}
    </label>
  );
}
