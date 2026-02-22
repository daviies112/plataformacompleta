import { useState } from 'react';
import { List, Card as CardType } from '@/types/kanban';
import { KanbanCard } from './KanbanCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, MoreHorizontal, Archive, Copy, ArrowRight, X, Pencil, Trash, Palette, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface KanbanListProps {
  list: List;
  onCardClick: (card: CardType) => void;
  onArchiveList?: (listId: string) => void;
  onCopyList?: (listId: string) => void;
  onDeleteList?: (listId: string) => void;
  onRenameList?: (listId: string, newTitle: string) => void;
  onUpdateList?: (listId: string, updates: Partial<List>) => void;
  onMoveAllCards?: (listId: string, targetListId: string) => void;
  onAddCard?: (listId: string, title: string) => void;
  allLists?: List[];
}

const listColors = [
  { name: 'green', value: '#61bd4f' },
  { name: 'yellow', value: '#f2d600' },
  { name: 'orange', value: '#ff9f1a' },
  { name: 'red', value: '#eb5a46' },
  { name: 'purple', value: '#c377e0' },
  { name: 'blue', value: '#0079bf' },
  { name: 'sky', value: '#00c2e0' },
  { name: 'lime', value: '#51e898' },
  { name: 'pink', value: '#ff78cb' },
  { name: 'black', value: '#344563' },
];

