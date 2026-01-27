import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

interface ProductWithSales {
  id: string;
  description: string | null;
  reference: string | null;
  image: string | null;
  category: string | null;
  price: number | null;
  stock: number | null;
  low_stock_threshold: number | null;
  totalSold: number;
  totalRevenue: number;
}

interface LowStockProduct {
  id: string;
  description: string | null;
  reference: string | null;
  image: string | null;
  stock: number | null;
  low_stock_threshold: number | null;
  isOutOfStock: boolean;
  isCritical: boolean;
}

interface ProductAnalytics {
  bestSellers: ProductWithSales[];
  lowStockProducts: LowStockProduct[];
  totalProducts: number;
  totalLowStock: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useProductAnalytics(): ProductAnalytics {
  const { client: contextClient, loading: supabaseLoading, configured } = useSupabase();
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainClient, setMainClient] = useState<SupabaseClient | null>(null);

  // Initialize main Supabase client asynchronously
  useEffect(() => {
    let mounted = true;
    
    async function initClient() {
      try {
        const client = await getSupabaseClient();
        if (mounted && client) {
          setMainClient(client);
        }
      } catch (err) {
        console.error('[ProductAnalytics] Failed to init main client:', err);
      }
    }
    
    initClient();
    return () => { mounted = false; };
  }, []);

  // Use context client if available and configured, otherwise use main client
  const supabase = (configured && contextClient) ? contextClient : mainClient;

  const loadData = useCallback(async () => {
    if (!supabase) {
      return;
    }

    try {
      setLoading(true);
      const [productsResult, salesResult] = await Promise.all([
        supabase.from('products').select('*'),
        supabase
          .from('sales_with_split')
          .select('product_id, total_amount, paid')
          .eq('paid', true)
      ]);

      if (productsResult.error) throw productsResult.error;
      if (salesResult.error) throw salesResult.error;

      setProducts(productsResult.data || []);
      setSales(salesResult.data || []);
    } catch (error) {
      console.error('[ProductAnalytics] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    loadData();

    const salesChannel = supabase
      .channel('sales_analytics')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales_with_split' },
        () => loadData()
      )
      .subscribe();

    const productsChannel = supabase
      .channel('products_analytics')
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
  }, [supabase, loadData]);

  const bestSellers = useMemo(() => {
    const salesByProduct = new Map<string, { count: number; revenue: number }>();
    
    sales.forEach(sale => {
      const current = salesByProduct.get(sale.product_id) || { count: 0, revenue: 0 };
      salesByProduct.set(sale.product_id, {
        count: current.count + 1,
        revenue: current.revenue + (sale.total_amount || 0)
      });
    });

    const productsWithSales: ProductWithSales[] = products
      .map(product => {
        const salesData = salesByProduct.get(product.id) || { count: 0, revenue: 0 };
        return {
          id: product.id,
          description: product.description,
          reference: product.reference,
          image: product.image,
          category: product.category,
          price: product.price,
          stock: product.stock,
          low_stock_threshold: product.low_stock_threshold || 5,
          totalSold: salesData.count,
          totalRevenue: salesData.revenue
        };
      })
      .filter(p => p.totalSold > 0)
      .sort((a, b) => b.totalSold - a.totalSold);

    return productsWithSales.slice(0, 10);
  }, [products, sales]);

  const lowStockProducts = useMemo(() => {
    return products
      .filter(product => {
        const stock = product.stock ?? 0;
        const threshold = product.low_stock_threshold ?? 5;
        return stock <= threshold;
      })
      .map(product => ({
        id: product.id,
        description: product.description,
        reference: product.reference,
        image: product.image,
        stock: product.stock,
        low_stock_threshold: product.low_stock_threshold ?? 5,
        isOutOfStock: (product.stock ?? 0) === 0,
        isCritical: (product.stock ?? 0) > 0 && (product.stock ?? 0) <= (product.low_stock_threshold ?? 5)
      }))
      .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
  }, [products]);

  return {
    bestSellers,
    lowStockProducts,
    totalProducts: products.length,
    totalLowStock: lowStockProducts.length,
    loading: loading || supabaseLoading,
    refetch: loadData
  };
}
