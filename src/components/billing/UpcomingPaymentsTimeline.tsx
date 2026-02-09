import { Card } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import { Transaction, formatCurrency, formatDate } from "@/lib/financialUtils";

interface UpcomingPaymentsTimelineProps {
  payments: Transaction[];
}

export default function UpcomingPaymentsTimeline({ payments }: UpcomingPaymentsTimelineProps) {
  if (payments.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Próximos Pagamentos</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Nenhum pagamento futuro agendado</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Próximos Pagamentos</h3>
      <div className="space-y-3">
        {payments.map((payment, index) => (
          <div 
            key={payment.id}
            className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{payment.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{formatDate(payment.date)}</span>
                {payment.category && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground capitalize">{payment.category}</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex-shrink-0 text-right">
              <p className="font-semibold">{formatCurrency(Math.abs(payment.amount), payment.currencyCode)}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
