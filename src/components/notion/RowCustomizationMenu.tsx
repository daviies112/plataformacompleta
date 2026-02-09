import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings2 } from 'lucide-react';

interface RowStyles {
  backgroundColor?: string;
  textColor?: string;
  fontWeight?: 'normal' | 'bold' | 'light';
  fontSize?: 'small' | 'normal' | 'large';
  fontStyle?: 'normal' | 'italic';
}

interface RowCustomizationMenuProps {
  rowId: string;
  currentStyles?: RowStyles;
  onUpdateStyles: (rowId: string, styles: RowStyles) => void;
}

export const RowCustomizationMenu = ({
  rowId,
  currentStyles = {},
  onUpdateStyles,
}: RowCustomizationMenuProps) => {
  const [open, setOpen] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState(currentStyles.backgroundColor || '#ffffff');
  const [textColor, setTextColor] = useState(currentStyles.textColor || '#000000');
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold' | 'light'>(currentStyles.fontWeight || 'normal');
  const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large'>(currentStyles.fontSize || 'normal');
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>(currentStyles.fontStyle || 'normal');

  const handleApply = () => {
    onUpdateStyles(rowId, {
      backgroundColor,
      textColor,
      fontWeight,
      fontSize,
      fontStyle,
    });
    setOpen(false);
  };

  const handleReset = () => {
    setBackgroundColor('#ffffff');
    setTextColor('#000000');
    setFontWeight('normal');
    setFontSize('normal');
    setFontStyle('normal');
    onUpdateStyles(rowId, {
      backgroundColor: '#ffffff',
      textColor: '#000000',
      fontWeight: 'normal',
      fontSize: 'normal',
      fontStyle: 'normal',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Personalizar Linha</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="backgroundColor">Cor de Fundo</Label>
              <div className="flex gap-2 items-center">
                <input
                  id="backgroundColor"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="h-10 w-20 rounded border border-input cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">{backgroundColor}</span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="textColor">Cor do Texto</Label>
              <div className="flex gap-2 items-center">
                <input
                  id="textColor"
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-10 w-20 rounded border border-input cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">{textColor}</span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fontWeight">Peso da Fonte</Label>
              <Select value={fontWeight} onValueChange={(value: 'normal' | 'bold' | 'light') => setFontWeight(value)}>
                <SelectTrigger id="fontWeight">
                  <SelectValue placeholder="Selecione o peso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Leve</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="bold">Negrito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fontSize">Tamanho da Fonte</Label>
              <Select value={fontSize} onValueChange={(value: 'small' | 'normal' | 'large') => setFontSize(value)}>
                <SelectTrigger id="fontSize">
                  <SelectValue placeholder="Selecione o tamanho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Pequeno</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fontStyle">Estilo da Fonte</Label>
              <Select value={fontStyle} onValueChange={(value: 'normal' | 'italic') => setFontStyle(value)}>
                <SelectTrigger id="fontStyle">
                  <SelectValue placeholder="Selecione o estilo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="italic">Itálico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between pt-2 border-t">
            <Button variant="outline" onClick={handleReset}>
              Resetar Estilos
            </Button>
            <Button onClick={handleApply}>
              Aplicar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
