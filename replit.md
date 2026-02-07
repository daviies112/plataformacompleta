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
The `app_settings` table exists in TWO databases with DIFFERENT id types:
- **Local PostgreSQL (Replit):** `id` is `SERIAL` (integer, auto-increment). Drizzle ORM schema uses `serial("id")`.
- **Supabase:** `id` is `UUID` (e.g., `00000000-0000-0000-0000-000000000001`).

**RULES:**
1. **NEVER** use hardcoded integer IDs (like `1` or `DEFAULT_SETTINGS_ID`) when querying Supabase app_settings.
2. **NEVER** use `.eq('id', 1)` or `.eq('id', someInteger)` for Supabase queries on app_settings.
3. **ALWAYS** use `.limit(1).maybeSingle()` or `.select().limit(1).single()` to fetch the first row from Supabase app_settings.
4. For updates in Supabase, first fetch the row to get its actual UUID `id`, then use `.eq('id', fetchedRow.id)` for the update.
5. For local PostgreSQL via raw SQL, use `LIMIT 1` instead of `WHERE id = 1`.
6. For local PostgreSQL via Drizzle ORM, always fetch with `.limit(1)` first, then use `existing.id` for updates.
7. The `tenant_id` column in local PostgreSQL is `NOT NULL` - always pass it when inserting.
8. The `getOrCreateLocalAppSettings(tenantId)` function requires a tenantId parameter.
9. The `getOrCreateAppSettingsInSupabase(supabase)` function uses `.limit(1).maybeSingle()` (no hardcoded IDs).

### Recent Changes (Feb 2026)
- Fixed all hardcoded `id=1` references across server/routes/formularios.ts, server/routes/config.ts, server/lib/cache.ts
- Removed `DEFAULT_SETTINGS_ID` constant entirely
- Fixed Supabase sync to properly update `active`, `active_form_id`, `active_form_url`, `company_slug` when activating forms
- Added `tenantId` parameter to `getOrCreateLocalAppSettings()` to satisfy NOT NULL constraint

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