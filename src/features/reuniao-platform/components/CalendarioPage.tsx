import { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Video, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useReuniao } from '@/features/reuniao-platform/hooks/useReuniao';
import CreateEventModal from '../modals/CreateEventModal';

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
  };
}

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { toast } = useToast();
  
  // Busca reuniões do banco de dados
  const { meetings, isLoading, refetch } = useReuniao();

  // Converte reuniões para formato do calendário com tratamento de erro
  const events: CalendarEvent[] = useMemo(() => {
    if (!meetings || !Array.isArray(meetings)) {
      console.warn('Meetings não é um array válido:', meetings);
      return [];
    }

    try {
      return meetings
        .filter(meeting => meeting && meeting.dataInicio && meeting.dataFim)
        .map(meeting => {
          try {
            const startDate = new Date(meeting.dataInicio);
            const endDate = new Date(meeting.dataFim);

            // Valida se as datas são válidas
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              console.warn('Data inválida na reunião:', meeting.id);
              return null;
            }

            return {
              id: meeting.id,
              title: meeting.titulo || 'Reunião sem título',
              start: startDate,
              end: endDate,
              resource: {
                tipo: meeting.nome || 'online',
                local: meeting.telefone,
                roomId100ms: meeting.roomId100ms,
                linkReuniao: meeting.linkReuniao,
                status: meeting.status,
              },
            };
          } catch (err) {
            console.error('Erro ao processar reunião:', meeting.id, err);
            return null;
          }
        })
        .filter((event): event is CalendarEvent => event !== null);
    } catch (err) {
      console.error('Erro ao mapear eventos:', err);
      return [];
    }
  }, [meetings]);

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
          {resource?.tipo && (
            <div className="flex items-center gap-2">
              {resource.tipo === 'online' ? (
                <>
                  <Video className="w-4 h-4" />
                  <span>Reunião Online (100ms)</span>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" />
                  <span>Presencial: {resource.local || 'Local não definido'}</span>
                </>
              )}
            </div>
          )}
          {resource?.linkReuniao && (
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
    const isOnline = event.resource?.tipo === 'online';
    return {
      style: {
        backgroundColor: isOnline ? 'hsl(var(--primary))' : 'hsl(var(--secondary))',
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
    refetch(); // Atualiza a lista de reuniões
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
          <h2 className="text-xl font-semibold capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
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
              noEventsInRange: 'Nenhuma reunião agendada neste período.',
            }}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            eventPropGetter={eventStyleGetter}
            date={currentDate}
            onNavigate={setCurrentDate}
          />
        </div>

        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary rounded"></div>
            <span>Reunião Online (100ms)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-secondary rounded"></div>
            <span>Reunião Presencial</span>
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
