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
✅ Validação CPF  
✅ WhatsApp Business  
✅ Video Conferencing (100ms) - ATUALIZADO (04/01/2026)
   - API Routes: `/api/reunioes`, `/api/reunioes/instantanea`, `/api/gravacoes`
   - Acessível via menu "Reunião" no header
   - Configure credenciais do 100ms em Configurações antes de criar reuniões
   - Veja: `DOCUMENTACAO_CORRECAO_100MS.md` (detalhado)
✅ **Sistema de Exportação Otimizado** - ATUALIZADO (03/01/2026)
   - Scripts de limpeza preservam a pasta `data/` para manter credenciais.
   - Veja: `DOCUMENTACAO_PERSISTENCIA_EXPORT.md`
✅ Label Designer  
✅ **Sistema de Gravações** - CORRIGIDO (30/12/2025)  
   - Veja: `DOCUMENTACAO_CORRECOES_GRAVACOES.md` (detalhado)  
   - Veja: `CHECKLIST_GRAVACOES.md` (verificação rápida)

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

**Last Updated:** 03 de Janeiro de 2026  
**Tamanho Otimizado:** ~200MB (sem node_modules)  
**Economia de Créditos:** 95%
