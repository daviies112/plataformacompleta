# Fluxo de Dados: Form Submissions → Contracts

## Visão Geral

Este documento descreve o fluxo completo de dados entre a tabela `form_submissions` e a tabela `contracts`, incluindo todas as correções implementadas para garantir que os dados pessoais e de endereço sejam corretamente transferidos quando um contrato é criado a partir de uma reunião de vídeo.

## Problema Original

Quando um usuário saía de uma reunião (PublicMeetingRoom) e o contrato era criado automaticamente, os dados de endereço não estavam sendo salvos na tabela `contracts`, mesmo existindo na tabela `form_submissions`.

### Causas Identificadas:
1. **Busca por telefone rígida**: O sistema não encontrava registros porque comparava formatos de telefone diferentes (ex: `553192267220@s.whatsapp.net` vs `(31) 9226-7220`)
2. **Frontend não enviava endereço**: O frontend (PublicMeetingRoom.tsx) não estava conseguindo obter/enviar os dados de endereço para o backend
3. **Mapeamento de colunas incorreto**: O campo `address_neighborhood` não existe na tabela `contracts`

## Solução Implementada

### 1. Padrão Flexível de Busca por Telefone

**Arquivo**: `server/routes/meetings.ts` (endpoint `/api/public/reunioes/:id/participant-data`)

O sistema agora usa um padrão flexível com wildcards para buscar por telefone:

```typescript
// Extrai últimos 9 dígitos do telefone
const phoneDigits = phone.replace(/\D/g, '');
const lastDigits = phoneDigits.slice(-9);

// Cria padrão flexível: %1%9%2%2%6%7%2%2%0%
const flexiblePattern = '%' + lastDigits.split('').join('%') + '%';

// Busca no Supabase usando ILIKE
const { data } = await supabaseClient
  .from('form_submissions')
  .select('*')
  .ilike('contact_phone', flexiblePattern);
```

Este padrão permite encontrar telefones independente do formato:
- `(31) 9226-7220`
- `31922672200`
- `553192267220@s.whatsapp.net`
- `+55 31 9226-7220`

### 2. Fallback Automático no Backend

**Arquivo**: `server/routes/assinatura.ts` (endpoint `POST /contracts`)

Quando o contrato é criado e o frontend não envia o endereço, o backend busca automaticamente:

```typescript
// Se o client_address não foi recebido do frontend, buscar automaticamente
let finalAddress = client_address;
if (!finalAddress && (client_phone || client_email)) {
  console.log(`[Assinatura] Endereço não recebido do frontend - buscando automaticamente...`);
  
  const { getClienteSupabase } = await import('../lib/clienteSupabase.js');
  const supabaseClient = await getClienteSupabase();
  
  // Busca por telefone primeiro (mais confiável)
  if (client_phone) {
    const flexPattern = '%' + lastDigits.split('').join('%') + '%';
    const { data } = await supabaseClient
      .from('form_submissions')
      .select('address_street, address_number, address_complement, address_city, address_state, address_cep')
      .ilike('contact_phone', flexPattern)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      finalAddress = {
        street: data[0].address_street,
        number: data[0].address_number,
        complement: data[0].address_complement,
        city: data[0].address_city,
        state: data[0].address_state,
        zipcode: data[0].address_cep
      };
    }
  }
  
  // Fallback para email se não encontrou por telefone
  if (!finalAddress && client_email) {
    // ... busca similar por email
  }
}
```

### 3. Mapeamento de Colunas

| form_submissions | contracts | Descrição |
|-----------------|-----------|-----------|
| `contact_name` | `client_name` | Nome do cliente |
| `contact_email` | `client_email` | Email do cliente |
| `contact_phone` | `client_phone` | Telefone do cliente |
| `contact_cpf` | `client_cpf` | CPF do cliente |
| `address_street` | `address_street` | Rua/Logradouro |
| `address_number` | `address_number` | Número |
| `address_complement` | `address_complement` | Complemento |
| `address_city` | `address_city` | Cidade |
| `address_state` | `address_state` | Estado |
| `address_cep` | `address_zipcode` | CEP (ATENÇÃO: nome diferente!) |
| `address_neighborhood` | *(não existe)* | Bairro - não tem coluna no contracts |

