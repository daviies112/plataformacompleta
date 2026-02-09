import { useState } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import type { BaseBlock } from '@/types/notion';
import { Button } from '@/components/ui/button';
import { ChevronRight, Home, Trash2 } from 'lucide-react';

interface BreadcrumbBlockProps {
  block: BaseBlock;
}

export const BreadcrumbBlock = ({ block }: BreadcrumbBlockProps) => {
  const { deleteBlock, pages, currentPageId } = useNotionStore();
  const [showActions, setShowActions] = useState(false);

  const currentPage = pages.find(p => p.id === currentPageId);
  const breadcrumbs = [];
  
  if (currentPage) {
    let page = currentPage;
    breadcrumbs.unshift(page);
    
    while (page.parentId) {
      const parent = pages.find(p => p.id === page.parentId);
      if (parent) {
        breadcrumbs.unshift(parent);
        page = parent;
      } else {
        break;
      }
    }
  }

  return (
    <div
      className="relative group notion-hover rounded px-1"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center gap-1 py-2 text-sm text-muted-foreground">
        <Home className="h-4 w-4" />
        {breadcrumbs.map((page, index) => (
          <div key={page.id} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            <span className={index === breadcrumbs.length - 1 ? 'text-foreground font-medium' : ''}>
              {page.title}
            </span>
          </div>
        ))}
        {showActions && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 ml-2 opacity-0 group-hover:opacity-100"
            onClick={() => deleteBlock(block.id)}
            data-testid={`delete-breadcrumb-${block.id}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};
