# ExecutiveAI Pro - Replit Project Guide

## Overview

ExecutiveAI Pro is a multi-tenant SaaS platform designed to streamline business operations, enhance customer engagement, and improve sales processes. It integrates lead management, form handling, real-time CPF validation, WhatsApp Business, and includes a shipping platform, a reselling platform (NEXUS), n8n integration for meeting automation, and a sophisticated digital signature system with biometric verification. The project aims to consolidate essential business tools into a single, efficient, and scalable platform, providing a competitive advantage by offering a comprehensive suite of business solutions within a unified ecosystem.

## User Preferences

- I prefer simple language and clear explanations.
- I like iterative development with regular updates.
- Please ask before making major architectural changes.
- Do not make changes to the `data/` folder unless explicitly instructed, as it contains sensitive credentials.
- I prefer to be informed about credit optimization strategies for Replit deployments.

## System Architecture

ExecutiveAI Pro utilizes a modern web stack with a multi-tenant, API-driven architecture, prioritizing scalability and maintainability.

**Frontend:**
- **Technology:** React 18, TypeScript, Vite.
- **UI/UX:** TailwindCSS and shadcn/ui for a consistent design system.
- **State Management:** TanStack Query for server state and Zustand for client state.

**Backend:**
- **Technology:** Express.js with TypeScript.
- **Security:** JWT for authentication.

**Database:**
- **Primary:** PostgreSQL with Drizzle ORM.
- **Secondary/Fallback:** Supabase.

**Core Features & Technical Implementations:**

- **Multi-Tenant Architecture:** Data isolation for resellers via `reseller_id` across specific tables. Global settings are shared.
- **Shipping Platform:** Integration with multiple carriers for freight quotation and tracking.
- **NEXUS Reseller Platform:** An authenticated portal for resellers, providing dashboards, sales tracking, and financial summaries with strong data isolation.
- **Digital Signature System:** Comprehensive platform featuring contract generation, biometric verification, document/residence proof validation, identity validation, multi-step client signing, and real-time previews. Includes a global appearance customization system.
  - **Fluxo de Assinatura Otimizado:**
    - Campo "Bairro" (neighborhood) foi **REMOVIDO** do formulário de endereço (não existe no banco Supabase)
    - Campos obrigatórios: Rua, Número, Cidade, Estado, CEP (Complemento é opcional)
    - **Progressão automática**: Após captura do comprovante de endereço, avança automaticamente para assinatura (1.5s delay)
    - Arquivos: `src/components/assinatura/steps/ResellerWelcomeStep.tsx`, `src/components/assinatura/steps/ResidenceProofStep.tsx`
    - Tipo: `src/contexts/ContractContext.tsx` - `AddressData.neighborhood` é opcional (?)
- **Video Conferencing:** Powered by 100ms, offering dynamic roles, public links, automatic participant check-in, and server-side recording. Includes customizable room branding (logo, company name, colors) configured via the Design page and automatically applied to public meeting lobby and in-meeting screens. Design settings are stored in `hms_100ms_config` table and fetched via public API routes.
  - **Logo Upload with Color Extraction:** Upload de logo com extração automática de cores dominantes. Funcionalidades:
    - Slider de tamanho da logo (32-200px)
    - Select de posição da logo (Esquerda, Centro, Direita)
    - Extração automática de 5 cores principais usando algoritmo de análise de pixels
    - Geração de 6 variações de paleta de cores baseadas na logo
    - Aplicação de paleta com conversão HSL → HEX para compatibilidade
  - **Meeting Creation Routes:** `POST /api/reunioes` for instant and scheduled meetings, `POST /:id/start` and `/:id/end` for lifecycle management. All routes apply tenant's `roomDesignConfig` from `hms_100ms_config` to metadata.
  - **N8N Integration:** `POST /api/n8n/reuniao` for external automation workflows (continues working unchanged).
