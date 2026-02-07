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

- **Multi-Tenant Architecture:** Data isolation for resellers via `reseller_id`, with shared global settings.
- **Shipping Platform:** Integration with multiple carriers for freight quotation and tracking.
- **NEXUS Reseller Platform:** An authenticated portal for resellers with dashboards, sales tracking, and financial summaries.
- **Digital Signature System:** Comprehensive platform featuring contract generation, biometric verification, document/residence proof validation, identity validation, multi-step client signing, and real-time previews. **Structure:** 3-page system (Criar → Personalizar → Contratos). **Simplified Personalizar page** uses ONE unified color palette (6 colors: background, title, text, button, button_text, icon) applied to the entire signature flow. Logo upload auto-generates 6 color variations via `colorExtractor.ts`. Text customization limited to contract HTML and app URL only. Colors saved with backward-compatible legacy field mapping (primary_color, verification_primary_color, etc.). Both public endpoints (`/public/contract/:token` and `/public/contracts/:token/full`) merge global config to ensure colors reach public URLs reliably. PublicSignatureApp.tsx uses unified palette with legacy fallback chain.
- **Video Conferencing:** Powered by 100ms, offering dynamic roles, public links, automatic participant check-in, server-side recording, and customizable room branding with dynamic color extraction from uploaded logos.
- **n8n Integration:** Enables tenants to generate API keys for custom automation workflows.
- **Public Checkout System:** Allows unauthenticated customers to make purchases from public storefronts with server-side price validation.
- **Wallet / Credit System:** A pre-paid credit system for services, with atomic balance updates and webhook idempotency.
- **Pagar.me Split Payment:** Implements dynamic payment splitting between the platform and resellers based on sales volume tiers.
- **Performance Optimizations:** Critical fixes for public routes using static imports, ultra-lightweight public apps (`PublicFormApp`, `PublicMeetingApp`, `PublicSignatureApp`) to reduce bundle size, multi-layer caching for public forms and meetings, component preloading, and mobile-specific CSS optimizations.
- **Dynamic Branding System:** `CompanyContext` provides centralized branding synchronization from Supabase for real-time theming via CSS variables.
- **Platform Analytics:** Comprehensive dashboard for admins showing platform-wide sales metrics and reseller performance.
- **Commission Configuration System:** Dynamic commission tiers configurable via an admin page.
- **Dual Supabase Architecture:** `Supabase Owner` for central auth/reseller management, `Supabase Tenant` for client-specific operational data.
- **Reseller Authentication:** Resellers authenticate via email and CPF against the Owner Supabase.
- **Product Requests System:** Allows admins to view and update reseller product requests.
- **CPF Compliance Score System:** Evaluates reseller risk (0-1000 score) based on legal processes, debts, and CPF status, with race condition and duplicate protection.

## Recent Changes (February 2026)

- **Supabase Credential Saving Fix**: Fixed critical authentication failures when saving/retrieving Supabase credentials from Settings pages. Root cause: all frontend `fetch()` calls to `/api/config/*` endpoints were missing `credentials: 'include'`, so session cookies weren't sent and the `authenticateConfig` middleware rejected requests with 401. Fixed 28+ fetch calls across `src/pages/SettingsPage.tsx`, `src/platforms/mobile/pages/SettingsPage.tsx`, and `src/lib/supabase.ts`. Also enhanced `configAuth.ts` middleware to use `x-tenant-id` header as a supplement (not standalone auth) when session `userId` exists but `tenantId` is missing. Encryption handling includes smart detection for mixed plaintext/encrypted data across 6 server files.

- **Interactive Signature Flow Preview**: The Design page (Personalizar) now has a fully interactive phone mockup that cycles through all 8 steps of the signature flow (Welcome, Selfie, Document, Processing, Result, Contract, Residence Proof, Congratulations). Includes mobile/desktop view toggle, step indicator dots, animated processing step, and real-time color palette application. Component: `src/components/assinatura/SignatureFlowPreview.tsx`.

- **Public Form Access Fix**: Fixed critical 404 error when accessing public forms. Two root causes: (1) `isPublic` defaulted to `false` when creating/updating forms in `form_tenant_mapping`, now defaults to `true`. (2) FALLBACK 1 slug-only lookup path was missing Supabase lookup — forms stored in Supabase weren't found when `companySlug` in the URL didn't match the stored value. Added Supabase fetch in FALLBACK 1 path. Updated all existing `form_tenant_mapping` records to `is_public=true`.

