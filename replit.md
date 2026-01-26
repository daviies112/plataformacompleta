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
- **Platform Analytics:** Comprehensive analytics dashboard for admins showing platform-wide sales metrics, top resellers, commission distribution, monthly trends, and resellers at risk (30%+ sales drop detection).

## External Dependencies

- **PostgreSQL:** Primary relational database.
- **Supabase:** Used for specific data storage and as a fallback.
- **100ms:** Video conferencing API.
- **n8n:** Workflow automation platform.
- **WhatsApp Business API:** For business communication.
- **Pagar.me:** Brazilian payment gateway for PIX and credit card payments, supporting payment splitting and tokenization.
- **Shipping Carrier APIs:** Correios, Jadlog, Loggi, Azul Cargo, Total Express for freight quotation and tracking services.
- **OpenAI API:** Used for AI-powered address extraction in residence proof validation (if configured).