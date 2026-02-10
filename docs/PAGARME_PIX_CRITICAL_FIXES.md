# Correções Críticas do Sistema de Pagamentos Pagar.me

**Data:** 2026-01-27
**Autor:** Sistema ExecutiveAI Pro
**Versão:** 1.0

---

## RESUMO EXECUTIVO

Este documento registra as correções críticas aplicadas ao sistema de pagamentos Pagar.me que **DEVEM** ser preservadas em qualquer exportação/importação do código. Estas correções foram validadas pelo suporte oficial do Pagar.me e são obrigatórias para o funcionamento do PIX e pagamentos via cartão.

---

## PROBLEMA 1: Campo `closed: true` Ausente

### Descrição
A API Pagar.me V5 PSP **exige** o campo `closed: true` em todos os pedidos. Sem este campo, os pedidos podem ficar em estado pendente ou falhar.

### Antes (ERRADO)
```typescript
const orderData = {
  customer: {...},
  items: [...],
  payments: [paymentConfig],
};
```

### Depois (CORRETO)
```typescript
const orderData = {
  closed: true,  // OBRIGATÓRIO!
  customer: {...},
  items: [...],
  payments: [paymentConfig],
};
```

### Localização
- `server/services/pagarme.ts` → método `createPixOrder()`
- `server/services/pagarme.ts` → método `createCardOrder()`
- `server/services/pagarme.ts` → método `createCardOrderWithData()`

---

## PROBLEMA 2: Campo `expires_in` com Tipo Errado

### Descrição
O campo `expires_in` para pagamentos PIX **DEVE** ser uma STRING, não um número. A documentação oficial do Pagar.me especifica claramente que este campo aceita apenas strings.

### Antes (ERRADO)
```typescript
pix: {
  expires_in: 86400,  // NUMBER - ERRADO!
}
```

### Depois (CORRETO)
```typescript
pix: {
  expires_in: "86400",  // STRING - CORRETO!
  additional_information: [
    {
      name: 'Pedido',
      value: 'ExecutiveAI Pro'
    }
  ]
}
```

### Localização
- `server/services/pagarme.ts` → método `createPixOrder()`

---

## ESTRUTURA CORRETA DE PEDIDO PIX

```typescript
const orderData = {
  closed: true,  // OBRIGATÓRIO
  customer: {
    name: "Nome do Cliente",
    email: "email@exemplo.com",
    document: "12345678901",  // CPF sem formatação
    document_type: "CPF",
    type: "individual",
    phones: {
      mobile_phone: {
        country_code: "55",
        area_code: "11",
        number: "999999999"
      }
    },
    address: {
      line_1: "Rua, Número, Bairro",
      line_2: "Complemento",
      zip_code: "01310100",
      city: "São Paulo",
      state: "SP",
      country: "BR"
    }
  },
  items: [
    {
      amount: 29990,  // Centavos (R$ 299,90)
      description: "Produto",
      quantity: 1,
      code: "PROD001"
    }
  ],
  payments: [
    {
      payment_method: "pix",
      pix: {
        expires_in: "86400",  // STRING! Em segundos
        additional_information: [
          {
            name: "Pedido",
            value: "ExecutiveAI Pro"
          }
        ]
      },
      split: [  // Opcional - apenas se usar split
        {
          amount: 70,
          recipient_id: "re_xxxxxxxxxxxxxxx",
          type: "percentage",
          options: {
            charge_processing_fee: false,
            charge_remainder_fee: false,
            liable: false
          }
        },
        {
          amount: 30,
          recipient_id: "re_yyyyyyyyyyyyy",
          type: "percentage",
          options: {
            charge_processing_fee: true,
            charge_remainder_fee: true,
            liable: true
          }
        }
      ]
    }
  ]
};
```

---

## ARQUIVOS ESSENCIAIS DO SISTEMA PAGAR.ME

| Arquivo | Descrição |
|---------|-----------|
| `server/services/pagarme.ts` | Cliente da API Pagar.me - criação de pedidos, tokenização, recipients |
| `server/services/commission.ts` | Cálculo de comissões e tiers de split |
| `server/routes/pagarme.ts` | Rotas autenticadas (admin) |
| `server/routes/pagarmePublic.ts` | Rotas públicas para checkout |
| `server/routes/split.ts` | Gerenciamento de recipients e split |
| `server/routes/wallet.ts` | Sistema de carteira/créditos |

---

## VARIÁVEIS DE AMBIENTE OBRIGATÓRIAS

### Pagar.me (Produção)
```env
CHAVE_SECRETA_PRODUCAO=sk_live_xxxxxxxxxxxxxxxxx
CHAVE_PUBLICA_PRODUCAO=pk_live_xxxxxxxxxxxxxxxxx
```

