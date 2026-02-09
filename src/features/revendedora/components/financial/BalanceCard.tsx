import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LucideIcon, HelpCircle } from 'lucide-react';
import { SplitService } from '@/services/SplitService';

interface BalanceCardProps {
  title: string;
  amount: number;
  icon: LucideIcon;
  iconColor?: string;
  amountColor?: string;
  description?: string;
  tooltip?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export function BalanceCard({
  title,
  amount,
  icon: Icon,
  iconColor = 'text-muted-foreground',
  amountColor = '',
  description,
  tooltip,
  badge,
  badgeVariant = 'secondary',
}: BalanceCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px]">
                  <p className="text-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className={`text-2xl font-bold ${amountColor}`}>
            {SplitService.formatCurrency(amount)}
          </div>
          {badge && (
            <Badge variant={badgeVariant} className="text-[10px]">
              {badge}
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
