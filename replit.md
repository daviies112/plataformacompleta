# ExecutiveAI Pro - Replit Project Guide

## Project Overview

ExecutiveAI Pro é uma plataforma SaaS multi-tenant para gestão de leads, formulários, validação CPF e WhatsApp Business.

**Status:** ✅ Rodando  
**Port:** 5000  
**Database:** PostgreSQL (Replit)  

## Quick Start

```bash
npm install
npm run db:push
npm run dev
```

## 🚀 Otimização de Créditos (IMPORTANTE!)

**Problema:** Exportar sem otimização gasta ~500 créditos  
**Solução:** Com otimização, gasta ~25 créditos (95% menos!)

### Como Exportar

1. **ANTES de exportar (Replit atual):**
   ```bash
   npm run export:clean
   git add .
   git commit -m "Otimizado para export"
   git push origin main
   ```

2. **DEPOIS de importar (Replit novo):**
   ```bash
   npm run setup:import
   npm run dev
   ```

**Resultado:** Projeto cai de 1.2GB para ~200MB

## Tecnologia

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Express.js + TypeScript  
- **Database:** PostgreSQL + Drizzle ORM
- **Estado:** TanStack Query + Zustand
- **UI:** TailwindCSS + shadcn/ui

## Estrutura

```
src/       → Frontend (React components)
server/    → Backend (Express routes/services)
shared/    → Schema Drizzle (db-schema.ts)
public/    → Arquivos estáticos
scripts/   → Utilitários (export, import)
```

## Recursos Principais

✅ Dashboard Executivo  
✅ Gestão de Leads  
✅ Formulários Públicos  
✅ **Sistema NEXUS - Plataforma Revendedora** - ATUALIZADO (17/01/2026)
   - **Acesso:** `/revendedora` → Redireciona para tela de login da revendedora
   - **Rotas Revendedora (após login):**
     - `/revendedora/reseller/dashboard` → Dashboard da revendedora
     - `/revendedora/reseller/sales` → Histórico de vendas
     - `/revendedora/reseller/financial` → Resumo financeiro
     - `/revendedora/reseller/store` → Loja virtual
   - **Rotas Admin (gestão interna):**
     - `/revendedora/admin/resellers` → Lista e gerencia revendedoras
     - `/revendedora/admin/products` → Catálogo de produtos
     - `/revendedora/admin/orders` → Pedidos
     - `/revendedora/admin/commissions` → Comissões
     - `/revendedora/admin/gamification` → Sistema de gamificação
   - Autenticacao separada para revendedoras (tabela `revendedoras` no Supabase)
   - Catalogo de produtos herdado do admin
   - Integracao Stripe Connect para split de pagamentos
   - **Rotas Backend:** `/api/reseller/*`, `/api/stripe/*`
   - **Tabelas Supabase:** `revendedoras`, `vendas_revendedora`, `config_split`
   - **SQL Schema:** `supabase-nexus-tables.sql`
✅ Validação CPF + Histórico - ATUALIZADO (15/01/2026)
   - Endpoint: `/api/compliance/history` retorna histórico completo
   - Dados armazenados na tabela `cpf_compliance_results` (Supabase Cliente)
   - Campo `nome` mapeado corretamente para `personName`
   - Fallback chain: Supabase Master (`datacorp_checks`) → Supabase Cliente (`cpf_compliance_results`) → PostgreSQL local
   - **Credenciais corrigidas:** URL e API Key do projeto `axrvyrpefpntacuibyds` armazenadas criptografadas na tabela `supabase_master_config`
   - Fallback automático para Cliente quando Master está vazio (0 registros)
   - **AUTOMAÇÃO CPF CORRIGIDA (15/01/2026):**
     - `pollCPFCompliance` agora busca credenciais do banco (`getSupabaseMasterForTenant`) antes de env vars
     - `checkApprovedSubmissionsWithoutCPF` busca submissions com `passed=true` e `contact_cpf` não nulo
     - Quando form_submission é aprovado (passed=true), consulta CPF é disparada automaticamente
     - Resultado salvo em Supabase Master (`datacorp_checks`) e Cliente (`cpf_compliance_results`)  
