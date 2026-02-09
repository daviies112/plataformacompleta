import { useEffect, useRef } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import { Block } from './Block';
import { cn } from '@/lib/utils';
import './editor-premium.css';

export const Editor = () => {
  const { getCurrentPage, updatePage, addBlock } = useNotionStore();
  const currentPage = getCurrentPage();
  const titleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (titleRef.current && currentPage && document.activeElement !== titleRef.current) {
      titleRef.current.textContent = currentPage.title;
    }
  }, [currentPage?.id, currentPage?.title]);

  useEffect(() => {
    if (currentPage && (!currentPage.blocks || currentPage.blocks.length === 0)) {
      addBlock('text');
    }
  }, [currentPage?.id]);

  if (!currentPage) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Selecione uma página</p>
      </div>
    );
  }

  const handleTitleChange = () => {
    if (titleRef.current) {
      const newTitle = titleRef.current.textContent || 'Sem título';
      updatePage(currentPage.id, { title: newTitle });
    }
  };

  const getFontClass = () => {
    switch (currentPage.fontStyle) {
      case 'serif':
        return 'font-serif';
      case 'mono':
        return 'font-mono';
      default:
        return 'font-sans';
    }
  };

  const getTextSize = () => {
    return currentPage.smallText ? 'text-sm' : 'text-base';
  };

  const getMaxWidth = () => {
    return currentPage.fullWidth ? 'max-w-full' : 'max-w-4xl';
  };

  const isLocked = currentPage.locked || false;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Cover Image */}
      {currentPage.cover && (() => {
        const isGradient = currentPage.cover.startsWith('linear-gradient') || 
                          currentPage.cover.startsWith('#') || 
                          currentPage.cover.startsWith('rgb');
        
        if (isGradient) {
          return (
            <div 
              className="relative w-full h-60 group"
              style={{ background: currentPage.cover }}
            />
          );
        } else {
          return (
            <div className="relative w-full h-60 group">
              <img 
                src={currentPage.cover} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
            </div>
          );
        }
      })()}

      <div className={cn(getMaxWidth(), "mx-auto px-4 sm:px-8 md:px-24 py-6 sm:py-12", getFontClass(), getTextSize())}>


        {/* Title - Premium Typography com hover effects (Notion/Linear style) */}
        <div className="mb-12 group">
          <div
            ref={titleRef}
            contentEditable={!isLocked}
            suppressContentEditableWarning
            onBlur={handleTitleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                (e.target as HTMLDivElement).blur();
              }
            }}
            className="text-6xl md:text-7xl lg:text-3xl font-black tracking-tight outline-none bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent transition-all duration-300 hover:from-foreground hover:to-foreground focus:from-foreground focus:to-foreground cursor-text group-hover:scale-[1.01] origin-left"
            data-placeholder="Nova Página"
            style={{
              wordBreak: 'break-word',
              minHeight: '1.2em'
            }}
            aria-label="Título da página"
          />
          {!isLocked && (
            <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <p className="text-xs font-medium text-muted-foreground/60 flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted/50 border border-border/30 rounded">Enter</kbd>
                <span>para finalizar</span>
              </p>
            </div>
          )}
        </div>

        {isLocked && (
          <div className="mb-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
            🔒 Esta página está bloqueada. Desative o bloqueio no menu para editar.
          </div>
        )}

        {/* Blocks */}
        <div className="space-y-1">
          {(currentPage.blocks || []).map((block, index) => (
            <Block key={block.id} block={block} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
};
