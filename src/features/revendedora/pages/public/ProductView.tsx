import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, ShoppingCart, CreditCard, Smartphone, Loader2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductView() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const resellerId = searchParams.get('reseller') || '';
  
  const [product, setProduct] = useState<any>(null);
  const [reseller, setReseller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  useEffect(() => {
    loadProductData();
  }, [productId, resellerId]);

  const loadProductData = async () => {
    if (!supabase || !productId) {
      setLoading(false);
      return;
    }

    try {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError || !productData) {
        toast.error('Produto não encontrado');
        setLoading(false);
        return;
      }

      setProduct(productData);

      if (resellerId) {
        const { data: resellerData } = await supabase
          .from('resellers')
          .select('id, nome, full_name, email, telefone, phone')
          .eq('id', resellerId)
          .single();

        if (resellerData) {
          setReseller(resellerData);
        }
      }
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Erro ao carregar produto');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleContactReseller = () => {
    const phone = reseller?.telefone || reseller?.phone;
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      const message = encodeURIComponent(
        `Olá! Tenho interesse no produto: ${product.description} - ${formatCurrency(product.price)}`
      );
      window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
    } else {
      toast.info('Entre em contato com o revendedor para finalizar a compra');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Carregando produto...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Produto não encontrado</h2>
            <p className="text-muted-foreground">
              O produto que você está procurando não existe ou foi removido.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="overflow-hidden shadow-lg">
          <div className="relative">
            {(product.image || product.image_url) ? (
              <img
                src={product.image || product.image_url}
                alt={product.description}
                className="w-full h-80 object-cover"
              />
            ) : (
              <div className="w-full h-80 bg-muted flex items-center justify-center">
                <Package className="h-24 w-24 text-muted-foreground" />
              </div>
            )}
            {product.stock !== undefined && product.stock <= 0 && (
              <Badge variant="destructive" className="absolute top-4 right-4 text-lg px-4 py-2">
                Esgotado
              </Badge>
            )}
          </div>

          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{product.description}</CardTitle>
                {product.reference && (
                  <p className="text-sm text-muted-foreground mt-1">
                    REF: {product.reference}
                  </p>
                )}
              </div>
              {product.category && (
                <Badge variant="secondary">{product.category}</Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Preço</p>
                <p className="text-4xl font-bold text-primary">
                  {formatCurrency(product.price)}
                </p>
              </div>
              {product.stock !== undefined && product.stock > 0 && (
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {product.stock} disponíveis
                </Badge>
              )}
            </div>

            <Separator />

            {reseller && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Vendido por</p>
                <p className="font-semibold">
                  {reseller.full_name || reseller.nome || 'Revendedor'}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <p className="font-medium">Formas de Pagamento:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-green-50 border-green-200">
                  <Smartphone className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">PIX</span>
                </div>
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-blue-50 border-blue-200">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">Cartão</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleContactReseller}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
              disabled={product.stock !== undefined && product.stock <= 0}
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              {reseller ? 'Falar com o Vendedor' : 'Comprar Agora'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Ao clicar, você será redirecionado para o WhatsApp do vendedor
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by UP Vendas
        </p>
      </div>
    </div>
  );
}
