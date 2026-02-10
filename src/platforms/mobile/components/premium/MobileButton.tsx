import { forwardRef, ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const hapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

interface MobileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const MobileButton = forwardRef<HTMLButtonElement, MobileButtonProps>(
  ({ variant = 'primary', isLoading = false, className, disabled, children, onClick, ...props }, ref) => {
    const baseStyles = `
      relative w-full rounded-xl px-6 py-3.5 
      min-h-[48px] text-base font-semibold
      transition-all duration-200 
      active:scale-95
      disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
      touch-manipulation
      focus:outline-none focus:ring-4
    `;

    const variantStyles = {
      primary: `
        bg-gradient-to-r from-primary via-primary/90 to-primary
        text-primary-foreground
        shadow-[0_8px_32px_rgba(212,175,55,0.3)]
        hover:shadow-[0_12px_40px_rgba(212,175,55,0.4)]
        active:shadow-[0_4px_16px_rgba(212,175,55,0.3)]
        focus:ring-primary/20
        border border-primary/30
      `,
      secondary: `
        bg-white/[0.03] backdrop-blur-xl backdrop-saturate-180
        text-foreground border border-white/10
        shadow-[0_8px_32px_rgba(0,0,0,0.12)]
        hover:bg-white/[0.06] hover:border-white/20
        hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)]
        active:bg-white/[0.04]
        focus:ring-white/10
      `,
      danger: `
        bg-gradient-to-r from-red-500 via-red-600 to-red-500
        text-white
        shadow-[0_8px_32px_rgba(239,68,68,0.3)]
        hover:shadow-[0_12px_40px_rgba(239,68,68,0.4)]
        active:shadow-[0_4px_16px_rgba(239,68,68,0.3)]
        focus:ring-red-500/20
        border border-red-500/30
      `,
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !isLoading) {
        hapticFeedback();
        onClick?.(e);
      }
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          '@media (prefers-reduced-motion: reduce)' && 'transition-none active:scale-100',
          className
        )}
        disabled={disabled || isLoading}
        onClick={handleClick}
        {...props}
      >
        <span className={cn(
          'flex items-center justify-center gap-2',
          isLoading && 'opacity-0'
        )}>
          {children}
        </span>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
      </button>
    );
  }
);

MobileButton.displayName = 'MobileButton';

export type { MobileButtonProps };
