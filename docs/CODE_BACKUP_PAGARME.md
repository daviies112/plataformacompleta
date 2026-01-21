# Backup Completo do Codigo - Sistema Pagar.me Split

Este arquivo contem todo o codigo-fonte necessario para recriar o sistema de split de pagamentos.

---

## 1. Servico Pagar.me

### Arquivo: `server/services/pagarme.ts`

```typescript
import axios, { AxiosError } from 'axios';

interface RecipientData {
  code: string;
  name: string;
  email: string;
  document: string;
  document_type: 'cpf' | 'cnpj';
  type: 'individual' | 'company';
  phone?: {
    ddd: string;
    number: string;
  };
  address?: {
    street: string;
    number: string;
    complementary?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
    reference_point?: string;
  };
  bank_account: {
    holder_name: string;
    holder_document: string;
    bank: string;
    branch_number: string;
    branch_check_digit?: string;
    account_number: string;
    account_check_digit: string;
    type: 'checking' | 'savings';
  };
  transfer_settings?: {
    transfer_enabled: boolean;
    transfer_interval: 'daily' | 'weekly' | 'monthly';
    transfer_day: number;
  };
}

interface IndividualRecipientData {
  code: string;
  name: string;
  email: string;
  document: string;
  mother_name: string;
  birthdate: string;
  monthly_income?: number;
  professional_occupation?: string;
  phone: {
    ddd: string;
    number: string;
  };
  address: {
    street: string;
    number: string;
    complementary?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
    reference_point?: string;
  };
  bank_account: {
    holder_name: string;
    holder_document: string;
    bank: string;
    branch_number: string;
    branch_check_digit?: string;
    account_number: string;
    account_check_digit: string;
    type: 'checking' | 'savings';
  };
  transfer_settings?: {
    transfer_enabled: boolean;
    transfer_interval: 'daily' | 'weekly' | 'monthly';
    transfer_day: number;
  };
}

interface PaymentData {
  amount: number;
  payment_method: 'pix' | 'credit_card';
  customer: {
    name: string;
    email: string;
    document: string;
    document_type: 'cpf' | 'cnpj';
    phones?: {
      mobile_phone: {
        country_code: string;
        area_code: string;
        number: string;
      };
    };
  };
  pix?: {
    expires_in: number;
  };
  credit_card?: {
    card_token: string;
    installments: number;
    statement_descriptor: string;
  };
  split?: Array<{
    recipient_id: string;
    amount: number;
    type: 'flat' | 'percentage';
  }>;
}

class PagarmeService {
  private apiUrl = 'https://api.pagar.me/core/v5';
  private secretKey: string;
  private publicKey: string;

  constructor() {
    this.secretKey = process.env.CHAVE_SECRETA_TESTE || process.env.CHAVE_SECRETA || '';
    this.publicKey = process.env.CHAVE_PUBLICA_TESTE || process.env.CHAVE_PUBLICA || '';
    
    if (!this.secretKey) {
      console.warn('[Pagar.me] ATENCAO: Chave secreta nao configurada');
    }
  }

  private getAuthHeader() {
    const auth = Buffer.from(`${this.secretKey}:`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };
  }

  async createRecipient(data: RecipientData) {
    try {
      console.log('[Pagar.me] Criando recebedor:', data.name);
      
      const payload: any = {
        code: data.code,
        name: data.name,
        email: data.email,
        document: data.document,
        document_type: data.document_type,
        type: data.type,
        default_bank_account: data.bank_account,
      };

      if (data.transfer_settings) {
        payload.transfer_settings = data.transfer_settings;
      }

      const response = await axios.post(
        `${this.apiUrl}/recipients`,
        payload,
        { headers: this.getAuthHeader() }
      );

      console.log('[Pagar.me] Recebedor criado com sucesso:', response.data.id);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('[Pagar.me] Erro ao criar recebedor:', axiosError.response?.data || axiosError.message);
      throw error;
    }
  }

  async createIndividualRecipient(data: IndividualRecipientData) {
    try {
      console.log('[Pagar.me] Criando recebedor individual (CPF):', data.name);
      
      const payload = {
        code: data.code,
        name: data.name,
        email: data.email,
        document: data.document,
        document_type: 'cpf',
        type: 'individual',
        register_information: {
          email: data.email,
          document: data.document,
          name: data.name,
          mother_name: data.mother_name,
          birthdate: data.birthdate,
          monthly_income: data.monthly_income || 3000,
          professional_occupation: data.professional_occupation || 'Revendedor(a)',
          phone_numbers: [
            {
              ddd: data.phone.ddd,
              number: data.phone.number,
              type: 'mobile',
            },
          ],
          address: {
            street: data.address.street,
            number: data.address.number,
            complementary: data.address.complementary || '',
            neighborhood: data.address.neighborhood,
            city: data.address.city,
            state: data.address.state,
            zip_code: data.address.zip_code,
            reference_point: data.address.reference_point || '',
          },
        },
        default_bank_account: data.bank_account,
        transfer_settings: data.transfer_settings || {
          transfer_enabled: true,
          transfer_interval: 'weekly',
          transfer_day: 5,
        },
      };

      console.log('[Pagar.me] Payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post(
        `${this.apiUrl}/recipients`,
        payload,
        { headers: this.getAuthHeader() }
      );

      console.log('[Pagar.me] Recebedor individual criado:', response.data.id);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('[Pagar.me] Erro ao criar recebedor individual:', axiosError.response?.data || axiosError.message);
      throw error;
    }
  }

  async getRecipient(recipientId: string) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/recipients/${recipientId}`,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('[Pagar.me] Erro ao buscar recebedor:', axiosError.response?.data || axiosError.message);
      throw error;
    }
  }

  async processPayment(data: PaymentData) {
    try {
      console.log('[Pagar.me] Processando pagamento:', data.amount / 100, 'BRL');

      const payload: any = {
        customer: data.customer,
        items: [
          {
            amount: data.amount,
            description: 'Compra NEXUS',
            quantity: 1,
            code: 'NEXUS-001',
          },
        ],
        payments: [
          {
            payment_method: data.payment_method,
            amount: data.amount,
          },
        ],
      };

      if (data.payment_method === 'pix' && data.pix) {
        payload.payments[0].pix = data.pix;
      }

      if (data.payment_method === 'credit_card' && data.credit_card) {
        payload.payments[0].credit_card = data.credit_card;
      }

      if (data.split && data.split.length > 0) {
        payload.payments[0].split = data.split;
      }

      const response = await axios.post(
        `${this.apiUrl}/orders`,
        payload,
        { headers: this.getAuthHeader() }
      );

      console.log('[Pagar.me] Pagamento processado:', response.data.id);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('[Pagar.me] Erro ao processar pagamento:', axiosError.response?.data || axiosError.message);
      throw error;
    }
  }

  async tokenizeCard(cardData: {
    number: string;
    holder_name: string;
    exp_month: number;
    exp_year: number;
    cvv: string;
  }) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/tokens?appId=${this.publicKey}`,
        {
          type: 'card',
          card: cardData,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('[Pagar.me] Erro ao tokenizar cartao:', axiosError.response?.data || axiosError.message);
      throw error;
    }
  }

  getPublicKey() {
    return this.publicKey;
  }
}

export const pagarmeService = new PagarmeService();
```

