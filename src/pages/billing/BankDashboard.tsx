import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, RefreshCw, Download } from "lucide-react";
import { isThisMonth, parseISO } from "date-fns";
import DataCollectionProgress from "@/components/DataCollectionProgress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { fetchWithPluggyAuth } from "@/lib/pluggyClient";
import MonthlyInvoiceCard from "@/components/MonthlyInvoiceCard";
import SummaryCards from "@/components/SummaryCards";
import CategoryPieChart from "@/components/CategoryPieChart";
import MonthlySpendingBarChart from "@/components/MonthlySpendingBarChart";
import SpendingTrendAreaChart from "@/components/SpendingTrendAreaChart";
import UpcomingPaymentsTimeline from "@/components/UpcomingPaymentsTimeline";
import TransactionsTable from "@/components/TransactionsTable";
import {
  Transaction,
  Bill,
  MonthlyInvoice,
  groupTransactionsByMonth,
  getCategorySpending,
  getFinancialSummary,
  getUpcomingPayments,
} from "@/lib/financialUtils";
import { useItems, useRefreshData } from "@/hooks/useBankingData";

interface HybridInvoice {
  mes: string;
  ano: number;
  mesKey: string;
  valor: number;
  fonte: 'bill' | 'calculado';
  transacoes?: number;
  detalhes?: string;
}

interface Account {
  id: string;
  type: string;
  name: string;
  balance: number;
  currencyCode: string;
  itemId: string;
}

