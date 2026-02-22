import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tag, Loader2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TagData {
    name: string;
    count: number;
    products: any[]; // Simplified for display
}

export function AdminTags() {
    const [loading, setLoading] = useState(true);
    const [tagsData, setTagsData] = useState<TagData[]>([]);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    // Mock tenantID - in real app use auth hook
    const tenantId = "demo-tenant";

    useEffect(() => {
        fetchTagsAndProducts();
    }, []);

    async function fetchTagsAndProducts() {
        try {
            setLoading(true);
            // 1. Get all tags
            const tagsRes = await fetch(`/api/store/tags?tenantId=${tenantId}`);
            if (!tagsRes.ok) throw new Error("Failed to fetch tags");
            const tags = await tagsRes.json();

            // 2. Get all products (smarter: filter by tag in backend, but for now fetch all and filter client side or fetch per tag)
            // Ideally we should have an endpoint /api/store/products?tag=...
            // For now, let's just fetch all products and aggregate
            const productsRes = await fetch(`/api/store/products?tenantId=${tenantId}`);
            if (!productsRes.ok) throw new Error("Failed to fetch products");
            const products = await productsRes.json();

            // Aggregation
            const data: TagData[] = tags.map((tag: string) => {
                const tagProducts = products.filter((p: any) => p.tags && p.tags.includes(tag));
                return {
                    name: tag,
                    count: tagProducts.length,
                    products: tagProducts
                };
            });

            setTagsData(data);
        } catch (error) {
            console.error("Error loading tags:", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Etiquetas</h1>
                <p className="text-muted-foreground">Gerencie as etiquetas do sistema</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Lista de Etiquetas */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Tag className="h-5 w-5 text-primary" />
                            <CardTitle>Etiquetas Existentes ({tagsData.length})</CardTitle>
                        </div>
                        <CardDescription>
                            Selecione para ver os produtos listados.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {loading ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                        ) : tagsData.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhuma etiqueta encontrada.</p>
                        ) : (
                            tagsData.map(tag => (
                                <div
                                    key={tag.name}
                                    onClick={() => setSelectedTag(tag.name)}
                                    className={`flex items-center justify-between p-3 rounded-md cursor-pointer border transition-colors ${selectedTag === tag.name ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{tag.name}</Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{tag.count} produtos</span>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Detalhes da Etiqueta / Lista de Produtos */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary" />
                            <CardTitle>
                                {selectedTag ? `Produtos com etiqueta "${selectedTag}"` : "Selecione uma etiqueta"}
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {selectedTag ? (
                            <div className="space-y-4">
                                {tagsData.find(t => t.name === selectedTag)?.products.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Nenhum produto com esta etiqueta.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {tagsData.find(t => t.name === selectedTag)?.products.map(product => (
                                            <div key={product.id} className="border rounded-lg p-3 flex flex-col gap-2">
                                                <div className="aspect-square bg-muted rounded-md overflow-hidden relative">
                                                    {product.image_url ? (
                                                        <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Sem foto</div>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-medium text-sm truncate" title={product.name}>{product.name}</p>
                                                    <p className="text-xs text-muted-foreground">{product.price ? `R$ ${product.price.toFixed(2)}` : 'Preço não definido'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                <Tag className="h-12 w-12 mb-4 opacity-20" />
                                <p>Selecione uma etiqueta ao lado para visualizar os produtos vinculados a ela.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
