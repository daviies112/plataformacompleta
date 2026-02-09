import { useState } from 'react';
import { List, Card as CardType } from '@/types/kanban';
import { KanbanCard } from './KanbanCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, MoreHorizontal, Archive, Copy, ArrowRight, X, Pencil, Trash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';

interface KanbanListProps {
  list: List;
  onCardClick: (card: CardType) => void;
  onArchiveList?: (listId: string) => void;
  onCopyList?: (listId: string) => void;
  onDeleteList?: (listId: string) => void;
  onRenameList?: (listId: string, newTitle: string) => void;
  onMoveAllCards?: (listId: string, targetListId: string) => void;
  onAddCard?: (listId: string, title: string) => void;
  allLists?: List[];
}

export const KanbanList = ({ 
  list, 
  onCardClick,
  onArchiveList,
  onCopyList,
  onDeleteList,
  onRenameList,
  onMoveAllCards,
  onAddCard,
  allLists
}: KanbanListProps) => {
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(list.title);

  const handleAddCard = () => {
    if (newCardTitle.trim() && onAddCard) {
      onAddCard(list.id, newCardTitle.trim());
      setNewCardTitle('');
      setAddingCard(false);
      toast({
        title: "Cartão adicionado",
        description: "Um novo cartão foi criado na lista",
      });
    }
  };

  const handleArchiveList = () => {
    if (onArchiveList) {
      onArchiveList(list.id);
      toast({
        title: "Lista arquivada",
        description: "A lista foi arquivada com sucesso",
      });
    }
  };

  const handleCopyList = () => {
    if (onCopyList) {
      onCopyList(list.id);
      toast({
        title: "Lista copiada",
        description: "Uma cópia da lista foi criada",
      });
    }
  };

  const handleDeleteList = () => {
    if (onDeleteList) {
      onDeleteList(list.id);
      toast({
        title: "Lista excluída",
        description: "A lista foi excluída com sucesso",
      });
    }
  };

  const handleSaveTitle = () => {
    if (editedTitle.trim() && onRenameList) {
      onRenameList(list.id, editedTitle.trim());
      setIsEditingTitle(false);
      toast({
        title: "Lista renomeada",
        description: "O nome da lista foi atualizado",
      });
    } else {
      setEditedTitle(list.title);
      setIsEditingTitle(false);
    }
  };

  return (
    <div className="min-w-[280px] bg-list rounded-xl p-3 flex flex-col max-h-full border border-primary/20 hover:border-primary/30 transition-all duration-300 shadow-sm" data-testid={`list-${list.id}`}>
      <div className="flex items-center justify-between mb-3 px-1">
        {isEditingTitle ? (
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') {
                setEditedTitle(list.title);
                setIsEditingTitle(false);
              }
            }}
            autoFocus
            className="h-7 text-sm font-semibold"
            data-testid={`input-list-title-${list.id}`}
          />
        ) : (
          <h3 
            className="font-semibold text-sm text-foreground cursor-pointer hover:bg-card-hover px-2 py-1 rounded flex-1 transition-colors"
            onClick={() => setIsEditingTitle(true)}
            data-testid={`list-title-${list.id}`}
          >
            {list.title}
          </h3>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 hover:bg-card-hover"
              data-testid={`button-list-menu-${list.id}`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => setAddingCard(true)}
              data-testid={`menu-item-add-card-${list.id}`}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar cartão
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setIsEditingTitle(true)}
              data-testid={`menu-item-rename-list-${list.id}`}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Renomear lista
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleCopyList}
              data-testid={`menu-item-copy-list-${list.id}`}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar lista
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleDeleteList}
              className="text-destructive focus:text-destructive"
              data-testid={`menu-item-delete-list-${list.id}`}
            >
              <Trash className="w-4 h-4 mr-2" />
              Excluir lista
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
        {list.cards.map((card) => (
          <KanbanCard key={card.id} card={card} onClick={() => onCardClick(card)} />
        ))}
      </div>

      {addingCard ? (
        <div className="mt-2 space-y-2">
          <Input
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            placeholder="Digite um título para este cartão..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCard();
              if (e.key === 'Escape') {
                setAddingCard(false);
                setNewCardTitle('');
              }
            }}
            data-testid={`input-new-card-${list.id}`}
          />
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleAddCard}
              data-testid={`button-add-card-confirm-${list.id}`}
            >
              Adicionar cartão
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => {
                setAddingCard(false);
                setNewCardTitle('');
              }}
              data-testid={`button-add-card-cancel-${list.id}`}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          className="mt-2 justify-start text-muted-foreground hover:bg-card-hover hover:text-foreground w-full"
          size="sm"
          onClick={() => setAddingCard(true)}
          data-testid={`button-add-card-${list.id}`}
        >
          <Plus className="w-4 h-4 mr-1" />
          Adicionar um cartão
        </Button>
      )}
    </div>
  );
};
