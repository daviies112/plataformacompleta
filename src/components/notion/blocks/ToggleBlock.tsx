import { useRef, useState, useEffect } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import { cn } from '@/lib/utils';
import type { Block as BlockType, BaseBlock } from '@/types/notion';
import { Button } from '@/components/ui/button';
import { Trash2, ChevronRight } from 'lucide-react';

interface ToggleBlockProps {
  block: BaseBlock;
}

export const ToggleBlock = ({ block }: ToggleBlockProps) => {
  const { updateBlock, deleteBlock } = useNotionStore();
  const { isLocked } = useNotionStore(state => ({ isLocked: state.getCurrentPage()?.locked }));
  const contentRef = useRef<HTMLDivElement>(null);
  const [showActions, setShowActions] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (contentRef.current && document.activeElement !== contentRef.current) {
      const content = Array.isArray(block.content) ? block.content.join('') : (block.content || '');
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
          disabled={isLocked}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex items-start gap-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="mt-1.5 hover:bg-muted rounded p-0.5 transition-colors"
        >
          <ChevronRight className={cn(
            'h-4 w-4 transition-transform',
            isOpen && 'rotate-90'
          )} />
        </button>
        <div
          ref={contentRef}
          contentEditable={!isLocked}
          suppressContentEditableWarning
          onInput={handleContentChange}
          className="flex-1 outline-none min-h-[28px] py-1"
          data-placeholder="Toggle"
        />
      </div>

      {isOpen && block.children && block.children.length > 0 && (
        <div className="ml-6 mt-1 space-y-1">
          {block.children.map((child) => (
            <div key={child.id} className="text-sm text-muted-foreground">
              {child.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
