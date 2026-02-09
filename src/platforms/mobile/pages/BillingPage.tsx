import { useState, useRef, useMemo } from 'react';
import { 
  Wallet, 
  DollarSign, 
  Plus, 
  Building, 
  Download, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Edit2,
  Trash2,
  CreditCard,
  Receipt,
  Calendar,
  Filter,
  RefreshCw,
  Upload,
  PieChart,
  BarChart3,
  FileText,
  X
} from 'lucide-react';
import { GlassCard } from '@/components/mobile/GlassCard';
import { AnimatedNumber } from '@/components/mobile/AnimatedNumber';
import { MobileCard } from '../components/premium/MobileCard';
import { MobileButton } from '../components/premium/MobileButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useItems, useAccounts, useTransactions, useBills, useRefreshData } from '@/hooks/billing/useBankingData';
import { 
  groupTransactionsByMonth, 
  getCategorySpending, 
  getFinancialSummary,
  getUpcomingPayments,
  formatCurrency,
  formatDate,
  Transaction
} from '@/lib/billing/financialUtils';
import { translateCategory } from '@/lib/billing/translations';
import PluggyModal from '@/components/PluggyModal';
import CategoryPieChart from '@/components/billing/CategoryPieChart';
import MonthlySpendingBarChart from '@/components/billing/MonthlySpendingBarChart';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const hapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

interface SwipeableTransactionProps {
  transaction: any;
  onEdit?: () => void;
  onDelete?: () => void;
}

