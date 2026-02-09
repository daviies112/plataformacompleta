import { useState, useEffect } from "react";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { Label } from "@/features/produto/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/features/produto/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type { Supplier } from "@/pages/Index";

interface SupplierFormProps {
  onBack: () => void;
  onSave: (supplier: Omit<Supplier, "id"> | Supplier) => void;
  initialData?: Supplier | null;
}

export const SupplierForm = ({ onBack, onSave, initialData }: SupplierFormProps) => {
  const [enderecoOpen, setEnderecoOpen] = useState(false);
  const [contatoOpen, setContatoOpen] = useState(false);
  const [outrosOpen, setOutrosOpen] = useState(false);

  const [formData, setFormData] = useState({
    nome: initialData?.nome || "",
    cpfCnpj: initialData?.cpfCnpj || "",
    razaoSocial: initialData?.razaoSocial || "",
    inscricaoEstadual: initialData?.inscricaoEstadual || "",
    referencia: initialData?.referencia || "",
    endereco: initialData?.endereco || "",
    numero: initialData?.numero || "",
    bairro: initialData?.bairro || "",
    cidade: initialData?.cidade || "",
    uf: initialData?.uf || "",
    cep: initialData?.cep || "",
    pais: initialData?.pais || "Brasil",
    nomeContato: initialData?.nomeContato || "",
    email: initialData?.email || "",
    telefone: initialData?.telefone || "",
    telefone2: initialData?.telefone2 || "",
    whatsapp: initialData?.whatsapp || "",
    observacoes: initialData?.observacoes || "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        nome: initialData.nome,
        cpfCnpj: initialData.cpfCnpj,
        razaoSocial: initialData.razaoSocial || "",
        inscricaoEstadual: initialData.inscricaoEstadual || "",
        referencia: initialData.referencia || "",
        endereco: initialData.endereco || "",
        numero: initialData.numero || "",
        bairro: initialData.bairro || "",
        cidade: initialData.cidade,
        uf: initialData.uf,
        cep: initialData.cep || "",
        pais: initialData.pais || "Brasil",
        nomeContato: initialData.nomeContato || "",
        email: initialData.email,
        telefone: initialData.telefone,
        telefone2: initialData.telefone2 || "",
        whatsapp: initialData.whatsapp || "",
        observacoes: initialData.observacoes || "",
      });
    }
  }, [initialData]);

  const handleSave = () => {
    if (!formData.nome) {
      toast.error("Preencha o campo Nome!");
      return;
    }

    if (initialData) {
      onSave({
        ...formData,
        id: initialData.id,
      });
    } else {
      onSave(formData);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            {initialData ? "Editar Fornecedor" : "Cadastro de Fornecedor"}
          </h2>
        </div>

        <Collapsible open={true} className="mb-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg font-medium">
            Dados do Cadastro
            <ChevronDown className="w-5 h-5" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={formData.cpfCnpj}
                  onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="nome-fantasia">Nome Fantasia</Label>
                <Input
                  id="nome-fantasia"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="razao-social">Razão Social</Label>
                <Input
                  id="razao-social"
                  value={formData.razaoSocial}
                  onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="inscricao-estadual">Inscrição Estadual</Label>
                <Input
                  id="inscricao-estadual"
                  value={formData.inscricaoEstadual}
                  onChange={(e) => setFormData({ ...formData, inscricaoEstadual: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="referencia">Referência</Label>
              <Input
                id="referencia"
                value={formData.referencia}
                onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={enderecoOpen} onOpenChange={setEnderecoOpen} className="mb-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg font-medium">
            Endereço
            <ChevronDown className={`w-5 h-5 transition-transform ${enderecoOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  maxLength={2}
                  value={formData.uf}
                  onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  placeholder="00000-000"
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="pais">País</Label>
                <Input
                  id="pais"
                  value={formData.pais}
                  onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={contatoOpen} onOpenChange={setContatoOpen} className="mb-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg font-medium">
            Contato
            <ChevronDown className={`w-5 h-5 transition-transform ${contatoOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contato-nome">Nome do Contato</Label>
                <Input
                  id="contato-nome"
                  value={formData.nomeContato}
                  onChange={(e) => setFormData({ ...formData, nomeContato: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="telefone1">Telefone 1</Label>
                <Input
                  id="telefone1"
                  placeholder="(00) 00000-0000"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="telefone2">Telefone 2</Label>
                <Input
                  id="telefone2"
                  placeholder="(00) 00000-0000"
                  value={formData.telefone2}
                  onChange={(e) => setFormData({ ...formData, telefone2: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  placeholder="(00) 00000-0000"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={outrosOpen} onOpenChange={setOutrosOpen} className="mb-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg font-medium">
            Outros
            <ChevronDown className={`w-5 h-5 transition-transform ${outrosOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Input
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

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
  );
};