---

## 2. Rotas Pagar.me (Parcial - Endpoints Principais)

### Arquivo: `server/routes/pagarme.ts` (Adicionar ao arquivo existente)

```typescript
// Endpoint: Onboarding de Revendedora (CPF)
router.post('/onboarding-revendedora', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Nao autorizado' });
    }

    const resellerId = req.user.resellerId || req.user.id;
    
    const {
      nomeCompleto,
      cpf,
      email,
      telefone,
      dataNascimento,
      nomeMae,
      rendaMensal,
      profissao,
      endereco,
      bancoCode,
      agencia,
      agenciaDv,
      conta,
      contaDv,
      tipoConta,
    } = req.body;

    // Validacoes obrigatorias
    if (!nomeCompleto || nomeCompleto.trim().length < 3) {
      return res.status(400).json({ error: 'Nome completo e obrigatorio (minimo 3 caracteres).' });
    }

    const cpfClean = cpf?.replace(/\D/g, '');
    if (!cpfClean || cpfClean.length !== 11) {
      return res.status(400).json({ error: 'CPF invalido - deve conter 11 digitos.' });
    }

    if (!dataNascimento) {
      return res.status(400).json({ error: 'Data de nascimento e obrigatoria.' });
    }

    if (!nomeMae || nomeMae.trim().length < 3) {
      return res.status(400).json({ error: 'Nome da mae e obrigatorio.' });
    }

    if (!endereco || !endereco.cep || !endereco.rua || !endereco.numero || 
        !endereco.bairro || !endereco.cidade || !endereco.estado) {
      return res.status(400).json({ error: 'Endereco completo e obrigatorio.' });
    }

    const cepClean = endereco.cep?.replace(/\D/g, '');
    if (!cepClean || cepClean.length !== 8) {
      return res.status(400).json({ error: 'CEP invalido - deve conter 8 digitos.' });
    }

    if (!bancoCode || !agencia || !conta || !contaDv) {
      return res.status(400).json({ error: 'Dados bancarios incompletos.' });
    }

    if (!telefone) {
      return res.status(400).json({ error: 'Telefone e obrigatorio.' });
    }

    const phoneCleanValidation = telefone.replace(/\D/g, '');
    if (phoneCleanValidation.length < 10) {
      return res.status(400).json({ error: 'Telefone invalido - deve conter DDD + numero' });
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Email invalido. Forneca um email valido.' });
    }

    console.log('[Pagar.me] Creating individual recipient for reseller:', nomeCompleto);

    const phoneClean = telefone.replace(/\D/g, '');
    const phoneDdd = phoneClean.slice(0, 2);
    const phoneNumber = phoneClean.slice(2);

    const recipient = await pagarmeService.createIndividualRecipient({
      code: `reseller_${resellerId}_${Date.now()}`,
      name: nomeCompleto,
      email: email,
      document: cpfClean,
      mother_name: nomeMae,
      birthdate: dataNascimento,
      monthly_income: rendaMensal || 3000,
      professional_occupation: profissao || 'Revendedor(a)',
      phone: {
        ddd: phoneDdd,
        number: phoneNumber,
      },
      address: {
        street: endereco.rua,
        number: endereco.numero,
        complementary: endereco.complemento || '',
        neighborhood: endereco.bairro,
        city: endereco.cidade,
        state: endereco.estado,
        zip_code: cepClean,
      },
      bank_account: {
        holder_name: nomeCompleto,
        holder_document: cpfClean,
        bank: bancoCode,
        branch_number: agencia,
        branch_check_digit: agenciaDv || '',
        account_number: conta,
        account_check_digit: contaDv,
        type: tipoConta === 'poupanca' ? 'savings' : 'checking',
      },
      transfer_settings: {
        transfer_enabled: true,
        transfer_interval: 'weekly',
        transfer_day: 5,
      },
    });

    // Salvar recipient_id no Supabase
    const supabaseUrl = process.env.SUPABASE_OWNER_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_OWNER_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase
        .from('revendedoras')
        .update({ pagarme_recipient_id: recipient.id })
        .eq('id', resellerId);
    }

    res.json({
      success: true,
      recipientId: recipient.id,
      message: 'Recebedor criado com sucesso',
    });

  } catch (error: any) {
    console.error('[Pagar.me] Erro no onboarding:', error.response?.data || error.message);
    
    const errorMessage = error.response?.data?.message || 
                         error.response?.data?.errors?.[0]?.message ||
                         error.message ||
                         'Erro ao criar recebedor';
    
    res.status(500).json({ error: errorMessage });
  }
});

// Endpoint: Status da Revendedora
router.get('/revendedora-status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Nao autorizado' });
    }

    const resellerId = req.user.resellerId || req.user.id;

    const supabaseUrl = process.env.SUPABASE_OWNER_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_OWNER_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Configuracao do banco de dados invalida' });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: revendedora, error } = await supabase
      .from('revendedoras')
      .select('pagarme_recipient_id')
      .eq('id', resellerId)
      .single();

    if (error) {
      console.error('[Pagar.me] Erro ao buscar revendedora:', error);
      return res.json({ hasRecipient: false, recipientId: null, status: null });
    }

    if (!revendedora?.pagarme_recipient_id) {
      return res.json({ hasRecipient: false, recipientId: null, status: null });
    }

    // Buscar status no Pagar.me
    try {
      const recipientData = await pagarmeService.getRecipient(revendedora.pagarme_recipient_id);
      res.json({
        hasRecipient: true,
        recipientId: revendedora.pagarme_recipient_id,
        status: recipientData.status || 'active',
      });
    } catch (pagarmeError) {
      res.json({
        hasRecipient: true,
        recipientId: revendedora.pagarme_recipient_id,
        status: 'unknown',
      });
    }

  } catch (error: any) {
    console.error('[Pagar.me] Erro ao verificar status:', error);
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});
```

