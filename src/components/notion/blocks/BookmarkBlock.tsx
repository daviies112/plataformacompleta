import { Block } from '@/types/notion';
import { useNotionStore } from '@/stores/notionStore';
import { ExternalLink, Link as LinkIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface BookmarkBlockProps {
  block: BaseBlock;
}

export const BookmarkBlock = ({ block }: BookmarkBlockProps) => {
  const { updateBlock } = useNotionStore();
  const { isLocked } = useNotionStore(state => ({ isLocked: state.getCurrentPage()?.locked }));
  const [isEditing, setIsEditing] = useState(!block.url);

  const handleUrlChange = (url: string) => {
    if (isLocked) return;
    updateBlock(block.id, { url });
    if (url) {
      setIsEditing(false);
    }
  };

  if (isEditing || !block.url) {
    return (
      <div className="my-2 p-4 border rounded-lg" data-testid={`bookmark-edit-${block.id}`}>
        <div className="flex items-center gap-2 mb-2">
          <LinkIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Adicionar bookmark</span>
        </div>
        <Input
          type="url"
          placeholder="Cole o link aqui..."
          defaultValue={block.url || ''}
          onBlur={(e) => handleUrlChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleUrlChange(e.currentTarget.value);
            }
          }}
          autoFocus
          data-testid={`input-bookmark-url-${block.id}`}
          disabled={isLocked}
        />
      </div>
    );
  }

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="my-2" data-testid={`bookmark-${block.id}`}>
      <a
        href={block.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-4 border rounded-lg hover:bg-accent transition-colors group"
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey) return;
          e.preventDefault();
          !isLocked && setIsEditing(true);
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{block.content || block.url}</div>
            <div className="text-sm text-muted-foreground truncate mt-1">
              {getDomain(block.url)}
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </div>
      </a>
    </div>
  );
};
