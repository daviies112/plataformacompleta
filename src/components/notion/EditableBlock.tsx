import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Block } from '@/types/notion';
import { useNotionStore } from '@/stores/notionStore';
import { cn } from '@/lib/utils';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EditableBlockProps {
  block: Block;
  onUpdate?: (content: string) => void;
  onDelete?: () => void;
  onAddAfter?: (type: string) => void;
  children?: React.ReactNode;
}

export const EditableBlock = ({ block, onUpdate, onDelete, onAddAfter, children }: EditableBlockProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(block.properties.title?.[0]?.text?.content || '');
  const [showMenu, setShowMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = content.length;
    }
  }, [isEditing]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onUpdate?.(content);
      setIsEditing(false);
      if (onAddAfter) {
        onAddAfter('text');
      }
    } else if (e.key === 'Escape') {
      setContent(block.properties.title?.[0]?.text?.content || '');
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    onUpdate?.(content);
    setIsEditing(false);
  };

  const blockTypes = [
    { value: 'text', label: 'Texto' },
    { value: 'heading_1', label: 'Título 1' },
    { value: 'heading_2', label: 'Título 2' },
    { value: 'heading_3', label: 'Título 3' },
    { value: 'bulleted_list', label: 'Lista com marcadores' },
    { value: 'numbered_list', label: 'Lista numerada' },
    { value: 'todo', label: 'Lista de tarefas' },
    { value: 'quote', label: 'Citação' },
    { value: 'divider', label: 'Divisor' },
    { value: 'code', label: 'Código' },
  ];

  if (block.type === 'divider') {
    return (
      <div 
        className="group relative hover:bg-muted/30 rounded px-2 py-1"
        onMouseEnter={() => setShowMenu(true)}
        onMouseLeave={() => setShowMenu(false)}
      >
        {showMenu && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-12 flex gap-1 opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {blockTypes.map(type => (
                  <DropdownMenuItem key={type.value} onClick={() => onAddAfter?.(type.value)}>
                    {type.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        )}
        <hr className="my-4 border-border" />
      </div>
    );
  }

  if (block.type === 'todo') {
    return (
      <div 
        className="group relative hover:bg-muted/30 rounded px-2 py-1"
        onMouseEnter={() => setShowMenu(true)}
        onMouseLeave={() => setShowMenu(false)}
      >
        {showMenu && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-12 flex gap-1 opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {blockTypes.map(type => (
                  <DropdownMenuItem key={type.value} onClick={() => onAddAfter?.(type.value)}>
                    {type.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        )}
        <div className="flex items-start gap-2 my-1">
          <input 
            type="checkbox" 
            checked={block.properties.checked || false}
            onChange={(e) => {
              onUpdate?.(content);
            }}
            className="mt-1"
          />
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="flex-1 bg-transparent border-none outline-none resize-none"
              rows={1}
            />
          ) : (
            <span 
              onClick={() => setIsEditing(true)}
              className={cn(
                "cursor-text flex-1",
                block.properties.checked && 'line-through text-muted-foreground'
              )}
            >
              {content || 'Clique para editar...'}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={divRef}
      className="group relative hover:bg-muted/30 rounded px-2 py-1"
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      {showMenu && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-12 flex gap-1 opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {blockTypes.map(type => (
                <DropdownMenuItem key={type.value} onClick={() => onAddAfter?.(type.value)}>
                  {type.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      )}
      {children || (
        isEditing ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full bg-transparent border-none outline-none resize-none font-inherit"
            rows={1}
            style={{ 
              fontSize: block.type === 'heading_1' ? '2rem' : 
                       block.type === 'heading_2' ? '1.5rem' : 
                       block.type === 'heading_3' ? '1.25rem' : '1rem'
            }}
          />
        ) : (
          <div 
            onClick={() => setIsEditing(true)}
            className="cursor-text min-h-[1.5rem]"
          >
            {content || 'Clique para editar...'}
          </div>
        )
      )}
    </div>
  );
};
