import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, QrCode, Loader2, Check, Copy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { usePagarme } from '../hooks/usePagarme';

interface PagarmeCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId: string, paymentMethod: string) => void;
  product: {
    id: string;
    name: string;
    price: number;
    description?: string;
  };
  resellerId: string;
}

export function PagarmeCheckout({
  isOpen,
  onClose,
  onSuccess,
  product,
  resellerId,
}: PagarmeCheckoutProps) {
  const { loading, error, createPixOrder, createCardOrder, getOrderStatus } = usePagarme();
  
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [step, setStep] = useState<'form' | 'processing' | 'pix-waiting' | 'success' | 'error'>('form');
  
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

  useEffect(() => {
    if (!isOpen) {
      setStep('form');
      setPixData(null);
      setOrderId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (step === 'pix-waiting' && orderId) {
      interval = setInterval(async () => {
        const status = await getOrderStatus(orderId);
        if (status && (status.status === 'paid' || status.charges?.[0]?.status === 'paid')) {
          setStep('success');
          onSuccess(orderId, 'pix');
          clearInterval(interval);
        }
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, orderId, getOrderStatus, onSuccess]);

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
    }).format(value / 100);
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

  const validateCvv = (cvv: string): { valid: boolean; error?: string } => {
    if (!cvv || cvv.trim() === '') {
      return { valid: false, error: 'CVV é obrigatório' };
    }

    const cvvClean = cvv.replace(/\D/g, '');
    if (cvvClean.length < 3 || cvvClean.length > 4) {
      return { valid: false, error: 'CVV deve ter 3 ou 4 dígitos' };
    }

    return { valid: true };
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

    setStep('processing');

    const customer = {
      name: customerName,
      email: customerEmail,
      document: cpfClean,
      phone: customerPhone,
    };

    const items = [
      {
        amount: product.price,
        description: product.name,
        quantity: 1,
        code: product.id,
      },
    ];

    try {
      if (paymentMethod === 'pix') {
        const result = await createPixOrder(customer, items);
        
        if (result && result.success) {
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
          toast.error('Erro ao gerar PIX');
        }
      } else {
        if (!cardNumber || !cardName) {
          toast.error('Preencha o número e nome do cartão');
          setStep('form');
          return;
        }

        const cardNumberClean = cardNumber.replace(/\s/g, '');
        if (cardNumberClean.length < 13 || cardNumberClean.length > 19) {
          toast.error('Número do cartão inválido');
          setStep('form');
          return;
        }

        const expiryValidation = validateCardExpiry(cardExpiry);
        if (!expiryValidation.valid) {
          toast.error(expiryValidation.error || 'Validade inválida');
          setStep('form');
          return;
        }

        const cvvValidation = validateCvv(cardCvv);
        if (!cvvValidation.valid) {
          toast.error(cvvValidation.error || 'CVV inválido');
          setStep('form');
          return;
        }

        const result = await createCardOrder(
          customer,
          items,
          {
            number: cardNumberClean,
            holder_name: cardName,
            exp_month: expiryValidation.month,
            exp_year: expiryValidation.year,
            cvv: cardCvv.replace(/\D/g, ''),
          },
          installments
        );

        if (result && result.success) {
          if (result.chargeStatus === 'paid' || result.status === 'paid') {
            setStep('success');
            onSuccess(result.orderId, 'card');
          } else {
            setOrderId(result.orderId);
            setStep('success');
            onSuccess(result.orderId, 'card');
          }
        } else {
          setStep('error');
          toast.error('Erro ao processar cartão');
        }
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setStep('error');
      toast.error(err.message || 'Erro ao processar pagamento');
    }
  };

  const copyPixCode = () => {
    if (pixData?.qrCode) {
      navigator.clipboard.writeText(pixData.qrCode);
      toast.success('Código PIX copiado!');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Finalizar Pagamento</DialogTitle>
          <DialogDescription>
            {product.name} - {formatCurrency(product.price)}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    {product.description && (
                      <p className="text-sm text-muted-foreground">{product.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-lg">
                    {formatCurrency(product.price)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium">Dados do Cliente</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="customerName">Nome Completo *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="João da Silva"
                    data-testid="input-customer-name"
                  />
                </div>
                
                <div className="col-span-2">
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
            </div>

            <Separator />

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
                <p className="text-sm text-muted-foreground">
                  Pagamento instantâneo via PIX. O QR Code será gerado após confirmar.
                </p>
              </TabsContent>

              <TabsContent value="card" className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="cardNumber">Número do Cartão</Label>
                  <Input
                    id="cardNumber"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="0000 0000 0000 0000"
                    data-testid="input-card-number"
                  />
                </div>
                
                <div>
                  <Label htmlFor="cardName">Nome no Cartão</Label>
                  <Input
                    id="cardName"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                    placeholder="JOAO DA SILVA"
                    data-testid="input-card-name"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="cardExpiry">Validade</Label>
                    <Input
                      id="cardExpiry"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/AA"
                      data-testid="input-card-expiry"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cardCvv">CVV</Label>
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
              </TabsContent>
            </Tabs>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full"
              data-testid="button-submit-payment"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                `Pagar ${formatCurrency(product.price)}`
              )}
            </Button>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Processando pagamento...</p>
            <p className="text-sm text-muted-foreground">Por favor, aguarde</p>
          </div>
        )}

        {step === 'pix-waiting' && pixData && (
          <div className="space-y-4">
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

            <p className="text-xs text-center text-muted-foreground">
              O pagamento será confirmado automaticamente após a transferência PIX
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-medium text-green-600">Pagamento Confirmado!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Seu pedido foi processado com sucesso
            </p>
            <Button onClick={onClose} className="mt-4" data-testid="button-close-success">
              Fechar
            </Button>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-lg font-medium text-red-600">Erro no Pagamento</p>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              {error || 'Ocorreu um erro ao processar seu pagamento. Tente novamente.'}
            </p>
            <Button onClick={() => setStep('form')} className="mt-4" data-testid="button-try-again">
              Tentar Novamente
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