export const KanbanList = ({
  list,
  onCardClick,
  onArchiveList,
  onCopyList,
  onDeleteList,
  onRenameList,
  onUpdateList,
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
    } else {
      setEditedTitle(list.title);
      setIsEditingTitle(false);
    }
  };

  const handleUpdateColor = (color?: string) => {
    if (onUpdateList) {
      onUpdateList(list.id, { color });
      toast({
        title: "Cor atualizada",
        description: color ? "A cor da lista foi alterada" : "A cor da lista foi removida",
      });
    }
  };

  // Helper to determine if a color is light or dark
  const isLightColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 180; // Biased toward white text
  };

  const isColorLight = list.color ? isLightColor(list.color) : false;
  const headerTextColor = list.textColor || (list.color ? (isColorLight ? '#0f172a' : '#ffffff') : '#ffffff');

  // Logic to calculate background and header colors based on list.color
  const listStyles = {
    '--list-accent': list.color || 'transparent',
    '--list-bg-tint': list.color ? `${list.color}20` : 'transparent',
    '--list-header-tint': list.color ? `${list.color}4D` : 'transparent',
    '--list-header-text': headerTextColor,
    '--list-input-bg': isColorLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
  } as React.CSSProperties;

  return (
    <div
      className={cn(
        "min-w-[280px] rounded-xl flex flex-col max-h-full border transition-all duration-300 shadow-sm relative overflow-hidden group/list",
        list.color
          ? "border-[var(--list-accent)]/40 shadow-lg"
          : "bg-list border-primary/20 hover:border-primary/30"
      )}
      style={{
        ...listStyles,
        backgroundColor: list.color ? 'var(--list-bg-tint)' : undefined
      }}
      data-testid={`list-${list.id}`}
    >
      {/* Top Accent Bar */}
      {list.color && (
        <div
          className="h-1.5 w-full absolute top-0 left-0 z-10"
          style={{ backgroundColor: 'var(--list-accent)' }}
        />
      )}

      {/* List Header */}
      <div
        className={cn(
          "flex items-center justify-between p-3 px-3.5 transition-colors",
          list.color ? "bg-[var(--list-header-tint)]" : "mb-1"
        )}
        style={{ color: headerTextColor }}
      >
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
            className={cn(
              "h-8 text-sm font-bold border-none ring-0 focus-visible:ring-1 focus-visible:ring-primary/50",
              list.color ? "bg-[var(--list-input-bg)]" : "bg-background/50"
            )}
            style={{ color: headerTextColor }}
            data-testid={`input-list-title-${list.id}`}
          />
        ) : (
          <h3
            className={cn(
              "font-bold text-sm cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 px-2 py-1 rounded flex-1 transition-colors truncate tracking-wide"
            )}
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
              className="h-8 w-8 hover:bg-black/10 dark:hover:bg-white/10 opacity-70 group-hover/list:opacity-100 transition-opacity"
              style={{ color: headerTextColor }}
              data-testid={`button-list-menu-${list.id}`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-widest px-2 py-1.5">
              Ações da Lista
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setAddingCard(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar cartão
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>
              <Pencil className="w-4 h-4 mr-2" />
              Renomear lista
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyList}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar lista
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Palette className="w-4 h-4 mr-2" />
                Alterar cor da lista
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="p-2 w-[214px]">
                <div className="grid grid-cols-5 gap-1.5">
                  {listColors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => handleUpdateColor(color.value)}
                      className={cn(
                        "h-8 w-8 rounded-md transition-all hover:scale-110 flex items-center justify-center shadow-sm",
                        list.color === color.value && "ring-2 ring-primary ring-offset-1 z-10"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {list.color === color.value && (
                        <Check className="w-4 h-4 text-white drop-shadow-md" />
                      )}
                    </button>
                  ))}
                </div>
                {list.color && (
                  <>
                    <DropdownMenuSeparator className="my-2" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-8 text-xs font-medium justify-start px-2 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleUpdateColor(undefined)}
                    >
                      <X className="w-3.5 h-3.5 mr-2" />
                      Remover cor
                    </Button>
                  </>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Pencil className="w-4 h-4 mr-2" />
                Cor do Texto
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="p-2 w-[214px]">
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { name: 'Branco', value: '#ffffff' },
                    { name: 'Preto', value: '#0f172a' },
                    { name: 'Cinza', value: '#94a3b8' },
                    { name: 'Âmbar', value: '#daa520' },
                    { name: 'Azul', value: '#3b82f6' },
                  ].map((color) => (
                    <button
                      key={color.name}
                      onClick={() => onUpdateList && onUpdateList(list.id, { textColor: color.value })}
                      className={cn(
                        "h-8 w-8 rounded-md transition-all hover:scale-110 flex items-center justify-center shadow-sm border border-border",
                        list.textColor === color.value && "ring-2 ring-primary ring-offset-1 z-10"
                      )}
                      style={{ backgroundColor: color.value === '#ffffff' ? '#ffffff' : color.value }}
                      title={color.name}
                    >
                      {list.textColor === color.value && (
                        <Check className={cn("w-4 h-4", color.value === '#ffffff' ? "text-black" : "text-white")} />
                      )}
                    </button>
                  ))}
                </div>
                {list.textColor && (
                  <>
                    <DropdownMenuSeparator className="my-2" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-8 text-xs font-medium justify-start px-2 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onUpdateList && onUpdateList(list.id, { textColor: undefined })}
                    >
                      <X className="w-3.5 h-3.5 mr-2" />
                      Remover cor personalizada
                    </Button>
                  </>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDeleteList}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="w-4 h-4 mr-2" />
              Excluir lista
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards Container */}
      <div className="flex flex-col gap-2 overflow-y-auto flex-1 px-3 py-1 scrollbar-hide">
        {list.cards.map((card) => (
          <KanbanCard key={card.id} card={card} onClick={() => onCardClick(card)} />
        ))}
      </div>

      {/* Footer / Add Card */}
      <div className="p-2 pt-1">
        {addingCard ? (
          <div className="space-y-2 p-1 anim-fade-in">
            <Input
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Digite um título..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCard();
                if (e.key === 'Escape') {
                  setAddingCard(false);
                  setNewCardTitle('');
                }
              }}
              className="bg-background/80"
              data-testid={`input-new-card-${list.id}`}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddCard}
                className="bg-primary hover:bg-primary/90 text-[11px] h-8 font-bold"
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
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="justify-start text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground w-full h-9 rounded-lg transition-all"
            size="sm"
            onClick={() => setAddingCard(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span className="text-xs font-semibold">Adicionar um cartão</span>
          </Button>
        )}
      </div>
    </div>
  );
};
