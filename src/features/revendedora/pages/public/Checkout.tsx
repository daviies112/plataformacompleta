import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Smartphone, FileText, Loader2, ShoppingBag, MapPin, User } from 'lucide-react';
import { toast } from 'sonner';

export default function Checkout() {
  const { linkToken } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'info' | 'payment'>('info');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [paymentLink, setPaymentLink] = useState<any>(null);

  const [customerData, setCustomerData] = useState({
    fullName: '',
    email: '',
    phone: '',
    cpf: '',
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  });

  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
    installments: '1'
  });

  useEffect(() => {
    loadPaymentLink();
  }, [linkToken]);

  const loadPaymentLink = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_links')
        .select(`
          *,
          reseller:resellers (
            id,
            full_name,
            store_name,
            store_logo_url
          ),
          company:companies (
            id,
            company_name
          )
        `)
        .eq('link_token', linkToken)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        toast.error('Link de pagamento inválido ou expirado');
        navigate('/revendedora');
        return;
      }

      // Verificar se o link está expirado
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error('Este link de pagamento expirou');
        navigate('/revendedora');
        return;
      }

      // Verificar limite de uso
      if (data.max_uses && data.current_uses >= data.max_uses) {
        toast.error('Este link atingiu o limite de uso');
        navigate('/revendedora');
        return;
      }

      setPaymentLink(data);
    } catch (error) {
      console.error('Erro ao carregar link de pagamento:', error);
      toast.error('Erro ao carregar dados do pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment');
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      // Chamar edge function para processar pagamento
      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: {
          payment_link_id: paymentLink.id,
          customer: customerData,
          payment_method: paymentMethod,
          card_data: paymentMethod === 'credit_card' ? cardData : undefined
        }
      });

      if (error) throw error;

      if (data.order_id) {
        toast.success('Pagamento processado com sucesso!');
        navigate(`/order-success/${data.order_number}`);
      } else {
        throw new Error('Erro ao processar pagamento');
      }
    } catch (error: any) {
      console.error('Erro ao processar pagamento:', error);
      toast.error(error.message || 'Erro ao processar pagamento. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  const calculateInstallmentValue = (installments: number) => {
    const total = paymentLink?.total_amount || 0;
    return (total / installments).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!paymentLink) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Link de pagamento não encontrado</p>
      </div>
    );
  }

  const products = Array.isArray(paymentLink.products) ? paymentLink.products : [];

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Finalizar Compra</h1>
          <p className="text-muted-foreground">Complete seus dados para finalizar o pedido</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Resumo do Pedido */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Revendedor */}
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <img
                    src={paymentLink.reseller?.store_logo_url || '/placeholder.svg'}
                    alt={paymentLink.reseller?.store_name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{paymentLink.reseller?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{paymentLink.reseller?.store_name}</p>
                  </div>
                </div>

                {/* Mensagem personalizada */}
                {paymentLink.custom_message && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-900 dark:text-blue-100">{paymentLink.custom_message}</p>
                  </div>
                )}

                <Separator />

                {/* Produtos */}
                <div className="space-y-3">
                  {products.map((product: any, index: number) => (
                    <div key={index} className="flex gap-3">
                      <img
                        src={product.image || '/placeholder.svg'}
                        alt={product.name}
                        className="h-16 w-16 rounded-md object-cover bg-muted"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                        <p className="text-xs text-muted-foreground">Qtd: {product.quantity}</p>
                        <p className="text-sm font-bold">R$ {(product.price * product.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Totais */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>R$ {Number(paymentLink.total_amount).toFixed(2)}</span>
                  </div>
                  {paymentLink.discount_percentage > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Desconto ({paymentLink.discount_percentage}%)</span>
                      <span>-R$ {(paymentLink.total_amount * paymentLink.discount_percentage / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frete</span>
                    <Badge variant="secondary">Grátis</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>R$ {Number(paymentLink.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulário */}
          <div className="lg:col-span-2 space-y-6">
            {step === 'info' ? (
              <form onSubmit={handleSubmitInfo} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Dados Pessoais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Nome Completo *</Label>
                        <Input
                          id="fullName"
                          value={customerData.fullName}
                          onChange={(e) => setCustomerData({ ...customerData, fullName: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cpf">CPF *</Label>
                        <Input
                          id="cpf"
                          value={customerData.cpf}
                          onChange={(e) => setCustomerData({ ...customerData, cpf: e.target.value })}
                          placeholder="000.000.000-00"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={customerData.email}
                          onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone *</Label>
                        <Input
                          id="phone"
                          value={customerData.phone}
                          onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                          placeholder="(00) 00000-0000"
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Endereço de Entrega
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">CEP *</Label>
                        <Input
                          id="zipCode"
                          value={customerData.zipCode}
                          onChange={(e) => setCustomerData({ ...customerData, zipCode: e.target.value })}
                          placeholder="00000-000"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-4 gap-4">
                      <div className="space-y-2 sm:col-span-3">
                        <Label htmlFor="street">Rua *</Label>
                        <Input
                          id="street"
                          value={customerData.street}
                          onChange={(e) => setCustomerData({ ...customerData, street: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="number">Número *</Label>
                        <Input
                          id="number"
                          value={customerData.number}
                          onChange={(e) => setCustomerData({ ...customerData, number: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="complement">Complemento</Label>
                        <Input
                          id="complement"
                          value={customerData.complement}
                          onChange={(e) => setCustomerData({ ...customerData, complement: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="neighborhood">Bairro *</Label>
                        <Input
                          id="neighborhood"
                          value={customerData.neighborhood}
                          onChange={(e) => setCustomerData({ ...customerData, neighborhood: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade *</Label>
                        <Input
                          id="city"
                          value={customerData.city}
                          onChange={(e) => setCustomerData({ ...customerData, city: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button type="submit" className="w-full" size="lg">
                  Continuar para Pagamento
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmitPayment} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Método de Pagamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                      <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                        <RadioGroupItem value="credit_card" id="credit_card" />
                        <Label htmlFor="credit_card" className="flex items-center gap-2 cursor-pointer flex-1">
                          <CreditCard className="h-5 w-5" />
                          Cartão de Crédito
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                        <RadioGroupItem value="pix" id="pix" />
                        <Label htmlFor="pix" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Smartphone className="h-5 w-5" />
                          PIX (5% de desconto)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                        <RadioGroupItem value="boleto" id="boleto" />
                        <Label htmlFor="boleto" className="flex items-center gap-2 cursor-pointer flex-1">
                          <FileText className="h-5 w-5" />
                          Boleto Bancário
                        </Label>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>

                {paymentMethod === 'credit_card' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Dados do Cartão</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">Número do Cartão *</Label>
                        <Input
                          id="cardNumber"
                          value={cardData.number}
                          onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                          placeholder="0000 0000 0000 0000"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardName">Nome no Cartão *</Label>
                        <Input
                          id="cardName"
                          value={cardData.name}
                          onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                          placeholder="NOME COMO NO CARTÃO"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cardExpiry">Validade *</Label>
                          <Input
                            id="cardExpiry"
                            value={cardData.expiry}
                            onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                            placeholder="MM/AA"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cardCvv">CVV *</Label>
                          <Input
                            id="cardCvv"
                            value={cardData.cvv}
                            onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                            placeholder="000"
                            maxLength={4}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="installments">Parcelas *</Label>
                          <select
                            id="installments"
                            value={cardData.installments}
                            onChange={(e) => setCardData({ ...cardData, installments: e.target.value })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {[1, 2, 3, 6, 12].map((num) => (
                              <option key={num} value={num}>
                                {num}x R$ {calculateInstallmentValue(num)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={() => setStep('info')} className="flex-1">
                    Voltar
                  </Button>
                  <Button type="submit" disabled={processing} className="flex-1" size="lg">
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Finalizar Compra
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}