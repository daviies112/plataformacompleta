import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'sale' | 'general';
  title: string;
  message: string;
  data?: any;
  read_at: string | null;
  created_at: string;
}

interface LowStockProduct {
  id: string;
  description: string | null;
  stock: number | null;
  low_stock_threshold: number | null;
}

export function useNotifications() {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [notifiedProducts, setNotifiedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const generateLowStockNotifications = useCallback((products: LowStockProduct[]) => {
    const newNotifications: Notification[] = [];
    const now = new Date().toISOString();

    products.forEach(product => {
      if (notifiedProducts.has(product.id)) return;
      
      const stock = product.stock ?? 0;
      const threshold = product.low_stock_threshold ?? 5;

      if (stock === 0) {
        newNotifications.push({
          id: `stock-${product.id}-${Date.now()}`,
          type: 'out_of_stock',
          title: 'Produto Esgotado!',
          message: `"${product.description || 'Produto'}" está sem estoque.`,
          data: { productId: product.id },
          read_at: null,
          created_at: now
        });
      } else if (stock <= threshold) {
        newNotifications.push({
          id: `stock-${product.id}-${Date.now()}`,
          type: 'low_stock',
          title: 'Estoque Baixo',
          message: `"${product.description || 'Produto'}" tem apenas ${stock} unidade${stock !== 1 ? 's' : ''}.`,
          data: { productId: product.id, stock, threshold },
          read_at: null,
          created_at: now
        });
      }
    });

    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev].slice(0, 50));
      setNotifiedProducts(prev => {
        const next = new Set(prev);
        products.forEach(p => next.add(p.id));
        return next;
      });

      if (newNotifications.some(n => n.type === 'out_of_stock')) {
        toast.error('Produtos esgotados!', {
          description: 'Há produtos sem estoque que precisam de reposição.'
        });
      } else {
        toast.warning('Estoque baixo!', {
          description: 'Alguns produtos estão com estoque abaixo do limite.'
        });
      }
    }
  }, [notifiedProducts]);

  const checkLowStock = useCallback(async () => {
    if (supabaseLoading || !configured || !supabase) return;

    try {
      setLoading(true);
      let data: any[] = [];
      let error: any = null;

      try {
        const result = await supabase
          .from('products')
          .select('id, description, stock, low_stock_threshold, notify_low_stock')
          .or('notify_low_stock.is.null,notify_low_stock.eq.true');
        
        data = result.data || [];
        error = result.error;
      } catch (e) {
        error = e;
      }

      if (error && error.code === '42703') {
        const fallbackResult = await supabase
          .from('products')
          .select('id, description, stock');
        
        data = (fallbackResult.data || []).map((p: any) => ({
          ...p,
          low_stock_threshold: 5,
          notify_low_stock: true
        }));
      } else if (error) {
        throw error;
      }

      const lowStock = (data || []).filter(product => {
        const stock = (product as any).stock ?? 0;
        const threshold = (product as any).low_stock_threshold ?? 5;
        return stock <= threshold;
      }) as LowStockProduct[];

      setLowStockProducts(lowStock);
      generateLowStockNotifications(lowStock);
    } catch (error) {
      console.error('[useNotifications] Error checking low stock:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, supabaseLoading, configured, generateLowStockNotifications]);

  useEffect(() => {
    if (supabaseLoading || !configured || !supabase) return;

    checkLowStock();

    const interval = setInterval(checkLowStock, 60000);

    const channel = supabase
      .channel('product_stock_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload) => {
          const newStock = (payload.new as any).stock ?? 0;
          const oldStock = (payload.old as any).stock ?? 0;
          
          if (newStock < oldStock) {
            setNotifiedProducts(prev => {
              const next = new Set(prev);
              next.delete((payload.new as any).id);
              return next;
            });
            checkLowStock();
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [supabase, supabaseLoading, configured, checkLowStock]);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read_at).length);
  }, [notifications]);

  const markAsRead = useCallback((notificationId?: string) => {
    const now = new Date().toISOString();
    setNotifications(prev => 
      prev.map(n => 
        notificationId 
          ? (n.id === notificationId ? { ...n, read_at: now } : n)
          : { ...n, read_at: now }
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    const now = new Date().toISOString();
    setNotifications(prev => prev.map(n => ({ ...n, read_at: now })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setNotifiedProducts(new Set());
  }, []);

  return {
    notifications,
    unreadCount,
    lowStockProducts,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    refetch: checkLowStock,
    loading: loading || supabaseLoading || !configured
  };
}
