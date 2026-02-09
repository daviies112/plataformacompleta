import { format, parseISO, isFuture, isThisMonth, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

export interface Transaction {
  id: string;
  description: string;
  descriptionRaw?: string | null;
  amount: number;
  date: string;
  category: string;
  currencyCode: string;
  status?: string;
  type?: string;
  providerCode?: string;
  billId?: string;
  accountType?: "CREDIT" | "CHECKING" | "SAVINGS";  // Tipo da conta de origem
  accountId?: string;  // ID da conta de origem
  categoryId?: string;  // Código da categoria do Pluggy
  merchant?: {
    name?: string;
    businessName?: string;
    cnpj?: string;
    cnae?: string;
    category?: string;
  };
  creditCardMetadata?: {
    level?: string;
    paymentDate?: string;
    totalInstallments?: number;
    installmentNumber?: number;
  };
  balance?: number;  // Saldo após a transação
  operationCategory?: string;  // Categoria adicional de operação
  paymentData?: {
    payer?: {
      name?: string;
      branchNumber?: string;
      accountNumber?: string;
      routingNumber?: string;
      documentNumber?: {
        type?: string;
        value?: string;
      };
    };
    receiver?: {
      name?: string;
      branchNumber?: string;
      accountNumber?: string;
      routingNumber?: string;
      documentNumber?: {
        type?: string;
        value?: string;
      };
    };
    reason?: string;
    paymentMethod?: string;
    referenceNumber?: string;
  };
}

export interface Bill {
  id: string;
  dueDate: string;
  totalAmount: number;
  totalAmountCurrencyCode: string;
  minimumPaymentAmount?: number;
  allowsInstallments?: boolean;
  financeCharges?: {
    id: string;
    type: string;
    amount: number;
    currencyCode: string;
    additionalInfo?: string;
  }[];
}

export interface MonthlyInvoice {
  month: string;
  monthKey: string;
  total: number;
  transactions: Transaction[];
  transactionCount: number;
  billId?: string;
  isFromBill?: boolean;
}

export interface CategorySpending {
  category: string;
  total: number;
  percentage: number;
  count: number;
}

export interface FinancialSummary {
  currentMonthTotal: number;
  monthlyAverage: number;
  largestCategory: CategorySpending | null;
  nextPayment: Transaction | null;
  totalSpending: number;
}

export function groupTransactionsByMonth(transactions: Transaction[], bills?: Bill[]): MonthlyInvoice[] {
  const monthMap = new Map<string, Transaction[]>();
  const billMap = new Map<string, Bill>();
  
  // CORREÇÃO: Mapear bills diretamente pelo mês do vencimento (dueDate)
  // Bills do Pluggy já vêm com o dueDate correto para o mês da fatura
  // Exemplo: Bill com dueDate "2025-09-20" = Fatura de SETEMBRO
  if (bills) {
    bills.forEach(bill => {
      const dueDate = parseISO(bill.dueDate);
      const monthKey = format(dueDate, "yyyy-MM");
      billMap.set(monthKey, bill);
    });
  }

  // Aceitar todas as transações (CREDIT, BANK, SAVINGS)
  // A lógica de cálculo será aplicada baseada no tipo de conta
  const validTransactions = transactions;
  

  validTransactions.forEach((transaction) => {
    const date = parseISO(transaction.date);
    const monthKey = format(date, "yyyy-MM");
    const monthLabel = format(date, "MMMM 'de' yyyy", { locale: ptBR });
    
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, []);
    }
    monthMap.get(monthKey)!.push(transaction);
  });

  const monthlyInvoices: MonthlyInvoice[] = Array.from(monthMap.entries())
    .map(([monthKey, monthTransactions]) => {
      const date = parseISO(monthTransactions[0].date);
      const month = format(date, "MMMM 'de' yyyy", { locale: ptBR });
      
      // Verificar se existe Bill para este mês
      const bill = billMap.get(monthKey);
      
      if (bill) {
        // Usar totalAmount da Bill (valor já vem em reais, não em centavos)
        const total = bill.totalAmount;
        
        return {
          month,
          monthKey,
          total,
          transactions: monthTransactions,
          transactionCount: monthTransactions.length,
          billId: bill.id,
          isFromBill: true,
        };
      } else {
        // LÓGICA CORRETA conforme documento:
        // O sinal da API já indica corretamente o impacto na fatura:
        // - Positivo (+) = Despesa → AUMENTA a dívida/fatura
        // - Negativo (-) = Pagamento/Estorno → DIMINUI a dívida/fatura
        // Simplesmente SOMAR respeitando o sinal natural!
        const total = monthTransactions.reduce((sum, t) => {
          return sum + t.amount;
        }, 0);
        
        return {
          month,
          monthKey,
          total,
          transactions: monthTransactions,
          transactionCount: monthTransactions.length,
          isFromBill: false,
        };
      }
    })
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  return monthlyInvoices;
}

