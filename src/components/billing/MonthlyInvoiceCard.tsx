import { Card } from "@/components/ui/card";
import { Calendar, TrendingDown, TrendingUp } from "lucide-react";
import { MonthlyInvoice, formatCurrency } from "@/lib/financialUtils";

interface MonthlyInvoiceCardProps {
  invoice: MonthlyInvoice;
  isCurrentMonth?: boolean;
  onClick?: () => void;
}

export default function MonthlyInvoiceCard({ invoice, isCurrentMonth, onClick }: MonthlyInvoiceCardProps) {
  const hasNegativeBalance = invoice.total < 0;
  
  return (
    <Card 
      className={`p-6 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
        isCurrentMonth ? 'border-primary ring-2 ring-primary/20' : ''
      }`}
      onClick={onClick}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-semibold capitalize">{invoice.month}</h3>
          </div>
          {isCurrentMonth && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              Mês atual
            </span>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {formatCurrency(invoice.total)}
            </span>
            {hasNegativeBalance ? (
              <TrendingDown className="h-5 w-5 text-destructive" />
            ) : (
              <TrendingUp className="h-5 w-5 text-chart-2" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {invoice.transactionCount} transação{invoice.transactionCount !== 1 ? 'ões' : ''}
          </p>
        </div>
      </div>
    </Card>
  );
}
