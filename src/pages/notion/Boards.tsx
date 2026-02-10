import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Star, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Board as BoardType } from '@/types/kanban';

interface BoardsPageProps {
  boards: BoardType[];
  onCreateBoard: (title: string) => string;
  onSelectBoard: (boardId: string) => void;
}

const Boards = ({ boards, onCreateBoard, onSelectBoard }: BoardsPageProps) => {
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  const handleCreateBoard = () => {
    if (newBoardTitle.trim()) {
      const newBoardId = onCreateBoard(newBoardTitle);
      setNewBoardTitle('');
      setDialogOpen(false);
      navigate(`/board/${newBoardId}`);
    }
  };

  const handleBoardClick = (boardId: string) => {
    onSelectBoard(boardId);
    navigate(`/board/${boardId}`);
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5" />
            <h2 className="text-2xl font-bold">Quadros com estrela</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {boards.filter(board => board.starred).length === 0 ? (
              <p className="text-muted-foreground col-span-full">
                Nenhum quadro marcado com estrela
              </p>
            ) : (
              boards
                .filter(board => board.starred)
                .map((board) => (
                  <Card
                    key={board.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleBoardClick(board.id)}
                    data-testid={`board-card-${board.id}`}
                  >
                    <CardHeader className="h-24 bg-gradient-to-br from-blue-500 to-purple-600">
                      <CardTitle className="text-white text-lg">{board.title}</CardTitle>
                    </CardHeader>
                  </Card>
                ))
            )}
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5" />
            <h2 className="text-2xl font-bold">Visualizados recentemente</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {boards.slice(0, 4).map((board) => (
              <Card
                key={board.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleBoardClick(board.id)}
                data-testid={`board-card-recent-${board.id}`}
              >
                <CardHeader className="h-24 bg-gradient-to-br from-green-500 to-teal-600">
                  <CardTitle className="text-white text-lg">{board.title}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Seus quadros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {boards.map((board) => (
              <Card
                key={board.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleBoardClick(board.id)}
                data-testid={`board-card-all-${board.id}`}
              >
                <CardHeader className="h-24 bg-gradient-to-br from-indigo-500 to-blue-600">
                  <CardTitle className="text-white text-lg">{board.title}</CardTitle>
                </CardHeader>
              </Card>
            ))}
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-dashed">
                  <CardContent className="h-24 flex items-center justify-center">
                    <div className="text-center">
                      <Plus className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-semibold">Criar novo quadro</p>
                    </div>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent data-testid="dialog-create-board">
                <DialogHeader>
                  <DialogTitle>Criar quadro</DialogTitle>
                  <DialogDescription>
                    Adicione um novo quadro para organizar seus projetos
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="board-title">Título do quadro</Label>
                    <Input
                      id="board-title"
                      placeholder="Ex: Projeto de Marketing"
                      value={newBoardTitle}
                      onChange={(e) => setNewBoardTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateBoard();
                        }
                      }}
                      data-testid="input-board-title"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateBoard}
                    disabled={!newBoardTitle.trim()}
                    data-testid="button-create-board"
                  >
                    Criar quadro
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Boards;
