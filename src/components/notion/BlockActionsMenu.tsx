import { useState, useEffect, useMemo } from 'react';
import { 
  Type, Heading1, Heading2, Heading3, List, ListOrdered, 
  CheckSquare, Quote, Code, Minus, Lightbulb, ChevronRight,
  Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlockActionsMenuProps {
  position: { x: number; y: number };
  onChangeType: (type: string) => void;
  onChangeTextColor: (color: string) => void;
  onChangeBackgroundColor: (color: string) => void;
  onClose: () => void;
  currentType?: string;
  currentTextColor?: string;
  currentBackgroundColor?: string;
}

interface BlockTypeOption {
  type: string;
  label: string;
  icon: React.ReactNode;
}

interface ColorOption {
  value: string;
  label: string;
  textClass: string;
  bgClass: string;
}

export const BlockActionsMenu = ({ 
  position, 
  onChangeType, 
  onChangeTextColor,
  onChangeBackgroundColor,
  onClose,
  currentType,
  currentTextColor,
  currentBackgroundColor
}: BlockActionsMenuProps) => {
  const [activeTab, setActiveTab] = useState<'type' | 'text-color' | 'bg-color'>('type');

  const blockTypes: BlockTypeOption[] = useMemo(() => [
    { type: 'text', label: 'Texto', icon: <Type className="h-4 w-4" /> },
    { type: 'h1', label: 'Título 1', icon: <Heading1 className="h-4 w-4" /> },
    { type: 'h2', label: 'Título 2', icon: <Heading2 className="h-4 w-4" /> },
    { type: 'h3', label: 'Título 3', icon: <Heading3 className="h-4 w-4" /> },
    { type: 'bullet', label: 'Lista com marcadores', icon: <List className="h-4 w-4" /> },
    { type: 'numbered', label: 'Lista numerada', icon: <ListOrdered className="h-4 w-4" /> },
    { type: 'todo', label: 'Lista de tarefas', icon: <CheckSquare className="h-4 w-4" /> },
    { type: 'toggle', label: 'Lista de alternantes', icon: <ChevronRight className="h-4 w-4" /> },
    { type: 'quote', label: 'Citação', icon: <Quote className="h-4 w-4" /> },
    { type: 'divider', label: 'Divisor', icon: <Minus className="h-4 w-4" /> },
    { type: 'callout', label: 'Frase de destaque', icon: <Lightbulb className="h-4 w-4" /> },
    { type: 'code', label: 'Código', icon: <Code className="h-4 w-4" /> },
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
      if (!(e.target as HTMLElement).closest('.block-actions-menu')) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="block-actions-menu fixed bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '280px'
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
            {blockTypes.map((option) => (
              <button
                key={option.type}
                onClick={() => {
                  onChangeType(option.type);
                  onClose();
                }}
                className={cn(
                  'w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-3',
                  currentType === option.type && 'bg-accent text-accent-foreground'
                )}
              >
                <span className="text-muted-foreground">
                  {option.icon}
                </span>
                <span className="text-sm">{option.label}</span>
                {currentType === option.type && (
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
                onClick={() => {
                  onChangeTextColor(color.value);
                  onClose();
                }}
                className={cn(
                  'w-full text-left px-3 py-2.5 hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-3',
                  currentTextColor === color.value && 'bg-accent text-accent-foreground'
                )}
              >
                <div className={cn('w-4 h-4 rounded-full border border-border', color.textClass, 'bg-current')} />
                <span className={cn('text-sm', color.textClass)}>{color.label}</span>
                {currentTextColor === color.value && (
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
                onClick={() => {
                  onChangeBackgroundColor(color.value);
                  onClose();
                }}
                className={cn(
                  'w-full text-left px-3 py-2.5 hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-3',
                  currentBackgroundColor === color.value && 'bg-accent text-accent-foreground'
                )}
              >
                <div className={cn('w-4 h-4 rounded border border-border', color.bgClass)} />
                <span className="text-sm">{color.label}</span>
                {currentBackgroundColor === color.value && (
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
