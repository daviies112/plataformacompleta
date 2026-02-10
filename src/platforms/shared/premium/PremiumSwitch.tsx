import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { premiumTheme } from './theme';

interface PremiumSwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PremiumSwitch = forwardRef<HTMLInputElement, PremiumSwitchProps>(
  ({ label, description, size = 'md', className, checked, ...props }, ref) => {
    const sizeStyles = {
      sm: { track: 'w-11 h-7', thumb: 'w-5 h-5 top-1 left-1', translate: 'translate-x-4' },
      md: { track: 'w-14 h-8', thumb: 'w-6 h-6 top-1 left-1', translate: 'translate-x-6' },
      lg: { track: 'w-16 h-9', thumb: 'w-7 h-7 top-1 left-1', translate: 'translate-x-7' },
    };

    return (
      <label className={cn(
        'flex items-center justify-between gap-4',
        premiumTheme.desktop.cursor,
        premiumTheme.desktop.select,
        className
      )}>
        <div className="flex-1 min-w-0">
          {label && (
            <div className={cn(
              'font-medium text-foreground',
              size === 'sm' && 'text-sm',
              size === 'md' && 'text-base',
              size === 'lg' && 'text-lg'
            )}>
              {label}
            </div>
          )}
          {description && (
            <div className={cn(
              'text-muted-foreground mt-0.5',
              size === 'sm' && 'text-xs',
              size === 'md' && 'text-sm',
              size === 'lg' && 'text-base'
            )}>
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
            {...props}
          />
          
          <div
            className={cn(
              sizeStyles[size].track,
              premiumTheme.radius.full,
              premiumTheme.transitions.normal,
              premiumTheme.glass.background.subtle,
              premiumTheme.glass.base,
              premiumTheme.glass.border.subtle,
              'shadow-[0_4px_16px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.05)]',
              'peer-checked:bg-emerald-500/20 peer-checked:border-emerald-500/30',
              'peer-checked:shadow-[0_4px_16px_rgba(16,185,129,0.2),inset_0_1px_0_rgba(16,185,129,0.1)]',
              'peer-focus:ring-4 peer-focus:ring-primary/10',
              'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed'
            )}
          >
            <div
              className={cn(
                'absolute',
                sizeStyles[size].thumb,
                premiumTheme.radius.full,
                'bg-gradient-to-br',
                premiumTheme.transitions.normal,
                'shadow-[0_2px_8px_rgba(0,0,0,0.3)]',
                checked 
                  ? [
                      sizeStyles[size].translate,
                      premiumTheme.gradients.success,
                      'shadow-[0_2px_12px_rgba(16,185,129,0.5)]'
                    ]
                  : [
                      'translate-x-0',
                      premiumTheme.gradients.neutral,
                      'shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                    ]
              )}
            />
          </div>
        </div>
      </label>
    );
  }
);

PremiumSwitch.displayName = 'PremiumSwitch';

export type { PremiumSwitchProps };
