import { useRef, useState, useEffect } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import { cn } from '@/lib/utils';
import type { BaseBlock } from '@/types/notion';
import { Button } from '@/components/ui/button';
import { Trash2, Lightbulb } from 'lucide-react';

interface CalloutBlockProps {
  block: BaseBlock;
}

export const CalloutBlock = ({ block }: CalloutBlockProps) => {
  const { updateBlock, deleteBlock } = useNotionStore();
  const { isLocked } = useNotionStore(state => ({ isLocked: state.getCurrentPage()?.locked }));
  const contentRef = useRef<HTMLDivElement>(null);
  const [showActions, setShowActions] = useState(false);

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

  const handleIconChange = (icon: string) => {
    if (isLocked) return;
    updateBlock(block.id, { icon });
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

      <div className={cn(
        'flex gap-3 p-4 rounded-lg',
        block.color === 'blue' && 'bg-blue-50 dark:bg-blue-950/30',
        block.color === 'yellow' && 'bg-yellow-50 dark:bg-yellow-950/30',
        block.color === 'red' && 'bg-red-50 dark:bg-red-950/30',
        block.color === 'green' && 'bg-green-50 dark:bg-green-950/30',
        !block.color && 'bg-muted/50'
      )}>
        <button
          onClick={() => handleIconChange(block.icon === '💡' ? '📌' : '💡')}
          className="text-2xl hover:scale-110 transition-transform flex-shrink-0"
          disabled={isLocked}
        >
          {block.icon || '💡'}
        </button>
        <div
          ref={contentRef}
          contentEditable={!isLocked}
          suppressContentEditableWarning
          onInput={handleContentChange}
          className="flex-1 outline-none min-h-[28px]"
          data-placeholder="Callout"
        />
      </div>
    </div>
  );
};
