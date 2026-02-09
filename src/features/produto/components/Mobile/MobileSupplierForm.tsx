import { useState } from "react";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { Label } from "@/features/produto/components/ui/label";
import { Textarea } from "@/features/produto/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Supplier } from "@/pages/Index";

interface MobileSupplierFormProps {
  onBack: () => void;
  onSave: (supplier: Omit<Supplier, "id"> | Supplier) => void;
  initialData?: Supplier | null;
}

export const MobileSupplierForm = ({ onBack, onSave, initialData }: MobileSupplierFormProps) => {
  const [formData, setFormData] = useState({
    nome: "",
    cpfCnpj: "",
    razaoSocial: "",
    inscricaoEstadual: "",
    referencia: "",
    endereco: "",
    numero: "",
    bairro: "",
    cidade: "",
    uf: "",
    cep: "",
    pais: "Brasil",
    nomeContato: "",
    email: "",
    telefone: "",
    telefone2: "",
    whatsapp: "",
    observacoes: "",
  });

  const handleSave = () => {
    if (!formData.nome || !formData.email || !formData.telefone || !formData.cidade || !formData.uf) {
      toast.error("Preencha os campos obrigatórios!");
      return;
    }

    onSave(formData);
    toast.success("Fornecedor salvo com sucesso!");
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
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Novo Fornecedor</h1>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Dados Principais */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Dados Principais</h2>
          
          <div>
            <Label htmlFor="nome" className="text-sm font-medium mb-2 block">
              Nome Fantasia <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nome"
              placeholder="Nome do fornecedor"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              data-testid="input-nome"
            />
          </div>

          <div>
            <Label htmlFor="cpfCnpj" className="text-sm font-medium mb-2 block">
              CPF/CNPJ
            </Label>
            <Input
              id="cpfCnpj"
              placeholder="00.000.000/0000-00"
              value={formData.cpfCnpj}
              onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
              data-testid="input-cpfcnpj"
            />
          </div>

          <div>
            <Label htmlFor="razaoSocial" className="text-sm font-medium mb-2 block">
              Razão Social
            </Label>
            <Input
              id="razaoSocial"
              placeholder="Razão social da empresa"
              value={formData.razaoSocial}
              onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
              data-testid="input-razao-social"
            />
          </div>
        </div>

        {/* Endereço */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Endereço</h2>
          
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3">
              <Label htmlFor="endereco" className="text-sm font-medium mb-2 block">
                Rua/Avenida
              </Label>
              <Input
                id="endereco"
                placeholder="Nome da rua"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                data-testid="input-endereco"
              />
            </div>
            <div>
              <Label htmlFor="numero" className="text-sm font-medium mb-2 block">
                Nº
              </Label>
              <Input
                id="numero"
                placeholder="123"
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                data-testid="input-numero"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bairro" className="text-sm font-medium mb-2 block">
                Bairro
              </Label>
              <Input
                id="bairro"
                placeholder="Nome do bairro"
                value={formData.bairro}
                onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                data-testid="input-bairro"
              />
            </div>
            <div>
              <Label htmlFor="cep" className="text-sm font-medium mb-2 block">
                CEP
              </Label>
              <Input
                id="cep"
                placeholder="00000-000"
                value={formData.cep}
                onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                data-testid="input-cep"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label htmlFor="cidade" className="text-sm font-medium mb-2 block">
                Cidade <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cidade"
                placeholder="Nome da cidade"
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                data-testid="input-cidade"
              />
            </div>
            <div>
              <Label htmlFor="uf" className="text-sm font-medium mb-2 block">
                UF <span className="text-red-500">*</span>
              </Label>
              <Input
                id="uf"
                placeholder="SP"
                maxLength={2}
                value={formData.uf}
                onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                data-testid="input-uf"
              />
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Contato</h2>
          
          <div>
            <Label htmlFor="nomeContato" className="text-sm font-medium mb-2 block">
              Nome do Contato
            </Label>
            <Input
              id="nomeContato"
              placeholder="Nome da pessoa de contato"
              value={formData.nomeContato}
              onChange={(e) => setFormData({ ...formData, nomeContato: e.target.value })}
              data-testid="input-nome-contato"
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

          <div className="grid grid-cols-2 gap-3">
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
              <Label htmlFor="whatsapp" className="text-sm font-medium mb-2 block">
                WhatsApp
              </Label>
              <Input
                id="whatsapp"
                placeholder="(00) 00000-0000"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                data-testid="input-whatsapp"
              />
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="observacoes" className="text-sm font-medium mb-2 block">
              Observações
            </Label>
            <Textarea
              id="observacoes"
              placeholder="Informações adicionais sobre o fornecedor..."
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="min-h-[80px] resize-none"
              data-testid="input-observacoes"
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
          Salvar Fornecedor
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
