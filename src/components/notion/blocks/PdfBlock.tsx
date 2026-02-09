import { useState } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import type { BaseBlock } from '@/types/notion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Trash2 } from 'lucide-react';

interface PdfBlockProps {
  block: BaseBlock;
}

export const PdfBlock = ({ block }: PdfBlockProps) => {
  const { updateBlock, deleteBlock } = useNotionStore();
  const { isLocked } = useNotionStore(state => ({ isLocked: state.getCurrentPage()?.locked }));
  const [url, setUrl] = useState(block.url || '');
  const [showActions, setShowActions] = useState(false);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const newUrl = e.target.value;
    setUrl(newUrl);
    updateBlock(block.id, { url: newUrl });
  };

  return (
    <div
      className="relative group notion-hover rounded px-1"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted px-3 py-2 flex items-center gap-2">
          <FileText className="h-4 w-4 text-red-500" />
          <Input
            type="url"
            placeholder="Cole a URL do PDF"
            value={url}
            onChange={handleUrlChange}
            className="flex-1 h-8 text-sm border-0 bg-transparent focus-visible:ring-0"
            data-testid={`pdf-url-${block.id}`}
            disabled={isLocked}
          />
          {showActions && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={() => deleteBlock(block.id)}
              disabled={isLocked}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        {url ? (
          <div className="aspect-[8.5/11] bg-muted/50">
            <iframe
              src={url}
              className="w-full h-full"
              title="PDF Viewer"
              sandbox="allow-scripts allow-same-origin"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="aspect-[8.5/11] bg-muted/50 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">Adicione uma URL do PDF para visualizar</p>
          </div>
        )}
      </div>
    </div>
  );
};
