import { useEffect, useState, useCallback } from 'react';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { SalesTier } from '@/types/database';

export interface CommissionConfig {
  use_dynamic_tiers: boolean;
  sales_tiers: SalesTier[];
}

export interface CommissionResult {
  resellerPercentage: number;
  companyPercentage: number;
  tierName: string;
}

const DEFAULT_TIERS: SalesTier[] = [
  { id: '1', name: 'Iniciante', min_monthly_sales: 0, max_monthly_sales: 2000, reseller_percentage: 70, company_percentage: 30 },
  { id: '2', name: 'Bronze', min_monthly_sales: 2000, max_monthly_sales: 4500, reseller_percentage: 70, company_percentage: 30 },
  { id: '3', name: 'Prata', min_monthly_sales: 4500, max_monthly_sales: 10000, reseller_percentage: 75, company_percentage: 25 },
  { id: '4', name: 'Ouro', min_monthly_sales: 10000, reseller_percentage: 80, company_percentage: 20 },
];

export function useCommissionConfig(resellerId?: string) {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  const [config, setConfig] = useState<CommissionConfig>({
    use_dynamic_tiers: false,
    sales_tiers: DEFAULT_TIERS,
  });
  const [loading, setLoading] = useState(true);
  const [monthlyVolume, setMonthlyVolume] = useState<number>(0);
  const [volumeLoading, setVolumeLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (supabaseLoading || !configured || !supabase) {
      console.log('[useCommissionConfig] Supabase not ready');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('commission_config')
        .select('*')
        .eq('id', 'default')
        .single();

      if (error) {
        console.log('[useCommissionConfig] No config found, using defaults');
      } else if (data) {
        console.log('[useCommissionConfig] ✅ Config loaded:', data);
        setConfig({
          use_dynamic_tiers: data.use_dynamic_tiers || false,
          sales_tiers: data.sales_tiers?.length > 0 ? data.sales_tiers : DEFAULT_TIERS,
        });
      }
    } catch (error) {
      console.error('[useCommissionConfig] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, supabaseLoading, configured]);

  const fetchMonthlyVolume = useCallback(async () => {
    if (supabaseLoading || !configured || !supabase || !resellerId) return;

    setVolumeLoading(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data, error } = await (supabase as any)
        .from('sales_with_split')
        .select('total_amount')
        .eq('reseller_id', resellerId)
        .eq('paid', true)
        .gte('created_at', startOfMonth.toISOString());

      if (error) {
        console.error('[useCommissionConfig] Error fetching monthly volume:', error);
      } else {
        const volume = (data || []).reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
        console.log(`[useCommissionConfig] Monthly volume for ${resellerId}: R$ ${volume}`);
        setMonthlyVolume(volume);
      }
    } catch (error) {
      console.error('[useCommissionConfig] Error:', error);
    } finally {
      setVolumeLoading(false);
    }
  }, [supabase, supabaseLoading, configured, resellerId]);

  useEffect(() => {
    if (supabaseLoading || !configured || !supabase) return;

    fetchConfig();
    fetchMonthlyVolume();

    console.log('[useCommissionConfig] 🔴 Setting up REALTIME subscription...');
    
    const subscription = supabase
      .channel('commission_config_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commission_config',
        },
        (payload: any) => {
          console.log('[useCommissionConfig] 📡 Realtime update received:', payload);
          if (payload.new) {
            setConfig({
              use_dynamic_tiers: payload.new.use_dynamic_tiers || false,
              sales_tiers: payload.new.sales_tiers?.length > 0 ? payload.new.sales_tiers : DEFAULT_TIERS,
            });
          }
        }
      )
      .subscribe((status: string) => {
        console.log('[useCommissionConfig] Subscription status:', status);
      });

    return () => {
      console.log('[useCommissionConfig] Cleaning up subscription...');
      subscription.unsubscribe();
    };
  }, [supabase, supabaseLoading, configured, fetchConfig, fetchMonthlyVolume]);

  const calculateCommission = useCallback((volume: number): CommissionResult => {
    if (!config.use_dynamic_tiers) {
      return { resellerPercentage: 70, companyPercentage: 30, tierName: 'Padrão' };
    }

    const sortedTiers = [...config.sales_tiers].sort((a, b) => a.min_monthly_sales - b.min_monthly_sales);
    
    for (const tier of sortedTiers) {
      const meetsMinimum = volume >= tier.min_monthly_sales;
      const meetsMaximum = tier.max_monthly_sales === undefined || volume < tier.max_monthly_sales;
      
      if (meetsMinimum && meetsMaximum) {
        return {
          resellerPercentage: tier.reseller_percentage,
          companyPercentage: tier.company_percentage,
          tierName: tier.name,
        };
      }
    }

    if (sortedTiers.length > 0) {
      const lastTier = sortedTiers[sortedTiers.length - 1];
      return {
        resellerPercentage: lastTier.reseller_percentage,
        companyPercentage: lastTier.company_percentage,
        tierName: lastTier.name,
      };
    }

    return { resellerPercentage: 70, companyPercentage: 30, tierName: 'Padrão' };
  }, [config]);

  const getCurrentCommission = useCallback((): CommissionResult => {
    return calculateCommission(monthlyVolume);
  }, [calculateCommission, monthlyVolume]);

  return {
    config,
    loading: loading || volumeLoading || supabaseLoading || !configured,
    monthlyVolume,
    calculateCommission,
    getCurrentCommission,
    refetch: fetchConfig,
  };
}
