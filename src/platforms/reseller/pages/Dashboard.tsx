import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Clock, Package } from 'lucide-react';
import { useResellerAuth } from '../hooks/useResellerAuth';

export default function Dashboard() {
  const { user } = useResellerAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/reseller/dashboard-stats'],
    enabled: !!user
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
          Ola, {user?.nome?.split(' ')[0] || 'Revendedora'}!
        </h1>
        <p className="text-muted-foreground">
          Acompanhe suas vendas e comissoes
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-sales-today">
              {isLoading ? '...' : (stats?.stats?.hoje?.vendas || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats?.stats?.hoje?.valorTotal || 0)} em vendas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissao Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-commission-today">
              {isLoading ? '...' : formatCurrency(stats?.stats?.hoje?.comissao || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {user?.comissao || 20}% de comissao
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-sales">
              {isLoading ? '...' : (stats?.stats?.total?.vendas || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats?.stats?.total?.valorTotal || 0)} acumulado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-pending-commission">
              {isLoading ? '...' : formatCurrency(stats?.stats?.pendente?.comissao || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.stats?.pendente?.vendas || 0} vendas aguardando
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Comissao Total</CardTitle>
            <CardDescription>Total acumulado de todas as vendas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600" data-testid="text-total-commission">
              {isLoading ? '...' : formatCurrency(stats?.stats?.total?.comissao || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seu Link de Vendas</CardTitle>
            <CardDescription>Compartilhe este link com seus clientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-muted rounded-lg text-sm font-mono break-all" data-testid="text-sales-link">
              {typeof window !== 'undefined' ? `${window.location.origin}/loja/${user?.id || ''}` : 'Carregando...'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
