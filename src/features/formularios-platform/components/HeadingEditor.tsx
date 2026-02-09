import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Trash2, Heading1, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, Strikethrough } from "lucide-react";
import type { HeadingElement } from "../types/form";

interface HeadingEditorProps {
  element: HeadingElement;
  index: number;
  onUpdate: (updated: HeadingElement) => void;
  onDelete: () => void;
}

export const HeadingEditor = ({ element, index, onUpdate, onDelete }: HeadingEditorProps) => {
  const updateText = (text: string) => {
    onUpdate({ ...element, text });
  };

  const updateAlignment = (alignment: 'left' | 'center' | 'right') => {
    onUpdate({
      ...element,
      style: { ...(element.style ?? {}), alignment }
    });
  };

  const updateFontSize = (fontSize: string) => {
    onUpdate({
      ...element,
      style: { ...(element.style ?? {}), fontSize: fontSize as any }
    });
  };

  const toggleBold = () => {
    const currentWeight = element.style?.fontWeight || 'bold';
    const newWeight = currentWeight === 'bold' ? 'normal' : 'bold';
    onUpdate({
      ...element,
      style: { ...(element.style ?? {}), fontWeight: newWeight }
    });
  };

  const toggleItalic = () => {
    onUpdate({
      ...element,
      style: { ...(element.style ?? {}), italic: !element.style?.italic }
    });
  };

  const toggleUnderline = () => {
    onUpdate({
      ...element,
      style: { ...(element.style ?? {}), underline: !element.style?.underline }
    });
  };

  const toggleStrikethrough = () => {
    onUpdate({
      ...element,
      style: { ...(element.style ?? {}), strikethrough: !element.style?.strikethrough }
    });
  };

  const getHeadingIcon = () => {
    switch (element.level) {
      case 1: return <Heading1 className="h-4 w-4" />;
      case 2: return <Heading2 className="h-4 w-4" />;
      case 3: return <Heading3 className="h-4 w-4" />;
      default: return <Heading2 className="h-4 w-4" />;
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/80 border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 font-semibold">
              {getHeadingIcon()}
            </span>
            <div>
              <span className="text-sm font-semibold text-foreground">Título #{index + 1}</span>
              <span className="text-xs text-muted-foreground ml-2">
                (Elemento visual - sem pontuação)
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
            <Label className="text-sm font-medium mb-2 block">Texto do Título</Label>
            <Input
              value={element.text}
              onChange={(e) => updateText(e.target.value)}
              placeholder="Digite o título..."
              className="text-lg font-semibold bg-background border-border"
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Tamanho do Título</Label>
            <Select value={element.style?.fontSize || '2xl'} onValueChange={updateFontSize}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="base">Normal</SelectItem>
                <SelectItem value="lg">Grande</SelectItem>
                <SelectItem value="xl">Muito Grande</SelectItem>
                <SelectItem value="2xl">Extra Grande</SelectItem>
                <SelectItem value="3xl">Gigante</SelectItem>
                <SelectItem value="4xl">Ultra Gigante</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Formatação</Label>
            <div className="flex gap-1 p-1 bg-muted rounded-md w-fit">
              <Button
                variant={(element.style?.fontWeight === 'bold' || !element.style?.fontWeight) ? 'default' : 'ghost'}
                size="sm"
                onClick={toggleBold}
                title="Negrito"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant={element.style?.italic ? 'default' : 'ghost'}
                size="sm"
                onClick={toggleItalic}
                title="Itálico"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                variant={element.style?.underline ? 'default' : 'ghost'}
                size="sm"
                onClick={toggleUnderline}
                title="Sublinhado"
              >
                <Underline className="h-4 w-4" />
              </Button>
              <Button
                variant={element.style?.strikethrough ? 'default' : 'ghost'}
                size="sm"
                onClick={toggleStrikethrough}
                title="Riscado"
              >
                <Strikethrough className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Alinhamento</Label>
            <div className="flex gap-1 p-1 bg-muted rounded-md w-fit">
              <Button
                variant={element.style?.alignment === 'left' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => updateAlignment('left')}
                title="Alinhar à Esquerda"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                variant={element.style?.alignment === 'center' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => updateAlignment('center')}
                title="Centralizar"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                variant={element.style?.alignment === 'right' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => updateAlignment('right')}
                title="Alinhar à Direita"
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
