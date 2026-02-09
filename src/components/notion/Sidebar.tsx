import { useState } from 'react';
import { useNotionStore, type StorePage } from '@/stores/notionStore';
import { Search, Plus, ChevronRight, ChevronDown, FileText, Table, Star, LayoutGrid, Copy, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CreatePageDialog } from './CreatePageDialog';
import { CreateDatabaseDialog } from './CreateDatabaseDialog';
import { CreateBoardDialog } from './CreateBoardDialog';

export const Sidebar = () => {
  const { 
    pages, 
    databases, 
    boards, 
    currentPageId, 
    currentDatabaseId, 
    currentBoardId, 
    setCurrentPage, 
    setCurrentDatabase, 
    setCurrentBoard, 
    addPage, 
    addDatabase, 
    addBoard, 
    duplicatePage,
    duplicateDatabase,
    duplicateBoard,
    deletePage,
    deleteDatabase,
    deleteBoard,
    togglePageFavorite,
    toggleDatabaseFavorite,
    toggleBoardFavorite,
    searchQuery, 
    setSearchQuery 
  } = useNotionStore();
  
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [pagesExpanded, setPagesExpanded] = useState(true);
  const [tablesExpanded, setTablesExpanded] = useState(true);
  const [boardsExpanded, setBoardsExpanded] = useState(true);
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  
  const [createPageDialogOpen, setCreatePageDialogOpen] = useState(false);
  const [createDatabaseDialogOpen, setCreateDatabaseDialogOpen] = useState(false);
  const [createBoardDialogOpen, setCreateBoardDialogOpen] = useState(false);

  const handleCreatePage = (title: string, icon: string, themeId?: string) => {
    addPage(undefined, title, icon, themeId);
    toast.success('Nova página criada');
  };

  const handleCreateDatabase = (title: string, icon: string, themeId?: string) => {
    addDatabase(title, icon, themeId);
    toast.success('Novo database criado');
  };

  const handleCreateBoard = (title: string, icon: string, themeId?: string) => {
    addBoard(title, icon, themeId);
    toast.success('Novo quadro criado');
  };

  const toggleExpand = (pageId: string) => {
    setExpandedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) {
        newSet.delete(pageId);
      } else {
        newSet.add(pageId);
      }
      return newSet;
    });
  };

  const getFilteredPages = () => {
    if (!searchQuery) return pages;
    return pages.filter(p => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getPagesByParent = (parentId?: string) => {
    const filtered = getFilteredPages().filter(p => {
      // Tratar null e undefined como equivalentes
      if (parentId === undefined || parentId === null) {
        return p.parentId === null || p.parentId === undefined;
      }
      return p.parentId === parentId;
    });
    return filtered;
  };


  const renderPage = (page: StorePage, level: number = 0) => {
    const hasChildren = pages.some(p => p.parentId === page.id);
    const isExpanded = expandedPages.has(page.id);
    const isActive = currentPageId === page.id;

    return (
      <div key={page.id}>
        <div
          className={cn(
            'group flex items-center gap-1 rounded px-2 py-1 text-sm cursor-pointer transition-all duration-200',
            isActive ? 'bg-primary/10 border-l-2 border-primary text-primary' : 'hover:bg-card-hover',
            !isActive && 'hover:border-l-2 hover:border-primary/30'
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => setCurrentPage(page.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(page.id);
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}
          {!hasChildren && <span className="w-4" />}
          <span className="text-base">{page.icon}</span>
          <span className="flex-1 truncate">{page.title}</span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                duplicatePage(page.id);
                toast.success('Página duplicada');
              }}
              className="p-0.5 hover:bg-muted rounded"
              title="Duplicar"
            >
              <Copy className="h-3 w-3 text-muted-foreground" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Tem certeza que deseja excluir "${page.title}"?`)) {
                  deletePage(page.id);
                  toast.success('Página excluída');
                }
              }}
              className="p-0.5 hover:bg-muted rounded"
              title="Excluir"
            >
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePageFavorite(page.id);
              }}
              className="p-0.5 hover:bg-muted rounded"
              title="Favoritar"
            >
              <Star className={cn("h-3 w-3 transition-all", page.favorited ? "fill-primary text-primary scale-110" : "text-muted-foreground hover:text-primary/50")} />
            </button>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {getPagesByParent(page.id).map(child => renderPage(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootPages = getPagesByParent(undefined);

  return (
    <div className="w-64 bg-background/80 backdrop-blur-xl backdrop-saturate-150 border-r border-border/50 flex flex-col h-full shadow-xl">
      <div className="p-4 border-b border-border/30 bg-gradient-to-b from-background/60 to-transparent">
        <div className="flex items-center gap-3 px-2 py-2 font-bold">
          <span className="text-2xl">📝</span>
          <span className="text-base bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent tracking-tight font-black">
            Meu Workspace
          </span>
        </div>
      </div>

      <div className="p-2">
        <div className="relative" data-tour="workspace-search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {/* Seção de Favoritos */}
        {(pages.some(p => p.favorited) || databases.some(db => db.favorited) || boards.some(b => b.favorited)) && (
          <div className="mb-2">
            <button
              onClick={() => setFavoritesExpanded(!favoritesExpanded)}
              className="flex items-center gap-1 w-full px-2 py-1 text-sm hover:bg-muted rounded"
            >
              {favoritesExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <Star className="h-5 w-5 fill-primary text-primary" />
              <span className="font-semibold">Favoritos</span>
            </button>
            
            {favoritesExpanded && (
              <div className="mt-1">
                {pages.filter(p => p.favorited).map((page) => (
                  <div
                    key={page.id}
                    className={cn(
                      'group flex items-center gap-1 rounded px-2 py-1 text-sm cursor-pointer notion-hover',
                      currentPageId === page.id && 'bg-notion-bg-hover'
                    )}
                    style={{ paddingLeft: '20px' }}
                    onClick={() => setCurrentPage(page.id)}
                  >
                    <span className="text-base">{page.icon}</span>
                    <span className="flex-1 truncate">{page.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePageFavorite(page.id);
                      }}
                      className="p-0.5 hover:bg-muted rounded transition-opacity"
                    >
                      <Star className="h-3 w-3 fill-primary text-primary" />
                    </button>
                  </div>
                ))}
                {databases.filter(db => db.favorited).map((db) => (
                  <div
                    key={db.id}
                    className={cn(
                      'group flex items-center gap-1 rounded px-2 py-1 text-sm cursor-pointer notion-hover',
                      currentDatabaseId === db.id && 'bg-notion-bg-hover'
                    )}
                    style={{ paddingLeft: '20px' }}
                    onClick={() => setCurrentDatabase(db.id)}
                  >
                    {db.icon ? <span className="text-base">{db.icon}</span> : <Table className="h-4 w-4" />}
                    <span className="flex-1 truncate">{db.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDatabaseFavorite(db.id);
                      }}
                      className="p-0.5 hover:bg-muted rounded transition-opacity"
                    >
                      <Star className="h-3 w-3 fill-primary text-primary" />
                    </button>
                  </div>
                ))}
                {boards.filter(b => b.favorited).map((board) => (
                  <div
                    key={board.id}
                    className={cn(
                      'group flex items-center gap-1 rounded px-2 py-1 text-sm cursor-pointer notion-hover',
                      currentBoardId === board.id && 'bg-notion-bg-hover'
                    )}
                    style={{ paddingLeft: '20px' }}
                    onClick={() => setCurrentBoard(board.id)}
                  >
                    {board.icon ? <span className="text-base">{board.icon}</span> : <LayoutGrid className="h-4 w-4" />}
                    <span className="flex-1 truncate">{board.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBoardFavorite(board.id);
                      }}
                      className="p-0.5 hover:bg-muted rounded transition-opacity"
                    >
                      <Star className="h-3 w-3 fill-primary text-primary" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Seção de Páginas */}
        <div className="mb-2">
          <button
            onClick={() => setPagesExpanded(!pagesExpanded)}
            className="flex items-center gap-1 w-full px-2 py-1 text-sm hover:bg-muted rounded"
          >
            {pagesExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <FileText className="h-5 w-5" />
            <span className="font-semibold">Página</span>
          </button>
          
          {pagesExpanded && (
            <div className="mt-1">
              {rootPages.map(page => renderPage(page))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm mt-1 ml-4"
                onClick={() => setCreatePageDialogOpen(true)}
                data-tour="new-page-button"
              >
                <Plus className="h-3 w-3 mr-2" />
                Nova Página
              </Button>
            </div>
          )}
        </div>

        {/* Seção de Databases */}
        <div className="mb-2">
          <button
            onClick={() => setTablesExpanded(!tablesExpanded)}
            className="flex items-center gap-1 w-full px-2 py-1 text-sm hover:bg-muted rounded"
          >
            {tablesExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <Table className="h-5 w-5" />
            <span className="font-semibold">Database</span>
          </button>
          
          {tablesExpanded && (
            <div className="mt-1">
              {databases.map((db) => (
                <div
                  key={db.id}
                  className={cn(
                    'group flex items-center gap-1 rounded px-2 py-1 text-sm cursor-pointer notion-hover',
                    currentDatabaseId === db.id && 'bg-notion-bg-hover'
                  )}
                  style={{ paddingLeft: '20px' }}
                  onClick={() => setCurrentDatabase(db.id)}
                >
                  {db.icon ? <span className="text-base">{db.icon}</span> : <Table className="h-4 w-4" />}
                  <span className="flex-1 truncate">{db.title}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateDatabase(db.id);
                        toast.success('Database duplicado');
                      }}
                      className="p-0.5 hover:bg-muted rounded"
                      title="Duplicar"
                    >
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Tem certeza que deseja excluir "${db.title}"?`)) {
                          deleteDatabase(db.id);
                          toast.success('Database excluído');
                        }
                      }}
                      className="p-0.5 hover:bg-muted rounded"
                      title="Excluir"
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDatabaseFavorite(db.id);
                      }}
                      className="p-0.5 hover:bg-muted rounded"
                      title="Favoritar"
                    >
                      <Star className={cn("h-3 w-3", db.favorited ? "fill-primary text-primary" : "text-muted-foreground")} />
                    </button>
                  </div>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm mt-1 ml-4"
                onClick={() => setCreateDatabaseDialogOpen(true)}
                data-tour="new-database-button"
              >
                <Plus className="h-3 w-3 mr-2" />
                Novo Database
              </Button>
            </div>
          )}
        </div>

        {/* Seção de Quadros */}
        <div className="mb-2">
          <button
            onClick={() => setBoardsExpanded(!boardsExpanded)}
            className="flex items-center gap-1 w-full px-2 py-1 text-sm hover:bg-muted rounded"
          >
            {boardsExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <LayoutGrid className="h-4 w-4" />
            <span className="font-medium">Quadro</span>
          </button>
          
          {boardsExpanded && (
            <div className="mt-1">
              {boards.map((board) => (
                <div
                  key={board.id}
                  className={cn(
                    'group flex items-center gap-1 rounded px-2 py-1 text-sm cursor-pointer notion-hover',
                    currentBoardId === board.id && 'bg-notion-bg-hover'
                  )}
                  style={{ paddingLeft: '20px' }}
                  onClick={() => setCurrentBoard(board.id)}
                >
                  {board.icon ? <span className="text-base">{board.icon}</span> : <LayoutGrid className="h-4 w-4" />}
                  <span className="flex-1 truncate">{board.title}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateBoard(board.id);
                        toast.success('Quadro duplicado');
                      }}
                      className="p-0.5 hover:bg-muted rounded"
                      title="Duplicar"
                    >
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Tem certeza que deseja excluir "${board.title}"?`)) {
                          deleteBoard(board.id);
                          toast.success('Quadro excluído');
                        }
                      }}
                      className="p-0.5 hover:bg-muted rounded"
                      title="Excluir"
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBoardFavorite(board.id);
                      }}
                      className="p-0.5 hover:bg-muted rounded"
                      title="Favoritar"
                    >
                      <Star className={cn("h-3 w-3", board.favorited ? "fill-primary text-primary" : "text-muted-foreground")} />
                    </button>
                  </div>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm mt-1 ml-4"
                onClick={() => setCreateBoardDialogOpen(true)}
                data-tour="new-board-button"
              >
                <Plus className="h-3 w-3 mr-2" />
                Novo Quadro
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <CreatePageDialog
        open={createPageDialogOpen}
        onOpenChange={setCreatePageDialogOpen}
        onCreate={handleCreatePage}
      />
      
      <CreateDatabaseDialog
        open={createDatabaseDialogOpen}
        onOpenChange={setCreateDatabaseDialogOpen}
        onCreate={handleCreateDatabase}
      />
      
      <CreateBoardDialog
        open={createBoardDialogOpen}
        onOpenChange={setCreateBoardDialogOpen}
        onCreate={handleCreateBoard}
      />
    </div>
  );
};
