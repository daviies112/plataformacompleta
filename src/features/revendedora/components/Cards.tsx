// ============================================
// CONSOLIDATED CARDS COMPONENTS
// All card components in one file to reduce file count
// ============================================

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  LucideIcon, 
  Calendar, 
  User, 
  DollarSign, 
  Package, 
  ShoppingCart,
  Users,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { cn } from '@/lib/utils';

// ============================================
// STAT CARD
// ============================================

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, description, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-2 mt-2">
            <span
              className={cn(
                'text-xs font-medium',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">vs. mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// ORDER CARD
// ============================================

interface OrderCardProps {
  order: {
    id: string;
    order_number: string;
    created_at: string;
    status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
    payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
    total_amount: number;
    customer_name?: string;
    items_count?: number;
  };
  onClick?: () => void;
}

const statusLabels = {
  pending: 'Pendente',
  paid: 'Pago',
  processing: 'Processando',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado'
};

const statusColors = {
  pending: 'secondary',
  paid: 'default',
  processing: 'default',
  shipped: 'default',
  delivered: 'default',
  cancelled: 'destructive',
  refunded: 'outline'
} as const;

const paymentStatusLabels = {
  pending: 'Pendente',
  paid: 'Pago',
  failed: 'Falhou',
  refunded: 'Reembolsado'
};

const paymentStatusColors = {
  pending: 'secondary',
  paid: 'default',
  failed: 'destructive',
  refunded: 'outline'
} as const;

export function OrderCard({ order, onClick }: OrderCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">#{order.order_number}</h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(order.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge variant={statusColors[order.status]}>
              {statusLabels[order.status]}
            </Badge>
            <Badge variant={paymentStatusColors[order.payment_status]}>
              {paymentStatusLabels[order.payment_status]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {order.customer_name && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="font-medium">{order.customer_name}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Valor Total</p>
              <p className="font-semibold text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
              </p>
            </div>
          </div>
          {order.items_count && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Itens</p>
                <p className="font-medium">{order.items_count} produto{order.items_count !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// PRODUCT CARD
// ============================================

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    images?: string[];
    short_description?: string;
    stock_quantity: number;
    is_active: boolean;
  };
  onAddToCart?: (productId: string) => void;
  onClick?: () => void;
  showActions?: boolean;
}

export function ProductCard({ product, onAddToCart, onClick, showActions = true }: ProductCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="p-0">
        <div 
          className="relative aspect-square bg-muted cursor-pointer"
          onClick={onClick}
        >
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Package className="h-20 w-20 text-muted-foreground" />
            </div>
          )}
          {!product.is_active && (
            <Badge className="absolute top-2 right-2" variant="secondary">
              Inativo
            </Badge>
          )}
          {product.stock_quantity === 0 && (
            <Badge className="absolute top-2 left-2" variant="destructive">
              Esgotado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <h3 
          className="font-semibold text-lg line-clamp-2 cursor-pointer hover:text-primary"
          onClick={onClick}
        >
          {product.name}
        </h3>
        {product.short_description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {product.short_description}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2">SKU: {product.sku}</p>
        <div className="flex items-center justify-between mt-3">
          <p className="text-2xl font-bold text-primary">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
          </p>
          <Badge variant={product.stock_quantity > 0 ? 'default' : 'secondary'}>
            {product.stock_quantity} un.
          </Badge>
        </div>
      </CardContent>
      {showActions && (
        <CardFooter className="p-4 pt-0">
          <Button
            className="w-full"
            onClick={() => onAddToCart?.(product.id)}
            disabled={product.stock_quantity === 0 || !product.is_active}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Adicionar ao Carrinho
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

// ============================================
// RESELLER CARD
// ============================================

interface ResellerCardProps {
  reseller: {
    id: string;
    full_name: string;
    store_name: string;
    store_logo_url?: string;
    email: string;
    status: 'active' | 'inactive' | 'pending' | 'blocked';
    level: number;
    total_sales: number;
    commission_percentage: number;
    created_at: string;
  };
  onClick?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'inactive':
      return 'outline';
    case 'blocked':
      return 'destructive';
    default:
      return 'secondary';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return 'Ativo';
    case 'pending':
      return 'Pendente';
    case 'inactive':
      return 'Inativo';
    case 'blocked':
      return 'Bloqueado';
    default:
      return status;
  }
};

export function ResellerCard({ reseller, onClick }: ResellerCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
        <Avatar className="h-12 w-12">
          <AvatarImage src={reseller.store_logo_url} alt={reseller.full_name} />
          <AvatarFallback>{reseller.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">{reseller.full_name}</h3>
            <Badge variant={getStatusColor(reseller.status)}>
              {getStatusLabel(reseller.status)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{reseller.store_name}</p>
          <p className="text-xs text-muted-foreground">{reseller.email}</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Nível</p>
              <p className="font-semibold">{reseller.level}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Comissão</p>
              <p className="font-semibold">{reseller.commission_percentage}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total Vendas</p>
              <p className="font-semibold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reseller.total_sales)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}