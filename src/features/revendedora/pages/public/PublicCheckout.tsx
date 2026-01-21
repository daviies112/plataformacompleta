import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  Package,
  CreditCard,
  QrCode,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  description: string;
  price: number;
  image?: string;
  stock?: number;
  category?: string;
  reference?: string;
}

interface StoreData {
  id: string;
  reseller_id: string;
  store_name: string;
}

export default function PublicCheckout() {
  const navigate = useNavigate();
  
  // Extract productId and storeId from the URL manually
  // URL format: /checkout/:productId?storeId=:storeId
  // We can't use useParams because PlatformRouter doesn't use React Router's Route components
  
  // Handle URL encoding issues: sometimes ? is encoded as %3F
  let pathname = decodeURIComponent(window.location.pathname);
  let search = window.location.search;
  
  // If pathname contains ?, the query string was encoded in the path
  let productId: string | null = null;
  let storeId: string | null = null;
  
  if (pathname.includes('?')) {
    // URL was encoded: /checkout/xxx%3FstoreId=yyy became /checkout/xxx?storeId=yyy after decode
    const [pathPart, queryPart] = pathname.split('?');
    const pathParts = pathPart.split('/');
    productId = pathParts[2] || null;
    const queryParams = new URLSearchParams(queryPart);
    storeId = queryParams.get('storeId');
  } else {
    // Normal URL: /checkout/xxx?storeId=yyy
    const pathParts = pathname.split('/');
    productId = pathParts[2] || null;
    const searchParams = new URLSearchParams(search);
    storeId = searchParams.get('storeId');
  }
  

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<StoreData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'processing' | 'pix-waiting' | 'success' | 'error'>('form');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [installments, setInstallments] = useState(1);

  const [pixData, setPixData] = useState<{
    qrCode: string;
    qrCodeUrl: string;
    expiresAt: string;
    orderId: string;
  } | null>(null);

  const [orderId, setOrderId] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (productId && storeId) {
      loadProductData();
    } else {
      setError('Dados do produto inválidos');
      setLoading(false);
    }
  }, [productId, storeId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (step === 'pix-waiting' && orderId) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/public/checkout/status/${orderId}`);
          const data = await response.json();
          
          if (data.success && (data.order?.status === 'paid' || data.order?.charges?.[0]?.status === 'paid')) {
            setStep('success');
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Error checking order status:', err);
        }
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, orderId]);

  const loadProductData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/public/store/${storeId}/product/${productId}`);
      const data = await response.json();
      
      if (!data.success) {
        setError(data.error || 'Produto não encontrado');
        return;
      }
      
      setProduct(data.product);
      setStore(data.store);
    } catch (err: any) {
      console.error('[PublicCheckout] Error loading product:', err);
      setError('Erro ao carregar o produto');
    } finally {
      setLoading(false);
    }
  };

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 16);
    return numbers.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 4);
    if (numbers.length >= 2) {
      return numbers.slice(0, 2) + '/' + numbers.slice(2);
    }
    return numbers;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const validateCardExpiry = (expiry: string): { valid: boolean; month: number; year: number; error?: string } => {
    if (!expiry || expiry.trim() === '') {
      return { valid: false, month: 0, year: 0, error: 'Validade é obrigatória' };
    }

    const parts = expiry.split('/');
    if (parts.length !== 2) {
      return { valid: false, month: 0, year: 0, error: 'Formato inválido. Use MM/AA' };
    }

    const [monthStr, yearStr] = parts;
    
    if (!monthStr || monthStr.length !== 2) {
      return { valid: false, month: 0, year: 0, error: 'Mês inválido' };
    }

    if (!yearStr || (yearStr.length !== 2 && yearStr.length !== 4)) {
      return { valid: false, month: 0, year: 0, error: 'Ano inválido' };
    }

    const month = parseInt(monthStr, 10);
    let year = parseInt(yearStr, 10);

    if (isNaN(month) || month < 1 || month > 12) {
      return { valid: false, month: 0, year: 0, error: 'Mês deve ser entre 01 e 12' };
    }

    if (yearStr.length === 2) {
      year = 2000 + year;
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return { valid: false, month: 0, year: 0, error: 'Cartão expirado' };
    }

    if (year > currentYear + 20) {
      return { valid: false, month: 0, year: 0, error: 'Ano de validade muito distante' };
    }

    return { valid: true, month, year };
  };

  const handleSubmit = async () => {
    if (!customerName || !customerEmail || !customerCpf) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const cpfClean = customerCpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      toast.error('CPF inválido');
      return;
    }

    if (!product) {
      toast.error('Produto não encontrado');
      return;
    }

    setStep('processing');
    setProcessingPayment(true);

    const customer = {
      name: customerName,
      email: customerEmail,
      document: cpfClean,
      phone: customerPhone.replace(/\D/g, ''),
    };

    const priceInCents = Math.round(product.price * 100);

    const items = [
      {
        amount: priceInCents,
        description: product.description,
        quantity: 1,
        code: product.id,
      },
    ];

    try {
      if (paymentMethod === 'pix') {
        const response = await fetch('/api/public/checkout/pix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer, items, storeId, productId, quantity: 1 }),
        });

        const result = await response.json();
        
        if (result.success) {
          setPixData({
            qrCode: result.pix.qrCode,
            qrCodeUrl: result.pix.qrCodeUrl,
            expiresAt: result.pix.expiresAt,
            orderId: result.orderId,
          });
          setOrderId(result.orderId);
          setStep('pix-waiting');
        } else {
          setStep('error');
          toast.error(result.error || 'Erro ao gerar PIX');
        }
      } else {
        if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
          toast.error('Preencha todos os dados do cartão');
          setStep('form');
          setProcessingPayment(false);
          return;
        }

        const cardNumberClean = cardNumber.replace(/\s/g, '');
        if (cardNumberClean.length < 13 || cardNumberClean.length > 19) {
          toast.error('Número do cartão inválido');
          setStep('form');
          setProcessingPayment(false);
          return;
        }

        const expiryValidation = validateCardExpiry(cardExpiry);
        if (!expiryValidation.valid) {
          toast.error(expiryValidation.error || 'Validade inválida');
          setStep('form');
          setProcessingPayment(false);
          return;
        }

        const cvvClean = cardCvv.replace(/\D/g, '');
        if (cvvClean.length < 3 || cvvClean.length > 4) {
          toast.error('CVV deve ter 3 ou 4 dígitos');
          setStep('form');
          setProcessingPayment(false);
          return;
        }

        const tokenResponse = await fetch('/api/public/checkout/tokenize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            card: {
              number: cardNumberClean,
              holder_name: cardName,
              holder_document: cpfClean,
              exp_month: expiryValidation.month,
              exp_year: expiryValidation.year,
              cvv: cvvClean,
            },
          }),
        });

        const tokenResult = await tokenResponse.json();
        
        if (!tokenResult.success) {
          setStep('error');
          toast.error(tokenResult.error || 'Erro ao processar cartão');
          setProcessingPayment(false);
          return;
        }

        const orderResponse = await fetch('/api/public/checkout/card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer,
            items,
            cardToken: tokenResult.tokenId,
            installments,
            statementDescriptor: store?.store_name?.slice(0, 13) || 'NEXUS',
            storeId,
            productId,
            quantity: 1,
          }),
        });

        const orderResult = await orderResponse.json();

        if (orderResult.success) {
          // Check if payment was actually approved (not just order created)
          const chargeStatus = orderResult.chargeStatus?.toLowerCase();
          const failedStatuses = ['failed', 'declined', 'canceled', 'voided', 'error'];
          
          if (failedStatuses.includes(chargeStatus) || orderResult.paymentSuccess === false) {
            setStep('error');
            toast.error('Pagamento recusado. Verifique os dados do cartão e tente novamente.');
          } else {
            setOrderId(orderResult.orderId);
            setStep('success');
          }
        } else {
          setStep('error');
          toast.error(orderResult.error || 'Erro ao processar cartão');
        }
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setStep('error');
      toast.error(err.message || 'Erro ao processar pagamento');
    } finally {
      setProcessingPayment(false);
    }
  };

  const copyPixCode = () => {
    if (pixData?.qrCode) {
      navigator.clipboard.writeText(pixData.qrCode);
      toast.success('Código PIX copiado!');
    }
  };

  const handleBack = () => {
    if (storeId) {
      navigate(`/loja/${storeId}`);
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando produto...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Produto não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center">
              {error || 'O produto solicitado não foi encontrado.'}
            </p>
            <Button onClick={handleBack} className="w-full" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Loja
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Pagamento Confirmado!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="py-4">
              <p className="text-lg font-semibold">{product.description}</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {formatCurrency(product.price)}
              </p>
            </div>
            <p className="text-muted-foreground">
              Seu pedido foi processado com sucesso. Em breve você receberá as informações por email.
            </p>
            <Button onClick={handleBack} className="w-full mt-4" data-testid="button-back-success">
              Voltar para Loja
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Erro no Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Ocorreu um erro ao processar seu pagamento. Por favor, tente novamente.
            </p>
            <Button onClick={() => setStep('form')} className="w-full" data-testid="button-try-again">
              Tentar Novamente
            </Button>
            <Button onClick={handleBack} variant="outline" className="w-full" data-testid="button-back-error">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Loja
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'pix-waiting' && pixData) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Pagamento PIX
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center">
                {pixData.qrCodeUrl ? (
                  <img
                    src={pixData.qrCodeUrl}
                    alt="QR Code PIX"
                    className="w-48 h-48 border rounded-lg"
                  />
                ) : (
                  <div className="w-48 h-48 border rounded-lg flex items-center justify-center bg-muted">
                    <QrCode className="w-24 h-24 text-muted-foreground" />
                  </div>
                )}
                
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Escaneie o QR Code com seu app de banco ou copie o código abaixo
                </p>
              </div>

              <div className="flex gap-2">
                <Input
                  value={pixData.qrCode || ''}
                  readOnly
                  className="text-xs"
                />
                <Button variant="outline" onClick={copyPixCode} data-testid="button-copy-pix">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Aguardando confirmação do pagamento...</span>
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium text-sm">{product.description}</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(product.price)}</p>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                O pagamento será confirmado automaticamente após a transferência PIX
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-4">
          <Button variant="ghost" size="sm" onClick={handleBack} data-testid="button-back-header">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <span className="ml-4 font-semibold">Finalizar Compra</span>
        </div>
      </header>

      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Resumo do Produto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.description}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{product.description}</h3>
                {product.reference && (
                  <p className="text-sm text-muted-foreground">Ref: {product.reference}</p>
                )}
                {product.category && (
                  <Badge variant="secondary" className="mt-1">{product.category}</Badge>
                )}
                <p className="text-xl font-bold text-primary mt-2">
                  {formatCurrency(product.price)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {step === 'processing' ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-lg font-medium">Processando pagamento...</p>
              <p className="text-sm text-muted-foreground">Por favor, aguarde</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Dados do Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="customerName">Nome Completo *</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="João da Silva"
                      data-testid="input-customer-name"
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <Label htmlFor="customerEmail">Email *</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="joao@email.com"
                      data-testid="input-customer-email"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="customerCpf">CPF *</Label>
                    <Input
                      id="customerCpf"
                      value={customerCpf}
                      onChange={(e) => setCustomerCpf(formatCpf(e.target.value))}
                      placeholder="000.000.000-00"
                      data-testid="input-customer-cpf"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="customerPhone">Telefone</Label>
                    <Input
                      id="customerPhone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                      placeholder="(11) 99999-9999"
                      data-testid="input-customer-phone"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'pix' | 'card')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pix" data-testid="tab-pix">
                      <QrCode className="w-4 h-4 mr-2" />
                      PIX
                    </TabsTrigger>
                    <TabsTrigger value="card" data-testid="tab-card">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Cartão
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="pix" className="mt-4">
                    <div className="bg-muted/50 p-4 rounded-lg text-center">
                      <QrCode className="h-12 w-12 text-primary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Pagamento instantâneo via PIX. O QR Code será gerado após confirmar.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="card" className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="cardNumber">Número do Cartão *</Label>
                      <Input
                        id="cardNumber"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="0000 0000 0000 0000"
                        data-testid="input-card-number"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="cardName">Nome no Cartão *</Label>
                      <Input
                        id="cardName"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value.toUpperCase())}
                        placeholder="JOAO DA SILVA"
                        data-testid="input-card-name"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cardExpiry">Validade *</Label>
                        <Input
                          id="cardExpiry"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                          placeholder="MM/AA"
                          data-testid="input-card-expiry"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="cardCvv">CVV *</Label>
                        <Input
                          id="cardCvv"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="123"
                          type="password"
                          maxLength={4}
                          data-testid="input-card-cvv"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="installments">Parcelas</Label>
                      <select
                        id="installments"
                        value={installments}
                        onChange={(e) => setInstallments(Number(e.target.value))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        data-testid="select-installments"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                          <option key={num} value={num}>
                            {num}x de {formatCurrency(product.price / num)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Button 
              onClick={handleSubmit} 
              disabled={processingPayment}
              className="w-full"
              size="lg"
              data-testid="button-submit-payment"
            >
              {processingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Pagar {formatCurrency(product.price)}
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
