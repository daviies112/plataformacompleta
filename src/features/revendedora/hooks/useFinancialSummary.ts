import { useState, useEffect, useMemo } from 'react';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';

interface Sale {
  id: string;
  reseller_amount: number;
  payment_method: string;
  paid: boolean | null;
  paid_at: string | null;
  status: string | null;
  created_at: string | null;
}

interface FinancialSummary {
  availableBalance: number;
  pendingBalance: number;
  futureBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  pendingSales: Sale[];
  availableSales: Sale[];
  futureSales: Sale[];
}

const RELEASE_DAYS = {
  pix: 1,
  cartao: 30,
  cartão: 30,
  dinheiro: 0,
};

function getReleaseDays(paymentMethod: string): number {
  const method = paymentMethod?.toLowerCase() || '';
  return RELEASE_DAYS[method as keyof typeof RELEASE_DAYS] ?? 30;
}

function isBalanceAvailable(paidAt: string | null, paymentMethod: string): boolean {
  if (!paidAt) return false;
  
  const releaseDays = getReleaseDays(paymentMethod);
  const paidDate = new Date(paidAt);
  const releaseDate = new Date(paidDate);
  releaseDate.setDate(releaseDate.getDate() + releaseDays);
  
  return new Date() >= releaseDate;
}

function getReleaseDate(paidAt: string | null, paymentMethod: string): Date | null {
  if (!paidAt) return null;
  
  const releaseDays = getReleaseDays(paymentMethod);
  const paidDate = new Date(paidAt);
  const releaseDate = new Date(paidDate);
  releaseDate.setDate(releaseDate.getDate() + releaseDays);
  
  return releaseDate;
}

export function useFinancialSummary(resellerId: string) {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  const [sales, setSales] = useState<Sale[]>([]);
  const [withdrawals, setWithdrawals] = useState<{ amount: number; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isTableMissingError = (error: any): boolean => {
    if (!error) return false;
    const code = error.code || '';
    const message = error.message || '';
    const status = error.status || error.statusCode || 0;
    return (
      status === 404 ||
      code === 'PGRST205' ||
      code === 'PGRST301' ||
      code === 'PGRST204' ||
      code === '42P01' ||
      message.toLowerCase().includes('relation') ||
      message.toLowerCase().includes('does not exist') ||
      message.toLowerCase().includes('table')
    );
  };

  const loadData = async () => {
    if (supabaseLoading || !configured || !supabase) {
      console.log('[useFinancialSummary] Waiting for Supabase client...');
      return;
    }

    if (!resellerId) {
      setLoading(false);
      return;
    }

    try {
      const [salesResult, withdrawalsResult] = await Promise.all([
        supabase
          .from('sales_with_split')
          .select('id, reseller_amount, payment_method, paid, paid_at, status, created_at')
          .eq('reseller_id', resellerId)
          .eq('paid', true),
        supabase
          .from('withdrawals')
          .select('amount, status')
          .eq('reseller_id', resellerId)
      ]);

      if (salesResult.error) {
        if (isTableMissingError(salesResult.error)) {
          console.warn('[Financial] Sales table not found or inaccessible');
          setSales([]);
        } else {
          throw salesResult.error;
        }
      } else {
        setSales((salesResult.data || []) as Sale[]);
      }
      
      if (withdrawalsResult.error) {
        if (isTableMissingError(withdrawalsResult.error)) {
          console.warn('[Financial] Withdrawals table not found - run SETUP_FINANCIAL_SYSTEM.sql');
          setWithdrawals([]);
        } else {
          console.warn('[Financial] Error loading withdrawals:', withdrawalsResult.error);
          setWithdrawals([]);
        }
      } else {
        setWithdrawals((withdrawalsResult.data || []) as { amount: number; status: string }[]);
      }
    } catch (err: any) {
      console.error('[Financial] Error loading data:', err);
      setError(err.message);
      setSales([]);
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (supabaseLoading || !configured || !supabase) return;
    loadData();
    
    if (!resellerId) return;

    const salesChannel = supabase
      .channel('financial_sales_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_with_split',
          filter: `reseller_id=eq.${resellerId}`
        },
        () => loadData()
      )
      .subscribe();

    const withdrawalsChannel = supabase
      .channel('financial_withdrawals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'withdrawals',
          filter: `reseller_id=eq.${resellerId}`
        },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(withdrawalsChannel);
    };
  }, [resellerId, supabase, supabaseLoading, configured]);

  const summary = useMemo<FinancialSummary>(() => {
    const paidSales = sales.filter(s => s.paid === true && s.status === 'confirmada');
    
    const availableSales = paidSales.filter(s => 
      isBalanceAvailable(s.paid_at, s.payment_method)
    );
    
    const futureSales = paidSales.filter(s => 
      !isBalanceAvailable(s.paid_at, s.payment_method)
    );

    const pendingSales = sales.filter(s => 
      s.paid !== true && s.status !== 'cancelada'
    );

    const totalEarned = paidSales.reduce((sum, s) => sum + (s.reseller_amount || 0), 0);
    
    const completedWithdrawals = withdrawals.filter(w => w.status === 'concluido');
    const totalWithdrawn = completedWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);

    const pendingWithdrawals = withdrawals.filter(w => 
      w.status === 'solicitado' || w.status === 'em_processamento'
    );
    const pendingWithdrawalAmount = pendingWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);

    const availableBalance = availableSales.reduce((sum, s) => sum + (s.reseller_amount || 0), 0) - totalWithdrawn - pendingWithdrawalAmount;
    const futureBalance = futureSales.reduce((sum, s) => sum + (s.reseller_amount || 0), 0);
    const pendingBalance = pendingSales.reduce((sum, s) => sum + (s.reseller_amount || 0), 0);

    return {
      availableBalance: Math.max(0, availableBalance),
      pendingBalance,
      futureBalance,
      totalEarned,
      totalWithdrawn,
      pendingSales,
      availableSales,
      futureSales: futureSales.map(s => ({
        ...s,
        releaseDate: getReleaseDate(s.paid_at, s.payment_method)
      })) as any,
    };
  }, [sales, withdrawals]);

  return {
    ...summary,
    loading: loading || supabaseLoading || !configured,
    error,
    refresh: loadData,
  };
}

export { getReleaseDays, getReleaseDate, isBalanceAvailable };
