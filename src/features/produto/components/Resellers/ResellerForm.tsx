import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { Label } from "@/features/produto/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/produto/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/features/produto/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import type { Reseller } from "@/pages/Index";

interface ResellerFormProps {
  onBack: () => void;
  onSave: (reseller: Omit<Reseller, "id"> | Reseller) => void;
  initialData?: Reseller | null;
}

export const ResellerForm = ({ onBack, onSave, initialData }: ResellerFormProps) => {
  const [enderecoOpen, setEnderecoOpen] = useState(false);
  const [tipoOpen, setTipoOpen] = useState(false);
  const [referenciaOpen, setReferenciaOpen] = useState(false);
  const [contatoOpen, setContatoOpen] = useState(false);
  const [outrosOpen, setOutrosOpen] = useState(false);

  const [formData, setFormData] = useState({
    nome: initialData?.nome || "",
    cpf: initialData?.cpf || "",
    telefone: initialData?.telefone || "",
    email: initialData?.email || "",
    tipo: initialData?.tipo || "",
    nivel: initialData?.nivel || "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        nome: initialData.nome,
        cpf: initialData.cpf,
        telefone: initialData.telefone,
        email: initialData.email,
        tipo: initialData.tipo,
        nivel: initialData.nivel,
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
            {initialData ? "Editar Revendedor" : "Cadastro de Revendedor"}
          </h2>
        </div>

        <Collapsible open={true} className="mb-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg font-medium">
            Dados do Cadastro
            <ChevronDown className="w-5 h-5" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="w-40 h-40 border-2 border-dashed border-muted rounded-lg flex items-center justify-center bg-muted/30">
                  <span className="text-sm text-muted-foreground">Foto</span>
                </div>
                <Button variant="outline" size="sm">Upload</Button>
              </div>

              <div className="md:col-span-3 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rg">RG</Label>
                    <Input id="rg" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="data-nascimento">Data de Nascimento</Label>
                    <Input id="data-nascimento" type="date" />
                  </div>
                  <div>
                    <Label htmlFor="genero">Gênero</Label>
                    <Select>
                      <SelectTrigger id="genero">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="estado-civil">Estado Civil</Label>
                    <Select>
                      <SelectTrigger id="estado-civil">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                        <SelectItem value="casado">Casado(a)</SelectItem>
                        <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                        <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
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
                <Input id="endereco" />
              </div>
              <div>
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bairro">Bairro</Label>
                <Input id="bairro" />
              </div>
              <div>
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" />
              </div>
              <div>
                <Label htmlFor="uf">UF</Label>
                <Input id="uf" maxLength={2} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" placeholder="00000-000" />
              </div>
              <div>
                <Label htmlFor="pais">País</Label>
                <Input id="pais" defaultValue="Brasil" />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={tipoOpen} onOpenChange={setTipoOpen} className="mb-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg font-medium">
            Tipo Revendedor
            <ChevronDown className={`w-5 h-5 transition-transform ${tipoOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                  <SelectTrigger id="tipo">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gold">Gold</SelectItem>
                    <SelectItem value="Silver">Silver</SelectItem>
                    <SelectItem value="Bronze">Bronze</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="nivel">Nível</Label>
                <Select value={formData.nivel} onValueChange={(value) => setFormData({ ...formData, nivel: value })}>
                  <SelectTrigger id="nivel">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nível 1">Nível 1</SelectItem>
                    <SelectItem value="Nível 2">Nível 2</SelectItem>
                    <SelectItem value="Nível 3">Nível 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={referenciaOpen} onOpenChange={setReferenciaOpen} className="mb-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg font-medium">
            Referência
            <ChevronDown className={`w-5 h-5 transition-transform ${referenciaOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div>
              <Label htmlFor="referencia">Referência</Label>
              <Input id="referencia" />
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
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input id="website" />
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
                <Input id="telefone2" placeholder="(00) 00000-0000" />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" placeholder="(00) 00000-0000" />
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
              <Input id="observacoes" />
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
