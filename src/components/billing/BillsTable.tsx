import { Card } from "@/components/ui/card";
import { FileText, Calendar, DollarSign, CreditCard, AlertCircle } from "lucide-react";
import { Bill } from "@/lib/financialUtils";
import { Badge } from "@/components/ui/badge";

interface BillsTableProps {
  bills: Bill[];
}

export default function BillsTable({ bills }: BillsTableProps) {
  const formatCurrency = (amount: number, currencyCode: string = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currencyCode,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("pt-BR");
    } catch {
      return dateString;
    }
  };

  if (bills.length === 0) {
    return null;
  }

  // Ordenar por data de vencimento (mais recente primeiro)
  const sortedBills = [...bills].sort((a, b) => 
    new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
  );

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Faturas (Dados Brutos)</h3>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data Vencimento
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <DollarSign className="h-4 w-4" />
                      Valor Total
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Valor Mínimo</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Parcelamento
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Finance Charges
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {bill.id.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-sm">{formatDate(bill.dueDate)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-primary">
                      {formatCurrency(bill.totalAmount, bill.totalAmountCurrencyCode)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                      {bill.minimumPaymentAmount 
                        ? formatCurrency(bill.minimumPaymentAmount, bill.totalAmountCurrencyCode)
                        : "-"
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      {bill.allowsInstallments !== undefined ? (
                        <Badge variant={bill.allowsInstallments ? "default" : "secondary"}>
                          {bill.allowsInstallments ? "Sim" : "Não"}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {bill.financeCharges && bill.financeCharges.length > 0 ? (
                        <div className="space-y-1">
                          {bill.financeCharges.map((charge, idx) => (
                            <div key={charge.id || idx} className="text-xs">
                              <span className="font-medium">{charge.type}:</span>{" "}
                              {formatCurrency(charge.amount, charge.currencyCode)}
                              {charge.additionalInfo && (
                                <span className="text-muted-foreground ml-1">
                                  ({charge.additionalInfo})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
}
