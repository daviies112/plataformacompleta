import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: ReactNode;
  variant?: 'default' | 'metric' | 'action';
  className?: string;
  onClick?: () => void;
}

/**
 * GlassCard Premium - Componente de card com glassmorphism effect
 * Baseado em apps premium como Linear, Notion, Stripe
 */
export const GlassCard = ({ children, variant = 'default', className, onClick }: GlassCardProps) => {
  const baseStyles = `
    rounded-2xl border transition-all duration-300
    backdrop-blur-xl backdrop-saturate-180
  `;

  const variantStyles = {
    default: `
      bg-white/[0.03] border-white/10
      hover:bg-white/[0.05] hover:border-white/15
      shadow-[0_8px_32px_rgba(0,0,0,0.12)]
    `,
    metric: `
      bg-gradient-to-br from-white/[0.06] to-white/[0.02]
      border-white/10
      shadow-[0_8px_32px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]
      hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)]
    `,
    action: `
      bg-primary/10 border-primary/20
      hover:bg-primary/15 hover:border-primary/30
      shadow-[0_0_24px_rgba(212,175,55,0.12)]
      hover:shadow-[0_0_32px_rgba(212,175,55,0.2)]
      active:scale-[0.98]
    `
  };

  return (
    <div 
      className={cn(
        baseStyles,
        variantStyles[variant],
        onClick && 'cursor-pointer active:scale-[0.98]',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
