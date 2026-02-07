# ExecutiveAI Pro - Replit Project Guide

## Overview

ExecutiveAI Pro is a multi-tenant SaaS platform designed to streamline business operations, enhance customer engagement, and improve sales processes. It integrates lead management, form handling, real-time CPF validation, WhatsApp Business, a shipping platform, a reselling platform (NEXUS), n8n integration for meeting automation, and a sophisticated digital signature system with biometric verification. The project's vision is to consolidate essential business tools into a single, efficient, and scalable platform, providing a comprehensive suite of business solutions within a unified ecosystem.

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

- **Multi-Tenant Architecture:** Data isolation for resellers via `reseller_id`, with shared global settings and unique company slugs for public URLs.
- **Shipping Platform:** Integration with multiple carriers for freight quotation and tracking.
- **NEXUS Reseller Platform:** An authenticated portal for resellers with dashboards, sales tracking, and financial summaries.
- **Digital Signature System:** Comprehensive platform featuring contract generation, biometric verification, document/residence proof validation, identity validation, multi-step client signing, and real-time previews. It includes a simplified "Personalizar" page with a unified color palette derived from logo uploads and an interactive signature flow preview.
- **Video Conferencing:** Powered by 100ms, offering dynamic roles, public links, automatic participant check-in, server-side recording, and customizable room branding with dynamic color extraction from uploaded logos.
- **n8n Integration:** Enables tenants to generate API keys for custom automation workflows with tenant-specific API routes.
- **Public Checkout System:** Allows unauthenticated customers to make purchases from public storefronts with server-side price validation.
- **Wallet / Credit System:** A pre-paid credit system for services, with atomic balance updates and webhook idempotency.
- **Pagar.me Split Payment:** Implements dynamic payment splitting between the platform and resellers based on sales volume tiers.
- **Performance Optimizations:** Critical fixes for public routes using static imports, ultra-lightweight public apps, multi-layer caching, component preloading, and mobile-specific CSS optimizations.
- **Dynamic Branding System:** `CompanyContext` provides centralized branding synchronization from Supabase for real-time theming via CSS variables.
- **Platform Analytics:** Comprehensive dashboard for admins showing platform-wide sales metrics and reseller performance.
- **Commission Configuration System:** Dynamic commission tiers configurable via an admin page.
- **Dual Supabase Architecture:** `Supabase Owner` for central auth/reseller management, `Supabase Tenant` for client-specific operational data.
- **Reseller Authentication:** Resellers authenticate via email and CPF against the Owner Supabase.
- **Product Requests System:** Allows admins to view and update reseller product requests.
- **CPF Compliance Score System:** Evaluates reseller risk based on legal processes, debts, and CPF status, with race condition and duplicate protection.
- **Local Database Cache Management:** Implemented automatic cleanup for local PostgreSQL tables that duplicate Supabase data (e.g., forms, submissions, leads, meetings) and a robust caching system for credentials and public data.

## Critical Architecture Rules (DO NOT VIOLATE)

### app_settings Table - Dual Database Pattern

The `app_settings` table exists in TWO databases with DIFFERENT schemas. Violating these rules breaks form activation and Supabase sync.

#### Supabase app_settings Schema (AUTHORITATIVE - DO NOT ADD COLUMNS THAT DON'T EXIST)
```sql
create table public.app_settings (
  id uuid not null default gen_random_uuid(),
  company_name text null,
  company_slug text null,
  supabase_url text null,
  supabase_anon_key text null,
  active_form_id uuid null,
  redis_commands_today integer null default 0,
  redis_commands_date date null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  active_form_url text null
);
```

#### Local PostgreSQL (Replit) app_settings
- `id` is `SERIAL` (integer, auto-increment). Drizzle ORM schema uses `serial("id")`.
- Has additional columns like `tenant_id`, `redis_commands_month`, etc.

#### MANDATORY RULES FOR SUPABASE app_settings:
1. **NEVER** send columns that don't exist in Supabase. The Supabase table does NOT have: `active`, `tenant_id`, `redis_commands_month`, `redis_commands_month_start`. Sending these causes silent failures.
2. **NEVER** use hardcoded integer IDs (like `1` or `DEFAULT_SETTINGS_ID`). Supabase uses UUID.
3. **NEVER** use `.eq('id', 1)` or `.eq('id', someInteger)` for Supabase queries.
4. **ALWAYS** use `.limit(1).maybeSingle()` to fetch the first row from Supabase app_settings.
5. For updates, first fetch the row to get its UUID `id`, then use `.eq('id', fetchedRow.id)`.
6. **ONLY** send these columns in Supabase insert/update: `company_name`, `company_slug`, `supabase_url`, `supabase_anon_key`, `active_form_id`, `active_form_url`, `redis_commands_today`, `redis_commands_date`, `created_at`, `updated_at`.

