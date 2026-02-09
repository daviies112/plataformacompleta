import { Card } from "@/components/ui/card";
import { Calendar, TrendingUp, Package, Repeat } from "lucide-react";
import type { MonthlyProjection } from "../../../shared/schema";
import { formatCurrency } from "@/lib/financialUtils";

interface MonthlyProjectionsCardProps {
  currentMonth: MonthlyProjection;
  futureMonths: MonthlyProjection[];
  onMonthClick?: (monthKey: string) => void;
}

export default function MonthlyProjectionsCard({
  currentMonth,
  futureMonths,
  onMonthClick,
}: MonthlyProjectionsCardProps) {
  const displayMonths = [currentMonth, ...futureMonths.slice(0, 11)];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Projeção de Gastos</h2>
          <p className="text-muted-foreground text-sm">
            Valores previstos para os próximos meses baseados em parcelas e assinaturas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {displayMonths.map((projection, index) => {
          const isCurrentMonth = index === 0;
          const hasInstallments = projection.installments.length > 0;
          const hasRecurring = projection.recurring.length > 0;

          return (
            <Card
              key={projection.monthKey}
              className={`p-4 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                isCurrentMonth
                  ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                  : ""
              }`}
              onClick={() => onMonthClick?.(projection.monthKey)}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm capitalize truncate">
                      {projection.month.split(" de ")[0]}
                    </h3>
                  </div>
                  {isCurrentMonth && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      Atual
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">
                      {formatCurrency(projection.total)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {hasInstallments && (
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        <span>{projection.installments.length} parcela{projection.installments.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {hasRecurring && (
                      <div className="flex items-center gap-1">
                        <Repeat className="h-3 w-3" />
                        <span>{projection.recurring.length} recorrente{projection.recurring.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>

                {(projection.breakdown.installmentsTotal > 0 ||
                  projection.breakdown.recurringTotal > 0) && (
                  <div className="space-y-1 pt-2 border-t">
                    {projection.breakdown.installmentsTotal > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Parcelas:</span>
                        <span className="font-medium">
                          {formatCurrency(projection.breakdown.installmentsTotal)}
                        </span>
                      </div>
                    )}
                    {projection.breakdown.recurringTotal > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Recorrentes:</span>
                        <span className="font-medium">
                          {formatCurrency(projection.breakdown.recurringTotal)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
