import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Button } from './button';
import { Plus } from 'lucide-react';

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  presetColors?: string[];
}

const DEFAULT_PRESET_COLORS = [
  "#61bd4f", "#f2d600", "#ff9f1a", "#eb5a46", "#c377e0", 
  "#0079bf", "#00c2e0", "#51e898", "#ff78cb", "#344563",
  "#0052cc", "#6554c0", "#00b8d9", "#36b37e", "#ff5630", "#ff991f",
  "#5243aa", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff",
  "#00ffff", "#800000", "#008000", "#000080", "#808000", "#800080",
  "#008080", "#ffa500", "#a52a2a", "#deb887", "#5f9ea0", "#7fff00",
  "#d2691e", "#ff7f50", "#6495ed", "#dc143c", "#00ced1", "#9400d3"
];

const COLOR_SPECTRUM = [
  ["#ff0000", "#ff1a00", "#ff3300", "#ff4d00", "#ff6600", "#ff8000", "#ff9900", "#ffb300"],
  ["#ffcc00", "#ffe600", "#ffff00", "#e6ff00", "#ccff00", "#b3ff00", "#99ff00", "#80ff00"],
  ["#66ff00", "#4dff00", "#33ff00", "#1aff00", "#00ff00", "#00ff1a", "#00ff33", "#00ff4d"],
  ["#00ff66", "#00ff80", "#00ff99", "#00ffb3", "#00ffcc", "#00ffe6", "#00ffff", "#00e6ff"],
  ["#00ccff", "#00b3ff", "#0099ff", "#0080ff", "#0066ff", "#004dff", "#0033ff", "#001aff"],
  ["#0000ff", "#1a00ff", "#3300ff", "#4d00ff", "#6600ff", "#8000ff", "#9900ff", "#b300ff"],
  ["#cc00ff", "#e600ff", "#ff00ff", "#ff00e6", "#ff00cc", "#ff00b3", "#ff0099", "#ff0080"],
  ["#ff0066", "#ff004d", "#ff0033", "#ff001a", "#ff0000", "#e60000", "#cc0000", "#b30000"],
  ["#000000", "#1a1a1a", "#333333", "#4d4d4d", "#666666", "#808080", "#999999", "#b3b3b3"],
  ["#cccccc", "#d9d9d9", "#e6e6e6", "#f2f2f2", "#ffffff", "#fef5e7", "#fdebd0", "#fce4b8"]
];

const STORAGE_KEY = 'workspace-custom-colors';

const loadCustomColors = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveCustomColors = (colors: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  } catch (error) {
    console.error('Erro ao salvar cores personalizadas:', error);
  }
};

export const ColorPicker = ({ 
  value = "#0079bf", 
  onChange, 
  presetColors = DEFAULT_PRESET_COLORS 
}: ColorPickerProps) => {
  const [customColor, setCustomColor] = useState(value);
  const [savedCustomColors, setSavedCustomColors] = useState<string[]>([]);

  useEffect(() => {
    setCustomColor(value);
  }, [value]);

  useEffect(() => {
    setSavedCustomColors(loadCustomColors());
  }, []);

  const handleColorClick = (color: string) => {
    onChange(color);
    setCustomColor(color);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    onChange(newColor);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newColor = e.target.value;
    if (!newColor.startsWith('#')) {
      newColor = '#' + newColor;
    }
    setCustomColor(newColor);
    if (/^#[0-9A-F]{6}$/i.test(newColor)) {
      onChange(newColor);
    }
  };

  const saveCurrentColor = () => {
    if (!/^#[0-9A-F]{6}$/i.test(customColor)) {
      return;
    }
    
    if (savedCustomColors.includes(customColor)) {
      return;
    }

    const newColors = [customColor, ...savedCustomColors].slice(0, 20);
    setSavedCustomColors(newColors);
    saveCustomColors(newColors);
  };

  return (
    <Tabs defaultValue="spectrum" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="spectrum">Cores</TabsTrigger>
        <TabsTrigger value="preset">Paleta</TabsTrigger>
        <TabsTrigger value="custom">Código</TabsTrigger>
      </TabsList>

      <TabsContent value="spectrum" className="space-y-3 mt-3">
        <div className="max-h-64 overflow-y-auto pr-1 space-y-1">
          {COLOR_SPECTRUM.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1">
              {row.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorClick(color)}
                  className={cn(
                    "h-6 flex-1 rounded-sm transition-all hover:scale-105 hover:z-10",
                    value === color && "ring-2 ring-offset-1 ring-primary scale-105 z-10"
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-2">
          <div 
            className="h-8 w-8 rounded-md border-2 border-border flex-shrink-0" 
            style={{ backgroundColor: value }}
          />
          <span className="text-xs font-mono text-muted-foreground">{value}</span>
        </div>
      </TabsContent>

      <TabsContent value="preset" className="space-y-3 mt-3">
        <div className="max-h-64 overflow-y-auto pr-1">
          <div className="grid grid-cols-5 gap-2">
            {presetColors.map((color) => (
              <button
                key={color}
                onClick={() => handleColorClick(color)}
                className={cn(
                  "h-10 w-full rounded-md transition-all hover:scale-105 hover:ring-2 hover:ring-offset-1 hover:ring-primary",
                  value === color && "ring-2 ring-offset-2 ring-primary scale-105"
                )}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          
          {savedCustomColors.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Cores Salvas</p>
              <div className="grid grid-cols-5 gap-2">
                {savedCustomColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorClick(color)}
                    className={cn(
                      "h-10 w-full rounded-md transition-all hover:scale-105 hover:ring-2 hover:ring-offset-1 hover:ring-primary",
                      value === color && "ring-2 ring-offset-2 ring-primary scale-105"
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t">
          <div 
            className="h-10 w-full rounded-md border-2 border-border flex items-center justify-center" 
            style={{ backgroundColor: value }}
          >
            <span className="text-xs font-mono text-white mix-blend-difference">{value}</span>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="custom" className="space-y-3 mt-3">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customColor}
              onChange={handleCustomColorChange}
              className="h-12 w-12 rounded cursor-pointer border-2 border-border"
            />
            <div className="flex-1">
              <Input
                type="text"
                value={customColor}
                onChange={handleHexInputChange}
                placeholder="#000000"
                className="font-mono"
              />
            </div>
          </div>
          <div 
            className="h-16 rounded-md border-2 border-border" 
            style={{ backgroundColor: customColor }}
          />
          <Button 
            onClick={saveCurrentColor}
            variant="outline"
            size="sm"
            className="w-full"
            disabled={!/^#[0-9A-F]{6}$/i.test(customColor) || savedCustomColors.includes(customColor)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Salvar cor personalizada
          </Button>
          {savedCustomColors.includes(customColor) && (
            <p className="text-xs text-muted-foreground text-center">Esta cor já foi salva</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};
