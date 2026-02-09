import { ReactNode, useRef, useState } from 'react';
import { useNotionStore, type StoreBlock } from '@/stores/notionStore';
import { Button } from '@/components/ui/button';
import { GripVertical, Plus } from 'lucide-react';
import { BlockActionsMenu } from './BlockActionsMenu';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface BlockWrapperProps {
  blockId: string;
  index: number;
  children: ReactNode;
  className?: string;
}

export const BlockWrapper = ({ blockId, index, children, className }: BlockWrapperProps) => {
  const { updateBlock, reorderBlocks, getCurrentPage, pages } = useNotionStore();
  const blockRef = useRef<HTMLDivElement>(null);
  const [showActions, setShowActions] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const currentPage = getCurrentPage();
  const isLocked = currentPage?.locked || false;
  
  // Get current block data
  const currentBlock = currentPage?.blocks?.find(b => b.id === blockId) as StoreBlock | undefined;

  const handleDragStart = (e: React.DragEvent) => {
    if (isLocked) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    if (isLocked) return;
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isLocked) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    if (isLocked) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isLocked) return;
    e.preventDefault();
    setIsDragOver(false);
    
    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (draggedIndex !== index) {
      reorderBlocks(draggedIndex, index);
    }
  };

  const handleAddBlockClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    setMenuPosition({ 
      x: rect.right + 8, 
      y: rect.top 
    });
    setShowMenu(true);
  };

  const handleChangeType = (type: string) => {
    updateBlock(blockId, { type: type as any, content: currentBlock?.content || '' });
  };

  const handleChangeTextColor = (color: string) => {
    updateBlock(blockId, { textColor: color });
  };

  const handleChangeBackgroundColor = (color: string) => {
    updateBlock(blockId, { backgroundColor: color });
  };

  return (
    <div
      ref={blockRef}
      draggable={!isLocked}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative group transition-all",
        isDragging && "opacity-50",
        isDragOver && "border-t-2 border-blue-500",
        className
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isLocked && (
        <div className={cn(
          'absolute left-0 top-1 -translate-x-full flex items-center gap-1 pr-1 opacity-0 group-hover:opacity-100 transition-opacity',
          showActions && 'opacity-100'
        )}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 cursor-grab active:cursor-grabbing"
                data-testid={`drag-handle-${blockId}`}
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">Arraste para mover</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={handleAddBlockClick}
                data-testid={`add-block-after-${blockId}`}
              >
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">Adicionar bloco</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
      
      {children}

      {showMenu && !isLocked && (
        <BlockActionsMenu
          position={menuPosition}
          onChangeType={handleChangeType}
          onChangeTextColor={handleChangeTextColor}
          onChangeBackgroundColor={handleChangeBackgroundColor}
          onClose={() => setShowMenu(false)}
          currentType={currentBlock?.type}
          currentTextColor={currentBlock?.textColor}
          currentBackgroundColor={currentBlock?.backgroundColor}
        />
      )}
    </div>
  );
};
