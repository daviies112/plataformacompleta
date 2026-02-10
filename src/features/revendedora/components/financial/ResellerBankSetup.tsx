import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/revendedora/components/ui/card';
import { Button } from '@/features/revendedora/components/ui/button';
import { Input } from '@/features/revendedora/components/ui/input';
import { Label } from '@/features/revendedora/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/revendedora/components/ui/select';
import { Badge } from '@/features/revendedora/components/ui/badge';
import { Loader2, CheckCircle, Building2, AlertCircle, Banknote, User } from 'lucide-react';
import { toast } from 'sonner';

const BANKS = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '033', name: 'Santander' },
  { code: '104', name: 'Caixa Econômica' },
  { code: '237', name: 'Bradesco' },
  { code: '260', name: 'Nubank' },
  { code: '336', name: 'C6 Bank' },
  { code: '341', name: 'Itaú' },
  { code: '077', name: 'Inter' },
  { code: '212', name: 'Original' },
  { code: '756', name: 'Sicoob' },
  { code: '748', name: 'Sicredi' },
  { code: '422', name: 'Safra' },
  { code: '655', name: 'Votorantim' },
  { code: '041', name: 'Banrisul' },
  { code: '070', name: 'BRB' },
  { code: '021', name: 'Banestes' },
  { code: '389', name: 'Mercantil do Brasil' },
  { code: '246', name: 'ABC Brasil' },
  { code: '218', name: 'BS2' },
  { code: '380', name: 'PicPay' },
  { code: '290', name: 'PagSeguro' },
  { code: '323', name: 'Mercado Pago' },
];

interface ResellerBankSetupProps {
  resellerId: string;
}

interface BankStatus {
  configured: boolean;
  recipientId?: string;
  bankAccount?: {
    banco: string;
    agencia: string;
    conta: string;
    tipo: string;
    holderName: string;
  };
}