#### MANDATORY RULES FOR LOCAL PostgreSQL app_settings:
7. For raw SQL, use `LIMIT 1` instead of `WHERE id = 1`.
8. For Drizzle ORM, fetch with `.limit(1)` first, then use `existing.id` for updates.
9. The `tenant_id` column is `NOT NULL` - always pass it when inserting.

#### Helper Functions:
- `getOrCreateLocalAppSettings(tenantId)` - for LOCAL PostgreSQL. Requires tenantId.
- `getOrCreateAppSettingsInSupabase(supabase)` - for SUPABASE. Uses `.limit(1).maybeSingle()`.

#### Files that touch Supabase app_settings (audit these if issues arise):
- `server/routes/formularios.ts` - Form activation (PUT /config/ativo) syncs to Supabase
- `server/routes/config.ts` - Public settings update syncs company_slug to Supabase
- `server/lib/automationManager.ts` - Reads company_slug from Supabase (read-only)
- `server/lib/cache.ts` - LOCAL only (redis command counters)
- `server/routes/auth.ts` - LOCAL only (slug sync on login)

### Errors Fixed (Feb 2026) - Reference for Debugging
| Error | Cause | Fix |
|-------|-------|-----|
| `invalid input syntax for type uuid: "1"` | Code used `.eq('id', 1)` on Supabase (UUID column) | Use `.limit(1).maybeSingle()` instead |
| `null value in column "tenant_id"` | `getOrCreateLocalAppSettings()` called without tenantId | Always pass tenantId parameter |
| `active_form_id` not saving to Supabase | Update payload included `active: true` but column doesn't exist in Supabase, causing silent rejection | Removed `active: true` from all Supabase payloads |
| `DEFAULT_SETTINGS_ID = 1` used everywhere | Constant assumed integer ID in Supabase | Removed constant entirely |
| Meeting design not persisting | Supabase SELECT had no tenant filter, ambiguous results | Added `.eq('tenant_id', user.tenantId)` with fallback for single-tenant setups |
| Reseller branding not applying after save | `refetchBranding()` not called after save in Branding.tsx | Added `useBranding()` hook and call `refetchBranding()` post-save |

### Customization Persistence - Multi-Tenant Architecture

All customizations MUST persist to Supabase (not just locally) because new admin logins need to see the same data.

#### Meeting (100ms) Room Design
- **Save endpoint:** `PATCH /api/reunioes/room-design` in `server/routes/meetings.ts`
- **Saves to:** Local `hms_100ms_config` table + Supabase `hms_100ms_config` table (sync)
- **Supabase column:** `room_design_config` (JSONB)
- **Read path (frontend):** `RoomDesignSettings.tsx` reads ONLY from backend API `/api/reunioes/room-design` (NOT directly from Supabase - this was a bug that caused stale data)
- **Read path (backend):** GET from local DB first, with Supabase fallback if local is empty
- **Key pattern:** Uses tenant-scoped queries with fallback for single-tenant Supabase setups

#### Reseller Platform Branding (NEXUS)
- **Save:** Frontend `Branding.tsx` saves directly to Supabase `companies` table + calls `refetchBranding()` post-save
- **Read (authenticated pages):** `CompanyContext.tsx` reads from Supabase `companies` table via AdminSupabaseContext + applies CSS variables
- **Read (login/public pages):** `CompanyContext.tsx` falls back to `GET /api/public/branding` endpoint (in `server/routes/publicStore.ts`) when no Supabase client is available. This endpoint fetches from Supabase server-side with 60s cache.
- **Key columns:** `background_color`, `heading_color`, `text_color`, `button_color`, `button_text_color`, `sidebar_background`, `logo_url`, `primary_color`, `secondary_color`
- **Important:** Login page is NOT inside AdminSupabaseProvider, so it relies on the public branding API endpoint

#### Signature Customization
- **Status:** Working correctly - saves to Supabase and shows on public URLs
- **Table:** Contract-specific data in Supabase tenant database

## External Dependencies

- **PostgreSQL:** Primary relational database.
- **Supabase:** Used for specific data storage and as a fallback.
- **100ms:** Video conferencing API.
- **n8n:** Workflow automation platform.
- **WhatsApp Business API:** For business communication.
- **Pagar.me:** Brazilian payment gateway for PIX and credit card payments, supporting payment splitting.
- **Shipping Carrier APIs:** Correios, Jadlog, Loggi, Azul Cargo, Total Express for freight services.
- **OpenAI API:** Used for AI-powered address extraction (if configured).
- **BigDataCorp API:** CPF/CNPJ consultation for compliance.
- **Sentry:** Error monitoring and tracking.
- **Redis/Upstash:** Optional caching layer.