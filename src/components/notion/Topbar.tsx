import { useNotionStore } from '@/stores/notionStore';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
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
    toggleDatabaseFavorite,
    getCurrentBoard,
    toggleBoardFavorite
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

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para compartilhar');
  };

  return (
    <div className="flex items-center justify-end gap-2 px-4 sm:px-8 md:px-24 py-3 border-b border-border">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleShare}
        className="text-sm"
      >
        Compartilhar
      </Button>
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
