import { useState } from "react";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { Label } from "@/features/produto/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@/pages/Index";

interface MobileCategoryFormProps {
  onBack: () => void;
  onSave: (category: Omit<Category, "id"> | Category) => void;
  initialData?: Category | null;
}

export const MobileCategoryForm = ({ onBack, onSave, initialData }: MobileCategoryFormProps) => {
  const [formData, setFormData] = useState({
    nome: "",
    etiqueta: "01 - Modelo fino (92MMx10MM)",
    etiquetaCustomizada: "100x12",
    produtosVinculados: 0,
  });

  const handleSave = () => {
    if (!formData.nome) {
      toast.error("Preencha o nome da categoria!");
      return;
    }

    onSave(formData);
    toast.success("Categoria salva com sucesso!");
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
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Nova Categoria</h1>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="nome" className="text-sm font-medium mb-2 block">
              Nome da Categoria <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nome"
              placeholder="Ex: ANEL, BRINCO, COLAR..."
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
              data-testid="input-nome"
            />
          </div>

          <div>
            <Label htmlFor="etiqueta" className="text-sm font-medium mb-2 block">
              Tipo de Etiqueta
            </Label>
            <Input
              id="etiqueta"
              placeholder="Ex: 01 - Modelo fino (92MMx10MM)"
              value={formData.etiqueta}
              onChange={(e) => setFormData({ ...formData, etiqueta: e.target.value })}
              data-testid="input-etiqueta"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Selecione o modelo de etiqueta padrão para esta categoria
            </p>
          </div>

          <div>
            <Label htmlFor="etiquetaCustomizada" className="text-sm font-medium mb-2 block">
              Etiqueta Customizada
            </Label>
            <Input
              id="etiquetaCustomizada"
              placeholder="Ex: 100x12"
              value={formData.etiquetaCustomizada}
              onChange={(e) => setFormData({ ...formData, etiquetaCustomizada: e.target.value })}
              data-testid="input-etiqueta-customizada"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Dimensões customizadas em mm (largura x altura)
            </p>
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
          Salvar Categoria
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
