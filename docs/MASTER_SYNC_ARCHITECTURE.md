# Arquitetura de Sincronização Master-Cliente

## Visão Geral

Este documento descreve a arquitetura de sincronização entre o Supabase Master (central) e os Supabase Clientes (por admin).

## Diagrama da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE MASTER                                    │
│                     (Credenciais nos Secrets)                                │
│                                                                             │
│  ┌───────────────┐  ┌─────────────────────────┐  ┌──────────────────────┐  │
│  │    admins     │  │ admin_supabase_creds    │  │    revendedoras      │  │
│  │               │  │                         │  │   (CENTRALIZADA)     │  │
│  │ id, email     │──│ admin_id                │──│ admin_id, email      │  │
│  │ nome, status  │  │ supabase_url            │  │ cpf, nome, status    │  │
│  │               │  │ supabase_anon_key       │  │ comissao_padrao      │  │
│  │               │  │ supabase_service_key    │  │ contract_id          │  │
│  └───────────────┘  └─────────────────────────┘  └──────────────────────┘  │
│         │                      │                          │                 │
│         │                      │                          │                 │
│         ▼                      ▼                          ▼                 │
│    Admin A, B, C          Creds A, B, C            A1, A2, B1, B2...       │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Servidor busca credenciais
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SERVIDOR (Node.js/Express)                          │
│                                                                             │
│  ┌─────────────────────────┐    ┌─────────────────────────┐                │
│  │   masterSyncService.ts  │    │  contractSyncPoller.ts  │                │
│  │                         │    │                         │                │
│  │ - getAdminCredentials() │    │ - Polling a cada 30s    │                │
│  │ - createTenantClient()  │    │ - Processa sync_queue   │                │
│  │ - validateLogin()       │    │ - Cria revendedoras     │                │
│  └─────────────────────────┘    └─────────────────────────┘                │
│                                          │                                  │
└──────────────────────────────────────────┼──────────────────────────────────┘
                                           │
                     ┌─────────────────────┼─────────────────────┐
                     │                     │                     │
                     ▼                     ▼                     ▼
┌────────────────────────┐ ┌────────────────────────┐ ┌────────────────────────┐
│   SUPABASE ADMIN A     │ │   SUPABASE ADMIN B     │ │   SUPABASE ADMIN C     │
│                        │ │                        │ │                        │
│ - contracts            │ │ - contracts            │ │ - contracts            │
│ - products             │ │ - products             │ │ - products             │
│ - vendas_revendedora   │ │ - vendas_revendedora   │ │ - vendas_revendedora   │
│ - sync_queue           │ │ - sync_queue           │ │ - sync_queue           │
│                        │ │                        │ │                        │
│ Trigger: contract_signed│ │ Trigger: contract_signed│ │ Trigger: contract_signed│
└────────────────────────┘ └────────────────────────┘ └────────────────────────┘
```

## Fluxos Principais

### 1. Login de Revendedora

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Revendedora  │      │   Servidor   │      │   Supabase   │
│   A4 Login   │─────▶│              │─────▶│    Master    │
│ email + cpf  │      │              │      │              │
└──────────────┘      └──────────────┘      └──────────────┘
                             │                     │
                             │  1. Valida login    │
                             │◀────────────────────│
                             │                     │
                             │  2. Busca admin_id  │
                             │◀────────────────────│
                             │                     │
                             │  3. Valida creds    │
                             │◀────────────────────│
                             │                     │
                      ┌──────▼──────┐              │
                      │   Sessão:   │              │
                      │ tenantId=A  │              │
                      │ (sem creds) │              │
                      └─────────────┘              │
                      
   Nota: Credenciais NÃO são armazenadas na sessão
   por segurança. Use getAdminCredentials(tenantId)
   quando precisar das credenciais.
```

### 2. Sincronização de Contrato Assinado

