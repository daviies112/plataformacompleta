# ExecutiveAI Pro - Replit Project Guide

## Overview

ExecutiveAI Pro is a multi-tenant SaaS platform designed to streamline business operations, enhance customer engagement, and improve sales processes. It integrates lead management, form handling, real-time CPF validation, WhatsApp Business, and includes a shipping platform, a reselling platform (NEXUS), n8n integration for meeting automation, and a sophisticated digital signature system with biometric verification. The project aims to consolidate essential business tools into a single, efficient, and scalable platform, providing a competitive advantage.

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

- **Multi-Tenant Architecture:** Data isolation for resellers via `reseller_id` across specific tables (e.g., `reseller_stores`, `sales_with_split`). Global settings are shared.
- **Shipping Platform:** Integration with multiple carriers (Correios, Jadlog, Loggi, Azul Cargo, Total Express) for freight quotation and tracking.
- **NEXUS Reseller Platform:** An authenticated portal for resellers, providing dashboards, sales tracking, and financial summaries with strong data isolation. Store configurations are persisted via a backend API using admin service roles.
- **Digital Signature System:** Comprehensive platform featuring contract generation, biometric verification, document (CNH, RG, Passaporte) and residence proof validation, identity validation, multi-step client signing, and real-time previews. Includes a global appearance customization system with Supabase persistence and local fallbacks.
- **Video Conferencing:** Powered by 100ms, offering dynamic roles, public links, automatic participant check-in, and server-side recording.
- **n8n Integration:** Enables tenants to generate API keys for custom automation workflows, particularly for meeting creation.
- **Public Checkout System:** Allows unauthenticated customers to make purchases from public storefronts, ensuring security through server-side price validation.
- **Wallet / Credit System:** A pre-paid credit system for services like CPF consultation and shipping, with atomic balance updates and webhook idempotency. This system activates only when Pagar.me credentials are configured.
- **Pagar.me Split Payment:** Implements dynamic payment splitting between the platform and resellers based on monthly sales volume tiers. This requires both company and reseller Pagar.me recipient IDs to be configured.
- **Performance Optimizations:** Aggressive code splitting for public routes and heavy libraries, and dynamic imports for authentication-related modules to improve loading times. **Note:** Core routing components (PlatformRouter, RevendedoraApp) use static imports to avoid Suspense/lazy loading issues in development.
- **Admin Supabase Context:** AdminSupabaseProvider fetches Supabase credentials via `/api/config/supabase/credentials` for admin pages. The `useResellerAnalytics` hook uses both AdminSupabaseContext and SupabaseContext to support data fetching in both admin and reseller contexts.
- **Dynamic Branding System:** CompanyContext provides centralized branding synchronization from Supabase `companies` table to reseller dashboard. Colors, logo, and styling automatically update in real-time via realtime subscriptions and polling. The system applies CSS variables dynamically to theme the entire reseller interface.
- **Platform Analytics:** Comprehensive analytics dashboard for admins showing platform-wide sales metrics, top resellers, commission distribution, monthly trends, and resellers at risk (30%+ sales drop detection). Data is fetched from Supabase Owner tables (`revendedoras`, `vendas_revendedora`) via `/api/split/resellers-analytics` endpoint using `SUPABASE_OWNER_SERVICE_KEY`.

- **Commission Configuration System:** Dynamic commission tiers configurable via `/vendas/commission-config` admin page. Configuration is persisted to `commission_config` table in tenant Supabase via `/api/split/commission-config` endpoints. The backend service (`server/services/commission.ts`) automatically reads these configurations when calculating payment splits.

- **Dual Supabase Architecture:**
  - **Supabase Owner** (`SUPABASE_OWNER_URL`/`SUPABASE_OWNER_SERVICE_KEY`): Centralized authentication, `revendedoras` table for reseller management
  - **Supabase Tenant** (from `data/supabase-config.json`): Client-specific data including `sales_with_split`, `products`, `commission_config`, and other operational tables
  - The analytics API aggregates data from both Supabases: resellers from Owner, sales from Tenant

- **Payment Split Logic (Pagar.me):**
  - Platform fees: 3% Pagar.me + 3% Developer (6% total, fixed)
  - Remaining 94% divided between company and reseller based on configured tiers:
    - Iniciante (R$0-2000): 65% reseller / 35% company (configurable)
    - Bronze (R$2000-4500): 70% / 30%
    - Prata (R$4500-10000): 75% / 25%
    - Ouro (R$10000+): 80% / 20%
  - Developer Recipient ID: `re_cmkn7cdx110b10l9tp8yk0j92`

## Key API Endpoints

- `GET /api/split/resellers-analytics` - Fetch all resellers and sales data for admin dashboard
- `GET /api/split/commission-config` - Load commission tier configuration
- `POST /api/split/commission-config` - Save commission tier configuration
- `POST /api/reseller/login` - Reseller authentication with automatic credential sync
- `GET /api/reseller/supabase-config` - Get tenant Supabase credentials for reseller

## Critical Data Files (data/ folder)

- `supabase-config.json` - Tenant Supabase credentials (URL, service key, anon key)
- `credentials.json` - Platform credentials and API keys
- `assinatura_contracts.json` - Digital signature contracts cache
- `automation_state.json` - Background job state persistence

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

## BigDataCorp CPF Compliance System

**Documentação completa:** `docs/BIGDATACORP_CPF_COMPLIANCE.md`

### Arquitetura