---

## 3. Componente ResellerBankSetup

### Arquivo: `src/features/revendedora/components/financial/ResellerBankSetup.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, Building2, User } from 'lucide-react';
import { toast } from 'sonner';

interface BankFormData {
  nomeCompleto: string;
  cpf: string;
  email: string;
  telefone: string;
  dataNascimento: string;
  nomeMae: string;
  rendaMensal: number;
  profissao: string;
  endereco: {
    cep: string;
    rua: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  bancoCode: string;
  agencia: string;
  agenciaDv: string;
  conta: string;
  contaDv: string;
  tipoConta: 'corrente' | 'poupanca';
}

const bancosBrasil = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '033', name: 'Santander' },
  { code: '104', name: 'Caixa Economica' },
  { code: '237', name: 'Bradesco' },
  { code: '341', name: 'Itau' },
  { code: '077', name: 'Inter' },
  { code: '260', name: 'Nubank' },
  { code: '336', name: 'C6 Bank' },
  { code: '212', name: 'Banco Original' },
  { code: '756', name: 'Sicoob' },
  { code: '748', name: 'Sicredi' },
  { code: '422', name: 'Safra' },
  { code: '070', name: 'BRB' },
  { code: '136', name: 'Unicred' },
  { code: '084', name: 'Uniprime' },
  { code: '323', name: 'Mercado Pago' },
  { code: '290', name: 'PagSeguro' },
  { code: '380', name: 'PicPay' },
  { code: '403', name: 'Cora' },
  { code: '197', name: 'Stone' },
];

