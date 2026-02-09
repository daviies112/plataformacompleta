import { Card } from "@/components/ui/card";
import { TrendingUp, PieChart, Calendar, Wallet } from "lucide-react";
import { FinancialSummary, formatCurrency, formatDate } from "@/lib/financialUtils";

interface SummaryCardsProps {
  summary: FinancialSummary;
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4" />
            <span className="text-sm font-medium">Gasto no mês</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(summary.currentMonthTotal)}</p>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Média mensal</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(summary.monthlyAverage)}</p>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-500/5">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <PieChart className="h-4 w-4" />
            <span className="text-sm font-medium">Maior categoria</span>
          </div>
          {summary.largestCategory ? (
            <>
              <p className="text-2xl font-bold">{formatCurrency(summary.largestCategory.total)}</p>
              <p className="text-xs text-muted-foreground capitalize">{summary.largestCategory.category}</p>
            </>
          ) : (
            <p className="text-2xl font-bold">--</p>
          )}
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-orange-500/10 to-orange-500/5">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Próximo vencimento</span>
          </div>
          {summary.nextPayment ? (
            <>
              <p className="text-2xl font-bold">{formatCurrency(Math.abs(summary.nextPayment.amount))}</p>
              <p className="text-xs text-muted-foreground">{formatDate(summary.nextPayment.date)}</p>
            </>
          ) : (
            <p className="text-2xl font-bold">--</p>
          )}
        </div>
      </Card>
    </div>
  );
}
