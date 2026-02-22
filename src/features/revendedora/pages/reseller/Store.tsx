import { useState, useEffect, useMemo } from 'react';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { Card } from '@/features/revendedora/components/ui/card';
import { Button } from '@/features/revendedora/components/ui/button';
import { toast } from 'sonner';
import { getResellerId as getStoredResellerId, resellerFetch } from '@/features/revendedora/lib/resellerAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/revendedora/components/ui/tabs';
import { ResellerProfileForm } from '@/features/revendedora/components/reseller/ResellerProfileForm';
import {
  Store as StoreIcon,
  Palette,
  Package,
  Truck,
  Globe,
  User,
  Save,
  Loader2,
  Eye,
  Monitor,
  Smartphone
} from 'lucide-react';

// New Components
import { StoreGeneralTab } from '@/features/revendedora/components/store-tabs/StoreGeneralTab';
import { StoreDesignTab } from '@/features/revendedora/components/store-tabs/StoreDesignTab';
import { StoreProductsTab } from '@/features/revendedora/components/store-tabs/StoreProductsTab';
import { StoreInventoryTab } from '@/features/revendedora/components/store-tabs/StoreInventoryTab';
import { StorePublishTab } from '@/features/revendedora/components/store-tabs/StorePublishTab';
import { StorePreview } from '@/components/Store/StorePreview';
import { StoreSettings, defaultStoreSettings } from '@/features/revendedora/types/store';