✅ WhatsApp Business  
✅ **Integração N8N para Criação de Reuniões** - NOVO (12/01/2026)
   - **Documentação Completa:** Veja `DOCUMENTACAO_N8N_REUNIOES_API.md`
   - **API Key por Tenant:** Cada tenant pode gerar sua própria API key para N8N
   - **Interface:** Seção "Automação de Reuniões (N8N)" em Configurações
   - **Endpoints:** 
     - `POST /api/n8n/api-key/generate` - Gera nova API key (autenticado)
     - `DELETE /api/n8n/api-key` - Revoga API key (autenticado)
     - `GET /api/n8n/api-key/status` - Verifica status (autenticado)
     - `POST /api/n8n/reunioes` - Cria reunião via N8N
     - `GET /api/n8n/reunioes/:id` - Busca reunião via N8N
     - `GET /api/n8n/health` - Verifica se API está funcionando
     - `GET /api/n8n/schema` - Documentação dos endpoints
   - **Autenticação:** Header `X-N8N-API-Key` com API key do tenant
   - **Design Automático:** Reuniões herdam automaticamente configuração de branding do tenant
   - **Compatibilidade:** Suporte legacy para `N8N_API_KEY` global (auto-seleciona tenant único)
✅ Video Conferencing (100ms) - ATUALIZADO (14/01/2026)
   - API Routes: `/api/reunioes`, `/api/reunioes/instantanea`, `/api/gravacoes`
   - Acessível via menu "Reunião" no header
   - Configure credenciais do 100ms em Configurações antes de criar reuniões
   - **Reuniões Públicas:** Link compartilhável para usuários externos (sem autenticação)
   - **Cancelar/Reagendar Reuniões (14/01/2026):**
     - Endpoint: `DELETE /api/reunioes/:id` - Cancela reunião, desativa sala 100ms
     - Endpoint: `PATCH /api/reunioes/:id` - Reagenda reunião com nova data/hora
     - Status 'cancelada' (vermelho) e 'reagendada' (laranja) na UI
     - Botões de Cancelar/Reagendar no dialog de detalhes do Calendário
     - AlertDialog de confirmação para evitar cancelamentos acidentais
     - Sincronização automática com Supabase (fire-and-forget)
     - Não é possível reagendar reuniões canceladas
   - **Check-in Automático (14/01/2026):**
     - Coluna `compareceu` (boolean) adicionada à tabela `reunioes`
     - TODAS reuniões (agendadas, instantâneas, N8N) criadas com `compareceu = FALSE`
     - Ao entrar na sala, o frontend detecta conexão e chama API automaticamente
     - Endpoint: `POST /api/public/reunioes/registrar-presenca`
     - Body: `{ "room_id_100ms": "...", "nome": "..." }`
     - Sincronização automática com Supabase (não-bloqueante)
     - Usado para determinar se cliente compareceu ou não à reunião
   - **Correção de Sessão (12/01/2026):**
     - Login agora chama `req.session.save()` explicitamente antes de responder
     - Resolve problema de sessão não persistindo com `saveUninitialized: false`
     - Sessão agora é detectada corretamente em endpoints públicos
   - **Correção de Roles (12/01/2026):**
     - Usuários autenticados do mesmo tenant: role "host" (podem gravar)
     - Usuários públicos ou cross-tenant: role "guest" (apenas assistem)
     - Endpoint autenticado: `POST /api/reunioes/:id/token` → role="host"
     - Endpoint público: `POST /api/public/reunioes/:id/token-public` → verifica sessão para role
     - Botão de gravação aparece apenas para role="host" (`isHost = localPeer?.roleName === 'host'`)
   - **Pré-preenchimento de Contratos:**
     - Endpoint: `GET /api/public/reunioes/:id/participant-data`
     - Busca dados do form_submission por phone/email/formSubmissionId
     - Segurança: admins do mesmo tenant recebem dados completos (CPF, endereço)
     - Visitantes e cross-tenant recebem apenas nome (sem PII)
   - **Correção Tela Preta (v3):** Melhorias na conexão do SDK v0.11.0
     - Verificação de token válido antes de tentar conexão
     - Conexão inicia com áudio/vídeo MUTADOS para evitar problemas de dispositivos
     - Logs de debug detalhados para diagnóstico (`[Meeting100ms]` no console)
     - Timeout de 30s com retry automático (até 3 tentativas)
     - Botão "Tentar Novamente" para retry manual sem recarregar página
   - **React Hooks:** Corrigida ordem de chamadas para evitar violações das regras de hooks
   - **IMPORTANTE - Configuração do Dashboard 100ms:**
     - A role "guest" deve existir no template e ter permissões de subscribe
     - A role "host" deve existir e ter permissões de publish + record
     - A sala deve estar ativa (enabled: true)
     - Veja: `DOCUMENTACAO_CORRECAO_100MS.md` (detalhado)
✅ **Calendário de Reuniões** - NOVO (05/01/2026)
   - Visualiza todas as reuniões agendadas na página Calendário (header)
   - Grid mensal com navegação e detalhes de cada reunião
   - Acesse via menu "Calendário" no header
