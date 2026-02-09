import { Card } from "@/components/ui/card";
import { TrendingUp, PieChart, Calendar, Wallet } from "lucide-react";
import { FinancialSummary, formatCurrency, formatDate } from "@/lib/financialUtils";
import { HorizontalScrollCards, ScrollCard } from "./HorizontalScrollCards";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileSummaryCardsProps {
  summary: FinancialSummary;
}

export function MobileSummaryCards({ summary }: MobileSummaryCardsProps) {
  const isMobile = useIsMobile();

  const cards = [
    {
      icon: Wallet,
      label: "Gasto no mês",
      value: formatCurrency(summary.currentMonthTotal),
      gradient: "from-primary/10 to-primary/5",
    },
    {
      icon: TrendingUp,
      label: "Média mensal",
      value: formatCurrency(summary.monthlyAverage),
      gradient: "from-blue-500/10 to-blue-500/5",
    },
    {
      icon: PieChart,
      label: "Maior categoria",
      value: summary.largestCategory
        ? formatCurrency(summary.largestCategory.total)
        : "--",
      subtitle: summary.largestCategory?.category,
      gradient: "from-purple-500/10 to-purple-500/5",
    },
    {
      icon: Calendar,
      label: "Próximo vencimento",
      value: summary.nextPayment
        ? formatCurrency(Math.abs(summary.nextPayment.amount))
        : "--",
      subtitle: summary.nextPayment ? formatDate(summary.nextPayment.date) : undefined,
      gradient: "from-orange-500/10 to-orange-500/5",
    },
  ];

  if (!isMobile) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <Card key={index} className={`p-6 bg-gradient-to-br ${card.gradient}`}>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <card.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{card.label}</span>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              {card.subtitle && (
                <p className="text-xs text-muted-foreground capitalize">
                  {card.subtitle}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <HorizontalScrollCards>
      {cards.map((card, index) => (
        <ScrollCard key={index} width="260px">
          <Card
            className={`p-5 bg-gradient-to-br ${card.gradient} h-[120px] flex flex-col justify-between touch-manipulation active:scale-[0.98] transition-transform`}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <card.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{card.label}</span>
            </div>
            <div>
              <p className="text-3xl font-bold mb-1">{card.value}</p>
              {card.subtitle && (
                <p className="text-xs text-muted-foreground capitalize truncate">
                  {card.subtitle}
                </p>
              )}
            </div>
          </Card>
        </ScrollCard>
      ))}
    </HorizontalScrollCards>
  );
}
