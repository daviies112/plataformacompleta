import { useState, useRef, useEffect } from 'react';
import { useNotionStore, type StoreDatabase } from '@/stores/notionStore';
import type { DatabaseViewType, Filter, Sort, FilterConditionType, SortDirection, DatabaseFieldType, Database } from '@/types/notion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, Kanban, Calendar as CalendarIcon, List, Plus, Trash2, LayoutGrid, GanttChart, Filter as FilterIcon, ArrowUpDown, BarChart3, Rss, Map, FileText, Settings2, ChevronDown, LayoutDashboard, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { ChartView } from './views/ChartView';
import { FeedView } from './views/FeedView';
import { MapView } from './views/MapView';
import { FormView } from './views/FormView';
import { DashboardDatabaseView } from './views/DashboardDatabaseView';
import { BoardDatabaseView } from './views/BoardDatabaseView';
import { DatabaseOptionsMenu } from './DatabaseOptionsMenu';
import { RowCustomizationMenu } from './RowCustomizationMenu';
import { DatabaseViewTabs } from './DatabaseViewTabs';
import { PropertyTypeMenu } from './PropertyTypeMenu';
import { toast } from 'sonner';

interface DatabaseViewProps {
  database: StoreDatabase;
}

export const DatabaseView = ({ database }: DatabaseViewProps) => {
  const { updateDatabase, deleteDatabase, getCurrentPage, addView, deleteView, updateView, setCurrentView } = useNotionStore();
  const [editingTitle, setEditingTitle] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showSortDialog, setShowSortDialog] = useState(false);
  const [showFieldsDialog, setShowFieldsDialog] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [showPropertyMenu, setShowPropertyMenu] = useState(false);
  const [propertyMenuPosition, setPropertyMenuPosition] = useState({ x: 0, y: 0 });
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const currentPage = getCurrentPage();
  const isLocked = currentPage?.locked || database.locked || false;

  useEffect(() => {
    if (!database.views || database.views.length === 0) {
      const defaultView = {
        id: Date.now().toString(),
        type: database.view || 'table',
        name: 'Tabela principal',
        filters: database.filters || [],
        sorts: database.sorts || [],
      };
      updateDatabase(database.id, {
        views: [defaultView],
        currentViewId: defaultView.id,
      });
    }
  }, []);

  const currentView = database.views?.find(v => v.id === database.currentViewId) || database.views?.[0];
  const activeViewType = currentView?.type || database.view || 'table';

  const views: { type: DatabaseViewType; icon: any; label: string }[] = [
    { type: 'table', icon: Table, label: 'Tabela' },
    { type: 'board', icon: Kanban, label: 'Kanban' },
    { type: 'gallery', icon: LayoutGrid, label: 'Galeria' },
    { type: 'calendar', icon: CalendarIcon, label: 'Calendário' },
    { type: 'list', icon: List, label: 'Lista' },
    { type: 'timeline', icon: GanttChart, label: 'Timeline' },
    { type: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { type: 'chart', icon: BarChart3, label: 'Gráfico' },
    { type: 'feed', icon: Rss, label: 'Feed' },
    { type: 'map', icon: Map, label: 'Mapa' },
    { type: 'form', icon: FileText, label: 'Formulário' },
  ];

  const fieldTypes: { value: DatabaseFieldType; label: string }[] = [
    { value: 'text', label: 'Texto' },
    { value: 'number', label: 'Número' },
    { value: 'select', label: 'Seleção' },
    { value: 'multi-select', label: 'Múltipla Seleção' },
    { value: 'date', label: 'Data' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'url', label: 'URL' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Telefone' },
    { value: 'location', label: 'Localização' },
  ];

  const applyFilter = (row: any, filter: Filter) => {
    const field = database.fields.find(f => f.id === filter.fieldId);
    if (!field) return true;
    
    const value = row.values[filter.fieldId];
    
    switch (filter.condition) {
      case 'equals':
        return value === filter.value;
      case 'does_not_equal':
        return value !== filter.value;
      case 'contains':
        return String(value || '').toLowerCase().includes(String(filter.value || '').toLowerCase());
      case 'does_not_contain':
        return !String(value || '').toLowerCase().includes(String(filter.value || '').toLowerCase());
      case 'is_empty':
        return value === '' || value == null;
      case 'is_not_empty':
        return value !== '' && value != null;
      case 'greater_than':
        return Number(value) > Number(filter.value);
      case 'less_than':
        return Number(value) < Number(filter.value);
      case 'before':
        return new Date(value) < new Date(filter.value);
      case 'after':
        return new Date(value) > new Date(filter.value);
      case 'checked':
        return value === true;
      case 'unchecked':
        return value === false;
      default:
        return true;
    }
  };

  const getFilteredAndSortedRows = () => {
    let rows = [...(database.rows || [])];
    
    const viewFilters = currentView?.filters || [];
    const viewSorts = currentView?.sorts || [];
    
    if (viewFilters.length > 0) {
      rows = rows.filter(row => 
        viewFilters.every(filter => applyFilter(row, filter as Filter))
      );
    }
    
    if (viewSorts.length > 0) {
      rows.sort((a, b) => {
        for (const sort of viewSorts) {
          const field = database.fields.find(f => f.id === sort.fieldId);
          if (!field) continue;
          
          let aVal = a.values[sort.fieldId];
          let bVal = b.values[sort.fieldId];
          let comparison = 0;
          
          if (field.type === 'number') {
            aVal = Number(aVal) || 0;
            bVal = Number(bVal) || 0;
            comparison = aVal - bVal;
          } else if (field.type === 'date') {
            const aTime = aVal ? new Date(aVal).getTime() : 0;
            const bTime = bVal ? new Date(bVal).getTime() : 0;
            const aDate = Number.isFinite(aTime) ? aTime : 0;
            const bDate = Number.isFinite(bTime) ? bTime : 0;
            comparison = aDate - bDate;
          } else if (field.type === 'checkbox') {
            aVal = Boolean(aVal);
            bVal = Boolean(bVal);
            comparison = Number(aVal) - Number(bVal);
          } else {
            aVal = String(aVal || '').toLowerCase();
            bVal = String(bVal || '').toLowerCase();
            comparison = aVal.localeCompare(bVal);
          }
          
          if (comparison !== 0) {
            return sort.direction === 'ascending' ? comparison : -comparison;
          }
        }
        return 0;
      });
    }
    
    return rows;
  };

  const addFilter = () => {
    if (isLocked || !currentView) return;
    const newFilter: Filter = {
      id: Date.now().toString(),
      fieldId: database.fields[0].id,
      condition: 'equals',
      value: ''
    };
    updateView(database.id, currentView.id, {
      filters: [...(currentView.filters || []), newFilter]
    });
  };

  const updateFilter = (index: number, updates: Partial<Filter>) => {
    if (isLocked || !currentView) return;
    const filters = [...(currentView.filters || [])];
    filters[index] = { ...filters[index], ...updates };
    updateView(database.id, currentView.id, { filters });
  };

  const removeFilter = (index: number) => {
    if (isLocked || !currentView) return;
    const filters = (currentView.filters || []).filter((_, i) => i !== index);
    updateView(database.id, currentView.id, { filters });
  };

  const addSort = () => {
    if (isLocked || !currentView) return;
    const newSort: Sort = {
      id: Date.now().toString(),
      fieldId: database.fields[0].id,
      direction: 'ascending'
    };
    updateView(database.id, currentView.id, {
      sorts: [...(currentView.sorts || []), newSort]
    });
  };

  const updateSort = (index: number, updates: Partial<Sort>) => {
    if (isLocked || !currentView) return;
    const sorts = [...(currentView.sorts || [])];
    sorts[index] = { ...sorts[index], ...updates };
    updateView(database.id, currentView.id, { sorts });
  };

  const removeSort = (index: number) => {
    if (isLocked || !currentView) return;
    const sorts = (currentView.sorts || []).filter((_, i) => i !== index);
    updateView(database.id, currentView.id, { sorts });
  };

  const addRow = () => {
    if (isLocked) return;
    const newRow = {
      id: Date.now().toString(),
      values: {},
    };
    database.fields.forEach(field => {
      newRow.values[field.id] = field.type === 'checkbox' ? false : '';
    });
    updateDatabase(database.id, {
      rows: [...(database.rows || []), newRow],
    });
  };

  const deleteRow = (rowId: string) => {
    if (isLocked) return;
    updateDatabase(database.id, {
      rows: (database.rows || []).filter(r => r.id !== rowId),
    });
  };

  const updateRowValue = (rowId: string, fieldId: string, value: any) => {
    if (isLocked) return;
    updateDatabase(database.id, {
      rows: (database.rows || []).map(row =>
        row.id === rowId
          ? { ...row, values: { ...row.values, [fieldId]: value } }
          : row
      ),
    });
  };

  const addField = (type?: DatabaseFieldType, textColor?: string, bgColor?: string) => {
    if (isLocked) return;
    const newField = {
      id: Date.now().toString(),
      name: 'Novo Campo',
      type: (type || 'text') as DatabaseFieldType,
      textColor: textColor && textColor !== 'default' ? textColor : undefined,
      bgColor: bgColor && bgColor !== 'default' ? bgColor : undefined,
      ...(type === 'select' || type === 'multi-select' ? { options: ['Opção 1', 'Opção 2'] } : {}),
    };
    updateDatabase(database.id, {
      fields: [...database.fields, newField],
    });
    setEditingFieldId(newField.id);
  };

  const handleResizeStart = (fieldId: string, e: React.MouseEvent) => {
    if (isLocked) return;
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(fieldId);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = columnWidths[fieldId] || 200;
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingColumn) return;
    const diff = e.clientX - resizeStartX.current;
    const newWidth = Math.max(100, resizeStartWidth.current + diff);
    setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
  };

  const handleResizeEnd = () => {
    setResizingColumn(null);
  };

  useEffect(() => {
    if (resizingColumn) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingColumn]);

  const updateField = (fieldId: string, updates: Partial<typeof database.fields[0]>) => {
    if (isLocked) return;
    updateDatabase(database.id, {
      fields: database.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f),
    });
  };

  const deleteField = (fieldId: string) => {
    if (isLocked) return;
    const updatedRows = (database.rows || []).map(row => {
      const { [fieldId]: removed, ...rest } = row.values;
      return { ...row, values: rest };
    });
    updateDatabase(database.id, {
      fields: database.fields.filter(f => f.id !== fieldId),
      rows: updatedRows,
    });
  };

  const getFontSize = (fontSize?: 'small' | 'normal' | 'large') => {
    switch (fontSize) {
      case 'small':
        return '0.875rem';
      case 'large':
        return '1.125rem';
      case 'normal':
      default:
        return '1rem';
    }
  };

  const updateRowStyles = (rowId: string, styles: {
    backgroundColor?: string;
    textColor?: string;
    fontWeight?: 'normal' | 'bold' | 'light';
    fontSize?: 'small' | 'normal' | 'large';
    fontStyle?: 'normal' | 'italic';
  }) => {
    if (isLocked) return;
    updateDatabase(database.id, {
      rows: (database.rows || []).map(row =>
        row.id === rowId
          ? { 
              ...row, 
              backgroundColor: styles.backgroundColor,
              textColor: styles.textColor,
              fontWeight: styles.fontWeight,
              fontSize: styles.fontSize,
              fontStyle: styles.fontStyle
            }
          : row
      ),
    });
  };

  const getColorClass = (colorName: string) => {
    if (colorName === 'default' || !colorName) return undefined;
    
    const colorMap: Record<string, string> = {
      gray: '#6B7280',
      brown: '#92400E',
      orange: '#EA580C',
      yellow: '#CA8A04',
      green: '#16A34A',
      blue: '#2563EB',
      purple: '#9333EA',
      pink: '#DB2777',
      red: '#DC2626',
    };
    return colorMap[colorName] || undefined;
  };

  const renderTableView = () => {
    const rows = getFilteredAndSortedRows();
    
    const textColors = [
      { value: 'default', label: 'Padrão', textClass: 'text-foreground' },
      { value: 'gray', label: 'Cinza', textClass: 'text-gray-500' },
      { value: 'brown', label: 'Marrom', textClass: 'text-amber-700' },
      { value: 'orange', label: 'Laranja', textClass: 'text-orange-500' },
      { value: 'yellow', label: 'Amarelo', textClass: 'text-yellow-500' },
      { value: 'green', label: 'Verde', textClass: 'text-green-500' },
      { value: 'blue', label: 'Azul', textClass: 'text-blue-500' },
      { value: 'purple', label: 'Roxo', textClass: 'text-purple-500' },
      { value: 'pink', label: 'Rosa', textClass: 'text-pink-500' },
      { value: 'red', label: 'Vermelho', textClass: 'text-red-500' },
    ];

    const backgroundColors = [
      { value: 'default', label: 'Padrão', bgClass: 'bg-transparent' },
      { value: 'gray', label: 'Cinza', bgClass: 'bg-gray-100 dark:bg-gray-800' },
      { value: 'brown', label: 'Marrom', bgClass: 'bg-amber-100 dark:bg-amber-900' },
      { value: 'orange', label: 'Laranja', bgClass: 'bg-orange-100 dark:bg-orange-900' },
      { value: 'yellow', label: 'Amarelo', bgClass: 'bg-yellow-100 dark:bg-yellow-900' },
      { value: 'green', label: 'Verde', bgClass: 'bg-green-100 dark:bg-green-900' },
      { value: 'blue', label: 'Azul', bgClass: 'bg-blue-100 dark:bg-blue-900' },
      { value: 'purple', label: 'Roxo', bgClass: 'bg-purple-100 dark:bg-purple-900' },
      { value: 'pink', label: 'Rosa', bgClass: 'bg-pink-100 dark:bg-pink-900' },
      { value: 'red', label: 'Vermelho', bgClass: 'bg-red-100 dark:bg-red-900' },
    ];
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              {database.fields.map((field, index) => (
                <th 
                  key={field.id} 
                  className="px-4 py-2 text-left text-sm font-semibold border-b border-r border-border relative group"
                  style={{ 
                    width: columnWidths[field.id] || 200, 
                    minWidth: 100,
                    backgroundColor: field.bgColor ? getColorClass(field.bgColor) : undefined,
                    color: field.textColor ? getColorClass(field.textColor) : undefined
                  }}
                >
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 px-1 hover:bg-muted-foreground/10" disabled={isLocked}>
                          <span className="flex items-center gap-1">
                            {editingFieldId === field.id ? (
                              <Input
                                value={field.name}
                                onChange={(e) => updateField(field.id, { name: e.target.value })}
                                onBlur={() => setEditingFieldId(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') setEditingFieldId(null);
                                  if (e.key === 'Escape') setEditingFieldId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                disabled={isLocked}
                                className="h-6 text-sm px-2"
                                autoFocus
                              />
                            ) : (
                              <>
                                {field.name}
                                <ChevronDown className="h-3 w-3 opacity-50" />
                              </>
                            )}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem onClick={() => setEditingFieldId(field.id)} disabled={isLocked}>
                          Renomear
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger disabled={isLocked}>Tipo</DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              {fieldTypes.map(type => (
                                <DropdownMenuItem 
                                  key={type.value}
                                  onClick={() => updateField(field.id, { type: type.value })}
                                  disabled={isLocked}
                                >
                                  {type.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger disabled={isLocked}>
                            <Palette className="h-4 w-4 mr-2" />
                            Texto
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              {textColors.map((color) => (
                                <DropdownMenuItem 
                                  key={color.value}
                                  onClick={() => updateField(field.id, { textColor: color.value })}
                                  disabled={isLocked}
                                >
                                  <div className={cn('w-4 h-4 rounded-full border mr-2', color.textClass, 'bg-current')} />
                                  {color.label}
                                  {field.textColor === color.value && <span className="ml-auto">✓</span>}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger disabled={isLocked}>
                            <Palette className="h-4 w-4 mr-2" />
                            Fundo
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              {backgroundColors.map((color) => (
                                <DropdownMenuItem 
                                  key={color.value}
                                  onClick={() => updateField(field.id, { bgColor: color.value })}
                                  disabled={isLocked}
                                >
                                  <div className={cn('w-4 h-4 rounded border mr-2', color.bgClass)} />
                                  {color.label}
                                  {field.bgColor === color.value && <span className="ml-auto">✓</span>}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => deleteField(field.id)} 
                          disabled={isLocked || database.fields.length === 1}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deletar propriedade
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {!isLocked && (
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 group-hover:bg-primary/30"
                      onMouseDown={(e) => handleResizeStart(field.id, e)}
                    />
                  )}
                </th>
              ))}
              <th className="px-4 py-2 text-left text-sm border-b border-border" style={{ width: 150, minWidth: 150 }}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-muted-foreground hover:text-foreground" 
                  disabled={isLocked}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setPropertyMenuPosition({ x: rect.left, y: rect.bottom + 5 });
                    setShowPropertyMenu(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar propriedade
                </Button>
              </th>
              <th className="w-12 border-b border-border"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
            <tr 
              key={row.id} 
              className="hover:bg-muted/50"
              style={{
                backgroundColor: row.backgroundColor || 'transparent',
                color: row.textColor || 'inherit',
                fontWeight: row.fontWeight || 'normal',
                fontSize: getFontSize(row.fontSize),
                fontStyle: row.fontStyle || 'normal'
              }}
            >
              {database.fields.map(field => (
                <td 
                  key={field.id} 
                  className="px-4 py-2 border-b border-r border-border"
                  style={{ width: columnWidths[field.id] || 200 }}
                >
                  {field.type === 'select' ? (
                    <Select
                      value={row.values[field.id] || ''}
                      onValueChange={(value) => updateRowValue(row.id, field.id, value)}
                      disabled={isLocked}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === 'checkbox' ? (
                    <input
                      type="checkbox"
                      checked={row.values[field.id] || false}
                      onChange={(e) => updateRowValue(row.id, field.id, e.target.checked)}
                      disabled={isLocked}
                      className="h-4 w-4"
                    />
                  ) : field.type === 'date' ? (
                    <Input
                      type="datetime-local"
                      value={row.values[field.id] || ''}
                      onChange={(e) => updateRowValue(row.id, field.id, e.target.value)}
                      disabled={isLocked}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <Input
                      type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'url' ? 'url' : 'text'}
                      value={row.values[field.id] || ''}
                      onChange={(e) => updateRowValue(row.id, field.id, e.target.value)}
                      disabled={isLocked}
                      className="h-8 text-sm"
                    />
                  )}
                </td>
              ))}
              <td className="border-b border-border" colSpan={2}>
                <div className="flex gap-1">
                  <RowCustomizationMenu
                    rowId={row.id}
                    currentStyles={{
                      backgroundColor: row.backgroundColor,
                      textColor: row.textColor,
                      fontWeight: row.fontWeight,
                      fontSize: row.fontSize,
                      fontStyle: row.fontStyle
                    }}
                    onUpdateStyles={updateRowStyles}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => deleteRow(row.id)}
                    disabled={isLocked}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button
        variant="ghost"
        size="sm"
        onClick={addRow}
        disabled={isLocked}
        className="mt-2 w-full text-sm"
      >
        <Plus className="h-4 w-4 mr-2" />
        Nova linha
      </Button>
    </div>
    );
  };

  const renderBoardView = () => {
    const statusField = database.fields.find(f => f.type === 'select');
    if (!statusField?.options) {
      return <div className="p-4 text-sm text-muted-foreground">Adicione um campo de seleção para usar a visualização Kanban</div>;
    }

    const filteredRows = getFilteredAndSortedRows();

    return (
      <div className="flex gap-4 overflow-x-auto p-4">
        {statusField.options.map(status => (
          <div key={status} className="flex-shrink-0 w-64 bg-muted rounded-lg p-3">
            <div className="font-semibold text-sm mb-3">{status}</div>
            <div className="space-y-2">
              {filteredRows
                .filter(row => row.values[statusField.id] === status)
                .map(row => (
                  <div 
                    key={row.id} 
                    className="bg-background p-3 rounded border border-border hover:shadow-sm transition-shadow"
                    style={{
                      backgroundColor: row.backgroundColor || undefined,
                      color: row.textColor || 'inherit',
                      fontWeight: row.fontWeight || 'normal',
                      fontSize: getFontSize(row.fontSize),
                      fontStyle: row.fontStyle || 'normal'
                    }}
                  >
                    {database.fields
                      .filter(f => f.id !== statusField.id)
                      .map(field => (
                        <div key={field.id} className="text-sm mb-1">
                          <span className="font-medium">{field.name}:</span>{' '}
                          {row.values[field.id]?.toString() || '-'}
                        </div>
                      ))}
                    <div className="flex gap-1 mt-2 pt-2 border-t">
                      <RowCustomizationMenu
                        rowId={row.id}
                        currentStyles={{
                          backgroundColor: row.backgroundColor,
                          textColor: row.textColor,
                          fontWeight: row.fontWeight,
                          fontSize: row.fontSize,
                          fontStyle: row.fontStyle
                        }}
                        onUpdateStyles={updateRowStyles}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => deleteRow(row.id)}
                        disabled={isLocked}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderListView = () => {
    const rows = getFilteredAndSortedRows();
    
    return (
      <div className="space-y-2 p-4">
        {rows.map(row => (
        <div 
          key={row.id} 
          className="flex items-center gap-4 p-3 bg-muted rounded hover:bg-muted/70 transition-colors"
          style={{
            backgroundColor: row.backgroundColor || undefined,
            color: row.textColor || 'inherit',
            fontWeight: row.fontWeight || 'normal',
            fontSize: getFontSize(row.fontSize),
            fontStyle: row.fontStyle || 'normal'
          }}
        >
          {database.fields.map(field => (
            <div key={field.id} className="flex-1">
              <div className="text-xs text-muted-foreground mb-1">{field.name}</div>
              <div className="text-sm">{row.values[field.id]?.toString() || '-'}</div>
            </div>
          ))}
          <div className="flex gap-1">
            <RowCustomizationMenu
              rowId={row.id}
              currentStyles={{
                backgroundColor: row.backgroundColor,
                textColor: row.textColor,
                fontWeight: row.fontWeight,
                fontSize: row.fontSize,
                fontStyle: row.fontStyle
              }}
              onUpdateStyles={updateRowStyles}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteRow(row.id)}
              disabled={isLocked}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={addRow}
        disabled={isLocked}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Nova linha
      </Button>
    </div>
    );
  };

  const renderGalleryView = () => {
    const imageField = database.fields.find(f => f.type === 'url');
    const rows = getFilteredAndSortedRows();
    
    return (
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rows.map(row => (
            <div 
              key={row.id} 
              className="border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow group"
              style={{
                backgroundColor: row.backgroundColor || undefined,
                color: row.textColor || 'inherit',
                fontWeight: row.fontWeight || 'normal',
                fontSize: getFontSize(row.fontSize),
                fontStyle: row.fontStyle || 'normal'
              }}
            >
              {imageField && row.values[imageField.id] ? (
                <div className="aspect-video bg-muted relative overflow-hidden">
                  <img 
                    src={row.values[imageField.id]} 
                    alt="Card preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <LayoutGrid className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div className="p-4">
                {database.fields.filter(f => f.id !== imageField?.id).map(field => (
                  <div key={field.id} className="mb-2">
                    <div className="text-xs text-muted-foreground mb-1">{field.name}</div>
                    <div className="text-sm font-medium">{row.values[field.id]?.toString() || '-'}</div>
                  </div>
                ))}
                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <RowCustomizationMenu
                    rowId={row.id}
                    currentStyles={{
                      backgroundColor: row.backgroundColor,
                      textColor: row.textColor,
                      fontWeight: row.fontWeight,
                      fontSize: row.fontSize,
                      fontStyle: row.fontStyle
                    }}
                    onUpdateStyles={updateRowStyles}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRow(row.id)}
                    disabled={isLocked}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={addRow}
          disabled={isLocked}
          className="w-full mt-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo card
        </Button>
      </div>
    );
  };

  const renderCalendarView = () => {
    const dateField = database.fields.find(f => f.type === 'date');
    
    if (!dateField) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          Adicione um campo de data para usar a visualização de calendário
        </div>
      );
    }

    const filteredRows = getFilteredAndSortedRows();
    const currentDate = new Date();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    const formatLocalDate = (year: number, month: number, day: number) => {
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };
    
    const titleField = database.fields.find(f => f.type === 'text') || database.fields[0];
    
    return (
      <div className="p-4">
        <div className="mb-4 text-center font-semibold">
          {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map(day => {
            const dateStr = formatLocalDate(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dayEvents = filteredRows.filter(row => row.values[dateField.id] === dateStr);
            
            return (
              <div key={day} className="border border-border rounded p-1 min-h-[80px] hover:bg-muted/50 transition-colors">
                <div className="text-xs font-medium mb-1">{day}</div>
                <div className="space-y-1">
                  {dayEvents.map(row => (
                    <div key={row.id} className="text-xs bg-primary/10 text-primary rounded px-1 py-0.5 truncate">
                      {row.values[titleField.id]?.toString() || 'Sem título'}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={addRow}
          disabled={isLocked}
          className="w-full mt-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo evento
        </Button>
      </div>
    );
  };

  const renderTimelineView = () => {
    const dateField = database.fields.find(f => f.type === 'date');
    
    if (!dateField) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          Adicione um campo de data para usar a visualização de timeline
        </div>
      );
    }

    const filteredRows = getFilteredAndSortedRows();
    const rowsWithDates: Array<{ row: any; date: Date | null }> = filteredRows.map(row => ({
      row,
      date: row.values[dateField.id] ? new Date(row.values[dateField.id]) : null
    }));

    const validRows = rowsWithDates.filter(item => item.date && !isNaN(item.date.getTime()));
    const invalidRows = rowsWithDates.filter(item => !item.date || isNaN(item.date.getTime()));

    const viewSorts = currentView?.sorts || [];
    const sortedValidRows = (viewSorts.length === 0) 
      ? validRows.sort((a, b) => a.date!.getTime() - b.date!.getTime())
      : validRows;

    return (
      <div className="p-4">
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-4">
            {sortedValidRows.map(({ row, date }) => (
              <div key={row.id} className="relative flex gap-4 group">
                <div className="flex-shrink-0 w-32 text-sm text-muted-foreground pt-1">
                  {date!.toLocaleDateString('pt-BR')}
                </div>
                <div className="relative flex-shrink-0">
                  <div className="w-4 h-4 rounded-full bg-primary border-4 border-background" />
                </div>
                <div className="flex-1 pb-4">
                  <div className="bg-muted rounded-lg p-4 hover:shadow-md transition-shadow">
                    {database.fields.filter(f => f.id !== dateField.id).map(field => (
                      <div key={field.id} className="mb-2">
                        <span className="text-xs text-muted-foreground">{field.name}:</span>{' '}
                        <span className="text-sm font-medium">{row.values[field.id]?.toString() || '-'}</span>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRow(row.id)}
                      className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deletar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {invalidRows.length > 0 && (
              <>
                <div className="text-sm font-semibold text-muted-foreground pt-4">Sem data</div>
                {invalidRows.map(({ row }) => (
                  <div key={row.id} className="relative flex gap-4 group pl-32">
                    <div className="flex-1 pb-4">
                      <div className="bg-muted/50 rounded-lg p-4 hover:shadow-md transition-shadow border-l-4 border-muted-foreground/30">
                        {database.fields.filter(f => f.id !== dateField.id).map(field => (
                          <div key={field.id} className="mb-2">
                            <span className="text-xs text-muted-foreground">{field.name}:</span>{' '}
                            <span className="text-sm font-medium">{row.values[field.id]?.toString() || '-'}</span>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRow(row.id)}
                          disabled={isLocked}
                          className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deletar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={addRow}
          disabled={isLocked}
          className="w-full mt-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo item
        </Button>
      </div>
    );
  };

  return (
    <div>
      {/* Cover Image */}
      {database.cover && (
        <div className="h-48 w-full bg-muted overflow-hidden mb-6 rounded-lg">
          <img 
            src={database.cover} 
            alt="Cover" 
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Title */}
      <div className="mb-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            {editingTitle ? (
              <input
                type="text"
                value={database.title}
                onChange={(e) => updateDatabase(database.id, { title: e.target.value })}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingTitle(false);
                }}
                disabled={isLocked}
                className="text-5xl lg:text-2xl font-bold outline-none bg-transparent w-full"
                autoFocus
              />
            ) : (
              <h1
                className="text-5xl lg:text-2xl font-bold outline-none cursor-text"
                onClick={() => !isLocked && setEditingTitle(true)}
              >
                {database.title}
              </h1>
            )}
            {database.description && (
              <p className="text-sm text-muted-foreground mt-2">{database.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        {database.views && database.views.length > 0 && (
          <DatabaseViewTabs
            views={database.views}
            currentViewId={database.currentViewId}
            onViewChange={(viewId) => setCurrentView(database.id, viewId)}
            onViewDelete={(viewId) => deleteView(database.id, viewId)}
            onViewAdd={(viewType) => addView(database.id, viewType)}
            locked={isLocked}
          />
        )}

        <div className="flex items-center justify-between gap-2 p-3 border-b border-border bg-muted/30">
          {/* Left side - Spacer */}
          <div className="flex items-center gap-2">
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center gap-2">
            <Dialog open={showFieldsDialog} onOpenChange={setShowFieldsDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7" disabled={isLocked}>
                  <Settings2 className="h-4 w-4 mr-1" />
                  Propriedades ({database.fields.length})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Gerenciar Propriedades</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {database.fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-start p-3 bg-muted/30 rounded">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={field.name}
                          onChange={(e) => updateField(field.id, { name: e.target.value })}
                          placeholder="Nome do campo"
                          disabled={isLocked}
                        />
                        <div className="flex gap-2">
                          <Select 
                            value={field.type} 
                            onValueChange={(value) => updateField(field.id, { type: value as DatabaseFieldType })}
                            disabled={isLocked}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldTypes.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {(field.type === 'select' || field.type === 'multi-select') && (
                            <Input
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => updateField(field.id, { 
                                options: e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                              })}
                              placeholder="Opções (separadas por vírgula)"
                              disabled={isLocked}
                              className="flex-1"
                            />
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteField(field.id)}
                        disabled={isLocked || database.fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button onClick={() => addField()} variant="outline" size="sm" className="w-full" disabled={isLocked}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Propriedade
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

          <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7" disabled={isLocked}>
                <FilterIcon className="h-4 w-4 mr-1" />
                Filtrar{currentView?.filters && currentView.filters.length > 0 && ` (${currentView.filters.length})`}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filtros</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {(currentView?.filters || []).map((filter, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Select value={filter.fieldId} onValueChange={(value) => updateFilter(index, { fieldId: value })} disabled={isLocked}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {database.fields.map(field => (
                          <SelectItem key={field.id} value={field.id}>{field.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filter.condition} onValueChange={(value) => updateFilter(index, { condition: value as FilterConditionType })} disabled={isLocked}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Igual a</SelectItem>
                        <SelectItem value="does_not_equal">Diferente de</SelectItem>
                        <SelectItem value="contains">Contém</SelectItem>
                        <SelectItem value="does_not_contain">Não contém</SelectItem>
                        <SelectItem value="is_empty">Vazio</SelectItem>
                        <SelectItem value="is_not_empty">Não vazio</SelectItem>
                        <SelectItem value="greater_than">Maior que</SelectItem>
                        <SelectItem value="less_than">Menor que</SelectItem>
                      </SelectContent>
                    </Select>
                    {!['is_empty', 'is_not_empty', 'checked', 'unchecked'].includes(filter.condition) && (
                      <Input
                        value={filter.value || ''}
                        onChange={(e) => updateFilter(index, { value: e.target.value })}
                        placeholder="Valor"
                        disabled={isLocked}
                        className="flex-1"
                      />
                    )}
                    <Button variant="ghost" size="sm" onClick={() => removeFilter(index)} disabled={isLocked}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button onClick={addFilter} variant="outline" size="sm" className="w-full" disabled={isLocked}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar filtro
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showSortDialog} onOpenChange={setShowSortDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7" disabled={isLocked}>
                <ArrowUpDown className="h-4 w-4 mr-1" />
                Ordenar{currentView?.sorts && currentView.sorts.length > 0 && ` (${currentView.sorts.length})`}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ordenação</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {(currentView?.sorts || []).map((sort, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Select value={sort.fieldId} onValueChange={(value) => updateSort(index, { fieldId: value })} disabled={isLocked}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {database.fields.map(field => (
                          <SelectItem key={field.id} value={field.id}>{field.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={sort.direction} onValueChange={(value) => updateSort(index, { direction: value as SortDirection })} disabled={isLocked}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ascending">Crescente</SelectItem>
                        <SelectItem value="descending">Decrescente</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => removeSort(index)} disabled={isLocked}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button onClick={addSort} variant="outline" size="sm" className="w-full" disabled={isLocked}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar ordenação
                </Button>
              </div>
            </DialogContent>
          </Dialog>

            <Button 
              onClick={addRow} 
              className="h-7 bg-primary hover:bg-primary/90 text-primary-foreground"
              size="sm"
              disabled={isLocked}
            >
              Nova
            </Button>
          </div>
        </div>
      </div>

      <div>
        {activeViewType === 'table' && renderTableView()}
        {activeViewType === 'board' && (
          <BoardDatabaseView 
            database={database} 
            onUpdateDatabase={(updates) => updateDatabase(database.id, updates)}
            locked={isLocked}
          />
        )}
        {activeViewType === 'gallery' && renderGalleryView()}
        {activeViewType === 'list' && renderListView()}
        {activeViewType === 'calendar' && renderCalendarView()}
        {activeViewType === 'timeline' && renderTimelineView()}
        {activeViewType === 'dashboard' && <DashboardDatabaseView database={database as unknown as Database} />}
        {activeViewType === 'chart' && (
          <ChartView 
            database={database} 
            onUpdate={(updates) => updateDatabase(database.id, updates)}
            isLocked={isLocked}
          />
        )}
        {activeViewType === 'feed' && (
          <FeedView 
            database={database as unknown as Database} 
            onDeleteRow={deleteRow}
            isLocked={isLocked}
          />
        )}
        {activeViewType === 'map' && (
          <MapView 
            database={database as unknown as Database} 
            onDeleteRow={deleteRow}
            isLocked={isLocked}
          />
        )}
        {activeViewType === 'form' && (
          <FormView 
            database={database} 
            onUpdate={(updates) => updateDatabase(database.id, updates)}
            onAddRow={(values) => {
              const newRow = {
                id: Date.now().toString(),
                values,
              };
              updateDatabase(database.id, {
                rows: [...database.rows, newRow],
              });
            }}
            isLocked={isLocked}
          />
        )}
      </div>

      {showPropertyMenu && (
        <PropertyTypeMenu
          position={propertyMenuPosition}
          onSelectType={(type, textColor, bgColor) => {
            addField(type, textColor, bgColor);
            setShowPropertyMenu(false);
          }}
          onClose={() => setShowPropertyMenu(false)}
        />
      )}
    </div>
  );
};