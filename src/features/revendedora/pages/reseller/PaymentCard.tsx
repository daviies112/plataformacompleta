import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Stripe } from '@stripe/stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/revendedora/components/ui/card';
import { Button } from '@/features/revendedora/components/ui/button';
import { Badge } from '@/features/revendedora/components/ui/badge';
import { CheckCircle2, Loader2, ArrowLeft, AlertCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { SplitService } from '@/features/revendedora/services/SplitService';
import { StripeService } from '@/features/revendedora/services/StripeService';

function CardPaymentForm({ clientSecret, amount, productName, saleId }: any) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      toast.error('Erro ao carregar formulário de pagamento');
      setProcessing(false);
      return;
    }

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        console.error('Payment error:', error);
        toast.error(error.message || 'Erro ao processar pagamento');
      } else if (paymentIntent?.status === 'succeeded') {
        // Confirm payment on server (updates sale status and decreases stock)
        try {
          const confirmResponse = await fetch('/api/payments/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ saleId })
          });
          
          if (!confirmResponse.ok) {
            console.error('Failed to confirm payment on server');
          } else {
            console.log('Payment confirmed on server, stock decreased');
          }
        } catch (confirmError) {
          console.error('Error confirming payment:', confirmError);
        }
        
        setSucceeded(true);
        toast.success('Pagamento confirmado!');
        
        setTimeout(() => {
          navigate('/revendedora/reseller/sales');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Payment processing error:', err);
      toast.error('Erro ao processar pagamento');
    } finally {
      setProcessing(false);
    }
  };

  if (succeeded) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900">
          <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">Pagamento Confirmado!</h3>
          <p className="text-muted-foreground">Redirecionando para vendas...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4">Informações do Cartão</h3>
        <div className="p-4 border rounded-lg">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-semibold">Total a pagar:</span>
          <span className="text-xl font-bold text-primary">
            {SplitService.formatCurrency(amount)}
          </span>
        </div>
      </div>

      <Button
        type="submit"
        disabled={!stripe || processing}
        className="w-full"
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pagar {SplitService.formatCurrency(amount)}
          </>
        )}
      </Button>
    </form>
  );
}

export default function PaymentCard() {
  const { saleId } = useParams<{ saleId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null);
  const [stripeLoading, setStripeLoading] = useState(true);

  const { clientSecret, amount, productName } = location.state || {};

  useEffect(() => {
    async function initStripe() {
      try {
        const stripe = await StripeService.getStripe();
        setStripeInstance(stripe);
      } catch (error) {
        console.error('Erro ao inicializar Stripe:', error);
      } finally {
        setStripeLoading(false);
      }
    }
    initStripe();
  }, []);

  useEffect(() => {
    if (saleId && supabase && configured && !supabaseLoading) {
      loadSale();
    }
  }, [saleId, supabase, configured, supabaseLoading]);

  const loadSale = async () => {
    if (!saleId || !supabase || !configured) return;

    try {
      const { data, error } = await (supabase as any)
        .from('sales_with_split')
        .select('*')
        .eq('id', saleId)
        .single();

      if (error) throw error;
      setSale(data);
    } catch (error) {
      console.error('Erro ao carregar venda:', error);
      toast.error('Erro ao carregar informações de pagamento');
    } finally {
      setLoading(false);
    }
  };

  if (loading || stripeLoading || supabaseLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AlertCircle className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Supabase não configurado</h2>
        <p className="text-muted-foreground">Configure as credenciais do Supabase para processar pagamentos</p>
        <Button onClick={() => navigate('/revendedora/reseller/store')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Loja
        </Button>
      </div>
    );
  }

  if (!stripeInstance) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AlertCircle className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Stripe não configurado</h2>
        <p className="text-muted-foreground">Configure as credenciais do Stripe para processar pagamentos</p>
        <Button onClick={() => navigate('/revendedora/reseller/store')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Loja
        </Button>
      </div>
    );
  }

  if (!clientSecret || !sale) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AlertCircle className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Sessão de pagamento inválida</h2>
        <Button onClick={() => navigate('/revendedora/reseller/store')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Loja
        </Button>
      </div>
    );
  }

  const isPaid = sale.paid || sale.status === 'confirmada';

  return (
    <div className="container max-w-2xl py-8">
      <Button
        variant="ghost"
        onClick={() => navigate('/revendedora/reseller/store')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Pagamento com Cartão</CardTitle>
              <CardDescription>
                {productName || 'Finalize seu pagamento'}
              </CardDescription>
            </div>
            {isPaid && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Pago
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isPaid ? (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Pagamento já Confirmado!</h3>
                <p className="text-muted-foreground">Este pagamento já foi processado com sucesso</p>
              </div>
              <Button onClick={() => navigate('/revendedora/reseller/sales')} className="w-full">
                Ver Vendas
              </Button>
            </div>
          ) : (
            <Elements stripe={stripeInstance}>
              <CardPaymentForm
                clientSecret={clientSecret}
                amount={amount || sale.total_amount}
                productName={productName}
                saleId={saleId}
              />
            </Elements>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h4 className="font-semibold mb-2 text-sm">Informações de Segurança</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>✓ Pagamento processado com segurança pelo Stripe</li>
          <li>✓ Seus dados de cartão são criptografados</li>
          <li>✓ Confirmação instantânea do pagamento</li>
        </ul>
      </div>
    </div>
  );
}
