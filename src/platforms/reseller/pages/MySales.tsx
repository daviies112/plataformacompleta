import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useResellerAuth } from '../hooks/useResellerAuth';

export default function MySales() {
  const { user } = useResellerAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/reseller/my-sales'],
    enabled: !!user
  });

  const vendas = data?.vendas || [];
  const resumo = data?.resumo || {};

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" /> Pago</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case 'cancelado':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" /> Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-sales-title">
          Minhas Vendas
        </h1>
        <p className="text-muted-foreground">
          Historico de todas as suas vendas
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-summary-total">
              {formatCurrency(resumo.totalVendas || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {resumo.totalTransacoes || 0} transacoes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissao Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-summary-commission">
              {formatCurrency(resumo.totalComissao || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {user?.comissao || 20}% de comissao
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-summary-pending">
              {resumo.pendente || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              aguardando pagamento
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historico de Vendas</CardTitle>
          <CardDescription>Todas as suas transacoes</CardDescription>
        </CardHeader>
        <CardContent>
          {vendas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Voce ainda nao tem vendas registradas</p>
              <p className="text-sm">Compartilhe seu link de vendas para comecar!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Data</th>
                    <th className="text-left py-3 px-2 font-medium">Produto</th>
                    <th className="text-left py-3 px-2 font-medium">Cliente</th>
                    <th className="text-right py-3 px-2 font-medium">Valor</th>
                    <th className="text-right py-3 px-2 font-medium">Comissao</th>
                    <th className="text-center py-3 px-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.map((venda: any) => (
                    <tr key={venda.id} className="border-b last:border-0">
                      <td className="py-3 px-2 text-sm">
                        {formatDate(venda.created_at)}
                      </td>
                      <td className="py-3 px-2">
                        {venda.produto_nome || '-'}
                      </td>
                      <td className="py-3 px-2">
                        <div>{venda.cliente_nome || '-'}</div>
                        {venda.cliente_telefone && (
                          <div className="text-xs text-muted-foreground">{venda.cliente_telefone}</div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right font-medium">
                        {formatCurrency(venda.valor_total || 0)}
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-green-600">
                        {formatCurrency(venda.valor_comissao || 0)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {getStatusBadge(venda.status_pagamento)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