| Componente | Descrição |
|------------|-----------|
| `server/lib/bigdatacorpClient.ts` | Cliente HTTP para 3 APIs BigDataCorp |
| `server/lib/datacorpCompliance.ts` | Lógica de cache, análise de risco, salvamento |
| `server/lib/supabaseMaster.ts` | Conexão com Supabase Master (cache global) |
| `server/lib/clienteSupabase.ts` | Conexão com Supabase Cliente (resumo) |
| `server/routes/compliance.ts` | Endpoints REST |
| `src/pages/consultar-cpf.tsx` | Frontend da consulta |

### Tabelas Requeridas

**Supabase Master:** `datacorp_checks` (payload completo, cache global)
**Supabase Cliente:** `cpf_compliance_results` (resumo para N8N/WhatsApp)
**PostgreSQL Local:** `bigdatacorp_config` (credenciais encriptadas por tenant)

### Credenciais Necessárias

```bash
# Via banco de dados (recomendado - configura em /configuracoes)
# Tabela: bigdatacorp_config
# Campos: token_id, chave_token, supabase_master_url, supabase_master_service_role_key

# Via environment variables (fallback)
TOKEN_ID=xxx
CHAVE_TOKEN=xxx
SUPABASE_MASTER_URL=https://xxx.supabase.co
SUPABASE_MASTER_SERVICE_ROLE_KEY=eyJxxx
```

### APIs e Custos

| API | Dataset | Custo |
|-----|---------|-------|
| basic_data | `basic_data{Datasets:basic_data}` | R$ 0,030 |
| collections | `collections{Datasets:collections}` | R$ 0,070 |
| processes | `processes{Datasets:lawsuit_distribution_data}` | R$ 0,070 |
| **Total** | - | **R$ 0,17** |

### Campo `source` no datacorp_checks

| Valor | Descrição | Custo |
|-------|-----------|-------|
| `bigdatacorp_v3_complete` | Nova consulta | R$ 0,17 |
| `cache_hit_manual` | Cache em consulta manual | R$ 0,00 |
| `reused_from_cache` | Cache em automação | R$ 0,00 |

### Endpoints Principais

- `POST /api/compliance/check` - Consultar CPF
- `GET /api/compliance/history` - Histórico de consultas
- `GET /api/compliance/download-pdf/:id` - Baixar PDF
- `POST /api/compliance/reprocess/:id` - Reprocessar

## Complete Platform Documentation

For a comprehensive and exhaustive documentation of the entire platform, see:

**`docs/PLATFORM_COMPLETE.md`** - Master document with:
- All 68 Supabase tables (9 Owner + 59 Tenant)
- All 287 API endpoints
- All 106 environment variables
- All 11 external integrations
- All 28 automated processes
- All 109+ frontend pages
- Export/import guides
- Troubleshooting section

## Audit Files

Detailed JSON audits are available in `/data/audit/`:

| File | Description |
|------|-------------|
| `api_routes.json` | 287 endpoints with auth types |
| `automations.json` | 28 pollers and background jobs |
| `data_files.json` | 14 persistent data files |
| `environment_vars.json` | 67 environment variables |
| `frontend_structure.json` | 109+ pages and components |
| `integrations.json` | 11 external integrations |
| `supabase_tables.json` | 68 tables with field definitions |

## Key Admin Routes

| Route | Description |
|-------|-------------|
| `/vendas/dashboard` | Sales overview |
| `/vendas/products` | Product management |
| `/vendas/product-requests` | Reseller product requests |
| `/vendas/resellers` | Reseller management |
| `/vendas/commission-config` | Commission tier configuration |
| `/vendas/bank-data` | Bank account management |
| `/vendas/analytics` | Platform analytics |

## Reseller Authentication

Resellers authenticate via `/api/reseller/auth/login` with:
- Email
- CPF (11 digits)

The system checks the `revendedoras` table in Owner Supabase and issues a JWT token.

## Product Requests System

Admin views reseller product requests via:
- **GET** `/api/split/product-requests` - List all requests
- **PATCH** `/api/split/product-requests/:id` - Update status

These routes use `requireAdmin` middleware and fetch from Tenant Supabase `product_requests` table.

## Recent Changes Log

| Date | Change |
|------|--------|
| 2026-01-27 | **CRITICAL PIX FIX**: Added `closed: true` to all Pagar.me order requests (required by API V5 PSP) |
| 2026-01-27 | **CRITICAL PIX FIX**: Changed `expires_in` from NUMBER to STRING per official Pagar.me documentation |
| 2026-01-27 | Added `additional_information` field to PIX payments for better transaction tracking |
| 2026-01-27 | Created comprehensive BigDataCorp CPF Compliance documentation (docs/BIGDATACORP_CPF_COMPLIANCE.md) |
| 2026-01-27 | Fixed cache-hit not appearing in history - now creates new record with origin_check_id |
| 2026-01-27 | Added personName/personCpf to all checkCompliance return paths for proper name display |
| 2026-01-27 | Fixed PDF download error - API now returns both `id` and `checkId` for compatibility |
| 2026-01-27 | Fixed CPF history data persistence - payload now saved correctly with all 3 APIs |
| 2026-01-27 | Fixed process count extraction in history (using correct path TotalLawsuits) |
| 2026-01-27 | Fixed history merge logic - prioritizes full datacorp_checks records over summaries |
| 2026-01-27 | Fixed BigDataCorp field mapping (TotalProcesses→TotalLawsuits, ProcessList→Lawsuits) |
| 2026-01-27 | Added normalization for party fields (PartyType→Type, PartyCategory→Polarity) |
| 2026-01-27 | Added debug logging in bigdatacorpClient.ts for API response tracking |
| 2026-01-27 | Fixed product requests admin route (was using reseller auth) |
| 2026-01-27 | Created comprehensive platform audit documentation |
| 2026-01-27 | Fixed stock forecasting infinite loading |

---

**Last Updated:** 2026-01-27