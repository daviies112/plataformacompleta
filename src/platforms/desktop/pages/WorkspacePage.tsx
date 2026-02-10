import { useEffect, useState } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import { Sidebar } from '@/components/notion/Sidebar';
import { Editor } from '@/components/notion/Editor';
import { Topbar } from '@/components/notion/Topbar';
import { DatabaseView } from '@/components/notion/DatabaseView';
import { FiltersProvider } from '@/contexts/FiltersContext';
import { Board } from '@/components/kanban/Board';
import { FileText, Database, LayoutGrid, Sparkles } from 'lucide-react';
import { PremiumCard } from '@/platforms/shared/premium';
import { premiumTheme } from '@/platforms/shared/premium/theme';
import { cn } from '@/lib/utils';

/**
 * Workspace Desktop Premium - Design profissional para telas grandes
 * Baseado em apps como Notion, Linear, Coda
 * - Layout desktop otimizado com sidebar sempre visível
 * - Header com glassmorphism e tipografia bold
 * - Visual hierarchy clara com ícones temáticos
 * - Transições suaves entre estados
 * - Premium components: PremiumCard com glassmorphism
 * - Golden gradients e shadows elevadas
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
    updateBoard,
    reloadFromSupabase 
  } = useNotionStore();
  
  const currentPage = getCurrentPage();
  const currentDatabase = getCurrentDatabase();
  const currentBoard = getCurrentBoard();
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // PROTEÇÃO EXTRA: SEMPRE carrega do Supabase quando abre o workspace
  useEffect(() => {
    const loadFromSupabase = async () => {
      console.log('🔒 [WorkspacePage] GARANTINDO carregamento do Supabase...');
      try {
        await reloadFromSupabase();
        console.log('✅ [WorkspacePage] Dados carregados do Supabase com sucesso');
      } catch (error) {
        console.error('❌ [WorkspacePage] Erro ao carregar do Supabase:', error);
      } finally {
        setIsInitialLoad(false);
      }
    };
    
    if (isInitialLoad) {
      loadFromSupabase();
    }
  }, [isInitialLoad, reloadFromSupabase]);

  // Debug: Log quando o componente renderizar
  useEffect(() => {
    console.log('📊 [WorkspacePage] Estado atual:', {
      totalPages: pages.length,
      currentPageId,
      currentDatabaseId,
      currentBoardId,
      pages: pages.map(p => ({ id: p.id, title: p.title }))
    });
  }, [pages, currentPageId, currentDatabaseId, currentBoardId]);

  useEffect(() => {
    console.log('🔍 [WorkspacePage] Verificando se precisa criar página inicial...');
    if (pages.length === 0) {
      console.log('⚠️ [WorkspacePage] Nenhuma página encontrada - criando página inicial');
      addPage();
    } else {
      console.log(`✅ [WorkspacePage] ${pages.length} páginas já existem - não criando nova`);
    }
  }, [pages.length, addPage]);

  const hasSelection = currentPageId || currentDatabaseId || currentBoardId;

  // Show loading only if we have pages but no selection yet
  if (pages.length > 0 && !hasSelection) {
    return (
      <div 
        className="flex min-h-[calc(100vh-5rem)] items-center justify-center"
        data-testid="workspace-loading"
      >
        <PremiumCard variant="elevated" padding="xl" className="text-center max-w-md">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className={cn(
                "p-4 rounded-2xl",
                premiumTheme.glass.background.elevated,
                premiumTheme.shadows.primary,
                "animate-pulse"
              )}>
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-40 bg-gradient-to-r from-primary/30 to-primary/10 rounded-full mx-auto animate-pulse"></div>
              <p className="text-sm font-medium text-muted-foreground">
                Carregando workspace premium...
              </p>
            </div>
          </div>
        </PremiumCard>
      </div>
    );
  }
  
  // If no pages yet, useEffect will add one and trigger re-render
  if (pages.length === 0) {
    return (
      <div 
        className="flex min-h-[calc(100vh-5rem)] items-center justify-center"
        data-testid="workspace-initializing"
      >
        <PremiumCard variant="elevated" padding="xl" className="text-center max-w-md">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className={cn(
                "p-4 rounded-2xl",
                premiumTheme.glass.background.elevated,
                premiumTheme.shadows.primary,
                "animate-pulse"
              )}>
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-32 bg-gradient-to-r from-primary/30 to-primary/10 rounded-full mx-auto animate-pulse"></div>
              <p className="text-sm font-medium text-muted-foreground">
                Inicializando workspace...
              </p>
            </div>
          </div>
        </PremiumCard>
      </div>
    );
  }

  // Determinar qual tipo de conteúdo está sendo exibido
  const getContentInfo = () => {
    if (currentBoardId && currentBoard) {
      return { 
        icon: LayoutGrid, 
        label: 'Quadro Kanban', 
        color: 'text-purple-400',
        bg: 'bg-gradient-to-br from-purple-500/20 to-purple-500/5',
        border: 'border-purple-500/30',
        shadow: 'shadow-[0_8px_32px_rgba(168,85,247,0.15)]',
        title: currentBoard.title || 'Quadro sem título',
        gradient: 'from-purple-500/20 via-purple-500/10 to-transparent'
      };
    }
    if (currentDatabaseId && currentDatabase) {
      return { 
        icon: Database, 
        label: 'Database', 
        color: 'text-blue-400',
        bg: 'bg-gradient-to-br from-blue-500/20 to-blue-500/5',
        border: 'border-blue-500/30',
        shadow: 'shadow-[0_8px_32px_rgba(59,130,246,0.15)]',
        title: currentDatabase.title || 'Database sem título',
        gradient: 'from-blue-500/20 via-blue-500/10 to-transparent'
      };
    }
    return { 
      icon: FileText, 
      label: 'Página', 
      color: 'text-primary',
      bg: premiumTheme.gradients.primary,
      border: 'border-primary/30',
      shadow: premiumTheme.shadows.primary,
      title: currentPage?.title || 'Nova Página',
      gradient: 'from-primary/20 via-primary/10 to-transparent'
    };
  };

  const contentInfo = getContentInfo();

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] w-full" data-testid="workspace-page">
      {/* Header Premium - Desktop Optimized with Glassmorphism */}
      <div className={cn(
        "border-b",
        premiumTheme.glass.border.subtle,
        "bg-gradient-to-r from-background via-background/98 to-background",
        premiumTheme.glass.base,
        premiumTheme.shadows.md,
        "sticky top-0 z-20"
      )}>
        <div className="container mx-auto px-8 lg:px-10 pt-0 pb-4 sm:pb-6 lg:pb-8">
          <div className="flex items-center gap-5">
            <div className="flex-1">
              <div className="flex items-start gap-4 lg:gap-3">
                <div className="p-3 lg:p-2.5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                  <FileText className="h-8 w-8 lg:h-6 lg:w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-4xl lg:text-2xl font-black text-foreground tracking-tight bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
                    Workspace
                  </h1>
                  <p className="text-xl lg:text-sm text-muted-foreground/80 mt-2 lg:mt-1">
                    Organize suas ideias, projetos e conhecimento
                  </p>
                </div>
              </div>
            </div>

            {/* Premium Status Indicator */}
            <div className={cn(
              "px-4 py-2 rounded-xl border",
              premiumTheme.glass.background.subtle,
              premiumTheme.glass.border.subtle,
              premiumTheme.glass.base,
              premiumTheme.shadows.sm,
              "flex items-center gap-2"
            )}>
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-xs font-bold text-primary tracking-wide">
                PREMIUM
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <div 
          data-tour="workspace-sidebar" 
          className={cn(
            "border-r",
            premiumTheme.glass.border.subtle,
            premiumTheme.glass.background.subtle,
            premiumTheme.glass.base
          )}
        >
          <Sidebar />
        </div>
        
        <div className="flex flex-1 flex-col overflow-hidden bg-gradient-to-br from-background via-background to-background/95">
          <Topbar />
          
          {/* Main Content */}
          {currentBoardId && currentBoard ? (
            <FiltersProvider>
              <div className="flex-1 overflow-hidden" data-testid="workspace-board-view">
                <Board 
                  board={currentBoard} 
                  onUpdateBoard={(updatedBoard) => updateBoard(currentBoard.id, updatedBoard)}
                  filterSidebarOpen={filterSidebarOpen}
                  onFilterSidebarChange={setFilterSidebarOpen}
                />
              </div>
            </FiltersProvider>
          ) : currentDatabaseId && currentDatabase ? (
            <div 
              className="flex-1 overflow-y-auto" 
              data-tour="database-views"
              data-testid="workspace-database-view"
            >
              <div className="max-w-full mx-auto px-10 py-8">
                <DatabaseView database={currentDatabase} />
              </div>
            </div>
          ) : (
            <div 
              data-tour="workspace-editor" 
              className="flex-1 overflow-hidden"
              data-testid="workspace-editor-view"
            >
              <Editor />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspacePage;
