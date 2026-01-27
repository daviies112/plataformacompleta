# BigDataCorp CPF Compliance - Documentação Completa

## Visão Geral

O sistema de consulta CPF utiliza a API BigDataCorp para validar pessoas físicas através de 3 APIs simultâneas:
- **basic_data** (R$0,030) - Dados básicos e validação do CPF
- **collections** (R$0,070) - Histórico de dívidas e pendências financeiras  
- **processes** (R$0,070) - Processos judiciais

**Custo total por consulta nova: R$ 0,17**

---

## Arquitetura de Armazenamento

### Dual Supabase

| Banco | Propósito | Tabela Principal | Dados |
|-------|-----------|------------------|-------|
| **Supabase Master** | Cache global multi-tenant | `datacorp_checks` | Payload completo das 3 APIs |
| **Supabase Cliente** | Resumo para N8N/WhatsApp | `cpf_compliance_results` | Dados resumidos |

### Fluxo de Dados

```
Usuário → POST /api/compliance/check
         ↓
    Verifica Cache (datacorp_checks)
         ↓
    [Cache HIT] → Cria novo registro com origin_check_id → Retorna dados
    [Cache MISS] → Consulta 3 APIs BigDataCorp → Salva → Retorna dados
         ↓
    Salva resumo em cpf_compliance_results (Cliente)
```

---

## Configuração de Credenciais

### Método 1: Banco de Dados (Recomendado - Multi-tenant)

As credenciais são salvas na tabela `bigdatacorp_config` do PostgreSQL local:

```sql
CREATE TABLE bigdatacorp_config (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  token_id TEXT NOT NULL,           -- Encriptado AES-256
  chave_token TEXT NOT NULL,        -- Encriptado AES-256
  supabase_master_url TEXT,         -- Encriptado AES-256
  supabase_master_service_role_key TEXT, -- Encriptado AES-256
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Caminho no Frontend:** `/configuracoes` → Aba "Consulta CPF"

### Método 2: Environment Variables (Fallback)

```bash
# BigDataCorp API
TOKEN_ID=seu_token_id
CHAVE_TOKEN=sua_chave_secreta

# Supabase Master (Cache Global)
SUPABASE_MASTER_URL=https://xxxxx.supabase.co
SUPABASE_MASTER_SERVICE_ROLE_KEY=eyJhbGci...

