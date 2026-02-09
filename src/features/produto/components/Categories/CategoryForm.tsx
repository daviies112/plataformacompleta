import { useState, useEffect } from "react";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { Label } from "@/features/produto/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/produto/components/ui/select";
import { Checkbox } from "@/features/produto/components/ui/checkbox";
import { toast } from "sonner";
import type { Category } from "@/pages/Index";

interface CategoryFormProps {
  onBack: () => void;
  onSave: (category: Omit<Category, "id"> | Category) => void;
  initialData?: Category | null;
}

export const CategoryForm = ({ onBack, onSave, initialData }: CategoryFormProps) => {
  const [formData, setFormData] = useState({
    nome: initialData?.nome || "",
    etiqueta: initialData?.etiqueta || "",
    etiquetaCustomizada: initialData?.etiquetaCustomizada || "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        nome: initialData.nome,
        etiqueta: initialData.etiqueta,
        etiquetaCustomizada: initialData.etiquetaCustomizada,
      });
    }
  }, [initialData]);

  const handleSave = () => {
    if (!formData.nome || !formData.etiqueta) {
      toast.error("Preencha os campos obrigatórios!");
      return;
    }

    if (initialData) {
      onSave({
        ...formData,
        id: initialData.id,
        produtosVinculados: initialData.produtosVinculados,
      });
    } else {
      onSave({
        ...formData,
        produtosVinculados: 0,
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            {initialData ? "Editar Categoria" : "Nova Categoria"}
          </h2>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="nome">
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="tipo-etiqueta">
                Tipo de Etiqueta <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.etiqueta} onValueChange={(value) => setFormData({ ...formData, etiqueta: value })}>
                <SelectTrigger id="tipo-etiqueta">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="01 - Modelo fino (92MMx10MM)">01 - Modelo fino (92MMx10MM)</SelectItem>
                  <SelectItem value="02 - Modelo fino (90MMx12MM)">02 - Modelo fino (90MMx12MM)</SelectItem>
                  <SelectItem value="03 - Modelo médio (60MMx15MM)">03 - Modelo médio (60MMx15MM)</SelectItem>
                  <SelectItem value="04 - Modelo retangular (25MMx13MM)">04 - Modelo retangular (25MMx13MM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="etiqueta-customizada">Etiqueta Customizada</Label>
              <Select value={formData.etiquetaCustomizada} onValueChange={(value) => setFormData({ ...formData, etiquetaCustomizada: value })}>
                <SelectTrigger id="etiqueta-customizada">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100x12">100x12</SelectItem>
                  <SelectItem value="25x15">25x15</SelectItem>
                  <SelectItem value="60x15">60x15</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="largura">Largura (cm)</Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="largura" 
                  type="number" 
                  step="0.01" 
                  defaultValue="0.00"
                  className="text-right"
                />
                <span className="text-muted-foreground">cm</span>
              </div>
            </div>
            <div>
              <Label htmlFor="altura">Altura (cm)</Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="altura" 
                  type="number" 
                  step="0.01" 
                  defaultValue="0.00"
                  className="text-right"
                />
                <span className="text-muted-foreground">cm</span>
              </div>
            </div>
            <div>
              <Label htmlFor="profundidade">Profundidade (cm)</Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="profundidade" 
                  type="number" 
                  step="0.01" 
                  defaultValue="0.00"
                  className="text-right"
                />
                <span className="text-muted-foreground">cm</span>
              </div>
            </div>
            <div>
              <Label htmlFor="peso">Peso (g)</Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="peso" 
                  type="number" 
                  step="0.01" 
                  defaultValue="0.00"
                  className="text-right"
                />
                <span className="text-muted-foreground">g</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="custo-insumos">Custo de Insumos</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">R$</span>
                <Input 
                  id="custo-insumos" 
                  type="number" 
                  step="0.01" 
                  defaultValue="0.00"
                  className="text-right"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="estoque-minimo">Estoque Mínimo</Label>
              <Input 
                id="estoque-minimo" 
                type="number" 
                defaultValue="0"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="sobrescrever" />
              <Label 
                htmlFor="sobrescrever" 
                className="text-sm font-normal cursor-pointer"
              >
                Sobrescrever Subcategorias
              </Label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox id="atualizar-custos" />
              <Label 
                htmlFor="atualizar-custos" 
                className="text-sm font-normal cursor-pointer leading-relaxed"
              >
                Atualizar custos de banho e preços diariamente (Requer ativação do cálculo detalhado nos produtos)
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onBack}>
              Voltar
            </Button>
            <Button onClick={handleSave}>
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
