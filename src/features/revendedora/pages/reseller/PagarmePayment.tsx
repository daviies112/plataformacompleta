import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { getResellerId } from '@/features/revendedora/lib/resellerAuth';
import { PagarmeCheckout } from '@/features/revendedora/components/PagarmeCheckout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/revendedora/components/ui/card';
import { Badge } from '@/features/revendedora/components/ui/badge';
import { Button } from '@/features/revendedora/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, ArrowLeft, Package } from 'lucide-react';
import { toast } from 'sonner';
import { SplitService } from '@/features/revendedora/services/SplitService';

interface Product {
  id: string;
  description: string;
  price: number;
  image?: string;
  stock?: number;
  category?: string;
  reference?: string;
}

export default function PagarmePayment() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  const resellerId = getResellerId();

  // Load product data
  useEffect(() => {
    if (!productId) {
      setError('ID do produto não fornecido');
      setLoading(false);
      return;
    }

    // Try to get product from location state first
    const stateProduct = location.state?.product;
    if (stateProduct) {
      setProduct(stateProduct);
      setLoading(false);
      return;
    }

    // Otherwise fetch from Supabase
    if (!supabaseLoading && configured && supabase) {
      loadProduct();
    } else if (!supabaseLoading && !configured) {
      setError('Supabase não está configurado');
      setLoading(false);
    }
  }, [productId, supabase, supabaseLoading, configured, location.state]);

  const loadProduct = async () => {
    if (!supabase || !productId) {
      setError('Dados insuficientes para carregar o produto');
      setLoading(false);
      return;
    }

    try {
      console.log('[PagarmePayment] Loading product:', productId);
      
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (fetchError) {
        throw new Error('Produto não encontrado');
      }

      if (!data) {
        throw new Error('Produto não encontrado');
      }

      setProduct({
        id: data.id,
        description: data.description,
        price: data.price,
        image: data.image,
        stock: data.stock,
        category: data.category,
        reference: data.reference,
      });
      setError(null);
    } catch (err: any) {
      console.error('[PagarmePayment] Error loading product:', err);
      setError(err.message || 'Erro ao carregar o produto');
      toast.error(err.message || 'Erro ao carregar o produto');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (orderId: string, paymentMethod: string) => {
    if (!productId || !resellerId || !supabase || !product) {
      toast.error('Dados insuficientes para confirmar a venda');
      return;
    }

    try {
      setProcessingPayment(true);
      console.log('[PagarmePayment] Processing payment success:', orderId, paymentMethod);

      // 1. Calculate split
      const split = SplitService.calculateSplit(product.price, 70);

      // 2. Get company ID - for now using a placeholder or from config
      // In production, this should come from authenticated user's company
      const companyId = localStorage.getItem('company_id') || 'default-company';

      // 3. Create sale record in Supabase
      const { data: saleData, error: saleError } = await supabase
        .from('sales_with_split')
        .insert({
          product_id: productId,
          reseller_id: resellerId,
          company_id: companyId,
          payment_method: paymentMethod,
          status: 'confirmada',
          total_amount: split.totalAmount,
          reseller_amount: split.resellerAmount,
          company_amount: split.companyAmount,
          commission_percentage: split.resellerPercentage,
          paid: true,
          paid_at: new Date().toISOString(),
          gateway_type: 'pagarme',
          gateway_order_id: orderId,
        })
        .select()
        .single();

      if (saleError) {
        throw new Error(`Erro ao criar registro de venda: ${saleError.message}`);
      }

      if (!saleData) {
        throw new Error('Falha ao criar registro de venda');
      }

      console.log('[PagarmePayment] Sale created:', saleData.id);

      // 4. Update product stock
      if (product.stock !== undefined && product.stock > 0) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock: Math.max(0, (product.stock || 0) - 1) })
          .eq('id', productId);

        if (stockError) {
          console.error('[PagarmePayment] Error updating stock:', stockError);
          // Don't fail the whole transaction if stock update fails
          toast.warning('Estoque não atualizado, mas a venda foi registrada');
        } else {
          console.log('[PagarmePayment] Stock updated for product:', productId);
        }
      }

      // 5. Show success message
      setSuccessMessage(`Pagamento confirmado! Sua compra foi registrada com sucesso.`);
      setIsCheckoutOpen(false);
      toast.success('Pagamento processado com sucesso!');

      // 6. Redirect to dashboard after delay
      setTimeout(() => {
        navigate('/revendedora/reseller/dashboard', {
          state: {
            successMessage: `Venda ${paymentMethod.toUpperCase()} realizada com sucesso!`,
            saleId: saleData.id,
          },
        });
      }, 2000);
    } catch (err: any) {
      console.error('[PagarmePayment] Error processing payment success:', err);
      toast.error(err.message || 'Erro ao processar o pagamento');
      setError(err.message || 'Erro ao processar o pagamento');
      setIsCheckoutOpen(false);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCheckoutClose = () => {
    if (!processingPayment && !successMessage) {
      setIsCheckoutOpen(false);
      navigate(-1);
    }
  };

  if (loading || supabaseLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando produto...</p>
        </div>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Erro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Supabase não está configurado. Por favor, configure o Supabase para continuar.
            </p>
            <Button onClick={() => navigate(-1)} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Produto não encontrado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {error || 'O produto solicitado não foi encontrado.'}
            </p>
            <Button onClick={() => navigate('/revendedora/reseller/store')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Loja
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!resellerId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Não autorizado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Por favor, faça login para continuar com a compra.
            </p>
            <Button onClick={() => navigate('/revendedora/login')} className="w-full">
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success view
  if (successMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Pagamento Confirmado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <p className="text-lg font-semibold">{product.description}</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {SplitService.formatCurrency(product.price)}
              </p>
            </div>
            <p className="text-muted-foreground">
              {successMessage}
            </p>
            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="font-medium">Seus ganhos:</p>
              <p className="text-green-600 font-semibold">
                {SplitService.formatCurrency(SplitService.calculateSplit(product.price, 70).resellerAmount)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Você será redirecionado para o dashboard em breve...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main checkout view
  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-3xl font-bold">Finalizar Compra</h1>
        <p className="text-muted-foreground">Complete o pagamento para concluir sua venda</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Product Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Resumo do Produto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.image && (
              <div className="rounded-lg overflow-hidden bg-muted h-48 flex items-center justify-center">
                <img
                  src={product.image}
                  alt={product.description}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div>
              <h3 className="font-semibold text-lg">{product.description}</h3>
              {product.reference && (
                <p className="text-sm text-muted-foreground">Ref: {product.reference}</p>
              )}
              {product.category && (
                <Badge className="mt-2">{product.category}</Badge>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preço:</span>
                <span className="font-semibold">{SplitService.formatCurrency(product.price)}</span>
              </div>

              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground">Sua comissão (70%):</span>
                <span className="font-bold text-green-600">
                  {SplitService.formatCurrency(
                    SplitService.calculateSplit(product.price, 70).resellerAmount
                  )}
                </span>
              </div>

              {product.stock !== undefined && (
                <div className="flex justify-between pt-2">
                  <span className="text-muted-foreground">Estoque:</span>
                  <span className="font-semibold">
                    {product.stock > 0 ? `${product.stock} unidades` : 'Sem estoque'}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Checkout Component */}
        <div>
          {isCheckoutOpen && !processingPayment ? (
            <PagarmeCheckout
              isOpen={true}
              onClose={handleCheckoutClose}
              onSuccess={handlePaymentSuccess}
              product={{
                id: product.id,
                name: product.description,
                price: product.price,
              }}
              resellerId={resellerId}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processando Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Seu pagamento está sendo processado. Por favor, aguarde...
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
