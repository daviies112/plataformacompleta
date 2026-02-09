import { Card, CardCover, LabelColor } from '@/types/kanban';
import { Image, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { coverButtonColorClasses } from '@/lib/labelColors';
import { ColorPicker } from '@/components/ui/color-picker';

interface CardCoverSectionProps {
  card: Card;
  onUpdate: (card: Card) => void;
}

const coverColors: LabelColor[] = [
  'green',
  'yellow',
  'orange',
  'red',
  'purple',
  'blue',
  'sky',
  'lime',
  'pink',
  'black',
];

// Paleta de cores completa para capas - 5 linhas x 5 colunas
const PRESET_COVER_COLORS = [
  // Linha 1 - Tons claros
  "#b3f5bc", "#fef3bd", "#fedec8", "#ffd5d2", "#dfd8fd",
  // Linha 2 - Tons médios
  "#61bd4f", "#f2d600", "#ff9f1a", "#eb5a46", "#c377e0",
  // Linha 3 - Tons escuros  
  "#0a7e3c", "#b38700", "#cc6e00", "#b81c00", "#5a3a86",
  // Linha 4 - Azuis e cianos
  "#cce0ff", "#c2e0f4", "#d3f1a7", "#fdd0ec", "#dcdcdc",
  // Linha 5 - Azuis e cinzas escuros
  "#0079bf", "#00c2e0", "#51e898", "#ff78cb", "#344563",
];

export const CardCoverSection = ({ card, onUpdate }: CardCoverSectionProps) => {
  const [open, setOpen] = useState(false);
  const [customColor, setCustomColor] = useState('#0079bf');

  const setCover = (cover: CardCover) => {
    onUpdate({ ...card, cover });
  };

  const setCoverWithCustomColor = (color: string) => {
    onUpdate({ ...card, cover: { type: 'color', value: color, size: card.cover?.size || 'normal' } });
  };

  const removeCover = () => {
    onUpdate({ ...card, cover: undefined });
    setOpen(false);
  };

  const changeCoverSize = (size: 'normal' | 'full') => {
    if (card.cover) {
      onUpdate({ ...card, cover: { ...card.cover, size } });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" className="w-full justify-start">
          <Image className="w-4 h-4 mr-2" />
          Capa
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <h3 className="font-semibold mb-3">Capa</h3>

        {card.cover && (
          <div className="mb-4 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Tamanho</div>
            <div className="flex gap-2">
              <Button
                variant={card.cover.size === 'normal' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => changeCoverSize('normal')}
                className="flex-1"
              >
                Normal
              </Button>
              <Button
                variant={card.cover.size === 'full' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => changeCoverSize('full')}
                className="flex-1"
              >
                Completa
              </Button>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={removeCover}
              className="w-full"
            >
              Remover capa
            </Button>
          </div>
        )}

        <Tabs defaultValue="preset">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preset">Cores</TabsTrigger>
            <TabsTrigger value="custom">Personalizada</TabsTrigger>
            <TabsTrigger value="images">Imagens</TabsTrigger>
          </TabsList>

          <TabsContent value="preset" className="space-y-2">
            <div className="grid grid-cols-5 gap-2">
              {coverColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setCover({ type: 'color', value: color, size: card.cover?.size || 'normal' })}
                  className={`h-12 rounded hover:opacity-80 transition-all relative ${coverButtonColorClasses[color]}`}
                >
                  {card.cover?.type === 'color' && card.cover.value === color && (
                    <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                  )}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-3">
            <ColorPicker
              value={customColor}
              onChange={(color) => {
                setCustomColor(color);
                setCoverWithCustomColor(color);
              }}
              presetColors={PRESET_COVER_COLORS}
            />
          </TabsContent>

          <TabsContent value="images" className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Cole o URL de uma imagem ou use imagens do Unsplash
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  setCover({
                    type: 'image',
                    value: 'https://images.unsplash.com/photo-1557683316-973673baf926',
                    size: 'normal',
                  })
                }
                className="h-20 rounded bg-cover bg-center hover:opacity-80 transition-opacity"
                style={{
                  backgroundImage: 'url(https://images.unsplash.com/photo-1557683316-973673baf926)',
                }}
              />
              <button
                onClick={() =>
                  setCover({
                    type: 'image',
                    value: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809',
                    size: 'normal',
                  })
                }
                className="h-20 rounded bg-cover bg-center hover:opacity-80 transition-opacity"
                style={{
                  backgroundImage: 'url(https://images.unsplash.com/photo-1579546929518-9e396f3cc809)',
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
