import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/revendedora/components/ui/card';
import { Button } from '@/features/revendedora/components/ui/button';
import { Badge } from '@/features/revendedora/components/ui/badge';
import { Input } from '@/features/revendedora/components/ui/input';
import { Label } from '@/features/revendedora/components/ui/label';
import { CheckCircle2, Loader2, ArrowLeft, AlertCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { SplitService } from '@/features/revendedora/services/SplitService';

interface CardData {
  number: string;
  holderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

function CardPaymentForm({ amount, productName, saleId }: { amount: number; productName: string; saleId: string }) {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [cardData, setCardData] = useState<CardData>({
    number: '',
    holderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardData(prev => ({ ...prev, number: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanNumber = cardData.number.replace(/\s/g, '');
    if (cleanNumber.length !== 16) {
      toast.error('Número do cartão deve ter 16 dígitos');
      return;
    }
    if (!cardData.holderName.trim()) {
      toast.error('Nome do titular é obrigatório');
      return;
    }
    if (!/^(0[1-9]|1[0-2])$/.test(cardData.expiryMonth)) {
      toast.error('Mês de validade inválido (01-12)');
      return;
    }
    if (!/^20\d{2}$/.test(cardData.expiryYear)) {
      toast.error('Ano de validade inválido (ex: 2025)');
      return;
    }
    if (!/^\d{3,4}$/.test(cardData.cvv)) {
      toast.error('CVV deve ter 3 ou 4 dígitos');
      return;
    }

    setProcessing(true);

    try {
      const tokenizeResponse = await fetch('/api/pagarme/tokenize-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: cleanNumber,
          holder_name: cardData.holderName.toUpperCase(),
          exp_month: parseInt(cardData.expiryMonth),
          exp_year: parseInt(cardData.expiryYear),
          cvv: cardData.cvv,
        }),
      });

      if (!tokenizeResponse.ok) {
        const errorData = await tokenizeResponse.json();
        throw new Error(errorData.message || 'Erro ao tokenizar cartão');
      }

      const { token } = await tokenizeResponse.json();

      const paymentResponse = await fetch('/api/pagarme/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId,
          cardToken: token,
          amount,
        }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.message || 'Erro ao processar pagamento');
      }

      const paymentResult = await paymentResponse.json();

      if (paymentResult.status === 'paid' || paymentResult.status === 'authorized') {
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
      } else {
        throw new Error('Pagamento não autorizado');
      }
    } catch (err: any) {
      console.error('Payment processing error:', err);
      toast.error(err.message || 'Erro ao processar pagamento');
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
      <div className="space-y-4">
        <h3 className="font-semibold">Informações do Cartão</h3>
        
        <div className="space-y-2">
          <Label htmlFor="cardNumber">Número do Cartão</Label>
          <Input
            id="cardNumber"
            data-testid="input-card-number"
            placeholder="0000 0000 0000 0000"
            value={cardData.number}
            onChange={handleCardNumberChange}
            maxLength={19}
            disabled={processing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="holderName">Nome do Titular</Label>
          <Input
            id="holderName"
            data-testid="input-holder-name"
            placeholder="NOME COMO NO CARTÃO"
            value={cardData.holderName}
            onChange={(e) => setCardData(prev => ({ ...prev, holderName: e.target.value }))}
            disabled={processing}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expiryMonth">Mês</Label>
            <Input
              id="expiryMonth"
              data-testid="input-expiry-month"
              placeholder="MM"
              value={cardData.expiryMonth}
              onChange={(e) => setCardData(prev => ({ ...prev, expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
              maxLength={2}
              disabled={processing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiryYear">Ano</Label>
            <Input
              id="expiryYear"
              data-testid="input-expiry-year"
              placeholder="AAAA"
              value={cardData.expiryYear}
              onChange={(e) => setCardData(prev => ({ ...prev, expiryYear: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              maxLength={4}
              disabled={processing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cvv">CVV</Label>
            <Input
              id="cvv"
              data-testid="input-cvv"
              placeholder="123"
              type="password"
              value={cardData.cvv}
              onChange={(e) => setCardData(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              maxLength={4}
              disabled={processing}
            />
          </div>
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
        data-testid="button-pay"
        disabled={processing}
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

  const { amount, productName } = location.state || {};

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

  if (loading || supabaseLoading) {
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

  if (!sale) {
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
        data-testid="button-back"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
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
              <Button onClick={() => navigate('/revendedora/reseller/sales')} className="w-full" data-testid="button-view-sales">
                Ver Vendas
              </Button>
            </div>
          ) : (
            <CardPaymentForm
              amount={amount || sale.total_amount}
              productName={productName}
              saleId={saleId!}
            />
          )}
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h4 className="font-semibold mb-2 text-sm">Informações de Segurança</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>✓ Pagamento processado com segurança pelo Pagar.me</li>
          <li>✓ Seus dados de cartão são criptografados</li>
          <li>✓ Confirmação instantânea do pagamento</li>
        </ul>
      </div>
    </div>
  );
}
