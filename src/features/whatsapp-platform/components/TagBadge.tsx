import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { configManager, WhatsAppTag } from "../lib/config";

interface TagBadgeProps {
  tagId: string;
  size?: 'sm' | 'md';
  onRemove?: () => void;
  showRemove?: boolean;
}

export function TagBadge({ tagId, size = 'sm', onRemove, showRemove = false }: TagBadgeProps) {
  const tags = configManager.getTags();
  const tag = tags.find(t => t.id === tagId);

  if (!tag) {
    return null;
  }

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const paddingSize = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';

  return (
    <Badge 
      className={`${textSize} ${paddingSize} border-0 flex items-center gap-1 font-medium shadow-sm`}
      style={{ 
        backgroundColor: tag.color,
        color: '#ffffff',
        borderColor: tag.color
      }}
    >
      <span>{tag.name}</span>
      {showRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-black/20 rounded-full p-0.5 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}