export default function Store() {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Data State
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<Partial<StoreSettings>>(defaultStoreSettings);
  const [resellerId, setResellerId] = useState<string | null>(null);

  useEffect(() => {
    const id = getStoredResellerId();
    if (id) setResellerId(id);
  }, []);

  useEffect(() => {
    if (!supabaseLoading && configured && resellerId) {
      loadData();
    } else if (!supabaseLoading && !configured) {
      setLoading(false);
    }
  }, [supabaseLoading, configured, resellerId]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProducts(),
        loadStoreConfiguration(),
        loadDesignSettings()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar informações da loja');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('products').select('*').order('description');
    if (data) setAllProducts(data);
  };

  const loadStoreConfiguration = async () => {
    try {
      const response = await resellerFetch('/api/reseller/store-config');
      if (response && response.data) {
        setSettings(prev => ({
          ...prev,
          store_name: response.data.store_name || prev.store_name,
          store_slug: response.data.store_slug || prev.store_slug,
          is_published: response.data.is_published,
          product_ids: response.data.product_ids || []
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar config básica:', error);
    }
  };

  const loadDesignSettings = async () => {
    try {
      const response = await resellerFetch('/api/store/settings', {
        headers: {
          'X-Tenant-ID': resellerId || ''
        }
      });

      if (response) {
        setSettings(prev => ({
          ...prev,
          ...response,
          // Preserve store_name if it came from basic config and response lacks it or is generic
          store_name: response.store_name || prev.store_name,
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar design:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const tenantId = resellerId || '';

      // 1. Salvar configurações básicas
      await resellerFetch('/api/reseller/store-config', {
        method: 'POST',
        body: JSON.stringify({
          product_ids: settings.product_ids,
          is_published: settings.is_published,
          store_name: settings.store_name,
          store_slug: settings.store_slug
        })
      });

      // 2. Salvar configurações de design
      const designPayload = {
        ...settings,
        tenant_id: tenantId,
        reseller_id: tenantId
      };

      await resellerFetch('/api/store/settings', {
        method: 'PUT',
        headers: {
          'X-Tenant-ID': tenantId
        },
        body: JSON.stringify(designPayload)
      });

      toast.success('Alterações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleAddProduct = (product: any) => {
    const currentIds = settings.product_ids || [];
    if (!currentIds.includes(product.id)) {
      updateSettings({ product_ids: [...currentIds, product.id] });
      toast.success('Produto adicionado à loja');
    }
  };

  const handleRemoveProduct = (productId: string) => {
    const currentIds = settings.product_ids || [];
    updateSettings({ product_ids: currentIds.filter(id => id !== productId) });
    toast.success('Produto removido da loja');
  };

  const storeProducts = useMemo(() => {
    return allProducts.filter(p => (settings.product_ids || []).includes(p.id));
  }, [allProducts, settings.product_ids]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando loja...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-[1600px] h-[calc(100vh-2rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">

        {/* LEFT COLUMN: Configuration (4 cols) */}
        <div className="lg:col-span-4 flex flex-col h-full gap-4 overflow-hidden">

          <div className="flex items-center justify-between flex-shrink-0">
            <h1 className="text-2xl font-bold">Minha Loja</h1>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </div>

          <Card className="flex-1 flex flex-col overflow-hidden border-sidebar-border bg-sidebar shadow-sm">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
              <div className="border-b px-4 bg-muted/30 flex-shrink-0">
                <TabsList className="w-full justify-start h-12 bg-transparent p-0 gap-2 overflow-x-auto no-scrollbar">
                  <TabsTrigger value="general" className="data-[state=active]:bg-background data-[state=active]:shadow-sm h-9">
                    <StoreIcon className="w-4 h-4 mr-2" /> Geral
                  </TabsTrigger>
                  <TabsTrigger value="design" className="data-[state=active]:bg-background data-[state=active]:shadow-sm h-9">
                    <Palette className="w-4 h-4 mr-2" /> Design
                  </TabsTrigger>
                  <TabsTrigger value="products" className="data-[state=active]:bg-background data-[state=active]:shadow-sm h-9">
                    <Package className="w-4 h-4 mr-2" /> Produtos
                  </TabsTrigger>
                  <TabsTrigger value="stock" className="data-[state=active]:bg-background data-[state=active]:shadow-sm h-9">
                    <Truck className="w-4 h-4 mr-2" /> Estoque
                  </TabsTrigger>
                  <TabsTrigger value="publish" className="data-[state=active]:bg-background data-[state=active]:shadow-sm h-9">
                    <Globe className="w-4 h-4 mr-2" /> Publicar
                  </TabsTrigger>
                  <TabsTrigger value="profile" className="data-[state=active]:bg-background data-[state=active]:shadow-sm h-9">
                    <User className="w-4 h-4 mr-2" /> Perfil
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-muted/10">
                <TabsContent value="general" className="mt-0 h-full">
                  <StoreGeneralTab settings={settings} onChange={updateSettings} />
                </TabsContent>

                <TabsContent value="design" className="mt-0 h-full">
                  <StoreDesignTab settings={settings} onChange={updateSettings} />
                </TabsContent>

                <TabsContent value="products" className="mt-0 h-full">
                  <StoreProductsTab
                    allProducts={allProducts}
                    storeProducts={storeProducts}
                    onAddProduct={handleAddProduct}
                    onRemoveProduct={handleRemoveProduct}
                    resellerId={resellerId}
                  />
                </TabsContent>

                <TabsContent value="stock" className="mt-0 h-full">
                  <StoreInventoryTab
                    products={allProducts}
                    resellerId={resellerId}
                  />
                </TabsContent>

                <TabsContent value="publish" className="mt-0 h-full">
                  <StorePublishTab
                    settings={settings}
                    onChange={updateSettings}
                    storeUrl={typeof window !== 'undefined' ? `${window.location.origin}/loja/${settings.store_slug || 'preview'}` : ''}
                  />
                </TabsContent>

                <TabsContent value="profile" className="mt-0 h-full">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">Meu Perfil</h2>
                      <p className="text-muted-foreground">Gerencie seus dados de revendedora</p>
                    </div>
                    <ResellerProfileForm />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </Card>
        </div>

        {/* RIGHT COLUMN: Preview (8 cols) */}
        <div className="lg:col-span-8 h-full flex flex-col gap-4 overflow-hidden">

          <div className="flex items-center justify-between bg-card p-2 rounded-lg border shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2 px-2">
              <Eye className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Visualização em Tempo Real</span>
            </div>
            <div className="flex bg-muted rounded-md p-1">
              <Button
                variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setPreviewMode('desktop')}
                title="Desktop"
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setPreviewMode('mobile')}
                title="Mobile"
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 bg-muted/50 rounded-lg border overflow-hidden relative shadow-inner flex items-center justify-center p-4 md:p-8">
            <div
              className={`
                bg-background rounded-lg shadow-2xl overflow-hidden border transition-all duration-300
                ${previewMode === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full h-full'}
              `}
            >
              <div className="w-full h-full text-foreground overflow-y-auto custom-scrollbar">
                <StorePreview
                  settings={settings as any}
                  products={storeProducts}
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
