import { format, parseISO, addMonths, startOfMonth, differenceInMonths, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import type { InstallmentInfo, RecurringTransaction, MonthlyProjection, InstallmentProjection } from "../shared/schema";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
  currencyCode?: string;
  status?: string;
  accountType?: "CREDIT" | "CHECKING" | "SAVINGS";
  accountId?: string;
}

export function normalizeTransactionSign(transaction: Transaction): number {
  const amount = transaction.amount;
  const accountType = transaction.accountType;
  
  // IMPORTANTE: Os sinais da API já são contextuais!
  // Para cartão de crédito (CREDIT):
  // - Positivo = despesa (aumenta fatura)
  // - Negativo = pagamento/estorno (diminui fatura)
  // 
  // Para conta corrente/poupança (CHECKING/SAVINGS):
  // - Positivo = entrada de dinheiro (aumenta saldo)
  // - Negativo = saída de dinheiro (diminui saldo)
  //
  // NUNCA inverter o sinal - ele já representa o impacto correto!
  return amount;
}

export function detectInstallment(description: string): InstallmentInfo {
  // CORREÇÃO: Regex melhorada para capturar parcelas com OU sem espaço antes
  // Exemplos válidos: "Mercadolivre*5produto 9/10", "Compra 2/12", "Produto9/10"
  const installmentRegex = /\s?(\d+)\/(\d+)/;
  const match = description.match(installmentRegex);
  
  if (match) {
    const current = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    
    // Validação: total deve ser >= current e ambos > 0
    if (total >= current && current > 0 && total > 0) {
      return {
        hasInstallment: true,
        current,
        total,
        remaining: total - current,
      };
    }
  }
  
  return {
    hasInstallment: false,
    current: 0,
    total: 0,
    remaining: 0,
  };
}

function getBaseDescription(description: string): string {
  // CORREÇÃO: Remove parcelas com ou sem espaço antes (ex: " 9/10" ou "9/10")
  return description.replace(/\s?\d+\/\d+/, '').trim();
}

function areAmountsSimilar(amount1: number, amount2: number, tolerance: number = 0.05): boolean {
  const diff = Math.abs(amount1 - amount2);
  const avg = (Math.abs(amount1) + Math.abs(amount2)) / 2;
  return diff <= avg * tolerance;
}

export function detectRecurringPatterns(transactions: Transaction[]): RecurringTransaction[] {
  const creditTransactions = transactions.filter(t => t.accountType === "CREDIT" && t.amount > 0);
  
  const transactionsByMonth = new Map<string, Transaction[]>();
  creditTransactions.forEach(t => {
    const monthKey = format(parseISO(t.date), "yyyy-MM");
    if (!transactionsByMonth.has(monthKey)) {
      transactionsByMonth.set(monthKey, []);
    }
    transactionsByMonth.get(monthKey)!.push(t);
  });
  
  const sortedMonths = Array.from(transactionsByMonth.keys()).sort();
  
  const descriptionMap = new Map<string, {
    amounts: number[];
    months: string[];
    transactions: Transaction[];
  }>();
  
  creditTransactions.forEach(t => {
    const installmentInfo = detectInstallment(t.description);
    if (installmentInfo.hasInstallment) {
      return;
    }
    
    const baseDesc = getBaseDescription(t.description);
    
    if (!descriptionMap.has(baseDesc)) {
      descriptionMap.set(baseDesc, {
        amounts: [],
        months: [],
        transactions: []
      });
    }
    
    const entry = descriptionMap.get(baseDesc)!;
    const monthKey = format(parseISO(t.date), "yyyy-MM");
    
    if (!entry.months.includes(monthKey)) {
      entry.amounts.push(t.amount);
      entry.months.push(monthKey);
      entry.transactions.push(t);
    }
  });
  
  const recurring: RecurringTransaction[] = [];
  
  descriptionMap.forEach((data, description) => {
    // LÓGICA CORRETA DO DOCUMENTO:
    // Aceita recorrência se apareceu em ≥3 meses QUAISQUER (não precisa ser consecutivo)
    // Exemplo: Jan, Mar, Mai = 3 meses válidos mesmo com "buracos"
    if (data.months.length < 3) {
      return;
    }
    
    // Verifica se os valores são similares (mesma despesa recorrente)
    const avgAmount = data.amounts.reduce((sum, a) => sum + a, 0) / data.amounts.length;
    
    const allSimilar = data.amounts.every(amount => 
      areAmountsSimilar(amount, avgAmount)
    );
    
    if (allSimilar) {
      const sortedMonths = data.months.sort();
      const lastMonth = sortedMonths[sortedMonths.length - 1];
      const lastMonthDate = parseISO(lastMonth + "-01");
      const now = new Date();
      const monthsSinceLastOccurrence = differenceInMonths(now, lastMonthDate);
      
      // Considera ativo se ocorreu nos últimos 2 meses
      const isActive = monthsSinceLastOccurrence <= 2;
      
      recurring.push({
        description,
        amount: avgAmount,
        frequency: data.months.length,
        isActive,
        lastOccurrence: lastMonth,
      });
    }
  });
  
  return recurring.sort((a, b) => b.amount - a.amount);
}

