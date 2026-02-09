import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Trash2, FileText, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, Strikethrough, Type } from "lucide-react";
import type { TextElement } from "../types/form";

interface TextEditorProps {
  element: TextElement;
  index: number;
  onUpdate: (updated: TextElement) => void;
  onDelete: () => void;
}

export const TextEditor = ({ element, index, onUpdate, onDelete }: TextEditorProps) => {
  const updateContent = (content: string) => {
    onUpdate({ ...element, content });
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
    const currentWeight = element.style?.fontWeight || 'normal';
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

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/80 border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 font-semibold">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <span className="text-sm font-semibold text-foreground">Bloco de Texto #{index + 1}</span>
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
            <Label className="text-sm font-medium mb-2 block">Conteúdo do Texto</Label>
            <Textarea
              value={element.content}
              onChange={(e) => updateContent(e.target.value)}
              placeholder="Digite seu texto ou instrução aqui..."
              className="min-h-[120px] bg-background border-border resize-none"
              rows={5}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use este bloco para adicionar instruções, explicações ou informações adicionais.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium mb-2 block">Formatação</Label>
              <div className="flex gap-1 p-1 bg-muted rounded-md">
                <Button
                  variant={element.style?.fontWeight === 'bold' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={toggleBold}
                  title="Negrito"
                  className="flex-1"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant={element.style?.italic ? 'default' : 'ghost'}
                  size="sm"
                  onClick={toggleItalic}
                  title="Itálico"
                  className="flex-1"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant={element.style?.underline ? 'default' : 'ghost'}
                  size="sm"
                  onClick={toggleUnderline}
                  title="Sublinhado"
                  className="flex-1"
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <Button
                  variant={element.style?.strikethrough ? 'default' : 'ghost'}
                  size="sm"
                  onClick={toggleStrikethrough}
                  title="Riscado"
                  className="flex-1"
                >
                  <Strikethrough className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Tamanho do Texto</Label>
              <Select value={element.style?.fontSize || 'base'} onValueChange={updateFontSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xs">Muito Pequeno</SelectItem>
                  <SelectItem value="sm">Pequeno</SelectItem>
                  <SelectItem value="base">Normal</SelectItem>
                  <SelectItem value="lg">Grande</SelectItem>
                  <SelectItem value="xl">Muito Grande</SelectItem>
                  <SelectItem value="2xl">Extra Grande</SelectItem>
                  <SelectItem value="3xl">Gigante</SelectItem>
                </SelectContent>
              </Select>
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