const estadosBrasil = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function ResellerBankSetup() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [recipientStatus, setRecipientStatus] = useState<{
    hasRecipient: boolean;
    recipientId: string | null;
    status: string | null;
  } | null>(null);

  const [formData, setFormData] = useState<BankFormData>({
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
      const data = await response.json();
      setRecipientStatus(data);
      setShowForm(!data.hasRecipient);
    } catch (error) {
      console.error('Erro ao buscar status:', error);
      setShowForm(true);
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
      toast.error('Digite um email valido');
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
        throw new Error(data.error || 'Erro ao cadastrar dados bancarios');
      }

      toast.success('Dados bancarios cadastrados com sucesso!');
      fetchStatus();
      setShowForm(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cadastrar dados bancarios');
    } finally {
      setSaving(false);
    }
  };

  const buscarCEP = async (cep: string) => {
    const cepClean = cep.replace(/\D/g, '');
    if (cepClean.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: {
            ...prev.endereco,
            rua: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || '',
          },
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
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

  if (recipientStatus?.hasRecipient && !showForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Conta Bancaria Cadastrada
          </CardTitle>
          <CardDescription>
            Sua conta esta configurada para receber pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-medium">Status: Ativo</p>
              <p className="text-sm text-muted-foreground">
                ID: {recipientStatus.recipientId}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-green-600 border-green-600">
            Pronto para receber split de pagamentos
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Cadastro Bancario - Pagar.me
        </CardTitle>
        <CardDescription>
          Preencha seus dados para receber pagamentos via split
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Pessoais */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Dados Pessoais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="nomeMae">Nome da Mae *</Label>
                <Input
                  id="nomeMae"
                  placeholder="Nome completo da mae"
                  value={formData.nomeMae}
                  onChange={(e) => setFormData({ ...formData, nomeMae: e.target.value })}
                  required
                  data-testid="input-nome-mae"
                />
              </div>
            </div>
          </div>

          {/* Endereco */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Endereco</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP *</Label>
                <Input
                  id="cep"
                  placeholder="00000-000"
                  value={formData.endereco.cep}
                  onChange={(e) => {
                    const cep = formatCEP(e.target.value);
                    setFormData({ 
                      ...formData, 
                      endereco: { ...formData.endereco, cep } 
                    });
                    if (cep.replace(/\D/g, '').length === 8) {
                      buscarCEP(cep);
                    }
                  }}
                  required
                  data-testid="input-cep"
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
                <Label htmlFor="numero">Numero *</Label>
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
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro *</Label>
                <Input
                  id="bairro"
                  placeholder="Bairro"
                  value={formData.endereco.bairro}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    endereco: { ...formData.endereco, bairro: e.target.value } 
                  })}
                  required
                  data-testid="input-bairro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade *</Label>
                <Input
                  id="cidade"
                  placeholder="Cidade"
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
                <Label htmlFor="estado">Estado *</Label>
                <Select
                  value={formData.endereco.estado}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    endereco: { ...formData.endereco, estado: value } 
                  })}
                >
                  <SelectTrigger data-testid="select-estado">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {estadosBrasil.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Dados Bancarios */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Dados Bancarios</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    {bancosBrasil.map((banco) => (
                      <SelectItem key={banco.code} value={banco.code}>
                        {banco.code} - {banco.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="agencia">Agencia *</Label>
                <Input
                  id="agencia"
                  placeholder="0000"
                  value={formData.agencia}
                  onChange={(e) => setFormData({ ...formData, agencia: e.target.value.replace(/\D/g, '') })}
                  required
                  data-testid="input-agencia"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agenciaDv">Digito Agencia</Label>
                <Input
                  id="agenciaDv"
                  placeholder="0"
                  maxLength={1}
                  value={formData.agenciaDv}
                  onChange={(e) => setFormData({ ...formData, agenciaDv: e.target.value })}
                  data-testid="input-agencia-dv"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conta">Conta *</Label>
                <Input
                  id="conta"
                  placeholder="00000000"
                  value={formData.conta}
                  onChange={(e) => setFormData({ ...formData, conta: e.target.value.replace(/\D/g, '') })}
                  required
                  data-testid="input-conta"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contaDv">Digito Conta *</Label>
                <Input
                  id="contaDv"
                  placeholder="0"
                  maxLength={2}
                  value={formData.contaDv}
                  onChange={(e) => setFormData({ ...formData, contaDv: e.target.value })}
                  required
                  data-testid="input-conta-dv"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Conta *</Label>
                <Select
                  value={formData.tipoConta}
                  onValueChange={(value: 'corrente' | 'poupanca') => setFormData({ ...formData, tipoConta: value })}
                >
                  <SelectTrigger data-testid="select-tipo-conta">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Conta Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupanca</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <p className="text-sm text-muted-foreground">
              Todos os campos marcados com * sao obrigatorios para ativacao no Pagar.me
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={saving} data-testid="button-submit-bank">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cadastrando...
              </>
            ) : (
              'Cadastrar Dados Bancarios'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

---

## 4. Pagina Financial (Aba Contas Bancarias)

### Arquivo: `src/features/revendedora/pages/reseller/Financial.tsx` (Trecho relevante)

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResellerBankSetup } from '../../components/financial/ResellerBankSetup';

// Dentro do componente Financial, adicionar a aba:
<Tabs defaultValue="resumo" className="space-y-4">
  <TabsList>
    <TabsTrigger value="resumo">Resumo</TabsTrigger>
    <TabsTrigger value="extrato">Extrato</TabsTrigger>
    <TabsTrigger value="contas-bancarias">Contas Bancarias</TabsTrigger>
    <TabsTrigger value="saques">Saques</TabsTrigger>
  </TabsList>
  
  {/* ... outras tabs ... */}
  
  <TabsContent value="contas-bancarias">
    <ResellerBankSetup />
  </TabsContent>
</Tabs>
```

---

## 5. Integracao de Split no Checkout

### Exemplo de calculo e envio de split:

```typescript
// Buscar dados da revendedora
const revendedora = await supabase
  .from('revendedoras')
  .select('pagarme_recipient_id, comissao_percentual')
  .eq('id', storeData.reseller_id)
  .single();

// Calcular split
const valorTotal = product.price * 100; // em centavos
const comissao = revendedora.comissao_percentual || 65;
const valorRevendedora = Math.round(valorTotal * (comissao / 100));
const valorEmpresa = valorTotal - valorRevendedora;

// Montar array de split
const split = [
  {
    recipient_id: EMPRESA_RECIPIENT_ID,
    amount: valorEmpresa,
    type: 'flat',
  },
  {
    recipient_id: revendedora.pagarme_recipient_id,
    amount: valorRevendedora,
    type: 'flat',
  },
];

// Processar pagamento com split
const payment = await pagarmeService.processPayment({
  amount: valorTotal,
  payment_method: 'pix',
  customer: customerData,
  pix: { expires_in: 3600 },
  split: split,
});
```

---

## Notas Importantes

1. **Ativacao do Split**: O recurso Split/Marketplace precisa ser ativado pela Pagar.me via suporte.

2. **Ambiente de Teste**: Use as chaves `CHAVE_SECRETA_TESTE` e `CHAVE_PUBLICA_TESTE` para desenvolvimento.

3. **Validacao KYC**: Todos os campos KYC sao obrigatorios para criar recebedores individuais (CPF).

4. **Transferencias**: Configurado para transferencias semanais (sexta-feira) por padrao.

5. **Seguranca**: Nunca exponha chaves secretas no frontend. Use apenas a chave publica para tokenizacao.

---

*Backup gerado em Janeiro 2026*
