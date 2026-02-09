import { useRef, useState, useEffect } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import type { BaseBlock } from '@/types/notion';
import { Button } from '@/components/ui/button';
import { Copy, Trash2 } from 'lucide-react';

interface TemplateBlockProps {
  block: BaseBlock;
}

export const TemplateBlock = ({ block }: TemplateBlockProps) => {
  const { updateBlock, deleteBlock, addBlockAfter } = useNotionStore();
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

  const handleDuplicate = () => {
    addBlockAfter(block.id, 'text');
  };

  return (
    <div
      className="relative group notion-hover rounded px-1"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="border border-dashed border-border rounded-lg p-3 bg-muted/20">
        <div className="flex items-center gap-2 mb-2">
          <Copy className="h-4 w-4 text-muted-foreground" />
          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleContentChange}
            className="flex-1 outline-none font-medium"
            data-placeholder="Nome do Template"
            data-testid={`template-name-${block.id}`}
          />
          {showActions && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={() => deleteBlock(block.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleDuplicate}
          data-testid={`duplicate-template-${block.id}`}
        >
          <Copy className="h-3 w-3 mr-2" />
          Usar template
        </Button>
      </div>
    </div>
  );
};
