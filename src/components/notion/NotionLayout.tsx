import { useEffect, useState } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import { Sidebar } from './Sidebar';
import { Editor } from './Editor';
import { Topbar } from './Topbar';
import { DatabaseView } from './DatabaseView';
import { FiltersProvider } from '@/contexts/FiltersContext';
import { Board } from '@/components/kanban/Board';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

export const NotionLayout = () => {
  const { pages, addPage, currentPageId, currentDatabaseId, currentBoardId, getCurrentDatabase, getCurrentBoard, updateBoard } = useNotionStore();
  const currentDatabase = getCurrentDatabase();
  const currentBoard = getCurrentBoard();
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (pages.length === 0) {
      addPage();
    }
  }, [pages.length, addPage]);

  const hasSelection = currentPageId || currentDatabaseId || currentBoardId;

  // Show loading only if we have pages but no selection yet (edge case)
  if (pages.length > 0 && !hasSelection) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }
  
  // If no pages yet, useEffect will add one and trigger re-render
  if (pages.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Iniciando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] w-full">
      {/* Header - largura total */}
      <div className="border-b border-border bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-4">
            {isMobile && (
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="min-h-[44px] min-w-[44px] touch-manipulation active:scale-95 shrink-0"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0">
                  <Sidebar />
                </SheetContent>
              </Sheet>
            )}
            <div className="flex-1">
              <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight gradient-text">
                Workspace
              </h1>
              <p className="text-sm sm:text-xl text-muted-foreground/80 mt-1 sm:mt-2">
                Organize suas ideias, projetos e conhecimento em páginas, databases e quadros personalizáveis
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {!isMobile && (
          <div data-tour="workspace-sidebar">
            <Sidebar />
          </div>
        )}
        <div className="flex flex-1 flex-col">
          <Topbar />
          {currentBoardId && currentBoard ? (
          <FiltersProvider>
            <Board 
              board={currentBoard} 
              onUpdateBoard={(updatedBoard) => updateBoard(currentBoard.id, updatedBoard)}
              filterSidebarOpen={filterSidebarOpen}
              onFilterSidebarChange={setFilterSidebarOpen}
            />
          </FiltersProvider>
        ) : currentDatabaseId && currentDatabase ? (
          <div className="flex-1 overflow-y-auto" data-tour="database-views">
            <div className="max-w-full mx-auto px-8 py-6">
              <DatabaseView database={currentDatabase} />
            </div>
          </div>
        ) : (
          <div data-tour="workspace-editor">
            <Editor />
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
