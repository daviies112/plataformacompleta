import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/revendedora/components/ui/card';
import { Button } from '@/features/revendedora/components/ui/button';
import { Input } from '@/features/revendedora/components/ui/input';
import { Badge } from '@/features/revendedora/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/revendedora/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/features/revendedora/components/ui/dialog';
import { Package, Plus, X, Search, ShoppingCart, ArrowRight, DollarSign } from 'lucide-react';
import { SellProductModal } from '@/features/revendedora/components/modals/SellProductModal';

interface StoreProductsTabProps {
    allProducts: any[];
    storeProducts: any[];
    onAddProduct: (product: any) => void;
    onRemoveProduct: (productId: string) => void;
    onViewProduct?: (product: any) => void;
    resellerId: string | null;
}

export function StoreProductsTab({
    allProducts,
    storeProducts,
    onAddProduct,
    onRemoveProduct,
    onViewProduct,
    resellerId
}: StoreProductsTabProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [viewingProduct, setViewingProduct] = useState<any>(null);
    const [draggedProduct, setDraggedProduct] = useState<any>(null);
    const [sellingProduct, setSellingProduct] = useState<any>(null);

    const categories = useMemo(() => {
        const uniqueCategories = new Set(
            allProducts
                .map(p => p.category)
                .filter(c => c && c.trim() !== '')
        );
        return Array.from(uniqueCategories).sort();
    }, [allProducts]);

    const filteredProducts = useMemo(() => {
        return allProducts.filter(product => {
            const matchesSearch = !searchTerm ||
                product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.reference?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCategory = selectedCategory === 'all' ||
                product.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [allProducts, searchTerm, selectedCategory]);

    const storeProductsByCategory = useMemo(() => {
        const grouped: { [key: string]: any[] } = {};

        storeProducts.forEach(product => {
            const category = product.category || 'Sem Categoria';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(product);
        });

        return grouped;
    }, [storeProducts]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const handleDragStart = (product: any) => {
        setDraggedProduct(product);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedProduct) {
            onAddProduct(draggedProduct);
            setDraggedProduct(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
                {/* Available Products */}
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Produtos Disponíveis
                        </CardTitle>
                        <CardDescription>
                            Clique ou arraste para adicionar à sua loja
                        </CardDescription>
                        <div className="flex gap-2 mt-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {categories.map(category => (
                                        <SelectItem key={category} value={category}>
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto max-h-[500px] p-2">
                        {filteredProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                <Package className="h-12 w-12 mb-2" />
                                <p>Nenhum produto encontrado</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        draggable
                                        onDragStart={() => handleDragStart(product)}
                                        onClick={() => setViewingProduct(product)}
                                        className="flex items-center gap-3 p-2 border rounded-lg hover:border-primary hover:shadow-sm transition-all cursor-pointer bg-card text-sm"
                                    >
                                        <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
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
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium truncate">{product.description || 'Sem descrição'}</h4>
                                            <p className="font-semibold text-primary">
                                                {product.price ? formatCurrency(product.price) : '-'}
                                            </p>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAddProduct(product);
                                            }}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Selected Products (Store) */}
                <Card className="h-full flex flex-col border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            Minha Loja
                        </CardTitle>
                        <CardDescription>
                            {storeProducts.length} produtos selecionados
                        </CardDescription>
                    </CardHeader>
                    <CardContent
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className="flex-1 overflow-y-auto max-h-[500px] p-2 bg-muted/10 rounded-b-lg"
                    >
                        {storeProducts.length === 0 ? (
                            <div
                                className="flex flex-col items-center justify-center h-full min-h-[200px] border-2 border-dashed border-muted-foreground/25 rounded-lg"
                            >
                                <ArrowRight className="h-10 w-10 text-muted-foreground mb-4 rotate-180 md:rotate-0" />
                                <p className="text-muted-foreground text-center px-4">
                                    Arraste produtos ou clique em + para adicionar
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(storeProductsByCategory).map(([category, products]) => (
                                    <div key={category} className="space-y-2">
                                        <div className="flex items-center gap-2 pb-1 border-b">
                                            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">{category}</h3>
                                            <Badge variant="secondary" className="text-[10px] h-4">{products.length}</Badge>
                                        </div>
                                        {products.map((product) => (
                                            <div
                                                key={product.id}
                                                className="flex items-center gap-3 p-2 border rounded-lg bg-background border-primary/10 hover:border-destructive/30 transition-colors group"
                                            >
                                                <div className="h-10 w-10 rounded bg-muted overflow-hidden">
                                                    {product.image && (
                                                        <img src={product.image} className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium text-sm truncate">{product.description}</h4>
                                                    <p className="text-xs text-muted-foreground">{formatCurrency(product.price || 0)}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-muted-foreground hover:text-green-600 hover:bg-green-50"
                                                        onClick={() => setSellingProduct(product)}
                                                        title="Vender Rápido"
                                                        disabled={!resellerId}
                                                    >
                                                        <DollarSign className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => onRemoveProduct(product.id)}
                                                        title="Remover da Loja"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={!!viewingProduct} onOpenChange={(open) => !open && setViewingProduct(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{viewingProduct?.description}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="relative w-full h-[300px] rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                            {viewingProduct?.image ? (
                                <img
                                    src={viewingProduct.image}
                                    alt={viewingProduct.description}
                                    className="w-full h-full object-contain"
                                    style={{ maxHeight: '100%' }}
                                />
                            ) : (
                                <Package className="h-24 w-24 text-muted-foreground" />
                            )}
                        </div>
                        <div>
                            <p className="font-bold text-2xl text-primary">
                                {viewingProduct?.price ? formatCurrency(viewingProduct.price) : '-'}
                            </p>
                            {viewingProduct?.reference && (
                                <p className="text-sm text-muted-foreground">Ref: {viewingProduct.reference}</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <DialogClose asChild>
                                <Button variant="outline" className="flex-1">Fechar</Button>
                            </DialogClose>
                            <Button
                                className="flex-1"
                                onClick={() => {
                                    if (viewingProduct) {
                                        onAddProduct(viewingProduct);
                                        setViewingProduct(null);
                                    }
                                }}
                            >
                                Adicionar à Loja
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {resellerId && sellingProduct && (
                <SellProductModal
                    product={sellingProduct}
                    isOpen={!!sellingProduct}
                    onClose={() => setSellingProduct(null)}
                    resellerId={resellerId}
                    companyId={sellingProduct.company_id || ''}
                />
            )}
        </div>
    );
}
