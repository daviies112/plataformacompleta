import { Card, Checklist, Attachment, CustomField, Location } from '@/types/kanban';
import { User, Tag, CheckSquare, Calendar, Paperclip, MapPin, Settings, Plus, Pencil, Trash2, Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { defaultMembers } from '@/data/mockData';
import { MemberAvatar } from '@/components/kanban/card/MemberAvatar';
import { CardLabel } from '@/components/kanban/card/CardLabel';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ColorPicker } from '@/components/ui/color-picker';
import { format } from 'date-fns';
import { useState } from 'react';
import { coverButtonColorClasses } from '@/lib/labelColors';
import { useNotionStore } from '@/stores/notionStore';

interface CardSidebarActionsProps {
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

export const CardSidebarActions = ({ card, onUpdate }: CardSidebarActionsProps) => {
  const currentBoard = useNotionStore(state => state.getCurrentBoard());
  const addBoardLabel = useNotionStore(state => state.addBoardLabel);
  const updateBoardLabel = useNotionStore(state => state.updateBoardLabel);
  const deleteBoardLabel = useNotionStore(state => state.deleteBoardLabel);

  const [labelsOpen, setLabelsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState('12:00');
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [customFieldOpen, setCustomFieldOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  const [creatingLabel, setCreatingLabel] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#0079bf');
  const [editLabelName, setEditLabelName] = useState('');
  const [editLabelColor, setEditLabelColor] = useState('');

  const [checklistTitle, setChecklistTitle] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'number' | 'date' | 'checkbox' | 'select'>('text');
  const [fieldOptions, setFieldOptions] = useState('');
  const [fieldColor, setFieldColor] = useState<'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'blue' | 'sky' | 'lime' | 'pink' | 'black'>('blue');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');

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
    setCreatingLabel(false);
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

  const toggleMember = (memberId: string) => {
    const member = defaultMembers.find((m) => m.id === memberId);
    if (!member) return;

    const hasMember = card.members.some((m) => m.id === memberId);
    const updatedMembers = hasMember
      ? card.members.filter((m) => m.id !== memberId)
      : [...card.members, member];

    onUpdate({ ...card, members: updatedMembers });
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      // Preserve time if date already exists, otherwise use selected time
      const existingDate = card.dueDate ? (typeof card.dueDate === 'string' ? new Date(card.dueDate) : card.dueDate) : null;
      if (existingDate) {
        date.setHours(existingDate.getHours(), existingDate.getMinutes());
      } else {
        const [hours, minutes] = selectedTime.split(':');
        date.setHours(parseInt(hours), parseInt(minutes));
      }
      onUpdate({ ...card, dueDate: date });
    }
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    const currentDate = card.dueDate ? (typeof card.dueDate === 'string' ? new Date(card.dueDate) : card.dueDate) : new Date();
    const [hours, minutes] = time.split(':');
    currentDate.setHours(parseInt(hours), parseInt(minutes));
    onUpdate({ ...card, dueDate: currentDate });
  };

  const handleSeparateTimeChange = (time: string) => {
    onUpdate({ ...card, dueTime: time });
    setTimeOpen(false);
  };

  const addChecklist = () => {
    if (!checklistTitle.trim()) return;

    const newChecklist: Checklist = {
      id: `checklist-${Date.now()}`,
      title: checklistTitle,
      items: [],
    };

    onUpdate({ ...card, checklists: [...card.checklists, newChecklist] });
    setChecklistTitle('');
    setChecklistOpen(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!attachmentName.trim()) {
        setAttachmentName(file.name);
      }
    }
  };

