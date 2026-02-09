import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Building2, Loader2, RefreshCw, Download } from "lucide-react";
import { isThisMonth, parseISO } from "date-fns";
import PluggyModal from "@/components/PluggyModal";
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

export default function Dashboard() {
  const { data: items = [], isLoading, refetch: refetchItems } = useItems();
  const { refreshAll } = useRefreshData();
  
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [monthlyInvoices, setMonthlyInvoices] = useState<MonthlyInvoice[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [isCollectionDialogOpen, setIsCollectionDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastItemsKeyRef = useRef<string>('');
  const { toast } = useToast();

  // Carregar dados do localStorage quando items mudarem
  useEffect(() => {
    // Criar chave única baseada nos IDs dos items
    const itemsKey = items.map(i => i.id).sort().join('-');
    
    // CORREÇÃO: Evitar loop infinito - só executar se a chave realmente mudou
    if (itemsKey === lastItemsKeyRef.current) {
      console.log(`⏭️ Items key não mudou, pulando reload`);
      return;
    }
    
    console.log(`🔑 Items key mudou: ${lastItemsKeyRef.current} → ${itemsKey.substring(0, 20)}...`);
    lastItemsKeyRef.current = itemsKey;
    
    if (items.length === 0) {
      // Se não há items, limpar tudo apenas se havia dados antes
      if (allTransactions.length > 0 || allAccounts.length > 0) {
        console.log('🧹 Limpando dados (sem bancos conectados)');
        setAllTransactions([]);
        setAllBills([]);
        setAllAccounts([]);
        setMonthlyInvoices([]);
      }
      return;
    }

    console.log(`📊 Dashboard - Items key: ${itemsKey.substring(0, 20)}...`);
    
    // Carregar do cache
    const cachedTransactions = localStorage.getItem('dashboard_transactions');
    const cachedBills = localStorage.getItem('dashboard_bills');
    const cachedAccounts = localStorage.getItem('dashboard_accounts');
    const cachedInvoices = localStorage.getItem('dashboard_invoices');
    const cachedItemsKey = localStorage.getItem('dashboard_items_key');
    
    const transactions = cachedTransactions ? JSON.parse(cachedTransactions) : [];
    const bills = cachedBills ? JSON.parse(cachedBills) : [];
    const accounts = cachedAccounts ? JSON.parse(cachedAccounts) : [];
    const invoices = cachedInvoices ? JSON.parse(cachedInvoices) : [];
    
    console.log(`📦 Dados do cache do dashboard:`, {
      transactions: transactions.length,
      bills: bills.length,
      accounts: accounts.length,
      invoices: invoices.length,
      cachedKey: cachedItemsKey?.substring(0, 20)
    });
    
    // Se a chave mudou (novos bancos), limpar cache e recarregar
    if (cachedItemsKey !== itemsKey) {
      console.log(`🔄 Items mudaram, recarregando dados...`);
      localStorage.setItem('dashboard_items_key', itemsKey);
      
      // CORREÇÃO: Usar setTimeout para evitar conflitos com HMR
      setTimeout(() => {
        console.log(`⏰ setTimeout: Chamando loadAllTransactions agora...`);
        loadAllTransactions();
      }, 100);
    } else if (transactions.length > 0) {
      // Usar dados do cache
      console.log(`✅ Usando dados do cache do dashboard`);
      setAllTransactions(transactions);
      setAllBills(bills);
      setAllAccounts(accounts);
      setMonthlyInvoices(invoices);
    } else {
      // Sem cache, carregar do servidor
      console.log(`⚠️ Sem cache, carregando do servidor...`);
      
      // CORREÇÃO: Usar setTimeout para evitar conflitos com HMR
      setTimeout(() => {
        console.log(`⏰ setTimeout: Chamando loadAllTransactions agora...`);
        loadAllTransactions();
      }, 100);
    }
  }, [items]);

  // Atualizar quando um novo banco é conectado
  useEffect(() => {
    const handleItemAdded = () => {
      console.log('🔄 Novo banco conectado - invalidando cache...');
      // Limpar localStorage
      localStorage.removeItem('dashboard_transactions');
      localStorage.removeItem('dashboard_bills');
      localStorage.removeItem('dashboard_accounts');
      localStorage.removeItem('dashboard_invoices');
      localStorage.removeItem('dashboard_items_key');
      refreshAll();
      refetchItems();
    };
    
    window.addEventListener('pluggy-item-added', handleItemAdded);
    return () => window.removeEventListener('pluggy-item-added', handleItemAdded);
  }, [refreshAll, refetchItems]);

  // Salvar dados no localStorage com debounce
  useEffect(() => {
    if (allTransactions.length > 0) {
      const timeoutId = setTimeout(() => {
        console.log(`💾 Salvando ${allTransactions.length} transações no cache do dashboard`);
        localStorage.setItem('dashboard_transactions', JSON.stringify(allTransactions));
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [allTransactions]);

  useEffect(() => {
    if (allBills.length > 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('dashboard_bills', JSON.stringify(allBills));
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [allBills]);

  useEffect(() => {
    if (allAccounts.length > 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('dashboard_accounts', JSON.stringify(allAccounts));
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [allAccounts]);

  useEffect(() => {
    if (monthlyInvoices.length > 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('dashboard_invoices', JSON.stringify(monthlyInvoices));
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [monthlyInvoices]);

  useEffect(() => {
    const loadMonthlyInvoices = async () => {
      const creditAccounts = allAccounts.filter(acc => acc.type === 'CREDIT');
      
      console.log(`💳 Total de contas de crédito encontradas: ${creditAccounts.length}`);
      console.log(`📊 Total de contas (todas): ${allAccounts.length}`);
      console.log(`🏦 Contas por item:`, allAccounts.reduce((acc, account) => {
        acc[account.itemId] = (acc[account.itemId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));
      
      if (creditAccounts.length === 0) {
        const invoices = groupTransactionsByMonth(allTransactions, allBills);
        setMonthlyInvoices(invoices);
        return;
      }

      const allHybridInvoices: HybridInvoice[] = [];
      
      for (const account of creditAccounts) {
        console.log(`🔍 Buscando faturas para conta ${account.name} (${account.id})...`);
        const hybridInvoices = await fetchHybridInvoices(account.id);
        console.log(`✅ ${hybridInvoices.length} faturas retornadas para ${account.name}`);
        allHybridInvoices.push(...hybridInvoices);
      }

      console.log(`📦 Total de faturas híbridas coletadas: ${allHybridInvoices.length}`);

      // AGREGAR faturas do mesmo mês de diferentes bancos
      const invoicesByMonth = new Map<string, {
        mes: string;
        ano: number;
        mesKey: string;
        valor: number;
        fonte: 'bill' | 'calculado';
        transacoes: number;
        detalhes: string;
        sources: string[];
      }>();

      allHybridInvoices.forEach(hybrid => {
        const existing = invoicesByMonth.get(hybrid.mesKey);
        if (existing) {
          // SOMAR valores do mesmo mês
          console.log(`➕ Somando ${hybrid.mesKey}: ${existing.valor.toFixed(2)} + ${hybrid.valor.toFixed(2)} = ${(existing.valor + hybrid.valor).toFixed(2)}`);
          existing.valor += hybrid.valor;
          existing.transacoes = existing.transacoes + (hybrid.transacoes || 0);
          existing.sources.push(`${hybrid.fonte}: R$ ${hybrid.valor.toFixed(2)}`);
        } else {
          console.log(`🆕 Nova fatura para ${hybrid.mesKey}: R$ ${hybrid.valor.toFixed(2)}`);
          invoicesByMonth.set(hybrid.mesKey, {
            mes: hybrid.mes,
            ano: hybrid.ano,
            mesKey: hybrid.mesKey,
            valor: hybrid.valor,
            fonte: hybrid.fonte,
            transacoes: hybrid.transacoes || 0,
            detalhes: hybrid.detalhes || '',
            sources: [`${hybrid.fonte}: R$ ${hybrid.valor.toFixed(2)}`]
          });
        }
      });

      const invoices = Array.from(invoicesByMonth.values())
        .map(aggregated => {
          console.log(`📊 Agregação final ${aggregated.mesKey}: ${aggregated.sources.join(' + ')} = R$ ${aggregated.valor.toFixed(2)}`);
          return convertHybridToMonthlyInvoice(aggregated, allTransactions);
        })
        .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

      console.log('📊 Faturas agregadas por mês:', invoices.map(inv => 
        `${inv.month}: R$ ${inv.total.toFixed(2)}`
      ).join(', '));

      setMonthlyInvoices(invoices);
    };

    if (allAccounts.length > 0) {
      loadMonthlyInvoices();
    }
  }, [allAccounts, allTransactions, allBills]);

  const loadAllTransactions = async () => {
    console.log(`\n\n🚀 ===== LOADALLTRANSACTIONS CHAMADO =====`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log(`📊 Items disponíveis: ${items.length}`);
    
    try {
      console.log(`🔄 Definindo isLoadingTransactions = true`);
      setIsLoadingTransactions(true);
      console.log(`✅ isLoadingTransactions definido`);
      
      console.log(`\n🔍 ===== BUSCANDO CONTAS =====`);
      console.log(`🏦 Items conectados:`, items.map(i => `${i.connector_name} (${i.id})`).join(', '));
      
      const allAccountsPromises = items.map(async (item) => {
        try {
          console.log(`🚀 [${item.connector_name}] Iniciando busca de contas...`);
          
          // SOLUÇÃO: Usar fetch nativo diretamente para evitar problemas com HMR
          const url = `/api/pluggy/items/${item.id}/accounts`;
          console.log(`📡 [${item.connector_name}] Chamando fetch direto para: ${url}`);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          console.log(`✅ [${item.connector_name}] Resposta recebida - Status: ${response.status}`);
          
          if (!response.ok) {
            console.error(`❌ [${item.connector_name}] Resposta não-OK: ${response.status}`);
            return { results: [] };
          }
          
          const data = await response.json();
          console.log(`📦 [${item.connector_name}] ${data.results?.length || 0} conta(s) encontrada(s)`);
          return data;
        } catch (err) {
          console.error(`❌ [${item.connector_name}] Erro ao buscar contas:`, err);
          return { results: [] };
        }
      });

      const accountsResponses = await Promise.all(allAccountsPromises);
      const accounts: Account[] = accountsResponses.flatMap(res => res.results || []);
      
      console.log(`✅ TOTAL: ${accounts.length} conta(s) encontrada(s) de ${items.length} banco(s)`);
      console.log(`📋 Distribuição de contas:`, accounts.map(a => `${a.name} (${a.type})`).join(', '));
      setAllAccounts(accounts);

      const fetchAllTransactionsForAccount = async (account: Account): Promise<Transaction[]> => {
        const allTransactions: Transaction[] = [];
        let page = 1;
        let totalPages = 1;

        const to = new Date().toISOString().split('T')[0];
        const from = new Date();
        from.setMonth(from.getMonth() - 12);
        const fromDate = from.toISOString().split('T')[0];

        console.log(`🔍 [${account.name}] ===== INÍCIO DO FETCH =====`);
        console.log(`📅 [${account.name}] Período: ${fromDate} até ${to}`);
        console.log(`🆔 [${account.name}] Account ID: ${account.id}`);

        while (page <= totalPages) {
          console.log(`\n🔄 [${account.name}] ===== LOOP PÁGINA ${page}/${totalPages} =====`);
          
          try {
            const url = `/api/pluggy/transactions?accountId=${account.id}&page=${page}&pageSize=500&from=${fromDate}&to=${to}`;
            console.log(`📡 [${account.name}] Requisição: ${url}`);
            
            const response = await fetchWithPluggyAuth(url);
            console.log(`✅ [${account.name}] Resposta recebida - Status: ${response.status}, OK: ${response.ok}`);
            
            if (!response.ok) {
              console.error(`❌ [${account.name}] Resposta não-OK: ${response.status} ${response.statusText}`);
              const errorText = await response.text();
              console.error(`❌ [${account.name}] Corpo do erro: ${errorText.substring(0, 500)}`);
              break;
            }
            
            const data = await response.json();
            console.log(`📦 [${account.name}] JSON parseado com sucesso`);
            console.log(`📊 [${account.name}] Estrutura:`, {
              hasResults: !!data.results,
              resultsLength: data.results?.length || 0,
              totalPages: data.totalPages,
              page: data.page,
              total: data.total
            });
            
            const transactionsWithAccountInfo = (data.results || []).map((t: Transaction) => ({
              ...t,
              accountType: account.type,
              accountId: account.id,
            }));
            
            console.log(`➕ [${account.name}] Adicionando ${transactionsWithAccountInfo.length} transações`);
            allTransactions.push(...transactionsWithAccountInfo);
            
            const previousTotalPages = totalPages;
            totalPages = data.totalPages || 1;
            
            if (previousTotalPages !== totalPages) {
              console.log(`📊 [${account.name}] totalPages atualizado: ${previousTotalPages} → ${totalPages}`);
            }
            
            console.log(`📄 [${account.name}] Página ${page}/${totalPages} OK: ${transactionsWithAccountInfo.length} novas, ${allTransactions.length} total acumulado`);
            
            if (page >= totalPages) {
              console.log(`🏁 [${account.name}] Última página alcançada (${page} >= ${totalPages})`);
            }
            
            page++;
            console.log(`➡️ [${account.name}] Próxima página: ${page}`);
            
          } catch (err) {
            console.error(`❌ [${account.name}] EXCEÇÃO na página ${page}:`, err);
            console.error(`❌ [${account.name}] Tipo:`, err instanceof Error ? err.message : String(err));
            console.error(`❌ [${account.name}] Stack:`, err instanceof Error ? err.stack : 'N/A');
            break;
          }
        }

        console.log(`\n✅ [${account.name}] ===== LOOP FINALIZADO =====`);
        console.log(`📊 [${account.name}] Total coletado: ${allTransactions.length} transações de ${page - 1} página(s)`);
        return allTransactions;
      };

      const fetchBillsForAccount = async (account: Account): Promise<Bill[]> => {
        if (account.type !== "CREDIT") {
          console.log(`⏭️ [${account.name}] Pulando bills (não é conta CREDIT)`);
          return [];
        }

        console.log(`💳 [${account.name}] Buscando bills...`);
        try {
          const response = await fetchWithPluggyAuth(`/api/pluggy/bills?accountId=${account.id}`);
          console.log(`✅ [${account.name}] Resposta bills recebida - Status: ${response.status}`);
          
          if (!response.ok) {
            console.error(`❌ [${account.name}] Erro ao buscar bills: ${response.status}`);
            return [];
          }
          
          const data = await response.json();
          const bills = data.results || [];
          console.log(`📦 [${account.name}] ${bills.length} bills encontrados`);
          return bills;
        } catch (err) {
          console.error(`❌ [${account.name}] Exceção ao buscar bills:`, err);
          return [];
        }
      };

      console.log(`\n🔄 ===== INICIANDO BUSCA PARALELA =====`);
      console.log(`📊 Total de contas a processar: ${accounts.length}`);
      
      const transactionsPromises = accounts.map((account, index) => {
        console.log(`🚀 [${index + 1}/${accounts.length}] Criando promise de transações para ${account.name} (${account.id})`);
        return fetchAllTransactionsForAccount(account);
      });

      const billsPromises = accounts.map((account, index) => {
        console.log(`🚀 [${index + 1}/${accounts.length}] Criando promise de bills para ${account.name} (${account.id})`);
        return fetchBillsForAccount(account);
      });

      console.log(`\n⏳ Aguardando ${transactionsPromises.length} promises de transações...`);
      console.log(`⏳ Aguardando ${billsPromises.length} promises de bills...`);
      console.log(`⏰ Início do Promise.all: ${new Date().toISOString()}`);

      const [transactionsArrays, billsArrays] = await Promise.all([
        Promise.all(transactionsPromises),
        Promise.all(billsPromises)
      ]);

      console.log(`⏰ Fim do Promise.all: ${new Date().toISOString()}`);
      console.log(`✅ Todas as promises concluídas!`);
      console.log(`📊 Arrays de transações:`, transactionsArrays.map((arr, i) => `Conta ${i}: ${arr.length} transações`));
      console.log(`📊 Arrays de bills:`, billsArrays.map((arr, i) => `Conta ${i}: ${arr.length} bills`));

      console.log(`\n🔧 ===== PROCESSAMENTO FINAL =====`);
      const allTransRaw: Transaction[] = transactionsArrays.flat();
      const allBillsRaw: Bill[] = billsArrays.flat();
      console.log(`📦 Total bruto: ${allTransRaw.length} transações, ${allBillsRaw.length} bills`);
      
      const uniqueTransactionsMap = new Map<string, Transaction>();
      allTransRaw.forEach(t => {
        if (!uniqueTransactionsMap.has(t.id)) {
          uniqueTransactionsMap.set(t.id, t);
        }
      });
      const allTrans = Array.from(uniqueTransactionsMap.values());
      console.log(`🔍 Após deduplicação: ${allTrans.length} transações únicas`);
      
      console.log(`\n💾 ===== ATUALIZANDO ESTADO =====`);
      console.log(`📝 Chamando setAllTransactions com ${allTrans.length} transações`);
      setAllTransactions(allTrans);
      console.log(`✅ setAllTransactions executado`);
      
      console.log(`📝 Chamando setAllBills com ${allBillsRaw.length} bills`);
      setAllBills(allBillsRaw);
      console.log(`✅ setAllBills executado`);
      
      console.log(`📝 Chamando setIsLoadingTransactions(false)`);
      setIsLoadingTransactions(false);
      console.log(`✅ setIsLoadingTransactions executado`);
      
      console.log(`\n🎉 ===== CARREGAMENTO COMPLETO =====`);
      console.log(`📊 RESUMO FINAL: ${allTrans.length} transações e ${allBillsRaw.length} bills carregados`);
    } catch (error) {
      console.error(`\n❌ ===== ERRO FATAL NO CARREGAMENTO =====`);
      console.error("❌ Erro ao carregar transações:", error);
      console.error("❌ Tipo de erro:", error instanceof Error ? error.message : String(error));
      console.error("❌ Stack trace:", error instanceof Error ? error.stack : 'N/A');
      
      console.log(`\n🔧 Limpando estado devido ao erro...`);
      setAllTransactions([]);
      setAllBills([]);
      setIsLoadingTransactions(false);
      console.log(`✅ Estado limpo`);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      console.log('🔄 Atualizando todos os dados...');
      
      // Limpar localStorage primeiro
      localStorage.removeItem('dashboard_transactions');
      localStorage.removeItem('dashboard_bills');
      localStorage.removeItem('dashboard_accounts');
      localStorage.removeItem('dashboard_invoices');
      localStorage.removeItem('dashboard_items_key');
      
      // Limpar estados
      setAllTransactions([]);
      setAllBills([]);
      setAllAccounts([]);
      setMonthlyInvoices([]);
      
      // Invalida todos os caches do React Query
      refreshAll();
      
      // Recarrega items
      await refetchItems();
      
      // Força recarregar transações
      await loadAllTransactions();
      
      toast({
        title: "✅ Dados atualizados!",
        description: "Seus dados bancários foram atualizados com sucesso.",
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
      console.log(`✅ ${uniqueTransactions.length} transações atualizadas`);
    }
    
    if (dados.faturas && Array.isArray(dados.faturas)) {
      setAllBills(dados.faturas);
      console.log(`✅ ${dados.faturas.length} faturas atualizadas`);
    }
    
    setIsCollectionDialogOpen(false);
    
    toast({
      title: "✅ Coleta completa!",
      description: `${dados.transacoes?.length || 0} transações e ${dados.faturas?.length || 0} faturas coletadas.`,
    });
  };

  const handleExportCSV = () => {
    if (allTransactions.length === 0) {
      toast({
        title: "Sem dados para exportar",
        description: "Conecte um banco primeiro para exportar transações.",
        variant: "destructive",
      });
      return;
    }

    const csvHeaders = ["Data", "Descrição", "Valor", "Tipo", "Categoria", "Banco"];
    const csvRows = allTransactions.map((t) => [
      t.date,
      t.description,
      t.amount.toString(),
      t.type,
      t.category || "",
      t.accountId || "",
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `transacoes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "✅ CSV Exportado!",
      description: `${allTransactions.length} transações exportadas com sucesso.`,
    });
  };

  // Combinar transações + faturas em um único array
  const combinedTransactions = useMemo(() => {
    // Converter faturas para o formato de transação
    const billsAsTransactions: Transaction[] = allBills.map(bill => ({
      id: `bill_${bill.id}`,
      date: bill.dueDate,
      description: `Fatura - Cartão de Crédito`,
      amount: bill.totalAmount,
      currencyCode: bill.totalAmountCurrencyCode,
      type: 'DEBIT',
      category: 'Bills',
      status: 'PENDING',
    }));

    // Juntar e ordenar por data (mais recente primeiro)
    const combined = [...allTransactions, ...billsAsTransactions];
    return combined.sort((a, b) => b.date.localeCompare(a.date));
  }, [allTransactions, allBills]);

  const selectedMonthTransactions = selectedMonthKey
    ? combinedTransactions.filter((t) => t.date.startsWith(selectedMonthKey))
    : [];

  const currentMonthInvoice = monthlyInvoices.find((inv) =>
    isThisMonth(parseISO(inv.monthKey + "-01"))
  );

  const categoryData = getCategorySpending(combinedTransactions);
  const financialSummary = getFinancialSummary(combinedTransactions);
  const upcomingPayments = getUpcomingPayments(combinedTransactions);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-foreground tracking-tight gradient-text">
            Gestão Financeira
          </h1>
          <p className="text-xl text-muted-foreground/80">
            Análise completa de contas, transações e faturamento bancário
          </p>
        </div>
        
        <Card className="p-12 text-center">
          <Building2 className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Nenhum banco conectado</h2>
          <p className="text-muted-foreground mb-6">
            Conecte sua primeira conta bancária para visualizar suas transações e
            gerenciar suas finanças.
          </p>
          <Button onClick={() => setIsModalOpen(true)} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Conectar primeiro banco
          </Button>
        </Card>

        <PluggyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-foreground tracking-tight gradient-text">
            Gestão Financeira
          </h1>
          <p className="text-xl text-muted-foreground/80">
            Análise completa de contas, transações e faturamento bancário
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoadingTransactions}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Conectar Novo Banco
          </Button>
        </div>
      </div>

      {/* Resumo de Múltiplos Bancos */}
      {items.length > 1 && !isLoadingTransactions && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="font-semibold text-lg">
                  {items.length} Bancos Conectados
                </h3>
                <p className="text-sm text-muted-foreground">
                  {allAccounts.length} contas • {allTransactions.length} transações
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Fatura Total Agregada</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {currentMonthInvoice 
                  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentMonthInvoice.total)
                  : 'R$ 0,00'
                }
              </p>
            </div>
          </div>
        </Card>
      )}

      {isLoadingTransactions ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Carregando transações...</span>
        </div>
      ) : (
        <>
          <div data-tour="financial-summary">
            <SummaryCards summary={financialSummary} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div data-tour="category-chart">
              <CategoryPieChart data={categoryData} />
            </div>
            <MonthlySpendingBarChart data={monthlyInvoices.slice(0, 6)} />
          </div>

          <div data-tour="expense-projection">
            <SpendingTrendAreaChart data={monthlyInvoices.slice(0, 12)} />
          </div>

          <UpcomingPaymentsTimeline payments={upcomingPayments} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-tour="credit-cards">
            {monthlyInvoices.map((invoice) => (
              <MonthlyInvoiceCard
                key={invoice.monthKey}
                invoice={invoice}
                isCurrentMonth={isThisMonth(parseISO(invoice.monthKey + '-01'))}
                onClick={() => setSelectedMonthKey(invoice.monthKey)}
              />
            ))}
          </div>

          <div data-tour="transactions-list">
            <TransactionsTable
              transactions={combinedTransactions}
              isLoading={isLoadingTransactions}
            />
          </div>
        </>
      )}

      <PluggyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <Dialog open={!!selectedMonthKey} onOpenChange={() => setSelectedMonthKey(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Transações de {selectedMonthKey ? new Date(selectedMonthKey + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : ''}
            </DialogTitle>
            <DialogDescription>
              {selectedMonthTransactions.length} transação(ões) neste mês
            </DialogDescription>
          </DialogHeader>
          <TransactionsTable
            transactions={selectedMonthTransactions}
            isLoading={false}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isCollectionDialogOpen} onOpenChange={setIsCollectionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Coletar Dados Completos</DialogTitle>
            <DialogDescription>
              Buscar TODAS as transações e faturas dos últimos 12 meses
            </DialogDescription>
          </DialogHeader>
          <DataCollectionProgress
            itemId={items[0]?.id || ""}
            onComplete={handleCompleteCollection}
            onCancel={() => setIsCollectionDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
