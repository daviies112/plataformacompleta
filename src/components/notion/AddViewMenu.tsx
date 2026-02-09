import { useEffect, useRef } from 'react';
import { Table, Kanban, LayoutGrid, List, BarChart3, GanttChart, Rss, Map, Calendar, FileText, Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface AddViewMenuProps {
  onAddView: (viewType: string) => void;
  onClose: () => void;
}

const viewTypes = [
  { type: 'table', icon: Table, label: 'Tabela' },
  { type: 'board', icon: Kanban, label: 'Quadro' },
  { type: 'gallery', icon: LayoutGrid, label: 'Galeria' },
  { type: 'list', icon: List, label: 'Lista' },
  { type: 'chart', icon: BarChart3, label: 'Gráfico' },
  { type: 'timeline', icon: GanttChart, label: 'Cronograma' },
  { type: 'feed', icon: Rss, label: 'Feed' },
  { type: 'map', icon: Map, label: 'Mapa' },
  { type: 'calendar', icon: Calendar, label: 'Calendário' },
  { type: 'form', icon: FileText, label: 'Formulário' },
];

export const AddViewMenu = ({ onAddView, onClose }: AddViewMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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
      ref={menuRef}
      className="absolute top-full left-0 mt-1 z-[100] w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 max-h-[500px] overflow-y-auto"
    >
      <div className="grid grid-cols-2 gap-1">
        {viewTypes.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            onClick={() => {
              onAddView(type);
              onClose();
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#f7f6f5] dark:hover:bg-gray-700 rounded transition-colors text-left w-full"
          >
            <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
            <span className="text-gray-700 dark:text-gray-300">{label}</span>
          </button>
        ))}
      </div>
      <Separator className="my-2" />
      <button
        onClick={() => {
          onClose();
        }}
        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#f7f6f5] dark:hover:bg-gray-700 rounded transition-colors w-full text-left text-gray-600 dark:text-gray-400"
      >
        <Plus className="w-4 h-4" />
        <span>Nova fonte de dados</span>
      </button>
    </div>
  );
};
