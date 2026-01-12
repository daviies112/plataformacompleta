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
✅ Validação CPF + Histórico - ATUALIZADO (08/01/2026)
   - Endpoint: `/api/compliance/history` retorna histórico completo
   - Dados armazenados na tabela `cpf_compliance_results` (Supabase Cliente)
   - Campo `nome` mapeado corretamente para `personName`
   - Fallback chain: Supabase Master (`datacorp_checks`) → Supabase Cliente (`cpf_compliance_results`) → PostgreSQL local
   - **Credenciais corrigidas:** URL e API Key do projeto `axrvyrpefpntacuibyds` armazenadas criptografadas na tabela `supabase_master_config`
   - Fallback automático para Cliente quando Master está vazio (0 registros)  
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
✅ Video Conferencing (100ms) - ATUALIZADO (12/01/2026)
   - API Routes: `/api/reunioes`, `/api/reunioes/instantanea`, `/api/gravacoes`
   - Acessível via menu "Reunião" no header
   - Configure credenciais do 100ms em Configurações antes de criar reuniões
   - **Reuniões Públicas:** Link compartilhável para usuários externos (sem autenticação)
   - **Correção Tela Preta (v3):** Melhorias na conexão do SDK v0.11.0
     - Verificação de token válido antes de tentar conexão
     - Conexão inicia com áudio/vídeo MUTADOS para evitar problemas de dispositivos
     - Logs de debug detalhados para diagnóstico (`[Meeting100ms]` no console)
     - Timeout de 30s com retry automático (até 3 tentativas)
     - Botão "Tentar Novamente" para retry manual sem recarregar página
   - **React Hooks:** Corrigida ordem de chamadas para evitar violações das regras de hooks
   - **IMPORTANTE - Configuração do Dashboard 100ms:**
     - A role "guest" deve existir no template e ter permissões de subscribe
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
✅ **Assinatura Digital** - ATUALIZADO (06/01/2026)
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
     - Usa Supabase como armazenamento principal (tabelas: `assinatura_global_config`, `assinatura_contracts`, `assinatura_signature_logs`)
     - Fallback automático para arquivo local `data/assinatura_contracts.json` quando Supabase indisponível
     - Configuração em `data/supabase-config.json` (propriedades: `supabaseUrl`, `supabaseAnonKey`)
     - Execute `supabase-assinatura-tables.sql` no Supabase SQL Editor para criar tabelas
   - **Integração com Reuniões:** 
     - Botão "Assinar" na barra de controles da reunião (Meeting100ms.tsx)
     - Botão "Assinar Contrato de Revendedor" na tela de Reunião Encerrada (PublicMeetingRoom.tsx)
     - Criação automática de contrato ao encerrar reunião

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

**Last Updated:** 12 de Janeiro de 2026  
**Tamanho Otimizado:** ~200MB (sem node_modules)  
**Economia de Créditos:** 95%
