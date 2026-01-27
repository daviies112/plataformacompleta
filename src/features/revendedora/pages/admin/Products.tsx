import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Package, Plus, Pencil, Trash2, Bell, Settings, AlertTriangle, BarChart3, Boxes } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BestSellingProducts } from '@/components/inventory/BestSellingProducts';
import { LowStockAlert } from '@/components/inventory/LowStockAlert';
import { ProductEditModal } from '@/components/inventory/ProductEditModal';
import { StockForecastPanel } from '@/components/inventory/StockForecastPanel';
import { ProductInventorySettingsModal } from '@/components/inventory/ProductInventorySettingsModal';
import { useProductAnalytics } from '@/hooks/useProductAnalytics';

interface Product {
  id: string;
  description: string | null;
  reference: string | null;
  image: string | null;
  barcode: string | null;
  category: string | null;
  price: number | null;
  stock: number | null;
  low_stock_threshold?: number | null;
  notify_low_stock?: boolean;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [inventorySettingsProduct, setInventorySettingsProduct] = useState<any>(null);
  const [inventorySettingsOpen, setInventorySettingsOpen] = useState(false);
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);

  const { bestSellers, lowStockProducts, loading: analyticsLoading, refetch: refetchAnalytics } = useProductAnalytics();

  // Initialize Supabase client
  useEffect(() => {
    let mounted = true;
    
    async function initClient() {
      try {
        const client = await getSupabaseClient();
        if (mounted && client) {
          setSupabaseClient(client);
        }
      } catch (err) {
        console.error('[Products] Failed to init Supabase client:', err);
        toast.error('Erro ao conectar ao banco de dados');
        setLoading(false);
      }
    }
    
    initClient();
    return () => { mounted = false; };
  }, []);

  const loadProducts = useCallback(async () => {
    if (!supabaseClient) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('description');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, [supabaseClient]);

  // Load products when client is ready
  useEffect(() => {
    if (supabaseClient) {
      loadProducts();
    }
  }, [supabaseClient, loadProducts]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setEditModalOpen(true);
  };

  const handleSaved = () => {
    loadProducts();
    refetchAnalytics();
  };

  const filteredProducts = products.filter(product =>
    (product.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.reference || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (product: Product) => {
    const stock = product.stock ?? 0;
    const threshold = product.low_stock_threshold ?? 5;
    
    if (stock === 0) return 'out_of_stock';
    if (stock <= threshold) return 'low_stock';
    return 'in_stock';
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando produtos...</div>;
  }

  const handleOpenInventorySettings = (product: any) => {
    setInventorySettingsProduct(product);
    setInventorySettingsOpen(true);
  };

  const handleInventorySettingsSaved = () => {
    loadProducts();
    refetchAnalytics();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Gerenciar Produtos</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gerencie o catálogo de produtos da plataforma
          </p>
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {lowStockProducts.length > 0 && (
        <LowStockAlert products={lowStockProducts} loading={analyticsLoading} compact />
      )}

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <Boxes className="h-4 w-4" />
            Catálogo
          </TabsTrigger>
          <TabsTrigger value="forecasting" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Projeções de Estoque
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <BestSellingProducts products={bestSellers} loading={analyticsLoading} />
            </div>
            <div>
              <LowStockAlert products={lowStockProducts} loading={analyticsLoading} />
            </div>
          </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Produtos</CardTitle>
          <CardDescription>
            {products.length} produto{products.length !== 1 ? 's' : ''} cadastrado{products.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição, código de barras ou referência..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 min-h-[44px]"
              />
            </div>
          </div>

          <div className="overflow-x-auto -mx-4 px-4">
            <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Imagem</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden sm:table-cell">Código de Barras</TableHead>
                <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead className="hidden sm:table-cell">Alerta</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product);
                const threshold = product.low_stock_threshold ?? 5;
                const hasNotification = product.notify_low_stock !== false;
                
                return (
                  <TableRow key={product.id} className={stockStatus === 'out_of_stock' ? 'bg-red-50/50' : stockStatus === 'low_stock' ? 'bg-orange-50/50' : ''}>
                    <TableCell>
                      <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                        {product.image ? (
                          <img src={product.image} alt={product.description || 'Produto'} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.description || 'Sem descrição'}</div>
                        {product.reference && (
                          <div className="text-sm text-muted-foreground">
                            Ref: {product.reference}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-sm">{product.barcode || '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {product.category && (
                        <Badge variant="secondary">{product.category}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {product.price ? formatCurrency(product.price) : '-'}
                    </TableCell>
                    <TableCell>
                      {product.stock !== null && product.stock !== undefined ? (
                        stockStatus === 'out_of_stock' ? (
                          <Badge variant="destructive">Esgotado</Badge>
                        ) : stockStatus === 'low_stock' ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge className="bg-orange-500 hover:bg-orange-600 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {product.stock} un.
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Estoque baixo! Limite: {threshold} un.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <Badge variant="default">{product.stock} un.</Badge>
                        )
                      ) : (
                        <Badge variant="outline">-</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={`flex items-center gap-1 text-sm ${hasNotification ? 'text-primary' : 'text-muted-foreground'}`}>
                              <Bell className={`h-4 w-4 ${hasNotification ? 'fill-current' : ''}`} />
                              <span className="text-xs">{threshold}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{hasNotification ? `Notificar quando atingir ${threshold} unidades` : 'Notificações desativadas'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8" onClick={() => handleEdit(product)}>
                                <Settings className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Configurar produto e alertas</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8" onClick={() => handleEdit(product)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              </TableBody>
            </Table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
              </p>
              {!searchTerm && (
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Primeiro Produto
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="forecasting" className="mt-6">
          <StockForecastPanel onConfigureProduct={handleOpenInventorySettings} />
        </TabsContent>
      </Tabs>

      <ProductEditModal
        product={editingProduct}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSaved={handleSaved}
      />

      <ProductInventorySettingsModal
        product={inventorySettingsProduct}
        isOpen={inventorySettingsOpen}
        onClose={() => setInventorySettingsOpen(false)}
        onSave={handleInventorySettingsSaved}
      />
    </div>
  );
}