  const addAttachment = () => {
    // Verificar se tem arquivo selecionado OU URL preenchida
    if (selectedFile) {
      // Upload de arquivo
      if (!attachmentName.trim()) return;
      
      // Criar URL do arquivo para visualização
      const fileUrl = URL.createObjectURL(selectedFile);
      
      const newAttachment: Attachment = {
        id: `attachment-${Date.now()}`,
        name: attachmentName,
        url: fileUrl,
        addedAt: new Date(),
      };

      onUpdate({ ...card, attachments: [...card.attachments, newAttachment] });
      setSelectedFile(null);
      setAttachmentName('');
      setAttachmentUrl('');
      setAttachmentOpen(false);
    } else if (attachmentUrl.trim()) {
      // URL externa
      if (!attachmentName.trim()) return;
      
      const newAttachment: Attachment = {
        id: `attachment-${Date.now()}`,
        name: attachmentName,
        url: attachmentUrl,
        addedAt: new Date(),
      };

      onUpdate({ ...card, attachments: [...card.attachments, newAttachment] });
      setAttachmentUrl('');
      setAttachmentName('');
      setAttachmentOpen(false);
    }
  };

  const addCustomField = () => {
    if (!fieldName.trim()) return;
    if (fieldType === 'select' && !fieldOptions.trim()) return;

    const newField: CustomField = {
      id: `field-${Date.now()}`,
      name: fieldName,
      value: '',
      type: fieldType,
      options: fieldType === 'select' ? fieldOptions.split(',').map(opt => opt.trim()).filter(Boolean) : undefined,
      color: fieldColor,
    };

    onUpdate({ ...card, customFields: [...card.customFields, newField] });
    setFieldName('');
    setFieldOptions('');
    setFieldType('text');
    setFieldColor('blue');
    setCustomFieldOpen(false);
  };

