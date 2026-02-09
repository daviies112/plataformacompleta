import { useState } from "react";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { Label } from "@/features/produto/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Reseller } from "@/pages/Index";

interface MobileResellerFormProps {
  onBack: () => void;
  onSave: (reseller: Omit<Reseller, "id"> | Reseller) => void;
  initialData?: Reseller | null;
}

export const MobileResellerForm = ({ onBack, onSave, initialData }: MobileResellerFormProps) => {
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    email: "",
    tipo: "Bronze",
    nivel: "Nível 1",
  });

  const handleSave = () => {
    if (!formData.nome || !formData.cpf || !formData.telefone || !formData.email) {
      toast.error("Preencha os campos obrigatórios!");
      return;
    }

    onSave(formData);
    toast.success("Revendedor salvo com sucesso!");
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
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Novo Revendedor</h1>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Dados Principais */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Dados Principais</h2>
          
          <div>
            <Label htmlFor="nome" className="text-sm font-medium mb-2 block">
              Nome Completo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nome"
              placeholder="Nome do revendedor"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              data-testid="input-nome"
            />
          </div>

          <div>
            <Label htmlFor="cpf" className="text-sm font-medium mb-2 block">
              CPF <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              data-testid="input-cpf"
            />
          </div>
        </div>

        {/* Contato */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Contato</h2>
          
          <div>
            <Label htmlFor="telefone" className="text-sm font-medium mb-2 block">
              Telefone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="telefone"
              placeholder="(00) 00000-0000"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              data-testid="input-telefone"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-sm font-medium mb-2 block">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              data-testid="input-email"
            />
          </div>
        </div>

        {/* Classificação */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Classificação</h2>
          
          <div>
            <Label htmlFor="tipo" className="text-sm font-medium mb-2 block">
              Tipo
            </Label>
            <Input
              id="tipo"
              placeholder="Ex: Gold, Silver, Bronze"
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              data-testid="input-tipo"
            />
          </div>

          <div>
            <Label htmlFor="nivel" className="text-sm font-medium mb-2 block">
              Nível
            </Label>
            <Input
              id="nivel"
              placeholder="Ex: Nível 1, Nível 2"
              value={formData.nivel}
              onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
              data-testid="input-nivel"
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
          Salvar Revendedor
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
