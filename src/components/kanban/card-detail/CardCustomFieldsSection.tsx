import { Card } from '@/types/kanban';
import { Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CardCustomFieldsSectionProps {
  card: Card;
  onUpdate: (card: Card) => void;
}

export const CardCustomFieldsSection = ({ card, onUpdate }: CardCustomFieldsSectionProps) => {
  const deleteCustomField = (fieldId: string) => {
    const updatedFields = card.customFields.filter((f) => f.id !== fieldId);
    onUpdate({ ...card, customFields: updatedFields });
  };

  const updateCustomField = (fieldId: string, value: string) => {
    const updatedFields = card.customFields.map((field) =>
      field.id === fieldId ? { ...field, value } : field
    );
    onUpdate({ ...card, customFields: updatedFields });
  };

  if (card.customFields.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <Settings className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold">Campos personalizados</h3>
      </div>
      <div className="space-y-3">
        {card.customFields.map((field) => (
          <div key={field.id} className="flex items-center gap-3 group">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-muted-foreground">{field.name}</span>
                <Badge variant="outline" className="text-xs">
                  {field.type === 'select' ? 'Lista Suspensa' : 
                   field.type === 'checkbox' ? 'Checkbox' : 
                   field.type === 'text' ? 'Texto' :
                   field.type === 'number' ? 'Número' :
                   field.type === 'date' ? 'Data e Hora' : field.type}
                </Badge>
              </div>
              {field.type === 'select' && field.options ? (
                <Select value={field.value} onValueChange={(value) => updateCustomField(field.id, value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma opção" />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((option, idx) => (
                      <SelectItem key={idx} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === 'checkbox' ? (
                <Input
                  type="checkbox"
                  checked={field.value === 'true'}
                  onChange={(e) => updateCustomField(field.id, e.target.checked ? 'true' : 'false')}
                  className="w-5 h-5"
                />
              ) : (
                <Input
                  value={field.value}
                  onChange={(e) => updateCustomField(field.id, e.target.value)}
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'datetime-local' : 'text'}
                />
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
              onClick={() => deleteCustomField(field.id)}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
