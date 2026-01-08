import { Label } from '@/types/kanban';
import { cn } from '@/lib/utils';
import { labelColorClasses } from '@/lib/labelColors';

interface CardLabelProps {
  label: Label;
  size?: 'compact' | 'full';
  onClick?: () => void;
}

export const CardLabel = ({ label, size = 'full', onClick }: CardLabelProps) => {
  const isHexColor = label.color.startsWith('#');
  
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded font-medium text-white cursor-pointer transition-all',
        !isHexColor && labelColorClasses[label.color],
        size === 'compact' ? 'min-h-[8px] w-10 px-1.5 py-0.5 text-[10px] leading-tight' : 'px-3 py-1 text-xs'
      )}
      style={isHexColor ? { backgroundColor: label.color } : undefined}
      title={label.name}
    >
      {size === 'full' && label.name}
    </div>
  );
};