export function getCategorySpending(transactions: Transaction[]): CategorySpending[] {
  const categoryMap = new Map<string, { total: number; count: number }>();
  
  // Filtrar DESPESAS baseado no tipo de conta:
  // - CREDIT (Cartão): amount > 0 são despesas (aumentam dívida)
  // - CHECKING/SAVINGS (Conta): amount < 0 são despesas (saídas de dinheiro)
  const spendingTransactions = transactions.filter(t => {
    // Filtrar apenas POSTED
    if (t.status && t.status !== "POSTED") return false;
    
    // Lógica baseada no tipo de conta
    if (t.accountType === "CREDIT") {
      // Cartão: despesas são valores positivos
      return t.amount > 0;
    } else {
      // Conta corrente/poupança: despesas são valores negativos
      return t.amount < 0;
    }
  });
  
  const totalSpending = spendingTransactions.reduce((sum, t) => {
    // Para contas correntes, usar valor absoluto para somar despesas
    return sum + Math.abs(t.amount);
  }, 0);

  spendingTransactions.forEach((transaction) => {
    const category = transaction.category || "Outros";
    // Usar valor absoluto para sempre ter valores positivos nas categorias
    const amount = Math.abs(transaction.amount);
    
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { total: 0, count: 0 });
    }
    
    const current = categoryMap.get(category)!;
    current.total += amount;
    current.count += 1;
  });

  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      total: data.total,
      percentage: totalSpending > 0 ? (data.total / totalSpending) * 100 : 0,
      count: data.count,
    }))
    .sort((a, b) => b.total - a.total);
}

export function getFinancialSummary(transactions: Transaction[]): FinancialSummary {
  const now = new Date();
  
  // Filtrar DESPESAS do mês atual baseado no tipo de conta
  const currentMonthTransactions = transactions.filter((t) => {
    const date = parseISO(t.date);
    if (!isThisMonth(date)) return false;
    if (t.status && t.status !== "POSTED") return false;
    
    // Lógica baseada no tipo de conta
    if (t.accountType === "CREDIT") {
      return t.amount > 0; // Cartão: despesas são positivas
    } else {
      return t.amount < 0; // Conta: despesas são negativas
    }
  });
  
  const currentMonthTotal = currentMonthTransactions.reduce(
    (sum, t) => sum + Math.abs(t.amount), 
    0
  );

  const monthlyInvoices = groupTransactionsByMonth(transactions);
  
  // Média mensal: considerar apenas valores absolutos para média de gastos
  const monthlyAverage = monthlyInvoices.length > 0
    ? monthlyInvoices.reduce((sum, inv) => sum + Math.abs(inv.total), 0) / monthlyInvoices.length
    : 0;

  const categorySpending = getCategorySpending(transactions);
  const largestCategory = categorySpending.length > 0 ? categorySpending[0] : null;

  // Próximas despesas futuras baseado no tipo de conta
  const futureTransactions = transactions
    .filter((t) => {
      if (!isFuture(parseISO(t.date))) return false;
      
      // Filtrar despesas futuras baseado no tipo de conta
      if (t.accountType === "CREDIT") {
        return t.amount > 0; // Cartão: despesas são positivas
      } else {
        return t.amount < 0; // Conta: despesas são negativas
      }
    })
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  
  const nextPayment = futureTransactions.length > 0 ? futureTransactions[0] : null;

  // Total de gastos (despesas) baseado no tipo de conta
  const totalSpending = transactions.filter(t => {
    if (t.status && t.status !== "POSTED") return false;
    
    if (t.accountType === "CREDIT") {
      return t.amount > 0; // Cartão: despesas são positivas
    } else {
      return t.amount < 0; // Conta: despesas são negativas
    }
  }).reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return {
    currentMonthTotal,
    monthlyAverage,
    largestCategory,
    nextPayment,
    totalSpending,
  };
}

export function getUpcomingPayments(transactions: Transaction[], limit: number = 5): Transaction[] {
  return transactions
    .filter((t) => {
      if (!isFuture(parseISO(t.date))) return false;
      if (t.status && t.status !== "POSTED") return false;
      
      // Filtrar despesas futuras baseado no tipo de conta
      if (t.accountType === "CREDIT") {
        return t.amount > 0; // Cartão: despesas são positivas
      } else {
        return t.amount < 0; // Conta: despesas são negativas
      }
    })
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
    .slice(0, limit);
}

export function formatCurrency(amount: number, currencyCode: string = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  try {
    return format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateString;
  }
}

export function formatMonthYear(dateString: string): string {
  try {
    return format(parseISO(dateString), "MMM/yyyy", { locale: ptBR });
  } catch {
    return dateString;
  }
}

// Identificar padrão de parcelamento conforme documento
export interface InstallmentInfo {
  current: number;
  total: number;
  remaining: number;
  hasInstallment: boolean;
}

export function detectInstallment(description: string): InstallmentInfo {
  // Procurar padrão X/Y (ex: "4/10", "3/3", "2/6")
  const installmentPattern = /\s(\d+)\/(\d+)/;
  const match = description.match(installmentPattern);
  
  if (match) {
    const current = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    const remaining = total - current;
    
    return {
      current,
      total,
      remaining,
      hasInstallment: true,
    };
  }
  
  return {
    current: 0,
    total: 0,
    remaining: 0,
    hasInstallment: false,
  };
}

// Calcular projeção de faturas futuras com base em parcelamentos
export function calculateFutureProjections(transactions: Transaction[]): Map<string, number> {
  const projections = new Map<string, number>();
  
  transactions.forEach((transaction) => {
    const installmentInfo = detectInstallment(transaction.description);
    
    if (installmentInfo.hasInstallment && installmentInfo.remaining > 0) {
      // Calcular os próximos meses onde as parcelas aparecerão
      const transactionDate = parseISO(transaction.date);
      
      for (let i = 1; i <= installmentInfo.remaining; i++) {
        const futureDate = new Date(transactionDate);
        futureDate.setMonth(futureDate.getMonth() + i);
        const futureMonthKey = format(futureDate, "yyyy-MM");
        
        const currentProjection = projections.get(futureMonthKey) || 0;
        projections.set(futureMonthKey, currentProjection + transaction.amount);
      }
    }
  });
  
  return projections;
}
