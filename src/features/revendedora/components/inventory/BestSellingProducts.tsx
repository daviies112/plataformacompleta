import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Package, Award } from 'lucide-react';

interface ProductWithSales {
  id: string;
  description: string | null;
  reference: string | null;
  image: string | null;
  category: string | null;
  price: number | null;
  stock: number | null;
  totalSold: number;
  totalRevenue: number;
}

interface BestSellingProductsProps {
  products: ProductWithSales[];
  loading?: boolean;
}

export function BestSellingProducts({ products, loading }: BestSellingProductsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Produtos Mais Vendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-md bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Produtos Mais Vendidos
          </CardTitle>
          <CardDescription>
            Acompanhe os produtos com melhor desempenho de vendas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma venda registrada ainda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Produtos Mais Vendidos
        </CardTitle>
        <CardDescription>
          Top {products.length} produtos com maior volume de vendas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.map((product, index) => (
            <div 
              key={product.id} 
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="relative">
                {index < 3 && (
                  <div className="absolute -top-1 -left-1 z-10">
                    <Award className={`h-5 w-5 ${
                      index === 0 ? 'text-yellow-500' : 
                      index === 1 ? 'text-gray-400' : 
                      'text-amber-700'
                    }`} />
                  </div>
                )}
                <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.description || 'Produto'} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {product.description || 'Sem descrição'}
                </div>
                {product.reference && (
                  <div className="text-sm text-muted-foreground">
                    Ref: {product.reference}
                  </div>
                )}
              </div>
              
              <div className="text-right space-y-1">
                <Badge variant="secondary" className="font-semibold">
                  {product.totalSold} vendido{product.totalSold !== 1 ? 's' : ''}
                </Badge>
                <div className="text-sm font-medium text-green-600">
                  {formatCurrency(product.totalRevenue)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
