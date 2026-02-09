import { useRef, useState, useEffect } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import type { BaseBlock } from '@/types/notion';
import { Button } from '@/components/ui/button';
import { Link2, Trash2 } from 'lucide-react';

interface SyncedBlockProps {
  block: BaseBlock;
}

export const SyncedBlock = ({ block }: SyncedBlockProps) => {
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
      <div className="border border-blue-300 dark:border-blue-700 rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20">
        <div className="flex items-center gap-2 mb-2 text-xs text-blue-600 dark:text-blue-400">
          <Link2 className="h-3 w-3" />
          <span>Bloco Sincronizado</span>
          {showActions && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 ml-auto opacity-0 group-hover:opacity-100"
              onClick={() => deleteBlock(block.id)}
              data-testid={`delete-synced-${block.id}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleContentChange}
          className="outline-none min-h-[28px]"
          data-placeholder="Conteúdo sincronizado"
          data-testid={`synced-content-${block.id}`}
        />
      </div>
    </div>
  );
};
