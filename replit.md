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
- **Digital Signature System:** Comprehensive platform featuring contract generation, biometric verification, document/residence proof validation, identity validation, multi-step client signing, and real-time previews. Includes a global appearance customization system. Optimized for progression and minimal required address fields. **Structure:** 3-page system (Criar → Personalizar → Contratos). Personalizar page features 2-step wizard (Aparência → Contrato) with extensive customization options including: progress popup colors (active/complete/inactive steps, check icon), step navigation labels and colors, selfie capture button texts, waiting instruction, 5 face detection messages, and all visual styling for the complete client flow.
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