- **n8n Integration:** Enables tenants to generate API keys for custom automation workflows.
- **Public Checkout System:** Allows unauthenticated customers to make purchases from public storefronts with server-side price validation.
- **Wallet / Credit System:** A pre-paid credit system for services like CPF consultation and shipping, with atomic balance updates and webhook idempotency.
- **Pagar.me Split Payment:** Implements dynamic payment splitting between the platform and resellers based on monthly sales volume tiers, requiring both company and reseller Pagar.me recipient IDs.
- **Performance Optimizations:** 
  - Public routes use `isPublicRoute()` function to skip Supabase credential fetching
  - **CRITICAL FIX (Jan 2026)**: Public routes now use STATIC imports (not lazy) to eliminate loading spinners
  - **CRITICAL FIX (Feb 2026)**: Removed slow fallback in `resolvePublicFormTenant` that iterated ALL Supabase tenants (15+ seconds delay → instant)
  - **CRITICAL FIX (Feb 2026)**: Ultra-leve Public*App para TODAS as rotas públicas:
    - **Formulários**: `src/PublicFormApp.tsx` - Rotas `/f/*`, `/form/*`, `/formulario/*`, `/:slug/form/*`
    - **Reuniões**: `src/PublicMeetingApp.tsx` - Rotas `/reuniao/*`, `/reuniao-publica/*`
    - **Assinaturas**: `src/PublicSignatureApp.tsx` - Rotas `/assinar/*`, `/assinatura/*`
    - Arquivo: `src/main.tsx` - Detecta TODAS rotas públicas ANTES de importar App completo
    - NÃO carrega: TanStack Query, react-router-dom, next-themes, shadcn, lucide-react, etc.
    - Reduz bundle de 80+ módulos para ~10 módulos essenciais (react, react-dom)
    - Documentação completa: `docs/PUBLIC_FORM_PERFORMANCE_FIX.md`
  - **CRITICAL FIX (Feb 2026)**: Ultra-fast public form loading system with multi-layer caching:
    - Layer 1: In-memory cache (3ms response time)
    - Layer 2: Persistent disk cache (`data/form_mapping_cache.json`, survives restarts)
    - Layer 3: Local DB with 1 second timeout (prevents blocking on slow DB)
    - Layer 4: Direct Supabase fallback (reliable when local DB fails)
    - File: `server/lib/publicCache.ts` - `getPublicFormUltraFast()` function
  - AuthContext initializes `isLoading=false` for public routes, preventing blocking states
  - MonitoringProvider only loads for authenticated/private routes
  - Pure CSS skeletons (no heavy icon imports) for sub-50ms initial render
  - Component preloading with `requestIdleCallback` for smooth transitions
  - API timeouts with graceful fallbacks (1.5-2s max wait)
  - **FormMappingSync**: Sincroniza `is_public` do Supabase para o mapeamento local (roda a cada 5 min)
- **Dynamic Branding System:** `CompanyContext` provides centralized branding synchronization from Supabase `companies` table to the reseller dashboard, applying CSS variables dynamically for real-time theming.
- **Platform Analytics:** Comprehensive analytics dashboard for admins showing platform-wide sales metrics, top resellers, commission distribution, monthly trends, and resellers at risk.
- **Commission Configuration System:** Dynamic commission tiers configurable via an admin page, persisted to the `commission_config` table, and automatically used for payment split calculations.
- **Dual Supabase Architecture:**
  - **Supabase Owner:** Centralized authentication and reseller management.
  - **Supabase Tenant:** Client-specific operational data.
  - The analytics API aggregates data from both Supabases.
- **Payment Split Logic (Pagar.me):**
  - Platform fees: 3% Pagar.me + 3% Developer (6% total, fixed).
  - Remaining 94% divided between company and reseller based on configurable sales volume tiers (e.g., Iniciante, Bronze, Prata, Ouro).
- **Reseller Authentication:** Resellers authenticate via email and CPF, checking the `revendedoras` table in Owner Supabase and issuing a JWT token.
- **Product Requests System:** Allows admins to view and update reseller product requests.

## External Dependencies

- **PostgreSQL:** Primary relational database.
- **Supabase:** Used for specific data storage and as a fallback.
- **100ms:** Video conferencing API.
- **n8n:** Workflow automation platform.
- **WhatsApp Business API:** For business communication.
- **Pagar.me:** Brazilian payment gateway for PIX and credit card payments, supporting payment splitting and tokenization.
- **Shipping Carrier APIs:** Correios, Jadlog, Loggi, Azul Cargo, Total Express for freight quotation and tracking services.
- **OpenAI API:** Used for AI-powered address extraction in residence proof validation (if configured).
- **BigDataCorp API:** CPF/CNPJ consultation for compliance and credit analysis.
- **Sentry:** Error monitoring and tracking.
- **Redis/Upstash:** Optional caching layer.

