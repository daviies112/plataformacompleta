import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AddViewMenu } from './AddViewMenu';

interface DatabaseView {
  id: string;
  type: string;
  name: string;
}

interface DatabaseViewTabsProps {
  views: DatabaseView[];
  currentViewId?: string;
  onViewChange: (viewId: string) => void;
  onViewDelete: (viewId: string) => void;
  onViewAdd: (viewType: string) => void;
  locked?: boolean;
}

export const DatabaseViewTabs = ({
  views,
  currentViewId,
  onViewChange,
  onViewDelete,
  onViewAdd,
  locked = false,
}: DatabaseViewTabsProps) => {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const activeView = currentViewId || views[0]?.id;

  return (
    <div className="flex items-center gap-1 border-b border-[#e9e9e7] bg-white px-2">
      {views.map((view) => (
        <div
          key={view.id}
          className="relative group"
          onMouseEnter={() => setHoveredTab(view.id)}
          onMouseLeave={() => setHoveredTab(null)}
        >
          <button
            onClick={() => onViewChange(view.id)}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-all relative",
              "hover:bg-[#f7f6f5] rounded-t",
              activeView === view.id
                ? "text-gray-900"
                : "text-gray-600"
            )}
          >
            <span className="flex items-center gap-2">
              {view.name}
              {!locked && hoveredTab === view.id && views.length > 1 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDelete(view.id);
                  }}
                  className="ml-1 p-0.5 hover:bg-gray-200 rounded cursor-pointer inline-flex"
                >
                  <X className="w-3 h-3" />
                </span>
              )}
            </span>
            {activeView === view.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
            )}
          </button>
        </div>
      ))}

      {!locked && (
        <div className="relative">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="px-2 py-1.5 h-auto hover:bg-[#f7f6f5]"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Adicionar uma nova visualização</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {showAddMenu && (
            <AddViewMenu
              onAddView={(viewType) => {
                onViewAdd(viewType);
                setShowAddMenu(false);
              }}
              onClose={() => setShowAddMenu(false)}
            />
          )}
        </div>
      )}
    </div>
  );
};
