# ExecutiveAI Pro - Replit Project Guide

## Overview

ExecutiveAI Pro is a multi-tenant SaaS platform for comprehensive business management, streamlining operations, enhancing customer engagement, and improving sales processes. It integrates lead management, form handling, real-time CPF validation, WhatsApp Business, and includes a shipping platform, a reselling platform (NEXUS), n8n integration for meeting automation, and a sophisticated digital signature system with biometric verification. The project's goal is to consolidate essential business tools into a single, efficient, and scalable platform, offering a competitive edge.

## User Preferences

- I prefer simple language and clear explanations.
- I like iterative development with regular updates.
- Please ask before making major architectural changes.
- Do not make changes to the `data/` folder unless explicitly instructed, as it contains sensitive credentials.
- I prefer to be informed about credit optimization strategies for Replit deployments.

## System Architecture

ExecutiveAI Pro employs a modern web stack with a multi-tenant, API-driven architecture, focusing on scalability and maintainability.

**Frontend:**
- **Technology:** React 18, TypeScript, Vite.
- **UI/UX:** TailwindCSS and shadcn/ui.
- **State Management:** TanStack Query (server state) and Zustand (client state).

**Backend:**
- **Technology:** Express.js with TypeScript.
- **Security:** JWT for authentication.

**Database:**
- **Primary:** PostgreSQL with Drizzle ORM.
- **Secondary/Fallback:** Supabase.

**Core Features & Technical Implementations:**

- **Shipping Platform:** Integrates with multiple carriers (Correios, Jadlog, Loggi, Azul Cargo) for freight quotation and tracking.
- **NEXUS Reseller Platform:** An authenticated portal for resellers with dashboards, sales tracking, and financial summaries, ensuring data isolation via `reseller_id` filtering.
- **CPF Validation:** Multi-tiered fallback system for data retrieval and compliance.
- **WhatsApp Business:** Automated messaging integration.
- **n8n Integration:** Allows tenants to generate API keys for custom automation workflows, especially for meeting creation.
- **Video Conferencing (100ms):** Provides video conferencing with dynamic roles, public links, and automatic participant check-in, including contract data pre-filling.
- **Calendar:** Monthly grid view for meeting management.
- **SFU Recording System:** Server-side recording of video conferences.
- **Digital Signature System:** Comprehensive platform for digital contracts, including biometric verification, document capture, identity validation, multi-step client signing, and real-time previews. Contracts are automatically generated upon meeting conclusion.
- **Contract Creation Flow:** Automatically creates contracts from `form_submissions` data upon meeting conclusion, utilizing flexible phone search patterns and backend fallbacks for address data.
- **Background Jobs & Automation:** Utilizes background job queues for async processing (e.g., form submission processing, lead synchronization, CPF auto-checks) which must be initialized on server startup.
- **Session Management:** Session cookies are configured with `sameSite: 'none'` and `secure: true` for Replit preview environments.
- **Public Checkout System:** Allows unauthenticated customers to complete purchases from public storefronts, bypassing authentication while maintaining security through server-side price validation.
- **Public Store URL Feature:** Resellers can publish their stores with a public URL, featuring custom store names, slugs, publish toggles, share buttons, and QR code generation.
- **Wallet / Credit System:** A pre-paid credit system with:
  - **CPF Consultation:** R$ 2,00 per query (fixed price)
  - **Shipping:** Dynamic pricing (carrier cost + 35% margin, using TotalExpress API quotes)
  - **Other services:** Included in monthly subscription (contracts, SMS, WhatsApp)
  - Database tables: `wallets`, `wallet_transactions`, `service_prices`
  - Atomic balance updates with conditional SQL UPDATE to prevent race conditions
  - Webhook idempotency using in-memory Map (24-hour TTL)
  - **IMPORTANT:** The wallet/credit system is **ONLY active when Pagar.me credentials are configured** (`CHAVE_SECRETA` or `CHAVE_SECRETA_TESTE` + `CHAVE_PUBLICA` or `CHAVE_PUBLICA_TESTE`). Without Pagar.me credentials:
    - CPF consultations and shipping work normally without checking or charging credits
    - No "insufficient balance" errors will appear
    - Once Pagar.me is configured, the credit system activates automatically
- **Performance Optimizations:** Aggressive code splitting for public routes and heavy libraries, leading to significant improvements in loading times for public pages. Login page is treated as a public route to avoid loading unnecessary modules (notionStore, workspaceStorage, Supabase credentials) before authentication. AuthContext uses dynamic imports for Supabase and workspace reloading to defer heavy module loading until after successful login.

## External Dependencies

- **PostgreSQL:** Primary relational database.
- **Supabase:** Used for specific data storage and as a fallback.
- **100ms:** Video conferencing API.
- **n8n:** Workflow automation platform.
- **WhatsApp Business API:** For business communication.
- **Pagar.me:** Brazilian payment gateway for PIX and credit card payments, including payment splitting and tokenization.
- **Shipping Carrier APIs:** Correios, Jadlog, Loggi, Azul Cargo, Total Express for shipping services.

## TotalExpress API Integration

**Authentication:** HTTP Basic Authentication (user:password encoded in Base64 in Authorization header)

**Endpoint:** `https://edi.totalexpress.com.br/webservice_calculo_frete.php`

**Required Secrets:**
- `TOTAL_EXPRESS_USER` - Username for API access
- `TOTAL_EXPRESS_PASS` - Password for API access
- `TOTAL_EXPRESS_REID` - REID (origin identifier associated with the account)
- `TOTAL_EXPRESS_SERVICE` - Service type code (must be `EXP`, `ESP`, `PRM`, or `STD`)

**Valid Service Types:**
| Code | Description |
|------|-------------|
| `EXP` | Expresso (most common) |
| `ESP` | Especial |
| `PRM` | Premium |
| `STD` | Standard |

**WSDL Parameters (calcularFreteRequest):**
- `TipoServico` (string) - Service type code (EXP, ESP, etc.)
- `CepDestino` (integer) - Destination ZIP code (origin is associated with REID)
- `Peso` (string) - Weight in kg (e.g., "1.00")
- `ValorDeclarado` (string) - Declared value in BRL (e.g., "100.00")
- `TipoEntrega` (integer) - Delivery type (0 = standard)
- `Altura`, `Largura`, `Profundidade` (integer, optional) - Dimensions in cm

**Response Fields:**
- `CodigoProc` - Processing code (0 = success)
- `ValorServico` - Freight cost (e.g., "15,36")
- `Prazo` - Delivery time in days
- `ErroConsultaFrete` - Error message if failed

**Important Notes:**
- CEP origin is NOT sent in the request - it's associated with the REID
- Do NOT send credentials in XML body - use HTTP Basic Auth header only
- Service type "Expresso-01" is INVALID - use "EXP" instead