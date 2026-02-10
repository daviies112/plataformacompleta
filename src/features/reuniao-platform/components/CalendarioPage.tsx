import { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Video, MapPin, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useReuniao } from '@/features/reuniao-platform/hooks/useReuniao';
import CreateEventModal from '../modals/CreateEventModal';
import { useQuery } from '@tanstack/react-query';

const locales = { 'pt-BR': ptBR };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ptBR }),
  getDay,
  locales,
});

// Interface para eventos do calendário
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    tipo: string;
    local?: string;
    roomId100ms?: string;
    linkReuniao?: string;
    status?: string;
    isWorkspace?: boolean;
  };
}

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { toast } = useToast();
  
  // Busca reuniões do banco de dados (100ms)
  const { meetings, loading: loadingMeetings, refetch: refetchMeetings } = useReuniao();

  // Busca dados do workspace
  const { data: workspaceData, isLoading: loadingWorkspace } = useQuery({
    queryKey: ['/api/workspace/tasks'],
    queryFn: async () => {
      const response = await fetch('/api/workspace/tasks');
      if (!response.ok) throw new Error('Falha ao buscar tarefas do workspace');
      return response.json();
    }
  });

  const isLoading = loadingMeetings || loadingWorkspace;

  // Converte reuniões e workspace para formato do calendário
  const events: CalendarEvent[] = useMemo(() => {
    const calendarEvents: CalendarEvent[] = [];

    // Adiciona reuniões (100ms)
    if (meetings && Array.isArray(meetings)) {
      meetings.forEach(meeting => {
        if (meeting.dataInicio && meeting.dataFim) {
          const startDate = new Date(meeting.dataInicio);
          const endDate = new Date(meeting.dataFim);
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            calendarEvents.push({
              id: `meeting-${meeting.id}`,
              title: meeting.titulo || 'Reunião 100ms',
              start: startDate,
              end: endDate,
              resource: {
                tipo: meeting.nome || 'online',
                local: meeting.telefone,
                roomId100ms: meeting.roomId100ms,
                linkReuniao: meeting.linkReuniao,
                status: meeting.status,
                isWorkspace: false,
              },
            });
          }
        }
      });
    }

    // Adiciona tarefas/eventos do workspace
    if (workspaceData && Array.isArray(workspaceData)) {
      workspaceData.forEach((task: any) => {
        const startDate = task.dueDate ? new Date(task.dueDate) : (task.createdAt ? new Date(task.createdAt) : null);
        if (startDate && !isNaN(startDate.getTime())) {
          // Define fim como 1h depois se não houver
          const endDate = task.endDate ? new Date(task.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);
          calendarEvents.push({
            id: `workspace-${task.id}`,
            title: task.title || task.content || 'Tarefa Workspace',
            start: startDate,
            end: endDate,
            resource: {
              tipo: 'workspace',
              local: task.location || '',
              status: task.status,
              isWorkspace: true,
            },
          });
        }
      });
    }

    return calendarEvents;
  }, [meetings, workspaceData]);

  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    if (action === 'PREV') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (action === 'NEXT') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(new Date());
    }
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedDate(start);
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    const { resource } = event;
    
    toast({
      title: event.title,
      description: (
        <div className="space-y-2 mt-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            <span>{format(event.start, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
          </div>
          
          {resource?.isWorkspace ? (
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              <span>Workspace: {resource.status || 'Pendente'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {resource?.tipo === 'online' ? (
                <>
                  <Video className="w-4 h-4" />
                  <span>Reunião Online (100ms)</span>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" />
                  <span>Presencial: {resource?.local || 'Local não definido'}</span>
                </>
              )}
            </div>
          )}

          {!resource?.isWorkspace && resource?.linkReuniao && (
            <Button
              size="sm"
              className="w-full mt-2"
              onClick={() => window.open(resource.linkReuniao, '_blank')}
            >
              Entrar na Reunião 100ms
            </Button>
          )}
        </div>
      ),
      duration: 5000,
    });
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const isWorkspace = event.resource?.isWorkspace;
    const isOnline = event.resource?.tipo === 'online';
    
    let backgroundColor = 'hsl(var(--primary))';
    if (isWorkspace) {
      backgroundColor = 'hsl(var(--accent))';
    } else if (!isOnline) {
      backgroundColor = 'hsl(var(--secondary))';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
      },
    };
  };

  const handleEventCreated = () => {
    setIsModalOpen(false);
    refetchMeetings();
    toast({
      title: 'Sucesso!',
      description: 'Reunião agendada e já aparece no calendário.',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando calendário...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Calendário de Reuniões</h1>
          <p className="text-muted-foreground">
            Gerencie seus agendamentos com integração 100ms
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <CalendarIcon className="w-4 h-4 mr-2" />
          Nova Reunião
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate('PREV')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate('TODAY')}
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate('NEXT')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-secondary/20 rounded-full border border-secondary/30">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-medium text-secondary-foreground">Supabase Sincronizado</span>
            </div>
          </div>
        </div>

        <div style={{ height: '600px' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            culture="pt-BR"
            messages={{
              next: 'Próximo',
              previous: 'Anterior',
              today: 'Hoje',
              month: 'Mês',
              week: 'Semana',
              day: 'Dia',
              agenda: 'Agenda',
              date: 'Data',
              time: 'Hora',
              event: 'Evento',
              noEventsInRange: 'Nenhum compromisso agendado neste período.',
            }}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            eventPropGetter={eventStyleGetter}
            date={currentDate}
            onNavigate={setCurrentDate}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary rounded"></div>
            <span>Reunião Online (100ms)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-secondary rounded"></div>
            <span>Reunião Presencial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-accent rounded"></div>
            <span>Workspace</span>
          </div>
        </div>
      </Card>

      <CreateEventModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        defaultDate={selectedDate}
        onSuccess={handleEventCreated}
      />
    </div>
  );
}
