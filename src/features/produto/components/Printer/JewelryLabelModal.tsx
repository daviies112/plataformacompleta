import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/features/produto/components/ui/dialog";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { Label } from "@/features/produto/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/produto/components/ui/select";
import { Card, CardContent } from "@/features/produto/components/ui/card";
import { Printer, Tag, Settings2, Grid3X3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/features/produto/pages/ProdutoPage";

interface JewelryLabelModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedProducts: Product[];
}

export const JewelryLabelModal = ({ isOpen, onClose, selectedProducts: initialProducts }: JewelryLabelModalProps) => {
    const [labelModel, setLabelModel] = useState("90x12");
    const [startPosition, setStartPosition] = useState(1);
    const [products, setProducts] = useState(initialProducts.map(p => ({ ...p, copies: 1 })));
    const [showLogo, setShowLogo] = useState(true);

    const labelModels = [
        { id: "92MMX10MM", name: "Modelo fino (92MMx10MM)" },
        { id: "90MMX12MM", name: "Modelo fino (90MMx12MM)" },
        { id: "25MMx13MM", name: "Modelo retangular (25MMx13MM)" },
        { id: "25MMx10MMx2", name: "Retangular (25mm x 10mm x 2 colunas)" },
        { id: "25MMx15MMx2", name: "Retangular (25mm x 15mm x 2 colunas)" },
        { id: "26MMx14MM", name: "Retangular (26mm x 14mm)" },
        { id: "28MMx28MM", name: "Quadrada (28mm x 28mm)" },
        { id: "29MMx11MMx2", name: "Retangular (29mm x 11mm x 2 colunas)" },
        { id: "30MMx20MM", name: "Retangular (30mm x 20mm)" },
        { id: "33MMx21MM", name: "Retangular (33mm x 21mm)" },
        { id: "34MMx24MM", name: "Retangular (34mm x 24mm)" },
        { id: "35MMx60MM", name: "Gargantilha (35mm x 60mm)" },
        { id: "33MMx21MMEstilizada", name: "33mm x 21mm Estilizada" },
        { id: "37MMx14MM", name: "Retangular (37mm x 14mm)" },
        { id: "96_pimaco", name: "Pimaco 96 (A4)" },
        { id: "126_pimaco", name: "Pimaco 126 (A4)" },
        { id: "SLP_JEWEL", name: "SLP-JEWEL (Smart Label)" },
    ];

    const handleUpdateCopies = (id: string, delta: number) => {
        setProducts(prev => prev.map(p =>
            p.id === id ? { ...p, copies: Math.max(1, p.copies + delta) } : p
        ));
    };

    const handleRemoveProduct = (id: string) => {
        setProducts(prev => prev.filter(p => p.id !== id));
    };

    const handlePrint = () => {
        toast.success("Gerando fila de impressão...");
        // Aqui abriremos a rota de impressão com os dados
        localStorage.setItem('print_queue', JSON.stringify({
            model: labelModel,
            startPosition,
            showLogo,
            products
        }));
        window.open('/print-labels', '_blank');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Printer className="w-5 h-5 text-primary" />
                        Fila de Impressão - Joias
                    </DialogTitle>
                    <DialogDescription>
                        Configure os moldes e a posição inicial para impressão.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Coluna de Configuração */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label>Modelo da Etiqueta</Label>
                            <Select value={labelModel} onValueChange={setLabelModel}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o molde" />
                                </SelectTrigger>
                                <SelectContent>
                                    {labelModels.map(model => (
                                        <SelectItem key={model.id} value={model.id}>
                                            {model.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Grid3X3 className="w-4 h-4" />
                                Posição Inicial (Pular)
                            </Label>
                            <Input
                                type="number"
                                min={1}
                                value={startPosition}
                                onChange={(e) => setStartPosition(parseInt(e.target.value) || 1)}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Ex: Se a etiqueta 1 a 4 já foram usadas, mude para 5.
                            </p>
                        </div>

                        <Card className="bg-muted/50 border-dashed">
                            <CardContent className="pt-4 space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opções Visuais</h4>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Incluir Logotipo</span>
                                    <input
                                        type="checkbox"
                                        checked={showLogo}
                                        onChange={e => setShowLogo(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Coluna da Fila (Produtos) */}
                    <div className="md:col-span-2 space-y-4">
                        <h3 className="text-sm font-semibold flex items-center justify-between">
                            Produtos na Fila
                            <span className="text-xs font-normal text-muted-foreground">{products.length} itens</span>
                        </h3>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                            {products.map((product) => (
                                <div key={product.id} className="flex items-center gap-3 p-2 bg-card border rounded-lg hover:shadow-sm transition-shadow">
                                    <img src={product.image} className="w-10 h-10 rounded object-cover border" alt="" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate">{product.description}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono">{product.barcode} | {product.reference}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center border rounded overflow-hidden">
                                            <button
                                                onClick={() => handleUpdateCopies(product.id, -1)}
                                                className="px-2 py-1 bg-muted hover:bg-muted/80 text-xs">-</button>
                                            <span className="px-3 text-xs font-bold w-10 text-center">{product.copies}</span>
                                            <button
                                                onClick={() => handleUpdateCopies(product.id, 1)}
                                                className="px-2 py-1 bg-muted hover:bg-muted/80 text-xs">+</button>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                            onClick={() => handleRemoveProduct(product.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 border-t bg-muted/20">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handlePrint} className="gap-2 bg-green-600 hover:bg-green-700">
                        <Printer className="w-4 h-4" />
                        Adicionar à Fila de Impressão
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
