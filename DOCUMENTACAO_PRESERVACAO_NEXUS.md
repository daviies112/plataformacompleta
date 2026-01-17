# DOCUMENTACAO DE PRESERVACAO - SISTEMA EXECUTIVEAI PRO

> **Data:** 17 de Janeiro de 2026  
> **Objetivo:** Documentar 100% do sistema existente ANTES de implementar a Metodologia NEXUS  
> **IMPORTANTE:** Este documento serve como referencia caso algo precise ser restaurado

---

## 1. ARQUITETURA ATUAL DO SISTEMA

### 1.1 Estrutura de Autenticacao Multi-Tenant

**Arquivo Principal:** `server/middleware/multiTenantAuth.ts`

```typescript
// Sessao atual suporta:
interface SessionData {
  userId?: string;
  userEmail?: string;
  userName?: string;
  tenantId?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}
```

**Arquivo de Auth JWT:** `server/middleware/auth.ts`

```typescript
interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    clientId: string;
    tenantId: string;
  };
}
```

### 1.2 Sistema de Credenciais por Tenant

**Arquivo:** `server/lib/multiTenantSupabase.ts`

- `getClientSupabaseClient(tenantId)` - Busca cliente Supabase especifico do tenant
- `getDynamicSupabaseClient(tenantId)` - HARD-FAIL quando credenciais ausentes (seguranca)
- `testClientSupabaseConnection(clientId)` - Testa conexao com Supabase
- `fetchTenantSupabaseData(clientId, tenantId)` - Busca dados agregados de 12 tabelas

**Arquivo:** `server/config/supabaseOwner.ts`

- `supabaseOwner` - Cliente Supabase do DONO (autenticacao centralizada)
- `SUPABASE_CONFIGURED` - Flag para verificar se Supabase esta configurado
- `createClientSupabase(url, key)` - Cria cliente Supabase especifico

### 1.3 Rotas de Autenticacao Existentes

**Arquivo:** `server/routes/multiTenantAuth.ts` (verificar)

- `POST /api/auth/login` - Login de administradores
- `POST /api/auth/logout` - Logout
- `GET /api/auth/session` - Verificar sessao

---

## 2. FUNCIONALIDADES CRITICAS QUE DEVEM SER PRESERVADAS

### 2.1 Sistema de Compliance (CPF)

**Arquivos:**
- `server/routes/compliance.ts` - Rotas de consulta CPF
- `server/lib/datacorpCompliance.ts` - Integracao BigDataCorp
- `server/lib/cpfCompliancePoller.ts` - Sincronizacao automatica

**Endpoints:**
- `POST /api/compliance/check` - Consulta CPF
- `GET /api/compliance/history` - Historico de consultas
- `GET /api/compliance/stats` - Estatisticas

### 2.2 Sistema de Assinatura Digital

**Arquivos:**
- `server/routes/assinatura.ts` - Rotas de contratos
- `server/services/assinatura-supabase.ts` - Servico Supabase
- `src/components/assinatura/` - Componentes React

**Endpoints:**
- `GET /api/assinatura/contracts` - Listar contratos
- `POST /api/assinatura/contracts` - Criar contrato
- `POST /api/assinatura/contracts/:id/finalize` - Finalizar/Assinar

### 2.3 Sistema de Reunioes (100ms)

**Arquivos:**
- `server/routes/meetings.ts` - Rotas de reunioes
- `server/services/hms100ms.ts` - Servico 100ms
- `src/pages/PublicMeetingRoom.tsx` - Sala de reuniao

**Endpoints:**
- `POST /api/reunioes` - Criar reuniao
- `GET /api/reunioes/:id` - Buscar reuniao
- `POST /api/reunioes/:id/token` - Gerar token

### 2.4 Sistema WhatsApp (Evolution API)

**Arquivos:**
- `server/routes/whatsapp.ts` - Rotas WhatsApp
- `server/lib/evolutionApi.ts` - Cliente Evolution API
- `src/features/whatsapp-platform/` - Frontend

### 2.5 Sistema de Formularios

