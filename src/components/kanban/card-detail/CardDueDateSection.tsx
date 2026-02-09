import { Card } from '@/types/kanban';
import { Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { useState } from 'react';

interface CardDueDateSectionProps {
  card: Card;
  onUpdate: (card: Card) => void;
}

export const CardDueDateSection = ({ card, onUpdate }: CardDueDateSectionProps) => {
  const [openDate, setOpenDate] = useState(false);
  const [openTime, setOpenTime] = useState(false);

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      onUpdate({ ...card, dueDate: date });
      setOpenDate(false);
    }
  };

  const handleTimeChange = (time: string) => {
    onUpdate({ ...card, dueTime: time });
  };

  const handleRemoveDate = () => {
    onUpdate({ ...card, dueDate: undefined, dueTime: undefined, completed: false });
    setOpenDate(false);
  };

  const handleRemoveTime = () => {
    onUpdate({ ...card, dueTime: undefined });
    setOpenTime(false);
  };

  const handleToggleComplete = () => {
    onUpdate({ ...card, completed: !card.completed });
  };

  const dueDate = card.dueDate ? (typeof card.dueDate === 'string' ? new Date(card.dueDate) : card.dueDate) : null;
  const dueTime = card.dueTime || '';
  
  const isDueSoon =
    dueDate && !card.completed && dueDate.getTime() - Date.now() < 24 * 60 * 60 * 1000;
  const isOverdue = dueDate && !card.completed && dueDate < new Date();

  return (
    <div className="space-y-4">
      {/* Data de Vencimento */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Data de vencimento
        </h4>
        {!dueDate ? (
          <Popover open={openDate} onOpenChange={setOpenDate}>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Adicionar data
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4">
              <CalendarComponent
                mode="single"
                selected={undefined}
                onSelect={handleDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        ) : (
          <div className="flex items-center gap-2">
            <Checkbox checked={card.completed} onCheckedChange={handleToggleComplete} />
            <Popover open={openDate} onOpenChange={setOpenDate}>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className={
                    card.completed
                      ? 'bg-label-green/10 text-label-green hover:bg-label-green/20'
                      : isOverdue
                      ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                      : isDueSoon
                      ? 'bg-label-yellow/10 text-label-yellow hover:bg-label-yellow/20'
                      : ''
                  }
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {format(dueDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4">
                <CalendarComponent
                  mode="single"
                  selected={dueDate}
                  onSelect={handleDateChange}
                  initialFocus
                />
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleRemoveDate}
                  className="w-full mt-3"
                >
                  Remover data
                </Button>
              </PopoverContent>
            </Popover>
            {card.completed && (
              <span className="text-xs text-label-green font-medium">Concluído</span>
            )}
            {!card.completed && isOverdue && (
              <span className="text-xs text-destructive font-medium">Atrasado</span>
            )}
            {!card.completed && isDueSoon && !isOverdue && (
              <span className="text-xs text-label-yellow font-medium">Vence em breve</span>
            )}
          </div>
        )}
      </div>

      {/* Horário (separado) */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Horário
        </h4>
        {!dueTime ? (
          <Popover open={openTime} onOpenChange={setOpenTime}>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="sm">
                <Clock className="w-4 h-4 mr-2" />
                Adicionar horário
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4">
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Defina o horário
              </label>
              <Input
                type="time"
                defaultValue="12:00"
                onChange={(e) => {
                  handleTimeChange(e.target.value);
                  setOpenTime(false);
                }}
                className="w-full"
              />
            </PopoverContent>
          </Popover>
        ) : (
          <div className="flex items-center gap-2">
            <Popover open={openTime} onOpenChange={setOpenTime}>
              <PopoverTrigger asChild>
                <Button variant="secondary" size="sm">
                  <Clock className="w-4 h-4 mr-2" />
                  {dueTime}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Alterar horário
                </label>
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="w-full mb-3"
                />
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleRemoveTime}
                  className="w-full"
                >
                  Remover horário
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </div>
  );
};
