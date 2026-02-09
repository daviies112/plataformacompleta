import { useState, useEffect, useMemo } from 'react';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/revendedora/components/ui/card';
import { Store as StoreIcon, Package, Plus, X, Save, ArrowRight, Search, ShoppingCart, Boxes, Globe, Link2, Copy, Check, MessageCircle, QrCode, ExternalLink } from 'lucide-react';
import { Button } from '@/features/revendedora/components/ui/button';
import { toast } from 'sonner';
import { Badge } from '@/features/revendedora/components/ui/badge';
import { getResellerId as getStoredResellerId, resellerFetch } from '@/features/revendedora/lib/resellerAuth';
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
import { Switch } from '@/features/revendedora/components/ui/switch';
import { Label } from '@/features/revendedora/components/ui/label';

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
  const [isPublished, setIsPublished] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [urlCopied, setUrlCopied] = useState(false);
  const [publishSaving, setPublishSaving] = useState(false);

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

  const ensureTableExists = async () => {
    if (!supabase) return false;
    
    try {
      const { error } = await supabase
        .from('reseller_stores')
        .select('id')
        .limit(1);
      
      if (error?.code === '42P01') {
        console.log('[Store] Table reseller_stores not found, will use localStorage fallback');
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  const loadStoreConfiguration = async () => {
    const resellerId = getResellerId();
    console.log('[Store] Loading config for reseller:', resellerId);
    
    if (!resellerId) {
      console.error('[Store] Cannot load store configuration: reseller_id is missing');
      toast.error('Por favor, faça login novamente');
      return;
    }

    try {
      console.log('[Store] Loading store configuration via API...');
      
      // Use backend API which handles Supabase with service_role
      const response = await resellerFetch('/api/reseller/store-config');
      
      if (!response.ok) {
        throw new Error('Erro ao carregar configuração');
      }

      const result = await response.json();
      console.log('[Store] API response:', result);

      if (result.success && result.data) {
        const data = result.data;
        console.log('[Store] Config loaded:', data);
        
        setIsPublished(data.is_published || false);
        setStoreName(data.store_name || '');
        setStoreSlug(data.store_slug || '');
        
        // Load product details from Supabase if we have product_ids
        if (data.product_ids && Array.isArray(data.product_ids) && data.product_ids.length > 0 && supabase) {
          console.log('[Store] Fetching products for IDs:', data.product_ids);
          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*')
            .in('id', data.product_ids);

          if (productsError) {
            console.error('[Store] Error loading products details:', productsError);
          } else {
            console.log('[Store] Products loaded:', products?.length);
            setStoreProducts(products || []);
          }
        } else {
          setStoreProducts([]);
        }

        // Sync to localStorage as backup
        localStorage.setItem(`reseller_store_config_${resellerId}`, JSON.stringify({
          product_ids: data.product_ids || [],
          is_published: data.is_published,
          store_name: data.store_name,
          store_slug: data.store_slug,
        }));
      } else {
        console.log('[Store] No config found, checking localStorage fallback');
        const saved = localStorage.getItem(`reseller_store_config_${resellerId}`);
        if (saved) {
          const config = JSON.parse(saved);
          console.log('[Store] Local config found:', config);
          
          if (config.product_ids?.length > 0 && supabase) {
            const { data: products } = await supabase
              .from('products')
              .select('*')
              .in('id', config.product_ids);
            setStoreProducts(products || []);
          }
          setIsPublished(config.is_published || false);
          setStoreName(config.store_name || '');
          setStoreSlug(config.store_slug || '');
        }
      }
    } catch (error: any) {
      console.error('[Store] Error loading store configuration:', error);
      
      // Show specific error message based on error type
      if (error.message?.includes('TABLE_NOT_FOUND')) {
        toast.error('Tabela de configuração não existe no Supabase. Entre em contato com o administrador.');
      }
      
      // Try localStorage fallback
      const saved = localStorage.getItem(`reseller_store_config_${resellerId}`);
      if (saved) {
        const config = JSON.parse(saved);
        setStoreProducts(config.products || []);
        setIsPublished(config.is_published || false);
        setStoreName(config.store_name || '');
        setStoreSlug(config.store_slug || '');
      }
    }
  };

  const saveStoreConfiguration = async () => {
    setSaving(true);
    const resellerId = getResellerId();
    
    try {
      const slugRegex = /^[a-z0-9-]+$/;
      if (storeSlug && !slugRegex.test(storeSlug)) {
        toast.error('O slug deve conter apenas letras minúsculas, números e hífens');
        setSaving(false);
        return;
      }

      if (!resellerId) {
        console.error('[Store] Cannot save store configuration: reseller_id is missing');
        toast.error('Por favor, faça login novamente');
        setSaving(false);
        return;
      }

      const productIds = storeProducts.map(p => p.id);
      
      console.log('[Store] Saving store configuration via API for reseller:', resellerId);
      console.log('[Store] Product IDs:', productIds);

      // Save via backend API (which uses service_role for Supabase)
      const response = await resellerFetch('/api/reseller/store-config', {
        method: 'POST',
        body: JSON.stringify({
          product_ids: productIds,
          is_published: isPublished,
          store_name: storeName,
          store_slug: storeSlug || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao salvar configuração');
      }

      const result = await response.json();
      console.log('[Store] Save result:', result);

      // Also save to localStorage as backup
      const localConfig = {
        product_ids: productIds,
        products: storeProducts,
        is_published: isPublished,
        store_name: storeName,
        store_slug: storeSlug,
      };
      localStorage.setItem(`reseller_store_config_${resellerId}`, JSON.stringify(localConfig));

      console.log('[Store] Store configuration saved successfully');
      toast.success('Configuração da loja salva com sucesso!');
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

  const getPublicUrl = () => {
    const baseUrl = window.location.origin;
    const storeIdentifier = storeSlug || getResellerId();
    return `${baseUrl}/loja/${storeIdentifier}`;
  };

  const copyPublicUrl = () => {
    const url = getPublicUrl();
    navigator.clipboard.writeText(url);
    setUrlCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    const url = getPublicUrl();
    const message = encodeURIComponent(`Confira minha loja online: ${storeName || 'Minha Loja'}\n${url}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const openPublicStore = () => {
    const url = getPublicUrl();
    window.open(url, '_blank');
  };

  const generateSlugFromName = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleStoreNameChange = (name: string) => {
    setStoreName(name);
    if (!storeSlug || storeSlug === generateSlugFromName(storeName)) {
      setStoreSlug(generateSlugFromName(name));
    }
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
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="minha-loja" className="flex items-center gap-2">
            <StoreIcon className="h-4 w-4" />
            Minha Loja
          </TabsTrigger>
          <TabsTrigger value="publicar" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Publicar
          </TabsTrigger>
          <TabsTrigger value="meu-perfil" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Meu Perfil
          </TabsTrigger>
          <TabsTrigger value="estoque" className="flex items-center gap-2">
            <Boxes className="h-4 w-4" />
            Estoque
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

        <TabsContent value="publicar">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Configurações da Loja Pública
                </CardTitle>
                <CardDescription>
                  Configure e publique sua loja para que clientes possam ver seus produtos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <Label htmlFor="publish-toggle" className="text-base font-medium">
                      Publicar Loja
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {isPublished 
                        ? 'Sua loja está visível para clientes' 
                        : 'Sua loja está oculta'}
                    </p>
                  </div>
                  <Switch
                    id="publish-toggle"
                    checked={isPublished}
                    onCheckedChange={setIsPublished}
                    data-testid="switch-publish"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store-name">Nome da Loja</Label>
                  <Input
                    id="store-name"
                    placeholder="Nome definido pela empresa"
                    value={storeName}
                    disabled
                    className="bg-muted cursor-not-allowed"
                    data-testid="input-store-name"
                  />
                  <p className="text-xs text-muted-foreground">
                    O nome da loja é definido pela empresa
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store-slug">URL Personalizada (opcional)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">/loja/</span>
                    <Input
                      id="store-slug"
                      placeholder="minha-loja"
                      value={storeSlug}
                      onChange={(e) => setStoreSlug(generateSlugFromName(e.target.value))}
                      data-testid="input-store-slug"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use apenas letras minúsculas, números e hífens
                  </p>
                </div>

                <Button onClick={saveStoreConfiguration} disabled={saving} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Link da Sua Loja
                </CardTitle>
                <CardDescription>
                  Compartilhe este link com seus clientes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isPublished ? (
                  <>
                    <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
                      <p className="text-sm font-mono break-all">{getPublicUrl()}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" onClick={copyPublicUrl} data-testid="button-copy-url">
                        {urlCopied ? (
                          <Check className="mr-2 h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="mr-2 h-4 w-4" />
                        )}
                        {urlCopied ? 'Copiado!' : 'Copiar Link'}
                      </Button>
                      <Button variant="outline" onClick={shareOnWhatsApp} data-testid="button-share-whatsapp">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp
                      </Button>
                    </div>

                    <Button className="w-full" onClick={openPublicStore} data-testid="button-open-store">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Visualizar Loja
                    </Button>

                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <QrCode className="h-4 w-4" />
                        QR Code
                      </div>
                      <div className="p-4 border rounded-lg bg-white flex items-center justify-center">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getPublicUrl())}`}
                          alt="QR Code da Loja"
                          className="w-36 h-36"
                        />
                      </div>
                    </div>

                    {storeProducts.length === 0 && (
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Sua loja está publicada, mas sem produtos. Adicione produtos na aba "Minha Loja".
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">
                      {storeProducts.length === 0 
                        ? 'Adicione produtos à sua loja primeiro'
                        : 'Ative a publicação da loja para gerar o link'}
                    </p>
                    {storeProducts.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Vá para a aba "Minha Loja" e selecione os produtos
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Status da Loja</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-3xl font-bold text-primary">{storeProducts.length}</p>
                    <p className="text-sm text-muted-foreground">Produtos</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-3xl font-bold">{Object.keys(storeProductsByCategory).length}</p>
                    <p className="text-sm text-muted-foreground">Categorias</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Badge variant={isPublished ? 'default' : 'secondary'} className="text-base px-4 py-2">
                      {isPublished ? 'Publicada' : 'Rascunho'}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-2">Status</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-lg font-bold">
                      {formatCurrency(storeProducts.reduce((sum, p) => sum + (p.price || 0), 0))}
                    </p>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
