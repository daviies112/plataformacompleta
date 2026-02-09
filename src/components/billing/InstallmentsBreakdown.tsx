import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, Repeat } from "lucide-react";
import type { MonthlyProjection } from "../../../shared/schema";
import { formatCurrency } from "@/lib/financialUtils";

interface InstallmentsBreakdownProps {
  projection: MonthlyProjection | null;
}

export default function InstallmentsBreakdown({
  projection,
}: InstallmentsBreakdownProps) {
  if (!projection) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <p>Selecione um mês para ver o detalhamento</p>
        </div>
      </Card>
    );
  }

  const hasInstallments = projection.installments.length > 0;
  const hasRecurring = projection.recurring.length > 0;

  if (!hasInstallments && !hasRecurring) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <p>Nenhuma parcela ou assinatura encontrada para este mês</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold capitalize">{projection.month}</h3>
          <p className="text-sm text-muted-foreground">
            Detalhamento de parcelas e assinaturas
          </p>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projection.installments.map((installment, index) => (
                <TableRow key={`installment-${index}`}>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1">
                      <Package className="h-3 w-3" />
                      Parcela
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {installment.description}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {installment.parcel}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(installment.amount)}
                  </TableCell>
                </TableRow>
              ))}

              {projection.recurring.map((recurring, index) => (
                <TableRow key={`recurring-${index}`}>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <Repeat className="h-3 w-3" />
                      Recorrente
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {recurring.description}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {recurring.frequency}x nos últimos meses
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(recurring.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Previsto</p>
            <p className="text-2xl font-bold">{formatCurrency(projection.total)}</p>
          </div>
          <div className="text-right space-y-1">
            {projection.breakdown.installmentsTotal > 0 && (
              <p className="text-sm text-muted-foreground">
                Parcelas: {formatCurrency(projection.breakdown.installmentsTotal)}
              </p>
            )}
            {projection.breakdown.recurringTotal > 0 && (
              <p className="text-sm text-muted-foreground">
                Recorrentes: {formatCurrency(projection.breakdown.recurringTotal)}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
