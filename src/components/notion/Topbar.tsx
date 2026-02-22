import { useNotionStore } from '@/stores/notionStore';
import { Button } from '@/components/ui/button';
import { Star, Globe, Link2, Unlock, Lock } from 'lucide-react';
import { PageOptionsMenu } from './PageOptionsMenu';
import { DatabaseOptionsMenu } from './DatabaseOptionsMenu';
import { BoardOptionsMenu } from './BoardOptionsMenu';
import { toast } from 'sonner';

export const Topbar = () => {
  const {
    getCurrentPage,
    togglePageFavorite,
    currentPageId,
    currentDatabaseId,
    currentBoardId,
    getCurrentDatabase,
    getCurrentBoard,
    toggleDatabaseFavorite,
    toggleBoardFavorite,
    togglePublic
  } = useNotionStore();

  const currentPage = getCurrentPage();
  const currentDatabase = getCurrentDatabase();
  const currentBoard = getCurrentBoard();

  const showPageOptions = !!currentPageId;
  const showDatabaseOptions = !!currentDatabaseId;
  const showBoardOptions = !!currentBoardId;
  const hasOptions = showPageOptions || showDatabaseOptions || showBoardOptions;

  // Determine which item is active based on IDs (priority: board > database > page)
  const isFavorited = currentBoardId
    ? (currentBoard?.favorited || false)
    : currentDatabaseId
      ? (currentDatabase?.favorited || false)
      : (currentPage?.favorited || false);

  const handleToggleFavorite = () => {
    // Check IDs first to determine which item to toggle (priority: board > database > page)
    if (currentBoardId && currentBoard) {
      toggleBoardFavorite(currentBoard.id);
      toast.success(isFavorited ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
    } else if (currentDatabaseId && currentDatabase) {
      toggleDatabaseFavorite(currentDatabase.id);
      toast.success(isFavorited ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
    } else if (currentPageId && currentPage) {
      togglePageFavorite(currentPage.id);
      toast.success(isFavorited ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
    }
  };

  const activeItem = currentBoardId ? currentBoard : currentDatabaseId ? currentDatabase : currentPage;
  const activeType = currentBoardId ? 'board' : currentDatabaseId ? 'database' : ('page' as 'page' | 'board' | 'database');

  const handleTogglePublic = async () => {
    if (!activeItem) return;

    const isPublic = !activeItem.isPublic;
    const result = await togglePublic(activeItem.id, activeType, isPublic);

    if (result.success) {
      if (isPublic && result.url) {
        navigator.clipboard.writeText(result.url);
        toast.success('Link público ativado e copiado!');
      } else {
        toast.success('Link público desativado');
      }
    } else {
      toast.error('Erro ao alterar visibilidade pública');
    }
  };

  const copyPublicLink = () => {
    if (activeItem?.isPublic && activeItem.publicSlug) {
      const url = `${window.location.origin}/w/${activeItem.publicSlug}`;
      navigator.clipboard.writeText(url);
      toast.success('Link público copiado');
    }
  };

  return (
    <div className="flex items-center justify-end gap-2 px-4 sm:px-8 md:px-24 py-3 border-b border-border">
      <div className="flex items-center gap-1">
        {activeItem?.isPublic && (
          <Button
            variant="ghost"
            size="sm"
            onClick={copyPublicLink}
            className="text-xs h-8 text-primary hover:text-primary/80 flex gap-2 items-center"
          >
            <Link2 className="h-3 w-3" />
            Link Público
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleTogglePublic}
          className={`text-xs h-8 flex gap-2 items-center ${activeItem?.isPublic ? 'border-primary/50 bg-primary/5' : ''}`}
        >
          {activeItem?.isPublic ? (
            <>
              <Globe className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span className="hidden sm:inline">Público</span>
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Privado</span>
            </>
          )}
        </Button>
      </div>
      {hasOptions && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleFavorite}
            className="text-sm p-2"
          >
            <Star className={`h-4 w-4 ${isFavorited ? 'fill-primary text-primary drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]' : 'text-muted-foreground'}`} />
          </Button>
          {showBoardOptions && currentBoard ? (
            <BoardOptionsMenu board={currentBoard} />
          ) : showDatabaseOptions && currentDatabase ? (
            <DatabaseOptionsMenu database={currentDatabase} />
          ) : showPageOptions ? (
            <PageOptionsMenu />
          ) : null}
        </>
      )}
    </div>
  );
};
