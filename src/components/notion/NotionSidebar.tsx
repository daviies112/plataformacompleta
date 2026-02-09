import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Database, ChevronRight, Plus, Star, LayoutGrid, Filter, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Page, Database as DatabaseType } from '@/types/notion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Theme {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface NotionSidebarProps {
  pages: Record<string, Page>;
  databases: Record<string, DatabaseType>;
  boards?: any[];
  onCreateBoard?: () => void;
  onCreatePage?: () => void;
  onCreateDatabase?: () => void;
}

export const NotionSidebar = ({ 
  pages, 
  databases,
  boards = [],
  onCreateBoard,
  onCreatePage,
  onCreateDatabase 
}: NotionSidebarProps) => {
  const location = useLocation();
  const [selectedThemeId, setSelectedThemeId] = useState<string>('all');
  const [themes, setThemes] = useState<Theme[]>([]);

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

  // Filtrar itens por tema
  const filterByTheme = (items: any[]) => {
    if (selectedThemeId === 'all') return items;
    if (selectedThemeId === 'none') return items.filter(item => !item.themeId);
    return items.filter(item => item.themeId === selectedThemeId);
  };

  const rootPages = filterByTheme(Object.values(pages).filter(
    page => page.parent.type === 'workspace'
  ));

  const allDatabases = filterByTheme(Object.values(databases));
  const allBoards = filterByTheme(boards);

  // Encontrar o tema pelo ID para mostrar nos badges
  const getTheme = (themeId?: string) => {
    if (!themeId) return null;
    return themes.find(t => t.id === themeId);
  };

  return (
    <aside className="w-64 bg-card border-r border-border h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Notion + Kanban
        </h1>
      </div>

      {/* Filtro por Tema */}
      <div className="p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Filtrar por Tema</span>
        </div>
        <Select value={selectedThemeId} onValueChange={setSelectedThemeId}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Todos os temas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span className="flex items-center gap-2">
                Todos os temas
              </span>
            </SelectItem>
            <SelectItem value="none">
              <span className="flex items-center gap-2 text-muted-foreground">
                Sem tema
              </span>
            </SelectItem>
            {themes.map((theme) => (
              <SelectItem key={theme.id} value={theme.id}>
                <div className="flex items-center gap-2">
                  <span>{theme.icon}</span>
                  <span>{theme.name}</span>
                  <div
                    className="w-2 h-2 rounded-full ml-auto"
                    style={{ backgroundColor: theme.color }}
                  />
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedThemeId !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedThemeId('all')}
            className="w-full mt-2 h-6 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Limpar filtro
          </Button>
        )}
      </div>
      
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">
                Quadros
              </h3>
              {onCreateBoard && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={onCreateBoard}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="space-y-1">
              {allBoards.map(board => {
                const isActive = location.pathname === `/board/${board.id}`;
                const boardTitle = board.name || 'Untitled Board';
                const theme = getTheme(board.themeId);
                
                return (
                  <Link key={board.id} to={`/board/${board.id}`}>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className="w-full justify-start text-sm relative group"
                      size="sm"
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        {board.icon && (
                          <span className="mr-2 flex-shrink-0">{board.icon}</span>
                        )}
                        {!board.icon && <LayoutGrid className="w-4 h-4 mr-2 flex-shrink-0" />}
                        <span className="truncate">{boardTitle}</span>
                      </div>
                      {theme && (
                        <div
                          className="w-2 h-2 rounded-full ml-2 flex-shrink-0"
                          style={{ backgroundColor: theme.color }}
                          title={`Tema: ${theme.name}`}
                        />
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">
                Páginas
              </h3>
              {onCreatePage && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={onCreatePage}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="space-y-1">
              {rootPages.map(page => {
                const isActive = location.pathname === `/page/${page.id}`;
                const pageTitle = page.title[0]?.text?.content || 'Untitled';
                const theme = getTheme(page.themeId);
                
                return (
                  <Link key={page.id} to={`/page/${page.id}`}>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className="w-full justify-start text-sm relative group"
                      size="sm"
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        {page.icon?.emoji && (
                          <span className="mr-2 flex-shrink-0">{page.icon.emoji}</span>
                        )}
                        {!page.icon?.emoji && <FileText className="w-4 h-4 mr-2 flex-shrink-0" />}
                        <span className="truncate">{pageTitle}</span>
                      </div>
                      {theme && (
                        <div
                          className="w-2 h-2 rounded-full ml-2 flex-shrink-0"
                          style={{ backgroundColor: theme.color }}
                          title={`Tema: ${theme.name}`}
                        />
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">
                Databases
              </h3>
              {onCreateDatabase && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={onCreateDatabase}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="space-y-1 text-xs text-muted-foreground px-2">
              <p>Databases avançados</p>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Unified Workspace
        </p>
      </div>
    </aside>
  );
};