export function calculateCurrentInvoice(transactions: Transaction[]): number {
  // Filtra apenas transações de cartão de crédito
  const creditTransactions = transactions.filter(t => t.accountType === "CREDIT");
  
  if (creditTransactions.length === 0) {
    return 0;
  }
  
  // LÓGICA CORRETA DO DOCUMENTO:
  // A fatura atual é a SOMA de todas as transações desde o último PAGAMENTO de fatura até hoje
  // 
  // Pagamentos de fatura aparecem como valores NEGATIVOS GRANDES (ex: -R$ 2.976,96)
  // Identificação: valor negativo significativo (> R$ 100 em módulo) OU descrição contendo "pagamento"
  
  // Ordena transações por data (mais antiga primeiro)
  const sortedTransactions = [...creditTransactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // DEBUG: Mostra TODAS as transações negativas grandes para análise
  console.log('🔍 DEBUG - Transações negativas (< -100):');
  sortedTransactions.filter(t => t.amount < -100).forEach(t => {
    console.log(`  ${format(parseISO(t.date), 'dd/MM/yyyy')} - R$ ${t.amount.toFixed(2)} - ${t.description}`);
  });
  
  // Encontra o último pagamento de fatura
  // IMPORTANTE: Não confundir estornos/créditos com pagamentos!
  // Pagamento = valor negativo GRANDE (> R$ 1000) OU descrição contendo "pagamento"
  let lastPaymentIndex = -1;
  for (let i = sortedTransactions.length - 1; i >= 0; i--) {
    const t = sortedTransactions[i];
    const desc = (t.description || '').toLowerCase();
    
    // Pagamento precisa ser:
    // 1. Valor negativo E
    // 2. MUITO grande (> R$ 1000) OU descrição contendo "pagamento", "fatura", "pago", "pgt"
    const isPaymentByValue = t.amount < -1000; // Pagamentos são geralmente > R$ 1000
    const isPaymentByDescription = desc.includes('pagamento') || 
                                   desc.includes('fatura') || 
                                   desc.includes('pago') ||
                                   desc.includes('pgt');
    
    const isPayment = t.amount < 0 && (isPaymentByValue || isPaymentByDescription);
    
    if (isPayment) {
      lastPaymentIndex = i;
      console.log(`📍 Último pagamento encontrado: ${format(parseISO(t.date), 'dd/MM/yyyy')} - R$ ${t.amount.toFixed(2)} - ${t.description}`);
      break;
    }
  }
  
  // Se encontrou pagamento, pega transações após ele; senão, pega todas
  const cycleStartIndex = lastPaymentIndex >= 0 ? lastPaymentIndex + 1 : 0;
  const currentCycleTransactions = sortedTransactions.slice(cycleStartIndex);
  
  // Soma TODAS as transações do ciclo (positivas = despesas, negativas = estornos)
  // IMPORTANTE: Manter o sinal! Positivo aumenta fatura, negativo diminui
  const total = currentCycleTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  const cycleStart = lastPaymentIndex >= 0 
    ? format(parseISO(sortedTransactions[lastPaymentIndex].date), 'dd/MM/yyyy')
    : 'início';
  
  console.log(`💰 Fatura atual (desde ${cycleStart}): ${currentCycleTransactions.length} transações, total R$ ${total.toFixed(2)}`);
  
  return total;
}

export function projectFutureInvoices(
  transactions: Transaction[], 
  months: number = 12
): MonthlyProjection[] {
  // CORREÇÃO CONFORME DOCUMENTO:
  // "Para a projeção futura, você precisa analisar TODO o seu histórico de transações 
  // para pegar parcelas antigas que ainda estão rodando."
  
  const creditTransactions = transactions.filter(t => t.accountType === "CREDIT" && t.amount > 0);
  
  const recurringPatterns = detectRecurringPatterns(transactions);
  const activeRecurring = recurringPatterns.filter(r => r.isActive);
  
  // PASSO 1: Consolidar parcelas por SÉRIE de compra
  // SOLUÇÃO CORRETA: Agrupar por chave base e armazenar múltiplas séries quando necessário
  // Chave base: descrição + valor + total de parcelas
  // Cada chave pode ter múltiplas séries (diferentes datas de início)
  
  interface SeriesInfo {
    transaction: Transaction;
    installmentInfo: InstallmentInfo;
    firstParcelDate: Date;
    seriesId: string; // ID único da série (ID da primeira transação encontrada)
  }
  
  const seriesByBaseKey = new Map<string, SeriesInfo[]>();
  
  console.log('\n🔍 ANÁLISE DE PARCELAS PARA PROJEÇÃO:');
  console.log(`Total de transações de crédito: ${creditTransactions.length}`);
  
  creditTransactions.forEach(t => {
    const info = detectInstallment(t.description);
    
    // Debug: mostrar TODAS as parcelas detectadas
    if (info.hasInstallment) {
      console.log(`  ✅ Parcela: ${t.description} | ${info.current}/${info.total} | R$ ${t.amount} | ${format(parseISO(t.date), 'dd/MM/yyyy')}`);
    }
    
    // Ignora parcelas finalizadas (X = Y, sem parcelas restantes)
    if (!info.hasInstallment || info.remaining <= 0) {
      return;
    }
    
    const baseDesc = getBaseDescription(t.description);
    const transactionDate = parseISO(t.date);
    
    // CORREÇÃO CRÍTICA: Calcula a primeira parcela usando a data COMPLETA da transação
    // NÃO usar startOfMonth aqui, pois perde precisão e causa colisões
    const firstParcelDate = addMonths(transactionDate, -(info.current - 1));
    
    // Chave base: descrição + valor + total (pode ter múltiplas séries)
    const baseKey = `${baseDesc}|${t.amount.toFixed(2)}|${info.total}`;
    
    // Busca séries existentes com esta chave base
    let seriesList = seriesByBaseKey.get(baseKey);
    if (!seriesList) {
      seriesList = [];
      seriesByBaseKey.set(baseKey, seriesList);
    }
    
    // ABORDAGEM CONSERVADORA FINAL:
    // Só consolidamos séries se tivermos CERTEZA ABSOLUTA que são a mesma compra
    // Critérios: firstParcelDate idêntico E descrição base idêntica E total idêntico (já garantido pela chave)
    //
    // PORÉM, para evitar perder parcelas:
    // - Se info.current == 1: SEMPRE criar nova série (é uma primeira parcela, pode ser nova compra)
    // - Se info.current > 1: Procurar série existente com mesmo firstParcelDate
    
    let existingSeries: SeriesInfo | undefined = undefined;
    
    if (info.current > 1) {
      // Parcela intermediária - tentar consolidar com série existente
      existingSeries = seriesList.find(s => {
        // Critério 1: Mesma data de primeira parcela (tolerância de 24h por segurança)
        const hoursDiff = Math.abs((s.firstParcelDate.getTime() - firstParcelDate.getTime()) / (1000 * 60 * 60));
        const sameDay = hoursDiff < 24;
        
        // Critério 2: Mesmo total de parcelas (já garantido pela baseKey)
        const sameTotal = s.installmentInfo.total === info.total;
        
        // Critério 3 (CRÍTICO): A parcela atual deve ser POSTERIOR à existente
        // Se a existente já está em 5/12 e esta é 2/12, são SÉRIES DIFERENTES!
        const isProgression = info.current > s.installmentInfo.current;
        
        return sameDay && sameTotal && isProgression;
      });
    }
    
    // Calcula seriesId para logging
    const seriesId = `${format(firstParcelDate, 'yyyy-MM-dd')}|${info.total}p`;
    
    if (!existingSeries) {
      // Nova série
      seriesList.push({
        transaction: t,
        installmentInfo: info,
        firstParcelDate,
        seriesId,
      });
      console.log(`    📌 NOVA série: "${baseDesc}" | R$ ${t.amount} | ${info.current}/${info.total} | Início: ${format(firstParcelDate, 'yyyy-MM-dd HH:mm')} | SeriesID: ${seriesId.substring(0, 30)}...`);
    } else {
      // Atualiza série existente se esta parcela é mais recente
      if (info.current > existingSeries.installmentInfo.current) {
        existingSeries.transaction = t;
        existingSeries.installmentInfo = info;
        console.log(`    🔄 ATUALIZADA série: "${baseDesc}" | ${existingSeries.installmentInfo.current}/${existingSeries.installmentInfo.total} → ${info.current}/${info.total}`);
      }
    }
  });
  
  // Conta o total de séries
  let totalSeries = 0;
  seriesByBaseKey.forEach(series => {
    totalSeries += series.length;
  });
  
  console.log(`\n📊 Total de SÉRIES de parcelas consolidadas: ${totalSeries}`);
  
  // PASSO 2: Projetar parcelas futuras para os próximos N meses
  const projections: MonthlyProjection[] = [];
  const now = new Date();
  
  for (let i = 0; i < months; i++) {
    const targetDate = addMonths(startOfMonth(now), i);
    const monthKey = format(targetDate, "yyyy-MM");
    const month = format(targetDate, "MMMM 'de' yyyy", { locale: ptBR });
    
    const installments: InstallmentProjection[] = [];
    
    // Para cada série de parcelas consolidada, calcular se há parcela neste mês futuro
    seriesByBaseKey.forEach((seriesList) => {
      seriesList.forEach(series => {
        const t = series.transaction;
        const info = series.installmentInfo;
        const baseDesc = getBaseDescription(t.description);
        const transactionDate = parseISO(t.date);
        const transactionMonth = startOfMonth(transactionDate);
        
        // Calcula quantos meses se passaram desde a transação original até o mês alvo
        const monthsSinceTransaction = differenceInMonths(targetDate, transactionMonth);
        
        // LÓGICA CONFORME DOCUMENTO:
        // Se monthsSinceTransaction > 0 (mês futuro) E <= parcelas restantes
        // então projeta a parcela futura
        if (monthsSinceTransaction > 0 && monthsSinceTransaction <= info.remaining) {
          const futureParcelNumber = info.current + monthsSinceTransaction;
          
          // Validação: não pode ultrapassar o total de parcelas
          if (futureParcelNumber <= info.total) {
            installments.push({
              description: baseDesc,
              amount: t.amount,
              parcel: `${futureParcelNumber}/${info.total}`,
              currentParcel: futureParcelNumber,
              totalParcels: info.total,
            });
          }
        }
      });
    });
    
    const recurring: RecurringTransaction[] = activeRecurring.map(r => ({ ...r }));
    
    const installmentsTotal = installments.reduce((sum, inst) => sum + inst.amount, 0);
    const recurringTotal = recurring.reduce((sum, rec) => sum + rec.amount, 0);
    
    projections.push({
      month,
      monthKey,
      total: installmentsTotal + recurringTotal,
      installments,
      recurring,
      breakdown: {
        installmentsTotal,
        recurringTotal,
      },
    });
  }
  
  return projections;
}

export function calculateMonthlyProjections(transactions: Transaction[]) {
  const currentInvoiceTotal = calculateCurrentInvoice(transactions);
  const currentMonth = format(new Date(), "yyyy-MM");
  const currentMonthLabel = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });
  
  // LÓGICA CORRETA: Pega transações do CICLO atual (após último pagamento), não do mês calendário
  const creditTransactions = transactions.filter(t => t.accountType === "CREDIT");
  const sortedTransactions = [...creditTransactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Encontra último pagamento (mesma lógica de calculateCurrentInvoice)
  let lastPaymentIndex = -1;
  for (let i = sortedTransactions.length - 1; i >= 0; i--) {
    const t = sortedTransactions[i];
    const desc = (t.description || '').toLowerCase();
    
    const isPaymentByValue = t.amount < -1000;
    const isPaymentByDescription = desc.includes('pagamento') || 
                                   desc.includes('fatura') || 
                                   desc.includes('pago') ||
                                   desc.includes('pgt');
    
    const isPayment = t.amount < 0 && (isPaymentByValue || isPaymentByDescription);
    
    if (isPayment) {
      lastPaymentIndex = i;
      break;
    }
  }
  
  const cycleStartIndex = lastPaymentIndex >= 0 ? lastPaymentIndex + 1 : 0;
  const currentCycleTransactions = sortedTransactions.slice(cycleStartIndex).filter(t => t.amount > 0);
  
  // Debug: Mostrar TODAS as parcelas do ciclo atual
  console.log('\n📋 PARCELAS NO CICLO ATUAL:');
  const currentInstallments: InstallmentProjection[] = currentCycleTransactions
    .filter(t => {
      const info = detectInstallment(t.description);
      if (info.hasInstallment) {
        console.log(`  ✅ ${t.description} | R$ ${t.amount.toFixed(2)} | ${format(parseISO(t.date), 'dd/MM/yyyy')}`);
      }
      return info.hasInstallment;
    })
    .map(t => {
      const info = detectInstallment(t.description);
      return {
        description: getBaseDescription(t.description),
        amount: t.amount,
        parcel: `${info.current}/${info.total}`,
        currentParcel: info.current,
        totalParcels: info.total,
      };
    });
  
  console.log(`📊 Total de parcelas no ciclo atual: ${currentInstallments.length}`);
  
  const recurringPatterns = detectRecurringPatterns(transactions);
  const currentRecurring = currentCycleTransactions
    .filter(t => {
      const baseDesc = getBaseDescription(t.description);
      return recurringPatterns.some(r => r.description === baseDesc && r.isActive);
    })
    .map(t => {
      const baseDesc = getBaseDescription(t.description);
      const pattern = recurringPatterns.find(r => r.description === baseDesc)!;
      return {
        description: pattern.description,
        amount: t.amount,
        frequency: pattern.frequency,
        isActive: true,
        lastOccurrence: currentMonth,
      };
    });
  
  const currentInstallmentsTotal = currentInstallments.reduce((sum, i) => sum + i.amount, 0);
  const currentRecurringTotal = currentRecurring.reduce((sum, r) => sum + r.amount, 0);
  
  const currentMonthProjection: MonthlyProjection = {
    month: currentMonthLabel,
    monthKey: currentMonth,
    total: currentInvoiceTotal,
    installments: currentInstallments,
    recurring: currentRecurring,
    breakdown: {
      installmentsTotal: currentInstallmentsTotal,
      recurringTotal: currentRecurringTotal,
    },
  };
  
  const futureMonths = projectFutureInvoices(transactions, 12);
  
  return {
    currentMonth: currentMonthProjection,
    futureMonths: futureMonths.slice(1),
  };
}