### Pagar.me (Teste/Sandbox)
```env
CHAVE_SECRETA_TESTE=sk_test_xxxxxxxxxxxxxxxxx
CHAVE_PUBLICA_TESTE=pk_test_xxxxxxxxxxxxxxxxx
```

### Supabase Owner (Revendedoras)
```env
SUPABASE_OWNER_URL=https://xxx.supabase.co
SUPABASE_OWNER_SERVICE_KEY=eyJxxxxxxxxx
```

### Prioridade de Carregamento
O sistema carrega credenciais nesta ordem:
1. `CHAVE_SECRETA_PRODUCAO` (primeiro - prioridade máxima)
2. `CHAVE_SECRETA_TESTE` (fallback)
3. `CHAVE_SECRETA` (fallback legado)

---

## TABELAS SUPABASE NECESSÁRIAS

### Supabase Owner (revendedoras)
```sql
-- Tabela revendedoras precisa ter:
ALTER TABLE revendedoras
ADD COLUMN IF NOT EXISTS pagarme_recipient_id VARCHAR(255);
```

### Supabase Tenant (cliente)
```sql
-- Tabela platform_settings
CREATE TABLE IF NOT EXISTS platform_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  pagarme_company_recipient_id VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela commission_config
CREATE TABLE IF NOT EXISTS commission_config (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  use_dynamic_tiers BOOLEAN DEFAULT true,
  sales_tiers JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela sales_with_split
CREATE TABLE IF NOT EXISTS sales_with_split (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID,
  reseller_id UUID,
  company_id UUID,
  payment_method VARCHAR(50),
  total_amount DECIMAL(10,2),
  quantity INTEGER DEFAULT 1,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_document VARCHAR(20),
  pagarme_order_id VARCHAR(100),
  pagarme_charge_id VARCHAR(100),
  status VARCHAR(50),
  paid BOOLEAN DEFAULT false,
  commission_tier VARCHAR(50),
  reseller_percentage DECIMAL(5,2),
  company_percentage DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## TAXAS E COMISSÕES

### Taxas Fixas
| Taxa | Porcentagem | Descrição |
|------|-------------|-----------|
| Pagar.me | 3% | Taxa do gateway (descontada do liable) |
| Desenvolvedor | 3% | Taxa da plataforma |
| **Total Plataforma** | **6%** | Taxas fixas |

### Tiers de Comissão (do restante 94%)
| Tier | Volume Mensal | Revendedora | Empresa |
|------|---------------|-------------|---------|
| Iniciante | R$ 0 - 2.000 | 65% | 35% |
| Bronze | R$ 2.000 - 4.500 | 70% | 30% |
| Prata | R$ 4.500 - 10.000 | 75% | 25% |
| Ouro | > R$ 10.000 | 80% | 20% |

### Recipient ID do Desenvolvedor
```
re_cmkn7cdx110b10l9tp8yk0j92
```

---

## CHECKLIST DE EXPORTAÇÃO/IMPORTAÇÃO

Ao exportar o projeto para outro ambiente, verifique:

- [ ] Arquivo `server/services/pagarme.ts` contém `closed: true`
- [ ] Arquivo `server/services/pagarme.ts` converte `expires_in` para STRING
- [ ] Variáveis de ambiente configuradas (CHAVE_SECRETA_PRODUCAO, etc.)
- [ ] Tabela `revendedoras` tem coluna `pagarme_recipient_id`
- [ ] Tabela `platform_settings` existe no Supabase Tenant
- [ ] Tabela `commission_config` existe no Supabase Tenant
- [ ] Tabela `sales_with_split` existe no Supabase Tenant
- [ ] Arquivo `data/supabase-config.json` configurado (ou credenciais via env)

---

## REFERÊNCIAS

- **Documentação Oficial Pagar.me V5 PSP**: https://docs.pagar.me
- **Coleção Postman Oficial**: Fornecida pelo suporte Pagar.me (Janeiro 2026)
- **Suporte Pagar.me**: homologacao@pagar.me

---

## HISTÓRICO DE ALTERAÇÕES

| Data | Alteração |
|------|-----------|
| 2026-01-27 | Criação do documento com correções críticas PIX |
| 2026-01-27 | Adicionado `closed: true` em todos os métodos de criação de pedido |
| 2026-01-27 | Corrigido `expires_in` de NUMBER para STRING |
| 2026-01-27 | Adicionado `additional_information` para tracking |

---

**IMPORTANTE**: Este documento deve ser consultado sempre que houver problemas com pagamentos PIX ou cartão. As correções aqui documentadas foram validadas pelo suporte oficial do Pagar.me.
