import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { premiumTheme } from './theme';

interface PremiumCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  clickable?: boolean;
}

export const PremiumCard = forwardRef<HTMLDivElement, PremiumCardProps>(
  ({ variant = 'default', padding = 'md', clickable = false, className, children, ...props }, ref) => {
    const variantStyles = {
      default: cn(
        premiumTheme.glass.background.subtle,
        premiumTheme.glass.border.subtle,
        premiumTheme.shadows.md,
        'hover:bg-white/[0.05] hover:border-white/15',
        premiumTheme.shadows.lg.replace('shadow-', 'hover:shadow-')
      ),
      elevated: cn(
        premiumTheme.glass.background.elevated,
        premiumTheme.glass.border.subtle,
        premiumTheme.shadows.elevated,
        'hover:shadow-[0_16px_48px_rgba(0,0,0,0.24)]',
        premiumTheme.interactions.hover.lift
      ),
      outlined: cn(
        'bg-transparent',
        premiumTheme.glass.border.medium,
        premiumTheme.shadows.sm,
        'hover:bg-white/[0.02] hover:border-white/30',
        premiumTheme.shadows.md.replace('shadow-', 'hover:shadow-')
      ),
    };

    const paddingMap = {
      sm: premiumTheme.spacing.card.sm,
      md: premiumTheme.spacing.card.md,
      lg: premiumTheme.spacing.card.lg,
      xl: premiumTheme.spacing.card.xl,
    };

    return (
      <div
        ref={ref}
        className={cn(
          premiumTheme.radius.lg,
          'border',
          premiumTheme.transitions.slow,
          premiumTheme.glass.base,
          variantStyles[variant],
          paddingMap[padding],
          clickable && [
            premiumTheme.desktop.cursor,
            premiumTheme.desktop.select,
            premiumTheme.interactions.scale.subtle,
          ],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PremiumCard.displayName = 'PremiumCard';

export type { PremiumCardProps };
