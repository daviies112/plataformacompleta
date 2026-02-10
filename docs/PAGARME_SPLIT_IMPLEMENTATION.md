# Documentacao Completa - Sistema de Split de Pagamentos Pagar.me

## Indice

1. [Visao Geral](#visao-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Configuracao do Ambiente](#configuracao-do-ambiente)
4. [Endpoints da API](#endpoints-da-api)
5. [Servico Pagar.me](#servico-pagarme)
6. [Componentes Frontend](#componentes-frontend)
7. [Tabelas do Banco de Dados](#tabelas-do-banco-de-dados)
8. [Fluxo de Cadastro de Revendedoras](#fluxo-de-cadastro-de-revendedoras)
9. [Sistema de Comissoes](#sistema-de-comissoes)
10. [Split de Pagamentos](#split-de-pagamentos)
11. [Checkout Publico](#checkout-publico)
12. [Troubleshooting](#troubleshooting)

---

## Visao Geral

O sistema implementa pagamentos com split (divisao) entre a empresa principal (CNPJ) e revendedoras (CPF) usando a API Pagar.me v5. O sistema suporta:

- **PIX**: Pagamento instantaneo com QR Code
- **Cartao de Credito**: Pagamento com tokenizacao PCI-compliant
- **Split de Pagamentos**: Divisao automatica entre empresa e revendedora
- **Comissoes Dinamicas**: Niveis de comissao por categoria de revendedora

### Niveis de Comissao

| Nivel | Revendedora | Empresa |
|-------|-------------|---------|
| Iniciante | 65% | 35% |
| Bronze | 70% | 30% |
| Prata | 75% | 25% |
| Ouro | 80% | 20% |

---

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
├─────────────────────────────────────────────────────────────────┤
│  ResellerBankSetup.tsx    │  CheckoutPage.tsx                   │
│  (Cadastro Bancario)      │  (Pagamento com Split)              │
│  Financial.tsx            │  PublicStorePage.tsx                │
│  (Pagina Financeira)      │  (Loja Publica)                     │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                   │
├─────────────────────────────────────────────────────────────────┤
│  server/routes/pagarme.ts                                       │
│  - POST /api/pagarme/onboarding-revendedora                     │
│  - GET /api/pagarme/revendedora-status                          │
│  - POST /api/pagarme/create-recipient                           │
│  - POST /api/pagarme/process-payment                            │
│  - POST /api/pagarme/tokenize-card                              │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVICO PAGAR.ME                             │
├─────────────────────────────────────────────────────────────────┤
│  server/services/pagarme.ts                                     │
│  - createRecipient() - Empresa (CNPJ)                           │
│  - createIndividualRecipient() - Revendedora (CPF)              │
│  - getRecipient()                                                │
│  - processPayment()                                              │
│  - tokenizeCard()                                                │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PAGAR.ME API v5                             │
│                   https://api.pagar.me/core/v5                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuracao do Ambiente

### Variaveis de Ambiente Necessarias

```env
# Producao
CHAVE_SECRETA=sk_live_xxxxxxxxxxxxxxxx
CHAVE_PUBLICA=pk_live_xxxxxxxxxxxxxxxx

# Sandbox/Teste (prioridade se existir)
CHAVE_SECRETA_TESTE=sk_test_xxxxxxxxxxxxxxxx
CHAVE_PUBLICA_TESTE=pk_test_xxxxxxxxxxxxxxxx

# Supabase (para armazenar dados das revendedoras)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxx
SUPABASE_OWNER_URL=https://xxx.supabase.co
SUPABASE_OWNER_SERVICE_ROLE_KEY=eyJxxxxxxx
```

### Configuracao Pagar.me Dashboard

1. Acessar https://dashboard.pagar.me
2. Ir em Configuracoes > Split/Marketplace
3. **IMPORTANTE**: Solicitar ativacao do recurso Split ao suporte Pagar.me
4. Configurar webhooks para receber notificacoes de pagamento

---

## Endpoints da API

### 1. Onboarding de Revendedora (CPF)

**POST** `/api/pagarme/onboarding-revendedora`

Cria um recebedor individual (pessoa fisica) no Pagar.me para participar do split.

#### Request Body

```json
{
  "nomeCompleto": "Maria Silva Santos",
  "cpf": "123.456.789-00",
  "email": "maria@email.com",
  "telefone": "(11) 99999-9999",
  "dataNascimento": "1990-05-15",
  "nomeMae": "Ana Silva",
  "rendaMensal": 5000,
  "profissao": "Revendedora",
  "endereco": {
    "cep": "01310-100",
    "rua": "Avenida Paulista",
    "numero": "1000",
    "complemento": "Apto 101",
    "bairro": "Bela Vista",
    "cidade": "Sao Paulo",
    "estado": "SP"
  },
  "bancoCode": "001",
  "agencia": "1234",
  "agenciaDv": "5",
  "conta": "12345678",
  "contaDv": "9",
  "tipoConta": "corrente"
}
```

#### Response Success (200)

```json
{
  "success": true,
  "recipientId": "rp_xxxxxxxxxxxxxxxx",
  "message": "Recebedor criado com sucesso"
}
```

#### Validacoes

- CPF: 11 digitos, formato valido
- Telefone: minimo 10 digitos (DDD + numero)
- Email: deve conter @ e .
- CEP: 8 digitos
- Todos os campos de endereco sao obrigatorios (exceto complemento)
- Banco, agencia e conta obrigatorios

---

### 2. Status da Revendedora

**GET** `/api/pagarme/revendedora-status`

Verifica se a revendedora ja tem cadastro no Pagar.me.

#### Response

```json
{
  "hasRecipient": true,
  "recipientId": "rp_xxxxxxxxxxxxxxxx",
  "status": "active"
}
```

---

### 3. Criar Recebedor Empresa (CNPJ)

**POST** `/api/pagarme/create-recipient`

Cria o recebedor principal da empresa.

#### Request Body

```json
{
  "cnpj": "53.462.690/0001-67",
  "razaoSocial": "Empresa LTDA",
  "nomeFantasia": "Minha Empresa",
  "email": "empresa@email.com",
  "telefone": "(11) 3333-3333",
  "endereco": {
    "cep": "01310-100",
    "rua": "Avenida Paulista",
    "numero": "1000",
    "bairro": "Centro",
    "cidade": "Sao Paulo",
    "estado": "SP"
  },
  "banco": "336",
  "agencia": "0001",
  "conta": "12580555",
  "contaDv": "1",
  "tipoConta": "corrente"
}
```

---

### 4. Processar Pagamento com Split

**POST** `/api/pagarme/process-payment`

Processa pagamento e divide entre empresa e revendedora.

#### Request Body - PIX

```json
{
  "amount": 10000,
  "paymentMethod": "pix",
  "customer": {
    "name": "Cliente Exemplo",
    "email": "cliente@email.com",
    "document": "12345678900",
    "phone": "11999999999"
  },
  "split": [
    {
      "recipientId": "rp_empresa_xxx",
      "amount": 3500,
      "type": "flat"
    },
    {
      "recipientId": "rp_revendedora_xxx",
      "amount": 6500,
      "type": "flat"
    }
  ]
}
```

#### Request Body - Cartao

```json
{
  "amount": 10000,
  "paymentMethod": "credit_card",
  "cardToken": "token_xxxxxxxx",
  "installments": 1,
  "customer": {
    "name": "Cliente Exemplo",
    "email": "cliente@email.com",
    "document": "12345678900",
    "phone": "11999999999"
  },
  "split": [
    {
      "recipientId": "rp_empresa_xxx",
      "amount": 3500,
      "type": "flat"
    },
    {
      "recipientId": "rp_revendedora_xxx",
      "amount": 6500,
      "type": "flat"
    }
  ]
}
```

---

## Servico Pagar.me

### Arquivo: `server/services/pagarme.ts`

```typescript
import axios from 'axios';

class PagarmeService {
  private apiUrl = 'https://api.pagar.me/core/v5';
  private secretKey: string;
  private publicKey: string;

  constructor() {
    // Prioriza chaves de teste para desenvolvimento
    this.secretKey = process.env.CHAVE_SECRETA_TESTE || process.env.CHAVE_SECRETA || '';
    this.publicKey = process.env.CHAVE_PUBLICA_TESTE || process.env.CHAVE_PUBLICA || '';
  }

  private getAuthHeader() {
    const auth = Buffer.from(`${this.secretKey}:`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };
  }

  // Criar recebedor pessoa juridica (CNPJ)
  async createRecipient(data: {
    code: string;
    name: string;
    email: string;
    document: string;
    document_type: 'cnpj';
    type: 'company';
    phone: { ddd: string; number: string };
    address: {
      street: string;
      number: string;
      neighborhood: string;
      city: string;
      state: string;
      zip_code: string;
      complementary?: string;
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
    transfer_settings: {
      transfer_enabled: boolean;
      transfer_interval: 'daily' | 'weekly' | 'monthly';
      transfer_day: number;
    };
  }) {
    const response = await axios.post(
      `${this.apiUrl}/recipients`,
      data,
      { headers: this.getAuthHeader() }
    );
    return response.data;
  }

  // Criar recebedor pessoa fisica (CPF) - Para Revendedoras
  async createIndividualRecipient(data: {
    code: string;
    name: string;
    email: string;
    document: string;
    mother_name: string;
    birthdate: string;
    monthly_income?: number;
    professional_occupation?: string;
    phone: { ddd: string; number: string };
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
    transfer_settings: {
      transfer_enabled: boolean;
      transfer_interval: 'daily' | 'weekly' | 'monthly';
      transfer_day: number;
    };
  }) {
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
      transfer_settings: data.transfer_settings,
    };

    const response = await axios.post(
      `${this.apiUrl}/recipients`,
      payload,
      { headers: this.getAuthHeader() }
    );
    return response.data;
  }

  // Buscar recebedor por ID
  async getRecipient(recipientId: string) {
    const response = await axios.get(
      `${this.apiUrl}/recipients/${recipientId}`,
      { headers: this.getAuthHeader() }
    );
    return response.data;
  }

  // Processar pagamento
  async processPayment(data: {
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
  }) {
    const response = await axios.post(
      `${this.apiUrl}/orders`,
      {
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
            ...(data.pix && { pix: data.pix }),
            ...(data.credit_card && { credit_card: data.credit_card }),
            ...(data.split && { split: data.split }),
          },
        ],
      },
      { headers: this.getAuthHeader() }
    );
    return response.data;
  }

  // Tokenizar cartao
  async tokenizeCard(cardData: {
    number: string;
    holder_name: string;
    exp_month: number;
    exp_year: number;
    cvv: string;
  }) {
    const response = await axios.post(
      `${this.apiUrl}/tokens?appId=${this.publicKey}`,
      {
        type: 'card',
        card: cardData,
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  }
}

export const pagarmeService = new PagarmeService();
```

---

## Componentes Frontend

### 1. ResellerBankSetup.tsx

Formulario completo para cadastro bancario da revendedora.

**Localizacao**: `src/features/revendedora/components/financial/ResellerBankSetup.tsx`

#### Campos do Formulario

**Dados Pessoais:**
- Nome Completo (obrigatorio)
- CPF (obrigatorio, formatado)
- Email (obrigatorio)
- Telefone (obrigatorio, formatado)
- Data de Nascimento (obrigatorio)
- Nome da Mae (obrigatorio)

**Endereco:**
- CEP (obrigatorio, com busca automatica)
- Rua (obrigatorio)
- Numero (obrigatorio)
- Complemento (opcional)
- Bairro (obrigatorio)
- Cidade (obrigatorio)
- Estado (obrigatorio, select)

**Dados Bancarios:**
- Banco (obrigatorio, select com codigo)
- Agencia (obrigatorio)
- Digito da Agencia (opcional)
- Conta (obrigatorio)
- Digito da Conta (obrigatorio)
- Tipo de Conta (corrente/poupanca)

#### Funcionalidades

- Busca automatica de endereco por CEP (API ViaCEP)
- Formatacao automatica de CPF, telefone e CEP
- Validacao em tempo real
- Exibicao de status do cadastro
- Integracao com endpoint de onboarding

---

### 2. Financial.tsx (Pagina Financeira)

**Localizacao**: `src/features/revendedora/pages/reseller/Financial.tsx`

Pagina principal financeira da revendedora com abas:

- **Resumo**: Dashboard financeiro
- **Extrato**: Historico de transacoes
- **Contas Bancarias**: Cadastro e status Pagar.me (ResellerBankSetup)
- **Saques**: Solicitacao de saques

---

### 3. CheckoutPage.tsx

**Localizacao**: `src/pages/checkout/CheckoutPage.tsx`

Pagina de checkout com:

- Selecao de metodo de pagamento (PIX ou Cartao)
- Formulario de cartao com tokenizacao
- Geracao de QR Code PIX
- Calculo automatico de split baseado na comissao da revendedora

---

## Tabelas do Banco de Dados

### Tabela: revendedoras (Supabase)

```sql
CREATE TABLE revendedoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  cpf VARCHAR(14),
  telefone VARCHAR(20),
  nivel VARCHAR(50) DEFAULT 'Iniciante',
  comissao_percentual DECIMAL(5,2) DEFAULT 65.00,
  pagarme_recipient_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela: products (Supabase)

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100),
  image_url TEXT,
  stock INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela: reseller_stores (Supabase)

```sql
CREATE TABLE reseller_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID REFERENCES revendedoras(id),
  store_name VARCHAR(255),
  store_slug VARCHAR(100) UNIQUE,
  product_ids UUID[],
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela: orders (Supabase)

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID REFERENCES revendedoras(id),
  product_id UUID REFERENCES products(id),
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_document VARCHAR(14),
  amount DECIMAL(10,2) NOT NULL,
  reseller_amount DECIMAL(10,2),
  company_amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'pending',
  pagarme_order_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Fluxo de Cadastro de Revendedoras

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Revendedora acessa pagina Financeiro > Contas Bancarias      │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Sistema verifica status (GET /api/pagarme/revendedora-status)│
│    - Se ja tem recipient_id: exibe status                       │
│    - Se nao tem: exibe formulario                               │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Revendedora preenche formulario completo                     │
│    - Dados pessoais (nome, CPF, email, telefone, etc)           │
│    - Endereco completo                                          │
│    - Dados bancarios                                            │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Frontend valida todos os campos obrigatorios                 │
│    - CPF valido                                                 │
│    - Email com @                                                │
│    - Telefone com DDD                                           │
│    - Endereco completo                                          │
│    - Banco e conta preenchidos                                  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. POST /api/pagarme/onboarding-revendedora                     │
│    - Backend valida novamente                                   │
│    - Chama pagarmeService.createIndividualRecipient()           │
│    - Salva recipient_id na tabela revendedoras                  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Sucesso: Revendedora pode receber split de pagamentos        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sistema de Comissoes

### Pagina Admin: Comissoes

**Localizacao**: `src/pages/billing/Comissoes.tsx`

Permite ao administrador configurar os niveis de comissao:

```typescript
const niveisComissao = [
  { nivel: 'Iniciante', revendedora: 65, empresa: 35 },
  { nivel: 'Bronze', revendedora: 70, empresa: 30 },
  { nivel: 'Prata', revendedora: 75, empresa: 25 },
  { nivel: 'Ouro', revendedora: 80, empresa: 20 },
];
```

### Sincronizacao Automatica

Quando as comissoes sao alteradas na pagina admin, o sistema:

1. Atualiza a tabela de configuracao de comissoes
2. Sincroniza com todas as revendedoras do nivel correspondente
3. Atualiza o campo `comissao_percentual` na tabela `revendedoras`

---

## Split de Pagamentos

### Calculo do Split

```typescript
function calcularSplit(valorTotal: number, comissaoRevendedora: number) {
  const valorRevendedora = Math.round(valorTotal * (comissaoRevendedora / 100));
  const valorEmpresa = valorTotal - valorRevendedora;
  
  return {
    revendedora: valorRevendedora,
    empresa: valorEmpresa,
  };
}

// Exemplo: Venda de R$ 100,00 com revendedora nivel Prata (75%)
// Revendedora: R$ 75,00
// Empresa: R$ 25,00
```

### Payload de Split para Pagar.me

```typescript
const split = [
  {
    recipient_id: 'rp_empresa_xxx',     // ID do recebedor da empresa
    amount: 2500,                        // R$ 25,00 em centavos
    type: 'flat',
  },
  {
    recipient_id: 'rp_revendedora_xxx', // ID do recebedor da revendedora
    amount: 7500,                        // R$ 75,00 em centavos
    type: 'flat',
  },
];
```

---

## Checkout Publico

### URL da Loja Publica

```
/loja/:storeId
```

### URL do Checkout

```
/checkout/:productId?storeId=X
```

### Fluxo do Checkout Publico

1. Cliente acessa loja publica da revendedora
2. Seleciona produto e clica em comprar
3. Redirecionado para checkout com `storeId` na query
4. Preenche dados pessoais
5. Escolhe metodo de pagamento (PIX ou Cartao)
6. Sistema calcula split baseado na comissao da revendedora
7. Processa pagamento via Pagar.me
8. Divide valor automaticamente entre empresa e revendedora

### Seguranca do Checkout Publico

- Validacao server-side de precos (previne manipulacao)
- Produto validado contra `product_ids` da loja
- Usa anon key do Supabase (nao service-role)
- Nao expoe PII em respostas publicas

---

## Troubleshooting

### Erro: "action_forbidden - This company is not allowed to create a recipient"

**Causa**: O recurso Split/Marketplace nao esta ativado na conta Pagar.me.

**Solucao**:
1. Acessar dashboard.pagar.me
2. Ir em Suporte/Atendimento
3. Solicitar ativacao do recurso "Split/Marketplace"
4. Aguardar confirmacao da ativacao
5. Ativar em AMBOS ambientes: sandbox e producao

### Erro: Validacao de CPF/CNPJ

**Causa**: Documento invalido ou formato incorreto.

**Solucao**: 
- CPF deve ter 11 digitos
- CNPJ deve ter 14 digitos
- Remover pontuacao antes de enviar

### Erro: Dados bancarios invalidos

**Causa**: Codigo do banco, agencia ou conta incorretos.

**Solucao**:
- Verificar codigo do banco (3 digitos)
- Agencia sem digito verificador no campo principal
- Conta com digito verificador separado

### Erro: Endereco invalido

**Causa**: CEP inexistente ou endereco incompleto.

**Solucao**:
- Usar CEP valido de 8 digitos
- Preencher todos os campos obrigatorios
- Estado deve ser sigla de 2 letras (SP, RJ, etc)

---

## Arquivos Importantes

| Arquivo | Descricao |
|---------|-----------|
| `server/services/pagarme.ts` | Servico de integracao com API Pagar.me |
| `server/routes/pagarme.ts` | Endpoints da API de pagamentos |
| `src/features/revendedora/components/financial/ResellerBankSetup.tsx` | Formulario de cadastro bancario |
| `src/features/revendedora/pages/reseller/Financial.tsx` | Pagina financeira da revendedora |
| `src/pages/checkout/CheckoutPage.tsx` | Pagina de checkout |
| `src/pages/store/PublicStorePage.tsx` | Loja publica da revendedora |
| `src/pages/billing/Comissoes.tsx` | Configuracao de comissoes (admin) |
| `src/pages/billing/BankAccountSetup.tsx` | Cadastro bancario da empresa |

---

## Contatos e Suporte

- **Pagar.me Suporte**: suporte@pagar.me
- **Documentacao Pagar.me**: https://docs.pagar.me
- **Dashboard Pagar.me**: https://dashboard.pagar.me

---

*Documento gerado em Janeiro 2026*
*Versao 1.0*
