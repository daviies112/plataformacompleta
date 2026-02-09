import { Card, Checklist, ChecklistItem } from '@/types/kanban';
import { CheckSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';

interface CardChecklistsSectionProps {
  card: Card;
  onUpdate: (card: Card) => void;
}

export const CardChecklistsSection = ({ card, onUpdate }: CardChecklistsSectionProps) => {
  const [newItemText, setNewItemText] = useState<{ [key: string]: string }>({});

  const toggleChecklistItem = (checklistId: string, itemId: string) => {
    const updatedChecklists = card.checklists.map((checklist) =>
      checklist.id === checklistId
        ? {
            ...checklist,
            items: checklist.items.map((item) =>
              item.id === itemId ? { ...item, completed: !item.completed } : item
            ),
          }
        : checklist
    );
    onUpdate({ ...card, checklists: updatedChecklists });
  };

  const deleteChecklistItem = (checklistId: string, itemId: string) => {
    const updatedChecklists = card.checklists.map((checklist) =>
      checklist.id === checklistId
        ? {
            ...checklist,
            items: checklist.items.filter((item) => item.id !== itemId),
          }
        : checklist
    );
    onUpdate({ ...card, checklists: updatedChecklists });
  };

  const addChecklistItem = (checklistId: string) => {
    const text = newItemText[checklistId]?.trim();
    if (!text) return;

    const updatedChecklists = card.checklists.map((checklist) =>
      checklist.id === checklistId
        ? {
            ...checklist,
            items: [
              ...checklist.items,
              {
                id: `item-${Date.now()}`,
                text,
                completed: false,
              },
            ],
          }
        : checklist
    );
    onUpdate({ ...card, checklists: updatedChecklists });
    setNewItemText({ ...newItemText, [checklistId]: '' });
  };

  const deleteChecklist = (checklistId: string) => {
    const updatedChecklists = card.checklists.filter((cl) => cl.id !== checklistId);
    onUpdate({ ...card, checklists: updatedChecklists });
  };

  const getProgress = (checklist: Checklist) => {
    if (checklist.items.length === 0) return 0;
    const completed = checklist.items.filter((item) => item.completed).length;
    return (completed / checklist.items.length) * 100;
  };

  if (card.checklists.length === 0) return null;

  return (
    <div className="space-y-4">
      {card.checklists.map((checklist) => {
        const progress = getProgress(checklist);
        const completed = checklist.items.filter((item) => item.completed).length;

        return (
          <div key={checklist.id}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-muted-foreground" />
                {checklist.title}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteChecklist(checklist.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                Excluir
              </Button>
            </div>

            <div className="mb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="space-y-2 mb-3">
              {checklist.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-secondary/50 group"
                >
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => toggleChecklistItem(checklist.id, item.id)}
                  />
                  <span
                    className={`flex-1 text-sm ${
                      item.completed ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {item.text}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteChecklistItem(checklist.id, item.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Adicionar um item"
                value={newItemText[checklist.id] || ''}
                onChange={(e) =>
                  setNewItemText({ ...newItemText, [checklist.id]: e.target.value })
                }
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addChecklistItem(checklist.id);
                  }
                }}
              />
              <Button size="sm" onClick={() => addChecklistItem(checklist.id)}>
                Adicionar
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
