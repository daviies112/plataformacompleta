import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Trash2, Minus } from "lucide-react";
import type { PageBreakElement } from "../types/form";

interface PageBreakEditorProps {
  element: PageBreakElement;
  index: number;
  onUpdate: (updated: PageBreakElement) => void;
  onDelete: () => void;
}

export const PageBreakEditor = ({ element, index, onUpdate, onDelete }: PageBreakEditorProps) => {
  const updateLabel = (label: string) => {
    onUpdate({ ...element, label });
  };

  const toggleShowLine = (showLine: boolean) => {
    onUpdate({ ...element, showLine });
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/80 border-l-4 border-l-orange-500 shadow-md hover:shadow-lg transition-shadow">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/10 text-orange-600 font-semibold">
              <Minus className="h-4 w-4" />
            </span>
            <div>
              <span className="text-sm font-semibold text-foreground">Divisor #{index + 1}</span>
              <span className="text-xs text-muted-foreground ml-2">
                (Elemento visual de separação)
              </span>
            </div>
          </div>
          <Button
            onClick={onDelete}
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium mb-2 block">Rótulo do Divisor (Opcional)</Label>
            <Input
              value={element.label || ''}
              onChange={(e) => updateLabel(e.target.value)}
              placeholder="Ex: Nova Seção, Parte 2, etc."
              className="bg-background border-border"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use um rótulo para identificar a seção que começa após o divisor.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Mostrar Linha Divisória</Label>
              <p className="text-xs text-muted-foreground">
                Exibe uma linha horizontal visual no preview
              </p>
            </div>
            <Switch
              checked={element.showLine}
              onCheckedChange={toggleShowLine}
            />
          </div>

          <div className="p-4 border-2 border-dashed border-muted rounded-md bg-muted/20">
            <p className="text-xs text-center text-muted-foreground">
              Preview do Divisor
            </p>
            {element.showLine && (
              <div className="my-2 border-t-2 border-border"></div>
            )}
            {element.label && (
              <p className="text-sm text-center font-medium mt-2">{element.label}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
