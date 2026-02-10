import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Search, Instagram, Facebook, Smartphone, Heart, Share2, Loader2, Phone, Award } from 'lucide-react';
import { toast } from 'sonner';

interface ResellerProfile {
  profile_photo_url: string | null;
  phone: string | null;
  instagram_handle: string | null;
  bio: string | null;
  show_career_level: boolean;
}

interface SalesTier {
  id: string;
  name: string;
  min_monthly_sales: number;
  max_monthly_sales?: number;
  reseller_percentage: number;
  company_percentage: number;
}

export default function Storefront() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [resellerProfile, setResellerProfile] = useState<ResellerProfile | null>(null);
  const [careerTierName, setCareerTierName] = useState<string | null>(null);

  useEffect(() => {
    loadStoreData();
  }, [storeSlug]);

  const loadCareerTier = async (resellerId: string, companyId: string) => {
    try {
      const { data: companyData } = await supabase
        .from('companies')
        .select('commission_settings')
        .eq('id', companyId)
        .single();

      if (!companyData?.commission_settings) {
        console.log('[Storefront] No commission settings found');
        return;
      }

      const settings = companyData.commission_settings as any;
      const salesTiers: SalesTier[] = settings.sales_tiers || [];
      const useDynamicTiers = settings.use_dynamic_tiers ?? false;

      if (!useDynamicTiers || salesTiers.length === 0) {
        console.log('[Storefront] Dynamic tiers not enabled or no tiers configured');
        return;
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: salesData } = await supabase
        .from('sales_with_split')
        .select('total_amount')
        .eq('reseller_id', resellerId)
        .eq('paid', true)
        .gte('created_at', startOfMonth.toISOString());

      const monthlyVolume = (salesData || []).reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
      console.log('[Storefront] Monthly volume:', monthlyVolume);

      const sortedTiers = [...salesTiers].sort((a, b) => a.min_monthly_sales - b.min_monthly_sales);
      
      for (const tier of sortedTiers) {
        const meetsMinimum = monthlyVolume >= tier.min_monthly_sales;
        const meetsMaximum = tier.max_monthly_sales === undefined || monthlyVolume < tier.max_monthly_sales;
        
        if (meetsMinimum && meetsMaximum) {
          console.log('[Storefront] Career tier:', tier.name);
          setCareerTierName(tier.name);
          return;
        }
      }

      if (sortedTiers.length > 0) {
        const lastTier = sortedTiers[sortedTiers.length - 1];
        setCareerTierName(lastTier.name);
      }
    } catch (error) {
      console.error('[Storefront] Error loading career tier:', error);
    }
  };

  const loadStoreData = async () => {
    try {
      const { data: reseller, error: resellerError } = await supabase
        .from('resellers')
        .select('*')
        .eq('store_slug', storeSlug)
        .eq('is_active', true)
        .single();

      if (resellerError || !reseller) {
        toast.error('Loja não encontrada');
        navigate('/revendedora');
        return;
      }

      const { data: company } = await supabase
        .from('companies')
        .select('id, company_name, primary_color, secondary_color')
        .eq('id', reseller.company_id)
        .single();

      setStore({ ...reseller, company });

      const { data: profileData } = await supabase
        .from('reseller_profiles')
        .select('profile_photo_url, phone, instagram_handle, bio, show_career_level')
        .eq('reseller_id', reseller.id)
        .single();

      if (profileData) {
        console.log('[Storefront] Reseller profile loaded:', profileData);
        setResellerProfile(profileData as ResellerProfile);
        
        if (profileData.show_career_level) {
          await loadCareerTier(reseller.id, reseller.company_id);
        }
      }

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', reseller.company_id)
        .eq('is_active', true)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;
      setProducts(productsData || []);
    } catch (error) {
      console.error('Erro ao carregar loja:', error);
      toast.error('Erro ao carregar dados da loja');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.short_description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: any) => {
    setCart([...cart, product]);
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  const handleWhatsApp = () => {
    const phone = resellerProfile?.phone || store?.phone;
    if (phone) {
      const message = encodeURIComponent(`Olá! Vim da sua loja online e gostaria de saber mais sobre os produtos.`);
      window.open(`https://wa.me/55${phone.replace(/\D/g, '')}?text=${message}`, '_blank');
    }
  };

  const getProfilePhotoUrl = () => {
    return resellerProfile?.profile_photo_url || store?.store_logo_url;
  };

  const getInstagramHandle = () => {
    return resellerProfile?.instagram_handle || store?.store_social_links?.instagram;
  };

  const getContactPhone = () => {
    return resellerProfile?.phone || store?.phone;
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Adicione produtos ao carrinho primeiro');
      return;
    }
    // Navegar para criar payment link ou checkout direto
    toast.info('Funcionalidade de checkout em desenvolvimento');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loja não encontrada</p>
      </div>
    );
  }

  const getProductImage = (product: any) => {
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0];
    }
    return '/placeholder.svg';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={getProfilePhotoUrl()} alt={store.store_name} />
              <AvatarFallback>{store.store_name?.charAt(0) || 'L'}</AvatarFallback>
            </Avatar>
            <span className="font-bold text-lg">{store.store_name}</span>
          </div>
          <Button variant="outline" className="relative" onClick={handleCheckout}>
            <ShoppingCart className="h-5 w-5" />
            {cart.length > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0">
                {cart.length}
              </Badge>
            )}
          </Button>
        </div>
      </header>

      {/* Banner */}
      {store.store_banner_url && (
        <div 
          className="w-full h-64 bg-cover bg-center" 
          style={{ backgroundImage: `url(${store.store_banner_url})` }}
        />
      )}

      {/* Store Info */}
      <div className="container py-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <Avatar className="h-32 w-32 border-4 border-primary/20">
            <AvatarImage src={getProfilePhotoUrl()} alt={store.store_name} />
            <AvatarFallback className="text-3xl bg-primary/10">
              {store.store_name?.charAt(0) || 'L'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{store.store_name}</h1>
              {resellerProfile?.show_career_level && careerTierName && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-primary/30">
                  <Award className="h-3.5 w-3.5" />
                  {careerTierName}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mb-4">
              {resellerProfile?.bio || store.store_description || 'Bem-vindo à nossa loja!'}
            </p>
            <div className="flex flex-wrap gap-2">
              {getInstagramHandle() && (
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href={`https://instagram.com/${getInstagramHandle()?.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Instagram className="mr-2 h-4 w-4" />
                    @{getInstagramHandle()?.replace('@', '')}
                  </a>
                </Button>
              )}
              {store.store_social_links?.facebook && (
                <Button variant="outline" size="sm" asChild>
                  <a href={store.store_social_links.facebook} target="_blank" rel="noopener noreferrer">
                    <Facebook className="mr-2 h-4 w-4" />
                    Facebook
                  </a>
                </Button>
              )}
              {getContactPhone() && (
                <Button variant="outline" size="sm" onClick={handleWhatsApp}>
                  <Phone className="mr-2 h-4 w-4" />
                  {getContactPhone()}
                </Button>
              )}
              {getContactPhone() && (
                <Button variant="default" size="sm" onClick={handleWhatsApp}>
                  <Smartphone className="mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-8 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar produtos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-6">Produtos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden group">
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button size="icon" variant="secondary" className="h-8 w-8">
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="secondary" className="h-8 w-8">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {product.stock_quantity !== null && product.stock_quantity < 10 && (
                    <Badge className="absolute bottom-2 left-2" variant="destructive">
                      Últimas unidades!
                    </Badge>
                  )}
                  {product.featured && (
                    <Badge className="absolute top-2 left-2" variant="default">
                      Destaque
                    </Badge>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-2">{product.name}</CardTitle>
                  <CardDescription className="line-clamp-1">{product.short_description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">R$ {Number(product.price).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">ou 3x de R$ {(Number(product.price) / 3).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={() => addToCart(product)}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Adicionar ao Carrinho
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum produto encontrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container py-8 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 {store.store_name}. Todos os direitos reservados.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Powered by UP Vendas
          </p>
        </div>
      </footer>
    </div>
  );
}