async function fetchHybridInvoices(accountId: string): Promise<HybridInvoice[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetchWithPluggyAuth(`/api/pluggy/faturas-hibridas/${accountId}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) return [];
    const data = await response.json();
    return data.faturas || [];
  } catch (error) {
    console.error('❌ Erro ao buscar faturas híbridas:', error);
    return [];
  }
}

function convertHybridToMonthlyInvoice(
  hybrid: HybridInvoice,
  allTransactions: Transaction[]
): MonthlyInvoice {
  const monthTransactions = allTransactions.filter(t => {
    const transactionMonth = t.date.substring(0, 7);
    return transactionMonth === hybrid.mesKey;
  });

  return {
    month: hybrid.mes,
    monthKey: hybrid.mesKey,
    total: hybrid.valor,
    transactions: monthTransactions,
    transactionCount: hybrid.transacoes || monthTransactions.length,
    isFromBill: hybrid.fonte === 'bill',
  };
}

export default function BankDashboard() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  
  const { data: items = [], isLoading: isLoadingItems } = useItems();
  const { refreshAll } = useRefreshData();
  
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [monthlyInvoices, setMonthlyInvoices] = useState<MonthlyInvoice[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [isCollectionDialogOpen, setIsCollectionDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const isLoadingRef = useRef(false);

  const item = useMemo(() => {
    return items.find(i => i.id === itemId);
  }, [items, itemId]);

  const loadTransactions = useCallback(async () => {
    console.log('🔄 loadTransactions chamado, item:', item?.connector_name);
    
    if (!item) {
      console.log('⚠️ Sem item, abortando loadTransactions');
      setIsLoadingTransactions(false);
      return;
    }
    
    if (isLoadingRef.current) {
      console.log('⚠️ Já existe um carregamento em andamento, ignorando chamada duplicada');
      return;
    }
    
    try {
      isLoadingRef.current = true;
      setIsLoadingTransactions(true);
      console.log(`🚀 Iniciando carregamento ISOLADO de transações para ${item.connector_name} (${item.id})`);
      
      // ==========================================
      // NOVO: Usar endpoint ISOLADO por banco
      // ==========================================
      const transactionsRes = await fetchWithPluggyAuth(`/api/pluggy/transactions/${item.id}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log(`📡 Resposta do endpoint isolado recebida: Status ${transactionsRes.status}`);
      
      if (!transactionsRes.ok) {
        throw new Error(`Erro ao buscar transações: ${transactionsRes.status} ${transactionsRes.statusText}`);
      }
      
      const transactionsData = await transactionsRes.json();
      console.log(`✅ ${transactionsData.length} transações carregadas do endpoint isolado para ${item.connector_name}`);
      console.log(`📊 Transações com bankItemId:`, transactionsData[0]?.bankItemId ? 'SIM' : 'NÃO');
      
      // Extrair contas únicas das transações
      const accountsMap = new Map<string, Account>();
      transactionsData.forEach((t: any) => {
        if (t.accountId && !accountsMap.has(t.accountId)) {
          accountsMap.set(t.accountId, {
            id: t.accountId,
            name: t.accountName || 'Conta',
            type: t.accountType || 'CHECKING',
            balance: 0,
            currencyCode: 'BRL',
            itemId: item.id
          });
        }
      });
      const accounts = Array.from(accountsMap.values());
      console.log(`📊 ${accounts.length} contas identificadas`);
      
      setAllAccounts(accounts);
      setAllTransactions(transactionsData);
      
      // Buscar bills apenas para contas de crédito
      const creditAccounts = accounts.filter(acc => acc.type === 'CREDIT');
      console.log(`💳 ${creditAccounts.length} contas de crédito encontradas`);
      
      if (creditAccounts.length > 0) {
        const billsPromises = creditAccounts.map(async (account) => {
          try {
            const response = await fetchWithPluggyAuth(`/api/pluggy/bills?accountId=${account.id}`);
            const data = await response.json();
            return data.results || [];
          } catch (err) {
            console.error(`Erro ao buscar bills da conta ${account.id}:`, err);
            return [];
          }
        });
        
        const billsArrays = await Promise.all(billsPromises);
        const allBillsRaw = billsArrays.flat();
        console.log(`📋 ${allBillsRaw.length} bills carregadas`);
        setAllBills(allBillsRaw);
      } else {
        setAllBills([]);
      }
      
    } catch (error) {
      console.error("❌ Erro ao carregar transações:", error);
      setAllTransactions([]);
      setAllBills([]);
      setAllAccounts([]);
    } finally {
      console.log('🏁 Finalizando loadTransactions, desligando loading');
      setIsLoadingTransactions(false);
      isLoadingRef.current = false;
    }
  }, [item]);

  // Carregar dados do localStorage quando itemId mudar
  useEffect(() => {
    console.log(`🔄 Mudança de banco detectada: ${itemId}`);
    
    // Se não há itemId, não fazer nada
    if (!itemId) {
      console.log('⚠️ Sem itemId, abortando carregamento');
      return;
    }
    
    // Cancela qualquer carregamento anterior
    if (isLoadingRef.current) {
      console.log('⚠️ Cancelando carregamento anterior');
      isLoadingRef.current = false;
      setIsLoadingTransactions(false);
    }
    
    // Limpa estados anteriores IMEDIATAMENTE para evitar dados misturados
    setAllTransactions([]);
    setAllBills([]);
    setAllAccounts([]);
    setMonthlyInvoices([]);
    setSelectedMonthKey(null);
    
    const cachedTransactions = localStorage.getItem(`bank_${itemId}_transactions`);
    const cachedBills = localStorage.getItem(`bank_${itemId}_bills`);
    const cachedAccounts = localStorage.getItem(`bank_${itemId}_accounts`);
    const cachedInvoices = localStorage.getItem(`bank_${itemId}_invoices`);
    
    const transactions = cachedTransactions ? JSON.parse(cachedTransactions) : [];
    const bills = cachedBills ? JSON.parse(cachedBills) : [];
    const accounts = cachedAccounts ? JSON.parse(cachedAccounts) : [];
    const invoices = cachedInvoices ? JSON.parse(cachedInvoices) : [];
    
    console.log(`📊 Dados do cache para ${itemId.substring(0, 8)}:`, {
      transactions: transactions.length,
      bills: bills.length,
      accounts: accounts.length,
      invoices: invoices.length
    });
    
    // Aplica dados do cache com pequeno delay para garantir limpeza
    setTimeout(() => {
      setAllTransactions(transactions);
      setAllBills(bills);
      setAllAccounts(accounts);
      setMonthlyInvoices(invoices);
    }, 0);
    
    // Se não houver transações no cache, carregar do servidor
    if (transactions.length === 0 && !isLoadingRef.current && item) {
      console.log(`⚠️ Sem cache, carregando do servidor para ${item.connector_name}...`);
      setTimeout(() => loadTransactions(), 100);
    }
  }, [itemId]); // REMOVIDO 'item' e 'loadTransactions' das dependências para evitar loop

  // Timeout de segurança para loading infinito
  useEffect(() => {
    if (!isLoadingTransactions) return;
    
    const timeout = setTimeout(() => {
      console.warn('⏱️ TIMEOUT: Forçando finalização do loading após 30s');
      setIsLoadingTransactions(false);
      isLoadingRef.current = false;
    }, 30000);
    
    return () => clearTimeout(timeout);
  }, [isLoadingTransactions]);

  // Salvar dados no localStorage sempre que mudarem (COM DEBOUNCE para evitar loops)
  useEffect(() => {
    if (allTransactions.length > 0 && itemId) {
      const timeoutId = setTimeout(() => {
        console.log(`💾 Salvando ${allTransactions.length} transações no cache do banco ${itemId.substring(0, 8)}`);
        localStorage.setItem(`bank_${itemId}_transactions`, JSON.stringify(allTransactions));
      }, 500); // Debounce de 500ms
      return () => clearTimeout(timeoutId);
    }
  }, [allTransactions, itemId]);

  useEffect(() => {
    if (allBills.length > 0 && itemId) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(`bank_${itemId}_bills`, JSON.stringify(allBills));
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [allBills, itemId]);

  useEffect(() => {
    if (allAccounts.length > 0 && itemId) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(`bank_${itemId}_accounts`, JSON.stringify(allAccounts));
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [allAccounts, itemId]);

  useEffect(() => {
    if (monthlyInvoices.length > 0 && itemId) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(`bank_${itemId}_invoices`, JSON.stringify(monthlyInvoices));
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [monthlyInvoices, itemId]);

  useEffect(() => {
    const loadMonthlyInvoices = async () => {
      const creditAccounts = allAccounts.filter(acc => acc.type === 'CREDIT');
      
      if (creditAccounts.length === 0) {
        const invoices = groupTransactionsByMonth(allTransactions, allBills);
        setMonthlyInvoices(invoices);
        return;
      }

      const allHybridInvoices: HybridInvoice[] = [];
      
      for (const account of creditAccounts) {
        const hybridInvoices = await fetchHybridInvoices(account.id);
        allHybridInvoices.push(...hybridInvoices);
      }

      const invoices = allHybridInvoices
        .map(hybrid => convertHybridToMonthlyInvoice(hybrid, allTransactions))
        .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

      setMonthlyInvoices(invoices);
    };

    if (allAccounts.length > 0) {
      loadMonthlyInvoices();
    }
  }, [allAccounts, allTransactions, allBills]);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      console.log(`🔄 Atualizando dados do ${item?.connector_name}...`);
      
      // Limpar localStorage primeiro
      localStorage.removeItem(`bank_${itemId}_transactions`);
      localStorage.removeItem(`bank_${itemId}_bills`);
      localStorage.removeItem(`bank_${itemId}_accounts`);
      localStorage.removeItem(`bank_${itemId}_invoices`);
      
      // Limpar estados
      setAllTransactions([]);
      setAllBills([]);
      setAllAccounts([]);
      setMonthlyInvoices([]);
      
      // Resetar o ref de loading para permitir nova carga
      isLoadingRef.current = false;
      
      refreshAll();
      
      // Recarrega as transações
      await loadTransactions();
      
      toast({
        title: "✅ Dados atualizados!",
        description: `Os dados do ${item?.connector_name} foram atualizados.`,
      });
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast({
        title: "❌ Erro ao atualizar",
        description: "Não foi possível atualizar os dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCompleteCollection = (dados: any) => {
    console.log('📦 Coleta completa recebida:', dados);
    
    if (dados.transacoes && Array.isArray(dados.transacoes)) {
      const uniqueTransactionsMap = new Map<string, Transaction>();
      dados.transacoes.forEach((t: Transaction) => {
        if (!uniqueTransactionsMap.has(t.id)) {
          uniqueTransactionsMap.set(t.id, t);
        }
      });
      const uniqueTransactions = Array.from(uniqueTransactionsMap.values());
      setAllTransactions(uniqueTransactions);
    }
    
    if (dados.faturas && Array.isArray(dados.faturas)) {
      setAllBills(dados.faturas);
    }
    
    setIsCollectionDialogOpen(false);
    
    toast({
      title: "✅ Coleta completa!",
      description: dados.fromCache 
        ? "Dados carregados do cache (atualizados recentemente)"
        : `${dados.transacoes?.length || 0} transações coletadas.`,
    });
  };

  const handleCollectionError = (erro: string) => {
    console.error('❌ Erro na coleta:', erro);
    setIsCollectionDialogOpen(false);
    
    toast({
      title: "Erro na coleta de dados",
      description: erro || "Não foi possível completar a coleta. Tente novamente.",
      variant: "destructive",
    });
  };

  // ==========================================
  // CÁLCULOS COM useMemo PARA PERFORMANCE
  // IMPORTANTE: Hooks DEVEM estar ANTES dos early returns
  // ==========================================
  const categorySpending = useMemo(() => {
    if (allTransactions.length === 0) return [];
    console.log(`📊 Calculando gastos por categoria: ${allTransactions.length} transações`);
    return getCategorySpending(allTransactions);
  }, [allTransactions]);

  const financialSummary = useMemo(() => {
    if (allTransactions.length === 0) {
      return {
        currentMonthTotal: 0,
        monthlyAverage: 0,
        largestCategory: null,
        nextPayment: null,
        totalSpending: 0,
      };
    }
    console.log(`💰 Calculando resumo financeiro: ${allTransactions.length} transações`);
    return getFinancialSummary(allTransactions);
  }, [allTransactions]);

  const upcomingPayments = useMemo(() => {
    if (allTransactions.length === 0) return [];
    return getUpcomingPayments(allTransactions, 5);
  }, [allTransactions]);

  const selectedInvoice = selectedMonthKey 
    ? monthlyInvoices.find(inv => inv.monthKey === selectedMonthKey)
    : null;

  // ==========================================
  // EARLY RETURNS - Devem vir APÓS todos os hooks
  // ==========================================
  if (isLoadingItems) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">
                Banco não encontrado
              </h2>
              <p className="text-muted-foreground">
                O banco solicitado não foi encontrado ou não está mais conectado.
              </p>
            </div>
            <Button onClick={() => navigate('/faturamento/dashboard')} size="lg" className="w-full">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Voltar ao Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/faturamento/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-foreground tracking-tight gradient-text">📊 {item.connector_name}</h1>
              <p className="text-xl text-muted-foreground/80">
                Análise financeira específica desta conta
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="lg"
              disabled={isRefreshing || isLoadingTransactions}
            >
              <RefreshCw className={`h-5 w-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
            <Button 
              onClick={() => setIsCollectionDialogOpen(true)} 
              variant="default" 
              size="lg"
            >
              <Download className="h-5 w-5 mr-2" />
              Coleta Completa
            </Button>
          </div>
        </div>

        {isLoadingTransactions ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Carregando análise financeira...</p>
            </div>
          </div>
        ) : allTransactions.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              Nenhuma transação encontrada. Aguarde a sincronização dos seus dados bancários.
            </p>
          </Card>
        ) : (
          <>
            <SummaryCards summary={financialSummary} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {monthlyInvoices.map((invoice) => {
                const firstTransactionDate = invoice.transactions && invoice.transactions.length > 0 
                  ? invoice.transactions[0].date 
                  : invoice.monthKey + '-01';
                const isCurrent = isThisMonth(parseISO(firstTransactionDate));
                return (
                  <MonthlyInvoiceCard
                    key={invoice.monthKey}
                    invoice={invoice}
                    isCurrentMonth={isCurrent}
                    onClick={() => setSelectedMonthKey(
                      selectedMonthKey === invoice.monthKey ? null : invoice.monthKey
                    )}
                  />
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {categorySpending.length > 0 && (
                <CategoryPieChart data={categorySpending} />
              )}
              {monthlyInvoices.length > 0 && (
                <MonthlySpendingBarChart data={monthlyInvoices} />
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {monthlyInvoices.length > 0 && (
                <div className="lg:col-span-2">
                  <SpendingTrendAreaChart data={monthlyInvoices} />
                </div>
              )}
              <UpcomingPaymentsTimeline payments={upcomingPayments} />
            </div>

            {selectedInvoice && (
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold capitalize">
                      Transações de {selectedInvoice.month}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMonthKey(null)}
                    >
                      Limpar filtro
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">Data</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Descrição</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Categoria</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedInvoice.transactions.map((transaction) => {
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

                            return (
                              <tr key={transaction.id} className="hover:bg-muted/50 transition-colors">
                                <td className="px-4 py-3 text-sm">{formatDate(transaction.date)}</td>
                                <td className="px-4 py-3 text-sm">{transaction.description}</td>
                                <td className="px-4 py-3 text-sm text-muted-foreground capitalize">
                                  {transaction.category || "Outros"}
                                </td>
                                <td className={`px-4 py-3 text-sm text-right font-medium ${
                                  transaction.amount < 0 ? 'text-destructive' : 'text-chart-2'
                                }`}>
                                  {formatCurrency(transaction.amount, transaction.currencyCode)}
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
            )}

            <TransactionsTable transactions={allTransactions} />
          </>
        )}
      </div>

      <Dialog open={isCollectionDialogOpen} onOpenChange={setIsCollectionDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Coleta Completa de Dados</DialogTitle>
            <DialogDescription>
              Coletando todos os dados bancários com progresso em tempo real
            </DialogDescription>
          </DialogHeader>
          
          {item && (
            <DataCollectionProgress
              itemId={item.id}
              forceRefresh={true}
              onComplete={handleCompleteCollection}
              onError={handleCollectionError}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
