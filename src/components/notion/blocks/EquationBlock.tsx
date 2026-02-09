import { Block } from '@/types/notion';
import { useNotionStore } from '@/stores/notionStore';
import { Calculator } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface EquationBlockProps {
  block: BaseBlock;
}

export const EquationBlock = ({ block }: EquationBlockProps) => {
  const { updateBlock } = useNotionStore();
  const { isLocked } = useNotionStore(state => ({ isLocked: state.getCurrentPage()?.locked }));
  const [isEditing, setIsEditing] = useState(!block.content);

  const handleEquationChange = (equation: string) => {
    if (isLocked) return;
    updateBlock(block.id, { content: equation });
    if (equation) {
      setIsEditing(false);
    }
  };

  if (isEditing || !block.content) {
    return (
      <div className="my-2 p-4 border rounded-lg" data-testid={`equation-edit-${block.id}`}>
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Adicionar equação</span>
        </div>
        <Input
          type="text"
          placeholder="Digite a equação LaTeX (ex: E = mc^2)"
          defaultValue={block.content || ''}
          onBlur={(e) => handleEquationChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleEquationChange(e.currentTarget.value);
            }
          }}
          autoFocus
          data-testid={`input-equation-${block.id}`}
          disabled={isLocked}
        />
        <div className="text-xs text-muted-foreground mt-1">
          Use sintaxe LaTeX: x^2, \frac{"{"}a{"}"}{"{"} b{"}"}, \sqrt{"{"}x{"}"}
        </div>
      </div>
    );
  }

  return (
    <div className="my-2" data-testid={`equation-${block.id}`}>
      <div
        className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
        onClick={() => !isLocked && setIsEditing(true)}
      >
        <div className="flex items-center gap-3">
          <Calculator className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <div className="font-mono text-lg">{block.content}</div>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Clique para editar a equação
        </div>
      </div>
    </div>
  );
};
