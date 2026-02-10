import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Package, XCircle, Bell } from 'lucide-react';

interface LowStockProduct {
  id: string;
  description: string | null;
  reference: string | null;
  image: string | null;
  stock: number | null;
  low_stock_threshold: number | null;
  isOutOfStock: boolean;
  isCritical: boolean;
}

interface LowStockAlertProps {
  products: LowStockProduct[];
  loading?: boolean;
  compact?: boolean;
}

export function LowStockAlert({ products, loading, compact = false }: LowStockAlertProps) {
  if (loading) {
    return (
      <Card className="border-orange-200 bg-orange-50/50">
        <CardContent className="pt-6">
          <div className="animate-pulse flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-orange-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 bg-orange-200 rounded" />
              <div className="h-3 w-3/4 bg-orange-200 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return null;
  }

  const outOfStock = products.filter(p => p.isOutOfStock);
  const lowStock = products.filter(p => p.isCritical);

  if (compact) {
    return (
      <Alert variant={outOfStock.length > 0 ? "destructive" : "default"} className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          Alerta de Estoque
          <Badge variant={outOfStock.length > 0 ? "destructive" : "secondary"}>
            {products.length} produto{products.length !== 1 ? 's' : ''}
          </Badge>
        </AlertTitle>
        <AlertDescription>
          {outOfStock.length > 0 && (
            <span className="text-destructive font-medium">
              {outOfStock.length} esgotado{outOfStock.length !== 1 ? 's' : ''}
            </span>
          )}
          {outOfStock.length > 0 && lowStock.length > 0 && ' | '}
          {lowStock.length > 0 && (
            <span className="text-orange-600 font-medium">
              {lowStock.length} com estoque baixo
            </span>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <Bell className="h-5 w-5" />
          Alertas de Estoque
        </CardTitle>
        <CardDescription className="text-orange-600">
          {products.length} produto{products.length !== 1 ? 's' : ''} precisam de atenção
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {products.map(product => (
            <div 
              key={product.id} 
              className={`flex items-center gap-4 p-3 rounded-lg ${
                product.isOutOfStock ? 'bg-red-100/80' : 'bg-orange-100/80'
              }`}
            >
              <div className="h-10 w-10 rounded-md bg-white flex items-center justify-center overflow-hidden">
                {product.image ? (
                  <img 
                    src={product.image} 
                    alt={product.description || 'Produto'} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-sm">
                  {product.description || 'Sem descrição'}
                </div>
                {product.reference && (
                  <div className="text-xs text-muted-foreground">
                    Ref: {product.reference}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {product.isOutOfStock ? (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Esgotado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-orange-200 text-orange-800 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {product.stock} un.
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