✅ **Sistema de Gravações SFU** - ATUALIZADO (05/01/2026)
   - Gravação Server-Side (SFU) captura diretamente os streams de mídia
   - Resolve problema de gravar tela de loading em vez do conteúdo da reunião
   - Sincronização automática com Supabase do cliente
   - Veja: `supabase-gravacoes-table.sql` para criar tabela no Supabase
✅ **Sistema de Exportação Otimizado** - ATUALIZADO (03/01/2026)
   - Scripts de limpeza preservam a pasta `data/` para manter credenciais.
   - Veja: `DOCUMENTACAO_PERSISTENCIA_EXPORT.md`
✅ Label Designer
✅ **Assinatura Digital** - ATUALIZADO (15/01/2026)
   - **📚 DOCUMENTAÇÃO COMPLETA:** Veja `DOCUMENTACAO_FLUXO_ASSINATURA_COMPLETO.md`
   - Plataforma completa para contratos digitais com verificação biométrica
   - Reconhecimento facial (ArcFace, TripletLoss, CosFace, SphereFace)
   - Captura de documentos e validação de identidade
   - **Admin (8 abas):** Cliente, Aparência, Verificação, Contrato, Progresso, Parabéns, Apps, Contratos
   - **Previews em tempo real:** Layout two-column com configurações à esquerda e preview à direita
   - **Cliente (3 steps):** Reconhecimento Facial → Assinar Contrato → Baixar Aplicativo
   - **Floating Progress Tracker:** Widget fixo no canto inferior direito com 3 passos
   - **API Routes Admin (autenticado):** `/api/assinatura/contracts` (GET, POST, PATCH, DELETE)
   - **API Routes Público (sem auth):** `/api/assinatura/public/contracts` (POST criar), `/api/assinatura/public/contracts/:token` (GET buscar)
   - **Rotas Frontend:** `/assinatura` (admin), `/assinar/:token` (cliente - acesso público)
   - **Persistência Supabase + Fallback Local:** 
     - Usa Supabase como armazenamento principal (tabela: `contracts`)
     - Fallback automático para arquivo local `data/assinatura_contracts.json` quando Supabase indisponível
     - Configuração em `data/supabase-config.json` (propriedades: `supabaseUrl`, `supabaseAnonKey`)
   - **Integração com Reuniões:** 
     - Botão "Assinar" na barra de controles da reunião (Meeting100ms.tsx)
     - Botão "Assinar Contrato de Revendedor" na tela de Reunião Encerrada (PublicMeetingRoom.tsx)
     - Criação automática de contrato ao encerrar reunião
     - **Busca automática de dados do form_submissions por telefone/email**
   - **Integração WhatsApp/N8N (15/01/2026):**
     - Tabela `contracts` no Supabase com campos `signature_url`, `whatsapp_enviado`, `whatsapp_enviado_at`
     - `signature_url` gerada automaticamente na criação: `https://dominio/assinar/{uuid}`
     - `access_token` usa UUID (crypto.randomUUID()) para compatibilidade Supabase
     - **Fluxo N8N:** Polling WHERE whatsapp_enviado = FALSE AND signature_url IS NOT NULL
     - Quando contrato assinado: `whatsapp_enviado = TRUE` automaticamente
     - Valores padrão para colunas NOT NULL (client_cpf, client_email, client_phone)
   - **Correções Críticas (15/01/2026):**
     - Fix PGRST116: Busca contrato antes de finalizar para obter access_token correto
     - Fix tela preta mobile: Imagens base64 mantidas em React state (não sessionStorage)
     - ErrorBoundary para captura de erros de runtime

## Desenvolvimento

```bash
npm run dev       # Inicia servidor (5000)
npm run build     # Build produção
npm start         # Produção
npm run db:push   # Sync database schema
```

## Variáveis Obrigatórias

- `DATABASE_URL` - Auto-configurado pelo Replit
- `JWT_SECRET` - Para autenticação JWT
- `SESSION_SECRET` - Para sessões

## Opcionais

Configure em `/configuracoes` (no app):
- Supabase credentials
- WhatsApp/Evolution API
- Google Calendar
- Sentry
- Redis

## Deployment

Configurado para Autoscale no Replit:
- Build: `npm run build`
- Run: `npm start`

## Documentação

Veja [DESENVOLVIMENTO.md](./DESENVOLVIMENTO.md) para documentação técnica completa.

---

**Last Updated:** 15 de Janeiro de 2026  
**Tamanho Otimizado:** ~200MB (sem node_modules)  
**Economia de Créditos:** 95%
