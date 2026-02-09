import { Card } from '@/types/kanban';
import { Calendar, CheckSquare, Paperclip, MessageSquare, Eye, MapPin, Hash, Type, CalendarDays, CheckCircle2, List, Clock } from 'lucide-react';
import { CardLabel } from './card/CardLabel';
import { CardCoverDisplay } from './card/CardCoverDisplay';
import { MemberAvatar } from './card/MemberAvatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { labelColorClassesWithOpacity } from '@/lib/labelColors';

interface KanbanCardProps {
  card: Card;
  onClick: () => void;
}

export const KanbanCard = ({ card, onClick }: KanbanCardProps) => {
  const totalChecklistItems = (card.checklists || []).reduce((acc, cl) => acc + cl.items.length, 0);
  const completedChecklistItems = (card.checklists || []).reduce(
    (acc, cl) => acc + cl.items.filter((item) => item.completed).length,
    0
  );

  const dueDate = card.dueDate ? (card.dueDate instanceof Date ? card.dueDate : new Date(card.dueDate)) : null;
  const isDueSoon =
    dueDate && !card.completed && dueDate.getTime() - Date.now() < 24 * 60 * 60 * 1000;
  const isOverdue = dueDate && !card.completed && dueDate < new Date();

  const getCustomFieldIcon = (type: string) => {
    switch (type) {
      case 'number':
        return Hash;
      case 'text':
        return Type;
      case 'date':
        return CalendarDays;
      case 'checkbox':
        return CheckCircle2;
      case 'select':
        return List;
      default:
        return Type;
    }
  };

  return (
    <div
      onClick={onClick}
      data-testid="kanban-card"
      className="bg-card rounded-lg shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-border hover:border-primary/40 overflow-hidden group hover:-translate-y-0.5"
    >
      {card.cover && <CardCoverDisplay cover={card.cover} />}

      <div className="p-3">
        {(card.labels || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {(card.labels || []).map((label) => (
              <CardLabel key={label.id} label={label} size="compact" />
            ))}
          </div>
        )}

        <h4 className="text-sm font-medium text-card-foreground mb-3 group-hover:text-primary transition-colors">
          {card.title}
        </h4>

        <div className="flex flex-wrap gap-2 items-center">
          {dueDate && (
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                card.completed
                  ? 'bg-label-green/10 text-label-green'
                  : isOverdue
                  ? 'bg-destructive/10 text-destructive'
                  : isDueSoon
                  ? 'bg-label-yellow/10 text-label-yellow'
                  : 'bg-secondary text-secondary-foreground'
              }`}
              data-testid={`badge-due-date-${card.id}`}
            >
              <Calendar className="w-3 h-3" />
              <span>{format(dueDate, 'd MMM', { locale: ptBR })}</span>
            </div>
          )}

          {card.dueTime && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-500"
              data-testid={`badge-due-time-${card.id}`}
            >
              <Clock className="w-3 h-3" />
              <span>{card.dueTime}</span>
            </div>
          )}

          {card.description && (
            <div className="flex items-center gap-1 text-muted-foreground" data-testid={`badge-description-${card.id}`}>
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
          )}

          {totalChecklistItems > 0 && (
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                completedChecklistItems === totalChecklistItems
                  ? 'bg-label-green/10 text-label-green'
                  : 'bg-secondary text-secondary-foreground'
              }`}
              data-testid={`badge-checklist-${card.id}`}
            >
              <CheckSquare className="w-3 h-3" />
              <span>
                {completedChecklistItems}/{totalChecklistItems}
              </span>
            </div>
          )}

          {(card.attachments || []).length > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground text-xs" data-testid={`badge-attachments-${card.id}`}>
              <Paperclip className="w-3.5 h-3.5" />
              <span>{(card.attachments || []).length}</span>
            </div>
          )}

          {(card.customFields || []).length > 0 && (card.customFields || []).filter(f => f.value).map((field) => {
            const Icon = getCustomFieldIcon(field.type);
            const colorClass = field.color ? labelColorClassesWithOpacity[field.color] : 'bg-secondary text-secondary-foreground';
            
            return (
              <div
                key={field.id}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${colorClass}`}
                data-testid={`badge-custom-field-${field.id}`}
                title={`${field.name}: ${field.value}`}
              >
                <Icon className="w-3 h-3" />
                <span className="truncate max-w-[80px]">{field.value}</span>
              </div>
            );
          })}

          {card.location && (
            <div className="flex items-center gap-1 text-muted-foreground text-xs" data-testid={`badge-location-${card.id}`}>
              <MapPin className="w-3.5 h-3.5" />
            </div>
          )}

          {card.cover && (
            <div className="flex items-center gap-1 text-muted-foreground" data-testid={`badge-cover-${card.id}`}>
              <Eye className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {(card.members || []).length > 0 && (
          <div className="flex gap-1 mt-3">
            {(card.members || []).map((member) => (
              <MemberAvatar key={member.id} member={member} size="sm" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
