import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/revendedora/components/ui/card';
import { Button } from '@/features/revendedora/components/ui/button';
import { Badge } from '@/features/revendedora/components/ui/badge';
import { Separator } from '@/features/revendedora/components/ui/separator';
import { CheckCircle2, Copy, Loader2, QrCode as QrCodeIcon, ArrowLeft, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { SplitService } from '@/features/revendedora/services/SplitService';
import { PaymentService } from '@/features/revendedora/services/PaymentService';

export default function PaymentPix() {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (saleId && supabase && configured && !supabaseLoading) {
      loadSale();
    }
  }, [saleId, supabase, configured, supabaseLoading]);

  useEffect(() => {
    // Atualizar contador de tempo
    if (sale?.pix_expires_at) {
      const interval = setInterval(() => {
        const expiresAt = new Date(sale.pix_expires_at).getTime();
        const now = Date.now();
        const diff = Math.max(0, expiresAt - now);
        setTimeLeft(diff);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [sale]);

  useEffect(() => {
    // Verificar status periodicamente
    if (saleId && !sale?.paid) {
      const interval = setInterval(() => {
        checkPaymentStatus();
      }, 5000); // A cada 5 segundos

      return () => clearInterval(interval);
    }
  }, [saleId, sale?.paid]);

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

  const checkPaymentStatus = async () => {
    if (!saleId || checking) return;

    setChecking(true);
    try {
      const status = await PaymentService.getSaleStatus(saleId);
      if (status.paid) {
        setSale((prev: any) => ({ ...prev, paid: true, paid_at: status.paidAt, status: 'confirmada' }));
        toast.success('Pagamento confirmado!');
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!saleId) return;

    try {
      await PaymentService.simulatePaymentApproval(saleId);
      toast.success('Pagamento simulado com sucesso!');
      await loadSale();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao simular pagamento');
    }
  };

  const copyPixCode = () => {
    if (sale?.pix_qrcode_text) {
      navigator.clipboard.writeText(sale.pix_qrcode_text);
      toast.success('Código PIX copiado!');
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
        <h2 className="text-2xl font-bold">Venda não encontrada</h2>
        <Button onClick={() => navigate('/revendedora/reseller/store')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Loja
        </Button>
      </div>
    );
  }

  const isPaid = sale.paid || sale.status === 'confirmada';
  const isExpired = timeLeft === 0 && !isPaid;

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
              <CardTitle className="text-2xl">Pagamento PIX</CardTitle>
              <CardDescription>
                Escaneie o QR Code ou copie o código para pagar
              </CardDescription>
            </div>
            {isPaid ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Pago
              </Badge>
            ) : isExpired ? (
              <Badge variant="destructive">
                <AlertCircle className="mr-1 h-4 w-4" />
                Expirado
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Clock className="mr-1 h-4 w-4" />
                {formatTime(timeLeft)}
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
                <h3 className="text-xl font-semibold">Pagamento Confirmado!</h3>
                <p className="text-muted-foreground">A venda foi registrada com sucesso</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Valor Total</span>
                    <p className="font-semibold">{SplitService.formatCurrency(sale.total_amount)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Você Recebeu</span>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      {SplitService.formatCurrency(sale.reseller_amount)}
                    </p>
                  </div>
                </div>
              </div>
              <Button onClick={() => navigate('/revendedora/reseller/store')} className="w-full">
                Voltar para Loja
              </Button>
            </div>
          ) : isExpired ? (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">QR Code Expirado</h3>
                <p className="text-muted-foreground">
                  O tempo para pagamento expirou. Por favor, gere um novo código.
                </p>
              </div>
              <Button onClick={() => navigate('/revendedora/reseller/store')} className="w-full">
                Voltar para Loja
              </Button>
            </div>
          ) : (
            <>
              {/* QR Code */}
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white rounded-lg">
                  {sale.pix_qrcode ? (
                    <img
                      src={sale.pix_qrcode}
                      alt="QR Code PIX"
                      className="w-64 h-64"
                    />
                  ) : (
                    <div className="w-64 h-64 flex items-center justify-center bg-muted rounded">
                      <QrCodeIcon className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Abra o app do seu banco, escolha pagar com PIX QR Code e escaneie o código acima
                </p>
              </div>

              <Separator />

              {/* Código PIX */}
              <div className="space-y-3">
                <h4 className="font-semibold">Ou copie o código PIX:</h4>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-muted rounded font-mono text-sm break-all">
                    {sale.pix_qrcode_text || 'Código PIX não disponível'}
                  </div>
                  <Button onClick={copyPixCode} size="icon" variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Informações do Split */}
              <div className="space-y-3">
                <h4 className="font-semibold">Detalhes do Pagamento</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Total:</span>
                    <span className="font-semibold">
                      {SplitService.formatCurrency(sale.total_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Você receberá (70%):</span>
                    <span className="font-bold">
                      {SplitService.formatCurrency(sale.reseller_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Empresa recebe (30%):</span>
                    <span className="font-semibold">
                      {SplitService.formatCurrency(sale.company_amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botão de verificação manual */}
              <div className="flex gap-2">
                <Button
                  onClick={checkPaymentStatus}
                  disabled={checking}
                  variant="outline"
                  className="flex-1"
                >
                  {checking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    'Verificar Pagamento'
                  )}
                </Button>
                
                {/* Botão de simulação (apenas para desenvolvimento) */}
                {process.env.NODE_ENV === 'development' && (
                  <Button
                    onClick={handleSimulatePayment}
                    variant="secondary"
                    className="flex-1"
                  >
                    Simular Pagamento
                  </Button>
                )}
              </div>

              <div className="text-xs text-center text-muted-foreground">
                Aguardando confirmação do pagamento...
                {checking && ' Verificando status...'}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
