import { useRef, useState, useEffect } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import { cn } from '@/lib/utils';
import type { BaseBlock } from '@/types/notion';
import { Button } from '@/components/ui/button';
import { Trash2, Copy, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CodeBlockAdvancedProps {
  block: BaseBlock;
}

const languages = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#',
  'ruby', 'go', 'rust', 'php', 'swift', 'kotlin',
  'html', 'css', 'scss', 'sql', 'bash', 'powershell',
  'json', 'yaml', 'xml', 'markdown', 'plain text'
];

export const CodeBlockAdvanced = ({ block }: CodeBlockAdvancedProps) => {
  const { updateBlock, deleteBlock } = useNotionStore();
  const { isLocked } = useNotionStore(state => ({ isLocked: state.getCurrentPage()?.locked }));
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (contentRef.current && block.content) {
      contentRef.current.value = block.content;
    }
  }, [block.id]);

  const handleContentChange = () => {
    if (isLocked) return;
    if (contentRef.current) {
      const newContent = contentRef.current.value || '';
      updateBlock(block.id, { content: newContent });
    }
  };

  const handleCopy = () => {
    if (block.content) {
      navigator.clipboard.writeText(block.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

      <div className="bg-muted rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <Select
            value={block.language || 'plain text'}
            onValueChange={(value) => updateBlock(block.id, { language: value })}
            disabled={isLocked}
          >
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang} value={lang} className="text-xs">
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copiar
              </>
            )}
          </Button>
        </div>

        <textarea
          ref={contentRef}
          onChange={handleContentChange}
          className="w-full min-h-[120px] p-4 font-mono text-sm bg-transparent resize-none outline-none"
          placeholder="Cole seu código aqui..."
          disabled={isLocked}
        />
      </div>
    </div>
  );
};
