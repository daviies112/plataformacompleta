import { Card } from '@/types/kanban';
import { CardLabel } from '@/components/kanban/card/CardLabel';
import { Tag, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '@/components/ui/color-picker';
import { useNotionStore } from '@/stores/notionStore';

interface CardLabelsSectionProps {
  card: Card;
  onUpdate: (card: Card) => void;
}

const PRESET_LABEL_COLORS = [
  "#b3f5bc", "#fef3bd", "#fedec8", "#ffd5d2", "#dfd8fd",
  "#61bd4f", "#f2d600", "#ff9f1a", "#eb5a46", "#c377e0",
  "#0a7e3c", "#b38700", "#cc6e00", "#b81c00", "#5a3a86",
  "#cce0ff", "#c2e0f4", "#d3f1a7", "#fdd0ec", "#dcdcdc",
  "#0079bf", "#00c2e0", "#51e898", "#ff78cb", "#344563",
];

export const CardLabelsSection = ({ card, onUpdate }: CardLabelsSectionProps) => {
  const currentBoard = useNotionStore(state => state.getCurrentBoard());
  const addBoardLabel = useNotionStore(state => state.addBoardLabel);
  const updateBoardLabel = useNotionStore(state => state.updateBoardLabel);
  const deleteBoardLabel = useNotionStore(state => state.deleteBoardLabel);

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#0079bf');
  const [editLabelName, setEditLabelName] = useState('');
  const [editLabelColor, setEditLabelColor] = useState('');

  const availableLabels = currentBoard?.labels || [];
  const boardId = currentBoard?.id;

  const toggleLabel = (labelId: string) => {
    const label = availableLabels.find((l) => l.id === labelId);
    if (!label) return;

    const hasLabel = card.labels.some((l) => l.id === labelId);
    const updatedLabels = hasLabel
      ? card.labels.filter((l) => l.id !== labelId)
      : [...card.labels, label];

    onUpdate({ ...card, labels: updatedLabels });
  };

  const createNewLabel = () => {
    if (!newLabelName.trim() || !boardId) return;

    const newLabel = addBoardLabel(boardId, newLabelName, newLabelColor);

    onUpdate({ ...card, labels: [...card.labels, newLabel] });
    setNewLabelName('');
    setNewLabelColor('#0079bf');
    setCreating(false);
  };

  const startEditingLabel = (label: { id: string; name: string; color: string }) => {
    setEditingLabelId(label.id);
    setEditLabelName(label.name);
    setEditLabelColor(label.color);
  };

  const saveEditLabel = () => {
    if (!editLabelName.trim() || !editingLabelId || !boardId) return;

    updateBoardLabel(boardId, editingLabelId, {
      name: editLabelName.trim(),
      color: editLabelColor,
    });

    setEditingLabelId(null);
    setEditLabelName('');
    setEditLabelColor('');
  };

  const cancelEditLabel = () => {
    setEditingLabelId(null);
    setEditLabelName('');
    setEditLabelColor('');
  };

  const deleteLabel = (labelId: string) => {
    if (!boardId) return;
    deleteBoardLabel(boardId, labelId);
    setEditingLabelId(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {card.labels.length > 0 ? (
          <div className="cursor-pointer">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Etiquetas
            </h4>
            <div className="flex flex-wrap gap-1">
              {card.labels.map((label) => (
                <CardLabel key={label.id} label={label} size="full" />
              ))}
              <Button variant="secondary" size="sm" className="h-8">
                +
              </Button>
            </div>
          </div>
        ) : (
          <div className="cursor-pointer">
            <div className="text-left">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Etiquetas
              </h4>
              <Button variant="secondary" size="sm">
                Adicionar etiquetas
              </Button>
            </div>
          </div>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <h3 className="font-semibold mb-3">Etiquetas</h3>
        
        {!creating && !editingLabelId ? (
          <>
            <div className="space-y-1 mb-3">
              {availableLabels.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center gap-2 group"
                >
                  <button
                    onClick={() => toggleLabel(label.id)}
                    className="flex-1 flex items-center gap-2 p-2 rounded hover:bg-secondary transition-colors"
                  >
                    <div 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: label.color }}
                    />
                    <CardLabel label={label} size="full" />
                    {card.labels.some((l) => l.id === label.id) && (
                      <span className="ml-auto text-xs">✓</span>
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                    onClick={() => startEditingLabel(label)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button 
              onClick={() => setCreating(true)} 
              variant="outline" 
              className="w-full"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar nova etiqueta
            </Button>
          </>
        ) : editingLabelId ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Nome da etiqueta</label>
              <Input
                value={editLabelName}
                onChange={(e) => setEditLabelName(e.target.value)}
                placeholder="Digite o nome..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEditLabel();
                  if (e.key === 'Escape') cancelEditLabel();
                }}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Cor da etiqueta</label>
              <ColorPicker
                value={editLabelColor}
                onChange={setEditLabelColor}
                presetColors={PRESET_LABEL_COLORS}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={saveEditLabel} className="flex-1" size="sm">
                <Check className="w-4 h-4 mr-2" />
                Salvar
              </Button>
              <Button 
                onClick={cancelEditLabel} 
                variant="outline" 
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
              <Button 
                onClick={() => deleteLabel(editingLabelId)} 
                variant="destructive" 
                size="sm"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Nome da etiqueta</label>
              <Input
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Digite o nome..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createNewLabel();
                  if (e.key === 'Escape') {
                    setCreating(false);
                    setNewLabelName('');
                  }
                }}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Cor da etiqueta</label>
              <ColorPicker
                value={newLabelColor}
                onChange={setNewLabelColor}
                presetColors={PRESET_LABEL_COLORS}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={createNewLabel} className="flex-1" size="sm">
                Criar etiqueta
              </Button>
              <Button 
                onClick={() => {
                  setCreating(false);
                  setNewLabelName('');
                  setNewLabelColor('#0079bf');
                }} 
                variant="outline" 
                size="sm"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
