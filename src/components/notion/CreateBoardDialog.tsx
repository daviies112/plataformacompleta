import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeSelector } from './ThemeSelector';

interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (title: string, icon: string, themeId?: string) => void;
}

export const CreateBoardDialog = ({ open, onOpenChange, onCreate }: CreateBoardDialogProps) => {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('📋');
  const [themeId, setThemeId] = useState<string>('none');

  const handleCreate = () => {
    if (title.trim()) {
      onCreate(title, icon, themeId === 'none' ? undefined : themeId);
      setTitle('');
      setIcon('📋');
      setThemeId('none');
      onOpenChange(false);
    }
  };

  const emojiOptions = ['📋', '📊', '✅', '🎯', '📈', '🗂️', '📌', '🔖', '💼', '🏆', '🚀', '⭐'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Quadro Kanban</DialogTitle>
          <DialogDescription>
            Crie um novo quadro Kanban para gerenciar suas tarefas
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título do Quadro</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  handleCreate();
                }
              }}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="flex gap-2 flex-wrap">
              {emojiOptions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setIcon(emoji)}
                  className={`text-2xl p-2 rounded hover:bg-muted ${
                    icon === emoji ? 'bg-muted ring-2 ring-primary' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          
          <ThemeSelector
            selectedThemeId={themeId}
            onThemeSelect={setThemeId}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim()}>
            Criar Quadro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
