import { useRef, useState, useEffect } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import type { BaseBlock } from '@/types/notion';
import { Button } from '@/components/ui/button';
import { Link as LinkIcon, Trash2 } from 'lucide-react';

interface LinkToPageBlockProps {
  block: BaseBlock;
}

export const LinkToPageBlock = ({ block }: LinkToPageBlockProps) => {
  const { updateBlock, deleteBlock } = useNotionStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    if (contentRef.current && document.activeElement !== contentRef.current) {
      const content = Array.isArray(block.content) ? block.content.join('') : (block.content || '');
      contentRef.current.textContent = content;
    }
  }, [block.id, block.content]);

  const handleContentChange = () => {
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
      <div className="inline-flex items-center gap-2 py-1 px-2 border border-border rounded hover:bg-accent transition-colors">
        <LinkIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleContentChange}
          className="outline-none min-w-[100px] text-blue-600 dark:text-blue-400"
          data-placeholder="Link para página"
          data-testid={`link-page-${block.id}`}
        />
        {showActions && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
            onClick={() => deleteBlock(block.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};
