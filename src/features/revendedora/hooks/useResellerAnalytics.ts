import { useState, useEffect, useMemo } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { useAdminSupabase } from '@/features/revendedora/contexts/AdminSupabaseContext';

interface ResellerSalesData {
  reseller_id: string;
  reseller_name: string;
  reseller_email: string;
  reseller_phone: string | null;
  reseller_level: number | null;
  is_active: boolean;
  total_sales_count: number;
  total_sales_amount: number;
  total_reseller_profit: number;
  total_company_profit: number;
  monthly_sales: MonthlyStats[];
  created_at: string | null;
  average_monthly_sales: number;
  current_month_sales: number;
  drop_percentage: number | null;
  has_sales_drop: boolean;
}

interface MonthlyStats {
  month: string;
  year: number;
  month_number: number;
  sales_count: number;
  sales_amount: number;
  reseller_profit: number;
  company_profit: number;
}

interface Sale {
  id: string;
  reseller_id: string;
  total_amount: number;
  reseller_amount: number;
  company_amount: number;
  paid: boolean | null;
  paid_at: string | null;
  created_at: string | null;
}

interface Reseller {
  id: string;
  nome: string | null;
  full_name?: string | null;
  email: string | null;
  telefone: string | null;
  phone?: string | null;
  nivel: number | null;
  level?: number | null;
  is_active?: boolean | null;
  created_at: string | null;
}

interface UseResellerAnalyticsResult {
  resellersData: ResellerSalesData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  totals: {
    totalSalesCount: number;
    totalSalesAmount: number;
    totalResellerProfit: number;
    totalCompanyProfit: number;
  };
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function useResellerAnalytics(): UseResellerAnalyticsResult {
  const adminContext = useAdminSupabase();
  const resellerContext = useSupabase();
  
  const adminReady = !adminContext.loading && adminContext.configured && adminContext.client;
  const resellerReady = !resellerContext.loading && resellerContext.configured && resellerContext.client;
  
  const supabase = adminContext.client || resellerContext.client;
  const supabaseLoading = adminContext.loading || resellerContext.loading;
  const configured = adminReady || resellerReady;

  
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (client: SupabaseClient) => {
    try {
      setLoading(true);
      setError(null);

      const [resellersResult, salesResult] = await Promise.all([
        client.from('resellers').select('*'),
        client
          .from('sales_with_split')
          .select('id, reseller_id, total_amount, reseller_amount, company_amount, paid, paid_at, created_at')
          .eq('paid', true)
      ]);

      if (resellersResult.error) throw resellersResult.error;
      if (salesResult.error) throw salesResult.error;

      setResellers(resellersResult.data || []);
      setSales(salesResult.data || []);
    } catch (err: any) {
      console.error('[ResellerAnalytics] Error:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (supabaseLoading) return;
    if (!supabase || !configured) {
      setLoading(false);
      setError('Supabase not configured');
      return;
    }

    loadData(supabase);

    const salesChannel = supabase
      .channel('reseller_sales_analytics')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales_with_split' },
        () => loadData(supabase)
      )
      .subscribe();

    const resellersChannel = supabase
      .channel('resellers_analytics')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resellers' },
        () => loadData(supabase)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(resellersChannel);
    };
  }, [supabase, supabaseLoading, configured]);

