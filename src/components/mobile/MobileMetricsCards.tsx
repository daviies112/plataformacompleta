import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { HorizontalScrollCards, ScrollCard } from "./HorizontalScrollCards";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface MetricCard {
  title: string;
  value: string;
  change: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

interface MobileMetricsCardsProps {
  metrics: MetricCard[];
  className?: string;
}

export function MobileMetricsCards({ metrics, className }: MobileMetricsCardsProps) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
        {metrics.map((metric, index) => (
          <Card 
            key={index} 
            className="glass-card border-border/20 hover:shadow-luxury transition-elegant p-6"
          >
            <CardContent metric={metric} isMobile={false} />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <HorizontalScrollCards className={className}>
      {metrics.map((metric, index) => (
        <ScrollCard key={index} width="280px">
          <Card className="glass-card border-border/20 h-[140px] flex flex-col justify-between p-4 active:scale-[0.98] transition-all duration-200">
            <CardContent metric={metric} isMobile={true} />
          </Card>
        </ScrollCard>
      ))}
    </HorizontalScrollCards>
  );
}

interface CardContentProps {
  metric: MetricCard;
  isMobile: boolean;
}

function CardContent({ metric, isMobile }: CardContentProps) {
  const Icon = metric.icon;
  
  return (
    <>
      <div className="flex items-center justify-between">
        <div className={cn(
          "p-2 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/5",
          "transition-transform duration-200"
        )}>
          <Icon className={cn(metric.color, isMobile ? "w-5 h-5" : "w-6 h-6")} />
        </div>
        <span className={cn(
          "font-bold transition-colors duration-200",
          metric.change.startsWith('+') ? "text-green-500" : "text-red-500",
          isMobile ? "text-sm" : "text-base"
        )}>
          {metric.change}
        </span>
      </div>
      
      <div className="space-y-1">
        <p className={cn(
          "text-muted-foreground font-medium",
          isMobile ? "text-xs" : "text-sm"
        )}>
          {metric.title}
        </p>
        <p className={cn(
          "font-black gradient-text",
          isMobile ? "text-2xl" : "text-4xl"
        )}>
          {metric.value}
        </p>
        <p className={cn(
          "text-muted-foreground/60",
          isMobile ? "text-[10px]" : "text-xs"
        )}>
          {metric.description}
        </p>
      </div>
    </>
  );
}
