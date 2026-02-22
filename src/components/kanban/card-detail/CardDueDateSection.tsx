import { Card } from '@/types/kanban';
import { Calendar, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { useState } from 'react';
import { cn } from '@/lib/utils';

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
    <div className="space-y-6 bg-secondary/10 p-4 rounded-xl border border-border/50">
      {/* Data de Vencimento */}
      <div>
        <h4 className="text-[10px] font-bold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          Data de vencimento
        </h4>
        {!dueDate ? (
          <Popover open={openDate} onOpenChange={setOpenDate}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start h-9 bg-background hover:bg-secondary/50 border-dashed border-2 transition-all hover:border-primary/50"
              >
                <Plus className="w-4 h-4 mr-2 text-muted-foreground" />
                Adicionar data
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-xl overflow-hidden" align="start">
              <CalendarComponent
                mode="single"
                selected={undefined}
                onSelect={handleDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-background p-2.5 rounded-lg border border-border shadow-sm group">
              <Checkbox
                checked={card.completed}
                onCheckedChange={handleToggleComplete}
                className="w-5 h-5 rounded-md"
              />
              <Popover open={openDate} onOpenChange={setOpenDate}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "flex-1 text-left text-sm font-medium transition-colors hover:text-primary",
                      card.completed && "line-through text-muted-foreground opacity-70"
                    )}
                  >
                    {format(dueDate, "d 'de' MMMM, yyyy", { locale: ptBR })}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-xl overflow-hidden" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dueDate}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                  <div className="p-2 bg-secondary/5 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveDate}
                      className="w-full text-destructive hover:bg-destructive/10 h-8"
                    >
                      Remover data
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="flex items-center gap-2">
                {card.completed ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-500 uppercase">Concluído</span>
                ) : isOverdue ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-destructive/10 text-destructive uppercase">Atrasado</span>
                ) : isDueSoon ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-500 uppercase">Em breve</span>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Horário */}
      <div>
        <h4 className="text-[10px] font-bold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-primary" />
          Horário preferencial
        </h4>
        {!dueTime ? (
          <Popover open={openTime} onOpenChange={setOpenTime}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start h-9 bg-background hover:bg-secondary/50 border-dashed border-2 transition-all hover:border-primary/50"
              >
                <Plus className="w-4 h-4 mr-2 text-muted-foreground" />
                Adicionar horário
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4 border-none shadow-2xl rounded-xl" align="start">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                  Selecione o horário
                </label>
                <Input
                  type="time"
                  defaultValue="12:00"
                  onChange={(e) => {
                    handleTimeChange(e.target.value);
                    setOpenTime(false);
                  }}
                  className="h-10 bg-secondary/20 border-none focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <Popover open={openTime} onOpenChange={setOpenTime}>
            <PopoverTrigger asChild>
              <div className="flex items-center gap-3 bg-background p-2.5 rounded-lg border border-border shadow-sm cursor-pointer hover:border-primary/30 transition-all group">
                <Clock className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="flex-1 text-sm font-medium">{dueTime}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-0 group-hover:opacity-100 transition-opacity">Editar</span>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4 border-none shadow-2xl rounded-xl" align="start">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">
                    Alterar horário
                  </label>
                  <Input
                    type="time"
                    value={dueTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="h-10 bg-secondary/20 border-none focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveTime}
                  className="w-full text-destructive hover:bg-destructive/10 h-8"
                >
                  Remover horário
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};
