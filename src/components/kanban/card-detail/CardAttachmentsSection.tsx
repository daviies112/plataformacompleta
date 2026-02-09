import { Card } from '@/types/kanban';
import { Paperclip, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

interface CardAttachmentsSectionProps {
  card: Card;
  onUpdate: (card: Card) => void;
}

export const CardAttachmentsSection = ({ card, onUpdate }: CardAttachmentsSectionProps) => {
  const deleteAttachment = (attachmentId: string) => {
    const updatedAttachments = card.attachments.filter((a) => a.id !== attachmentId);
    onUpdate({ ...card, attachments: updatedAttachments });
  };

  if (card.attachments.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <Paperclip className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold">Anexos</h3>
      </div>
      <div className="space-y-2">
        {card.attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center gap-3 p-3 bg-secondary/30 rounded hover:bg-secondary/50 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sm hover:underline flex items-center gap-1"
                >
                  {attachment.name}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Adicionado {format(attachment.addedAt, "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
              onClick={() => deleteAttachment(attachment.id)}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
