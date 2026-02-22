import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/revendedora/components/ui/card';
import { Button } from '@/features/revendedora/components/ui/button';
import { Input } from '@/features/revendedora/components/ui/input';
import { Badge } from '@/features/revendedora/components/ui/badge';
import { Package, Search, Truck, AlertTriangle } from 'lucide-react';
import { ProductRequestModal } from '@/features/revendedora/components/modals/ProductRequestModal';

interface StoreInventoryTabProps {
    products: any[];
    resellerId: string | null;
}

export function StoreInventoryTab({ products, resellerId }: StoreInventoryTabProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [requestingProduct, setRequestingProduct] = useState<any>(null);

    const filteredProducts = useMemo(() => {
        return products.filter(product =>
            !searchTerm ||
            product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.reference?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Estoque & Reposição</h2>
                    <p className="text-muted-foreground">
                        Visualize o estoque disponível na matriz e solicite reposição
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Disponibilidade na Matriz
                    </CardTitle>
                    <div className="flex gap-2 mt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar produtos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredProducts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Nenhum produto encontrado.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredProducts.map((product) => (
                                <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-muted rounded overflow-hidden">
                                            {product.image ? (
                                                <img src={product.image} alt={product.description} className="h-full w-full object-cover" />
                                            ) : (
                                                <Package className="h-full w-full p-2 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{product.description}</p>
                                            <p className="text-xs text-muted-foreground">Ref: {product.reference || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Badge variant={product.stock > 0 ? "default" : "secondary"}>
                                            {product.stock > 0 ? `${product.stock} un` : "Indisponível"}
                                        </Badge>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setRequestingProduct(product)}
                                            disabled={!resellerId}
                                        >
                                            <Truck className="h-4 w-4 mr-2" />
                                            Solicitar
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-amber-500/10 border-amber-500/20">
                <CardContent className="pt-6">
                    <div className="flex gap-4 items-start">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-amber-800">Sobre o Estoque</h4>
                            <p className="text-sm text-amber-700/80 mt-1">
                                A disponibilidade exibida aqui é da matriz. Ao solicitar produtos, eles serão reservados para você e aparecerão na aba "Minha Loja" após a confirmação.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {resellerId && (
                <ProductRequestModal
                    product={requestingProduct}
                    isOpen={!!requestingProduct}
                    onClose={() => setRequestingProduct(null)}
                    resellerId={resellerId}
                />
            )}
        </div>
    );
}
