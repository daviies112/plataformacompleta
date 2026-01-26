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
  - **Multi-Tenant Data Isolation:** All reseller data is isolated by `reseller_id`:
    - **Isolated Tables:** reseller_stores, reseller_profiles, reseller_alerts, sales_with_split, withdrawals, bank_accounts, orders, payment_links, product_requests, commission_splits, gamification_activities
    - **Shared Tables (no reseller_id):** products, gamification_badges, gamification_challenges, gamification_rewards, gamification_leagues, gamification_config, commission_config (global settings)
  - **Dual Persistence Strategy:** Store configuration uses localStorage with reseller_id prefix + Supabase fallback
    - localStorage keys: `reseller_store_config_${resellerId}`, `commission_config_${resellerId}`
    - Automatic fallback when Supabase tables don't exist
  - **Two Supabase Instances:**
    - Cliente (axrvyrpefpntacuibyds.supabase.co): contracts, forms, reseller data
    - Master (uniewwcpalbctkahdyxv.supabase.co): revendedoras table for login/registration
  - **Data Isolation & Persistence:**
    - All reseller-specific tables (reseller_stores, sales_with_split, etc.) MUST include a `reseller_id` column for multi-tenant isolation.
    - Store configuration uses an `upsert` strategy on the `reseller_stores` table with `onConflict: 'reseller_id'` to prevent duplicates and ensure persistence.
    - Local fallback: `localStorage` with prefix `reseller_store_config_${resellerId}` is used as a secondary cache.
    - Global settings like `products` are shared across all resellers.
- **CPF Validation:** Multi-tiered fallback system for data retrieval and compliance.
- **WhatsApp Business:** Automated messaging integration.
- **n8n Integration:** Allows tenants to generate API keys for custom automation workflows, especially for meeting creation.
- **Video Conferencing (100ms):** Provides video conferencing with dynamic roles, public links, and automatic participant check-in, including contract data pre-filling.
- **Calendar:** Monthly grid view for meeting management.
- **SFU Recording System:** Server-side recording of video conferences.
- **Digital Signature System:** Comprehensive platform for digital contracts, including biometric verification, document capture, identity validation, multi-step client signing, and real-time previews. Contracts are automatically generated upon meeting conclusion.
  - **Global Appearance Settings:** Centralized customization system for all public contract/signature pages:
    - Supabase table: `global_appearance_settings` (identifier='default')
    - Local fallback: `data/assinatura_global_config.json`
    - API endpoints:
      - `GET /api/assinatura/public/global-config` - Fetch current settings (public)
      - `PUT /api/assinatura/public/global-config` - Save settings (public, auto-saves to Supabase + local)
    - Settings include: primary_color, text_color, font_family, logo_url, company_name, verification colors, progress page colors, parabens page colors, etc.
    - Contract pages automatically merge global settings with contract-specific overrides (contract values take priority if not null)
  - **Document Validation:** Intelligent validation of Brazilian documents (CNH, RG, Passaporte) with:
    - Selfie detection to reject photos of faces instead of documents
    - CNH validation: horizontal format (1.3-1.8 aspect ratio), minimum 400x250 resolution
    - RG validation: requires BOTH front and back photos, flexible aspect ratio (0.6-1.6)
    - Passaporte validation: vertical format (0.65-1.0 aspect ratio), MRZ zone detection
    - API endpoint: `POST /api/assinatura/public/validate-document`
  - **Residence Proof Validation:** AI-powered address verification step in contract signing flow:
    - Mobile-first camera capture for residence proof photos (utility bills, bank statements, etc.)
    - AI address extraction and comparison with form data (requires OPENAI_API_KEY)
    - Fallback validation for manual review when AI is not configured
    - Supabase columns: `residence_proof_validated`, `residence_proof_confidence`, `residence_proof_extracted_address`, `residence_proof_date`, `residence_proof_manual_review`, `residence_proof_photo`
    - API endpoints:
      - `POST /api/assinatura/public/validate-residence-proof` - Validates proof with AI and persists result
      - `POST /api/assinatura/public/save-residence-proof` - Saves proof for manual review cases
    - Contract signing flow step order: Verification → Contract → Address Form → Residence Proof → App Download → Success
    - State restoration: Page refresh resumes at correct step based on contract progress (signed_at, address, residence_proof fields)
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

**Test Mode (Development):**
- Set `TOTAL_EXPRESS_TEST_MODE=true` to enable test mode
- In test mode, shipments are simulated WITHOUT actually registering with TotalExpress
- Tracking codes are generated locally (format: `TE{timestamp}BR`)
- Labels print in test mode with a "MODO TESTE" badge
- Test mode is useful for development and testing without incurring shipping costs
- For production, set `TOTAL_EXPRESS_TEST_MODE=false` or remove the variable

**API Endpoints:**

*Quote (Public):*
- `POST /api/public/frete/cotar` - No authentication required
- Request: `{ cepDestino, peso, altura, largura, comprimento, valorDeclarado }`
- Response: `{ success, transportadora_nome, servico, valor_frete, prazo_dias, error? }`

*Register Shipment (Authenticated):*
- `POST /api/envio/total-express/registrar` - Creates shipment with TotalExpress
- Request includes: `pedido`, `destinatarioNome`, `destinatarioCep`, dimensions, weight, etc.
- Response: `{ success, codigoRastreio, awb, etiquetaUrl?, error? }`

*Labels:*
- `GET /api/envio/total-express/etiqueta/:awb` - Download/print shipping label
- Returns PDF or HTML label (test mode returns HTML with auto-print)

*Tracking:*
- `GET /api/envio/total-express/rastrear/:codigo` - Track shipment

*Test Mode Status:*
- `GET /api/envio/total-express/test-mode` - Check if test mode is active

**Frontend Pages:**
- `/envio` - Quote page (Cotação de Frete)
- `/envio/enviar` - Create shipment page
- `/envio/lista` - Shipment list
- `/envio/rastreamento` - Tracking page