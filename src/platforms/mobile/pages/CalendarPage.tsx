import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, Loader2, MapPin } from 'lucide-react';
import { MobileCard } from '@/platforms/mobile/components/premium/MobileCard';
import { MobileButton } from '@/platforms/mobile/components/premium/MobileButton';
import { MobileInput } from '@/platforms/mobile/components/premium/MobileInput';
import { BottomNav } from '@/components/mobile/BottomNav';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

const hapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

const strongHapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate([15, 10, 15]);
  }
};

interface Event {
  id: string;
  title: string;
  summary?: string;
  date: string;
  time: string;
  duration?: number;
  description?: string;
  type?: string;
  status?: string;
  client?: string;
  meetLink?: string;
  location?: string;
}

const CalendarPage = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [longPressedDate, setLongPressedDate] = useState<Date | null>(null);
  const [newEvent, setNewEvent] = useState({ title: '', time: '', description: '' });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const dayChipsRef = useRef<HTMLDivElement>(null);

  const { data: calendarData, isLoading } = useQuery({
    queryKey: ['/api/dashboard/calendar-events'],
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  const events: Event[] = calendarData?.data || [];

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      try {
        const eventDate = parseISO(event.date);
        return isSameDay(eventDate, date);
      } catch {
        return false;
      }
    });
  };

  const hasEvents = (date: Date) => getEventsForDate(date).length > 0;
  const selectedDateEvents = getEventsForDate(selectedDate);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    hapticFeedback();
    setSlideDirection(direction === 'next' ? 'left' : 'right');
    setCurrentMonth(direction === 'next' ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
    setTimeout(() => setSlideDirection(null), 200);
  };

  const handleDaySelect = (date: Date) => {
    hapticFeedback();
    setSelectedDate(date);
  };

  const handleLongPressStart = (date: Date) => {
    longPressTimer.current = setTimeout(() => {
      strongHapticFeedback();
      setLongPressedDate(date);
      setIsDrawerOpen(true);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleSaveEvent = () => {
    // Here you would integrate with the actual API to save the event
    console.log('Save event:', { ...newEvent, date: longPressedDate });
    strongHapticFeedback();
    setIsDrawerOpen(false);
    setNewEvent({ title: '', time: '', description: '' });
  };

  useEffect(() => {
    if (dayChipsRef.current && selectedDate) {
      const dayIndex = daysInMonth.findIndex(day => isSameDay(day, selectedDate));
      if (dayIndex !== -1) {
        const chipWidth = 60;
        const scrollPosition = dayIndex * chipWidth - (window.innerWidth / 2) + (chipWidth / 2);
        dayChipsRef.current.scrollTo({
          left: scrollPosition,
          behavior: 'smooth',
        });
      }
    }
  }, [selectedDate, daysInMonth]);

  const getEventTypeColor = (type?: string) => {
    switch (type) {
      case 'video':
        return 'bg-green-500';
      case 'meeting':
        return 'bg-blue-500';
      case 'phone':
        return 'bg-purple-500';
      default:
        return 'bg-primary';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmado':
        return 'border-l-green-500';
      case 'provisorio':
        return 'border-l-yellow-500';
      case 'cancelado':
        return 'border-l-red-500';
      default:
        return 'border-l-primary';
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando agenda...</p>
          </div>
        </div>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen pb-24">
        {/* Sticky Glass Month Picker */}
        <div className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-white/10">
          <MobileCard 
            variant="elevated" 
            padding="md" 
            className="rounded-none border-0 border-b border-white/10"
          >
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleMonthChange('prev')}
                className="p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-all duration-150 touch-manipulation"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-6 h-6 text-foreground" />
              </button>

              <div className={cn(
                "flex flex-col items-center transition-all duration-200",
                slideDirection === 'left' && 'animate-slide-out-left',
                slideDirection === 'right' && 'animate-slide-out-right'
              )}>
                <h1 className="text-2xl font-bold text-foreground">
                  {format(currentMonth, 'MMMM', { locale: ptBR })}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {format(currentMonth, 'yyyy')}
                </p>
              </div>

              <button
                onClick={() => handleMonthChange('next')}
                className="p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-all duration-150 touch-manipulation"
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-6 h-6 text-foreground" />
              </button>
            </div>
          </MobileCard>
        </div>

        {/* Animated Day Chips */}
        <div className="sticky top-[88px] z-20 backdrop-blur-xl bg-background/60 border-b border-white/10 py-4">
          <div
            ref={dayChipsRef}
            className="flex gap-3 px-4 overflow-x-auto scrollbar-hide scroll-smooth"
          >
            {daysInMonth.map((day, index) => {
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);
              const dayHasEvents = hasEvents(day);

              return (
                <button
                  key={index}
                  onClick={() => handleDaySelect(day)}
                  onTouchStart={() => handleLongPressStart(day)}
                  onTouchEnd={handleLongPressEnd}
                  onMouseDown={() => handleLongPressStart(day)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  className={cn(
                    "flex-shrink-0 w-14 h-14 rounded-full flex flex-col items-center justify-center",
                    "transition-all duration-150 touch-manipulation relative",
                    "border-2",
                    isSelected && "scale-110",
                    isCurrentDay && !isSelected && "animate-glow border-primary/50 bg-primary/10",
                    isSelected && "bg-primary border-primary shadow-[0_0_24px_rgba(212,175,55,0.4)]",
                    !isSelected && !isCurrentDay && "border-white/10 hover:border-white/20 active:scale-95"
                  )}
                >
                  <span className={cn(
                    "text-xs font-medium",
                    isSelected ? "text-primary-foreground" : "text-muted-foreground"
                  )}>
                    {format(day, 'EEE', { locale: ptBR }).toUpperCase()}
                  </span>
                  <span className={cn(
                    "text-lg font-bold",
                    isSelected ? "text-primary-foreground" : "text-foreground"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {dayHasEvents && (
                    <div className={cn(
                      "absolute bottom-1 w-1.5 h-1.5 rounded-full",
                      isSelected ? "bg-primary-foreground" : "bg-primary"
                    )} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Premium Agenda View */}
        <div className="px-4 pt-6 pb-4 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">
              {isToday(selectedDate) 
                ? 'Hoje' 
                : format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </h2>
            <Badge variant="outline" className="text-xs">
              {selectedDateEvents.length} evento{selectedDateEvents.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {selectedDateEvents.length === 0 ? (
            <MobileCard 
              variant="outlined" 
              padding="lg"
              className="animate-scale-in"
            >
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold text-foreground mb-1">
                  Nenhum evento para hoje
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Que tal adicionar um novo compromisso?
                </p>
                <MobileButton
                  variant="primary"
                  onClick={() => {
                    setLongPressedDate(selectedDate);
                    setIsDrawerOpen(true);
                  }}
                  className="max-w-xs"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Adicionar Evento
                </MobileButton>
              </div>
            </MobileCard>
          ) : (
            <div className="space-y-3 animate-fadeIn">
              {selectedDateEvents.map((event, index) => (
                <MobileCard
                  key={event.id || index}
                  variant="elevated"
                  padding="md"
                  clickable
                  className={cn(
                    "border-l-4 animate-scale-in",
                    getStatusColor(event.status)
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex gap-4">
                    {/* Time */}
                    <div className="flex-shrink-0 text-right w-16">
                      <p className="text-lg font-bold text-foreground leading-tight">
                        {event.time}
                      </p>
                      {event.duration && (
                        <p className="text-xs text-muted-foreground">
                          {event.duration}min
                        </p>
                      )}
                    </div>

                    {/* Event Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-base text-foreground line-clamp-2">
                          {event.title || event.summary || 'Evento sem título'}
                        </h3>
                        <Badge 
                          className={cn(
                            "flex-shrink-0 text-xs",
                            getEventTypeColor(event.type)
                          )}
                        >
                          {event.type === 'video' ? '🎥' : event.type === 'phone' ? '📞' : '👥'}
                        </Badge>
                      </div>

                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {event.description}
                        </p>
                      )}

                      {(event.client || event.location) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span className="line-clamp-1">{event.location}</span>
                            </div>
                          )}
                          {event.client && (
                            <span className="line-clamp-1">• {event.client}</span>
                          )}
                        </div>
                      )}

                      {event.meetLink && (
                        <MobileButton
                          variant="primary"
                          className="mt-3"
                          onClick={() => window.open(event.meetLink, '_blank')}
                        >
                          Entrar na reunião
                        </MobileButton>
                      )}
                    </div>
                  </div>
                </MobileCard>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Long-press to Add Event - Bottom Sheet */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="backdrop-blur-xl bg-background/95 border-white/10">
          <DrawerHeader>
            <DrawerTitle className="text-xl font-bold text-foreground">
              Novo Evento
            </DrawerTitle>
            {longPressedDate && (
              <p className="text-sm text-muted-foreground">
                {format(longPressedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            )}
          </DrawerHeader>

          <div className="px-4 pb-8 space-y-4">
            <MobileInput
              label="Título"
              placeholder="Nome do evento"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
            />

            <MobileInput
              label="Horário"
              type="time"
              icon={Clock}
              value={newEvent.time}
              onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
            />

            <MobileInput
              label="Descrição (opcional)"
              placeholder="Adicione detalhes sobre o evento"
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
            />
          </div>

          <DrawerFooter className="px-4 pb-8">
            <MobileButton
              variant="primary"
              onClick={handleSaveEvent}
              disabled={!newEvent.title || !newEvent.time}
            >
              <Plus className="w-5 h-5 mr-2" />
              Salvar Evento
            </MobileButton>
            <MobileButton
              variant="secondary"
              onClick={() => {
                setIsDrawerOpen(false);
                setNewEvent({ title: '', time: '', description: '' });
              }}
            >
              Cancelar
            </MobileButton>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <BottomNav />
    </>
  );
};

export default CalendarPage;
