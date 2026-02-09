import { useState } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import { cn } from '@/lib/utils';
import type { BaseBlock } from '@/types/notion';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface DividerBlockProps {
  block: BaseBlock;
}

export const DividerBlock = ({ block }: DividerBlockProps) => {
  const { deleteBlock } = useNotionStore();
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="relative group notion-hover rounded px-1 py-2"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={cn(
        'absolute left-0 top-2 -translate-x-full flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity',
        showActions && 'opacity-100'
      )}>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => deleteBlock(block.id)}
          data-testid={`button-delete-divider-${block.id}`}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <hr className="border-t border-border my-2" data-testid={`divider-${block.id}`} />
    </div>
  );
};
