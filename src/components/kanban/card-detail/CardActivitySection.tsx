import { Card } from '@/types/kanban';
import { Activity, MessageSquare } from 'lucide-react';
import { MemberAvatar } from '@/components/kanban/card/MemberAvatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { useState } from 'react';

interface CardActivitySectionProps {
  card: Card;
  onUpdate: (card: Card) => void;
}

export const CardActivitySection = ({ card, onUpdate }: CardActivitySectionProps) => {
  const [newComment, setNewComment] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);

  const addComment = () => {
    if (!newComment.trim()) return;

    const activity = {
      id: `activity-${Date.now()}`,
      type: 'comment' as const,
      user: { id: 'm1', name: 'Você', initials: 'VC' },
      content: newComment,
      timestamp: new Date(),
    };

    onUpdate({ ...card, activities: [activity, ...card.activities] });
    setNewComment('');
    setShowCommentBox(false);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Activity className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold">Atividade</h3>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          {showCommentBox ? (
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="Escreva um comentário..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addComment}>
                  Salvar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowCommentBox(false);
                    setNewComment('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCommentBox(true)}
              className="flex-1 text-left p-3 bg-secondary/30 hover:bg-secondary/50 rounded text-sm text-muted-foreground transition-colors"
            >
              Escreva um comentário...
            </button>
          )}
        </div>

        {card.activities.map((activity) => (
          <div key={activity.id} className="flex gap-3">
            <MemberAvatar member={activity.user} size="md" />
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold text-sm">{activity.user.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: ptBR })}
                </span>
              </div>
              {activity.type === 'comment' ? (
                <div className="bg-secondary/30 rounded p-3">
                  <p className="text-sm whitespace-pre-wrap">{activity.content}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{activity.content}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
