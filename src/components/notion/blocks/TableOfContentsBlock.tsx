import { useState } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import type { BaseBlock } from '@/types/notion';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface TableOfContentsBlockProps {
  block: BaseBlock;
}

export const TableOfContentsBlock = ({ block }: TableOfContentsBlockProps) => {
  const { deleteBlock } = useNotionStore();
  const currentPage = useNotionStore(state => state.getCurrentPage());
  const [showActions, setShowActions] = useState(false);

  const headings = currentPage?.blocks.filter(b => 
    b.type === 'h1' || b.type === 'h2' || b.type === 'h3'
  ) || [];

  const getIndentClass = (type: string) => {
    switch (type) {
      case 'h1': return 'pl-0';
      case 'h2': return 'pl-4';
      case 'h3': return 'pl-8';
      default: return 'pl-0';
    }
  };

  return (
    <div
      className="relative group notion-hover rounded px-1"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="border border-border rounded-lg p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Sumário</h3>
          {showActions && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={() => deleteBlock(block.id)}
              data-testid={`delete-toc-${block.id}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        {headings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum título encontrado</p>
        ) : (
          <div className="space-y-1">
            {headings.map((heading) => (
              <div
                key={heading.id}
                className={`text-sm text-muted-foreground hover:text-foreground cursor-pointer ${getIndentClass(heading.type)}`}
                data-testid={`toc-item-${heading.id}`}
              >
                {heading.content || 'Sem título'}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
