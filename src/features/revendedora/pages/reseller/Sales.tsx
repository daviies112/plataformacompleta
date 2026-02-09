import { useState, useEffect, useMemo } from 'react';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/revendedora/components/ui/card';
import { Badge } from '@/features/revendedora/components/ui/badge';
import { Input } from '@/features/revendedora/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/revendedora/components/ui/select';
import { getResellerId as getStoredResellerId } from '@/features/revendedora/lib/resellerAuth';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/features/revendedora/components/ui/table';
import { 
  ShoppingCart, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  CreditCard, 
  Banknote,
  Wallet,
  Calendar,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { SplitService } from '@/features/revendedora/services/SplitService';

interface Sale {
  id: string;
  product_id: string;
  reseller_id: string;
  company_id: string;
  payment_method: string;
  status: string | null;
  total_amount: number;
  reseller_amount: number;
  company_amount: number;
  commission_percentage: number | null;
  paid: boolean | null;
  paid_at: string | null;
  customer_name: string | null;
  customer_email: string | null;
  created_at: string | null;
  product?: {
    id: string;
    description: string | null;
    reference: string | null;
    image: string | null;
  };
}

export default function ResellerSales() {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const getResellerId = (): string | null => {
    const storedReseller = getStoredResellerId();
    if (storedReseller) return storedReseller;
    console.error('[Sales] Reseller ID não encontrado no localStorage');
    return null;
  };

  useEffect(() => {
    if (!supabaseLoading && configured && supabase) {
      loadSales();
      const cleanup = setupRealtimeSubscription();
      return () => {
        cleanup?.();
      };
    }
  }, [supabase, supabaseLoading, configured]);

  const loadSales = async () => {
    if (!supabase) {
      console.log('[Sales] Supabase not configured');
      setLoading(false);
      return;
    }

    try {
      const resellerId = getResellerId();
      if (!resellerId) {
        console.error('[Sales] Cannot load sales: reseller_id is missing');
        toast.error('Por favor, faça login novamente');
        setLoading(false);
        return;
      }
      console.log('[Sales] ===== DEBUG =====');
      console.log('[Sales] Loading sales for reseller_id:', resellerId);
      console.log('[Sales] Se não aparecer vendas, verifique se este ID corresponde ao da loja');
      console.log('[Sales] Acesse /api/health/sales-debug para ver os IDs das vendas existentes');

      const { data: salesData, error: salesError } = await supabase
        .from('sales_with_split')
        .select('*')
        .eq('reseller_id', resellerId)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      if (salesData && salesData.length > 0) {
        const productIds = [...new Set(salesData.map(s => s.product_id))];
        
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, description, reference, image')
          .in('id', productIds);

        if (productsError) {
          console.error('[Sales] Error loading products:', productsError);
        }

        const productsMap = new Map(
          (productsData || []).map(p => [p.id, p])
        );

        const salesWithProducts = salesData.map(sale => ({
          ...sale,
          product: productsMap.get(sale.product_id)
        }));

        console.log('[Sales] Loaded', salesWithProducts.length, 'sales');
        setSales(salesWithProducts);
      } else {
        console.log('[Sales] No sales found');
        setSales([]);
      }
    } catch (error) {
      console.error('[Sales] Error loading sales:', error);
      toast.error('Erro ao carregar vendas');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!supabase) return;

    const resellerId = getResellerId();
    if (!resellerId) {
      console.error('[Sales] Cannot setup realtime subscription: reseller_id is missing');
      return;
    }
    
    const channel = supabase
      .channel('sales_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_with_split',
          filter: `reseller_id=eq.${resellerId}`
        },
        (payload) => {
          console.log('[Sales] Real-time update received:', payload);
          loadSales();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      if (statusFilter === 'pending' && sale.status !== 'aguardando_pagamento') {
        return false;
      }
      if (statusFilter === 'confirmed' && sale.status !== 'confirmada') {
        return false;
      }

      if (startDate && sale.created_at) {
        const saleDate = new Date(sale.created_at);
        const filterStart = new Date(startDate);
        filterStart.setHours(0, 0, 0, 0);
        if (saleDate < filterStart) return false;
      }

      if (endDate && sale.created_at) {
        const saleDate = new Date(sale.created_at);
        const filterEnd = new Date(endDate);
        filterEnd.setHours(23, 59, 59, 999);
        if (saleDate > filterEnd) return false;
      }

      return true;
    });
  }, [sales, statusFilter, startDate, endDate]);

  const summaryStats = useMemo(() => {
    const totalSales = filteredSales.length;
    const totalEarned = filteredSales
      .filter(s => s.paid === true)
      .reduce((sum, s) => sum + (s.reseller_amount || 0), 0);
    const pendingPayments = filteredSales
      .filter(s => s.paid !== true && s.status !== 'cancelada')
      .reduce((sum, s) => sum + (s.reseller_amount || 0), 0);

    return { totalSales, totalEarned, pendingPayments };
  }, [filteredSales]);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'confirmada':
        return <Badge className="bg-green-500 hover:bg-green-600">Confirmada</Badge>;
      case 'cancelada':
        return <Badge variant="destructive">Cancelada</Badge>;
      case 'aguardando_pagamento':
      default:
        return <Badge variant="secondary">Aguardando Pagamento</Badge>;
    }
  };

  const getPaidBadge = (paid: boolean | null) => {
    if (paid === true) {
      return (
        <Badge className="bg-green-500 hover:bg-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Pago
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        Pendente
      </Badge>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'pix':
        return <Wallet className="h-4 w-4" />;
      case 'cartao':
      case 'cartão':
        return <CreditCard className="h-4 w-4" />;
      case 'dinheiro':
        return <Banknote className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'pix':
        return 'PIX';
      case 'cartao':
      case 'cartão':
        return 'Cartão';
      case 'dinheiro':
        return 'Dinheiro';
      default:
        return method || '-';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  if (loading || supabaseLoading || !configured) {
    return <div className="flex items-center justify-center h-64">Carregando vendas...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Minhas Vendas</h1>
        <p className="text-muted-foreground">Acompanhe o desempenho das suas vendas</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalSales}</div>
            <p className="text-xs text-muted-foreground">vendas realizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {SplitService.formatCurrency(summaryStats.totalEarned)}
            </div>
            <p className="text-xs text-muted-foreground">comissões pagas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {SplitService.formatCurrency(summaryStats.pendingPayments)}
            </div>
            <p className="text-xs text-muted-foreground">aguardando pagamento</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Vendas</CardTitle>
          <CardDescription>
            {filteredSales.length} venda{filteredSales.length !== 1 ? 's' : ''} encontrada{filteredSales.length !== 1 ? 's' : ''}
          </CardDescription>
          <div className="flex flex-wrap gap-4 pt-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Aguardando Pagamento</SelectItem>
                <SelectItem value="confirmed">Confirmadas</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[150px]"
                placeholder="Data inicial"
              />
              <span className="text-muted-foreground">até</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[150px]"
                placeholder="Data final"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Nenhuma venda encontrada</p>
              <p className="text-sm text-muted-foreground">
                {statusFilter !== 'all' || startDate || endDate
                  ? 'Tente ajustar os filtros para ver mais resultados'
                  : 'Suas vendas aparecerão aqui quando realizadas'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Sua Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(sale.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                          {sale.product?.image ? (
                            <img 
                              src={sale.product.image} 
                              alt={sale.product?.description || 'Produto'} 
                              className="h-full w-full object-cover" 
                            />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium truncate max-w-[200px]">
                            {sale.product?.description || 'Produto não encontrado'}
                          </p>
                          {sale.product?.reference && (
                            <p className="text-sm text-muted-foreground">
                              Ref: {sale.product.reference}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(sale.payment_method)}
                        <span>{getPaymentMethodLabel(sale.payment_method)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {SplitService.formatCurrency(sale.total_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <span className="font-semibold text-primary">
                          {SplitService.formatCurrency(sale.reseller_amount)}
                        </span>
                        {sale.commission_percentage && (
                          <span className="text-sm text-muted-foreground ml-1">
                            ({sale.commission_percentage}%)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(sale.status)}
                    </TableCell>
                    <TableCell>
                      {getPaidBadge(sale.paid)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