# Supabase Owner (Autenticação Revendedoras - Opcional)
SUPABASE_OWNER_URL=https://xxxxx.supabase.co
SUPABASE_OWNER_SERVICE_KEY=eyJhbGci...
```

### Prioridade de Credenciais

1. **Banco de dados** (`bigdatacorp_config` por tenant_id)
2. **Environment variables** (fallback global)

---

## Tabelas do Supabase

### 1. datacorp_checks (Supabase Master)

```sql
CREATE TABLE datacorp_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf_hash TEXT NOT NULL,                    -- SHA-256 do CPF (LGPD)
  cpf_encrypted TEXT NOT NULL,               -- CPF encriptado AES-256
  tenant_id UUID NOT NULL,
  lead_id UUID,
  submission_id UUID,
  person_name TEXT,                          -- Nome da pessoa
  person_cpf TEXT,                           -- CPF formatado (exibição)
  status TEXT NOT NULL,                      -- approved/rejected/manual_review/error/pending
  risk_score NUMERIC(5,2),                   -- Score de risco 0-10
  payload JSONB NOT NULL,                    -- Payload completo das 3 APIs
  consulted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  source TEXT DEFAULT 'bigdatacorp_v3_complete', -- Fonte da consulta
  api_cost NUMERIC(10,2) DEFAULT 0.17,       -- Custo da API
  created_by UUID,
  origin_check_id UUID,                      -- Referência ao cache original
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices importantes
CREATE INDEX idx_cpf_hash ON datacorp_checks(cpf_hash);
CREATE INDEX idx_tenant_id ON datacorp_checks(tenant_id);
CREATE INDEX idx_consulted_at ON datacorp_checks(consulted_at DESC);
CREATE INDEX idx_cache_lookup ON datacorp_checks(cpf_hash, tenant_id, expires_at);
```

### 2. cpf_compliance_results (Supabase Cliente)

```sql
CREATE TABLE cpf_compliance_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf VARCHAR(14) NOT NULL,
  nome TEXT,
  telefone VARCHAR(20),
  status VARCHAR(50) NOT NULL,
  dados BOOLEAN DEFAULT false,
  risco NUMERIC(4,2) DEFAULT 0,
  processos INTEGER DEFAULT 0,
  aprovado BOOLEAN DEFAULT false,
  data_consulta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  check_id UUID,                             -- Referência ao datacorp_checks
  processado_whatsapp BOOLEAN DEFAULT false,
  processado_whatsapp_n8n BOOLEAN DEFAULT false, -- Para automação N8N
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cpf_compliance_results_cpf ON cpf_compliance_results(cpf);
CREATE INDEX idx_cpf_compliance_results_status ON cpf_compliance_results(status);
CREATE INDEX idx_cpf_compliance_results_n8n ON cpf_compliance_results(processado_whatsapp_n8n);
```

---

## Arquivos de Código

| Arquivo | Descrição |
|---------|-----------|
| `server/lib/bigdatacorpClient.ts` | Cliente HTTP para API BigDataCorp |
| `server/lib/datacorpCompliance.ts` | Lógica de negócio (cache, análise de risco) |
| `server/lib/supabaseMaster.ts` | Conexão com Supabase Master |
| `server/lib/clienteSupabase.ts` | Conexão com Supabase Cliente |
| `server/lib/cpfCompliancePoller.ts` | Automação de polling |
| `server/routes/compliance.ts` | Rotas da API REST |
| `src/pages/consultar-cpf.tsx` | Página frontend |
| `src/components/compliance/*` | Componentes React |

---

## Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/compliance/check` | Consultar CPF |
| GET | `/api/compliance/history` | Histórico de consultas |
| GET | `/api/compliance/check/:id` | Detalhes de uma consulta |
| POST | `/api/compliance/reprocess/:id` | Reprocessar consulta |
| GET | `/api/compliance/download-pdf/:id` | Baixar PDF |
| GET | `/api/compliance/stats` | Estatísticas |
| GET | `/api/compliance/recent` | Consultas recentes |
| GET | `/api/compliance/master-checks` | Lista do Master |

---

## Sistema de Cache

### Como Funciona

1. **Cache Expiry:** 7 dias por padrão
2. **Lookup:** Busca por `cpf_hash` + `tenant_id` + `expires_at > now()`
3. **Cache Hit:** Cria novo registro com `source: 'cache_hit_manual'` ou `'reused_from_cache'`
4. **Cache Miss:** Consulta BigDataCorp e salva com `source: 'bigdatacorp_v3_complete'`

### Valores do Campo `source`

| Valor | Descrição | Custo API |
|-------|-----------|-----------|
| `bigdatacorp_v3_complete` | Consulta nova às 3 APIs | R$ 0,17 |
| `cache_hit_manual` | Cache hit em consulta manual | R$ 0,00 |
| `reused_from_cache` | Cache hit em automação | R$ 0,00 |

### Campo `origin_check_id`

Quando uma consulta usa dados do cache, o campo `origin_check_id` aponta para o registro original que contém o payload completo. Isso permite:
- Rastreabilidade completa
- Evitar duplicação de payload
- Economia de armazenamento

---

## Estrutura do Payload

O payload salvo em `datacorp_checks.payload` contém:

```json
{
  "_basic_data": {
    "Result": [{
      "BasicData": {
        "Name": "NOME COMPLETO",
        "CPF": "12345678901",
        "BirthDate": "1990-01-01",
        "Age": 35,
        "Gender": "M",
        "MotherName": "...",
        "TaxIdStatus": "Regular",
        "TaxIdStatusDate": "2024-01-01"
      }
    }]
  },
  "_collections": {
    "Result": [{
      "Collections": {
        "TotalCollections": 0,
        "CollectionsList": []
      }
    }]
  },
  "Result": [{
    "Processes": {
      "TotalLawsuits": 5,
      "TotalLawsuitsAsAuthor": 4,
      "TotalLawsuitsAsDefendant": 1,
      "FirstLawsuitDate": "2020-01-01",
      "LastLawsuitDate": "2024-06-01",
      "Lawsuits": [...]
    }
  }]
}
```

---

## Arquivos de Estado (Exportar do GitHub)

Estes arquivos em `data/` mantêm estado da aplicação e **devem ser exportados**:

| Arquivo | Descrição |
|---------|-----------|
| `data/supabase-config.json` | Credenciais do Supabase Cliente |
| `data/credentials.json` | Credenciais diversas |
| `data/automation_state.json` | Estado de automações |
| `data/cpf_compliance_poller_state.json` | Estado do poller CPF |
| `data/cpf_processed_ids.json` | IDs já processados |
| `data/cpf_auto_check_processed.json` | CPFs auto-verificados |

**IMPORTANTE:** A pasta `data/` contém dados sensíveis e deve ser tratada com cuidado. Não comitar em repositórios públicos.

---

## Configuração Pós-Importação

### 1. Criar Tabelas no Supabase Master

Execute o SQL da seção "datacorp_checks" no Supabase Master.

### 2. Criar Tabelas no Supabase Cliente

Execute o SQL da seção "cpf_compliance_results" no Supabase Cliente.

### 3. Configurar Credenciais

**Opção A - Via Interface:**
1. Acesse `/configuracoes`
2. Aba "Consulta CPF"
3. Preencha TOKEN_ID, CHAVE_TOKEN
4. Preencha URL e Service Key do Supabase Master

**Opção B - Via Environment Variables:**
Configure as variáveis na aba Secrets do Replit.

### 4. Verificar Funcionamento

1. Acesse `/consultar-cpf`
2. Faça uma consulta de teste
3. Verifique se aparece no histórico
4. Verifique se salvou no Supabase Cliente

---

## Troubleshooting

### Consulta não aparece no histórico

**Causa:** Registro não sendo criado no `datacorp_checks`

**Solução:** Verificar logs do servidor para erros de insert no Supabase Master

### Nome aparece como "N/A"

**Causa:** Campo `person_name` não preenchido

**Solução:** Verificar se o payload da API contém `_basic_data.Result[0].BasicData.Name`

### Erro "Supabase Master não configurado"

**Causa:** Credenciais ausentes

**Solução:** 
1. Verificar se `bigdatacorp_config` tem registro para o tenant
2. Ou configurar env vars `SUPABASE_MASTER_URL` e `SUPABASE_MASTER_SERVICE_ROLE_KEY`

### Erro "service_role key required"

**Causa:** Usando chave `anon` ao invés de `service_role`

**Solução:** No Supabase Dashboard → Settings → API → Copiar "service_role" key

---

## Segurança (LGPD)

1. **CPF nunca armazenado em texto plano:**
   - `cpf_hash`: SHA-256 para lookup
   - `cpf_encrypted`: AES-256 para recuperação

2. **Credenciais encriptadas:**
   - Todas as credenciais no banco usam AES-256
   - Chave de encriptação em `CREDENTIALS_ENCRYPTION_KEY`

3. **RLS recomendado:**
   - Habilitar Row Level Security no Supabase
   - Service role bypassa RLS (cuidado)

---

## Resumo para Exportação GitHub

### Arquivos que DEVEM estar no repositório:

```
server/lib/bigdatacorpClient.ts
server/lib/datacorpCompliance.ts
server/lib/supabaseMaster.ts
server/lib/clienteSupabase.ts
server/lib/cpfCompliancePoller.ts
server/lib/complianceStorage.ts
server/routes/compliance.ts
shared/db-schema.ts (tabelas bigdatacorpConfig, datacorpChecks)
src/pages/consultar-cpf.tsx
src/components/compliance/*
```

### Arquivos que DEVEM ser criados pós-importação:

```
data/supabase-config.json (credenciais Supabase Cliente)
data/credentials.json (credenciais diversas)
```

### Tabelas que DEVEM existir:

```
PostgreSQL Local:
- bigdatacorp_config
- datacorp_checks (opcional, pode usar só Supabase)

Supabase Master:
- datacorp_checks

Supabase Cliente:
- cpf_compliance_results
```

### Environment Variables necessárias:

```
# Obrigatórias para BigDataCorp funcionar (se não usar banco)
TOKEN_ID
CHAVE_TOKEN
SUPABASE_MASTER_URL
SUPABASE_MASTER_SERVICE_ROLE_KEY

# Opcionais (já configuradas no banco via interface)
SUPABASE_OWNER_URL
SUPABASE_OWNER_SERVICE_KEY
```

---

**Última atualização:** 2026-01-27

**Autor:** Replit Agent