**Arquivos:**
- `server/routes/formularios.ts` - Rotas de formularios
- `server/lib/formSubmissionPoller.ts` - Sincronizacao
- `src/pages/FormularioPage.tsx` - Frontend

### 2.6 N8N Integration

**Arquivos:**
- `server/routes/n8n.ts` - Rotas N8N
- `server/services/n8n.ts` - Servico N8N

---

## 3. TABELAS DO BANCO DE DADOS

### 3.1 PostgreSQL Local (Drizzle ORM)

**Arquivo:** `shared/db-schema.ts`

Tabelas principais:
- `users` - Usuarios/Admins
- `datacorpChecks` - Consultas CPF
- `supabaseConfig` - Credenciais Supabase por tenant
- `meetingsConfig` - Configuracoes 100ms por tenant
- `whatsappConfig` - Configuracoes WhatsApp por tenant
- `reunioes` - Reunioes agendadas
- `gravacoes` - Gravacoes de reunioes
- `form_submissions` - Submissoes de formularios
- `automation_logs` - Logs de automacao

### 3.2 Supabase (por Tenant)

Tabelas no Supabase de cada cliente:
- `forms` - Formularios
- `form_submissions` - Submissoes
- `workspace_pages` - Paginas workspace
- `workspace_boards` - Boards
- `workspace_databases` - Databases
- `products` - Produtos
- `suppliers` - Fornecedores
- `resellers` - Revendedores
- `categories` - Categorias
- `print_queue` - Fila de impressao
- `files` - Arquivos faturamento
- `contracts` - Contratos assinatura
- `cpf_compliance_results` - Resultados CPF

---

## 4. FLUXO DE AUTENTICACAO ATUAL

```
1. Usuario acessa /login
2. POST /api/auth/login (email, senha)
3. Verifica no Supabase Owner (tabela admins_login)
4. Cria sessao com tenantId = userId
5. Redireciona para dashboard
6. Cada requisicao usa session.tenantId para isolamento
```

---

## 5. ENVIRONMENT VARIABLES CRITICAS

```bash
# Sessao
SESSION_SECRET=xxx

# Supabase Owner (autenticacao centralizada)
SUPABASE_OWNER_URL=xxx
SUPABASE_OWNER_SERVICE_KEY=xxx

# JWT
JWT_SECRET=xxx

# Database
DATABASE_URL=xxx
```

---

## 6. ROTAS PUBLICAS ATUAIS

```typescript
const publicRoutes = [
  '/login',
  '/reuniao/',
  '/api/reunioes/',
  '/api/public/reuniao/',
  '/api/auth/',
  '/api/config/',
  '/health',
  '/assets'
];
```

---

## 7. INTEGRACAO COM SERVICOS EXTERNOS

### 7.1 BigDataCorp (Compliance CPF)
- Credenciais por tenant no banco
- TOKEN_ID e CHAVE_TOKEN

### 7.2 100ms (Video)
- Credenciais por tenant no banco
- APP_ACCESS_KEY e APP_SECRET

### 7.3 Evolution API (WhatsApp)
- Credenciais por tenant no banco
- EVOLUTION_API_URL e EVOLUTION_API_KEY

### 7.4 Supabase (por tenant)
- URL e ANON_KEY por tenant
- Isolamento completo

---

## 8. VERIFICACAO POS-IMPLEMENTACAO NEXUS

Apos implementar NEXUS, verificar que TODOS os seguintes continuam funcionando:

- [ ] Login de administrador
- [ ] Dashboard com dados
- [ ] Consulta de CPF
- [ ] Historico de consultas
- [ ] Criar reuniao
- [ ] Entrar em reuniao publica
- [ ] Assinatura de contratos
- [ ] Formularios publicos
- [ ] WhatsApp (se configurado)
- [ ] N8N webhooks
- [ ] Calendario de reunioes
- [ ] Gravacoes
- [ ] Label Designer
- [ ] Configuracoes de credenciais

---

**Este documento foi criado para garantir que NENHUMA funcionalidade seja perdida durante a implementacao do sistema NEXUS.**