// ETAPA 2: Abordagem Híbrida - Bills do Pluggy para meses fechados + Cálculo para mês atual
export interface HybridInvoice {
  mes: string;
  ano: number;
  mesKey: string;
  valor: number;
  fonte: 'bill' | 'calculado';
  transacoes?: number;
  detalhes?: string;
}

export function calculateHybridInvoices(
  transactions: Transaction[],
  bills: any[]
): HybridInvoice[] {
  const resultado: HybridInvoice[] = [];
  
  // 1. ADICIONAR BILLS DO PLUGGY (meses fechados)
  console.log('📊 Processando bills (faturas fechadas) do Pluggy...');
  
  for (const bill of bills) {
    // CORREÇÃO: Bills usam dueDate, não date
    if (!bill.dueDate || !bill.totalAmount) continue;
    
    const data = parseISO(bill.dueDate);
    const mes = format(data, "MMMM 'de' yyyy", { locale: ptBR });
    const mesKey = format(data, "yyyy-MM");
    
    resultado.push({
      mes,
      ano: data.getFullYear(),
      mesKey,
      valor: bill.totalAmount,
      fonte: 'bill',
      transacoes: bill.lineItems?.length || 0,
      detalhes: `Fatura fechada do Pluggy com ${bill.lineItems?.length || 0} itens`
    });

    console.log(`✅ Bill de ${mes}: R$ ${bill.totalAmount.toFixed(2)} (${bill.lineItems?.length || 0} itens)`);
  }

  // 2. CALCULAR MÊS ATUAL (fatura aberta)
  console.log('\n⚙️ Calculando fatura atual do mês...');
  
  const faturaAtual = calculateCurrentInvoice(transactions);
  const mesAtual = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });
  const mesKeyAtual = format(new Date(), "yyyy-MM");
  const anoAtual = new Date().getFullYear();
  
  // Conta transações do ciclo atual
  const creditTransactions = transactions.filter(t => t.accountType === "CREDIT");
  const sortedTransactions = [...creditTransactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  let lastPaymentIndex = -1;
  for (let i = sortedTransactions.length - 1; i >= 0; i--) {
    const t = sortedTransactions[i];
    const desc = (t.description || '').toLowerCase();
    const isPaymentByValue = t.amount < -1000;
    const isPaymentByDescription = desc.includes('pagamento') || 
                                   desc.includes('fatura') || 
                                   desc.includes('pago') ||
                                   desc.includes('pgt');
    const isPayment = t.amount < 0 && (isPaymentByValue || isPaymentByDescription);
    
    if (isPayment) {
      lastPaymentIndex = i;
      break;
    }
  }
  
  const cycleStartIndex = lastPaymentIndex >= 0 ? lastPaymentIndex + 1 : 0;
  const currentCycleTransactions = sortedTransactions.slice(cycleStartIndex);
  
  resultado.push({
    mes: mesAtual,
    ano: anoAtual,
    mesKey: mesKeyAtual,
    valor: faturaAtual,
    fonte: 'calculado',
    transacoes: currentCycleTransactions.length,
    detalhes: `Fatura atual calculada com ${currentCycleTransactions.length} transações do ciclo`
  });

  console.log(`💰 Fatura atual (${mesAtual}): R$ ${faturaAtual.toFixed(2)} (${currentCycleTransactions.length} transações)`);

  // Ordenar por ano e mês (mais recente primeiro)
  return resultado.sort((a, b) => {
    if (b.ano !== a.ano) return b.ano - a.ano;
    return b.mesKey.localeCompare(a.mesKey);
  });
}
