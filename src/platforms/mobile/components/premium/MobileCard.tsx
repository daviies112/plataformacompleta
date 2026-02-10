import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface MobileCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'sm' | 'md' | 'lg';
  clickable?: boolean;
}

export const MobileCard = forwardRef<HTMLDivElement, MobileCardProps>(
  ({ variant = 'default', padding = 'md', clickable = false, className, children, ...props }, ref) => {
    const baseStyles = `
      rounded-2xl border transition-all duration-300
      backdrop-blur-xl backdrop-saturate-180
    `;

    const variantStyles = {
      default: `
        bg-white/[0.03] border-white/10
        shadow-[0_8px_32px_rgba(0,0,0,0.12)]
        hover:bg-white/[0.05] hover:border-white/15
        hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)]
      `,
      elevated: `
        bg-gradient-to-br from-white/[0.06] to-white/[0.02]
        border-white/10
        shadow-[0_12px_40px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.1)]
        hover:shadow-[0_16px_48px_rgba(0,0,0,0.24)]
        hover:translate-y-[-2px]
      `,
      outlined: `
        bg-transparent border-white/20
        shadow-[0_4px_16px_rgba(0,0,0,0.08)]
        hover:bg-white/[0.02] hover:border-white/30
        hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]
      `,
    };

    const paddingStyles = {
      sm: 'p-4',
      md: 'p-5',
      lg: 'p-6',
    };

    const clickableStyles = clickable
      ? `
        cursor-pointer touch-manipulation
        active:scale-[0.98]
        active:shadow-[0_4px_16px_rgba(0,0,0,0.12)]
      `
      : '';

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          paddingStyles[padding],
          clickableStyles,
          '@media (prefers-reduced-motion: reduce)' && 'transition-none hover:translate-y-0 active:scale-100',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

MobileCard.displayName = 'MobileCard';

export type { MobileCardProps };