const SwipeableTransaction = ({ transaction, onEdit, onDelete }: SwipeableTransactionProps) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    currentX.current = e.touches[0].clientX;
    const diff = startX.current - currentX.current;
    
    if (diff > 0 && diff < 150) {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    
    if (swipeOffset > 75) {
      setSwipeOffset(150);
      hapticFeedback();
    } else {
      setSwipeOffset(0);
    }
  };

  const isIncome = transaction.amount > 0;
  const date = transaction.date ? new Date(transaction.date) : new Date();

  return (
    <div className="relative overflow-hidden">
      <div className="absolute right-0 top-0 bottom-0 flex items-center gap-2 pr-4 z-0">
        <button
          onClick={() => {
            hapticFeedback();
            onEdit?.();
            setSwipeOffset(0);
          }}
          className="w-14 h-14 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Edit2 className="w-5 h-5 text-blue-400" />
        </button>
        <button
          onClick={() => {
            hapticFeedback();
            onDelete?.();
            setSwipeOffset(0);
          }}
          className="w-14 h-14 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Trash2 className="w-5 h-5 text-red-400" />
        </button>
      </div>

      <div
        className="relative z-10"
        style={{
          transform: `translateX(-${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <MobileCard variant="default" padding="md" className="mb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                isIncome 
                  ? 'bg-emerald-500/10 border border-emerald-500/20' 
                  : 'bg-red-500/10 border border-red-500/20'
              )}>
                {isIncome ? (
                  <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-red-400" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {transaction.description || 'Transação'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(date, { addSuffix: true, locale: ptBR })}
                </p>
                {transaction.category && (
                  <div className="inline-flex mt-1.5 px-2 py-0.5 rounded-full text-xs bg-white/5 border border-white/10">
                    {translateCategory(transaction.category)}
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-right ml-3">
              <p className={cn(
                'text-base font-bold',
                isIncome ? 'text-emerald-400' : 'text-red-400'
              )}>
                {isIncome ? '+' : '-'} {formatCurrency(Math.abs(transaction.amount))}
              </p>
            </div>
          </div>
        </MobileCard>
      </div>
    </div>
  );
};

interface TransactionFilterParams {
  searchText: string;
  dateFrom: string;
  dateTo: string;
  type: string;
  category: string;
}

const BillingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isPluggyModalOpen, setIsPluggyModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [transactionLimit, setTransactionLimit] = useState(10);
  
  const [filters, setFilters] = useState<TransactionFilterParams>({
    searchText: '',
    dateFrom: '',
    dateTo: '',
    type: 'all',
    category: 'all'
  });

  const { data: items, isLoading: itemsLoading, refetch: refetchItems } = useItems();
  const { refreshAll } = useRefreshData();
  const firstItemId = items?.[0]?.id || null;
  const { data: accounts, isLoading: accountsLoading } = useAccounts(firstItemId);
  const firstAccountId = selectedAccountId || accounts?.[0]?.id || null;
  const { data: transactions, isLoading: transactionsLoading } = useTransactions(firstAccountId);
  const { data: bills, isLoading: billsLoading } = useBills(firstAccountId);

  const allAccounts = useMemo(() => {
    return accounts || [];
  }, [accounts]);

  const allTransactions = useMemo(() => {
    return transactions || [];
  }, [transactions]);

  const monthlyInvoices = useMemo(() => {
    if (allTransactions.length === 0) return [];
    return groupTransactionsByMonth(allTransactions, bills || []);
  }, [allTransactions, bills]);

  const categorySpending = useMemo(() => {
    if (allTransactions.length === 0) return [];
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
    return getFinancialSummary(allTransactions);
  }, [allTransactions]);

  const upcomingPayments = useMemo(() => {
    if (allTransactions.length === 0) return [];
    return getUpcomingPayments(allTransactions, 5);
  }, [allTransactions]);

  const filteredTransactions = useMemo(() => {
    let result = [...allTransactions];

    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      result = result.filter(t => 
        (t.description || '').toLowerCase().includes(searchLower)
      );
    }

    if (filters.dateFrom) {
      result = result.filter(t => t.date >= filters.dateFrom);
    }

    if (filters.dateTo) {
      result = result.filter(t => t.date <= filters.dateTo);
    }

    if (filters.type !== 'all') {
      result = result.filter(t => t.type === filters.type);
    }

    if (filters.category !== 'all') {
      result = result.filter(t => t.category === filters.category);
    }

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [allTransactions, filters]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    allTransactions.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats).sort();
  }, [allTransactions]);

  const totalBalance = allAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const totalIncome = allTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = allTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const displayedTransactions = filteredTransactions.slice(0, transactionLimit);
  const pendingBills = bills?.filter(b => (b as any).status === 'pending' || (b as any).status === 'PENDING') || [];

  const isLoading = itemsLoading || accountsLoading;
  const hasNoData = !items || items.length === 0;
  const hasActiveFilters = filters.searchText !== '' || filters.dateFrom !== '' || 
                          filters.dateTo !== '' || filters.type !== 'all' || 
                          filters.category !== 'all';

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      hapticFeedback();
      
      await refreshAll();
      await refetchItems();
      
      toast({
        title: "✅ Dados atualizados!",
        description: "Suas informações financeiras foram atualizadas com sucesso.",
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

  const handleExport = () => {
    hapticFeedback();
    
    const csvContent = [
      ['Data', 'Descrição', 'Categoria', 'Valor', 'Tipo'].join(','),
      ...filteredTransactions.map(t => [
        formatDate(t.date),
        `"${t.description || ''}"`,
        `"${translateCategory(t.category || '')}"`,
        t.amount.toFixed(2),
        t.amount > 0 ? 'Receita' : 'Despesa'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transacoes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: "✅ Exportação concluída!",
      description: `${filteredTransactions.length} transações exportadas com sucesso.`,
    });
  };

  const clearFilters = () => {
    setFilters({
      searchText: '',
      dateFrom: '',
      dateTo: '',
      type: 'all',
      category: 'all'
    });
    hapticFeedback();
  };

  const quickActions = [
    { 
      icon: Building, 
      label: 'Conectar Banco', 
      onClick: () => {
        hapticFeedback();
        setIsPluggyModalOpen(true);
      }
    },
    { 
      icon: Filter, 
      label: 'Filtros', 
      onClick: () => {
        hapticFeedback();
        setIsFilterOpen(true);
      },
      badge: hasActiveFilters
    },
    { 
      icon: Download, 
      label: 'Exportar', 
      onClick: handleExport,
      disabled: filteredTransactions.length === 0
    },
    { 
      icon: Upload, 
      label: 'Anexos', 
      onClick: () => {
        hapticFeedback();
        toast({
          title: "📎 Gerenciar Anexos",
          description: "Para gerenciar anexos e documentos, acesse a versão desktop.",
        });
      }
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-6 pb-4 space-y-6">
        
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-foreground">Financeiro</h1>
          <MobileButton
            variant="secondary"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-10 h-10 p-0"
          >
            <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
          </MobileButton>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-32 flex-shrink-0 rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <MobileCard 
              variant="elevated" 
              padding="lg" 
              className="relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Saldo Total</p>
                      <p className="text-xs font-medium text-muted-foreground/80 capitalize">
                        {currentMonth}
                      </p>
                    </div>
                  </div>
                  <DollarSign className="w-8 h-8 text-primary/30" />
                </div>

                <div className="mb-6">
                  <div className="text-4xl font-black text-foreground tracking-tight">
                    <AnimatedNumber 
                      value={totalBalance} 
                      prefix="R$ "
                      decimals={2}
                      duration={1200}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-medium text-emerald-400">Receitas</span>
                    </div>
                    <p className="text-lg font-bold text-emerald-400">
                      {formatCurrency(totalIncome)}
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-xs font-medium text-red-400">Despesas</span>
                    </div>
                    <p className="text-lg font-bold text-red-400">
                      {formatCurrency(totalExpense)}
                    </p>
                  </div>
                </div>
              </div>
            </MobileCard>

            {allTransactions.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <MobileCard variant="outlined" padding="md">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Gasto no Mês</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(financialSummary.currentMonthTotal)}
                  </p>
                </MobileCard>

                <MobileCard variant="outlined" padding="md">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-medium text-muted-foreground">Média Mensal</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(financialSummary.monthlyAverage)}
                  </p>
                </MobileCard>

                {financialSummary.largestCategory && (
                  <MobileCard variant="outlined" padding="md">
                    <div className="flex items-center gap-2 mb-2">
                      <PieChart className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-medium text-muted-foreground">Maior Categoria</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(financialSummary.largestCategory.total)}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize mt-1">
                      {translateCategory(financialSummary.largestCategory.category)}
                    </p>
                  </MobileCard>
                )}

                {financialSummary.nextPayment && (
                  <MobileCard variant="outlined" padding="md">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <span className="text-xs font-medium text-muted-foreground">Próximo Pgto.</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(Math.abs(financialSummary.nextPayment.amount))}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(financialSummary.nextPayment.date)}
                    </p>
                  </MobileCard>
                )}
              </div>
            )}

            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {quickActions.map((action, index) => (
                <MobileCard
                  key={index}
                  variant="outlined"
                  padding="md"
                  clickable
                  onClick={action.onClick}
                  className={cn(
                    'flex-shrink-0 w-28 relative',
                    action.disabled && 'opacity-50 pointer-events-none'
                  )}
                >
                  {action.badge && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                  )}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <action.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-xs font-semibold text-center text-foreground">
                      {action.label}
                    </span>
                  </div>
                </MobileCard>
              ))}
            </div>
          </>
        )}

        {hasNoData && !isLoading && (
          <MobileCard variant="outlined" padding="lg" className="bg-amber-500/5 border-amber-500/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-400 mb-1">
                  Nenhuma conta conectada
                </p>
                <p className="text-xs text-amber-400/80 mb-3">
                  Conecte sua primeira conta bancária para começar a gerenciar suas finanças
                </p>
                <MobileButton
                  variant="secondary"
                  onClick={() => setIsPluggyModalOpen(true)}
                  className="w-full"
                >
                  <Building className="w-4 h-4" />
                  Conectar Banco
                </MobileButton>
              </div>
            </div>
          </MobileCard>
        )}

        {categorySpending.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Análise de Gastos</h2>
            <div className="space-y-4">
              <CategoryPieChart data={categorySpending} />
              {monthlyInvoices.length > 0 && (
                <MonthlySpendingBarChart data={monthlyInvoices} />
              )}
            </div>
          </div>
        )}

        {allAccounts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Contas Conectadas</h2>
              <span className="text-sm text-muted-foreground">{allAccounts.length}</span>
            </div>
            
            <div className="space-y-3">
              {accountsLoading ? (
                [1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))
              ) : (
                allAccounts.map((account) => (
                  <MobileCard
                    key={account.id}
                    variant="default"
                    padding="md"
                    clickable
                    onClick={() => {
                      hapticFeedback();
                      setSelectedAccountId(account.id);
                    }}
                    className={cn(
                      selectedAccountId === account.id && 'border-primary/30 bg-primary/5'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {account.name || 'Conta Bancária'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {account.type || 'Conta Corrente'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-foreground">
                          {formatCurrency(account.balance || 0)}
                        </p>
                        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                      </div>
                    </div>
                  </MobileCard>
                ))
              )}
            </div>
          </div>
        )}

        {pendingBills.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Faturas Pendentes</h2>
              <span className="text-sm text-muted-foreground">{pendingBills.length}</span>
            </div>
            
            <div className="space-y-3">
              {billsLoading ? (
                [1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))
              ) : (
                pendingBills.slice(0, 5).map((bill, index) => (
                  <MobileCard key={index} variant="default" padding="md">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Receipt className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          Fatura - {new Date(bill.dueDate).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Vencimento em {formatDistanceToNow(new Date(bill.dueDate), { locale: ptBR })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-amber-400">
                          {formatCurrency(bill.totalAmount || 0)}
                        </p>
                      </div>
                    </div>
                  </MobileCard>
                ))
              )}
            </div>
          </div>
        )}

        {displayedTransactions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                {hasActiveFilters ? 'Transações Filtradas' : 'Transações Recentes'}
              </h2>
              <span className="text-sm text-muted-foreground">
                {displayedTransactions.length} de {filteredTransactions.length}
              </span>
            </div>
            
            <div>
              {transactionsLoading ? (
                [1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl mb-3" />
                ))
              ) : (
                <>
                  {displayedTransactions.map((transaction, index) => (
                    <SwipeableTransaction
                      key={transaction.id || index}
                      transaction={transaction}
                      onEdit={() => console.log('Edit', transaction.id)}
                      onDelete={() => console.log('Delete', transaction.id)}
                    />
                  ))}
                  {filteredTransactions.length > transactionLimit && (
                    <MobileButton
                      variant="secondary"
                      onClick={() => {
                        setTransactionLimit(prev => prev + 10);
                        hapticFeedback();
                      }}
                      className="w-full"
                    >
                      Carregar Mais ({filteredTransactions.length - transactionLimit} restantes)
                    </MobileButton>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {!hasNoData && !isLoading && filteredTransactions.length === 0 && (
          <MobileCard variant="outlined" padding="lg" className="text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm font-semibold text-muted-foreground mb-1">
              {hasActiveFilters ? 'Nenhuma transação encontrada' : 'Nenhuma transação'}
            </p>
            <p className="text-xs text-muted-foreground/80">
              {hasActiveFilters 
                ? 'Tente ajustar os filtros para ver mais resultados' 
                : 'As transações aparecerão aqui quando estiverem disponíveis'}
            </p>
            {hasActiveFilters && (
              <MobileButton
                variant="secondary"
                onClick={clearFilters}
                className="w-full mt-3"
              >
                <X className="w-4 h-4" />
                Limpar Filtros
              </MobileButton>
            )}
          </MobileCard>
        )}
      </div>

      <PluggyModal open={isPluggyModalOpen} onClose={() => setIsPluggyModalOpen(false)} />

      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent side="bottom" className="h-[90vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros de Transações
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar por Descrição</Label>
              <Input
                id="search"
                placeholder="Ex: Mercadolivre, Pagamento..."
                value={filters.searchText}
                onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Data Inicial</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo">Data Final</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={filters.type}
                onValueChange={(value) => setFilters({ ...filters, type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="DEBIT">Débito</SelectItem>
                  <SelectItem value="CREDIT">Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={filters.category}
                onValueChange={(value) => setFilters({ ...filters, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {availableCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {translateCategory(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              {hasActiveFilters && (
                <MobileButton
                  variant="secondary"
                  onClick={clearFilters}
                  className="flex-1"
                >
                  <X className="w-4 h-4" />
                  Limpar
                </MobileButton>
              )}
              <MobileButton
                variant="primary"
                onClick={() => {
                  setIsFilterOpen(false);
                  hapticFeedback();
                }}
                className="flex-1"
              >
                Aplicar Filtros
              </MobileButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default BillingPage;