export function ResellerBankSetup({ resellerId }: ResellerBankSetupProps) {
  const [status, setStatus] = useState<BankStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    nomeCompleto: '',
    cpf: '',
    email: '',
    telefone: '',
    dataNascimento: '',
    nomeMae: '',
    rendaMensal: 3000,
    profissao: 'Revendedor(a)',
    endereco: {
      cep: '',
      rua: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
    },
    bancoCode: '',
    agencia: '',
    agenciaDv: '',
    conta: '',
    contaDv: '',
    tipoConta: 'corrente',
  });

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/pagarme/revendedora-status', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setShowForm(!data.configured);
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const formatCEP = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bancoCode) {
      toast.error('Selecione o banco');
      return;
    }
    if (!formData.endereco.estado) {
      toast.error('Selecione o estado');
      return;
    }
    if (!formData.email.includes('@')) {
      toast.error('Digite um email válido');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/pagarme/onboarding-revendedora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar dados bancários');
      }

      toast.success('Dados bancários cadastrados com sucesso!');
      fetchStatus();
      setShowForm(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cadastrar dados bancários');
    } finally {
      setSaving(false);
    }
  };

  const getBankName = (code: string) => {
    return BANKS.find(b => b.code === code)?.name || code;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (status?.configured && !showForm) {
    return (
      <Card className="border-green-200 bg-green-50/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Conta Bancária Configurada</CardTitle>
                <CardDescription>Sua conta está pronta para receber comissões</CardDescription>
              </div>
            </div>
            <Badge className="bg-green-500">Ativo</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {status.bankAccount && (
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{getBankName(status.bankAccount.banco)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Agência:</span>
                  <span className="ml-2">{status.bankAccount.agencia}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Conta:</span>
                  <span className="ml-2">{status.bankAccount.conta}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="ml-2">{status.bankAccount.tipo}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Titular:</span>
                  <span className="ml-2">{status.bankAccount.holderName}</span>
                </div>
              </div>
            </div>
          )}
          <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}>
            Atualizar Dados
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Banknote className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Cadastrar Conta para Recebimentos</CardTitle>
            <CardDescription>
              Informe seus dados pessoais e bancários para receber suas comissões
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              Dados Pessoais
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nomeCompleto">Nome Completo *</Label>
                <Input
                  id="nomeCompleto"
                  placeholder="Seu nome completo"
                  value={formData.nomeCompleto}
                  onChange={(e) => setFormData({ ...formData, nomeCompleto: e.target.value })}
                  required
                  data-testid="input-nome-completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                  required
                  data-testid="input-cpf"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  placeholder="(00) 00000-0000"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                  required
                  data-testid="input-telefone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataNascimento">Data de Nascimento *</Label>
                <Input
                  id="dataNascimento"
                  type="date"
                  value={formData.dataNascimento}
                  onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                  required
                  data-testid="input-data-nascimento"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nomeMae">Nome da Mãe *</Label>
                <Input
                  id="nomeMae"
                  placeholder="Nome completo da mãe"
                  value={formData.nomeMae}
                  onChange={(e) => setFormData({ ...formData, nomeMae: e.target.value })}
                  required
                  data-testid="input-nome-mae"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Endereço
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP *</Label>
                <Input
                  id="cep"
                  placeholder="00000-000"
                  value={formData.endereco.cep}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    endereco: { ...formData.endereco, cep: formatCEP(e.target.value) } 
                  })}
                  required
                  data-testid="input-cep"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado *</Label>
                <Select
                  value={formData.endereco.estado}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    endereco: { ...formData.endereco, estado: value } 
                  })}
                >
                  <SelectTrigger data-testid="select-estado">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade *</Label>
                <Input
                  id="cidade"
                  placeholder="Sua cidade"
                  value={formData.endereco.cidade}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    endereco: { ...formData.endereco, cidade: e.target.value } 
                  })}
                  required
                  data-testid="input-cidade"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro *</Label>
                <Input
                  id="bairro"
                  placeholder="Seu bairro"
                  value={formData.endereco.bairro}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    endereco: { ...formData.endereco, bairro: e.target.value } 
                  })}
                  required
                  data-testid="input-bairro"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="rua">Rua *</Label>
                <Input
                  id="rua"
                  placeholder="Nome da rua"
                  value={formData.endereco.rua}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    endereco: { ...formData.endereco, rua: e.target.value } 
                  })}
                  required
                  data-testid="input-rua"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero">Número *</Label>
                <Input
                  id="numero"
                  placeholder="123"
                  value={formData.endereco.numero}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    endereco: { ...formData.endereco, numero: e.target.value } 
                  })}
                  required
                  data-testid="input-numero"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  placeholder="Apto, Bloco, etc"
                  value={formData.endereco.complemento}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    endereco: { ...formData.endereco, complemento: e.target.value } 
                  })}
                  data-testid="input-complemento"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Banknote className="h-4 w-4" />
              Dados Bancários
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="banco">Banco *</Label>
                <Select
                  value={formData.bancoCode}
                  onValueChange={(value) => setFormData({ ...formData, bancoCode: value })}
                >
                  <SelectTrigger data-testid="select-banco">
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANKS.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.code} - {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="agencia">Agência *</Label>
                <div className="flex gap-2">
                  <Input
                    id="agencia"
                    placeholder="0000"
                    className="flex-1"
                    value={formData.agencia}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    required
                    data-testid="input-agencia"
                  />
                  <Input
                    id="agenciaDv"
                    placeholder="DV"
                    className="w-16"
                    value={formData.agenciaDv}
                    onChange={(e) => setFormData({ ...formData, agenciaDv: e.target.value.slice(0, 1) })}
                    data-testid="input-agencia-dv"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="conta">Conta *</Label>
                <div className="flex gap-2">
                  <Input
                    id="conta"
                    placeholder="00000"
                    className="flex-1"
                    value={formData.conta}
                    onChange={(e) => setFormData({ ...formData, conta: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                    required
                    data-testid="input-conta"
                  />
                  <Input
                    id="contaDv"
                    placeholder="DV"
                    className="w-16"
                    value={formData.contaDv}
                    onChange={(e) => setFormData({ ...formData, contaDv: e.target.value.slice(0, 1) })}
                    required
                    data-testid="input-conta-dv"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipoConta">Tipo de Conta *</Label>
                <Select
                  value={formData.tipoConta}
                  onValueChange={(value) => setFormData({ ...formData, tipoConta: value })}
                >
                  <SelectTrigger data-testid="select-tipo-conta">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Conta Corrente</SelectItem>
                    <SelectItem value="poupanca">Conta Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              A conta bancária deve estar no seu CPF. Contas de terceiros não são aceitas.
            </p>
          </div>

          <div className="flex gap-3">
            {status?.configured && (
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                <>
                  <Banknote className="h-4 w-4 mr-2" />
                  Cadastrar Conta Bancária
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
