import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Tag, Sparkles } from 'lucide-react';
import { nanoid } from 'nanoid';

interface Theme {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface ThemeSelectorProps {
  selectedThemeId?: string;
  onThemeSelect: (themeId: string) => void;
  userId?: string;
}

export const ThemeSelector = ({ selectedThemeId, onThemeSelect, userId }: ThemeSelectorProps) => {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeIcon, setNewThemeIcon] = useState('🏷️');
  const [newThemeColor, setNewThemeColor] = useState('#6366f1');

  const themeIcons = ['🏷️', '📁', '🎯', '💼', '🚀', '⭐', '🎨', '📊', '💡', '🔖', '📌', '✨'];
  
  const themeColors = [
    { name: 'Azul', value: '#6366f1' },
    { name: 'Verde', value: '#10b981' },
    { name: 'Vermelho', value: '#ef4444' },
    { name: 'Amarelo', value: '#eab308' },
    { name: 'Roxo', value: '#a855f7' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Laranja', value: '#f97316' },
    { name: 'Cinza', value: '#6b7280' },
  ];

  useEffect(() => {
    fetchThemes();
  }, []);

  const fetchThemes = async () => {
    try {
      const response = await fetch('/api/workspace/themes');
      if (response.ok) {
        const data = await response.json();
        setThemes(data);
      }
    } catch (error) {
      console.error('Erro ao carregar temas:', error);
    }
  };

  const handleCreateTheme = async () => {
    if (!newThemeName.trim()) return;

    const newTheme: Theme = {
      id: nanoid(),
      name: newThemeName,
      icon: newThemeIcon,
      color: newThemeColor,
    };

    try {
      const response = await fetch('/api/workspace/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTheme),
      });

      if (response.ok) {
        const createdTheme = await response.json();
        setThemes([...themes, createdTheme]);
        onThemeSelect(createdTheme.id);
        setIsCreatingNew(false);
        setNewThemeName('');
        setNewThemeIcon('🏷️');
        setNewThemeColor('#6366f1');
      }
    } catch (error) {
      console.error('Erro ao criar tema:', error);
    }
  };

  if (isCreatingNew) {
    return (
      <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Criar Novo Tema
          </Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCreatingNew(false)}
          >
            Cancelar
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nome do Tema</Label>
            <Input
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              placeholder="Ex: Projetos, Finanças, Marketing..."
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Ícone</Label>
            <div className="flex gap-2 flex-wrap mt-1">
              {themeIcons.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setNewThemeIcon(icon)}
                  className={`text-xl p-2 rounded hover:bg-background ${
                    newThemeIcon === icon ? 'bg-background ring-2 ring-primary' : ''
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Cor</Label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {themeColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setNewThemeColor(color.value)}
                  className={`flex items-center gap-2 p-2 rounded hover:bg-background ${
                    newThemeColor === color.value ? 'bg-background ring-2 ring-primary' : ''
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: color.value }}
                  />
                  <span className="text-xs">{color.name}</span>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleCreateTheme}
            disabled={!newThemeName.trim()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Tema
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Tag className="h-4 w-4" />
        Tema / Categoria
      </Label>
      <Select value={selectedThemeId} onValueChange={onThemeSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um tema..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">Sem tema</span>
          </SelectItem>
          {themes.map((theme) => (
            <SelectItem key={theme.id} value={theme.id}>
              <div className="flex items-center gap-2">
                <span>{theme.icon}</span>
                <span>{theme.name}</span>
                <div
                  className="w-3 h-3 rounded-full ml-auto"
                  style={{ backgroundColor: theme.color }}
                />
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsCreatingNew(true)}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Criar Novo Tema
      </Button>
    </div>
  );
};
