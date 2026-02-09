import { useState } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import { cn } from '@/lib/utils';
import type { BaseBlock } from '@/types/notion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Upload, Link as LinkIcon } from 'lucide-react';

interface ImageBlockProps {
  block: BaseBlock;
}

export const ImageBlock = ({ block }: ImageBlockProps) => {
  const { updateBlock, deleteBlock } = useNotionStore();
  const { isLocked } = useNotionStore(state => ({ isLocked: state.getCurrentPage()?.locked }));
  const [showActions, setShowActions] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(!block.url);
  const [urlInput, setUrlInput] = useState(block.url || '');

  const handleUrlSubmit = () => {
    if (isLocked) return;
    if (urlInput) {
      updateBlock(block.id, { url: urlInput });
      setShowUrlInput(false);
    }
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    updateBlock(block.id, { caption: e.target.value });
  };

  if (showUrlInput || !block.url) {
    return (
      <div className="relative group notion-hover rounded px-1 py-2">
        <div className="border-2 border-dashed border-border rounded-lg p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <LinkIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex gap-2 w-full max-w-md">
              <Input
                placeholder="Cole o URL da imagem..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                disabled={isLocked}
              />
              <Button onClick={handleUrlSubmit} disabled={isLocked}>Adicionar</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative group notion-hover rounded px-1 py-2"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={cn(
        'absolute left-0 top-2 -translate-x-full flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity z-10',
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

      <div className="space-y-2">
        <img
          src={block.url}
          alt={block.caption || 'Imagem'}
          className="w-full rounded-lg"
          onError={(e) => {
            e.currentTarget.src = '/placeholder.svg';
          }}
        />
        <Input
          placeholder="Adicionar legenda..."
          value={block.caption || ''}
          onChange={handleCaptionChange}
          className="text-sm text-muted-foreground border-0 px-0 focus-visible:ring-0"
          disabled={isLocked}
        />
      </div>
    </div>
  );
};