### 4. Fluxo Completo de Criação de Contrato

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. REUNIÃO                                                      │
│    Usuário entra na reunião via PublicMeetingRoom               │
│    roomId100ms: 696e3e7f58b83c59b5667c42                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. SAÍDA DA REUNIÃO (handleLeaveMeeting)                        │
│    Frontend chama: GET /api/public/reunioes/{roomId}/participant-data │
│    → Busca dados do form_submission pelo telefone/email         │
│    → Retorna: nome, cpf, email, telefone, endereco              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. CRIAÇÃO DO CONTRATO                                          │
│    Frontend chama: POST /api/assinatura/public/contracts        │
│    → Se client_address não recebido: BACKEND BUSCA AUTOMATICAMENTE │
│    → Salva no local storage E no Supabase (tabela contracts)    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. RESULTADO                                                    │
│    Contrato criado com todos os dados:                          │
│    - client_name, client_cpf, client_email, client_phone        │
│    - address_street, address_number, address_complement         │
│    - address_city, address_state, address_zipcode               │
└─────────────────────────────────────────────────────────────────┘
```

## Arquivos Críticos (Preservar na Exportação)

### Backend
- `server/routes/assinatura.ts` - Criação de contratos com fallback automático
- `server/routes/meetings.ts` - Endpoint participant-data com busca flexível
- `server/services/assinatura-supabase.ts` - Serviço de integração com Supabase
- `server/lib/clienteSupabase.ts` - Configuração do cliente Supabase

### Frontend
- `src/pages/PublicMeetingRoom.tsx` - Fluxo de saída da reunião

### Configuração
- `data/supabase_client_config.json` - Credenciais do Supabase do cliente
- `data/assinatura_contracts.json` - Backup local dos contratos
- `data/assinatura_supabase_config.json` - Config do serviço de assinatura

## Logs de Debug

O sistema gera logs detalhados para debug:

```
[ParticipantData] Supabase: buscando por telefone, padrão flexível: %1%9%2%2%6%7%2%2%0%
[ParticipantData] Supabase: encontrado por telefone: ee5171c7-509a-...
[ParticipantData] Form submission encontrado: ..., nome: Davi Emerick, cpf: presente
[ParticipantData] Endereço: CEP=30510690, Rua=Seringueira, Num=350, Cidade=BH, Estado=Mg

[Assinatura] Criando novo contrato para Davi Emerick, telefone: (31) 9226-7220, email: ...
[Assinatura] Endereço não recebido do frontend - buscando automaticamente do form_submissions...
[Assinatura] ✅ Endereço obtido do form_submission: rua=Seringueira, num=350, cidade=BH, cep=30510690
```

## Tabela contracts - Estrutura

```sql
CREATE TABLE contracts (
  id UUID PRIMARY KEY,
  user_id UUID,
  contract_html TEXT,
  contract_pdf_url TEXT,
  status VARCHAR,
  created_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  protocol_number VARCHAR,
  client_name VARCHAR,
  client_cpf VARCHAR,
  client_email VARCHAR,
  client_phone VARCHAR,
  access_token UUID,
  logo_url TEXT,
  -- ... outros campos de customização ...
  address_street VARCHAR,      -- Rua
  address_number VARCHAR,      -- Número
  address_complement VARCHAR,  -- Complemento
  address_city VARCHAR,        -- Cidade
  address_state VARCHAR,       -- Estado
  address_zipcode VARCHAR      -- CEP (mapeado de address_cep)
);
```

## Checklist para Exportação

Antes de exportar o projeto, verificar:

- [ ] `data/supabase_client_config.json` existe e tem credenciais válidas
- [ ] `server/routes/assinatura.ts` contém o fallback automático de endereço
- [ ] `server/routes/meetings.ts` contém a busca flexível por telefone
- [ ] `src/pages/PublicMeetingRoom.tsx` usa `data?.reuniao?.roomId100ms`
- [ ] Tabela `contracts` no Supabase tem as colunas de endereço

## Pós-Finalização do Contrato (Automações)

Quando o contrato é finalizado (`POST /api/assinatura/contracts/:id/finalize`), as seguintes automações são executadas:

### 1. Criação Automática de Revendedora
```typescript
createRevendedoraFromContract(contract)
```
- Usa `getSupabaseMasterForTenant()` com `service_role_key` para bypassar RLS
- Cria registro na tabela `revendedoras` com:
  - `email`: email do cliente (usado para login)
  - `cpf`: CPF normalizado (usado como senha)
  - `senha_hash`: hash SHA-256 do CPF
  - `admin_id`: tenant_id do contrato
  - `status`: 'ativo'

### 2. Criação Automática de Envio (Código de Rastreio)
```typescript
createEnvioFromContract(contract)
```
- Cria registro na tabela `envios` com dados do destinatário do contrato
- Gera automaticamente `codigo_rastreio` no formato `ME123456789BR`
- O código aparece na página de Envios para impressão

**Logs esperados após finalização:**
```
[NEXUS] ✅ Revendedora criada automaticamente: email@example.com (CPF: 12345678901)
[ENVIO] ✅ Envio criado automaticamente: {uuid}, código: ME123456789BR
```

## Histórico de Correções

| Data | Correção | Arquivo |
|------|----------|---------|
| 2026-01-19 | Implementação do padrão flexível de busca por telefone | server/routes/meetings.ts |
| 2026-01-19 | Fallback automático de busca de endereço no backend | server/routes/assinatura.ts |
| 2026-01-19 | Correção do mapeamento address_cep → address_zipcode | server/routes/assinatura.ts |
| 2026-01-19 | Remoção do campo address_neighborhood (não existe na tabela) | server/services/assinatura-supabase.ts |
| 2026-01-19 | Uso do roomId100ms correto no frontend | src/pages/PublicMeetingRoom.tsx |
| 2026-01-19 | Correção RLS: usar getSupabaseMasterForTenant com service_role_key | server/routes/assinatura.ts |
| 2026-01-19 | Criação automática de envio com código de rastreio | server/routes/assinatura.ts |
