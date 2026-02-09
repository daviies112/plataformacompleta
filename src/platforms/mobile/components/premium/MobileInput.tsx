import { forwardRef, useState, InputHTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const hapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

interface MobileInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
  ({ label, error, icon: Icon, iconPosition = 'left', className, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      hapticFeedback();
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasValue(!!e.target.value);
      onBlur?.(e);
    };

    return (
      <div className="w-full">
        <div className="relative">
          <div
            className={cn(
              'relative w-full rounded-xl border transition-all duration-300',
              'bg-black/20 backdrop-blur-xl backdrop-saturate-180',
              'shadow-[0_8px_32px_rgba(0,0,0,0.12)]',
              isFocused && [
                'border-primary/40 bg-black/30',
                'shadow-[0_0_24px_rgba(212,175,55,0.25),0_8px_32px_rgba(0,0,0,0.15)]',
                'ring-4 ring-primary/10',
              ],
              error && [
                'border-red-500/40 bg-red-500/[0.05]',
                'animate-shake',
              ],
              !isFocused && !error && 'border-white/10 hover:border-white/20',
              className
            )}
          >
            {Icon && iconPosition === 'left' && (
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Icon className={cn(
                  'w-5 h-5 transition-colors duration-200',
                  isFocused ? 'text-primary' : 'text-muted-foreground'
                )} />
              </div>
            )}

            <input
              ref={ref}
              className={cn(
                'w-full bg-transparent px-4 py-3.5 text-base',
                'text-white',
                'placeholder:text-gray-400/60',
                'focus:outline-none',
                'min-h-[48px]',
                'transition-all duration-200',
                Icon && iconPosition === 'left' && 'pl-12',
                Icon && iconPosition === 'right' && 'pr-12',
                label && 'pt-7 pb-3',
                '@media (prefers-reduced-motion: reduce)' && 'transition-none'
              )}
              style={{
                WebkitTextFillColor: '#ffffff',
                color: '#ffffff'
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
              {...props}
            />

            {Icon && iconPosition === 'right' && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Icon className={cn(
                  'w-5 h-5 transition-colors duration-200',
                  isFocused ? 'text-primary' : 'text-muted-foreground'
                )} />
              </div>
            )}

            {label && (
              <label
                className={cn(
                  'absolute left-4 pointer-events-none transition-all duration-200',
                  'origin-left',
                  Icon && iconPosition === 'left' && 'left-12',
                  (isFocused || hasValue) 
                    ? 'top-2 text-xs font-medium text-primary/70' 
                    : 'top-1/2 -translate-y-1/2 text-base text-gray-400',
                  '@media (prefers-reduced-motion: reduce)' && 'transition-none'
                )}
              >
                {label}
              </label>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-400 animate-fadeIn px-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

MobileInput.displayName = 'MobileInput';

export type { MobileInputProps };
