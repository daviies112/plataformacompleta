import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Share2, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useResellerAuth } from '../hooks/useResellerAuth';

export default function Catalog() {
  const { user } = useResellerAuth();
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['/api/reseller/products'],
    enabled: !!user
  });

  const products = data?.products || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const copyShareLink = (productId: string) => {
    const link = `${window.location.origin}/loja/${user?.id}?produto=${productId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(productId);
    toast({
      title: 'Link copiado!',
      description: 'Compartilhe com seus clientes'
    });
    setTimeout(() => setCopiedId(null), 2000);
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
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-catalog-title">
          Catalogo de Produtos
        </h1>
        <p className="text-muted-foreground">
          Produtos disponiveis para venda
        </p>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum produto disponivel</h3>
            <p className="text-sm text-muted-foreground">
              A empresa ainda nao cadastrou produtos no catalogo
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product: any) => (
            <Card key={product.id} className="overflow-hidden">
              {product.image_url && (
                <div className="aspect-video bg-muted">
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  {product.category && (
                    <Badge variant="secondary">{product.category}</Badge>
                  )}
                </div>
                <CardDescription className="line-clamp-2">
                  {product.description || 'Sem descricao'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(product.price || 0)}
                    </div>
                    <div className="text-sm text-green-600">
                      Comissao: {formatCurrency((product.price || 0) * (user?.comissao || 20) / 100)}
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="w-full"
                  variant="outline"
                  onClick={() => copyShareLink(product.id)}
                  data-testid={`button-share-${product.id}`}
                >
                  {copiedId === product.id ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 mr-2" />
                      Compartilhar
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
