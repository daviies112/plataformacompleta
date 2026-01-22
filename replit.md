# ExecutiveAI Pro - Replit Project Guide

## Overview

ExecutiveAI Pro is a multi-tenant SaaS platform designed for comprehensive business management, aiming to be an all-in-one solution for streamlining operations, enhancing customer engagement, and improving sales processes. It offers lead management, form handling, real-time CPF validation, and WhatsApp Business integration. Recent expansions include a shipping platform, a reselling platform (NEXUS), n8n integration for meeting automation, and a sophisticated digital signature system with biometric verification. The project's ambition is to provide a competitive edge by consolidating essential business tools into a single, efficient, and scalable platform.

## User Preferences

- I prefer simple language and clear explanations.
- I like iterative development with regular updates.
- Please ask before making major architectural changes.
- Do not make changes to the `data/` folder unless explicitly instructed, as it contains sensitive credentials.
- I prefer to be informed about credit optimization strategies for Replit deployments.

## System Architecture

ExecutiveAI Pro utilizes a modern web stack designed for scalability and maintainability, emphasizing a multi-tenant, API-driven architecture with robust error handling and automation.

**Frontend:**
- **Technology:** React 18, TypeScript, Vite.
- **UI/UX:** TailwindCSS and shadcn/ui for a consistent design system.
- **State Management:** TanStack Query (server state) and Zustand (client state).

**Backend:**
- **Technology:** Express.js with TypeScript.
- **Security:** JWT for authentication.

**Database:**
- **Primary:** PostgreSQL managed with Drizzle ORM.
- **Secondary/Fallback:** Supabase for specific functionalities and data stores.

**Core Features & Technical Implementations:**

- **Shipping Platform:** Integrates with multiple carriers (Correios, Jadlog, Loggi, Azul Cargo) for freight quotation and tracking.
- **NEXUS Reseller Platform:** An authenticated portal for resellers with dashboards, sales tracking, and financial summaries. It implements comprehensive data isolation at the application level to prevent cross-tenant data leakage, ensuring all data access is filtered by `reseller_id`. The login system is automatic, validating against a master Supabase table and securely storing reseller-specific Supabase credentials locally.
- **CPF Validation:** Multi-tiered fallback system for data retrieval and compliance checks, with automated validation triggers.
- **WhatsApp Business:** Integration for automated messaging.
- **n8n Integration:** Allows tenants to generate API keys for custom automation workflows, especially for meeting creation.
- **Video Conferencing (100ms):** Provides video conferencing with dynamic roles, public links, and automatic participant check-in, including contract data pre-filling.
- **Calendar:** Monthly grid view for meeting management.
- **SFU Recording System:** Server-side recording of video conferences.
- **Digital Signature System:** Comprehensive platform for digital contracts, including biometric verification, document capture, and identity validation. Features a multi-step client signing process and real-time previews for admins. Contracts are automatically generated upon meeting conclusion.
- **Contract Creation Flow:** Automatically creates contracts from `form_submissions` data upon meeting conclusion, using flexible phone search patterns and backend fallbacks for address data. Specific column mappings handle data transfer between tables.
- **Background Jobs & Automation:** Utilizes background job queues for async processing (e.g., form submission processing, lead synchronization, CPF auto-checks). These are critical and must be initialized on server startup.
- **Session Management:** Session cookies are configured with `sameSite: 'none'` and `secure: true` for compatibility with Replit preview environments.

## External Dependencies

- **PostgreSQL:** Primary relational database.
- **Supabase:** Used for specific data storage, critical tables (e.g., `revendedoras`, `contracts`), and as a fallback.
- **100ms:** Video conferencing API.
- **n8n:** Workflow automation platform.
- **WhatsApp Business API:** For business communication.
- **Stripe Connect:** For payment splitting in the NEXUS reseller platform.
- **Pagar.me:** Brazilian payment gateway for PIX and credit card payments in NEXUS reseller platform. Uses tokenization for PCI compliance. Requires `CHAVE_SECRETA` and `CHAVE_PUBLICA` secrets.
- **Shipping Carrier APIs:** Correios, Jadlog, Loggi, Azul Cargo for shipping services.

## Documentation

- **`docs/PAGARME_SPLIT_IMPLEMENTATION.md`**: Documentacao completa do sistema de Split de Pagamentos Pagar.me, incluindo arquitetura, endpoints, fluxos e troubleshooting.
- **`docs/CODE_BACKUP_PAGARME.md`**: Backup completo do codigo-fonte do sistema de pagamentos para preservacao e exportacao.

