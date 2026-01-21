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

## Recent Changes (January 2026)

- **Pagar.me Payment Integration:** Added complete payment processing with PIX and credit card support for the NEXUS reseller platform. Features card tokenization, input validation, and authenticated API routes. Checkout page at `/revendedora/reseller/checkout/:productId`.