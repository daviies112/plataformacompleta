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

  const colorMap: Record<string, string> = {
    'green': 'bg-label-green',
    'yellow': 'bg-label-yellow',
    'orange': 'bg-label-orange',
    'red': 'bg-label-red',
    'purple': 'bg-label-purple',
    'blue': 'bg-label-blue',
    'sky': 'bg-label-sky',
    'lime': 'bg-label-lime',
    'pink': 'bg-label-pink',
    'black': 'bg-label-black',
  };

  const bgColorClass = !isHexColor ? (colorMap[label.color] || labelColorClasses[label.color] || 'bg-secondary') : '';

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-sm font-bold cursor-pointer transition-all duration-200 select-none group/label',
        bgColorClass,
        size === 'compact'
          ? 'h-2 w-10 hover:w-12 shadow-sm'
          : 'px-3 py-1 text-[11px] leading-tight text-white uppercase tracking-wider hover:brightness-110 shadow-[0_1px_0_rgba(0,0,0,0.1)]'
      )}
      style={isHexColor ? { backgroundColor: label.color } : undefined}
      title={label.name}
    >
      {size === 'full' && label.name}
    </div>
  );
};
