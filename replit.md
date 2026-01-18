# ExecutiveAI Pro - Replit Project Guide

## Overview

ExecutiveAI Pro is a multi-tenant SaaS platform designed for comprehensive business management, offering lead management, form handling, CPF validation, and WhatsApp Business integration. Its vision is to provide an all-in-one solution for businesses to streamline their operations, enhance customer engagement, and improve sales processes. Key capabilities include a robust executive dashboard, lead and form management, real-time CPF validation with history, and advanced communication features via WhatsApp Business. Recent expansions include a shipping platform, a reselling platform (NEXUS), n8n integration for meeting automation, and a sophisticated digital signature system with biometric verification. The project aims to offer a competitive edge in the market by consolidating essential business tools into a single, efficient, and scalable platform.

## User Preferences

- I prefer simple language and clear explanations.
- I like iterative development with regular updates.
- Please ask before making major architectural changes.
- Do not make changes to the `data/` folder unless explicitly instructed, as it contains sensitive credentials.
- I prefer to be informed about credit optimization strategies for Replit deployments.

## System Architecture

ExecutiveAI Pro utilizes a modern web stack designed for scalability and maintainability.

**Frontend:**
- Developed with React 18, TypeScript, and Vite for a fast and type-safe development experience.
- UI/UX is built using TailwindCSS and shadcn/ui, providing a consistent and customizable design system.
- State management is handled by TanStack Query for server state and Zustand for client state, ensuring efficient data fetching and global state management.

**Backend:**
- Powered by Express.js with TypeScript, offering a robust and scalable API layer.
- Implements JWT for secure authentication and session management.

**Database:**
- PostgreSQL is used as the primary database, managed with Drizzle ORM for type-safe database interactions.
- Utilizes Supabase for certain functionalities, acting as both a primary and fallback data store, especially for features like digital signatures and CPF validation.

**Core Features & Technical Implementations:**

- **Shipping Platform:** Integrates with multiple carriers (Correios, Jadlog, Loggi, Azul Cargo) for freight quotation and tracking.
- **NEXUS Reseller Platform:** A separate authenticated portal for resellers with dashboards, sales tracking, financial summaries, and product catalogs. It uses dedicated authentication and manages reseller-specific data.
- **CPF Validation:** Features a multi-tiered fallback system (Supabase Master -> Supabase Client -> Local PostgreSQL) for CPF data retrieval and compliance checks, with automated validation triggers upon form approval. See `docs/CPF_AUTO_CHECK_FIX_DOCUMENTATION.md` for detailed architecture.
- **WhatsApp Business:** Integration for automated messaging and communication workflows.
- **n8n Integration:** Allows tenants to generate API keys for n8n workflows, enabling custom automation for meeting creation and other tasks. Meetings automatically inherit tenant branding.
- **Video Conferencing (100ms):** Provides robust video conferencing capabilities with dynamic role assignments (host/guest), public meeting links, and features for canceling/rescheduling meetings. Includes automatic participant check-in and pre-filling of contract data from form submissions.
- **Calendar:** A monthly grid view for visualizing and managing scheduled meetings.
- **SFU Recording System:** Server-side recording of video conferences to ensure accurate capture of meeting content, synchronized with Supabase.
- **Digital Signature System:** A comprehensive platform for digital contracts with biometric (facial recognition) verification, document capture, and identity validation. Features a multi-step client signing process, real-time previews for admin, and automatic contract generation upon meeting conclusion. Integrates with Supabase for data persistence and N8N for WhatsApp notifications.
- **Optimized Export System:** Includes scripts to significantly reduce the project size for export, preserving essential configurations.

**System Design Choices:**

- Multi-tenant architecture allowing each client to manage their data securely.
- API-driven design for flexible frontend and backend communication.
- Emphasis on automation (e.g., CPF checks, N8N integration, contract generation).
- Robust error handling with mechanisms like `ErrorBoundary` for critical flows.
- Session management explicitly saved to ensure persistence across requests.
- Role-based access control for features like meeting recording and data access.

**Background Jobs & Automation (CRITICAL):**

The system uses background job queues for async processing. These MUST be initialized on startup:

1. **server/index.ts** - Must call in `setImmediate()` after server starts:
   - `initializeQueues()` - Registers job handlers and starts queue processing
   - `startAutomation()` - Starts FormPoller for Supabase submissions
   - `startMonitoring()` - Starts limit monitoring
   - `startAutomaticAlerting()` - Starts alerting system

2. **Key Files:**
   - `server/lib/queue.ts` - Job queue system with handlers
   - `server/lib/formSubmissionPoller.ts` - Polls Supabase for new submissions
   - `server/lib/automationManager.ts` - Manages automation cycles
   - `server/formularios/services/leadSync.ts` - Syncs submissions to leads and triggers CPF check

3. **CPF Auto-Check Flow:**
   - FormPoller detects new submissions in Supabase
   - Enqueues `sync_form_submission` job
   - LeadSync processes job, normalizes CPF, creates/updates lead
   - If `qualificationStatus === 'approved'` and CPF present, triggers `triggerAutoCPFCheck()`
   - BigDataCorp credentials are fetched from `bigdatacorp_config` table by tenantId

## External Dependencies

- **PostgreSQL:** Primary database.
- **Supabase:** Used for specific data storage (e.g., `revendedoras`, `cpf_compliance_results`, `contracts`, `datacorp_checks`, `supabase_master_config`) and acts as a fallback for some services.
- **100ms:** Video conferencing API for real-time communication.
- **n8n:** Workflow automation platform for integrating various services, specifically for meeting creation and WhatsApp notifications.
- **WhatsApp Business API:** For business messaging and automation.
- **Google Calendar:** For calendar synchronization (optional configuration).
- **Sentry:** For error tracking and monitoring (optional configuration).
- **Redis:** For caching and session storage (optional configuration).
- **Stripe Connect:** For payment splitting in the NEXUS reseller platform.
- **Various Shipping Carrier APIs:** (Correios, Jadlog, Loggi, Azul Cargo) for freight quotation and tracking.