  const addLocation = () => {
    if (!locationName.trim() || !locationAddress.trim()) return;

    const newLocation: Location = {
      id: `location-${Date.now()}`,
      name: locationName,
      address: locationAddress,
    };

    onUpdate({ ...card, location: newLocation });
    setLocationName('');
    setLocationAddress('');
    setLocationOpen(false);
  };

  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
        Adicionar ao cartão
      </h4>
      <div className="space-y-1">
        <Popover open={membersOpen} onOpenChange={setMembersOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="w-full justify-start">
              <User className="w-4 h-4 mr-2" />
              Membros
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <h3 className="font-semibold mb-3">Membros</h3>
            <div className="space-y-1">
              {defaultMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => toggleMember(member.id)}
                  className="w-full flex items-center gap-2 p-2 rounded hover:bg-secondary transition-colors"
                >
                  <MemberAvatar member={member} size="sm" />
                  <span className="text-sm">{member.name}</span>
                  {card.members.some((m) => m.id === member.id) && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={labelsOpen} onOpenChange={setLabelsOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="w-full justify-start">
              <Tag className="w-4 h-4 mr-2" />
              Etiquetas
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <h3 className="font-semibold mb-3">Etiquetas</h3>
            
            {!creatingLabel && !editingLabelId ? (
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
                  onClick={() => setCreatingLabel(true)} 
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
                        setCreatingLabel(false);
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
                      setCreatingLabel(false);
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

        <Popover open={checklistOpen} onOpenChange={setChecklistOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="w-full justify-start">
              <CheckSquare className="w-4 h-4 mr-2" />
              Checklist
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <h3 className="font-semibold mb-3">Adicionar checklist</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Título
                </label>
                <Input
                  value={checklistTitle}
                  onChange={(e) => setChecklistTitle(e.target.value)}
                  placeholder="Checklist"
                  onKeyPress={(e) => e.key === 'Enter' && addChecklist()}
                />
              </div>
              <Button onClick={addChecklist} className="w-full">
                Adicionar
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="w-full justify-start">
              <Calendar className="w-4 h-4 mr-2" />
              Datas
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4">
            <CalendarComponent
              mode="single"
              selected={card.dueDate}
              onSelect={handleDateChange}
              initialFocus
            />
            <div className="mt-3 pt-3 border-t">
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Horário
              </label>
              <Input
                type="time"
                value={card.dueDate ? format(card.dueDate instanceof Date ? card.dueDate : new Date(card.dueDate), 'HH:mm') : selectedTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full"
              />
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={timeOpen} onOpenChange={setTimeOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="w-full justify-start">
              <Clock className="w-4 h-4 mr-2" />
              Horário
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4">
            <h3 className="font-semibold mb-3">Definir horário</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Horário
                </label>
                <Input
                  type="time"
                  defaultValue={card.dueTime || '12:00'}
                  onChange={(e) => handleSeparateTimeChange(e.target.value)}
                  className="w-full"
                />
              </div>
              {card.dueTime && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Horário atual: <span className="font-semibold text-foreground">{card.dueTime}</span>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onUpdate({ ...card, dueTime: undefined });
                      setTimeOpen(false);
                    }}
                    className="w-full"
                  >
                    Remover horário
                  </Button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={attachmentOpen} onOpenChange={setAttachmentOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="w-full justify-start">
              <Paperclip className="w-4 h-4 mr-2" />
              Anexo
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <h3 className="font-semibold mb-3">Adicionar anexo</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Nome do arquivo
                </label>
                <Input
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  placeholder="documento.pdf"
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Escolher do computador
                </label>
                <div className="relative">
                  <Input
                    type="file"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                    id="file-upload"
                  />
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Selecionado: {selectedFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-popover px-2 text-muted-foreground">Ou</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  URL do arquivo
                </label>
                <Input
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="https://..."
                  onKeyPress={(e) => e.key === 'Enter' && addAttachment()}
                />
              </div>
              <Button onClick={addAttachment} className="w-full" disabled={!selectedFile && !attachmentUrl.trim()}>
                Adicionar
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={customFieldOpen} onOpenChange={setCustomFieldOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="w-full justify-start" data-testid="button-custom-fields">
              <Settings className="w-4 h-4 mr-2" />
              Campos personalizados
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <h3 className="font-semibold mb-3">Adicionar campo personalizado</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Nome do campo
                </label>
                <Input
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="Ex: Prioridade"
                  data-testid="input-field-name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Tipo do campo
                </label>
                <Select value={fieldType} onValueChange={(value: any) => setFieldType(value)}>
                  <SelectTrigger data-testid="select-field-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text" data-testid="option-field-type-text">Texto</SelectItem>
                    <SelectItem value="number" data-testid="option-field-type-number">Número</SelectItem>
                    <SelectItem value="date" data-testid="option-field-type-date">Data</SelectItem>
                    <SelectItem value="select" data-testid="option-field-type-select">Lista Suspensa</SelectItem>
                    <SelectItem value="checkbox" data-testid="option-field-type-checkbox">Checkbox</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {fieldType === 'select' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Opções (separadas por vírgula)
                  </label>
                  <Input
                    value={fieldOptions}
                    onChange={(e) => setFieldOptions(e.target.value)}
                    placeholder="Baixa, Média, Alta"
                    data-testid="input-field-options"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Cor do campo
                </label>
                <div className="flex flex-wrap gap-1">
                  {(['green', 'yellow', 'orange', 'red', 'purple', 'blue', 'sky', 'lime', 'pink', 'black'] as const).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFieldColor(color)}
                      className={`w-8 h-8 rounded border-2 transition-all ${
                        fieldColor === color ? 'border-foreground scale-110' : 'border-transparent'
                      } ${coverButtonColorClasses[color]}`}
                      data-testid={`button-color-${color}`}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={addCustomField} className="w-full" data-testid="button-add-field">
                Adicionar
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={locationOpen} onOpenChange={setLocationOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="w-full justify-start">
              <MapPin className="w-4 h-4 mr-2" />
              Local
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <h3 className="font-semibold mb-3">Adicionar local</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Nome do local
                </label>
                <Input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="São Paulo"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Endereço / Região
                </label>
                <Input
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="São Paulo, Brasil"
                  onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                />
              </div>
              <Button onClick={addLocation} className="w-full">
                Adicionar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
