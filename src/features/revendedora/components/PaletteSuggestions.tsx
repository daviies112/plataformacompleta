import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { type PaletteVariation } from "@/features/revendedora/utils/colorExtractor";

interface PaletteSuggestionsProps {
  variations: PaletteVariation[];
  onSelectVariation: (variation: PaletteVariation) => void;
}

export function PaletteSuggestions({ variations, onSelectVariation }: PaletteSuggestionsProps) {
  if (variations.length === 0) return null;

  const handleApply = (variation: PaletteVariation, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    onSelectVariation(variation);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>Sugestões de Paleta</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Escolha uma paleta de cores baseada na sua logo
      </p>
      
      <div className="grid grid-cols-2 gap-3">
        {variations.map((variation, index) => (
          <Card 
            key={index}
            className="p-3 cursor-pointer hover:ring-2 hover:ring-primary hover:shadow-lg transition-all active:scale-95"
            onClick={() => handleApply(variation)}
          >
            <div className="space-y-2">
              <p className="text-xs font-medium">{variation.name}</p>
              <div className="flex gap-1">
                {variation.colors.map((color, colorIndex) => (
                  <div
                    key={colorIndex}
                    className="flex-1 h-12 rounded shadow-sm"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs hover:bg-primary hover:text-primary-foreground"
                onClick={(e) => handleApply(variation, e)}
              >
                Aplicar
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