```
┌──────────────────────────────────────────────────────────────────┐
│                    SUPABASE CLIENTE (Admin A)                    │
│                                                                  │
│  1. Contrato assinado                                            │
│     contracts.status = 'signed'                                  │
│                    │                                             │
│                    ▼                                             │
│  2. Trigger dispara                                              │
│     queue_contract_signed_event()                                │
│                    │                                             │
│                    ▼                                             │
│  3. Evento enfileirado                                           │
│     INSERT INTO sync_queue (event_type='contract_signed', ...)   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ Polling a cada 30s
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                          SERVIDOR                                │
│                                                                  │
│  4. contractSyncPoller.ts                                        │
│     Busca eventos pendentes de sync_queue                        │
│                    │                                             │
│                    ▼                                             │
│  5. Processa evento                                              │
│     createRevendedoraFromContract()                              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                       SUPABASE MASTER                            │
│                                                                  │
│  6. Revendedora criada/atualizada                                │
│     INSERT INTO revendedoras (admin_id=A, email, cpf, ...)       │
│                                                                  │
│  7. Log de sincronização                                         │
│     INSERT INTO sync_log (event_type='contract_signed', ...)     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SUPABASE CLIENTE (Admin A)                    │
│                                                                  │
│  8. Evento marcado como processado                               │
│     UPDATE sync_queue SET status='completed'                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Tabelas do Supabase Master

### admins
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único do admin |
| email | VARCHAR(255) | Email do admin |
| cpf | VARCHAR(14) | CPF do admin |
| nome | VARCHAR(255) | Nome do admin |
| status | VARCHAR(20) | ativo, inativo, pendente |

### admin_supabase_credentials
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| admin_id | UUID | FK para admins |
| supabase_url | VARCHAR(500) | URL do Supabase do admin |
| supabase_anon_key | TEXT | Chave anônima |
| supabase_service_key | TEXT | Chave de serviço |
| storage_bucket | VARCHAR(255) | Nome do bucket de storage |
| is_active | BOOLEAN | Se as credenciais estão ativas |

### revendedoras (CENTRALIZADA)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| admin_id | UUID | FK para admins (qual admin ela pertence) |
| email | VARCHAR(255) | Email da revendedora |
| cpf | VARCHAR(14) | CPF da revendedora |
| nome | VARCHAR(255) | Nome da revendedora |
| status | VARCHAR(20) | ativo, inativo, pendente, bloqueado |
| comissao_padrao | DECIMAL(5,2) | Percentual de comissão |
| contract_id | UUID | ID do contrato assinado |
| contract_signed_at | TIMESTAMP | Data da assinatura |

## Tabelas do Supabase Cliente

### sync_queue
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| event_type | VARCHAR(50) | Tipo do evento (contract_signed) |
| table_name | VARCHAR(100) | Tabela de origem |
| record_id | UUID | ID do registro de origem |
| payload | JSONB | Dados do evento |
| status | VARCHAR(20) | pending, processing, completed, failed |

## Configuração

### 1. Supabase Master (Secrets)
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 2. Executar SQL no Master
```bash
# Execute o arquivo SQL no Supabase Master
psql -f docs/sql/SUPABASE_MASTER_SCHEMA.sql
```

### 3. Executar SQL em cada Cliente
```bash
# Execute em CADA Supabase de Admin (A, B, C...)
psql -f docs/sql/SUPABASE_CLIENT_SYNC_TRIGGER.sql
```

### 4. Iniciar o Poller
O poller é iniciado automaticamente no servidor. Veja `server/index.ts`.

## Segurança

1. **Credenciais nunca saem do servidor** - Apenas o servidor acessa as credenciais do Master
2. **admin_id é derivado** - Nunca aceito do cliente
3. **Isolamento garantido** - Cada query filtra por admin_id
4. **Logs de auditoria** - Toda sincronização é registrada em sync_log

## Arquivos Relevantes

| Arquivo | Descrição |
|---------|-----------|
| `docs/sql/SUPABASE_MASTER_SCHEMA.sql` | Schema do Supabase Master |
| `docs/sql/SUPABASE_CLIENT_SYNC_TRIGGER.sql` | Triggers para cada Supabase Cliente |
| `server/lib/masterSyncService.ts` | Serviço de sincronização |
| `server/lib/contractSyncPoller.ts` | Poller de eventos |
| `server/routes/resellerAuth.ts` | Login de revendedora |
