import { useState, useEffect, useMemo } from 'react';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/revendedora/components/ui/card';
import { Store as StoreIcon, Package, Plus, X, Save, ArrowRight, Search, ShoppingCart, Boxes } from 'lucide-react';
import { Button } from '@/features/revendedora/components/ui/button';
import { toast } from 'sonner';
import { Badge } from '@/features/revendedora/components/ui/badge';
import { getResellerId as getStoredResellerId } from '@/features/revendedora/lib/resellerAuth';
import { Input } from '@/features/revendedora/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/revendedora/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/features/revendedora/components/ui/dialog';
import { SellProductModal } from '@/features/revendedora/components/modals/SellProductModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/revendedora/components/ui/tabs';
import { ProductRequestModal } from '@/features/revendedora/components/modals/ProductRequestModal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/features/revendedora/components/ui/accordion';
import { ResellerProfileForm } from '@/features/revendedora/components/reseller/ResellerProfileForm';
import { User } from 'lucide-react';

export default function Store() {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedProduct, setDraggedProduct] = useState<any>(null);
  const [viewingProduct, setViewingProduct] = useState<any>(null);
  const [sellingProduct, setSellingProduct] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [requestingProduct, setRequestingProduct] = useState<any>(null);

  useEffect(() => {
    if (!supabaseLoading && configured) {
      loadProducts();
      loadStoreConfiguration();
    } else if (!supabaseLoading && !configured) {
      setLoading(false);
    }
  }, [supabaseLoading, configured]);

  const loadProducts = async () => {
    if (!supabase) {
      console.log('[Store] Supabase not configured');
      setLoading(false);
      return;
    }
    
    try {
      console.log('[Store] Loading products...');
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('description');

      if (error) throw error;
      console.log('[Store] Products loaded:', data?.length || 0);
      setAllProducts(data || []);
    } catch (error) {
      console.error('[Store] Error loading products:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const getResellerId = (): string | null => {
    const storedReseller = getStoredResellerId();
    if (storedReseller) return storedReseller;
    console.error('[Store] Reseller ID não encontrado no localStorage');
    return null;
  };

  const loadStoreConfiguration = async () => {
    if (!supabase) {
      console.log('[Store] Supabase not configured, using localStorage fallback');
      const saved = localStorage.getItem('reseller_store_products');
      if (saved) {
        setStoreProducts(JSON.parse(saved));
      }
      return;
    }

    try {
      const resellerId = getResellerId();
      if (!resellerId) {
        console.error('[Store] Cannot load store configuration: reseller_id is missing');
        toast.error('Por favor, faça login novamente');
        return;
      }
      console.log('[Store] Loading store configuration for reseller:', resellerId);
      
      const { data, error } = await supabase
        .from('reseller_stores')
        .select('product_ids')
        .eq('reseller_id', resellerId)
        .single();

      if (error && error.code !== 'PGRST116') {
        if (error.code === 'PGRST205') {
          console.log('[Store] Table reseller_stores not found, using empty store');
        } else {
          console.error('[Store] Error loading store configuration:', error);
        }
        return;
      }

      if (data && data.product_ids && data.product_ids.length > 0) {
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('*')
          .in('id', data.product_ids);

        if (productsError) {
          console.error('[Store] Error loading store products:', productsError);
          return;
        }

        console.log('[Store] Loaded', products?.length || 0, 'products from Supabase');
        setStoreProducts(products || []);
      } else {
        console.log('[Store] No store configuration found for reseller');
        setStoreProducts([]);
      }
    } catch (error) {
      console.error('[Store] Error loading store configuration:', error);
    }
  };

  const saveStoreConfiguration = async () => {
    setSaving(true);
    try {
      if (!supabase) {
        console.log('[Store] Supabase not configured, using localStorage fallback');
        localStorage.setItem('reseller_store_products', JSON.stringify(storeProducts));
        toast.success('Configuração da loja salva localmente!');
        setSaving(false);
        return;
      }

      const resellerId = getResellerId();
      if (!resellerId) {
        console.error('[Store] Cannot save store configuration: reseller_id is missing');
        toast.error('Por favor, faça login novamente');
        setSaving(false);
        return;
      }
      const productIds = storeProducts.map(p => p.id);
      
      console.log('[Store] Saving store configuration for reseller:', resellerId);
      console.log('[Store] Product IDs:', productIds);

      const { data: existing } = await supabase
        .from('reseller_stores')
        .select('id')
        .eq('reseller_id', resellerId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('reseller_stores')
          .update({ product_ids: productIds } as any)
          .eq('reseller_id', resellerId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reseller_stores')
          .insert({ 
            reseller_id: resellerId, 
            product_ids: productIds 
          } as any);

        if (error) throw error;
      }

      console.log('[Store] Store configuration saved successfully');
      toast.success('Configuração da loja salva com sucesso no Supabase!');
    } catch (error: any) {
      console.error('[Store] Error saving store:', error);
      toast.error('Erro ao salvar configuração da loja: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const addProductToStore = (product: any) => {
    if (!storeProducts.find(p => p.id === product.id)) {
      setStoreProducts([...storeProducts, product]);
      toast.success(`${product.description} adicionado à loja`);
    } else {
      toast.info('Produto já está na loja');
    }
  };

  const removeProductFromStore = (productId: string) => {
    setStoreProducts(storeProducts.filter(p => p.id !== productId));
    toast.success('Produto removido da loja');
  };

  const handleDragStart = (product: any) => {
    setDraggedProduct(product);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedProduct) {
      addProductToStore(draggedProduct);
      setDraggedProduct(null);
    }
  };

  const handleSaleComplete = () => {
    setSellingProduct(null);
    loadProducts();
  };

  const categories = useMemo(() => {
    const uniqueCategories = new Set(
      allProducts
        .map(p => p.category)
        .filter(c => c && c.trim() !== '')
    );
    return Array.from(uniqueCategories).sort();
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      const matchesSearch = !searchTerm || 
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.reference?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || 
        product.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [allProducts, searchTerm, selectedCategory]);

  const storeProductsByCategory = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    
    storeProducts.forEach(product => {
      const category = product.category || 'Sem Categoria';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(product);
    });
    
    return grouped;
  }, [storeProducts]);

  const allProductsByCategory = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    allProducts.forEach(product => {
      const category = product.category || 'Sem Categoria';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(product);
    });
    return grouped;
  }, [allProducts]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (supabaseLoading) {
    return <div className="flex items-center justify-center h-64">Carregando configuração...</div>;
  }

  if (!configured) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-2">Supabase não configurado</p>
          <p className="text-sm text-muted-foreground">Por favor, configure as credenciais do Supabase</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando produtos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Minha Loja</h1>
          <p className="text-muted-foreground">
            Configure sua loja selecionando os produtos que deseja vender
          </p>
        </div>
        <Button onClick={saveStoreConfiguration} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar Configuração'}
        </Button>
      </div>

      <Tabs defaultValue="minha-loja" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="minha-loja" className="flex items-center gap-2">
            <StoreIcon className="h-4 w-4" />
            Minha Loja
          </TabsTrigger>
          <TabsTrigger value="meu-perfil" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Meu Perfil
          </TabsTrigger>
          <TabsTrigger value="estoque" className="flex items-center gap-2">
            <Boxes className="h-4 w-4" />
            Estoque da Empresa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="minha-loja">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Produtos Disponíveis
                </CardTitle>
                <CardDescription>
                  Clique no produto para visualizar ou arraste para adicionar à sua loja
                </CardDescription>
                <div className="flex gap-2 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou referência..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {filteredProducts.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {filteredProducts.length} produto(s) encontrado(s)
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Package className="h-12 w-12 mb-2" />
                    <p>Nenhum produto encontrado</p>
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      draggable
                      onDragStart={() => handleDragStart(product)}
                      onClick={() => setViewingProduct(product)}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:border-primary hover:shadow-sm transition-all cursor-pointer bg-card"
                    >
                      <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.description || 'Produto'} 
                            className="h-full w-full object-cover" 
                          />
                        ) : (
                          <Package className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{product.description || 'Sem descrição'}</h4>
                        {product.category && (
                          <Badge variant="secondary" className="text-xs mb-1">
                            {product.category}
                          </Badge>
                        )}
                        {product.reference && (
                          <p className="text-sm text-muted-foreground">Ref: {product.reference}</p>
                        )}
                        <p className="text-sm font-semibold text-primary">
                          {product.price ? formatCurrency(product.price) : '-'}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          addProductToStore(product);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StoreIcon className="h-5 w-5" />
                  Minha Loja
                </CardTitle>
                <CardDescription>
                  Produtos selecionados para sua loja ({storeProducts.length} produtos)
                </CardDescription>
              </CardHeader>
              <CardContent 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="min-h-[400px] max-h-[600px] overflow-y-auto"
              >
                {storeProducts.length === 0 ? (
                  <div 
                    className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/10"
                  >
                    <ArrowRight className="h-12 w-12 text-muted-foreground mb-4 rotate-180" />
                    <p className="text-muted-foreground text-center">
                      Arraste produtos aqui ou clique no botão <Plus className="inline h-4 w-4" /> para adicionar à sua loja
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(storeProductsByCategory).map(([category, products]) => (
                      <div key={category} className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <h3 className="font-semibold text-lg">{category}</h3>
                          <Badge variant="outline">{products.length}</Badge>
                        </div>
                        {products.map((product) => (
                          <div
                            key={product.id}
                            onClick={() => setSellingProduct(product)}
                            className="flex items-center gap-3 p-3 border rounded-lg bg-primary/5 border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors"
                          >
                            <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                              {product.image ? (
                                <img 
                                  src={product.image} 
                                  alt={product.description || 'Produto'} 
                                  className="h-full w-full object-cover" 
                                />
                              ) : (
                                <Package className="h-8 w-8 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{product.description || 'Sem descrição'}</h4>
                              {product.reference && (
                                <p className="text-sm text-muted-foreground">Ref: {product.reference}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-sm font-semibold text-primary">
                                  {product.price ? formatCurrency(product.price) : '-'}
                                </p>
                                {product.stock !== undefined && (
                                  <Badge variant={product.stock > 0 ? "secondary" : "destructive"} className="text-xs">
                                    {product.stock} un.
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSellingProduct(product);
                                }}
                              >
                                <ShoppingCart className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeProductFromStore(product.id);
                                }}
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {storeProducts.length > 0 && (
            <Card className="border-primary mt-6">
              <CardHeader>
                <CardTitle className="text-primary">Resumo da Loja</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Produtos</p>
                    <p className="text-2xl font-bold">{storeProducts.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total do Catálogo</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(storeProducts.reduce((sum, p) => sum + (p.price || 0), 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="default" className="mt-1">Configurada</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="meu-perfil">
          <ResellerProfileForm />
        </TabsContent>

        <TabsContent value="estoque">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="h-5 w-5" />
                Estoque da Empresa
              </CardTitle>
              <CardDescription>
                Veja todos os produtos disponíveis no estoque da empresa e solicite os que deseja
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(allProductsByCategory).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Package className="h-16 w-16 mb-4" />
                  <p className="text-lg">Nenhum produto disponível no estoque</p>
                </div>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {Object.entries(allProductsByCategory).map(([category, products]) => (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-lg">{category}</span>
                          <Badge variant="secondary">{products.length} produto(s)</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 pt-2">
                          {products.map((product) => {
                            const productImage = product.image || product.image_url;
                            return (
                              <div
                                key={product.id}
                                onClick={() => setRequestingProduct(product)}
                                className="flex items-center gap-4 p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all cursor-pointer bg-card group"
                              >
                                <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border">
                                  {productImage ? (
                                    <img 
                                      src={productImage} 
                                      alt={product.description || 'Produto'} 
                                      className="h-full w-full object-cover" 
                                    />
                                  ) : (
                                    <Package className="h-10 w-10 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                                    {product.description || 'Sem descrição'}
                                  </h4>
                                  {product.reference && (
                                    <p className="text-sm text-muted-foreground">
                                      REF: {product.reference}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-3 mt-2">
                                    <p className="text-lg font-bold text-primary">
                                      {formatCurrency(product.price || 0)}
                                    </p>
                                    <Badge 
                                      variant={product.stock > 0 ? "secondary" : "destructive"}
                                      className="text-xs"
                                    >
                                      {product.stock !== undefined ? (
                                        product.stock > 0 ? `${product.stock} em estoque` : 'Sem estoque'
                                      ) : 'Estoque não informado'}
                                    </Badge>
                                  </div>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRequestingProduct(product);
                                  }}
                                >
                                  <ShoppingCart className="h-4 w-4 mr-2" />
                                  Solicitar
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!viewingProduct} onOpenChange={(open) => !open && setViewingProduct(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {viewingProduct?.description || 'Produto'}
            </DialogTitle>
            <DialogDescription>
              Visualize os detalhes completos do produto e adicione à sua loja
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative w-full h-[400px] rounded-lg bg-muted flex items-center justify-center overflow-hidden">
              {viewingProduct?.image ? (
                <img 
                  src={viewingProduct.image} 
                  alt={viewingProduct.description || 'Produto'} 
                  className="w-full h-full object-contain" 
                />
              ) : (
                <Package className="h-24 w-24 text-muted-foreground" />
              )}
            </div>
            
            <div className="space-y-3">
              {viewingProduct?.reference && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Referência</p>
                  <p className="text-lg">{viewingProduct.reference}</p>
                </div>
              )}
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Preço</p>
                  <p className="text-2xl font-bold text-primary">
                    {viewingProduct?.price 
                      ? formatCurrency(viewingProduct.price)
                      : '-'}
                  </p>
                </div>
                
                {viewingProduct?.stock !== undefined && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estoque</p>
                    <p className="text-2xl font-bold">
                      {viewingProduct.stock} unidades
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <DialogClose asChild>
                <Button variant="outline" className="flex-1">
                  <X className="mr-2 h-4 w-4" />
                  Fechar
                </Button>
              </DialogClose>
              <Button 
                className="flex-1" 
                onClick={() => {
                  if (viewingProduct) {
                    addProductToStore(viewingProduct);
                    setViewingProduct(null);
                  }
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar à Loja
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SellProductModal
        product={sellingProduct}
        isOpen={!!sellingProduct}
        onClose={() => setSellingProduct(null)}
        resellerId="00000000-0000-0000-0000-000000000000"
        companyId={sellingProduct?.company_id || '00000000-0000-0000-0000-000000000000'}
      />

      <ProductRequestModal
        product={requestingProduct}
        isOpen={!!requestingProduct}
        onClose={() => setRequestingProduct(null)}
        resellerId={getResellerId()}
      />
    </div>
  );
}
