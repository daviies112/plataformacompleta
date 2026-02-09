import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const hapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

interface MobileSwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const MobileSwitch = forwardRef<HTMLInputElement, MobileSwitchProps>(
  ({ label, description, className, checked, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      hapticFeedback();
      onChange?.(e);
    };

    return (
      <label className={cn('flex items-center justify-between gap-4 cursor-pointer touch-manipulation', className)}>
        <div className="flex-1 min-w-0">
          {label && (
            <div className="text-base font-medium text-foreground">
              {label}
            </div>
          )}
          {description && (
            <div className="text-sm text-muted-foreground mt-0.5">
              {description}
            </div>
          )}
        </div>

        <div className="relative flex-shrink-0">
          <input
            ref={ref}
            type="checkbox"
            className="sr-only peer"
            checked={checked}
            onChange={handleChange}
            {...props}
          />
          
          <div
            className={cn(
              'w-14 h-8 rounded-full transition-all duration-200',
              'bg-white/[0.05] backdrop-blur-xl backdrop-saturate-180',
              'border border-white/10',
              'shadow-[0_4px_16px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.05)]',
              'peer-checked:bg-emerald-500/20 peer-checked:border-emerald-500/30',
              'peer-checked:shadow-[0_4px_16px_rgba(16,185,129,0.2),inset_0_1px_0_rgba(16,185,129,0.1)]',
              'peer-focus:ring-4 peer-focus:ring-primary/10',
              'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
              '@media (prefers-reduced-motion: reduce)' && 'transition-none'
            )}
          >
            <div
              className={cn(
                'absolute top-1 left-1 w-6 h-6 rounded-full',
                'bg-gradient-to-br transition-all duration-200',
                'shadow-[0_2px_8px_rgba(0,0,0,0.3)]',
                checked 
                  ? [
                      'translate-x-6',
                      'from-emerald-400 to-emerald-500',
                      'shadow-[0_2px_12px_rgba(16,185,129,0.5)]'
                    ]
                  : [
                      'translate-x-0',
                      'from-gray-400 to-gray-500',
                      'shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                    ],
                '@media (prefers-reduced-motion: reduce)' && 'transition-none'
              )}
            />
          </div>
        </div>
      </label>
    );
  }
);

MobileSwitch.displayName = 'MobileSwitch';

export type { MobileSwitchProps };
