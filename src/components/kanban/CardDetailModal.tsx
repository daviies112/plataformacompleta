import { useState } from 'react';
import { Card, List } from '@/types/kanban';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, CreditCard, AlignLeft, Trash2, ArrowRight, Copy, Archive, ArchiveRestore, Share2 } from 'lucide-react';
import { CardLabelsSection } from '@/components/kanban/card-detail/CardLabelsSection';
import { CardMembersSection } from '@/components/kanban/card-detail/CardMembersSection';
import { CardDueDateSection } from '@/components/kanban/card-detail/CardDueDateSection';
import { CardChecklistsSection } from '@/components/kanban/card-detail/CardChecklistsSection';
import { CardCoverSection } from '@/components/kanban/card-detail/CardCoverSection';
import { CardAttachmentsSection } from '@/components/kanban/card-detail/CardAttachmentsSection';
import { CardCustomFieldsSection } from '@/components/kanban/card-detail/CardCustomFieldsSection';
import { CardActivitySection } from '@/components/kanban/card-detail/CardActivitySection';
import { CardLocationSection } from '@/components/kanban/card-detail/CardLocationSection';
import { CardCoverDisplay } from '@/components/kanban/card/CardCoverDisplay';
import { CardSidebarActions } from '@/components/kanban/card-detail/CardSidebarActions';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface CardDetailModalProps {
  card: Card;
  listId: string;
  lists: List[];
  onClose: () => void;
  onUpdate: (card: Card) => void;
  onDelete: (cardId: string) => void;
  onMove?: (cardId: string, targetListId: string) => void;
  onCopy?: (cardId: string) => void;
  onArchive?: (cardId: string) => void;
}

export const CardDetailModal = ({ 
  card, 
  listId,
  lists,
  onClose, 
  onUpdate, 
  onDelete,
  onMove,
  onCopy,
  onArchive
}: CardDetailModalProps) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [editingDescription, setEditingDescription] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [targetListId, setTargetListId] = useState(listId);

  const currentList = lists.find(list => list.id === listId);

  const handleSaveTitle = () => {
    onUpdate({ ...card, title });
    setEditingTitle(false);
  };

  const handleSaveDescription = () => {
    onUpdate({ ...card, description });
    setEditingDescription(false);
  };

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir este cartão?')) {
      onDelete(card.id);
    }
  };

  const handleMove = () => {
    if (onMove && targetListId !== listId) {
      onMove(card.id, targetListId);
      toast({
        title: "Cartão movido",
        description: `O cartão foi movido para ${lists.find(l => l.id === targetListId)?.title}`,
      });
      onClose();
    }
    setShowMoveDialog(false);
  };

  const handleCopy = () => {
    if (onCopy) {
      onCopy(card.id);
      toast({
        title: "Cartão copiado",
        description: "Uma cópia do cartão foi criada",
      });
      onClose();
    }
  };

  const handleArchive = () => {
    if (onArchive) {
      const newArchivedState = !card.archived;
      onArchive(card.id);
      toast({
        title: newArchivedState ? "Cartão arquivado" : "Cartão restaurado",
        description: newArchivedState
          ? "O cartão foi arquivado. Você ainda pode desarquivá-lo." 
          : "O cartão foi restaurado e voltou para a lista",
      });
      // Don't close the modal so users can unarchive if needed
      if (newArchivedState === false) {
        // Only close if unarchiving (restoring to active state)
        onClose();
      }
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/card/${card.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copiado",
      description: "O link do cartão foi copiado para a área de transferência",
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 gap-0">
        {card.cover && card.cover.size === 'full' && (
          <CardCoverDisplay cover={card.cover} />
        )}
        
        <div className="overflow-y-auto max-h-[90vh]">
          {card.cover && card.cover.size === 'normal' && (
            <CardCoverDisplay cover={card.cover} />
          )}
          
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="sr-only">{card.title}</DialogTitle>
            <DialogDescription className="sr-only">
              Detalhes e configurações do cartão
            </DialogDescription>
            <div className="flex items-start gap-3">
              <CreditCard className="w-6 h-6 mt-1 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {editingTitle ? (
                  <Textarea
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    autoFocus
                    className="font-semibold text-xl resize-none"
                    rows={2}
                  />
                ) : (
                  <h2
                    className="font-semibold text-xl cursor-pointer hover:bg-secondary/50 p-2 rounded -ml-2"
                    onClick={() => setEditingTitle(true)}
                  >
                    {card.title}
                  </h2>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  na lista <span className="underline">{currentList?.title || 'A Fazer'}</span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-[1fr_200px] gap-6 px-6 pb-6">
            <div className="space-y-6">
              <CardLabelsSection card={card} onUpdate={onUpdate} />
              <CardMembersSection card={card} onUpdate={onUpdate} />
              <CardDueDateSection card={card} onUpdate={onUpdate} />

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <AlignLeft className="w-5 h-5 text-muted-foreground" />
                  <h3 className="font-semibold">Descrição</h3>
                </div>
                {editingDescription ? (
                  <div>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Adicione uma descrição mais detalhada..."
                      rows={5}
                      className="mb-2"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveDescription}>
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDescription(card.description || '');
                          setEditingDescription(false);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setEditingDescription(true)}
                    className="min-h-[80px] p-3 bg-secondary/30 hover:bg-secondary/50 rounded cursor-pointer transition-colors"
                  >
                    {card.description ? (
                      <p className="text-sm whitespace-pre-wrap">{card.description}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Adicione uma descrição mais detalhada...
                      </p>
                    )}
                  </div>
                )}
              </div>

              <CardLocationSection card={card} onUpdate={onUpdate} />
              <CardAttachmentsSection card={card} onUpdate={onUpdate} />
              <CardChecklistsSection card={card} onUpdate={onUpdate} />
              <CardCustomFieldsSection card={card} onUpdate={onUpdate} />
              <CardActivitySection card={card} onUpdate={onUpdate} />
            </div>

            <div className="space-y-6">
              <CardSidebarActions card={card} onUpdate={onUpdate} />
              <CardCoverSection card={card} onUpdate={onUpdate} />

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                  Ações
                </h4>
                <div className="space-y-1">
                  {showMoveDialog ? (
                    <div className="space-y-2 p-2 bg-muted/50 rounded">
                      <Select value={targetListId} onValueChange={setTargetListId}>
                        <SelectTrigger className="w-full" data-testid="select-target-list">
                          <SelectValue placeholder="Selecione a lista" />
                        </SelectTrigger>
                        <SelectContent>
                          {lists.map((list) => (
                            <SelectItem key={list.id} value={list.id} data-testid={`select-item-list-${list.id}`}>
                              {list.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleMove} data-testid="button-confirm-move">
                          Mover
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowMoveDialog(false)} data-testid="button-cancel-move">
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setShowMoveDialog(true)}
                      data-testid="button-move-card"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Mover
                    </Button>
                  )}
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleCopy}
                    data-testid="button-copy-card"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleArchive}
                    data-testid="button-archive-card"
                  >
                    {card.archived ? (
                      <>
                        <ArchiveRestore className="w-4 h-4 mr-2" />
                        Desarquivar
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4 mr-2" />
                        Arquivar
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleShare}
                    data-testid="button-share-card"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Compartilhar
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDelete}
                    data-testid="button-delete-card"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
