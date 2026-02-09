import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useInventoryForecasting,
  ProductInventoryMetrics,
  InventorySummary,
} from '@/hooks/useInventoryForecasting';
import {
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  XCircle,
  CheckCircle,
  ShoppingCart,
  Truck,
  BarChart3,
  Users,
  RefreshCw,
  HelpCircle,
  PackageX,
  AlertCircle,
  Settings,
} from 'lucide-react';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatNumber(value: number, decimals: number = 1): string {
  return value.toFixed(decimals);
}

interface StatusBadgeProps {
  status: ProductInventoryMetrics['status'];
}

function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    healthy: {
      label: 'Saudável',
      variant: 'default' as const,
      className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100',
      icon: CheckCircle,
    },
    low_stock: {
      label: 'Estoque Baixo',
      variant: 'secondary' as const,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100',
      icon: AlertTriangle,
    },
    reorder_now: {
      label: 'Repor Agora',
      variant: 'secondary' as const,
      className: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100',
      icon: AlertCircle,
    },
    out_of_stock: {
      label: 'Esgotado',
      variant: 'destructive' as const,
      className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100',
      icon: XCircle,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

interface TrendIndicatorProps {
  trend: ProductInventoryMetrics['trend'];
}

function TrendIndicator({ trend }: TrendIndicatorProps) {
  const trendConfig = {
    increasing: {
      label: 'Crescendo',
      icon: TrendingUp,
      className: 'text-green-600',
    },
    stable: {
      label: 'Estável',
      icon: Minus,
      className: 'text-blue-600',
    },
    decreasing: {
      label: 'Diminuindo',
      icon: TrendingDown,
      className: 'text-orange-600',
    },
    no_sales: {
      label: 'Sem vendas',
      icon: Minus,
      className: 'text-muted-foreground',
    },
    insufficient_data: {
      label: 'Dados insuficientes',
      icon: HelpCircle,
      className: 'text-muted-foreground',
    },
  };

  const config = trendConfig[trend];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 ${config.className}`}>
            <Icon className="h-4 w-4" />
            <span className="text-xs">{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Tendência de vendas: {config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger' | 'success';
}

function KPICard({ title, value, subtitle, icon, variant = 'default' }: KPICardProps) {
  const variantStyles = {
    default: 'bg-card',
    warning: 'bg-yellow-50 border-yellow-200',
    danger: 'bg-red-50 border-red-200',
    success: 'bg-green-50 border-green-200',
  };

  return (
    <Card className={variantStyles[variant]}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="p-2 rounded-lg bg-primary/10">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SummarySectionProps {
  summary: InventorySummary;
}

function SummarySection({ summary }: SummarySectionProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <KPICard
        title="Repor Agora"
        value={summary.productsNeedingReorder}
        subtitle="produtos precisam reposição"
        icon={<AlertCircle className="h-5 w-5 text-orange-600" />}
        variant={summary.productsNeedingReorder > 0 ? 'warning' : 'default'}
      />
      <KPICard
        title="Esgotados"
        value={summary.productsOutOfStock}
        subtitle="produtos sem estoque"
        icon={<PackageX className="h-5 w-5 text-red-600" />}
        variant={summary.productsOutOfStock > 0 ? 'danger' : 'default'}
      />
      <KPICard
        title="Estoque Baixo"
        value={summary.productsLowStock}
        subtitle="produtos com estoque baixo"
        icon={<AlertTriangle className="h-5 w-5 text-yellow-600" />}
        variant={summary.productsLowStock > 0 ? 'warning' : 'default'}
      />
      <KPICard
        title="Valor Sugerido"
        value={formatCurrency(summary.totalSuggestedPurchaseValue)}
        subtitle="custo total de compra"
        icon={<ShoppingCart className="h-5 w-5 text-primary" />}
      />
      <KPICard
        title="Custo de Frete"
        value={formatCurrency(summary.totalFreightCost)}
        subtitle="frete total estimado"
        icon={<Truck className="h-5 w-5 text-primary" />}
      />
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface ResellerBreakdownProps {
  breakdown: ProductInventoryMetrics['resellerBreakdown'];
}

function ResellerBreakdown({ breakdown }: ResellerBreakdownProps) {
  if (breakdown.length === 0) {
    return (
      <div className="py-4 text-center text-muted-foreground text-sm">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhuma venda registrada para este produto</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="text-sm font-medium mb-3 flex items-center gap-2">
        <Users className="h-4 w-4" />
        Vendas por Revendedor
      </div>
      <div className="space-y-2">
        {breakdown.map((reseller) => (
          <div
            key={reseller.resellerId}
            className="flex items-center justify-between p-2 rounded-md bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-medium">
                  {reseller.resellerName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-sm">{reseller.resellerName}</p>
                <p className="text-xs text-muted-foreground">
                  {reseller.totalSold} vendido{reseller.totalSold !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium text-sm">{formatCurrency(reseller.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">
                {reseller.percentage.toFixed(1)}% do total
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ProductRowProps {
  product: ProductInventoryMetrics;
  onConfigure?: (product: ProductInventoryMetrics) => void;
}

function ProductRow({ product, onConfigure }: ProductRowProps) {
  const isCritical = product.status === 'out_of_stock' || product.status === 'reorder_now';

  return (
    <AccordionItem value={product.productId} className={isCritical ? 'bg-red-50/30' : ''}>
      <AccordionTrigger className="hover:no-underline px-4">
        <div className="flex items-center gap-4 w-full pr-4">
          <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0 text-left">
            <div className="font-medium truncate">{product.productName}</div>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={product.status} />
              <TrendIndicator trend={product.trend} />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center">
                    <p className="font-medium">{product.currentStock}</p>
                    <p className="text-xs text-muted-foreground">Estoque</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Estoque atual: {product.currentStock} unidades</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center">
                    <p className="font-medium">
                      {product.daysUntilStockout === 999 ? '∞' : product.daysUntilStockout}
                    </p>
                    <p className="text-xs text-muted-foreground">Dias p/ esgotar</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {product.daysUntilStockout === 999
                      ? 'Sem vendas recentes para calcular'
                      : `Estoque esgota em ${product.daysUntilStockout} dias`}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center">
                    <p className="font-medium">{product.suggestedPurchase}</p>
                    <p className="text-xs text-muted-foreground">Sugestão</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Compra sugerida: {product.suggestedPurchase} unidades</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="text-center min-w-[100px]">
              <p className="font-medium text-green-600">{formatCurrency(product.totalPurchaseCost)}</p>
              <p className="text-xs text-muted-foreground">Custo Total</p>
            </div>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Métricas de Estoque
              </div>
              {onConfigure && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onConfigure(product);
                        }}
                        className="px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-md flex items-center gap-1.5 transition-colors"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Configurar
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Configurar lead time, frete e fornecedor</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Média Diária</p>
                <p className="font-medium">{formatNumber(product.avgDailySales)} un/dia</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Média Semanal</p>
                <p className="font-medium">{formatNumber(product.avgWeeklySales)} un/sem</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Média Mensal</p>
                <p className="font-medium">{formatNumber(product.avgMonthlySales)} un/mês</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Lead Time</p>
                <p className="font-medium">{product.leadTimeDays} dias</p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Métrica</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="py-2">Estoque Atual</TableCell>
                  <TableCell className="py-2 text-right font-medium">{product.currentStock}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="py-2">Estoque de Segurança</TableCell>
                  <TableCell className="py-2 text-right font-medium">{product.safetyStock}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="py-2">Ponto de Reposição</TableCell>
                  <TableCell className="py-2 text-right font-medium">{product.reorderPoint}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="py-2">Estoque Recomendado</TableCell>
                  <TableCell className="py-2 text-right font-medium">{product.recommendedStock}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="py-2">Compra Sugerida</TableCell>
                  <TableCell className="py-2 text-right font-medium text-primary">
                    {product.suggestedPurchase} un
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="py-2">Frete por Unidade</TableCell>
                  <TableCell className="py-2 text-right font-medium">
                    {formatCurrency(product.freightCostPerUnit)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="py-2 font-medium">Custo Total de Compra</TableCell>
                  <TableCell className="py-2 text-right font-bold text-green-600">
                    {formatCurrency(product.totalPurchaseCost)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div>
            <ResellerBreakdown breakdown={product.resellerBreakdown} />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function ProductListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
              <div className="hidden md:flex gap-6">
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface StockForecastPanelProps {
  onConfigureProduct?: (product: any) => void;
}

export function StockForecastPanel({ onConfigureProduct }: StockForecastPanelProps) {
  const { metrics, summary, loading, error, refetch } = useInventoryForecasting();

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Erro ao carregar previsão de estoque</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <button
              onClick={() => refetch()}
              className="ml-auto px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Previsão de Estoque
              </CardTitle>
              <CardDescription>
                Análise de estoque e sugestões de reposição baseadas em vendas
              </CardDescription>
            </div>
            <button
              onClick={() => refetch()}
              disabled={loading}
              className="px-3 py-2 rounded-md border hover:bg-muted transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <SummarySkeleton /> : <SummarySection summary={summary} />}

          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-lg">Produtos ({metrics.length})</h3>
              {!loading && metrics.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{summary.productsHealthy} saudáveis</span>
                </div>
              )}
            </div>

            {loading ? (
              <ProductListSkeleton />
            ) : metrics.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Nenhum produto encontrado</p>
                <p className="text-sm">Cadastre produtos para ver a previsão de estoque</p>
              </div>
            ) : (
              <Accordion type="multiple" className="border rounded-lg">
                {metrics.map((product) => (
                  <ProductRow 
                    key={product.productId} 
                    product={product} 
                    onConfigure={onConfigureProduct ? (p) => onConfigureProduct({ 
                      id: p.productId, 
                      description: p.productName,
                      lead_time_days: p.leadTimeDays,
                      freight_cost_per_unit: p.freightCostPerUnit,
                      supplier_name: p.supplierName,
                      min_order_quantity: p.minOrderQuantity,
                      safety_stock_days: p.safetyStockDays,
                      review_period_days: p.reviewPeriodDays
                    }) : undefined}
                  />
                ))}
              </Accordion>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
