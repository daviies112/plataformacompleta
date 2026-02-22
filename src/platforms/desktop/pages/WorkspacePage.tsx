import { useEffect, useState } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import { Editor } from '@/components/notion/Editor';
import { DatabaseView } from '@/components/notion/DatabaseView';
import { FiltersProvider } from '@/contexts/FiltersContext';
import { Board } from '@/components/kanban/Board';
import { FileText, Database, LayoutGrid, PlusCircle, Search, Trash2, ArrowLeft, ExternalLink, Copy, Edit, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { toast } from "sonner";

/**
 * Workspace Desktop Premium - Redesign based on "Formulário" page
 * - Removes Sidebar
 * - Adds Horizontal Nav (Página, Database, Quadro)
 * - Dashboard Grid View for items
 */
const WorkspacePage = () => {
  const {
    pages,
    databases,
    boards,
    addPage,
    addDatabase,
    addBoard,
    currentPageId,
    currentDatabaseId,
    currentBoardId,
    setCurrentPage,
    setCurrentDatabase,
    setCurrentBoard,
    getCurrentPage,
    getCurrentDatabase,
    getCurrentBoard,
    updateBoard,
    deletePage,
    deleteDatabase,
    deleteBoard,
    reloadFromSupabase,
    resetSelection
  } = useNotionStore();

  // State for the dashboard view mode
  const [activeTab, setActiveTab] = useState<'pages' | 'databases' | 'boards'>('pages');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);

  // Load data and reset selection on mount
  useEffect(() => {
    const initWorkspace = async () => {
      try {
        if (isInitialLoad) {
          await reloadFromSupabase();
          // Always reset selection when mounting the page from direct navigation
          resetSelection();
          setActiveTab('pages');
        }
      } catch (error) {
        console.error('Error loading workspace data:', error);
      } finally {
        setIsInitialLoad(false);
      }
    };
    initWorkspace();
  }, [isInitialLoad, reloadFromSupabase, resetSelection]);

  // Derived state
  const isDetailView = !!(currentPageId || currentDatabaseId || currentBoardId);
  const currentPage = getCurrentPage();
  const currentDatabase = getCurrentDatabase();
  const currentBoard = getCurrentBoard();

  // Filter items
  const filteredItems = () => {
    const query = searchQuery.toLowerCase();
    switch (activeTab) {
      case 'pages':
        // Filter only root pages (parentId is null/undefined) for dashboard to avoid clutter
        return pages.filter(p => !p.parentId && p.title.toLowerCase().includes(query));
      case 'databases':
        return databases.filter(d => d.title.toLowerCase().includes(query));
      case 'boards':
        return boards.filter(b => b.title.toLowerCase().includes(query));
      default:
        return [];
    }
  };

  const handleTabChange = (tab: 'pages' | 'databases' | 'boards') => {
    setActiveTab(tab);
    // Exit detail view when switching tabs
    if (isDetailView) {
      // Use setState directly to bypass any wrapper logic if needed, or use the setter
      setCurrentPage(null as any);
      useNotionStore.setState({ currentPageId: null, currentDatabaseId: null, currentBoardId: null });
    }
  };

  const handleCreateNew = () => {
    if (activeTab === 'pages') {
      addPage(undefined, 'Nova Página', '📄');
      // Automatically opens the new page because addPage sets currentPageId
    } else if (activeTab === 'databases') {
      addDatabase('Nova Tabela', '📊');
    } else if (activeTab === 'boards') {
      addBoard('Novo Quadro', '📋');
    }
    toast.success(`${activeTab === 'pages' ? 'Página' : activeTab === 'databases' ? 'Database' : 'Quadro'} criado com sucesso!`);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir?')) {
      if (activeTab === 'pages') deletePage(id);
      else if (activeTab === 'databases') deleteDatabase(id);
      else if (activeTab === 'boards') deleteBoard(id);
      toast.success('Item excluído!');
    }
  };

  // Render Navigation
  const renderNav = () => (
    <nav className="h-14 border-b border-border/50 glass backdrop-blur-xl flex items-center px-6 sticky top-0 z-50 animate-slide-up bg-background/80">

      {/* If in detail view, show Back button or Title */}
      {isDetailView ? (
        <div className="flex items-center gap-2 mr-6">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 pl-2 pr-3 hover:bg-muted"
            onClick={() => {
              useNotionStore.setState({ currentPageId: null, currentDatabaseId: null, currentBoardId: null });
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="h-4 w-px bg-border mx-2" />
        </div>
      ) : (
        <div className="flex items-center gap-2 font-bold text-lg mr-8 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Workspace
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-4 bg-white/5 p-1 rounded-xl glass border border-white/10">
          <Button
            variant={activeTab === 'pages' && !isDetailView ? 'default' : 'ghost'}
            onClick={() => handleTabChange('pages')}
            className={cn(
              "gap-2 transition-all duration-300 rounded-lg h-9 px-4 text-sm",
              activeTab === 'pages' && !isDetailView && "bg-primary text-black shadow-lg shadow-primary/20 scale-105"
            )}
          >
            <FileText className="h-4 w-4" />
            Notion
          </Button>
          <Button
            variant={activeTab === 'databases' && !isDetailView ? 'default' : 'ghost'}
            onClick={() => handleTabChange('databases')}
            className={cn(
              "gap-2 transition-all duration-300 rounded-lg h-9 px-4 text-sm",
              activeTab === 'databases' && !isDetailView && "bg-primary text-black shadow-lg shadow-primary/20 scale-105"
            )}
          >
            <Database className="h-4 w-4" />
            Database
          </Button>
          <Button
            variant={activeTab === 'boards' && !isDetailView ? 'default' : 'ghost'}
            onClick={() => handleTabChange('boards')}
            className={cn(
              "gap-2 transition-all duration-300 rounded-lg h-9 px-4 text-sm",
              activeTab === 'boards' && !isDetailView && "bg-primary text-black shadow-lg shadow-primary/20 scale-105"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Trello
          </Button>
        </div>
      </div>

      {/* Show active item breadcrumb if in detail view */}
      {isDetailView && (
        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground animate-fade-in hidden sm:flex">
          <span className="opacity-50">Editando:</span>
          <Badge variant="outline" className="gap-1 text-foreground">
            {currentPage ? <FileText className="h-3 w-3" /> : currentDatabase ? <Database className="h-3 w-3" /> : <LayoutGrid className="h-3 w-3" />}
            <span className="max-w-[150px] truncate">
              {currentPage?.title || currentDatabase?.title || currentBoard?.title || 'Sem título'}
            </span>
          </Badge>
        </div>
      )}
    </nav>
  );

  // Render Dashboard
  const renderDashboard = () => {
    const items = filteredItems();

    return (
      <div className="container mx-auto px-4 py-12 relative">
        <div className="max-w-6xl mx-auto">
          {/* Header Area */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 animate-slide-up">
            <div>
              <h1 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent capitalize">
                {activeTab === 'pages' ? 'Notions Criados' : activeTab === 'databases' ? 'Databases Criados' : 'Trellos Criados'}
              </h1>
              <p className="text-base text-muted-foreground">
                Que tal organizar seu {activeTab === 'pages' ? 'documentos' : activeTab === 'databases' ? 'dados' : 'fluxo de trabalho'} hoje?
              </p>
            </div>
          </div>

          {/* Actions & Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <Button onClick={handleCreateNew} variant="premium" size="lg" className="shadow-lg hover:shadow-primary/20">
              <PlusCircle className="h-5 w-5 mr-2" />
              Criar {activeTab === 'pages' ? 'Notion' : activeTab === 'databases' ? 'Database' : 'Trello'}
            </Button>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Buscar ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 glass bg-background/50"
              />
            </div>
          </div>

          {/* Grid */}
          {items.length === 0 ? (
            <Card className="border-2 border-dashed glass shadow-card animate-scale-in">
              <CardContent className="py-20 text-center">
                <div className="p-6 bg-gradient-to-br from-primary/10 to-primary-glow/10 rounded-2xl w-fit mx-auto mb-6">
                  {activeTab === 'pages' ? <FileText className="h-16 w-16 text-primary" /> :
                    activeTab === 'databases' ? <Database className="h-16 w-16 text-primary" /> :
                      <LayoutGrid className="h-16 w-16 text-primary" />}
                </div>
                <h3 className="text-2xl font-bold mb-3">Nenhum item encontrado</h3>
                <p className="text-muted-foreground mb-8 text-lg">
                  Comece criando seu primeiro {activeTab === 'pages' ? 'documento' : 'banco de dados'}.
                </p>
                <Button onClick={handleCreateNew} variant="outline" size="lg">
                  Criar Agora
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item: any, index: number) => (
                <Card
                  key={item.id}
                  className="glass hover-lift border border-border/50 hover:border-primary/30 shadow-card animate-slide-up group cursor-pointer overflow-hidden relative"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => {
                    if (activeTab === 'pages') setCurrentPage(item.id);
                    else if (activeTab === 'databases') setCurrentDatabase(item.id);
                    else setCurrentBoard(item.id);
                  }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  <CardHeader className="relative pb-2">
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary-glow/10 text-2xl">
                        {/* Display Icon */}
                        {item.icon ? (
                          <span>{item.icon}</span>
                        ) : (
                          activeTab === 'pages' ? <FileText className="h-6 w-6 text-primary" /> :
                            activeTab === 'databases' ? <Database className="h-6 w-6 text-primary" /> :
                              <LayoutGrid className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={(e) => handleDelete(item.id, e)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="mt-4 text-xl font-bold truncate pr-4">
                      {item.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[40px]">
                      {activeTab === 'pages' ? (item.blocks?.length ? `${item.blocks.length} blocos de conteúdo` : 'Página vazia') :
                        activeTab === 'databases' ? `${item.rows?.length || 0} registros` :
                          `${item.lists?.length || 0} listas`}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    {/* Unified Action Buttons for All Types */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeTab === 'pages') setCurrentPage(item.id);
                          else if (activeTab === 'databases') setCurrentDatabase(item.id);
                          else setCurrentBoard(item.id);
                        }}
                        className="gap-2 flex-1"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const prefix = activeTab === 'pages' ? 'p' : activeTab === 'databases' ? 'd' : 'w';
                          const link = `${window.location.origin}/${prefix}/${item.id}`;
                          navigator.clipboard.writeText(link);
                          toast.success('Link copiado!');
                        }}
                        className="gap-2 glass flex-1"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copiar Link
                      </Button>
                      <div className="w-full flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeTab === 'pages') setCurrentPage(item.id);
                            else if (activeTab === 'databases') setCurrentDatabase(item.id);
                            else setCurrentBoard(item.id);
                          }}
                          className="gap-2 glass flex-1"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeTab === 'pages') setCurrentPage(item.id);
                            else if (activeTab === 'databases') setCurrentDatabase(item.id);
                            else setCurrentBoard(item.id);
                            toast.info(`Visualizando ${activeTab === 'pages' ? 'página' : activeTab === 'databases' ? 'database' : 'quadro'}`);
                          }}
                          className="gap-2 glass flex-1"
                        >
                          <TrendingUp className="h-3.5 w-3.5" />
                          Ver Respostas
                        </Button>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => handleDelete(item.id, e)}
                        className="gap-2 w-full mt-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </Button>
                    </div>

                    {/* Footer Metadata */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-border/50">
                      <Badge variant="secondary" className="glass font-normal">
                        {item.themeId ? 'Personalizado' : 'Padrão'}
                      </Badge>
                      {(item.updatedAt || item.createdAt) && (
                        <span className="ml-auto">
                          {format(new Date(item.updatedAt || item.createdAt), "d MMM", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col" data-testid="workspace-page">
      {renderNav()}

      <main className="flex-1 overflow-hidden flex flex-col">
        {isDetailView ? (
          <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden animate-fade-in relative">
            {/* Background overlay for detail view to make it distinct */}
            <div className="absolute inset-0 bg-background/95 backdrop-blur-sm -z-10" />

            {currentBoardId && currentBoard ? (
              <FiltersProvider>
                <div className="flex-1 overflow-hidden">
                  <Board
                    board={currentBoard}
                    onUpdateBoard={(updatedBoard) => updateBoard(currentBoard.id, updatedBoard)}
                    filterSidebarOpen={filterSidebarOpen}
                    onFilterSidebarChange={setFilterSidebarOpen}
                  />
                </div>
              </FiltersProvider>
            ) : currentDatabaseId && currentDatabase ? (
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 md:p-8 max-w-[1800px] mx-auto">
                  <DatabaseView database={currentDatabase} />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden">
                <Editor />
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {renderDashboard()}
          </div>
        )}
      </main>
    </div>
  );
};

export default WorkspacePage;
