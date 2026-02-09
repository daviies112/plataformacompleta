import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getResellerId as getStoredResellerId } from '@/features/revendedora/lib/resellerAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const getResellerId = (): string | null => {
    const storedReseller = getStoredResellerId();
    if (storedReseller) return storedReseller;
    console.error('[AdminOrders] Reseller ID não encontrado no localStorage');
    return null;
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const resellerId = getResellerId();
      if (!resellerId) {
        console.error('[AdminOrders] Cannot load orders: reseller_id is missing');
        toast.error('Por favor, faça login novamente');
        setLoading(false);
        return;
      }
      console.log('[AdminOrders] Loading orders for reseller:', resellerId);

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('reseller_id', resellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('[AdminOrders] Loaded', (data || []).length, 'orders for reseller:', resellerId);
      setOrders(data || []);
    } catch (error) {
      console.error('[AdminOrders] Error loading orders:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      pending: { label: 'Pendente', variant: 'outline' },
      paid: { label: 'Pago', variant: 'default' },
      processing: { label: 'Processando', variant: 'secondary' },
      shipped: { label: 'Enviado', variant: 'default' },
      delivered: { label: 'Entregue', variant: 'default' },
      cancelled: { label: 'Cancelado', variant: 'destructive' },
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const filteredOrders = orders.filter(order =>
    (order.order_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando pedidos...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Pedidos</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Gerencie todos os pedidos da plataforma
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Pedidos</CardTitle>
          <CardDescription>
            {orders.length} pedido{orders.length !== 1 ? 's' : ''} registrado{orders.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número do pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 min-h-[44px]"
              />
            </div>
          </div>

          <div className="overflow-x-auto -mx-4 px-4">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Número do Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Status de Pagamento</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number || '-'}</TableCell>
                    <TableCell>
                      {order.created_at ? new Date(order.created_at).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status || 'pending')}</TableCell>
                    <TableCell className="hidden sm:table-cell">{getStatusBadge(order.payment_status || 'pending')}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {order.total_amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhum pedido encontrado' : 'Nenhum pedido realizado ainda'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}