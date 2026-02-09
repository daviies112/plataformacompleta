import { useState, useMemo, useEffect } from 'react';
import { Board as BoardType, Card as CardType, List } from '@/types/kanban';
import { KanbanList } from './KanbanList';
import { CardDetailModal } from './CardDetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { useFilters, matchesFilters } from '@/contexts/FiltersContext';
import { toast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';

interface BoardProps {
  board: BoardType;
  onUpdateBoard: (board: BoardType) => void;
  filterSidebarOpen: boolean;
  onFilterSidebarChange: (open: boolean) => void;
}

export const Board = ({ board, onUpdateBoard, filterSidebarOpen, onFilterSidebarChange }: BoardProps) => {
  const [selectedCard, setSelectedCard] = useState<{ card: CardType; listId: string } | null>(null);
  const [addingList, setAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const { filters, currentUserId, hasActiveFilters } = useFilters();
  const [searchParams, setSearchParams] = useSearchParams();

  // Detectar cardId da URL e abrir o card automaticamente
  useEffect(() => {
    const cardId = searchParams.get('cardId');
    if (cardId && board.lists) {
      console.log('[Board] Detectado cardId na URL:', cardId);
      
      // Buscar o card nas listas
      for (const list of board.lists) {
        const card = list.cards?.find(c => c.id === cardId);
        if (card) {
          console.log('[Board] Card encontrado, abrindo modal:', card.title);
          setSelectedCard({ card, listId: list.id });
          
          // Remover o cardId da URL para não reabrir sempre
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete('cardId');
          setSearchParams(newSearchParams, { replace: true });
          
          toast({
            title: "Card aberto",
            description: `Visualizando: ${card.title}`,
          });
          
          break;
        }
      }
      
      if (!selectedCard) {
        console.warn('[Board] Card não encontrado:', cardId);
      }
    }
  }, [searchParams, board.lists]);

  const handleCardClick = (card: CardType, listId: string) => {
    setSelectedCard({ card, listId });
  };

  const handleUpdateCard = (updatedCard: CardType) => {
    if (!selectedCard) return;

    const updatedBoard = {
      ...board,
      lists: board.lists.map((list) =>
        list.id === selectedCard.listId
          ? {
              ...list,
              cards: list.cards.map((card) =>
                card.id === updatedCard.id ? updatedCard : card
              ),
            }
          : list
      ),
    };

    onUpdateBoard(updatedBoard);
    setSelectedCard({ card: updatedCard, listId: selectedCard.listId });
  };

  const handleDeleteCard = (cardId: string) => {
    if (!selectedCard) return;

    const updatedBoard = {
      ...board,
      lists: board.lists.map((list) =>
        list.id === selectedCard.listId
          ? {
              ...list,
              cards: list.cards.filter((card) => card.id !== cardId),
            }
          : list
      ),
    };

    onUpdateBoard(updatedBoard);
    setSelectedCard(null);
  };

  const handleMoveCard = (cardId: string, targetListId: string) => {
    if (!selectedCard) return;

    const card = selectedCard.card;
    const sourceListId = selectedCard.listId;

    const updatedBoard = {
      ...board,
      lists: board.lists.map((list) => {
        if (list.id === sourceListId) {
          return {
            ...list,
            cards: list.cards.filter((c) => c.id !== cardId),
          };
        }
        if (list.id === targetListId) {
          return {
            ...list,
            cards: [...list.cards, card],
          };
        }
        return list;
      }),
    };

    onUpdateBoard(updatedBoard);
    setSelectedCard(null);
  };

  const handleCopyCard = (cardId: string) => {
    if (!selectedCard) return;

    const originalCard = selectedCard.card;
    const newCard: CardType = {
      ...originalCard,
      id: `card-${Date.now()}`,
      title: `${originalCard.title} (cópia)`,
      activities: [],
    };

    const updatedBoard = {
      ...board,
      lists: board.lists.map((list) =>
        list.id === selectedCard.listId
          ? {
              ...list,
              cards: [...list.cards, newCard],
            }
          : list
      ),
    };

    onUpdateBoard(updatedBoard);
  };

  const handleArchiveCard = (cardId: string) => {
    if (!selectedCard) return;

    const updatedCard = { ...selectedCard.card, archived: !selectedCard.card.archived };

    const updatedBoard = {
      ...board,
      lists: board.lists.map((list) =>
        list.id === selectedCard.listId
          ? {
              ...list,
              cards: list.cards.map((card) =>
                card.id === cardId
                  ? updatedCard
                  : card
              ),
            }
          : list
      ),
    };

    onUpdateBoard(updatedBoard);
    // Update selectedCard to reflect the new archived state
    setSelectedCard({ card: updatedCard, listId: selectedCard.listId });
  };

  const handleAddCard = (listId: string, title: string) => {
    const newCard: CardType = {
      id: `card-${Date.now()}`,
      title,
      labels: [],
      completed: false,
      checklists: [],
      members: [],
      attachments: [],
      customFields: [],
      activities: [],
    };

    const updatedBoard = {
      ...board,
      lists: board.lists.map((list) =>
        list.id === listId
          ? {
              ...list,
              cards: [...list.cards, newCard],
            }
          : list
      ),
    };

    onUpdateBoard(updatedBoard);
  };

  const handleArchiveList = (listId: string) => {
    const updatedBoard = {
      ...board,
      lists: board.lists.map((list) =>
        list.id === listId
          ? { ...list, archived: !list.archived }
          : list
      ),
    };

    onUpdateBoard(updatedBoard);
  };

  const handleCopyList = (listId: string) => {
    const originalList = board.lists.find((list) => list.id === listId);
    if (!originalList) return;

    const newList: typeof originalList = {
      ...originalList,
      id: `list-${Date.now()}`,
      title: `${originalList.title} (cópia)`,
      archived: false, // New list should not be archived
      cards: originalList.cards.map((card, index) => ({
        ...card,
        id: `card-${Date.now()}-${index}`,
        archived: false, // Preserve all fields including archived state - reset to false for new copy
      })),
    };

    const listIndex = board.lists.findIndex((list) => list.id === listId);
    const updatedLists = [...board.lists];
    updatedLists.splice(listIndex + 1, 0, newList);

    const updatedBoard = {
      ...board,
      lists: updatedLists,
    };

    onUpdateBoard(updatedBoard);
  };

  const handleDeleteList = (listId: string) => {
    const updatedBoard = {
      ...board,
      lists: board.lists.filter((list) => list.id !== listId),
    };

    onUpdateBoard(updatedBoard);
  };

  const handleRenameList = (listId: string, newTitle: string) => {
    const updatedBoard = {
      ...board,
      lists: board.lists.map((list) =>
        list.id === listId ? { ...list, title: newTitle } : list
      ),
    };

    onUpdateBoard(updatedBoard);
  };

  const handleAddList = () => {
    if (!newListTitle.trim()) return;

    const newList: List = {
      id: `list-${Date.now()}`,
      title: newListTitle.trim(),
      cards: [],
      archived: false,
    };

    const updatedBoard = {
      ...board,
      lists: [...board.lists, newList],
    };

    onUpdateBoard(updatedBoard);
    setNewListTitle('');
    setAddingList(false);
    toast({
      title: "Lista criada",
      description: "Uma nova lista foi adicionada ao quadro",
    });
  };

  const filteredLists = useMemo(() => {
    const nonArchivedLists = board.lists.filter(list => !list.archived);
    
    if (!hasActiveFilters) {
      return nonArchivedLists.map(list => ({
        ...list,
        cards: list.cards.filter(card => !card.archived)
      }));
    }

    const listsWithFilteredCards = nonArchivedLists.map(list => {
      const filteredCards = list.cards
        .filter(card => !card.archived)
        .filter(card => matchesFilters(card, filters, currentUserId));
      
      return {
        ...list,
        cards: filteredCards
      };
    });

    if (filters.collapseNonMatchingLists) {
      return listsWithFilteredCards.filter(list => list.cards.length > 0);
    }

    return listsWithFilteredCards;
  }, [board.lists, filters, currentUserId, hasActiveFilters]);

  return (
    <>
      <div className="flex-1 overflow-x-auto bg-board p-6 border-t border-primary/10">
        <div className="flex gap-4 min-w-max">
          {filteredLists.map((list) => (
            <KanbanList
              key={list.id}
              list={list}
              onCardClick={(card) => handleCardClick(card, list.id)}
              onAddCard={handleAddCard}
              onArchiveList={handleArchiveList}
              onCopyList={handleCopyList}
              onDeleteList={handleDeleteList}
              onRenameList={handleRenameList}
              allLists={board.lists.filter(l => !l.archived)}
            />
          ))}
          {addingList ? (
            <div className="min-w-[280px] bg-list rounded-xl p-3 border-2 border-primary/30 shadow-md" data-testid="add-list-form">
              <Input
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                placeholder="Digite o título da lista..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddList();
                  } else if (e.key === 'Escape') {
                    setAddingList(false);
                    setNewListTitle('');
                  }
                }}
                className="mb-2"
                data-testid="input-list-title"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleAddList}
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                  data-testid="button-add-list"
                >
                  Adicionar lista
                </Button>
                <Button 
                  onClick={() => {
                    setAddingList(false);
                    setNewListTitle('');
                  }}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  data-testid="button-cancel-add-list"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setAddingList(true)}
              variant="ghost"
              className="min-w-[280px] h-auto justify-start bg-list/50 hover:bg-list border-2 border-dashed border-primary/30 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all"
              data-testid="button-add-new-list"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar outra lista
            </Button>
          )}
        </div>
      </div>

      {selectedCard && (
        <CardDetailModal
          card={selectedCard.card}
          listId={selectedCard.listId}
          lists={board.lists.filter(list => !list.archived)}
          onClose={() => setSelectedCard(null)}
          onUpdate={handleUpdateCard}
          onDelete={handleDeleteCard}
          onMove={handleMoveCard}
          onCopy={handleCopyCard}
          onArchive={handleArchiveCard}
        />
      )}
    </>
  );
};
