import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Users, 
  Package,
  ShoppingCart,
  AlertTriangle,
  Award,
  Percent,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useResellerAnalytics } from '@/features/revendedora/hooks/useResellerAnalytics';
import { SplitService } from '@/features/revendedora/services/SplitService';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function Analytics() {
  const { resellersData, loading, totals, error } = useResellerAnalytics();
  const [periodFilter, setPeriodFilter] = useState<string>('current_month');

  const formatCurrency = (value: number) => SplitService.formatCurrency(value);

  const getFilteredPeriodRange = (filter: string) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    switch (filter) {
      case 'current_month':
        return { 
          months: [{ month: currentMonth + 1, year: currentYear }],
          label: MONTH_NAMES[currentMonth]
        };
      case 'last_month': {
        const lastMonth = currentMonth === 0 ? 12 : currentMonth;
        const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return { 
          months: [{ month: lastMonth, year: lastYear }],
          label: MONTH_NAMES[lastMonth - 1]
        };
      }
      case 'last_3_months': {
        const months = [];
        for (let i = 0; i < 3; i++) {
          let m = currentMonth - i;
          let y = currentYear;
          if (m < 0) { m += 12; y--; }
          months.push({ month: m + 1, year: y });
        }
        return { months, label: 'Últimos 3 Meses' };
      }
      case 'last_6_months': {
        const months = [];
        for (let i = 0; i < 6; i++) {
          let m = currentMonth - i;
          let y = currentYear;
          if (m < 0) { m += 12; y--; }
          months.push({ month: m + 1, year: y });
        }
        return { months, label: 'Últimos 6 Meses' };
      }
      case 'year': {
        const months = [];
        for (let m = 0; m <= currentMonth; m++) {
          months.push({ month: m + 1, year: currentYear });
        }
        return { months, label: String(currentYear) };
      }
      default:
        return { 
          months: [{ month: currentMonth + 1, year: currentYear }],
          label: MONTH_NAMES[currentMonth]
        };
    }
  };

  const platformStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const periodRange = getFilteredPeriodRange(periodFilter);
    const periodMonths = new Set(periodRange.months.map(m => `${m.year}-${m.month}`));
    
    const previousMonths: { month: number; year: number }[] = [];
    const periodLength = periodRange.months.length;
    const oldestMonth = periodRange.months[periodRange.months.length - 1];
    for (let i = 1; i <= periodLength; i++) {
      let m = oldestMonth.month - i;
      let y = oldestMonth.year;
      while (m < 1) { m += 12; y--; }
      previousMonths.push({ month: m, year: y });
    }
    const previousPeriodSet = new Set(previousMonths.map(m => `${m.year}-${m.month}`));

    let periodSales = 0;
    let periodCompanyProfit = 0;
    let periodResellerProfit = 0;
    let previousPeriodSales = 0;
    let periodSalesCount = 0;
    
    const resellerPeriodSales = new Map<string, number>();

    resellersData.forEach(reseller => {
      let resellerSalesInPeriod = 0;
      reseller.monthly_sales.forEach(month => {
        const key = `${month.year}-${month.month_number}`;
        if (periodMonths.has(key)) {
          periodSales += month.sales_amount;
          periodCompanyProfit += month.company_profit;
          periodResellerProfit += month.reseller_profit;
          periodSalesCount += month.sales_count;
          resellerSalesInPeriod += month.sales_amount;
        }
        if (previousPeriodSet.has(key)) {
          previousPeriodSales += month.sales_amount;
        }
      });
      resellerPeriodSales.set(reseller.id, resellerSalesInPeriod);
    });

    const salesGrowth = previousPeriodSales > 0 
      ? ((periodSales - previousPeriodSales) / previousPeriodSales) * 100 
      : 0;

    const activeResellers = resellersData.filter(r => {
      const sales = resellerPeriodSales.get(r.id) || 0;
      return r.is_active && sales > 0;
    }).length;
    const inactiveResellers = resellersData.filter(r => {
      const sales = resellerPeriodSales.get(r.id) || 0;
      return !r.is_active || sales === 0;
    }).length;
    const resellersWithDrop = resellersData.filter(r => r.has_sales_drop).length;

    const growthLabel = periodLength > 1 ? 'vs. período anterior' : 'vs. mês anterior';

    return {
      periodSales,
      periodCompanyProfit,
      periodResellerProfit,
      previousPeriodSales,
      salesGrowth,
      activeResellers,
      inactiveResellers,
      resellersWithDrop,
      totalResellers: resellersData.length,
      averageTicket: periodSalesCount > 0 ? periodSales / periodSalesCount : 0,
      periodLabel: periodRange.label,
      growthLabel,
      resellerPeriodSales,
    };
  }, [resellersData, totals, periodFilter]);

  const topResellers = useMemo(() => {
    return [...resellersData]
      .map(r => ({
        ...r,
        periodSales: platformStats.resellerPeriodSales.get(r.id) || 0,
      }))
      .sort((a, b) => b.periodSales - a.periodSales)
      .slice(0, 10);
  }, [resellersData, platformStats.resellerPeriodSales]);

  const resellersAtRisk = useMemo(() => {
    return resellersData
      .filter(r => r.has_sales_drop)
      .sort((a, b) => (b.drop_percentage || 0) - (a.drop_percentage || 0));
  }, [resellersData]);

  const monthlyTrend = useMemo(() => {
    const monthlyMap = new Map<string, { 
      month: string; 
      year: number;
      month_number: number;
      total_sales: number; 
      company_profit: number;
      reseller_profit: number;
      sales_count: number;
    }>();

    resellersData.forEach(reseller => {
      reseller.monthly_sales.forEach(month => {
        const key = `${month.year}-${month.month_number}`;
        const existing = monthlyMap.get(key) || {
          month: month.month,
          year: month.year,
          month_number: month.month_number,
          total_sales: 0,
          company_profit: 0,
          reseller_profit: 0,
          sales_count: 0,
        };
        
        existing.total_sales += month.sales_amount;
        existing.company_profit += month.company_profit;
        existing.reseller_profit += month.reseller_profit;
        existing.sales_count += month.sales_count;
        
        monthlyMap.set(key, existing);
      });
    });

    return Array.from(monthlyMap.values())
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month_number - a.month_number;
      })
      .slice(0, 12);
  }, [resellersData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics da Plataforma</h1>
          <p className="text-muted-foreground">
            Visão geral do desempenho de vendas e revendedores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-period-filter">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Mês Atual</SelectItem>
              <SelectItem value="last_month">Mês Anterior</SelectItem>
              <SelectItem value="last_3_months">Últimos 3 Meses</SelectItem>
              <SelectItem value="last_6_months">Últimos 6 Meses</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Faturamento {platformStats.periodLabel}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-revenue">{formatCurrency(platformStats.periodSales)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {platformStats.salesGrowth >= 0 ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-500">+{platformStats.salesGrowth.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-red-500">{platformStats.salesGrowth.toFixed(1)}%</span>
                </>
              )}
              <span className="ml-1">{platformStats.growthLabel}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-company-profit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Lucro da Empresa</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-company-profit">
              {formatCurrency(platformStats.periodCompanyProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {platformStats.periodSales > 0 
                ? `${((platformStats.periodCompanyProfit / platformStats.periodSales) * 100).toFixed(1)}% do faturamento`
                : 'Sem vendas no período'
              }
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-commissions">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Comissões Pagas</CardTitle>
            <Percent className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-commissions">
              {formatCurrency(platformStats.periodResellerProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Para {platformStats.activeResellers} revendedores ativos
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-average-ticket">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-average-ticket">{formatCurrency(platformStats.averageTicket)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Baseado em {platformStats.periodLabel}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-active-resellers">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Revendedores Ativos</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-active-resellers">{platformStats.activeResellers}</div>
            <p className="text-xs text-muted-foreground">Com vendas em {platformStats.periodLabel}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-inactive-resellers">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500" data-testid="text-inactive-resellers">{platformStats.inactiveResellers}</div>
            <p className="text-xs text-muted-foreground">Sem vendas em {platformStats.periodLabel}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-at-risk" className={platformStats.resellersWithDrop > 0 ? 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Em Risco</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${platformStats.resellersWithDrop > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${platformStats.resellersWithDrop > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500'}`} data-testid="text-at-risk">
              {platformStats.resellersWithDrop}
            </div>
            <p className="text-xs text-muted-foreground">Queda de 30%+ (mês atual vs média)</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="top-resellers" data-testid="tab-top-resellers">Top Revendedores</TabsTrigger>
          <TabsTrigger value="at-risk" data-testid="tab-at-risk">Em Risco</TabsTrigger>
          <TabsTrigger value="monthly-trend" data-testid="tab-monthly-trend">Tendência Mensal</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Resumo Histórico
                </CardTitle>
                <CardDescription>Totais acumulados da plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Total de Vendas</span>
                    <span className="font-bold">{totals.totalSalesCount}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Faturamento Total</span>
                    <span className="font-bold">{formatCurrency(totals.totalSalesAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Lucro Empresa (Total)</span>
                    <span className="font-bold text-green-600">{formatCurrency(totals.totalCompanyProfit)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Comissões Pagas (Total)</span>
                    <span className="font-bold text-blue-600">{formatCurrency(totals.totalResellerProfit)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Total de Revendedores</span>
                    <span className="font-bold">{platformStats.totalResellers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Distribuição de Comissões
                </CardTitle>
                <CardDescription>Como o faturamento é dividido</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Taxa Plataforma (6%)</span>
                      <span className="text-muted-foreground">Pagar.me + Desenvolvedor</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-gray-500 h-3 rounded-full" style={{ width: '6%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Empresa</span>
                      <span className="text-green-600">
                        {totals.totalSalesAmount > 0 
                          ? `${((totals.totalCompanyProfit / totals.totalSalesAmount) * 100).toFixed(1)}%`
                          : '0%'
                        }
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-green-500 h-3 rounded-full" 
                        style={{ 
                          width: totals.totalSalesAmount > 0 
                            ? `${(totals.totalCompanyProfit / totals.totalSalesAmount) * 100}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Revendedores</span>
                      <span className="text-blue-600">
                        {totals.totalSalesAmount > 0 
                          ? `${((totals.totalResellerProfit / totals.totalSalesAmount) * 100).toFixed(1)}%`
                          : '0%'
                        }
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-500 h-3 rounded-full" 
                        style={{ 
                          width: totals.totalSalesAmount > 0 
                            ? `${(totals.totalResellerProfit / totals.totalSalesAmount) * 100}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Os tiers de comissão variam de <strong>65% a 80%</strong> para revendedores,
                    dependendo do volume mensal de vendas.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="top-resellers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Top 10 Revendedores - {platformStats.periodLabel}
              </CardTitle>
              <CardDescription>
                Classificados por faturamento no período selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topResellers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma venda registrada no período</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Revendedor</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead className="text-right">Vendas ({platformStats.periodLabel})</TableHead>
                      <TableHead className="text-right">Total Histórico</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topResellers.map((reseller, index) => (
                      <TableRow key={reseller.reseller_id} data-testid={`row-reseller-${reseller.reseller_id}`}>
                        <TableCell>
                          {index < 3 ? (
                            <Badge 
                              variant="secondary"
                              data-testid={`badge-rank-${index + 1}`}
                              className={
                                index === 0 ? 'bg-yellow-500 dark:bg-yellow-600 text-yellow-950 dark:text-yellow-50 no-default-hover-elevate' :
                                index === 1 ? 'bg-gray-400 dark:bg-gray-500 text-gray-950 dark:text-gray-50 no-default-hover-elevate' :
                                'bg-amber-600 dark:bg-amber-700 text-amber-50 no-default-hover-elevate'
                              }
                            >
                              {index + 1}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground" data-testid={`text-rank-${index + 1}`}>{index + 1}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{reseller.reseller_name}</p>
                            <p className="text-xs text-muted-foreground">{reseller.reseller_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Nível {reseller.reseller_level}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(reseller.periodSales)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(reseller.total_sales_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="at-risk">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="title-at-risk">
                <TrendingDown className="h-5 w-5 text-orange-500" />
                Revendedores em Risco (Mês Atual)
              </CardTitle>
              <CardDescription>
                Vendas do mês atual comparadas com a média dos últimos 3 meses. Queda de 30% ou mais indica risco.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resellersAtRisk.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-green-600 font-medium">Nenhum revendedor em risco!</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Todos os revendedores estão mantendo um bom desempenho
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Revendedor</TableHead>
                      <TableHead className="text-right">Média 3 Meses</TableHead>
                      <TableHead className="text-right">Mês Atual</TableHead>
                      <TableHead className="text-right">Queda</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resellersAtRisk.map((reseller) => (
                      <TableRow key={reseller.reseller_id} data-testid={`row-risk-${reseller.reseller_id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{reseller.reseller_name}</p>
                            <p className="text-xs text-muted-foreground">{reseller.reseller_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(reseller.average_monthly_sales)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(reseller.current_month_sales)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive">
                            -{reseller.drop_percentage?.toFixed(0)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly-trend">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Tendência Mensal
              </CardTitle>
              <CardDescription>
                Evolução do faturamento nos últimos 12 meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyTrend.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Sem dados para exibir</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Lucro Empresa</TableHead>
                      <TableHead className="text-right">Comissões</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyTrend.map((month, index) => (
                      <TableRow key={`${month.year}-${month.month_number}`} data-testid={`row-month-${index}`}>
                        <TableCell className="font-medium">
                          {month.month} {month.year}
                        </TableCell>
                        <TableCell className="text-right">
                          {month.sales_count}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(month.total_sales)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(month.company_profit)}
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          {formatCurrency(month.reseller_profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
