# Verificação e Criação de Tabelas para Sistema de SPLIT

**Data:** 26 de Janeiro de 2026  
**Status:** ✅ CONCLUÍDO

## 1. Verificação de Tabelas Existentes

Endpoint utilizado: `GET /api/health/supabase-tables`

### Resultado da Verificação:

| Tabela | Existe | Registros | Ação |
|--------|--------|-----------|------|
| `sales_with_split` | ✅ Sim | 22 | Manter |
| `reseller_stores` | ✅ Sim | 3 | Manter |
| `products` | ✅ Sim | 4 | Manter |
| `bank_accounts` | ✅ Sim | 2 | Manter |
| `withdrawals` | ✅ Sim | 1 | Manter |
| `commission_config` | ✅ Sim | 1 | Verificar/Manter |
| `platform_settings` | ❌ Não | - | **CRIAR** |

## 2. Arquivo SQL Criado

**Arquivo:** `docs/SQL_SETUP_SPLIT_TABLES.sql`  
**Tamanho:** 7.3 KB  
**Linhas:** 196  
**Statements SQL:** 18

### Conteúdo:

#### 2.1 Tabela: `platform_settings`

Armazena configurações globais da plataforma.

**Campos:**
- `id` (TEXT, PRIMARY KEY, DEFAULT 'default') - ID única, sempre 'default'
- `pagarme_company_recipient_id` (VARCHAR) - ID do recipient da empresa no Pagar.me
- `pagarme_api_key_test` (VARCHAR) - Chave de API teste
- `pagarme_api_key_live` (VARCHAR) - Chave de API produção
- `use_live_mode` (BOOLEAN, DEFAULT FALSE) - Flag para modo live
- `updated_at` (TIMESTAMPTZ) - Timestamp de atualização
- Metadados: `created_at`, `created_by`, `updated_by`

**Constraint:**
- Apenas um registro pode existir (id = 'default')

#### 2.2 Tabela: `commission_config`

Armazena configuração de tiers de comissão.

**Campos:**
- `id` (TEXT, PRIMARY KEY, DEFAULT 'default') - ID única, sempre 'default'
- `use_dynamic_tiers` (BOOLEAN, DEFAULT TRUE) - Ativa tiers dinâmicos
- `sales_tiers` (JSONB) - Array JSON com configuração de tiers
- `updated_at` (TIMESTAMPTZ) - Timestamp de atualização
- Metadados: `created_at`, `created_by`, `updated_by`

**Estrutura de `sales_tiers` (JSON):**
```json
[
  {
    "id": "1",
    "name": "Iniciante",
    "min_monthly_sales": 0,
    "max_monthly_sales": 2000,
    "reseller_percentage": 65,
    "company_percentage": 35
  },
  {
    "id": "2",
    "name": "Bronze",
    "min_monthly_sales": 2000,
    "max_monthly_sales": 4500,
    "reseller_percentage": 70,
    "company_percentage": 30
  },
  {
    "id": "3",
    "name": "Prata",
    "min_monthly_sales": 4500,
    "max_monthly_sales": 10000,
    "reseller_percentage": 75,
    "company_percentage": 25
  },
  {
    "id": "4",
    "name": "Ouro",
    "min_monthly_sales": 10000,
    "max_monthly_sales": null,
    "reseller_percentage": 80,
    "company_percentage": 20
  }
]
```

## 3. Dados Padrão Inseridos

### 3.1 `platform_settings` (id='default')
```sql
INSERT INTO public.platform_settings (
    id,
    pagarme_company_recipient_id,
    pagarme_api_key_test,
    pagarme_api_key_live,
    use_live_mode,
    created_by,
    updated_by
) VALUES (
    'default',
    NULL,                      -- A ser preenchido
    NULL,                      -- A ser preenchido
    NULL,                      -- A ser preenchido
    FALSE,                     -- Modo teste por padrão
    'system',
    'system'
);
```

### 3.2 `commission_config` (id='default')
```sql
INSERT INTO public.commission_config (
    id,
    use_dynamic_tiers,
    sales_tiers,
    created_by,
    updated_by
) VALUES (
    'default',
    TRUE,                      -- Ativa tiers dinâmicos
    '[4 tiers JSON]',
    'system',
    'system'
);
```

## 4. Segurança (RLS - Row Level Security)

Ambas as tabelas têm RLS habilitado com as seguintes políticas:

1. **service_role** - Acesso total (backend)
2. **Usuários autenticados** - Leitura das configurações públicas

## 5. Como Executar

1. Acesse o **Supabase Dashboard** do seu projeto
2. Vá para **SQL Editor**
3. Cole todo o conteúdo de `docs/SQL_SETUP_SPLIT_TABLES.sql`
4. Clique em **Run**
5. Verifique os dados com:
   ```sql
   SELECT * FROM public.platform_settings;
   SELECT * FROM public.commission_config;
   ```

## 6. Próximos Passos

1. ✅ Criar as tabelas (executar o SQL acima)
2. Configure o `pagarme_company_recipient_id` em `platform_settings`
3. Configure as chaves de API (`pagarme_api_key_test` e `pagarme_api_key_live`)
4. Ajuste os tiers em `commission_config` se necessário
5. Teste o sistema de split no checkout

## 7. Integração com Código Existente

O arquivo `server/services/commission.ts` já está preparado para usar essas tabelas:

- ✅ `getCommissionConfig()` - Lê de `commission_config`
- ✅ `getCompanyRecipientId()` - Lê de `platform_settings`
- ✅ `saveCompanyRecipientId()` - Escreve em `platform_settings`
- ✅ Cálculo de tiers dinâmicos baseado em `sales_tiers`

## 8. Verificação Final

Para verificar se tudo foi criado corretamente:

```sql
-- Verificar platform_settings
SELECT id, pagarme_company_recipient_id, use_live_mode, created_at FROM public.platform_settings;

-- Verificar commission_config
SELECT id, use_dynamic_tiers, created_at FROM public.commission_config;

-- Verificar tiers (expandir JSON)
SELECT 
    id,
    jsonb_array_length(sales_tiers) as number_of_tiers,
    sales_tiers
FROM public.commission_config 
WHERE id = 'default';
```

---

**Arquivo criado em:** `docs/SQL_SETUP_SPLIT_TABLES.sql`  
**Tamanho:** 7.3 KB  
**Status:** ✅ Pronto para execução