- **CPF Compliance Deduplication Fix**: Implemented submission_id-based deduplication to prevent duplicate BigDataCorp API calls. Each form submission now gets exactly ONE CPF check, but different submissions with the same CPF are each checked as required. Added `submission_id` column to `cpf_compliance_results` table. The `getExistingCheckForSubmission()` function now checks both Supabase Master (datacorp_checks) and Client (cpf_compliance_results) by submission_id. **Migration required:** `ALTER TABLE cpf_compliance_results ADD COLUMN IF NOT EXISTS submission_id VARCHAR(255);`
- **Signature Flow Status Update Fix**: Fixed critical issue where contract status was not being updated to "assinado" when user completed the signature flow. The `save-residence-proof` endpoint now correctly updates `status='assinado'`, `virou_revendedora=true`, and `data_virou_revendedora` in Supabase. The fix removed premature `isConnected()` check that prevented lazy initialization of Supabase client.
- **Reset Total Admin UUID Fix**: Fixed `admin_supabase_credentials` deletion to use the correct admin UUID (`req.user.userId`) instead of `clientId` (tenantId string). Includes fallback search by `project_name` if UUID lookup fails.
- **Critical Cache Fix**: Fixed issue where forms weren't loading after saving Supabase credentials. The `publicCache.ts` credentials cache is now properly invalidated via `invalidateCredentialsCache(tenantId)` when credentials are saved in `/api/config/supabase`. This ensures forms and contracts load immediately after credential configuration.
- **Reset Total Feature**: Complete system reset functionality that clears all credentials (7 config tables), local cache files, and in-memory contract cache via `clearLocalContractsCache()`.
- **Frontend Cache Invalidation**: After Reset Total, all TanStack Query caches are now cleared via `queryClient.clear()` to ensure the UI shows empty state immediately.
- **Empty State on No Supabase**: When Supabase credentials are not configured, `/api/forms` and `/api/assinatura/contracts` now return empty arrays instead of falling back to local data. This ensures consistent behavior after Reset Total.
- **Signature Customization Simplification**: Rewrote PersonalizarAssinaturaPage (664→442 lines) with unified color palette (6 colors), logo-driven color extraction with 6 variations, and phone mockup preview. Deleted obsolete SimplifiedSignatureWizard.tsx (1809 lines) and SignaturePreview.tsx (571 lines). Updated PublicSignatureApp.tsx to use unified palette with legacy fallback chain. Both public contract endpoints now merge global config colors reliably.
- **Company Slug Multi-Tenant URLs**: All public URLs now include a company identifier (slug) for true multi-tenant isolation. Each tenant configures their company slug in Settings → "Identificador da Empresa (URL)". URLs updated: `/reuniao/{slug}/{id}`, `/assinar/{slug}/{token}`, `/formulario/{slug}/form/{id}`. Legacy URLs without slug still work for backward compatibility. Slug stored in `hms100msConfig.companySlug` with cache in `server/lib/tenantSlug.ts`. Default slug derived from tenantId when not configured. Settings page shows URL preview for all services.
- **Tenant-Specific N8N Routes**: Each tenant has unique n8n API URLs: `/api/n8n/{tenantId}/reunioes` alongside legacy `/api/n8n/reunioes`. Path-based authentication middleware validates both tenantId and API key. Handler functions extracted for code reuse on both route patterns.
- **Multi-Tenant Slug Collision Fix**: Fixed critical bug where multiple tenants sharing the same `company_slug` in `hms_100ms_config` caused public forms to serve data from the wrong tenant. Root cause: `fetchFormFromSupabaseDirect` iterated all Supabase configs without filtering by tenant ownership. Fix: (1) Separated tenant slugs so each tenant has a unique `company_slug`, (2) Updated `fetchFormFromSupabaseDirect` in `publicCache.ts` to filter Supabase configs by matching `company_slug` from `hms_100ms_config`, skipping tenants with non-matching slugs. (3) Cleared stale persistent disk cache (`data/form_mapping_cache.json`).

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