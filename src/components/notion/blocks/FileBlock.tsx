import { Block } from '@/types/notion';
import { useNotionStore } from '@/stores/notionStore';
import { FileText, Download, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface FileBlockProps {
  block: BaseBlock;
}

export const FileBlock = ({ block }: FileBlockProps) => {
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

  const getFileName = (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || url;
    } catch {
      return url;
    }
  };

  const getFileSize = () => {
    return 'Tamanho desconhecido';
  };

  if (isEditing || !block.url) {
    return (
      <div className="my-2 p-4 border rounded-lg" data-testid={`file-edit-${block.id}`}>
        <div className="flex items-center gap-2 mb-2">
          <Upload className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Adicionar arquivo</span>
        </div>
        <Input
          type="url"
          placeholder="Cole o link do arquivo aqui..."
          defaultValue={block.url || ''}
          onBlur={(e) => handleUrlChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleUrlChange(e.currentTarget.value);
            }
          }}
          autoFocus
          data-testid={`input-file-url-${block.id}`}
          disabled={isLocked}
        />
      </div>
    );
  }

  return (
    <div className="my-2" data-testid={`file-${block.id}`}>
      <div
        className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer group"
        onClick={() => !isLocked && setIsEditing(true)}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{block.content || getFileName(block.url)}</div>
              <div className="text-sm text-muted-foreground">{getFileSize()}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <a href={block.url} download target="_blank" rel="noopener noreferrer" data-testid={`button-download-${block.id}`}>
              <Download className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};
