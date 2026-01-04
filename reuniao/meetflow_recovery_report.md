# Relatório de Recuperação Técnica - MeetFlow

## 1. Contexto do Projeto
O MeetFlow é uma plataforma SaaS multi-tenant para gerenciamento de reuniões online, integrada com o serviço **100ms**. 
- **Frontend**: React 19 (Vite), TypeScript, TailwindCSS v4.
- **Backend**: Node.js (Express), Drizzle ORM, PostgreSQL.
- **Fluxo Principal**: Admins criam reuniões -> Link público é gerado -> Clientes acessam o link sem login.

## 2. O Problema Atual
Durante a implementação da funcionalidade de **acesso público multi-tenant**, ocorreu uma corrupção crítica nos arquivos principais:
1.  **`server/routes.ts`**: O arquivo de ~4000 linhas foi truncado para ~30 linhas. Isso removeu todas as rotas de Autenticação, Reuniões, Agendamentos e Webhooks.
2.  **`client/src/components/Meeting100ms.tsx`**: O componente foi editado incorretamente, resultando em erros de sintaxe (LSP) e quebra da lógica de conexão.
3.  **Status do Servidor**: FAILED (Erro 502/500). O sistema não inicia porque o ponto de entrada das rotas está incompleto ou com erro de sintaxe.

## 3. Arquitetura Multi-Tenant e 100ms
Cada empresa (tenant) possui suas próprias credenciais `appAccessKey` e `appSecret` no banco de dados.
- **Rota Pública Desejada**: `/reuniao/:companySlug/:roomId`
- **Lógica de Token**: O backend deve buscar o tenant pelo slug, validar a reunião e usar as chaves do tenant para assinar um JWT do 100ms via função `gerarTokenParticipante`.

## 4. Código Necessário para Restauração

### Esquema do Banco (`shared/schema.ts`)
As tabelas principais envolvidas são `tenants`, `reunioes`, `usuarios_tenant` e `meeting_bookings`.

### Função de Geração de Token (`server/services/hms100ms.ts`)
```typescript
export function gerarTokenParticipante(roomId, userId, role, appAccessKey, appSecret) { ... }
```

### Rotas de Recuperação (Exemplo do que foi perdido)
As rotas incluíam:
- `POST /api/auth/login`, `/api/auth/register`, `/api/auth/me`
- `GET /api/reunioes`, `POST /api/reunioes/instantanea`
- `GET /api/public/reuniao/:companySlug/:roomId` (A ser corrigida)
- `POST /api/public/reuniao/:companySlug/:roomId/token` (A ser corrigida)

## 5. Plano de Ação para o Claude
1.  **Restaurar `server/routes.ts`**: Utilizar o histórico do Git (Checkpoints) para recuperar as 4000 linhas de código funcional.
2.  **Corrigir `Meeting100ms.tsx`**: Reimplementar o `useEffect` de entrada na sala para distinguir entre acesso via dashboard (admin) e acesso via link público (slug presente).
3.  **Validar Multi-Tenancy**: Garantir que o endpoint público de token use as credenciais do tenant correto baseado no slug da URL, e não do usuário logado.

## 6. Logs de Erro Recentes
```
Error [TransformError]: Transform failed with 1 error:
/home/runner/workspace/server/routes.ts:3024:6: ERROR: Unexpected "catch"
```
Este erro indica que as tentativas de correção via `sed` deixaram blocos de código mal formados.
