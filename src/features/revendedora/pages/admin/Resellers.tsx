import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { 
  Users, 
  DollarSign, 
  UserCheck, 
  Search, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Building2,
  ChevronDown,
  ChevronUp,
  Calendar,
  AlertTriangle,
  Bell
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useResellerAnalytics } from '@/hooks/useResellerAnalytics';
import { useResellerAlerts, DROP_THRESHOLD } from '@/hooks/useResellerAlerts';
import { toast } from 'sonner';

export default function Resellers() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [processedAlerts, setProcessedAlerts] = useState<Set<string>>(new Set());

  const { resellersData, loading, error, totals } = useResellerAnalytics();
  const { createAlert, alerts } = useResellerAlerts();

  const checkAndCreateAlerts = useCallback(async () => {
    if (!resellersData || resellersData.length === 0) return;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    for (const reseller of resellersData) {
      if (!reseller.has_sales_drop) continue;
      if (!reseller.is_active) continue;
      
      const alertKey = `${reseller.reseller_id}-${currentMonth}-${currentYear}`;
      if (processedAlerts.has(alertKey)) continue;

      const alert = await createAlert({
        reseller_id: reseller.reseller_id,
        reseller_name: reseller.reseller_name,
        reseller_phone: reseller.reseller_phone,
        reseller_email: reseller.reseller_email,
        current_month_sales: reseller.current_month_sales,
        average_monthly_sales: reseller.average_monthly_sales,
        drop_percentage: reseller.drop_percentage || 0,
        analysis_month: currentMonth,
        analysis_year: currentYear
      });

      if (alert) {
        setProcessedAlerts(prev => new Set(prev).add(alertKey));
        toast.warning(`Alerta criado para ${reseller.reseller_name}`, {
          description: `Vendas caíram ${reseller.drop_percentage?.toFixed(1)}% em relação à média`
        });
      }
    }
  }, [resellersData, createAlert, processedAlerts]);

  useEffect(() => {
    if (!loading && resellersData.length > 0) {
      checkAndCreateAlerts();
    }
  }, [loading, resellersData, checkAndCreateAlerts]);

  const resellersWithDrops = useMemo(() => {
    return resellersData.filter(r => r.has_sales_drop && r.is_active);
  }, [resellersData]);

  const filteredResellers = useMemo(() => {
    if (!resellersData) return [];

    return resellersData.filter((reseller) => {
      const name = reseller.reseller_name || '';
      const email = reseller.reseller_email || '';
      const search = searchTerm.toLowerCase();
      
      const matchesSearch =
        name.toLowerCase().includes(search) ||
        email.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && reseller.is_active) ||
        (statusFilter === 'inactive' && !reseller.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [resellersData, searchTerm, statusFilter]);

  const toggleRow = (resellerId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(resellerId)) {
        next.delete(resellerId);
      } else {
        next.add(resellerId);
      }
      return next;
    });
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const getCurrentMonthStats = (reseller: typeof resellersData[0]) => {
    const now = new Date();
    const currentMonth = reseller.monthly_sales.find(
      m => m.year === now.getFullYear() && m.month_number === now.getMonth() + 1
    );
    return currentMonth || { sales_count: 0, sales_amount: 0, reseller_profit: 0, company_profit: 0 };
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar dados dos revendedores: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Revendedoras</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Desempenho de vendas e lucros por revendedora</p>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Revendedoras</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Desempenho de vendas e lucros por revendedora</p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Revendedoras
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {resellersData.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {resellersData.filter(r => r.is_active).length} ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total em Vendas
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totals.totalSalesAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totals.totalSalesCount} vendas confirmadas
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Lucro Revendedoras
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.totalResellerProfit)}
            </div>
            <p className="text-xs text-green-600/80">
              Total pago às revendedoras
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              Lucro Empresa
            </CardTitle>
            <Building2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(totals.totalCompanyProfit)}
            </div>
            <p className="text-xs text-purple-600/80">
              Receita líquida da empresa
            </p>
          </CardContent>
        </Card>
      </div>

      {resellersWithDrops.length > 0 && (
        <Card className="border-orange-300 bg-orange-50">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <div>
              <CardTitle className="text-orange-700">
                Alerta de Queda de Vendas
              </CardTitle>
              <CardDescription className="text-orange-600">
                {resellersWithDrops.length} revendedora(s) com vendas abaixo de {DROP_THRESHOLD}% da média
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resellersWithDrops.slice(0, 5).map(reseller => (
                <div 
                  key={reseller.reseller_id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200"
                >
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="font-medium">{reseller.reseller_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {reseller.reseller_phone || reseller.reseller_email || 'Sem contato'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="bg-orange-500">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      -{reseller.drop_percentage?.toFixed(1)}%
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Média: {formatCurrency(reseller.average_monthly_sales)} | Atual: {formatCurrency(reseller.current_month_sales)}
                    </p>
                  </div>
                </div>
              ))}
              {resellersWithDrops.length > 5 && (
                <p className="text-sm text-center text-muted-foreground pt-2">
                  +{resellersWithDrops.length - 5} outras revendedoras com queda
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Revendedora</CardTitle>
          <CardDescription>
            Clique em uma linha para ver o histórico mensal detalhado
          </CardDescription>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 min-h-[44px]"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="inactive">Inativas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 px-4">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Revendedora</TableHead>
                  <TableHead className="hidden sm:table-cell">Contato</TableHead>
                  <TableHead className="text-center">Vendas (Total)</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">Vendas (Mês)</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Média Mensal</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Lucro Revendedora</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Lucro Empresa</TableHead>
                  <TableHead className="text-right">Total Vendido</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResellers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <p className="text-muted-foreground">
                        Nenhuma revendedora encontrada
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResellers.map((reseller) => {
                    const isExpanded = expandedRows.has(reseller.reseller_id);
                    const currentMonthStats = getCurrentMonthStats(reseller);
                    
                    return (
                      <Collapsible key={reseller.reseller_id} asChild open={isExpanded}>
                        <>
                          <TableRow 
                            className={`cursor-pointer hover:bg-muted/50 ${isExpanded ? 'bg-muted/30' : ''}`}
                            onClick={() => toggleRow(reseller.reseller_id)}
                          >
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{reseller.reseller_name}</span>
                                <Badge 
                                  variant={reseller.is_active ? 'default' : 'secondary'}
                                  className={`w-fit mt-1 ${
                                    reseller.is_active ? 'bg-green-500' : 'bg-gray-400'
                                  }`}
                                >
                                  {reseller.is_active ? 'Ativa' : 'Inativa'}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <div className="flex flex-col text-sm">
                                <span>{reseller.reseller_email}</span>
                                <span className="text-muted-foreground">
                                  {reseller.reseller_phone || '-'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">
                                {reseller.total_sales_count} vendas
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-center">
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                {currentMonthStats.sales_count} vendas
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-medium">
                                  {formatCurrency(reseller.average_monthly_sales)}
                                </span>
                                {reseller.has_sales_drop && reseller.drop_percentage !== null && (
                                  <Badge variant="destructive" className="bg-orange-500 text-xs">
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                    -{reseller.drop_percentage.toFixed(0)}%
                                  </Badge>
                                )}
                                {!reseller.has_sales_drop && reseller.drop_percentage !== null && reseller.drop_percentage < 0 && (
                                  <Badge variant="default" className="bg-green-500 text-xs">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    +{Math.abs(reseller.drop_percentage).toFixed(0)}%
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-right font-semibold text-green-600">
                              {formatCurrency(reseller.total_reseller_profit)}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-right font-semibold text-purple-600">
                              {formatCurrency(reseller.total_company_profit)}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCurrency(reseller.total_sales_amount)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/resellers/${reseller.reseller_id}`);
                                }}
                              >
                                Detalhes
                              </Button>
                            </TableCell>
                          </TableRow>
                          
                          <CollapsibleContent asChild>
                            <TableRow className="bg-muted/20 hover:bg-muted/30">
                              <TableCell colSpan={10} className="p-0">
                                <div className="p-4 border-t">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="font-semibold">Histórico Mensal de Vendas</h4>
                                  </div>
                                  
                                  {reseller.monthly_sales.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-4 text-center">
                                      Nenhuma venda registrada ainda
                                    </p>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="bg-muted/50">
                                            <TableHead>Mês/Ano</TableHead>
                                            <TableHead className="text-center">Qtd. Vendas</TableHead>
                                            <TableHead className="text-right">Total Vendido</TableHead>
                                            <TableHead className="text-right">Lucro Revendedora</TableHead>
                                            <TableHead className="text-right">Lucro Empresa</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {reseller.monthly_sales.map((month, idx) => (
                                            <TableRow key={idx}>
                                              <TableCell className="font-medium">
                                                {month.month} {month.year}
                                              </TableCell>
                                              <TableCell className="text-center">
                                                <Badge variant="outline">{month.sales_count}</Badge>
                                              </TableCell>
                                              <TableCell className="text-right">
                                                {formatCurrency(month.sales_amount)}
                                              </TableCell>
                                              <TableCell className="text-right text-green-600">
                                                {formatCurrency(month.reseller_profit)}
                                              </TableCell>
                                              <TableCell className="text-right text-purple-600">
                                                {formatCurrency(month.company_profit)}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
