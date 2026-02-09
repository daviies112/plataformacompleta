import { useState, useEffect } from "react";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { Label } from "@/features/produto/components/ui/label";
import { Textarea } from "@/features/produto/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/produto/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/features/produto/components/ui/tabs";
import { Card } from "@/features/produto/components/ui/card";
import { Switch } from "@/features/produto/components/ui/switch";
import { ImageUpload } from "@/features/produto/components/ui/image-upload";
import { toast } from "sonner";
import type { Product } from "@/pages/Index";

interface ProductFormProps {
  onBack: () => void;
  onSave: (product: Omit<Product, "createdAt"> | Product) => void;
  initialData?: Product | null;
}

export const ProductForm = ({ onBack, onSave, initialData }: ProductFormProps) => {
  const [activeTab, setActiveTab] = useState("dados");
  const [formData, setFormData] = useState({
    description: initialData?.description || "",
    barcode: initialData?.barcode || String(Math.floor(Math.random() * 10000000000000)),
    category: initialData?.category || "",
    subcategory: initialData?.subcategory || "",
    size: initialData?.number || "",
    color: initialData?.color || "",
    reference: initialData?.reference || "",
    stock: initialData?.stock || 0,
    price: initialData?.price || "R$ 0,00",
    image: initialData?.image || "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        description: initialData.description,
        barcode: initialData.barcode,
        category: initialData.category,
        subcategory: initialData.subcategory,
        size: initialData.number,
        color: initialData.color,
        reference: initialData.reference,
        stock: initialData.stock,
        price: initialData.price,
        image: initialData.image,
      });
    }
  }, [initialData]);

  const handleSave = () => {
    if (!formData.description || !formData.category) {
      toast.error("Preencha os campos obrigatórios!");
      return;
    }

    const productData = {
      image: formData.image,
      barcode: formData.barcode,
      reference: formData.reference,
      description: formData.description,
      number: formData.size,
      color: formData.color,
      category: formData.category,
      subcategory: formData.subcategory,
      price: formData.price,
      stock: formData.stock,
    };

    if (initialData) {
      onSave({
        ...productData,
        id: initialData.id,
        createdAt: initialData.createdAt,
      });
    } else {
      onSave(productData);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            {initialData ? "Editar Produto" : "Novo Produto"}
          </h2>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="dados">DADOS</TabsTrigger>
            <TabsTrigger value="estoque">ESTOQUE</TabsTrigger>
            <TabsTrigger value="valores">VALORES</TabsTrigger>
          </TabsList>

          {/* DADOS Tab */}
          <TabsContent value="dados" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="p-4">
                <h3 className="font-medium mb-4 text-center">Foto do Produto</h3>
                <ImageUpload
                  value={formData.image}
                  onChange={(base64) => setFormData({ ...formData, image: base64 })}
                  onRemove={() => setFormData({ ...formData, image: "" })}
                />
              </Card>

              <div className="lg:col-span-2 space-y-4">
                <div>
                  <Label htmlFor="description">Descrição *</Label>
                  <Input
                    id="description"
                    placeholder="Digite a descrição do produto"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="barcode-type">Tipo de inserção de código de barras *</Label>
                    <Select defaultValue="automatico">
                      <SelectTrigger id="barcode-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="automatico">Automático</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="barcode">Código de Barras</Label>
                    <Input id="barcode" placeholder="Código gerado automaticamente" disabled />
                  </div>
                  <div>
                    <Label htmlFor="category">Categoria *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRINCO">Brinco</SelectItem>
                        <SelectItem value="COLAR">Colar</SelectItem>
                        <SelectItem value="ANEL">Anel</SelectItem>
                        <SelectItem value="PULSEIRA">Pulseira</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="subcategory">Subcategoria</Label>
                    <Select>
                      <SelectTrigger id="subcategory">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="argola">Argola</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="size">Tamanho</Label>
                    <Input id="size" />
                  </div>
                  <div>
                    <Label htmlFor="color">Cor</Label>
                    <div className="flex gap-2">
                      <Input id="color" className="flex-1" />
                      <div className="w-10 h-10 rounded border bg-white cursor-pointer" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium">Fornecedor</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="supplier">Fornecedor *</Label>
                      <Select>
                        <SelectTrigger id="supplier">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fornecedor1">Fornecedor 1</SelectItem>
                          <SelectItem value="fornecedor2">Fornecedor 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="supplier-code">Código de barras do Fornecedor</Label>
                      <Input id="supplier-code" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium">Outros</h3>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select defaultValue="ativo">
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="observation">Observação</Label>
                    <Textarea id="observation" rows={4} />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={onBack}>
                    Voltar
                  </Button>
                  <Button onClick={() => setActiveTab("estoque")} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Continuar
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ESTOQUE Tab */}
          <TabsContent value="estoque" className="space-y-6">
            <Card className="p-6">
              <h3 className="font-medium mb-4">Quantidades do Produto</h3>
                <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="min-stock">Estoque Mínimo</Label>
                  <Input id="min-stock" type="number" defaultValue="0" />
                </div>
                <div>
                  <Label htmlFor="max-stock">Estoque Máximo</Label>
                  <Input id="max-stock" type="number" defaultValue="0" />
                </div>
                <div>
                  <Label htmlFor="location">Localização</Label>
                  <Input id="location" />
                </div>
              </div>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActiveTab("dados")}>
                Voltar
              </Button>
              <Button onClick={() => setActiveTab("valores")} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Continuar
              </Button>
            </div>
          </TabsContent>

          {/* VALORES Tab */}
          <TabsContent value="valores" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Switch id="detailed-calc" />
                <Label htmlFor="detailed-calc">Ativar cálculo detalhado</Label>
              </div>

              <h3 className="font-medium mb-4">Custos</h3>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <Label htmlFor="cost-price">R$ Custo de compra bruto</Label>
                  <Input id="cost-price" defaultValue="R$ 0,00" />
                </div>
                <div>
                  <Label htmlFor="supplies-cost">R$ Custo de Insumos</Label>
                  <Input id="supplies-cost" defaultValue="R$ 0,00" />
                </div>
                <div>
                  <Label htmlFor="gold-bath">R$ Banho de Ouro</Label>
                  <Input id="gold-bath" defaultValue="R$ 0,00" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <Label htmlFor="silver-bath">R$ Banho de Prata</Label>
                  <Input id="silver-bath" defaultValue="R$ 0,00" />
                </div>
                <div>
                  <Label htmlFor="rhodium-bath">R$ Banho de Ródio</Label>
                  <Input id="rhodium-bath" defaultValue="R$ 0,00" />
                </div>
                <div>
                  <Label htmlFor="varnish-bath">R$ Banho de Verniz</Label>
                  <Input id="varnish-bath" defaultValue="R$ 0,00" />
                </div>
              </div>

              <div className="bg-muted p-4 rounded mb-6">
                <p className="text-sm">Bruto + Insumos + Banho</p>
                <p className="text-2xl font-bold">R$ 0,00</p>
              </div>

              <h3 className="font-medium mb-4">Preços</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="profit">Lucro Atacado *</Label>
                  <Input id="profit" defaultValue="% 0,00" />
                </div>
                <div>
                  <Label htmlFor="wholesale-price">Valor Atacado *</Label>
                  <Input id="wholesale-price" defaultValue="R$ 0,00" />
                </div>
              </div>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActiveTab("estoque")}>
                Voltar
              </Button>
              <Button onClick={handleSave}>
                Salvar
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
