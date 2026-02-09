import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { getResellerId as getStoredResellerId } from '@/features/revendedora/lib/resellerAuth';

interface ResellerAlert {
  id: string;
  reseller_id: string;
  alert_type: string;
  severity: string;
  message: string;
  current_month_sales: number | null;
  average_monthly_sales: number | null;
  drop_percentage: number | null;
  baseline_months: number | null;
  analysis_month: number;
  analysis_year: number;
  reseller_name: string | null;
  reseller_phone: string | null;
  reseller_email: string | null;
  is_active: boolean | null;
  notified_at: string | null;
  resolved_at: string | null;
  created_at: string | null;
}

interface CreateAlertParams {
  reseller_id: string;
  reseller_name: string;
  reseller_phone: string | null;
  reseller_email: string | null;
  current_month_sales: number;
  average_monthly_sales: number;
  drop_percentage: number;
  analysis_month: number;
  analysis_year: number;
}

interface UseResellerAlertsResult {
  alerts: ResellerAlert[];
  loading: boolean;
  error: string | null;
  createAlert: (params: CreateAlertParams) => Promise<ResellerAlert | null>;
  resolveAlert: (alertId: string) => Promise<boolean>;
  checkExistingAlert: (resellerId: string, month: number, year: number) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const DROP_THRESHOLD = 30;

export function useResellerAlerts(resellerId?: string): UseResellerAlertsResult {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  
  const [alerts, setAlerts] = useState<ResellerAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getResellerId = useCallback((): string | null => {
    if (resellerId) return resellerId;
    const storedReseller = getStoredResellerId();
    if (storedReseller) return storedReseller;
    console.error('[ResellerAlerts] Reseller ID não encontrado no localStorage');
    return null;
  }, [resellerId]);

  const loadAlerts = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      setError('Supabase not configured');
      return;
    }

    const currentResellerId = getResellerId();
    if (!currentResellerId) {
      console.error('[ResellerAlerts] Cannot load alerts: reseller_id is missing');
      setLoading(false);
      setError('Reseller ID not found');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[ResellerAlerts] Loading alerts for reseller:', currentResellerId);

      const { data, error: fetchError } = await supabase
        .from('reseller_alerts')
        .select('*')
        .eq('reseller_id', currentResellerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      console.log('[ResellerAlerts] Loaded', (data || []).length, 'alerts for reseller:', currentResellerId);
      setAlerts((data as ResellerAlert[]) || []);
    } catch (err: any) {
      console.error('[ResellerAlerts] Error loading alerts:', err);
      setError(err.message || 'Erro ao carregar alertas');
    } finally {
      setLoading(false);
    }
  }, [supabase, getResellerId]);

  useEffect(() => {
    if (supabaseLoading) return;
    if (!supabase) {
      setLoading(false);
      return;
    }

    loadAlerts();

    const currentResellerId = getResellerId();
    if (!currentResellerId) {
      console.error('[ResellerAlerts] Cannot setup realtime: reseller_id is missing');
      return;
    }

    const channel = supabase
      .channel('reseller_alerts_changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'reseller_alerts',
          filter: `reseller_id=eq.${currentResellerId}`
        },
        () => loadAlerts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAlerts, supabase, supabaseLoading, getResellerId]);

  const checkExistingAlert = useCallback(async (
    resellerId: string,
    month: number,
    year: number
  ): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const { data, error } = await supabase
        .from('reseller_alerts')
        .select('id')
        .eq('reseller_id', resellerId)
        .eq('analysis_month', month)
        .eq('analysis_year', year)
        .eq('is_active', true)
        .limit(1);

      if (error) throw error;
      return (data && data.length > 0);
    } catch (err) {
      console.error('[ResellerAlerts] Error checking existing alert:', err);
      return false;
    }
  }, [supabase]);

  const createAlert = useCallback(async (params: CreateAlertParams): Promise<ResellerAlert | null> => {
    if (!supabase) return null;

    try {
      const exists = await checkExistingAlert(
        params.reseller_id,
        params.analysis_month,
        params.analysis_year
      );

      if (exists) {
        console.log('[ResellerAlerts] Alert already exists for this period');
        return null;
      }

      const severity = params.drop_percentage >= 50 ? 'critical' : 'warning';
      const message = `Vendas caíram ${params.drop_percentage.toFixed(1)}% em relação à média. ` +
        `Vendas do mês: R$ ${params.current_month_sales.toFixed(2)} | ` +
        `Média: R$ ${params.average_monthly_sales.toFixed(2)}`;

      const alertData = {
        reseller_id: params.reseller_id,
        alert_type: 'sales_drop',
        severity,
        message,
        current_month_sales: params.current_month_sales,
        average_monthly_sales: params.average_monthly_sales,
        drop_percentage: params.drop_percentage,
        baseline_months: 3,
        analysis_month: params.analysis_month,
        analysis_year: params.analysis_year,
        reseller_name: params.reseller_name,
        reseller_phone: params.reseller_phone,
        reseller_email: params.reseller_email,
        is_active: true,
        metadata: {
          threshold_used: DROP_THRESHOLD,
          detected_at: new Date().toISOString()
        }
      };

      const { data, error } = await supabase
        .from('reseller_alerts')
        .insert(alertData as any)
        .select()
        .single();

      if (error) throw error;

      console.log('[ResellerAlerts] Alert created:', data);
      return data as ResellerAlert;
    } catch (err: any) {
      console.error('[ResellerAlerts] Error creating alert:', err);
      return null;
    }
  }, [checkExistingAlert, supabase]);

  const resolveAlert = useCallback(async (alertId: string): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('reseller_alerts')
        .update({
          is_active: false,
          resolved_at: new Date().toISOString()
        } as any)
        .eq('id', alertId);

      if (error) throw error;

      console.log('[ResellerAlerts] Alert resolved:', alertId);
      return true;
    } catch (err: any) {
      console.error('[ResellerAlerts] Error resolving alert:', err);
      return false;
    }
  }, [supabase]);

  return {
    alerts,
    loading: loading || supabaseLoading,
    error,
    createAlert,
    resolveAlert,
    checkExistingAlert,
    refetch: loadAlerts
  };
}

export { DROP_THRESHOLD };
export type { ResellerAlert, CreateAlertParams };
