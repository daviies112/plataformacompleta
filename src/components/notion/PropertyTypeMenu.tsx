import { useState, useEffect, useMemo } from 'react';
import { 
  AlignLeft, Hash, Circle, List as ListIcon, CircleDot, Calendar,
  User, Paperclip, CheckSquare, Link as LinkIcon, Phone, AtSign, Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DatabaseFieldType } from '@/types/notion';

interface PropertyTypeMenuProps {
  position: { x: number; y: number };
  onSelectType: (type: DatabaseFieldType, textColor?: string, bgColor?: string) => void;
  onClose: () => void;
}

interface PropertyTypeOption {
  type: DatabaseFieldType;
  label: string;
  icon: React.ReactNode;
}

interface ColorOption {
  value: string;
  label: string;
  textClass: string;
  bgClass: string;
}

export const PropertyTypeMenu = ({ 
  position, 
  onSelectType, 
  onClose 
}: PropertyTypeMenuProps) => {
  const [activeTab, setActiveTab] = useState<'type' | 'text-color' | 'bg-color'>('type');
  const [selectedType, setSelectedType] = useState<DatabaseFieldType | null>(null);
  const [selectedTextColor, setSelectedTextColor] = useState<string>('default');
  const [selectedBgColor, setSelectedBgColor] = useState<string>('default');

  const allPropertyTypes: PropertyTypeOption[] = useMemo(() => [
    { type: 'text', label: 'Texto', icon: <AlignLeft className="h-4 w-4" /> },
    { type: 'number', label: 'Número', icon: <Hash className="h-4 w-4" /> },
    { type: 'select', label: 'Selecionar', icon: <Circle className="h-4 w-4" /> },
    { type: 'multi-select', label: 'Seleção múltipla', icon: <ListIcon className="h-4 w-4" /> },
    { type: 'select', label: 'Status', icon: <CircleDot className="h-4 w-4" /> },
    { type: 'date', label: 'Data', icon: <Calendar className="h-4 w-4" /> },
    { type: 'text', label: 'Pessoa', icon: <User className="h-4 w-4" /> },
    { type: 'text', label: 'Arquivos e mídia', icon: <Paperclip className="h-4 w-4" /> },
    { type: 'checkbox', label: 'Caixa de seleção', icon: <CheckSquare className="h-4 w-4" /> },
    { type: 'url', label: 'URL', icon: <LinkIcon className="h-4 w-4" /> },
    { type: 'phone', label: 'Telefone', icon: <Phone className="h-4 w-4" /> },
    { type: 'email', label: 'E-mail', icon: <AtSign className="h-4 w-4" /> },
  ], []);

  const textColors: ColorOption[] = useMemo(() => [
    { value: 'default', label: 'Padrão', textClass: 'text-foreground', bgClass: '' },
    { value: 'gray', label: 'Cinza', textClass: 'text-gray-500', bgClass: '' },
    { value: 'brown', label: 'Marrom', textClass: 'text-amber-700', bgClass: '' },
    { value: 'orange', label: 'Laranja', textClass: 'text-orange-500', bgClass: '' },
    { value: 'yellow', label: 'Amarelo', textClass: 'text-yellow-500', bgClass: '' },
    { value: 'green', label: 'Verde', textClass: 'text-green-500', bgClass: '' },
    { value: 'blue', label: 'Azul', textClass: 'text-blue-500', bgClass: '' },
    { value: 'purple', label: 'Roxo', textClass: 'text-purple-500', bgClass: '' },
    { value: 'pink', label: 'Rosa', textClass: 'text-pink-500', bgClass: '' },
    { value: 'red', label: 'Vermelho', textClass: 'text-red-500', bgClass: '' },
  ], []);

  const backgroundColors: ColorOption[] = useMemo(() => [
    { value: 'default', label: 'Padrão', textClass: '', bgClass: 'bg-transparent' },
    { value: 'gray', label: 'Cinza', textClass: '', bgClass: 'bg-gray-100 dark:bg-gray-800' },
    { value: 'brown', label: 'Marrom', textClass: '', bgClass: 'bg-amber-100 dark:bg-amber-900' },
    { value: 'orange', label: 'Laranja', textClass: '', bgClass: 'bg-orange-100 dark:bg-orange-900' },
    { value: 'yellow', label: 'Amarelo', textClass: '', bgClass: 'bg-yellow-100 dark:bg-yellow-900' },
    { value: 'green', label: 'Verde', textClass: '', bgClass: 'bg-green-100 dark:bg-green-900' },
    { value: 'blue', label: 'Azul', textClass: '', bgClass: 'bg-blue-100 dark:bg-blue-900' },
    { value: 'purple', label: 'Roxo', textClass: '', bgClass: 'bg-purple-100 dark:bg-purple-900' },
    { value: 'pink', label: 'Rosa', textClass: '', bgClass: 'bg-pink-100 dark:bg-pink-900' },
    { value: 'red', label: 'Vermelho', textClass: '', bgClass: 'bg-red-100 dark:bg-red-900' },
  ], []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.property-type-menu')) {
        if (selectedType) {
          onSelectType(selectedType, selectedTextColor, selectedBgColor);
        }
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedType) {
          onSelectType(selectedType, selectedTextColor, selectedBgColor);
        }
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, selectedType, selectedTextColor, selectedBgColor, onSelectType]);

  return (
    <div
      className="property-type-menu fixed bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '320px'
      }}
    >
      {/* Tabs */}
      <div className="flex border-b border-border bg-muted/30">
        <button
          onClick={() => setActiveTab('type')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors',
            activeTab === 'type' 
              ? 'bg-background text-foreground border-b-2 border-primary' 
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Tipo
        </button>
        <button
          onClick={() => setActiveTab('text-color')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1',
            activeTab === 'text-color' 
              ? 'bg-background text-foreground border-b-2 border-primary' 
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Palette className="h-3 w-3" />
          Texto
        </button>
        <button
          onClick={() => setActiveTab('bg-color')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1',
            activeTab === 'bg-color' 
              ? 'bg-background text-foreground border-b-2 border-primary' 
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Palette className="h-3 w-3" />
          Fundo
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[400px] overflow-y-auto">
        {activeTab === 'type' && (
          <div className="py-2">
            {allPropertyTypes.map((option, index) => (
              <button
                key={`${option.type}-${option.label}-${index}`}
                onClick={() => setSelectedType(option.type)}
                className={cn(
                  'w-full text-left px-3 py-2.5 hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-3',
                  selectedType === option.type && 'bg-accent text-accent-foreground'
                )}
              >
                <span className="text-muted-foreground">
                  {option.icon}
                </span>
                <span className="text-sm">{option.label}</span>
                {selectedType === option.type && (
                  <span className="ml-auto text-primary text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'text-color' && (
          <div className="py-2">
            {textColors.map((color) => (
              <button
                key={color.value}
                onClick={() => setSelectedTextColor(color.value)}
                className={cn(
                  'w-full text-left px-3 py-2.5 hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-3',
                  selectedTextColor === color.value && 'bg-accent text-accent-foreground'
                )}
              >
                <div className={cn('w-4 h-4 rounded-full border border-border', color.textClass, 'bg-current')} />
                <span className={cn('text-sm', color.textClass)}>{color.label}</span>
                {selectedTextColor === color.value && (
                  <span className="ml-auto text-primary text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'bg-color' && (
          <div className="py-2">
            {backgroundColors.map((color) => (
              <button
                key={color.value}
                onClick={() => setSelectedBgColor(color.value)}
                className={cn(
                  'w-full text-left px-3 py-2.5 hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-3',
                  selectedBgColor === color.value && 'bg-accent text-accent-foreground'
                )}
              >
                <div className={cn('w-4 h-4 rounded border border-border', color.bgClass)} />
                <span className="text-sm">{color.label}</span>
                {selectedBgColor === color.value && (
                  <span className="ml-auto text-primary text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
