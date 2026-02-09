import { useState } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import { cn } from '@/lib/utils';
import type { BaseBlock } from '@/types/notion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Video as VideoIcon, Link as LinkIcon } from 'lucide-react';

interface VideoBlockProps {
  block: BaseBlock;
}

export const VideoBlock = ({ block }: VideoBlockProps) => {
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

  const getEmbedUrl = (url: string) => {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    return url;
  };

  if (showUrlInput || !block.url) {
    return (
      <div className="relative group notion-hover rounded px-1 py-2">
        <div className="border-2 border-dashed border-border rounded-lg p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              <VideoIcon className="h-8 w-8 text-muted-foreground" />
              <LinkIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex gap-2 w-full max-w-md">
              <Input
                placeholder="Cole o URL do vídeo (YouTube, Vimeo)..."
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
        <div className="relative w-full pt-[56.25%] bg-muted rounded-lg overflow-hidden">
          <iframe
            src={getEmbedUrl(block.url)}
            className="absolute top-0 left-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <Input
          placeholder="Adicionar legenda..."
          value={block.caption || ''}
          onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
          className="text-sm text-muted-foreground border-0 px-0 focus-visible:ring-0"
          disabled={isLocked}
        />
      </div>
    </div>
  );
};