  const resellersData = useMemo(() => {
    const salesByReseller = new Map<string, Sale[]>();
    
    sales.forEach(sale => {
      const existing = salesByReseller.get(sale.reseller_id) || [];
      existing.push(sale);
      salesByReseller.set(sale.reseller_id, existing);
    });

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    return resellers.map(reseller => {
      const resellerSales = salesByReseller.get(reseller.id) || [];
      
      const monthlyMap = new Map<string, MonthlyStats>();
      
      resellerSales.forEach(sale => {
        const saleDate = new Date(sale.paid_at || sale.created_at || new Date());
        const monthKey = `${saleDate.getFullYear()}-${saleDate.getMonth()}`;
        
        const existing = monthlyMap.get(monthKey) || {
          month: MONTH_NAMES[saleDate.getMonth()],
          year: saleDate.getFullYear(),
          month_number: saleDate.getMonth() + 1,
          sales_count: 0,
          sales_amount: 0,
          reseller_profit: 0,
          company_profit: 0
        };
        
        existing.sales_count += 1;
        existing.sales_amount += sale.total_amount || 0;
        existing.reseller_profit += sale.reseller_amount || 0;
        existing.company_profit += sale.company_amount || 0;
        
        monthlyMap.set(monthKey, existing);
      });

      const monthlySales = Array.from(monthlyMap.values())
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month_number - a.month_number;
        });

      const totalSalesAmount = resellerSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
      const totalResellerProfit = resellerSales.reduce((sum, s) => sum + (s.reseller_amount || 0), 0);
      const totalCompanyProfit = resellerSales.reduce((sum, s) => sum + (s.company_amount || 0), 0);

      const currentMonthStats = monthlySales.find(
        m => m.year === currentYear && m.month_number === currentMonth
      );
      const currentMonthSalesAmount = currentMonthStats?.sales_amount || 0;

      const getLastThreeCalendarMonths = () => {
        const months: { month: number; year: number }[] = [];
        let checkMonth = currentMonth - 1;
        let checkYear = currentYear;
        
        for (let i = 0; i < 3; i++) {
          if (checkMonth <= 0) {
            checkMonth = 12 + checkMonth;
            checkYear--;
          }
          months.push({ month: checkMonth, year: checkYear });
          checkMonth--;
        }
        return months;
      };

      const lastThreeMonths = getLastThreeCalendarMonths();
      
      const previousMonthsData = lastThreeMonths.map(({ month, year }) => {
        const found = monthlySales.find(m => m.year === year && m.month_number === month);
        return found?.sales_amount || 0;
      });

      const hasAnyPreviousSales = previousMonthsData.some(amount => amount > 0);
      
      let averageMonthly = 0;
      if (hasAnyPreviousSales) {
        const totalPreviousSales = previousMonthsData.reduce((sum, amount) => sum + amount, 0);
        averageMonthly = totalPreviousSales / 3;
      }

      let dropPercentage: number | null = null;
      let hasSalesDrop = false;

      if (averageMonthly > 0) {
        dropPercentage = ((averageMonthly - currentMonthSalesAmount) / averageMonthly) * 100;
        hasSalesDrop = dropPercentage >= 30;
      }

      return {
        reseller_id: reseller.id,
        reseller_name: reseller.full_name || reseller.nome || 'Sem nome',
        reseller_email: reseller.email || '',
        reseller_phone: reseller.phone || reseller.telefone || null,
        reseller_level: reseller.level ?? reseller.nivel ?? 1,
        is_active: reseller.is_active ?? true,
        total_sales_count: resellerSales.length,
        total_sales_amount: totalSalesAmount,
        total_reseller_profit: totalResellerProfit,
        total_company_profit: totalCompanyProfit,
        monthly_sales: monthlySales,
        created_at: reseller.created_at,
        average_monthly_sales: averageMonthly,
        current_month_sales: currentMonthSalesAmount,
        drop_percentage: dropPercentage,
        has_sales_drop: hasSalesDrop
      };
    }).sort((a, b) => b.total_sales_amount - a.total_sales_amount);
  }, [resellers, sales]);

  const totals = useMemo(() => {
    return resellersData.reduce((acc, r) => ({
      totalSalesCount: acc.totalSalesCount + r.total_sales_count,
      totalSalesAmount: acc.totalSalesAmount + r.total_sales_amount,
      totalResellerProfit: acc.totalResellerProfit + r.total_reseller_profit,
      totalCompanyProfit: acc.totalCompanyProfit + r.total_company_profit
    }), {
      totalSalesCount: 0,
      totalSalesAmount: 0,
      totalResellerProfit: 0,
      totalCompanyProfit: 0
    });
  }, [resellersData]);

  return {
    resellersData,
    loading: loading || supabaseLoading,
    error,
    refetch: loadData,
    totals
  };
}
