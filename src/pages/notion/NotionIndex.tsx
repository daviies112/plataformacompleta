import { useState, useEffect, useRef } from 'react';
import { Board } from '@/components/Board';
import { CardDetailModal } from '@/components/CardDetailModal';
import { FilterSidebar } from '@/components/FilterSidebar';
import { Board as BoardType } from '@/types/kanban';
import { 
  ChevronDown, Star, Filter,
  LayoutGrid, Table, Calendar, BarChart3, GanttChart, MapPin, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useFilters, matchesFilters } from '@/contexts/FiltersContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { labelColorClasses } from '@/lib/labelColors';

export type ViewType = 'board' | 'table' | 'calendar' | 'dashboard' | 'timeline' | 'map';

interface IndexProps {
  board: BoardType;
  onUpdateBoard: (board: BoardType) => void;
}

const Index = ({ board, onUpdateBoard }: IndexProps) => {
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(board.favorited || board.starred || false);
  const [currentView, setCurrentView] = useState<ViewType>('board');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(board.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { hasActiveFilters } = useFilters();

  const viewOptions = [
    { value: 'board' as ViewType, label: 'Quadro', icon: LayoutGrid },
    { value: 'table' as ViewType, label: 'Tabela', icon: Table },
    { value: 'calendar' as ViewType, label: 'Calendário', icon: Calendar },
    { value: 'dashboard' as ViewType, label: 'Painel', icon: BarChart3 },
    { value: 'timeline' as ViewType, label: 'Cronograma', icon: GanttChart },
    { value: 'map' as ViewType, label: 'Mapa', icon: MapPin },
  ];

  // Sync favorite state when board changes
  useEffect(() => {
    setIsFavorite(!!board.favorited || !!board.starred);
  }, [board.id, board.favorited, board.starred]);

  // Sync edited title when board changes
  useEffect(() => {
    setEditedTitle(board.title);
  }, [board.title]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleToggleFavorite = () => {
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);
    onUpdateBoard({ ...board, favorited: newFavoriteState, starred: newFavoriteState });
  };

  const handleStartEditingTitle = () => {
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    const trimmedTitle = editedTitle.trim();
    if (trimmedTitle && trimmedTitle !== board.title) {
      onUpdateBoard({ ...board, title: trimmedTitle });
    } else {
      setEditedTitle(board.title);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setEditedTitle(board.title);
      setIsEditingTitle(false);
    }
  };

  const currentViewOption = viewOptions.find(v => v.value === currentView);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {isEditingTitle ? (
                <Input
                  ref={titleInputRef}
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={handleTitleKeyDown}
                  className="text-3xl font-bold outline-none bg-transparent"
                  data-testid="input-board-title"
                />
              ) : (
                <h1 
                  className="text-3xl font-bold outline-none cursor-text" 
                  onClick={handleStartEditingTitle}
                  data-testid="button-board-title"
                >
                  {board.title}
                </h1>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    data-testid="button-view-dropdown"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {viewOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => setCurrentView(option.value)}
                        className="cursor-pointer"
                        data-testid={`view-option-${option.value}`}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {option.label}
                        {currentView === option.value && (
                          <span className="ml-auto">✓</span>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setFilterSidebarOpen(true)}
            data-testid="button-open-filters"
            className="relative"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtro
            {hasActiveFilters && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                !
              </Badge>
            )}
          </Button>
        </div>
      </header>

      {/* Board / View Content */}
      {currentView === 'board' && (
        <Board 
          board={board} 
          onUpdateBoard={onUpdateBoard}
          filterSidebarOpen={filterSidebarOpen}
          onFilterSidebarChange={setFilterSidebarOpen}
        />
      )}
      {currentView === 'table' && (
        <div className="flex-1 overflow-auto p-6" data-testid="view-table">
          <TableView board={board} onUpdateBoard={onUpdateBoard} />
        </div>
      )}
      {currentView === 'calendar' && (
        <div className="flex-1 overflow-auto p-6" data-testid="view-calendar">
          <CalendarView board={board} onUpdateBoard={onUpdateBoard} />
        </div>
      )}
      {currentView === 'dashboard' && (
        <div className="flex-1 overflow-auto p-6" data-testid="view-dashboard">
          <DashboardView board={board} />
        </div>
      )}
      {currentView === 'timeline' && (
        <div className="flex-1 overflow-auto p-6" data-testid="view-timeline">
          <TimelineView board={board} />
        </div>
      )}
      {currentView === 'map' && (
        <div className="flex-1 overflow-auto p-6" data-testid="view-map">
          <MapView board={board} />
        </div>
      )}

      <FilterSidebar 
        open={filterSidebarOpen} 
        onOpenChange={setFilterSidebarOpen} 
      />
    </div>
  );
};

// Table View Component
const TableView = ({ board, onUpdateBoard }: { board: BoardType; onUpdateBoard: (board: BoardType) => void }) => {
  const { filters, currentUserId, hasActiveFilters } = useFilters();
  const [selectedCard, setSelectedCard] = useState<{ card: any; listId: string } | null>(null);

  const allCards = board.lists
    .filter(list => !list.archived)
    .flatMap(list => 
      list.cards
        .filter(card => !card.archived)
        .filter(card => !hasActiveFilters || matchesFilters(card, filters, currentUserId))
        .map(card => ({ ...card, listId: list.id, listName: list.title }))
    );

  const handleUpdateCard = (updatedCard: any) => {
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

  return (
    <>
      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left p-4 font-semibold min-w-[200px]">Cartão</th>
              <th className="text-left p-4 font-semibold min-w-[120px]">Lista</th>
              <th className="text-left p-4 font-semibold min-w-[150px]">Etiquetas</th>
              <th className="text-left p-4 font-semibold min-w-[120px]">Membros</th>
              <th className="text-left p-4 font-semibold min-w-[130px]">Data de Entrega</th>
              <th className="text-left p-4 font-semibold min-w-[200px]">Descrição</th>
              <th className="text-left p-4 font-semibold min-w-[120px]">Checklist</th>
              <th className="text-left p-4 font-semibold min-w-[120px]">Anexos</th>
              <th className="text-left p-4 font-semibold min-w-[150px]">Campos Personalizados</th>
              <th className="text-left p-4 font-semibold min-w-[120px]">Local</th>
            </tr>
          </thead>
          <tbody>
            {allCards.map((card: any) => (
              <tr 
                key={card.id} 
                className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => setSelectedCard({ card, listId: card.listId })}
                data-testid={`table-row-${card.id}`}
              >
                <td className="p-4">
                  <div className="font-medium">{card.title}</div>
                </td>
                <td className="p-4">
                  <Badge variant="outline">{card.listName}</Badge>
                </td>
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1 flex-wrap items-center">
                    {card.labels.map((label: any) => (
                      <Badge 
                        key={label.id} 
                        className={`text-white text-xs ${labelColorClasses[label.color] || 'bg-gray-500 hover:bg-gray-600'}`}
                      >
                        {label.name}
                      </Badge>
                    ))}
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center"
                      onClick={() => setSelectedCard({ card, listId: card.listId })}
                      data-testid={`button-add-labels-${card.id}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {card.members.slice(0, 3).map((member: any) => (
                        <div
                          key={member.id}
                          className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium border-2 border-background"
                          title={member.name}
                        >
                          {member.initials}
                        </div>
                      ))}
                      {card.members.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium border-2 border-background">
                          +{card.members.length - 3}
                        </div>
                      )}
                    </div>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center"
                      onClick={() => setSelectedCard({ card, listId: card.listId })}
                      data-testid={`button-add-members-${card.id}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    {card.dueDate && (
                      <span className={`text-sm ${card.completed ? 'text-green-600' : new Date(card.dueDate) < new Date() ? 'text-red-600' : ''}`}>
                        {new Date(card.dueDate).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center"
                      onClick={() => setSelectedCard({ card, listId: card.listId })}
                      data-testid={`button-add-due-${card.id}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground max-w-[160px] truncate">
                      {card.description ? (
                        card.description
                      ) : (
                        <span className="text-xs">Sem descrição</span>
                      )}
                    </div>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center shrink-0"
                      onClick={() => setSelectedCard({ card, listId: card.listId })}
                      data-testid={`button-add-description-${card.id}`}
                      title="Adicionar descrição"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    {card.checklists && card.checklists.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {card.checklists.reduce((acc: number, cl: any) => acc + cl.items.filter((i: any) => i.completed).length, 0)}/
                        {card.checklists.reduce((acc: number, cl: any) => acc + cl.items.length, 0)}
                      </Badge>
                    )}
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center"
                      onClick={() => setSelectedCard({ card, listId: card.listId })}
                      data-testid={`button-add-checklist-${card.id}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    {card.attachments && card.attachments.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {card.attachments.length} {card.attachments.length === 1 ? 'arquivo' : 'arquivos'}
                      </Badge>
                    )}
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center"
                      onClick={() => setSelectedCard({ card, listId: card.listId })}
                      data-testid={`button-add-attachment-${card.id}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {card.customFields && card.customFields.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {card.customFields.slice(0, 2).map((field: any) => (
                          <Badge key={field.id} variant="secondary" className="text-xs">
                            {field.name}: {field.value}
                          </Badge>
                        ))}
                        {card.customFields.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{card.customFields.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center"
                      onClick={() => setSelectedCard({ card, listId: card.listId })}
                      data-testid={`button-add-custom-field-${card.id}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    {card.location && (
                      <div className="text-xs truncate max-w-[90px]" title={card.location.name}>
                        {card.location.name}
                      </div>
                    )}
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center"
                      onClick={() => setSelectedCard({ card, listId: card.listId })}
                      data-testid={`button-add-location-${card.id}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {allCards.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum cartão encontrado
          </div>
        )}
      </div>

      {selectedCard && (
        <CardDetailModal
          card={selectedCard.card}
          listId={selectedCard.listId}
          lists={board.lists.filter(list => !list.archived)}
          onClose={() => setSelectedCard(null)}
          onUpdate={handleUpdateCard}
          onDelete={handleDeleteCard}
          onMove={() => {}}
          onCopy={() => {}}
          onArchive={() => {}}
        />
      )}
    </>
  );
};

// Calendar View Component
const CalendarView = ({ board }: { board: BoardType; onUpdateBoard: (board: BoardType) => void }) => {
  const { filters, currentUserId, hasActiveFilters } = useFilters();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedCard, setSelectedCard] = useState<{ card: any; listId: string } | null>(null);

  const cardsWithDates = board.lists
    .filter(list => !list.archived)
    .flatMap(list => 
      list.cards
        .filter(card => !card.archived && card.dueDate)
        .filter(card => !hasActiveFilters || matchesFilters(card, filters, currentUserId))
        .map(card => ({ ...card, listId: list.id, listName: list.title }))
    );

  const cardsByDate = cardsWithDates.reduce((acc: any, card: any) => {
    const dateKey = new Date(card.dueDate).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(card);
    return acc;
  }, {});

  const selectedDateCards = selectedDate ? cardsByDate[selectedDate.toDateString()] || [] : [];

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Calendário</h2>
          <div className="flex justify-center">
            <div className="text-sm space-y-2">
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="text-center font-semibold text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
              </div>
              {(() => {
                const currentDate = selectedDate || new Date();
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const weeks = [];
                let week = [];
                
                for (let i = 0; i < firstDay; i++) {
                  week.push(<div key={`empty-${i}`} className="p-2"></div>);
                }
                
                for (let day = 1; day <= daysInMonth; day++) {
                  const date = new Date(year, month, day);
                  const dateKey = date.toDateString();
                  const hasCards = cardsByDate[dateKey]?.length > 0;
                  const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                  
                  week.push(
                    <button
                      key={day}
                      onClick={() => setSelectedDate(date)}
                      className={`p-2 rounded-md hover:bg-muted transition-colors ${
                        isSelected ? 'bg-primary text-primary-foreground' : ''
                      } ${hasCards ? 'font-semibold' : ''}`}
                      data-testid={`calendar-day-${day}`}
                    >
                      <div>{day}</div>
                      {hasCards && (
                        <div className="w-1 h-1 bg-blue-500 rounded-full mx-auto mt-1"></div>
                      )}
                    </button>
                  );
                  
                  if (week.length === 7) {
                    weeks.push(<div key={`week-${weeks.length}`} className="grid grid-cols-7 gap-2">{week}</div>);
                    week = [];
                  }
                }
                
                if (week.length > 0) {
                  while (week.length < 7) {
                    week.push(<div key={`empty-end-${week.length}`} className="p-2"></div>);
                  }
                  weeks.push(<div key={`week-${weeks.length}`} className="grid grid-cols-7 gap-2">{week}</div>);
                }
                
                return weeks;
              })()}
            </div>
          </div>
          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newDate = new Date(selectedDate || new Date());
                newDate.setMonth(newDate.getMonth() - 1);
                setSelectedDate(newDate);
              }}
              data-testid="button-prev-month"
            >
              Anterior
            </Button>
            <span className="font-semibold">
              {(selectedDate || new Date()).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newDate = new Date(selectedDate || new Date());
                newDate.setMonth(newDate.getMonth() + 1);
                setSelectedDate(newDate);
              }}
              data-testid="button-next-month"
            >
              Próximo
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">
            Cartões para {selectedDate?.toLocaleDateString('pt-BR')}
          </h2>
          <div className="space-y-2">
            {selectedDateCards.length > 0 ? (
              selectedDateCards.map((card: any) => (
                <div
                  key={card.id}
                  className="p-4 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedCard({ card, listId: card.listId })}
                  data-testid={`calendar-card-${card.id}`}
                >
                  <div className="font-medium">{card.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Lista: {card.listName}
                  </div>
                  {card.labels.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {card.labels.map((label: any) => (
                        <Badge 
                          key={label.id} 
                          className={`text-white ${labelColorClasses[label.color] || 'bg-gray-500 hover:bg-gray-600'}`}
                        >
                          {label.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum cartão nesta data
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedCard && (
        <CardDetailModal
          card={selectedCard.card}
          listId={selectedCard.listId}
          lists={board.lists.filter(list => !list.archived)}
          onClose={() => setSelectedCard(null)}
          onUpdate={() => {}}
          onDelete={() => {}}
          onMove={() => {}}
          onCopy={() => {}}
          onArchive={() => {}}
        />
      )}
    </>
  );
};

// Dashboard View Component
const DashboardView = ({ board }: { board: BoardType }) => {
  const { filters, currentUserId, hasActiveFilters } = useFilters();

  const allCards = board.lists
    .filter(list => !list.archived)
    .flatMap(list => 
      list.cards
        .filter(card => !card.archived)
        .filter(card => !hasActiveFilters || matchesFilters(card, filters, currentUserId))
        .map(card => ({ ...card, listId: list.id, listName: list.title }))
    );

  const cardsByList = board.lists
    .filter(list => !list.archived)
    .map(list => ({
      name: list.title,
      count: list.cards.filter(card => !card.archived && (!hasActiveFilters || matchesFilters(card, filters, currentUserId))).length,
    }));

  const now = new Date();
  const cardsByDueDate = {
    'Atrasado': allCards.filter(card => card.dueDate && new Date(card.dueDate) < now && !card.completed).length,
    'Hoje': allCards.filter(card => card.dueDate && new Date(card.dueDate).toDateString() === now.toDateString()).length,
    'Esta semana': allCards.filter(card => {
      if (!card.dueDate) return false;
      const dueDate = new Date(card.dueDate);
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return dueDate > now && dueDate <= weekFromNow;
    }).length,
    'Futuro': allCards.filter(card => {
      if (!card.dueDate) return false;
      const dueDate = new Date(card.dueDate);
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return dueDate > weekFromNow;
    }).length,
    'Sem data': allCards.filter(card => !card.dueDate).length,
  };

  const dueDateData = Object.entries(cardsByDueDate).map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border p-6">
          <div className="text-sm text-muted-foreground">Total de Cartões</div>
          <div className="text-3xl font-bold mt-2">{allCards.length}</div>
        </div>
        <div className="bg-card rounded-lg border p-6">
          <div className="text-sm text-muted-foreground">Cartões Concluídos</div>
          <div className="text-3xl font-bold mt-2 text-green-600">
            {allCards.filter(card => card.completed).length}
          </div>
        </div>
        <div className="bg-card rounded-lg border p-6">
          <div className="text-sm text-muted-foreground">Cartões Atrasados</div>
          <div className="text-3xl font-bold mt-2 text-red-600">
            {allCards.filter(card => card.dueDate && new Date(card.dueDate) < now && !card.completed).length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Cartões por Lista</h3>
          <div className="space-y-3">
            {cardsByList.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-medium mb-1">{item.name}</div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${(item.count / Math.max(...cardsByList.map(i => i.count))) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-xl font-bold">{item.count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Cartões por Data de Entrega</h3>
          <div className="space-y-3">
            {dueDateData.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-medium mb-1">{item.name}</div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        item.name === 'Atrasado' ? 'bg-red-500' : 
                        item.name === 'Hoje' ? 'bg-yellow-500' : 
                        'bg-blue-500'
                      }`}
                      style={{ width: `${(item.count / Math.max(...dueDateData.map(i => i.count), 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-xl font-bold">{item.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Timeline View Component
const TimelineView = ({ board }: { board: BoardType }) => {
  const { filters, currentUserId, hasActiveFilters } = useFilters();

  const cardsWithDates = board.lists
    .filter(list => !list.archived)
    .flatMap(list => 
      list.cards
        .filter(card => !card.archived && card.dueDate)
        .filter(card => !hasActiveFilters || matchesFilters(card, filters, currentUserId))
        .map(card => ({ ...card, listId: list.id, listName: list.title }))
    )
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  if (cardsWithDates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum cartão com data de entrega encontrado
      </div>
    );
  }

  const minDate = new Date(Math.min(...cardsWithDates.map(c => new Date(c.dueDate!).getTime())));
  const maxDate = new Date(Math.max(...cardsWithDates.map(c => new Date(c.dueDate!).getTime())));
  const daysDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-card rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-6">Cronograma</h2>
      <div className="space-y-4">
        {cardsWithDates.map((card: any, index) => {
          const cardDate = new Date(card.dueDate);
          const daysFromStart = Math.ceil((cardDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
          const position = (daysFromStart / Math.max(daysDiff, 1)) * 100;
          
          return (
            <div key={card.id} className="relative" data-testid={`timeline-card-${card.id}`}>
              <div className="flex items-center gap-4">
                <div className="w-32 text-sm text-muted-foreground">
                  {cardDate.toLocaleDateString('pt-BR')}
                </div>
                <div className="flex-1 relative">
                  <div className="h-12 bg-muted rounded-lg relative overflow-hidden">
                    <div 
                      className={`absolute left-0 top-0 h-full rounded-lg ${
                        card.completed ? 'bg-green-500' : 
                        cardDate < new Date() ? 'bg-red-500' : 
                        'bg-blue-500'
                      } flex items-center px-3`}
                      style={{ width: `${Math.max(position, 15)}%` }}
                    >
                      <span className="text-sm font-medium text-white truncate">
                        {card.title}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-32 text-sm">
                  <Badge variant="outline">{card.listName}</Badge>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Map View Component
const MapView = ({ board }: { board: BoardType }) => {
  const { filters, currentUserId, hasActiveFilters } = useFilters();

  const cardsWithLocation = board.lists
    .filter(list => !list.archived)
    .flatMap(list => 
      list.cards
        .filter(card => !card.archived && card.location)
        .filter(card => !hasActiveFilters || matchesFilters(card, filters, currentUserId))
        .map(card => ({ ...card, listId: list.id, listName: list.title }))
    );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Mapa (Placeholder)</h2>
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-16 h-16 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Visualização de mapa</p>
            <p className="text-sm text-muted-foreground mt-1">
              {cardsWithLocation.length} cartões com localização
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Cartões com Localização</h2>
        <div className="space-y-2">
          {cardsWithLocation.length > 0 ? (
            cardsWithLocation.map((card: any) => (
              <div
                key={card.id}
                className="p-4 border rounded-lg"
                data-testid={`map-card-${card.id}`}
              >
                <div className="font-medium">{card.title}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  {card.location.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {card.location.address}
                </div>
                <Badge variant="outline" className="mt-2">{card.listName}</Badge>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum cartão com localização encontrado
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
