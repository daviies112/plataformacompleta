import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Wallet, ArrowUpCircle, ArrowDownCircle, RefreshCw, CreditCard, QrCode, Settings, History, DollarSign, Loader2, Copy, Check, AlertCircle } from 'lucide-react';

interface WalletBalance {
  balance: number;
  currency: string;
  isFrozen: boolean;
  autoRecharge: boolean;
  autoRechargeTrigger: number | null;
  autoRechargeAmount: number | null;
  hasCard: boolean;
}

interface Transaction {
  id: string;
  type: 'CREDIT' | 'DEBIT' | 'REFUND' | 'BONUS';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  referenceId: string | null;
  referenceType: string | null;
  status: string;
  createdAt: string;
}

interface ServicePrice {
  serviceCode: string;
  serviceName: string;
  price: number;
  costPrice: number;
  description: string;
  isActive: boolean;
}

interface PixRechargeResponse {
  success: boolean;
  orderId: string;
  amount: number;
  pix: {
    qrCode: string;
    qrCodeUrl: string;
    expiresAt: string;
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (dateStr: string) => {
  return new Intl.DateTimeFormat('pt-BR', { 
    dateStyle: 'short', 
    timeStyle: 'short' 
  }).format(new Date(dateStr));
};

export default function Financeiro() {
  const { toast } = useToast();
  const [rechargeAmount, setRechargeAmount] = useState<number>(50);
  const [showPixDialog, setShowPixDialog] = useState(false);
  const [pixData, setPixData] = useState<PixRechargeResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: wallet, isLoading: loadingWallet } = useQuery<WalletBalance>({
    queryKey: ['/api/wallet/balance'],
  });

  const { data: transactionsData, isLoading: loadingTransactions } = useQuery<{ transactions: Transaction[]; total: number }>({
    queryKey: ['/api/wallet/transactions'],
  });

  const { data: pricesData } = useQuery<{ prices: ServicePrice[] }>({
    queryKey: ['/api/wallet/prices'],
  });

  const pixRechargeMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiRequest('POST', '/api/wallet/recharge/pix', { amount });
      return res.json();
    },
    onSuccess: (data: PixRechargeResponse) => {
      setPixData(data);
      setShowPixDialog(true);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao gerar PIX',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    },
  });

  const handleRecharge = (amount: number) => {
    setRechargeAmount(amount);
    pixRechargeMutation.mutate(amount);
  };

  const copyPixCode = async () => {
    if (pixData?.pix?.qrCode) {
      await navigator.clipboard.writeText(pixData.pix.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Código copiado!',
        description: 'Cole no seu app de pagamento',
      });
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'CREDIT':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Crédito</Badge>;
      case 'DEBIT':
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">Débito</Badge>;
      case 'REFUND':
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Estorno</Badge>;
      case 'BONUS':
        return <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">Bônus</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (loadingWallet) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const balanceColor = wallet?.balance && wallet.balance < 10 
    ? 'text-red-500' 
    : wallet?.balance && wallet.balance < 50 
      ? 'text-yellow-500' 
      : 'text-green-500';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Wallet className="w-8 h-8" />
            Financeiro
          </h1>
          <p className="text-muted-foreground">Gerencie seus créditos e acompanhe transações</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card data-testid="card-balance">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${balanceColor}`} data-testid="text-balance">
              {formatCurrency(wallet?.balance || 0)}
            </div>
            {wallet?.isFrozen && (
              <Badge variant="destructive" className="mt-2">
                <AlertCircle className="w-3 h-3 mr-1" />
                Carteira Congelada
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-quick-recharge">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Recarga Rápida</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[20, 50, 100, 200].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => handleRecharge(amount)}
                  disabled={pixRechargeMutation.isPending}
                  data-testid={`button-recharge-${amount}`}
                >
                  {pixRechargeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    formatCurrency(amount)
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-auto-recharge">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Recarga Automática</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {wallet?.autoRecharge ? (
              <div className="text-sm">
                <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Ativa</Badge>
                <p className="mt-2 text-muted-foreground">
                  Quando saldo {'<'} {formatCurrency(wallet.autoRechargeTrigger || 0)}, 
                  recarrega {formatCurrency(wallet.autoRechargeAmount || 0)}
                </p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                <Badge variant="secondary">Desativada</Badge>
                <p className="mt-2">Configure para nunca ficar sem créditos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList data-testid="tabs-financeiro">
          <TabsTrigger value="transactions" data-testid="tab-transactions">
            <History className="w-4 h-4 mr-2" />
            Extrato
          </TabsTrigger>
          <TabsTrigger value="prices" data-testid="tab-prices">
            <Settings className="w-4 h-4 mr-2" />
            Tabela de Preços
          </TabsTrigger>
          <TabsTrigger value="recharge" data-testid="tab-recharge">
            <CreditCard className="w-4 h-4 mr-2" />
            Adicionar Créditos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card data-testid="card-transactions">
            <CardHeader>
              <CardTitle>Histórico de Transações</CardTitle>
              <CardDescription>Todas as movimentações da sua carteira</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTransactions ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : transactionsData?.transactions?.length ? (
                <div className="space-y-4">
                  {transactionsData.transactions.map((tx) => (
                    <div 
                      key={tx.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`transaction-${tx.id}`}
                    >
                      <div className="flex items-center gap-4">
                        {tx.type === 'CREDIT' || tx.type === 'BONUS' || tx.type === 'REFUND' ? (
                          <ArrowUpCircle className="w-8 h-8 text-green-500" />
                        ) : (
                          <ArrowDownCircle className="w-8 h-8 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium">{tx.description}</p>
                          <p className="text-sm text-muted-foreground">{formatDate(tx.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getTransactionBadge(tx.type)}
                        <p className={`text-lg font-bold mt-1 ${tx.type === 'DEBIT' ? 'text-red-500' : 'text-green-500'}`}>
                          {tx.type === 'DEBIT' ? '-' : '+'}{formatCurrency(tx.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Saldo: {formatCurrency(tx.balanceAfter)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma transação encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prices">
          <Card data-testid="card-prices">
            <CardHeader>
              <CardTitle>Tabela de Preços dos Serviços</CardTitle>
              <CardDescription>Valores cobrados por operação (serviços adicionais incluídos na mensalidade)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* CPF Consultation - Fixed Price */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Consultas por Uso</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pricesData?.prices?.filter(p => p.serviceCode === 'CPF_CONSULTA').map((price) => (
                    <Card key={price.serviceCode} className="bg-muted/50" data-testid={`price-${price.serviceCode}`}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{price.serviceName}</h4>
                          <Badge variant="outline">{price.serviceCode}</Badge>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(price.price)}
                        </p>
                        {price.description && (
                          <p className="text-sm text-muted-foreground mt-2">{price.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Shipping - Dynamic Pricing */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Envios</h3>
                <Card className="bg-blue-500/10 border-blue-500/30" data-testid="price-shipping-info">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">Registro de Envio</h4>
                      <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Preço Dinâmico</Badge>
                    </div>
                    <p className="text-lg font-medium text-blue-600">
                      Custo da transportadora + 35%
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      O valor do frete é calculado automaticamente com base na cotação da transportadora (TotalExpress, Correios, etc.) com margem de 35%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Included in Subscription */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Incluídos na Mensalidade</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card className="bg-green-500/10 border-green-500/30">
                    <CardContent className="pt-4">
                      <h4 className="font-semibold">Contratos Digitais</h4>
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30 mt-2">Ilimitado</Badge>
                      <p className="text-sm text-muted-foreground mt-2">Geração de contratos com assinatura digital</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-500/10 border-green-500/30">
                    <CardContent className="pt-4">
                      <h4 className="font-semibold">Envio de SMS</h4>
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30 mt-2">Ilimitado</Badge>
                      <p className="text-sm text-muted-foreground mt-2">Notificações por SMS</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-500/10 border-green-500/30">
                    <CardContent className="pt-4">
                      <h4 className="font-semibold">WhatsApp Business</h4>
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30 mt-2">Ilimitado</Badge>
                      <p className="text-sm text-muted-foreground mt-2">Mensagens via WhatsApp</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recharge">
          <Card data-testid="card-recharge-form">
            <CardHeader>
              <CardTitle>Adicionar Créditos</CardTitle>
              <CardDescription>Escolha o valor e método de pagamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Valor da recarga</label>
                <div className="flex gap-2 flex-wrap">
                  {[20, 50, 100, 200, 500, 1000].map((amount) => (
                    <Button
                      key={amount}
                      variant={rechargeAmount === amount ? "default" : "outline"}
                      onClick={() => setRechargeAmount(amount)}
                      data-testid={`button-amount-${amount}`}
                    >
                      {formatCurrency(amount)}
                    </Button>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Ou digite:</span>
                  <Input
                    type="number"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(Number(e.target.value))}
                    min={10}
                    max={10000}
                    className="w-32"
                    data-testid="input-custom-amount"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  className="flex-1"
                  onClick={() => handleRecharge(rechargeAmount)}
                  disabled={rechargeAmount < 10 || pixRechargeMutation.isPending}
                  data-testid="button-pay-pix"
                >
                  {pixRechargeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <QrCode className="w-4 h-4 mr-2" />
                  )}
                  Pagar com PIX
                </Button>
              </div>

              {rechargeAmount < 10 && (
                <p className="text-sm text-red-500">Valor mínimo: R$ 10,00</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showPixDialog} onOpenChange={setShowPixDialog}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-pix">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Pagamento PIX
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR Code ou copie o código para pagar
            </DialogDescription>
          </DialogHeader>
          
          {pixData && (
            <div className="space-y-4">
              <div className="flex justify-center">
                {pixData.pix?.qrCodeUrl && (
                  <img 
                    src={pixData.pix.qrCodeUrl} 
                    alt="QR Code PIX" 
                    className="w-48 h-48 border rounded-lg"
                    data-testid="img-qrcode"
                  />
                )}
              </div>

              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(pixData.amount)}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Código PIX (Copia e Cola)</label>
                <div className="flex gap-2">
                  <Input 
                    value={pixData.pix?.qrCode || ''} 
                    readOnly 
                    className="font-mono text-xs"
                    data-testid="input-pix-code"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={copyPixCode}
                    data-testid="button-copy-pix"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>Após o pagamento, seus créditos serão adicionados automaticamente.</p>
                <p className="mt-1">Pedido: {pixData.orderId}</p>
              </div>

              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => {
                  setShowPixDialog(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/wallet/transactions'] });
                }}
                data-testid="button-close-pix"
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
