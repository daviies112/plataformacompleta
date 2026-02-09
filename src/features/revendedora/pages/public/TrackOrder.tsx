import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Package, Search, Truck, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderNumber || !email) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    
    try {
      // Aqui buscar no Supabase
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      setOrderData({
        orderNumber: orderNumber,
        status: 'shipped',
        paymentStatus: 'paid',
        totalAmount: 299.90,
        createdAt: '2024-01-20',
        paidAt: '2024-01-20',
        shippedAt: '2024-01-22',
        trackingCode: 'BR123456789BR',
        carrier: 'Correios',
        estimatedDelivery: '2024-01-27',
        items: [
          { id: '1', name: 'Produto Premium 1', quantity: 1, unitPrice: 299.90, image: '/placeholder.svg' }
        ],
        shippingAddress: {
          street: 'Rua Exemplo',
          number: '123',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567'
        },
        timeline: [
          { date: '2024-01-20', status: 'pending', description: 'Pedido criado' },
          { date: '2024-01-20', status: 'paid', description: 'Pagamento confirmado' },
          { date: '2024-01-21', status: 'processing', description: 'Pedido em separação' },
          { date: '2024-01-22', status: 'shipped', description: 'Pedido enviado' },
        ]
      });
    } catch (error) {
      toast.error('Pedido não encontrado');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'paid':
      case 'processing':
        return <Package className="h-5 w-5 text-blue-600" />;
      case 'shipped':
        return <Truck className="h-5 w-5 text-purple-600" />;
      case 'delivered':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendente', variant: 'secondary' },
      paid: { label: 'Pago', variant: 'default' },
      processing: { label: 'Processando', variant: 'outline' },
      shipped: { label: 'Enviado', variant: 'default' },
      delivered: { label: 'Entregue', variant: 'default' },
      cancelled: { label: 'Cancelado', variant: 'destructive' },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="container max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Rastrear Pedido</h1>
          <p className="text-muted-foreground">
            Acompanhe o status do seu pedido em tempo real
          </p>
        </div>

        {/* Formulário de busca */}
        {!orderData && (
          <Card>
            <CardHeader>
              <CardTitle>Buscar Pedido</CardTitle>
              <CardDescription>
                Digite o número do pedido e o e-mail usado na compra
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Número do Pedido</Label>
                  <Input
                    id="orderNumber"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="ORD-123456789"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  <Search className="mr-2 h-4 w-4" />
                  {loading ? 'Buscando...' : 'Buscar Pedido'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Dados do pedido */}
        {orderData && (
          <div className="space-y-6">
            <Button variant="outline" onClick={() => setOrderData(null)}>
              ← Nova Busca
            </Button>

            {/* Status do pedido */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Pedido {orderData.orderNumber}</CardTitle>
                    <CardDescription>
                      Realizado em {new Date(orderData.createdAt).toLocaleDateString('pt-BR')}
                    </CardDescription>
                  </div>
                  {getStatusBadge(orderData.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Timeline */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Histórico do Pedido</h3>
                  <div className="relative">
                    {orderData.timeline.map((event: any, index: number) => (
                      <div key={index} className="flex gap-4 pb-6 relative">
                        {index !== orderData.timeline.length - 1 && (
                          <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-border" />
                        )}
                        <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-primary bg-background flex items-center justify-center z-10">
                          {getStatusIcon(event.status)}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="font-medium">{event.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.date).toLocaleDateString('pt-BR')} às {new Date(event.date).toLocaleTimeString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rastreamento */}
                {orderData.trackingCode && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Código de Rastreamento</span>
                      <Badge>{orderData.carrier}</Badge>
                    </div>
                    <p className="text-2xl font-mono font-bold mb-2">{orderData.trackingCode}</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Previsão de entrega: {new Date(orderData.estimatedDelivery).toLocaleDateString('pt-BR')}
                    </p>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href={`https://rastreamento.correios.com.br/app/index.php?code=${orderData.trackingCode}`} target="_blank" rel="noopener noreferrer">
                        <Truck className="mr-2 h-4 w-4" />
                        Rastrear no Site dos Correios
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Produtos */}
            <Card>
              <CardHeader>
                <CardTitle>Produtos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderData.items.map((item: any) => (
                    <div key={item.id} className="flex gap-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-20 w-20 rounded-md object-cover bg-muted"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Quantidade: {item.quantity}</p>
                        <p className="text-sm font-bold">R$ {(item.unitPrice * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>R$ {orderData.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Endereço */}
            <Card>
              <CardHeader>
                <CardTitle>Endereço de Entrega</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{orderData.shippingAddress.street}, {orderData.shippingAddress.number}</p>
                {orderData.shippingAddress.complement && <p>{orderData.shippingAddress.complement}</p>}
                <p>{orderData.shippingAddress.neighborhood}</p>
                <p>{orderData.shippingAddress.city} - {orderData.shippingAddress.state}</p>
                <p>CEP: {orderData.shippingAddress.zipCode}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
