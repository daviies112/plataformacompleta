import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ProductInventoryMetrics {
  productId: string;
  productName: string;
  currentStock: number;
  avgDailySales: number;
  avgWeeklySales: number;
  avgMonthlySales: number;
  leadTimeDays: number;
  freightCostPerUnit: number;
  safetyStock: number;
  reorderPoint: number;
  recommendedStock: number;
  suggestedPurchase: number;
  daysUntilStockout: number;
  totalPurchaseCost: number;
  status: 'healthy' | 'low_stock' | 'reorder_now' | 'out_of_stock';
  trend: 'increasing' | 'stable' | 'decreasing' | 'no_sales' | 'insufficient_data';
  resellerBreakdown: ResellerSales[];
  supplierName: string | null;
  minOrderQuantity: number;
  safetyStockDays: number;
  reviewPeriodDays: number;
}

export interface ResellerSales {
  resellerId: string;
  resellerName: string;
  totalSold: number;
  totalRevenue: number;
  percentage: number;
}

export interface InventorySummary {
  totalProducts: number;
  productsNeedingReorder: number;
  productsOutOfStock: number;
  productsLowStock: number;
  productsHealthy: number;
  totalSuggestedPurchaseValue: number;
  totalFreightCost: number;
}

interface UseInventoryForecastingReturn {
  metrics: ProductInventoryMetrics[];
  summary: InventorySummary;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useInventoryForecasting(): UseInventoryForecastingReturn {
  const { client: contextClient, loading: supabaseLoading, configured } = useSupabase();
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [resellers, setResellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainClient, setMainClient] = useState<SupabaseClient | null>(null);
  const [clientInitialized, setClientInitialized] = useState(false);

  // Always try to initialize main Supabase client asynchronously
  useEffect(() => {
    let mounted = true;
    
    async function initClient() {
      console.log('[InventoryForecasting] Initializing main Supabase client...');
      try {
        const client = await getSupabaseClient();
        console.log('[InventoryForecasting] Main client result:', client ? 'SUCCESS' : 'NULL');
        if (mounted) {
          if (client) {
            setMainClient(client);
          }
          setClientInitialized(true);
        }
      } catch (err) {
        console.error('[InventoryForecasting] Failed to init main client:', err);
        if (mounted) {
          setClientInitialized(true);
          setError('Failed to connect to database');
          setLoading(false);
        }
      }
    }
    
    // Always init the main client - don't wait for context
    initClient();
    
    return () => { mounted = false; };
  }, []);

  // Use context client if available and configured, otherwise use main client
  const supabase = (configured && contextClient) ? contextClient : mainClient;
  const isReady = supabase !== null && clientInitialized;
  
  console.log('[InventoryForecasting] State:', { 
    contextClient: !!contextClient, 
    mainClient: !!mainClient, 
    configured, 
    isReady,
    clientInitialized
  });

  const loadData = useCallback(async () => {
    if (!isReady || !supabase) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [productsResult, salesResult, resellersResult] = await Promise.all([
        supabase.from('products').select('*'),
        supabase
          .from('sales_with_split')
          .select('product_id, reseller_id, total_amount, paid, created_at')
          .eq('paid', true)
          .gte('created_at', thirtyDaysAgo.toISOString()),
        supabase.from('resellers').select('id, nome, email')
      ]);

      console.log('[InventoryForecasting] Query results:', {
        products: productsResult.error ? 'ERROR: ' + productsResult.error.message : productsResult.data?.length,
        sales: salesResult.error ? 'ERROR: ' + salesResult.error.message : salesResult.data?.length,
        resellers: resellersResult.error ? 'ERROR: ' + resellersResult.error.message : resellersResult.data?.length
      });

      if (productsResult.error) throw productsResult.error;
      if (salesResult.error) throw salesResult.error;
      // resellers error is optional - table may not exist in all tenants
      if (resellersResult.error) {
        console.warn('[InventoryForecasting] Resellers query failed (optional):', resellersResult.error.message);
      }

      setProducts(productsResult.data || []);
      setSales(salesResult.data || []);
      setResellers(resellersResult.data || []);
    } catch (err: any) {
      console.error('[InventoryForecasting] Error loading data:', err);
      setError(err.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  }, [supabase, isReady]);

  useEffect(() => {
    if (!isReady || !supabase) return;

    loadData();

    const salesChannel = supabase
      .channel('inventory_sales')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales_with_split' },
        () => loadData()
      )
      .subscribe();

    const productsChannel = supabase
      .channel('inventory_products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(productsChannel);
    };
  }, [supabase, isReady, loadData]);

  const metrics = useMemo(() => {
    const resellerMap = new Map(resellers.map(r => [r.id, r.nome || r.email || 'Unknown']));
    
    return products.map(product => {
      const productSales = sales.filter(s => s.product_id === product.id);
      
      const salesByDate = new Map<string, number>();
      const salesByReseller = new Map<string, { count: number; revenue: number }>();
      
      productSales.forEach(sale => {
        const date = new Date(sale.created_at).toISOString().split('T')[0];
        salesByDate.set(date, (salesByDate.get(date) || 0) + 1);
        
        const current = salesByReseller.get(sale.reseller_id) || { count: 0, revenue: 0 };
        salesByReseller.set(sale.reseller_id, {
          count: current.count + 1,
          revenue: current.revenue + (sale.total_amount || 0)
        });
      });

      const daysWithData = salesByDate.size;
      const totalSold = productSales.length;
      const avgDailySales = daysWithData > 0 ? totalSold / Math.max(daysWithData, 1) : 0;
      const avgWeeklySales = avgDailySales * 7;
      const avgMonthlySales = avgDailySales * 30;

      const recentSales = productSales.filter(s => {
        const saleDate = new Date(s.created_at);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return saleDate >= sevenDaysAgo;
      }).length;

      const olderSales = productSales.filter(s => {
        const saleDate = new Date(s.created_at);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        return saleDate < sevenDaysAgo && saleDate >= fourteenDaysAgo;
      }).length;

      let trend: ProductInventoryMetrics['trend'] = 'no_sales';
      if (totalSold === 0) {
        trend = 'no_sales';
      } else if (daysWithData < 7) {
        trend = 'insufficient_data';
      } else if (recentSales > olderSales * 1.1) {
        trend = 'increasing';
      } else if (recentSales < olderSales * 0.9) {
        trend = 'decreasing';
      } else {
        trend = 'stable';
      }

      const leadTimeDays = product.lead_time_days ?? 7;
      const safetyStockDays = product.safety_stock_days ?? 7;
      const reviewPeriodDays = product.review_period_days ?? 7;
      const freightCostPerUnit = product.freight_cost_per_unit ?? 0;
      const minOrderQty = product.min_order_quantity ?? 1;
      const currentStock = product.stock ?? 0;
      const price = product.price ?? 0;

      const safetyStock = Math.ceil(avgDailySales * safetyStockDays);
      const reorderPoint = Math.ceil(avgDailySales * leadTimeDays + safetyStock);
      const recommendedStock = Math.ceil(avgDailySales * (leadTimeDays + reviewPeriodDays) + safetyStock);
      
      const rawPurchase = Math.max(0, recommendedStock - currentStock);
      const suggestedPurchase = Math.ceil(rawPurchase / minOrderQty) * minOrderQty;
      
      const daysUntilStockout = avgDailySales > 0 
        ? Math.floor(currentStock / avgDailySales) 
        : 999;

      const totalPurchaseCost = suggestedPurchase * (price + freightCostPerUnit);

      let status: ProductInventoryMetrics['status'] = 'healthy';
      if (currentStock === 0) {
        status = 'out_of_stock';
      } else if (currentStock <= reorderPoint) {
        status = 'reorder_now';
      } else if (daysUntilStockout <= leadTimeDays + 7) {
        status = 'low_stock';
      }

      const resellerBreakdown: ResellerSales[] = Array.from(salesByReseller.entries())
        .map(([resellerId, data]) => ({
          resellerId,
          resellerName: resellerMap.get(resellerId) || 'Unknown',
          totalSold: data.count,
          totalRevenue: data.revenue,
          percentage: totalSold > 0 ? (data.count / totalSold) * 100 : 0
        }))
        .sort((a, b) => b.totalSold - a.totalSold);

      return {
        productId: product.id,
        productName: product.description || 'No name',
        currentStock,
        avgDailySales,
        avgWeeklySales,
        avgMonthlySales,
        leadTimeDays,
        freightCostPerUnit,
        safetyStock,
        reorderPoint,
        recommendedStock,
        suggestedPurchase,
        daysUntilStockout,
        totalPurchaseCost,
        status,
        trend,
        resellerBreakdown,
        supplierName: product.supplier_name ?? null,
        minOrderQuantity: minOrderQty,
        safetyStockDays,
        reviewPeriodDays
      };
    }).sort((a, b) => {
      const statusOrder = { out_of_stock: 0, reorder_now: 1, low_stock: 2, healthy: 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return b.avgDailySales - a.avgDailySales;
    });
  }, [products, sales, resellers]);

  const summary = useMemo<InventorySummary>(() => {
    return {
      totalProducts: metrics.length,
      productsNeedingReorder: metrics.filter(m => m.status === 'reorder_now').length,
      productsOutOfStock: metrics.filter(m => m.status === 'out_of_stock').length,
      productsLowStock: metrics.filter(m => m.status === 'low_stock').length,
      productsHealthy: metrics.filter(m => m.status === 'healthy').length,
      totalSuggestedPurchaseValue: metrics.reduce((sum, m) => sum + m.totalPurchaseCost, 0),
      totalFreightCost: metrics.reduce((sum, m) => sum + (m.suggestedPurchase * m.freightCostPerUnit), 0)
    };
  }, [metrics]);

  // Only check configured if using context client, not main client
  const isActuallyLoading = loading || (!clientInitialized);
  
  return {
    metrics,
    summary,
    loading: isActuallyLoading,
    error,
    refetch: loadData
  };
}
