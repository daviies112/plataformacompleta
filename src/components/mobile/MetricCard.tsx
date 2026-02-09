import { ReactNode } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { AnimatedNumber } from './AnimatedNumber';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  className?: string;
}

/**
 * MetricCard Premium - Card de métrica com tipografia bold e animações
 * Design inspirado em Stripe Dashboard e Linear Analytics
 */
export const MetricCard = ({
  icon: Icon,
  label,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  trend,
  onClick,
  className
}: MetricCardProps) => {
  return (
    <GlassCard variant="metric" onClick={onClick} className={cn('p-5', className)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
        
        {trend && (
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold',
            trend.isPositive 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          )}>
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-3xl font-bold text-foreground tracking-tight">
          <AnimatedNumber 
            value={value} 
            prefix={prefix}
            suffix={suffix}
            decimals={decimals}
          />
        </div>
        <div className="text-sm font-medium text-muted-foreground">
          {label}
        </div>
      </div>
    </GlassCard>
  );
};
