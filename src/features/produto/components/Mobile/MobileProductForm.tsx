import { useState } from "react";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { Label } from "@/features/produto/components/ui/label";
import { Textarea } from "@/features/produto/components/ui/textarea";
import { MobileImageUpload } from "@/features/produto/components/ui/mobile-image-upload";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/pages/Index";

interface MobileProductFormProps {
  onBack: () => void;
  onSave: (product: Omit<Product, "createdAt"> | Product) => void;
  initialData?: Product | null;
}

export const MobileProductForm = ({ onBack, onSave, initialData }: MobileProductFormProps) => {
  const [formData, setFormData] = useState({
    description: "",
    barcode: String(Math.floor(Math.random() * 10000000000000)),
    category: "",
    subcategory: "",
    size: "",
    color: "",
    reference: "",
    stock: 0,
    price: "R$ 0,00",
    image: "",
  });

  const handleSave = () => {
    if (!formData.description || !formData.category) {
      toast.error("Preencha os campos obrigatórios!");
      return;
    }

    onSave({
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
    });

    toast.success("Produto salvo com sucesso!");
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-full"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Novo Produto</h1>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Image Upload */}
        <MobileImageUpload
          value={formData.image}
          onChange={(base64) => setFormData({ ...formData, image: base64 })}
          onRemove={() => setFormData({ ...formData, image: "" })}
        />

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="description" className="text-sm font-medium mb-2 block">
              Descrição <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Ex: Brinco com Zircônia"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[80px] resize-none"
              data-testid="input-description"
            />
          </div>

          <div>
            <Label htmlFor="barcode" className="text-sm font-medium mb-2 block">
              Código de Barras
            </Label>
            <Input
              id="barcode"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              className="font-mono"
              data-testid="input-barcode"
            />
          </div>

          <div>
            <Label htmlFor="category" className="text-sm font-medium mb-2 block">
              Categoria <span className="text-red-500">*</span>
            </Label>
            <Input
              id="category"
              placeholder="Ex: Brinco, Anel, Colar..."
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              data-testid="input-category"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="price" className="text-sm font-medium mb-2 block">
                Preço
              </Label>
              <Input
                id="price"
                placeholder="R$ 0,00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                data-testid="input-price"
              />
            </div>

            <div>
              <Label htmlFor="stock" className="text-sm font-medium mb-2 block">
                Estoque
              </Label>
              <Input
                id="stock"
                type="number"
                placeholder="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                data-testid="input-stock"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="color" className="text-sm font-medium mb-2 block">
              Cor
            </Label>
            <Input
              id="color"
              placeholder="Ex: Dourado, Prateado..."
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              data-testid="input-color"
            />
          </div>

          <div>
            <Label htmlFor="reference" className="text-sm font-medium mb-2 block">
              Referência
            </Label>
            <Input
              id="reference"
              placeholder="Código de referência"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              data-testid="input-reference"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 space-y-2">
        <Button
          onClick={handleSave}
          className="w-full h-12 text-base font-medium"
          size="lg"
          data-testid="button-save"
        >
          Salvar Produto
        </Button>
        <Button
          variant="outline"
          onClick={onBack}
          className="w-full h-12 text-base"
          size="lg"
          data-testid="button-cancel"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
};
