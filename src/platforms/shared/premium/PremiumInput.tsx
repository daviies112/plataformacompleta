import { forwardRef, useState, useEffect, InputHTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { premiumTheme } from './theme';

interface PremiumInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

export const PremiumInput = forwardRef<HTMLInputElement, PremiumInputProps>(
  ({ 
    label, 
    error, 
    icon: Icon, 
    iconPosition = 'left',
    size = 'md',
    className, 
    onFocus, 
    onBlur, 
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);

    // Sync hasValue when props.value or props.defaultValue changes (async data loading)
    useEffect(() => {
      setHasValue(!!props.value || !!props.defaultValue);
    }, [props.value, props.defaultValue]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasValue(!!e.target.value);
      onBlur?.(e);
    };

    const sizeStyles = {
      sm: { 
        container: 'min-h-[40px] lg:min-h-[36px]', 
        input: 'text-sm lg:text-xs', 
        inputPadding: 'py-2.5 lg:py-2',
        icon: 'w-4 h-4 lg:w-3.5 lg:h-3.5' 
      },
      md: { 
        container: premiumTheme.minHeight.input, 
        input: 'text-base lg:text-sm', 
        inputPadding: 'py-3.5 lg:py-2.5',
        icon: 'w-5 h-5 lg:w-4 lg:h-4' 
      },
      lg: { 
        container: 'min-h-[52px] lg:min-h-[42px]', 
        input: 'text-lg lg:text-base', 
        inputPadding: 'py-4 lg:py-3',
        icon: 'w-6 h-6 lg:w-5 lg:h-5' 
      },
    };

    return (
      <div className="w-full">
        <div className="relative">
          <div
            className={cn(
              'relative w-full',
              premiumTheme.radius.md,
              'border',
              premiumTheme.transitions.slow,
              premiumTheme.glass.background.subtle,
              premiumTheme.glass.base,
              premiumTheme.shadows.md,
              isFocused && [
                'border-primary/40 bg-white/[0.05]',
                premiumTheme.shadows.primaryFocus,
                'ring-4 ring-primary/10',
              ],
              error && [
                premiumTheme.states.error,
                premiumTheme.animations.shake,
              ],
              !isFocused && !error && cn(
                premiumTheme.glass.border.subtle,
                'hover:border-white/20'
              ),
              className
            )}
          >
            {Icon && iconPosition === 'left' && (
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Icon className={cn(
                  sizeStyles[size].icon,
                  premiumTheme.transitions.colors,
                  isFocused ? 'text-primary' : 'text-muted-foreground'
                )} />
              </div>
            )}

            <input
              ref={ref}
              className={cn(
                'w-full bg-transparent px-4 text-foreground',
                'placeholder:text-muted-foreground/50',
                'focus:outline-none',
                premiumTheme.transitions.normal,
                Icon && iconPosition === 'left' && 'pl-12',
                Icon && iconPosition === 'right' && 'pr-12',
                label ? 'pt-7 lg:pt-7 pb-3 lg:pb-2.5' : sizeStyles[size].inputPadding,
                sizeStyles[size].container,
                sizeStyles[size].input
              )}
              onFocus={handleFocus}
              onBlur={handleBlur}
              {...props}
            />

            {Icon && iconPosition === 'right' && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Icon className={cn(
                  sizeStyles[size].icon,
                  premiumTheme.transitions.colors,
                  isFocused ? 'text-primary' : 'text-muted-foreground'
                )} />
              </div>
            )}

            {label && (
              <label
                className={cn(
                  'absolute left-4 pointer-events-none',
                  premiumTheme.transitions.normal,
                  'text-muted-foreground origin-left',
                  Icon && iconPosition === 'left' && 'left-12',
                  (isFocused || hasValue) 
                    ? 'top-2 lg:top-2.5 text-xs lg:text-[10px] font-medium text-primary/70' 
                    : 'top-1/2 -translate-y-1/2 text-base lg:text-sm'
                )}
              >
                {label}
              </label>
            )}
          </div>
        </div>

        {error && (
          <p className={cn(
            'mt-2 text-sm text-red-400 px-1',
            premiumTheme.animations.fadeIn
          )}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

PremiumInput.displayName = 'PremiumInput';

export type { PremiumInputProps };
