import { useRef, useState, useEffect } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import { cn } from '@/lib/utils';
import type { BaseBlock } from '@/types/notion';
import { Button } from '@/components/ui/button';
import { Trash2, Quote } from 'lucide-react';

interface QuoteBlockProps {
  block: BaseBlock;
}

export const QuoteBlock = ({ block }: QuoteBlockProps) => {
  const { updateBlock, deleteBlock } = useNotionStore();
  const { isLocked } = useNotionStore(state => ({ isLocked: state.getCurrentPage()?.locked }));
  const contentRef = useRef<HTMLDivElement>(null);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    if (contentRef.current && document.activeElement !== contentRef.current) {
      const content = Array.isArray(block.content) ? block.content.join('') : (block.content ?? '');
      contentRef.current.textContent = content;
    }
  }, [block.id, block.content]);

  const handleContentChange = () => {
    if (isLocked) return;
    if (contentRef.current) {
      const newContent = contentRef.current.textContent || '';
      updateBlock(block.id, { content: newContent });
    }
  };

  return (
    <div
      className="relative group notion-hover rounded px-1"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={cn(
        'absolute left-0 top-1 -translate-x-full flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity',
        showActions && 'opacity-100'
      )}>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => deleteBlock(block.id)}
          data-testid={`button-delete-quote-${block.id}`}
          disabled={isLocked}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex gap-3 border-l-4 border-primary pl-4 py-1">
        <div
          ref={contentRef}
          contentEditable={!isLocked}
          suppressContentEditableWarning
          onInput={handleContentChange}
          className="flex-1 outline-none min-h-[28px] text-muted-foreground italic"
          data-placeholder="Citação vazia"
          data-testid={`text-quote-content-${block.id}`}
        />
      </div>
    </div>
  );
};
