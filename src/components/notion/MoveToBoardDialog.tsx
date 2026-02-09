import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LayoutGrid, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation } from '@tanstack/react-query';

interface MoveToBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageTitle: string;
  pageData: string;
}

interface Board {
  id: string;
  title: string;
}

export const MoveToBoardDialog = ({
  open,
  onOpenChange,
  pageTitle,
  pageData,
}: MoveToBoardDialogProps) => {
  const [selectedBoard, setSelectedBoard] = useState<string>('');

  // Buscar boards do Supabase
  const { data: boards = [], isLoading: loadingBoards } = useQuery<Board[]>({
    queryKey: ['/api/workspace/boards'],
    queryFn: async () => {
      const response = await fetch('/api/workspace/boards');
      if (!response.ok) {
        throw new Error('Erro ao carregar quadros');
      }
      return response.json();
    },
    enabled: open,
  });

  const moveToBoard = useMutation({
    mutationFn: async (boardId: string) => {
      const response = await fetch(`/api/workspace/boards/${boardId}/import-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageTitle,
          pageData: JSON.parse(pageData),
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao mover para o quadro');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success('Página movida para o quadro com sucesso!');
      onOpenChange(false);
      setSelectedBoard('');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao mover para o quadro');
    },
  });

  const handleMoveToBoard = () => {
    if (!selectedBoard) {
      toast.error('Selecione um quadro');
      return;
    }
    
    moveToBoard.mutate(selectedBoard);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Mover para Quadro</DialogTitle>
          <DialogDescription>
            Enviar "{pageTitle}" diretamente para um quadro existente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10">
            <div className="p-2 rounded-lg bg-green-500/20">
              <LayoutGrid className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Mover para Quadro</h3>
              <p className="text-sm text-foreground/80">
                Enviar diretamente para um quadro existente
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="board-select" className="text-foreground font-medium">
              Selecione o quadro
            </Label>
            <Select
              value={selectedBoard}
              onValueChange={setSelectedBoard}
              disabled={loadingBoards || moveToBoard.isPending}
            >
              <SelectTrigger id="board-select">
                <SelectValue placeholder="Escolha um quadro..." />
              </SelectTrigger>
              <SelectContent>
                {loadingBoards ? (
                  <div className="p-4 text-center text-sm text-foreground/70">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                    Carregando quadros...
                  </div>
                ) : boards.length === 0 ? (
                  <div className="p-4 text-center text-sm text-foreground/70">
                    Nenhum quadro disponível
                  </div>
                ) : (
                  boards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      {board.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleMoveToBoard}
            disabled={!selectedBoard || moveToBoard.isPending}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {moveToBoard.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Movendo...
              </>
            ) : (
              <>
                <LayoutGrid className="mr-2 h-4 w-4" />
                Mover para Quadro
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
