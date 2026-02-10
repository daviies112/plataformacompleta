# ExecutiveAI Pro - Documentação Completa da Plataforma

> **Versão:** 1.0.0  
> **Data da Auditoria:** 2026-01-27  
> **Objetivo:** Documentação exaustiva para exportação e reconstrução completa da plataforma

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura Multi-Tenant](#2-arquitetura-multi-tenant)
3. [Variáveis de Ambiente](#3-variáveis-de-ambiente)
4. [Estrutura do Banco de Dados](#4-estrutura-do-banco-de-dados)
5. [Rotas da API](#5-rotas-da-api)
6. [Integrações Externas](#6-integrações-externas)
7. [Automações e Pollers](#7-automações-e-pollers)
8. [Arquivos de Dados Persistentes](#8-arquivos-de-dados-persistentes)
9. [Estrutura do Frontend](#9-estrutura-do-frontend)
10. [Funcionalidades Completas](#10-funcionalidades-completas)
11. [Guia de Exportação](#11-guia-de-exportação)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Visão Geral

**ExecutiveAI Pro** é uma plataforma SaaS multi-tenant completa com sistema de revendedoras NEXUS. A plataforma integra:

- **Sistema de Pagamentos Split** - Pagar.me com divisão automática de comissões
- **Gestão de Revendedoras** - Cadastro, catálogo, pedidos, comissões
- **Formulários Dinâmicos** - Criação e gestão de leads
- **Assinatura Digital** - Contratos com verificação facial
- **Reuniões por Vídeo** - Integração 100ms
- **WhatsApp** - Evolution API para atendimento
- **Gestão de Frete** - Total Express
- **Compliance** - Consultas BigDataCorp

### Estatísticas da Plataforma

| Métrica | Quantidade |
|---------|------------|
| Tabelas Supabase | 68 (9 Owner + 59 Tenant) |
| Endpoints API | 287 |
| Variáveis de Ambiente | 106 |
| Integrações Externas | 11 |
| Processos Automáticos | 28 |
| Páginas Frontend | 109+ |
| Componentes | 198+ |

---

## 2. Arquitetura Multi-Tenant

### Dual Supabase Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE OWNER (Central)                     │
│  - Autenticação centralizada de admins/revendedoras            │
│  - Tabelas: admins, revendedoras, admin_supabase_credentials   │
│  - Variáveis: SUPABASE_OWNER_URL, SUPABASE_OWNER_SERVICE_KEY   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE TENANT (Por Cliente)                │
│  - Dados específicos do cliente (vendas, produtos, etc)        │
│  - Configurado via data/supabase-config.json                    │
│  - Cada admin pode ter seu próprio Supabase                     │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo de Autenticação

1. **Admin Login**: Email + Senha → Owner Supabase → JWT
2. **Reseller Login**: Email + CPF → Owner Supabase (revendedoras) → JWT
3. **Token Storage**: Cookies httpOnly + localStorage

---

## 3. Variáveis de Ambiente

### CRÍTICAS (Produção)

| Variável | Categoria | Descrição |
|----------|-----------|-----------|
| `DATABASE_URL` | Database | PostgreSQL connection (auto-Replit) |
| `SESSION_SECRET` | Auth | Chave para sessões Express |
| `JWT_SECRET` | Auth | Chave para tokens JWT |
| `CREDENTIALS_ENCRYPTION_KEY_BASE64` | Security | Criptografia AES-256-GCM |

### Multi-Tenant

| Variável | Categoria | Descrição |
|----------|-----------|-----------|
| `SUPABASE_OWNER_URL` | Supabase | URL do Owner central |
| `SUPABASE_OWNER_SERVICE_KEY` | Supabase | Service key do Owner |
| `SUPABASE_MASTER_URL` | Supabase | URL para cache global |
| `SUPABASE_MASTER_SERVICE_ROLE_KEY` | Supabase | Service key do Master |

### Pagamentos (Pagar.me)

| Variável | Categoria | Descrição |
|----------|-----------|-----------|
| `CHAVE_SECRETA_PRODUCAO` | Pagar.me | sk_live_xxx |
| `CHAVE_PUBLICA_PRODUCAO` | Pagar.me | pk_live_xxx |
| `CHAVE_ID_PRODUCAO` | Pagar.me | acc_xxx |
| `CHAVE_SECRETA_TESTE` | Pagar.me | sk_test_xxx (fallback) |

### Consulta CPF (BigDataCorp)

| Variável | Categoria | Descrição |
|----------|-----------|-----------|
| `TOKEN_ID` | BigDataCorp | ID do token |
| `CHAVE_TOKEN` | BigDataCorp | Chave de acesso |

### Vídeo (100ms)

| Variável | Categoria | Descrição |
|----------|-----------|-----------|
| `HMS_APP_ACCESS_KEY` | 100ms | Access key |
| `HMS_APP_SECRET` | 100ms | App secret |
| `HMS_TEMPLATE_ID` | 100ms | Template de sala |

### Frete (Total Express)

| Variável | Categoria | Descrição |
|----------|-----------|-----------|
| `TOTAL_EXPRESS_USER` | Total Express | Usuário |
| `TOTAL_EXPRESS_PASS` | Total Express | Senha |
| `TOTAL_EXPRESS_REID` | Total Express | ID do remetente |

### Opcionais

| Variável | Categoria | Descrição |
|----------|-----------|-----------|
| `REDIS_URL` | Cache | Redis connection |
| `OPENAI_API_KEY` | IA | Para transcrições |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Gateway alternativo |
| `SENTRY_DSN` | Monitoring | Sentry error tracking |
| `N8N_WEBHOOK_URL` | Automação | Webhooks n8n |

### WhatsApp/Evolution API

| Variável | Categoria | Descrição |
|----------|-----------|-----------|
| `EVOLUTION_API_URL` | Evolution | URL da API Evolution |
| `EVOLUTION_API_KEY` | Evolution | Chave de API |
| `EVOLUTION_INSTANCE` | Evolution | Nome da instância |
| `API_KEY_EVOLUTION` | Evolution | Chave alternativa |
| `URL_EVOLUTION` | Evolution | URL alternativa |
| `NOME_DA_INSTANCIA` | Evolution | Nome da instância (legado) |

### Email (Resend)

| Variável | Categoria | Descrição |
|----------|-----------|-----------|
| `RESEND_API_KEY` | Resend | API key do Resend |
| `RESEND_FROM_EMAIL` | Resend | Email de origem |
| `ALERT_EMAIL` | Alertas | Email para alertas |

### Push Notifications (Firebase/VAPID)

| Variável | Categoria | Descrição |
|----------|-----------|-----------|
| `FIREBASE_PROJECT_ID` | Firebase | ID do projeto |
| `FIREBASE_CLIENT_EMAIL` | Firebase | Email do service account |
| `FIREBASE_PRIVATE_KEY` | Firebase | Chave privada |
| `VAPID_PUBLIC_KEY` | VAPID | Chave pública push |
| `VAPID_PRIVATE_KEY` | VAPID | Chave privada push |

### Automação (Configuração)

| Variável | Categoria | Descrição |
|----------|-----------|-----------|
| `AUTOMATION_PROCESSING_ENABLED` | Automação | Habilitar processamento |
| `AUTOMATION_PERSIST_STATE` | Automação | Persistir estado |
| `AUTOMATION_MAX_RETRIES` | Automação | Tentativas máximas |
| `AUTOMATION_RETRY_DELAY_SECONDS` | Automação | Delay entre tentativas |
| `FORM_SYNC_ENABLED` | Sync | Habilitar sync forms |
| `FORM_SYNC_INTERVAL_MINUTES` | Sync | Intervalo de sync (min) |
| `CPF_SYNC_ENABLED` | Sync | Habilitar sync CPF |
| `CPF_SYNC_INTERVAL_MINUTES` | Sync | Intervalo CPF (min) |
| `CLIENT_DETECTION_INTERVAL_MINUTES` | Sync | Intervalo detecção |

### Monitoring (Better Stack/Sentry)

| Variável | Categoria | Descrição |
|----------|-----------|-----------|
| `BETTER_STACK_URL` | Better Stack | URL do Better Stack |
| `BETTER_STACK_SOURCE_TOKEN` | Better Stack | Token de fonte |
| `SENTRY_DSN` | Sentry | DSN do Sentry |
| `SENTRY_ENABLE_DEV` | Sentry | Habilitar em dev |
| `LOG_LEVEL` | Logging | Nível de log |

### Outras

| Variável | Categoria | Descrição |
|----------|-----------|-----------|
| `APP_URL` | Geral | URL da aplicação |
| `API_URL` | Geral | URL base da API |
| `ICAL_URL` | Calendário | URL iCal para reuniões |
| `DEFAULT_TENANT_ID` | Multi-tenant | ID tenant padrão |
| `DEV_SUPABASE_FALLBACK` | Dev | Fallback Supabase dev |
| `ENCRYPTION_KEY` | Segurança | Chave criptografia legada |
| `N8N_API_KEY` | n8n | API key n8n |
| `N8N_ALERT_WEBHOOK_URL` | n8n | Webhook alertas |
| `PLUGGY_CLIENT_ID` | Pluggy | Open banking ID |
| `PLUGGY_CLIENT_SECRET` | Pluggy | Open banking secret |
| `TOTAL_EXPRESS_WEBHOOK_SECRET` | Total Express | Secret webhook |

> **Total: 106 variáveis de ambiente mapeadas**
> **Arquivo completo:** `/data/audit/environment_vars.json`

---

## 4. Estrutura do Banco de Dados

### Owner Supabase (9 tabelas)

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| `admins` | Administradores/Tenants | id, email, cpf, nome, empresa, status |
| `admin_supabase_credentials` | Credenciais Supabase por tenant | admin_id, supabase_url, service_role_key |
| `admin_branding` | White-label config | logo_url, primary_color, company_name |
| `revendedoras` | Revendedoras centralizadas | id, admin_id, email, cpf, nome, pagarme_recipient_id |
| `vendas_revendedora` | Vendas com split (Owner) | id, reseller_id, amount, commission |
| `config_split` | Config Stripe Connect | admin_id, stripe_account_id |
| `sync_log` | Log de sincronização | id, operation, status, error |
| `sessoes` | Sessões ativas | id, user_id, token, expires_at |
| `logs_acesso` | Logs de tentativas | id, email, ip, success |

### Tenant Supabase (59 tabelas)

#### Revendedoras (11 tabelas)
- `resellers` - Perfil completo
- `reseller_profiles` - Dados adicionais
- `reseller_stores` - Lojas personalizadas
- `product_requests` - Solicitações de produtos
- `withdrawals` - Saques de comissão
- `bank_accounts` - Contas bancárias
- `commission_splits` - Splits de comissão
- `gamification_*` - Sistema de gamificação

#### Produtos (4 tabelas)
- `products` - Catálogo
- `categories` - Categorias
- `suppliers` - Fornecedores
- `print_queue` - Fila de impressão

#### Pagamentos (4 tabelas)
- `sales_with_split` - Vendas com divisão
- `payment_links` - Links de pagamento
- `commission_config` - Configuração de comissões
- `platform_settings` - Configurações gerais

#### Assinatura Digital (15 tabelas)
- `contracts` - Contratos
- `users` - Signatários
- `signature_logs` - Logs de assinatura
- `face_verifications` - Verificação facial
- `appearance_configs` - Customização visual
- `verification_configs` - Regras de verificação

#### Formulários (5 tabelas)
- `forms` - Formulários
- `form_templates` - Templates
- `form_submissions` - Submissões/Leads
- `leads` - Leads qualificados
- `formularios` - Formulários legados

#### Frete (8 tabelas)
- `transportadoras` - Transportadoras
- `cotacoes_frete` - Cotações
- `envios` - Envios
- `rastreamento_eventos` - Tracking
- `etiquetas_envio` - Etiquetas
- `config_frete` - Configurações
- `tabela_frete` - Tabelas de preço
- `faixa_frete` - Faixas de CEP

> **Arquivo completo:** `/data/audit/supabase_tables.json`

---

## 5. Rotas da API

### Resumo por Domínio

| Domínio | Endpoints | Arquivo Principal |
|---------|-----------|-------------------|
| Pagamentos | 28 | split.ts, pagarme.ts, wallet.ts |
| WhatsApp | 40 | whatsapp.ts, evolution.ts |
| Formulários | 35 | formRoutes.ts, submissions.ts |
| Reuniões | 22 | reuniao.ts, 100ms integration |
| Configuração | 32 | config.ts, credentialsRoutes.ts |
| Frete | 25 | envio.ts, totalExpress.ts |
| Revendedora | 18 | resellerAuth.ts, resellerCatalog.ts |
| Autenticação | 12 | multitenantLogin.ts, auth.ts |
| Dashboard | 21 | analytics.ts, workspace.ts |

### Autenticação por Tipo

| Tipo | Quantidade | Descrição |
|------|------------|-----------|
| `none` | 148 | Públicos |
| `token` | 92 | JWT autenticado |
| `admin` | 5 | Apenas admin |
| `reseller` | 12 | Apenas revendedor |
| `config` | 17 | Config-level |

### Rotas Críticas

```
POST /api/split/setup-company - Configurar empresa (Pagar.me recipient)
POST /api/split/setup-reseller/:id - Configurar revendedora (recipient)
POST /api/pagarme/pix - Gerar pagamento PIX
POST /api/pagarme/checkout-card - Checkout cartão com split
GET /api/split/product-requests - Listar solicitações de produtos
PATCH /api/split/product-requests/:id - Atualizar status
POST /api/reseller/auth/login - Login revendedora (CPF+Email)
GET /api/reseller/catalog - Catálogo de produtos
```

> **Arquivo completo:** `/data/audit/api_routes.json`

---

## 6. Integrações Externas

### 1. Pagar.me (Pagamentos)

**Propósito:** Gateway de pagamentos com split automático

**Endpoints:**
- `POST /orders` - Criar pedidos
- `GET /orders/{id}` - Status
- `POST /recipients` - Criar recebedores
- `GET /balance/{id}` - Saldo

**Split de Comissões:**
```
Total: 100%
├── Plataforma (Pagar.me): 3%
├── Desenvolvedor: 3% (re_cmkn7cdx110b10l9tp8yk0j92)
└── Restante: 94% dividido entre Empresa e Revendedora
    ├── Empresa: 30-35% (configurável)
    └── Revendedora: 65-70% (por tier)
```

### 2. BigDataCorp (Compliance)

**Propósito:** Consulta CPF/CNPJ

**Custos:**
- Dados básicos: R$ 0,030/consulta
- Processos: R$ 0,070/consulta

### 3. Supabase (BaaS)

**Propósito:** Database, Auth, Storage multi-tenant

**Arquitetura:**
- Owner: Autenticação centralizada
- Tenant: Dados do cliente
- Master: Cache global

### 4. 100ms (Vídeo)

**Propósito:** Videoconferência com gravação

### 5. Total Express (Frete)

**Propósito:** Cotação e envio de produtos

**Margem configurável:** 40% default

### 6. Evolution API (WhatsApp)

**Propósito:** Atendimento via WhatsApp

**Bug conhecido:** v2.2.3 - fallback para contacts

### 7. Resend (Email)

**Propósito:** Email transacional

### 8. n8n (Automação)

**Propósito:** Webhooks para automações externas

### 9. Sentry (Monitoring)

**Propósito:** Error tracking

### 10. OpenAI (IA)

**Propósito:** Transcrição de reuniões (Whisper)

### 11. Stripe (Gateway Alternativo)

**Propósito:** Stripe Connect para marketplace

> **Arquivo completo:** `/data/audit/integrations.json`

---

## 7. Automações e Pollers

### Pollers Ativos

| Nome | Intervalo | Função |
|------|-----------|--------|
| `LimitMonitor` | 5 min | Monitorar limites free tier |
| `FormSubmissionPoller` | 2 min | Sincronizar submissions |
| `FormMappingSyncJob` | 5 min | Sincronizar mapeamentos |
| `CPFCompliancePoller` | 3 min | Consultas CPF automáticas |
| `ContractSyncPoller` | 30 seg | Sincronizar contratos |
| `FormsAutomationWorker` | 30 seg | Processar automações |
| `AutomaticAlerting` | 5 min | Enviar alertas |

### Filas de Jobs

| Fila | Concorrência | Função |
|------|--------------|--------|
| `emailQueue` | 3 | Envio de emails |
| `analyticsQueue` | 5 | Tracking de eventos |
| `notificationQueue` | 5 | Push notifications |
| `dataProcessingQueue` | 2 | Sync de submissions |

### Arquivos de Estado

```
data/automation_state.json - Estado global
data/form_submission_poller_state.json - Estado por tenant
data/cpf_compliance_poller_state.json - Estado CPF
data/event_idempotency.json - Idempotência de eventos
```

> **Arquivo completo:** `/data/audit/automations.json`

---

## 8. Arquivos de Dados Persistentes

### Arquivos CRÍTICOS (Backup Obrigatório)

| Arquivo | Tamanho | Descrição |
|---------|---------|-----------|
| `data/supabase-config.json` | ~1KB | Conexão Supabase tenant |
| `data/credentials.json` | ~5KB | Credenciais criptografadas |
| `data/assinatura_contracts.json` | ~13MB | TODOS os contratos |
| `data/assinatura_global_config.json` | ~2KB | Config visual assinatura |
| `data/automation_state.json` | ~1KB | Estado de automações |

### Arquivos de Estado

| Arquivo | Descrição |
|---------|-----------|
| `data/form_submission_poller_state.json` | IDs processados |
| `data/cpf_compliance_poller_state.json` | Consultas processadas |
| `data/cpf_processed_ids.json` | Cache de IDs |

### Arquivos de Auditoria

```
data/audit/
├── api_routes.json (400 endpoints)
├── automations.json (28 processos)
├── data_files.json (14 arquivos)
├── environment_vars.json (67 variáveis)
├── frontend_structure.json (109+ páginas)
├── integrations.json (11 integrações)
└── supabase_tables.json (68 tabelas)
```

> **Arquivo completo:** `/data/audit/data_files.json`

---

## 9. Estrutura do Frontend

### Módulos Principais

| Módulo | Páginas | Componentes | Hooks |
|--------|---------|-------------|-------|
| `revendedora` | 40+ | 50+ | 19 |
| `formularios-platform` | 15 | 30+ | 8 |
| `produto` | 5 | 15 | 7 |
| `reuniao-platform` | 2 | 10 | 4 |
| `kanban` | 1 | 5 | 3 |
| `whatsapp-platform` | 3 | 20 | 5 |

### Plataformas

- **Desktop**: 11 páginas com DesktopLayout
- **Mobile**: 11 páginas com MobileLayout
- **Reseller**: 5 páginas com ResellerLayout

### Rotas Principais

```
/vendas/* - Dashboard de vendas
├── /vendas/dashboard
├── /vendas/products
├── /vendas/product-requests (SOLICITAÇÕES)
├── /vendas/resellers
├── /vendas/commission-config
├── /vendas/bank-data
└── /vendas/analytics

/revendedora/* - Portal revendedora
├── /revendedora/admin/* - Admin
└── /revendedora/reseller/* - Revendedora

/formulario/* - Formulários
/assinar/* - Assinatura digital
/reuniao/* - Reuniões
/loja/* - Lojas de revendedoras
/checkout/* - Checkout público
```

> **Arquivo completo:** `/data/audit/frontend_structure.json`

---

## 10. Funcionalidades Completas

### Sistema de Revendedoras (NEXUS)

- [x] Cadastro de revendedoras (CPF + Email)
- [x] Login separado (resellerAuth)
- [x] Catálogo de produtos personalizado
- [x] Solicitação de produtos (ProductRequests)
- [x] Comissões por tier (Iniciante → Ouro)
- [x] Split automático Pagar.me
- [x] Saques de comissão
- [x] Loja personalizada por subdomínio
- [x] Gamificação (badges, challenges)

### Pagamentos

- [x] PIX com QR Code
- [x] Cartão de crédito (tokenização)
- [x] Split automático 4 vias
- [x] Webhook de confirmação
- [x] Gestão de recebedores
- [x] Consulta de saldo

### Formulários

- [x] Builder drag-and-drop
- [x] Templates reutilizáveis
- [x] Submissions/Leads
- [x] Integração WhatsApp
- [x] Automação de processamento

### Assinatura Digital

- [x] Contratos dinâmicos
- [x] Verificação facial
- [x] Logs de auditoria
- [x] Customização visual
- [x] Termos de aceite

### Reuniões

- [x] Videoconferência 100ms
- [x] Gravação automática
- [x] Transcrição IA (parcial)
- [x] Webhooks n8n

### Compliance

- [x] Consulta CPF BigDataCorp
- [x] Processos judiciais
- [x] Análise de crédito
- [x] Histórico de consultas

---

## 11. Guia de Exportação

### Passo 1: Clonar Repositório

```bash
git clone <repo-url>
cd executiveai-pro
```

### Passo 2: Instalar Dependências

```bash
npm install
```

### Passo 3: Configurar Variáveis

Criar arquivo `.env` com as variáveis críticas:

```env
# Database
DATABASE_URL=postgresql://...

# Auth
SESSION_SECRET=sua-chave-32-chars
JWT_SECRET=sua-chave-jwt-32-chars
CREDENTIALS_ENCRYPTION_KEY_BASE64=base64-key

# Supabase Owner
SUPABASE_OWNER_URL=https://xxx.supabase.co
SUPABASE_OWNER_SERVICE_KEY=eyJ...

# Pagar.me
CHAVE_SECRETA_PRODUCAO=sk_live_xxx
CHAVE_PUBLICA_PRODUCAO=pk_live_xxx
```

### Passo 4: Restaurar Dados

Copiar arquivos de `/data/`:
- `supabase-config.json`
- `credentials.json`
- `assinatura_contracts.json`
- `automation_state.json`

### Passo 5: Criar Tabelas Supabase

Executar SQLs em `/docs/sql/`:
- Owner: `supabase-owner-schema.sql`
- Tenant: `supabase-tenant-schema.sql`

### Passo 6: Iniciar

```bash
npm run dev
```

---

## 12. Troubleshooting

### Problema: Solicitações não aparecem

**Causa:** Rota usando autenticação errada (resellerAuth vs adminAuth)

**Solução:** Usar `/api/split/product-requests` para admin

### Problema: Supabase não conecta

**Causa:** Configuração incorreta no `supabase-config.json`

**Solução:** Verificar campos `supabaseUrl` e `supabaseAnonKey`

### Problema: Pagamentos não processam

**Causa:** Chaves Pagar.me inválidas ou recipient não configurado

**Solução:** 
1. Verificar `CHAVE_SECRETA_PRODUCAO`
2. Executar `/api/split/setup-company`
3. Executar `/api/split/setup-reseller/:id`

### Problema: CPF não consulta

**Causa:** Credenciais BigDataCorp não configuradas

**Solução:** Configurar `TOKEN_ID` e `CHAVE_TOKEN`

### Problema: Login revendedora falha

**Causa:** Tabela `revendedoras` não existe no Owner Supabase

**Solução:** Criar tabela via SQL ou verificar `SUPABASE_OWNER_URL`

---

## Arquivos de Referência

Todos os dados de auditoria estão em `/data/audit/`:

| Arquivo | Conteúdo |
|---------|----------|
| `api_routes.json` | 287 endpoints completos |
| `automations.json` | 28 processos automáticos |
| `data_files.json` | 14 arquivos de dados |
| `environment_vars.json` | 67 variáveis de ambiente |
| `frontend_structure.json` | Estrutura completa do frontend |
| `integrations.json` | 11 integrações externas |
| `supabase_tables.json` | 68 tabelas com campos |

---

## CHECKLIST DE RECONSTRUÇÃO COMPLETA

### Fase 1: Preparação do Ambiente

- [ ] 1.1 Clonar repositório do GitHub
- [ ] 1.2 Instalar Node.js 20+ e npm
- [ ] 1.3 Executar `npm install`
- [ ] 1.4 Criar banco PostgreSQL (ou usar Replit Database)

### Fase 2: Configurar Variáveis de Ambiente

**Ordem de prioridade:**

- [ ] 2.1 `DATABASE_URL` - Conexão PostgreSQL
- [ ] 2.2 `SESSION_SECRET` - Gerar: `openssl rand -hex 32`
- [ ] 2.3 `JWT_SECRET` - Gerar: `openssl rand -hex 32`
- [ ] 2.4 `CREDENTIALS_ENCRYPTION_KEY_BASE64` - AES-256 key

**Multi-Tenant (se usar):**
- [ ] 2.5 `SUPABASE_OWNER_URL` - URL do projeto Owner
- [ ] 2.6 `SUPABASE_OWNER_SERVICE_KEY` - Service key

**Pagamentos (se usar):**
- [ ] 2.7 `CHAVE_SECRETA_PRODUCAO` - Pagar.me
- [ ] 2.8 `CHAVE_PUBLICA_PRODUCAO` - Pagar.me

### Fase 3: Criar Tabelas Supabase

**Owner Supabase (executar primeiro):**
- [ ] 3.1 Criar tabela `admins`
- [ ] 3.2 Criar tabela `revendedoras`
- [ ] 3.3 Criar tabela `admin_supabase_credentials`
- [ ] 3.4 Criar tabela `admin_branding`
- [ ] 3.5 Criar demais tabelas Owner

**Tenant Supabase:**
- [ ] 3.6 Criar tabela `products`
- [ ] 3.7 Criar tabela `categories`
- [ ] 3.8 Criar tabela `resellers`
- [ ] 3.9 Criar tabela `product_requests`
- [ ] 3.10 Criar tabela `sales_with_split`
- [ ] 3.11 Criar demais tabelas Tenant

### Fase 4: Restaurar Arquivos de Dados

**Arquivos CRÍTICOS (backup obrigatório):**

| Ordem | Arquivo | Descrição |
|-------|---------|-----------|
| 1 | `data/supabase-config.json` | Conexão Supabase Tenant |
| 2 | `data/credentials.json` | Credenciais criptografadas |
| 3 | `data/assinatura_contracts.json` | Contratos de assinatura |
| 4 | `data/assinatura_global_config.json` | Config visual assinatura |
| 5 | `data/automation_state.json` | Estado das automações |
| 6 | `data/form_submission_poller_state.json` | Estado do form poller |
| 7 | `data/cpf_compliance_poller_state.json` | Estado do CPF poller |

### Fase 5: Configurar Integrações

- [ ] 5.1 **Pagar.me**: Criar conta, obter chaves, configurar webhook
- [ ] 5.2 **Supabase**: Criar projetos Owner e Tenant
- [ ] 5.3 **BigDataCorp**: Obter TOKEN_ID e CHAVE_TOKEN (se usar CPF)
- [ ] 5.4 **100ms**: Configurar template e obter keys (se usar vídeo)
- [ ] 5.5 **Total Express**: Obter credenciais (se usar frete)

### Fase 6: Inicialização

- [ ] 6.1 Executar `npm run dev`
- [ ] 6.2 Verificar logs do servidor (sem erros críticos)
- [ ] 6.3 Acessar `/vendas/dashboard`
- [ ] 6.4 Configurar primeiro admin via Supabase Owner

### Fase 7: Validação

- [ ] 7.1 Login admin funciona
- [ ] 7.2 Login revendedora funciona
- [ ] 7.3 Produtos carregam
- [ ] 7.4 Solicitações aparecem
- [ ] 7.5 Pagamentos processam (teste)

---

## Estrutura de Arquivos Críticos

```
executiveai-pro/
├── data/                           # BACKUP OBRIGATÓRIO
│   ├── supabase-config.json        # Conexão Supabase
│   ├── credentials.json            # Credenciais criptografadas
│   ├── assinatura_contracts.json   # Contratos (13MB)
│   ├── assinatura_global_config.json
│   ├── automation_state.json
│   └── audit/                      # Arquivos de auditoria
│       ├── api_routes.json
│       ├── automations.json
│       ├── data_files.json
│       ├── environment_vars.json
│       ├── frontend_structure.json
│       ├── integrations.json
│       └── supabase_tables.json
├── docs/
│   └── PLATFORM_COMPLETE.md        # Este documento
├── server/                         # Backend Express
│   ├── routes/                     # 287 endpoints
│   ├── services/                   # Lógica de negócio
│   └── lib/                        # Utilitários e pollers
├── src/                            # Frontend React
│   ├── features/                   # Módulos principais
│   ├── pages/                      # Páginas principais
│   └── components/                 # Componentes UI
└── replit.md                       # Guia rápido
```

---

**Documento gerado automaticamente em 2026-01-27**  
**ExecutiveAI Pro v1.0.0**  
**Última revisão: 2026-01-27**
