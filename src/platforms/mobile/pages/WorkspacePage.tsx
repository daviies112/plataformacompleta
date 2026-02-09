import { useEffect, useState } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import { Sidebar } from '@/components/notion/Sidebar';
import { Editor } from '@/components/notion/Editor';
import { Topbar } from '@/components/notion/Topbar';
import { DatabaseView } from '@/components/notion/DatabaseView';
import { FiltersProvider } from '@/contexts/FiltersContext';
import { Board } from '@/components/kanban/Board';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, FileText, Database, LayoutGrid } from 'lucide-react';
import { GlassCard } from '@/components/mobile/GlassCard';

/**
 * Workspace Mobile Premium - Design otimizado para touch 2025
 * Baseado em apps como Notion, Linear, Coda
 * - Header compacto com glassmorphism
 * - Navegação touch-first com Sheet lateral
 * - Padding otimizado para mobile (px-4)
 * - Micro-interações e haptic feedback
 * - Visual hierarchy clara
 */
const WorkspacePage = () => {
  const { 
    pages, 
    addPage, 
    currentPageId, 
    currentDatabaseId, 
    currentBoardId, 
    getCurrentPage,
    getCurrentDatabase, 
    getCurrentBoard, 
    updateBoard 
  } = useNotionStore();
  
  const currentPage = getCurrentPage();
  const currentDatabase = getCurrentDatabase();
  const currentBoard = getCurrentBoard();
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (pages.length === 0) {
      addPage();
    }
  }, [pages.length, addPage]);

  const hasSelection = currentPageId || currentDatabaseId || currentBoardId;

  // Haptic feedback ao abrir sidebar
  const handleSidebarToggle = (open: boolean) => {
    if (open && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
    setSidebarOpen(open);
  };

  // Show loading only if we have pages but no selection yet
  if (pages.length > 0 && !hasSelection) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <GlassCard className="p-8 text-center">
          <div className="animate-pulse">
            <div className="h-3 w-24 bg-primary/20 rounded mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Carregando workspace...</p>
          </div>
        </GlassCard>
      </div>
    );
  }
  
  // If no pages yet, useEffect will add one and trigger re-render
  if (pages.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <GlassCard className="p-8 text-center">
          <div className="animate-pulse">
            <div className="h-3 w-24 bg-primary/20 rounded mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Inicializando...</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Determinar qual tipo de conteúdo está sendo exibido + título dinâmico
  const getContentInfo = () => {
    if (currentBoardId && currentBoard) {
      return { 
        icon: LayoutGrid, 
        label: 'Quadro', 
        color: 'text-purple-400',
        title: currentBoard.title || 'Quadro sem título',
        gradient: 'from-purple-500/20 to-purple-500/5'
      };
    }
    if (currentDatabaseId && currentDatabase) {
      return { 
        icon: Database, 
        label: 'Database', 
        color: 'text-blue-400',
        title: currentDatabase.title || 'Database sem título',
        gradient: 'from-blue-500/20 to-blue-500/5'
      };
    }
    return { 
      icon: FileText, 
      label: 'Página', 
      color: 'text-primary',
      title: currentPage?.title || 'Nova Página',
      gradient: 'from-primary/20 to-primary/5'
    };
  };

  const contentInfo = getContentInfo();

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      {/* Header Mobile Premium - Glassmorphism & Bold Typography */}
      <div className="sticky top-0 z-10 border-b border-border/30 bg-background/90 backdrop-blur-2xl backdrop-saturate-180 shadow-lg">
        <div className="px-5 py-4">
          <div className="flex items-center gap-4">
            {/* Menu Burger Premium com Glassmorphism */}
            <Sheet open={sidebarOpen} onOpenChange={handleSidebarToggle}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="min-h-[48px] min-w-[48px] touch-manipulation active:scale-90 transition-all duration-200 hover:scale-105 hover:bg-primary/10 shrink-0 rounded-xl"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 bg-background/95 backdrop-blur-2xl">
                <Sidebar />
              </SheetContent>
            </Sheet>

            {/* Título Dinâmico Premium - Inspirado em Notion/Linear */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${contentInfo.gradient} backdrop-blur-sm border border-border/20 shrink-0 shadow-sm`}>
                  <contentInfo.icon className={`h-5 w-5 ${contentInfo.color}`} />
                </div>
                <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent truncate">
                  {contentInfo.title}
                </h1>
              </div>
              <p className="text-xs font-semibold text-muted-foreground/80 truncate pl-1 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${contentInfo.color} animate-pulse`}></span>
                {contentInfo.label}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content Area - Mobile Optimized */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        
        {/* Main Content */}
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
          <div className="flex-1 overflow-y-auto" data-tour="database-views">
            <div className="px-4 sm:px-6 md:px-8 py-4">
              <DatabaseView database={currentDatabase} />
            </div>
          </div>
        ) : (
          <div data-tour="workspace-editor" className="flex-1 overflow-hidden">
            <Editor />
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspacePage;
