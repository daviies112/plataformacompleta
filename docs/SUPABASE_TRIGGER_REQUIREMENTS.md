# Requisitos do Trigger Supabase para Automação

## Visão Geral

Quando um contrato é marcado como `status = 'signed'` na tabela `contracts`, o trigger do Supabase deve criar registros nas tabelas `revendedoras` e `envios`.

## Requisitos Críticos

### 1. Tabela `revendedoras` (Login da Revendedora)

O sistema de login (`/api/reseller/login`) busca por:

```sql
SELECT * FROM revendedoras 
WHERE email = '<email>' 
  AND cpf = '<cpf_normalizado_11_digitos>' 
  AND status = 'ativo'
```

**Campos OBRIGATÓRIOS para login funcionar:**

| Campo | Formato | Exemplo | Obrigatório |
|-------|---------|---------|-------------|
| `email` | string | `cliente@email.com` | ✅ SIM |
| `cpf` | string (11 dígitos, SEM formatação) | `12345678901` | ✅ SIM |
| `status` | string | `ativo` | ✅ SIM (CRÍTICO!) |
| `admin_id` | string (UUID do tenant) | `dev-daviemericko_gmail_com` | ✅ SIM |
| `nome` | string | `João Silva` | Opcional |

**⚠️ IMPORTANTE:**
- O `cpf` DEVE estar **normalizado** (apenas números, 11 dígitos)
- O `status` DEVE ser `'ativo'` para login funcionar imediatamente
- Se `status = 'pendente'`, o login será **BLOQUEADO**

**Exemplo de INSERT no trigger:**
```sql
INSERT INTO revendedoras (admin_id, nome, email, cpf, status, created_at)
VALUES (
  NEW.user_id,
  NEW.client_name,
  NEW.client_email,
  regexp_replace(NEW.client_cpf, '[^0-9]', '', 'g'),  -- Remove formatação
  'ativo',  -- IMPORTANTE: 'ativo' para login imediato
  NOW()
);
```

### 2. Tabela `envios` (Código de Rastreio)

O sistema de envios (`/api/envio/envios`) busca por:

```sql
SELECT * FROM envios 
WHERE admin_id = '<tenant_id>'
ORDER BY created_at DESC
```

**Campos OBRIGATÓRIOS para aparecer na lista:**

| Campo | Formato | Origem (contracts) | Obrigatório |
|-------|---------|-------------------|-------------|
| `admin_id` | string (UUID do tenant) | `user_id` | ✅ SIM |
| `contract_id` | UUID | `id` | Recomendado |
| `destinatario_nome` | string | `client_name` | ✅ SIM |
| `destinatario_email` | string | `client_email` | Opcional |
| `destinatario_cep` | string | `address_zipcode` | ✅ SIM |
| `destinatario_logradouro` | string | `address_street` | Opcional |
| `destinatario_numero` | string | `address_number` | Opcional |
| `destinatario_cidade` | string | `address_city` | Opcional |
| `destinatario_uf` | string (2 chars) | `address_state` | Opcional |
| `status` | string | `'pendente'` (fixo) | ✅ SIM |
| `codigo_rastreio` | string | Gerar automaticamente | Opcional |

**⚠️ IMPORTANTE:**
- O `admin_id` DEVE corresponder ao tenant logado para aparecer na lista
- Se `admin_id` não estiver correto, o envio **NÃO APARECERÁ** na página

**Exemplo de INSERT no trigger:**
```sql
INSERT INTO envios (
  admin_id, 
  contract_id, 
  destinatario_nome, 
  destinatario_email,
  destinatario_cep,
  destinatario_logradouro,
  destinatario_numero,
  destinatario_cidade,
  destinatario_uf,
  status,
  created_at
)
VALUES (
  NEW.user_id,
  NEW.id,
  NEW.client_name,
  NEW.client_email,
  NEW.address_zipcode,
  NEW.address_street,
  NEW.address_number,
  NEW.address_city,
  NEW.address_state,
  'pendente',
  NOW()
);
```

## Mapeamento Completo (contracts → destino)

### contracts → revendedoras

| contracts | revendedoras | Transformação |
|-----------|-------------|---------------|
| `client_name` | `nome` | Direto |
| `client_email` | `email` | Direto (chave única) |
| `client_cpf` | `cpf` | Remover formatação: `regexp_replace(cpf, '[^0-9]', '', 'g')` |
| `user_id` | `admin_id` | Direto |
| - | `status` | Valor fixo: `'ativo'` |

### contracts → envios

| contracts | envios | Observação |
|-----------|--------|------------|
| `id` | `contract_id` | Para rastreabilidade |
| `user_id` | `admin_id` | CRÍTICO: para filtrar por tenant |
| `client_name` | `destinatario_nome` | Identificação no pacote |
| `client_email` | `destinatario_email` | Notificação |
| `address_zipcode` | `destinatario_cep` | Cálculo de rota |
| `address_street` | `destinatario_logradouro` | Endereço |
| `address_number` | `destinatario_numero` | Endereço |
| `address_city` | `destinatario_cidade` | Cidade |
| `address_state` | `destinatario_uf` | Estado (UF) |
| - | `status` | Valor fixo: `'pendente'` |

## Verificação

Após o trigger executar, verifique:

1. **Revendedoras:**
```sql
SELECT id, email, cpf, status, admin_id 
FROM revendedoras 
WHERE email = 'email_do_cliente@exemplo.com';
```
- CPF deve ter 11 dígitos (sem pontos/traços)
- Status deve ser `ativo`

2. **Envios:**
```sql
SELECT id, admin_id, destinatario_nome, status 
FROM envios 
WHERE contract_id = 'uuid_do_contrato';
```
- admin_id deve corresponder ao tenant

## Debugging

Se login não funciona:
1. Verificar se `status = 'ativo'`
2. Verificar se `cpf` está normalizado (11 dígitos)
3. Verificar se existe registro com email E cpf

Se envio não aparece na lista:
1. Verificar se `admin_id` corresponde ao tenant logado
2. Verificar se registro existe na tabela `envios`
