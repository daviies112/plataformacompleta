import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Receipt, Calendar, DollarSign, Tag } from "lucide-react";
import { Transaction } from "@/lib/financialUtils";
import TransactionFilters, { TransactionFilterParams } from "./TransactionFilters";
import { translateCategory, translateStatus, translateType } from "@/lib/translations";

interface TransactionsTableProps {
  transactions: Transaction[];
}

export default function TransactionsTable({ transactions }: TransactionsTableProps) {
  const [filters, setFilters] = useState<TransactionFilterParams>({
    searchText: "",
    dateFrom: "",
    dateTo: "",
    type: "all",
    category: "all",
  });

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

  // Extrair categorias únicas
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    transactions.forEach(t => {
      if (t.category) {
        categories.add(t.category);
      }
    });
    return Array.from(categories).sort();
  }, [transactions]);

  // Aplicar filtros
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Filtro por texto (nome/descrição)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por data inicial
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(t => new Date(t.date) >= fromDate);
    }

    // Filtro por data final
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // Incluir o dia todo
      filtered = filtered.filter(t => new Date(t.date) <= toDate);
    }

    // Filtro por tipo (DEBIT/CREDIT)
    if (filters.type !== "all") {
      filtered = filtered.filter(t => t.type === filters.type);
    }

    // Filtro por categoria
    if (filters.category !== "all") {
      filtered = filtered.filter(t => t.category === filters.category);
    }

    // Ordenar por data (mais recente primeiro)
    return filtered.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [transactions, filters]);

  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <TransactionFilters 
        onFilterChange={setFilters}
        availableCategories={availableCategories}
      />

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Transações (Dados Brutos)</h3>
            </div>
            <span className="text-sm text-muted-foreground">
              {filteredTransactions.length} de {transactions.length} transações
            </span>
          </div>
        
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Descrição / Estabelecimento</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Categoria
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <DollarSign className="h-4 w-4" />
                      Valor
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Saldo</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTransactions.map((transaction) => {
                  const detailsInfo = [];
                  
                  if (transaction.creditCardMetadata) {
                    const { installmentNumber, totalInstallments } = transaction.creditCardMetadata;
                    if (installmentNumber && totalInstallments) {
                      detailsInfo.push(`Parcela ${installmentNumber}/${totalInstallments}`);
                    }
                    if (transaction.creditCardMetadata.level) {
                      detailsInfo.push(`Nível: ${transaction.creditCardMetadata.level}`);
                    }
                  }
                  
                  if (transaction.operationCategory) {
                    detailsInfo.push(`Op: ${transaction.operationCategory}`);
                  }
                  
                  if (transaction.paymentData) {
                    const paymentParts = [
                      transaction.paymentData.paymentMethod && `Método: ${transaction.paymentData.paymentMethod}`,
                      transaction.paymentData.receiver?.name && `Para: ${transaction.paymentData.receiver.name}`,
                      transaction.paymentData.payer?.name && `De: ${transaction.paymentData.payer.name}`,
                      transaction.paymentData.reason && `Motivo: ${transaction.paymentData.reason}`,
                    ].filter(Boolean);
                    if (paymentParts.length > 0) {
                      detailsInfo.push(...paymentParts);
                    }
                  }

                  const displayDetails = detailsInfo.length > 0 ? detailsInfo.join(' | ') : '-';

                  return (
                    <tr key={transaction.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium">
                            {transaction.merchant?.name || transaction.description}
                          </div>
                          {transaction.merchant?.name && transaction.description !== transaction.merchant.name && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Desc: {transaction.description}
                            </div>
                          )}
                          {transaction.merchant?.businessName && (
                            <div className="text-xs text-muted-foreground">
                              {transaction.merchant.businessName}
                              {transaction.merchant.cnpj && ` (CNPJ: ${transaction.merchant.cnpj})`}
                            </div>
                          )}
                          {transaction.descriptionRaw && transaction.descriptionRaw !== transaction.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Original: {transaction.descriptionRaw}
                            </div>
                          )}
                          {transaction.providerCode && (
                            <div className="text-xs text-muted-foreground">
                              Código: {transaction.providerCode}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        <div>
                          <div>{translateCategory(transaction.category)}</div>
                          {transaction.categoryId && (
                            <div className="text-xs text-muted-foreground/60">
                              ID: {transaction.categoryId}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium whitespace-nowrap ${
                        transaction.amount < 0 ? 'text-destructive' : 'text-chart-2'
                      }`}>
                        {formatCurrency(transaction.amount, transaction.currencyCode)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-muted-foreground whitespace-nowrap">
                        {transaction.balance !== undefined && transaction.balance !== null 
                          ? formatCurrency(transaction.balance, transaction.currencyCode)
                          : <span className="text-xs text-muted-foreground/60" title="Saldo não disponível">N/A</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        {transaction.status && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            transaction.status === 'POSTED' 
                              ? 'bg-green-500/10 text-green-500' 
                              : 'bg-yellow-500/10 text-yellow-500'
                          }`}>
                            {translateStatus(transaction.status)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {transaction.type && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            transaction.type === 'DEBIT' 
                              ? 'bg-red-500/10 text-red-500' 
                              : 'bg-blue-500/10 text-blue-500'
                          }`}>
                            {translateType(transaction.type)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs">
                        {displayDetails}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
    </div>
  );
}