## Recent Changes (January 2026)

- **Complete Stripe to Pagar.me Migration:** Fully removed Stripe dependencies and migrated all payment processing to Pagar.me. Changes include:
  - Deleted `StripeService.ts` and `stripePayment.ts` files
  - Refactored `PaymentCard.tsx` with custom card form using Pagar.me tokenization API
  - Updated `PaymentService.ts` to use Pagar.me endpoints (`/api/pagarme/process-payment`)
  - Removed `@stripe/react-stripe-js`, `@stripe/stripe-js`, and `@types/stripe` packages
  - Updated authentication middleware to whitelist Pagar.me routes
- **Structured Logging with Pino:** Added `server/lib/logger.ts` with context-specific loggers for Payment, Pagar.me, Auth, Database, and API. Supports pretty-printing in development and JSON in production.
- **Security Hardening:** SESSION_SECRET now fails fast in production if not set, preventing deployment with insecure defaults.
- **Database Type Updates:** Replaced `stripe_account_id` with `pagarme_recipient_id` across type definitions.
- **Reseller Bank Account Setup (Complete):** Full KYC onboarding for resellers (CPF) to receive split payments via Pagar.me. Includes personal data, complete address, and bank account information with strict validation. Endpoint: `/api/pagarme/onboarding-revendedora`. Recipient IDs stored in `revendedoras.pagarme_recipient_id`.
- **Commission Tiers System:** Dynamic commission management with 4 tiers: Iniciante (65%/35%), Bronze (70%/30%), Prata (75%/25%), Ouro (80%/20%). Admin page at `/billing/comissoes`.
- **Public Checkout System (Complete):** Unauthenticated customers can now complete purchases from public storefronts via `/checkout/:productId?storeId=X`. The system bypasses authentication while maintaining security through server-side price validation. Uses the `products` table (not `reseller_products`) and `reseller_stores` for store lookup. Product validation checks if `productId` is in `storeData.product_ids` array to prevent cross-store purchases.
- **Pagar.me Test Mode:** Payment service now prioritizes test credentials (`CHAVE_SECRETA_TESTE` and `CHAVE_PUBLICA_TESTE`) for development, falling back to production keys when not present.
- **Public Store URL Feature:** Resellers can now publish their stores with a public URL (`/loja/:storeId`) for customers to view and purchase products. Features include custom store name and slug, toggle to publish/unpublish, copy link button, WhatsApp share button, and QR code generation. The public page displays products by category with checkout integration via Pagar.me. Security measures include using anon key (not service-role) for public access and removing PII from public responses.
- **Pagar.me Payment Integration:** Added complete payment processing with PIX and credit card support for the NEXUS reseller platform. Features card tokenization, input validation, and authenticated API routes.
- **Public Form Performance Optimization:** Improved loading speed for public forms (/f/:token, /form/:id) with multiple optimizations:
  - Created `FormLoader` component for lightweight loading states
  - Added HTTP cache headers (`Cache-Control: public, max-age=60, stale-while-revalidate=300`) to public form endpoints
  - New optimized endpoint `/api/forms/public/with-token/:token` that combines token validation + form fetch in single request
  - Lazy loading for `FormularioPublicoWrapper` via React.lazy() + Suspense
  - Increased progress update debounce from 1s to 3s to reduce network requests
  - Expected improvement: ~75% faster Time to Interactive
- **Public Meeting Room Performance Optimization (100ms):** Improved loading speed for public meeting rooms (`/reuniao/:companySlug/:roomId`) with multiple optimizations:
  - Created `meetingLogger` utility (`src/lib/meetingLogger.ts`) to disable console.logs in production
  - SDK preloading in `MeetingLobby` while user fills their name (reduces perceived load time)
  - New optimized endpoint `/api/public/reunioes/public/:companySlug/:roomId/full` that combines meeting data + room design config + token in single request
  - Token caching in `sessionStorage` (23-hour TTL) to eliminate redundant token generation for returning users
  - Added HTTP cache headers to public meeting endpoints (`Cache-Control: private, max-age=60`)
  - Reduced connection timeout from 30s to 10s for faster failure detection and retry
  - Expected improvement: ~60% faster Time to Meeting (from 4-6s to ~2s)

## Known Blockers

- **Pagar.me Split/Marketplace**: The Split feature must be enabled by Pagar.me support on both sandbox and production environments. Error "action_forbidden" indicates this feature is not yet activated.