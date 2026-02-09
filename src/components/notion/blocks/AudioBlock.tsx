import { Block } from '@/types/notion';
import { useNotionStore } from '@/stores/notionStore';
import { Music } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface AudioBlockProps {
  block: BaseBlock;
}

export const AudioBlock = ({ block }: AudioBlockProps) => {
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
      <div className="my-2 p-4 border rounded-lg" data-testid={`audio-edit-${block.id}`}>
        <div className="flex items-center gap-2 mb-2">
          <Music className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Adicionar áudio</span>
        </div>
        <Input
          type="url"
          placeholder="Cole o link do áudio aqui..."
          defaultValue={block.url || ''}
          onBlur={(e) => handleUrlChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleUrlChange(e.currentTarget.value);
            }
          }}
          autoFocus
          data-testid={`input-audio-url-${block.id}`}
          disabled={isLocked}
        />
      </div>
    );
  }

  return (
    <div className="my-2" data-testid={`audio-${block.id}`}>
      <div className="p-4 border rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Music className="h-4 w-4 text-muted-foreground" />
          {block.content && <span className="text-sm font-medium">{block.content}</span>}
        </div>
        <audio
          controls
          src={block.url}
          className="w-full"
          onClick={(e) => e.stopPropagation()}
          data-testid={`audio-player-${block.id}`}
        >
          Seu navegador não suporta o elemento de áudio.
        </audio>
        <button
          onClick={() => !isLocked && setIsEditing(true)}
          className="text-xs text-muted-foreground hover:underline mt-2"
          data-testid={`button-edit-audio-${block.id}`}
          disabled={isLocked}
        >
          Editar URL
        </button>
      </div>
    </div>
  );
};
