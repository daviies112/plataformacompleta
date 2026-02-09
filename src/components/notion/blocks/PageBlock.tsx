import { useRef, useState, useEffect } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import type { BaseBlock } from '@/types/notion';
import { Button } from '@/components/ui/button';
import { FileText, Trash2 } from 'lucide-react';

interface PageBlockProps {
  block: BaseBlock;
}

export const PageBlock = ({ block }: PageBlockProps) => {
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
      <div className="flex items-center gap-2 py-2 px-3 border border-border rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleContentChange}
          className="flex-1 outline-none min-h-[28px] font-medium"
          data-placeholder="Nova Página"
          data-testid={`page-block-${block.id}`}
        />
        {showActions && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            onClick={() => deleteBlock(block.id)}
            data-testid={`delete-page-${block.id}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};
