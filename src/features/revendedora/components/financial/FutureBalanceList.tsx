import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CreditCard, Wallet } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { SplitService } from '@/services/SplitService';
import { getReleaseDays, getReleaseDate } from '@/hooks/useFinancialSummary';

interface FutureSale {
  id: string;
  reseller_amount: number;
  payment_method: string;
  paid_at: string | null;
}

interface FutureBalanceListProps {
  sales: FutureSale[];
}

export function FutureBalanceList({ sales }: FutureBalanceListProps) {
  if (sales.length === 0) {
    return null;
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'pix':
        return <Wallet className="h-4 w-4 text-green-500" />;
      case 'cartao':
      case 'cartão':
        return <CreditCard className="h-4 w-4 text-blue-500" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'pix':
        return 'PIX';
      case 'cartao':
      case 'cartão':
        return 'Cartão';
      default:
        return method || '-';
    }
  };

  const sortedSales = [...sales].sort((a, b) => {
    const dateA = getReleaseDate(a.paid_at, a.payment_method);
    const dateB = getReleaseDate(b.paid_at, b.payment_method);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          Valores a Liberar
        </CardTitle>
        <CardDescription>
          Valores aguardando o prazo de liberação baseado no método de pagamento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedSales.slice(0, 10).map((sale) => {
            const releaseDate = getReleaseDate(sale.paid_at, sale.payment_method);
            const releaseDays = getReleaseDays(sale.payment_method);
            
            return (
              <div
                key={sale.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getPaymentMethodIcon(sale.payment_method)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {SplitService.formatCurrency(sale.reseller_amount)}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {getPaymentMethodLabel(sale.payment_method)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      D+{releaseDays}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {releaseDate && (
                    <>
                      <p className="text-sm font-medium">
                        {format(releaseDate, "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(releaseDate, { 
                          locale: ptBR, 
                          addSuffix: true 
                        })}
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {sales.length > 10 && (
            <p className="text-sm text-muted-foreground text-center pt-2">
              E mais {sales.length - 10} valores...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