## Sistema de Score de Confiabilidade (CPF Compliance)

### Conceito
Score de 0-1000 para avaliar risco de candidatas a revendedoras. **Quanto maior o score, mais confiável a pessoa.**

### Race Condition & Duplicate Protection
- **Proteção de 15 segundos**: O sistema impede consultas duplicadas para o mesmo CPF dentro de uma janela de 15 segundos (`datacorpCompliance.ts`).
- **Delayed Triggers**: O `LeadSyncService` utiliza um atraso de 1.5s antes de disparar consultas automáticas para garantir que estados de "em processamento" sejam propagados.

### Escala de Score
| Score | Classificação | Ação Recomendada |
|-------|---------------|------------------|
| 851-1000 | Risco Muito Baixo | Aprovar |
| 701-850 | Risco Baixo | Aprovar com atenção |
| 501-700 | Risco Médio | Avaliar manualmente |
| 301-500 | Risco Alto | Não recomendado |
| 0-300 | Risco Muito Alto | Reprovar |

### Penalidades Principais
- 1 processo como ré: -120 (score ~880)
- 2 processos como ré: -220 (score ~780)
- 3 processos como ré: -350 (score ~650)
- 4 processos como ré: -450 (score ~550)
- 5 processos como ré: -550 (score ~450) ← RISCO ALTO
- 6 processos como ré: -620 (score ~380)
- 7+ processos como ré: -700 + extras

### Outras Penalidades
- CPF irregular: -300
- Dívidas ativas: -200
- Processos últimos 30 dias: -40 cada

### Arquivos do Sistema
- Código: `src/components/compliance/process-details-modal.tsx`
- Documentação: `docs/SCORE_SYSTEM_DOCUMENTATION.md`
- Tipos: `shared/schema.ts`

---

## Documentação Crítica para Exportação

### Documento Master de Exportação

**`docs/EXPORT_MASTER_GUIDE.md`** - Guia definitivo para exportação:
- Correções críticas que NUNCA podem ser perdidas (PIX, BigDataCorp)
- **Endereço no Supabase**: Colunas obrigatórias: `address_street`, `address_number`, `address_complement`, `address_city`, `address_state`, `address_zipcode`.
- **Atenção**: O campo `address_neighborhood` NÃO existe no banco e não deve ser usado.
- **Fluxo de Assinatura Digital**: Campo "Bairro" removido do formulário; progressão automática após foto do comprovante.
- Checklist completo de exportação/importação
- Todos os arquivos essenciais documentados
- Troubleshooting de problemas comuns

### Correções Críticas do Pagar.me

**`docs/PAGARME_PIX_CRITICAL_FIXES.md`** - Correções obrigatórias:
- `closed: true` - Campo obrigatório em todas as orders
- `expires_in` como STRING (não number)
- Arquivo afetado: `server/services/pagarme.ts`

### Documento de Plataforma Completa

**`docs/PLATFORM_COMPLETE.md`** - Visão geral:
- 68 tabelas Supabase (9 Owner + 59 Tenant)
- 269 endpoints de API
- 106 variáveis de ambiente
- 11 integrações externas

### Performance de Formulários Públicos

**`docs/PUBLIC_FORM_PERFORMANCE_FIX.md`** - Documentação CRÍTICA:
- Solução completa para carregamento instantâneo (15s → <1s)
- Arquitetura de duas camadas (PublicFormApp vs App completo)
- Sistema de cores dinâmicas do designConfig
- Cache de 4 camadas para resposta ultra-rápida
- Checklist de manutenção e troubleshooting
- **NUNCA** importar bibliotecas pesadas no PublicFormApp.tsx

### Arquivos de Auditoria

Pasta `data/audit/` contém JSONs com auditoria completa:
- `api_routes.json` - 269 endpoints documentados
- `automations.json` - 9 pollers e jobs
- `integrations.json` - 11 integrações
- `supabase_tables.json` - 68 tabelas
- `environment_vars.json` - 106 variáveis