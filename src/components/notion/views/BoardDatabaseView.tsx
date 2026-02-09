import { useState } from 'react';
import { Plus, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StoreDatabase } from '@/stores/notionStore';

interface BoardDatabaseViewProps {
  database: StoreDatabase;
  onUpdateDatabase: (updates: Partial<StoreDatabase>) => void;
  locked?: boolean;
}

export const BoardDatabaseView = ({
  database,
  onUpdateDatabase,
  locked = false,
}: BoardDatabaseViewProps) => {
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);

  const statusField = database.fields.find(f => f.type === 'select' || f.name.toLowerCase().includes('status'));
  
  if (!statusField || !statusField.options) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Para usar a visualização de quadro, adicione um campo de seleção para o status.</p>
      </div>
    );
  }

  const columns = statusField.options.map(option => ({
    id: option,
    name: option,
    rows: (database.rows || []).filter(row => row.values[statusField.id] === option),
  }));

  const addRow = (statusValue: string) => {
    if (locked) return;

    const newRow: any = {
      id: Date.now().toString(),
      values: {
        [statusField.id]: statusValue,
      },
    };

    database.fields.forEach(field => {
      if (field.id !== statusField.id) {
        newRow.values[field.id] = field.type === 'checkbox' ? false : '';
      }
    });

    onUpdateDatabase({
      rows: [...(database.rows || []), newRow],
    });
  };

  const moveRow = (rowId: string, newStatus: string) => {
    if (locked) return;

    onUpdateDatabase({
      rows: (database.rows || []).map(row =>
        row.id === rowId
          ? { ...row, values: { ...row.values, [statusField.id]: newStatus } }
          : row
      ),
    });
  };

  const handleDragStart = (rowId: string) => {
    setDraggedRowId(rowId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (statusValue: string) => {
    if (draggedRowId) {
      moveRow(draggedRowId, statusValue);
      setDraggedRowId(null);
    }
  };

  const getFieldValue = (row: any, fieldId: string) => {
    const value = row.values[fieldId];
    const field = database.fields.find(f => f.id === fieldId);
    
    if (!field) return null;
    
    if (field.type === 'select' || field.type === 'multi-select') {
      if (Array.isArray(value)) {
        return value.map((v, i) => (
          <Badge key={i} variant="secondary" className="mr-1 text-xs">
            {v}
          </Badge>
        ));
      }
      return value ? <Badge variant="secondary" className="text-xs">{value}</Badge> : null;
    }
    
    if (field.type === 'checkbox') {
      return value ? '✓' : '';
    }
    
    return value || '';
  };

  const titleField = database.fields[0];

  return (
    <div className="flex gap-4 p-4 overflow-x-auto h-full bg-[#f7f6f5]">
      {columns.map(column => (
        <div
          key={column.id}
          className="flex-shrink-0 w-[280px] bg-white rounded-lg border border-[#e9e9e7] flex flex-col"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(column.id)}
        >
          <div className="p-3 border-b border-[#e9e9e7] bg-[#fafafa]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">
                {column.name}
              </h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {column.rows.length}
              </span>
            </div>
          </div>

          <div className="flex-1 p-2 space-y-2 overflow-y-auto">
            {column.rows.map(row => (
              <div
                key={row.id}
                draggable={!locked}
                onDragStart={() => handleDragStart(row.id)}
                className={cn(
                  "p-3 bg-white rounded border border-gray-200 cursor-pointer",
                  "hover:shadow-sm transition-all",
                  draggedRowId === row.id && "opacity-50",
                  !locked && "hover:border-gray-300"
                )}
                style={{
                  backgroundColor: row.backgroundColor,
                  color: row.textColor,
                }}
              >
                <div className="flex items-start gap-2">
                  {!locked && (
                    <GripVertical className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div 
                      className={cn(
                        "text-sm mb-2",
                        row.fontWeight === 'bold' && "font-bold",
                        row.fontWeight === 'light' && "font-light",
                        row.fontSize === 'small' && "text-xs",
                        row.fontSize === 'large' && "text-base",
                        row.fontStyle === 'italic' && "italic"
                      )}
                    >
                      {row.values[titleField.id] || 'Sem título'}
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {database.fields.slice(1).map(field => {
                        if (field.id === statusField.id) return null;
                        const value = getFieldValue(row, field.id);
                        if (!value) return null;
                        
                        return (
                          <div key={field.id} className="text-xs text-gray-600">
                            {value}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!locked && (
            <div className="p-2 border-t border-[#e9e9e7]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addRow(column.id)}
                className="w-full justify-start text-gray-600 hover:bg-[#f7f6f5] h-8 text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Nova página
              </Button>
            </div>
          )}
        </div>
      ))}

      {!locked && statusField.options && (
        <div className="flex-shrink-0 w-[280px]">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-10 border-dashed border-gray-300 hover:border-gray-400 hover:bg-[#f7f6f5] text-gray-600"
            onClick={() => {
              const newOption = `Nova coluna ${statusField.options!.length + 1}`;
              onUpdateDatabase({
                fields: database.fields.map(f =>
                  f.id === statusField.id
                    ? { ...f, options: [...(f.options || []), newOption] }
                    : f
                ),
              });
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nova coluna
          </Button>
        </div>
      )}
    </div>
  );
};
