# MeetFlow - Online Meeting Management Platform

## Overview

MeetFlow is a multi-tenant SaaS platform for scheduling and conducting online meetings, designed for businesses. It offers a comprehensive solution with video conferencing, calendar-based scheduling, meeting management, and automation workflows. Key capabilities include room creation, participant token generation, recording, transcription, and customizable public booking pages with white-label video room branding.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 19 with TypeScript
- **Styling**: TailwindCSS v4 with shadcn/ui (New York style)
- **State Management**: Zustand (local), TanStack Query (server)
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation
- **Structure**: Page-based with protected routes, organized components (UI primitives, features, pages).

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **API Style**: RESTful JSON API
- **Authentication**: JWT tokens
- **Build**: Vite for frontend, esbuild for backend. Serves static assets in production.

### Data Layer
- **Database**: PostgreSQL via Drizzle ORM
- **Schema**: Defined in `shared/schema.ts`, managed with Drizzle Kit.
- **Key Entities**: `users`, `tenants`, `usuariosTenant`, `reunioes`, `transcricoes`, `meeting_types`, `meeting_bookings`, `meeting_confirmation_pages`, `roomDesignConfig`.

### Multi-tenancy
Isolated data per tenant with individual 100ms credentials. Tenant context is enforced via middleware.

### Authentication Flow
Standard JWT-based authentication with client-side token storage and middleware validation.

### Feature Specifications
- **Public Booking Pages**: Customizable booking pages (`/agendar/{company}/{slug}`) with configurable meeting types, availability, and booking fields.
- **Public Video Meeting Room**: Client-facing video room (`/reuniao/{company}/{roomId}`) with company branding, lobby, and integrated 100ms functionality.
- **White-Label Video Room Customization**: Full customization of video meeting UI (colors, branding, lobby, in-meeting elements, end screen) stored in `roomDesignConfig` in the `tenants` table.
- **Bookings Management**: Dashboard for viewing and managing client bookings with filters and status updates.
- **Confirmation Pages Editor**: Tool to create and customize post-booking confirmation pages.

## External Dependencies

- **Video Conferencing**: 100ms (real-time video/audio, room creation, participant token generation)
  - Environment Variables: `HMS_APP_ACCESS_KEY`, `HMS_APP_SECRET`, `HMS_TEMPLATE_ID`, `HMS_MANAGEMENT_TOKEN`
- **Database**: PostgreSQL (via `DATABASE_URL`)
- **Automation**: n8n (webhook-based automation for meeting and booking events)
  - Environment Variable: `N8N_WEBHOOK_URL`

## Recent Changes

### December 11, 2025 - Transcription System Integration with n8n
**Complete transcription system connecting 100ms meetings to n8n workflows**

Implemented full transcription system as documented:
- **Backend n8n Service** (`server/services/n8n.ts`):
  - `notificarTranscricaoIniciada()` - Notifies n8n when transcription starts
  - `notificarTranscricaoFinalizada()` - Notifies n8n when transcription ends
  
- **Transcription API Endpoints** (`server/routes.ts`):
  - `POST /api/webhooks/iniciar-transcricao` - Public webhook to start transcription
  - `POST /api/webhooks/finalizar-transcricao` - Public webhook to finalize transcription
  - `POST /api/webhooks/transcricao-completa` - Receives completed transcription from n8n
  - `POST /api/reunioes/:id/transcricao/iniciar` - Authenticated endpoint to start transcription
  - `POST /api/reunioes/:id/transcricao/finalizar` - Authenticated endpoint to stop transcription

- **Frontend Transcription Controls** (`client/src/components/Meeting100ms.tsx`):
  - Transcription toggle button in meeting controls
  - "TRANSCREVENDO" indicator with timer when active
  - Toast notifications for transcription start/stop
  - **Auto-start transcription** when user connects to the meeting room
  - **Auto-finalize transcription** when user leaves the meeting (via button, page close, or navigation)
  - Uses `navigator.sendBeacon()` for reliable webhook delivery on page close

- **Database Schema** (`shared/schema.ts`):
  - `transcricoes` table with status tracking (pending, transcribing, completed)
  - Unique index to prevent duplicate active transcriptions

**Required Secrets:**
- `N8N_WEBHOOK_REUNIAO_INICIADA` - n8n webhook URL for meeting started (triggers when user enters meeting)
- `N8N_WEBHOOK_REUNIAO_FINALIZADA` - n8n webhook URL for meeting finalized (triggers when user leaves meeting)

**Webhook Payloads:**
```json
// Transcription Started
{
  "room_id": "693ab777dab2ac6aa54f1f86",
  "nome": "João Silva",
  "email": "joao@example.com",
  "telefone": "5511999999999",
  "data_inicio": "2025-01-15T14:00:00Z"
}

// Transcription Finalized
{
  "room_id": "693ab777dab2ac6aa54f1f86",
  "data_fim": "2025-01-15T15:00:00Z"
}
```

### December 10, 2025 - 100ms Video & Recording Fixes (v3)
**Bug Fixes: Video Display, Recording List, Token Authentication, and Environment Sync**

Fixed critical issues with 100ms video conferencing integration:
- **Video Display Fix**: Rewrote `PeerVideo` component to always render the `<video>` element (hidden with CSS when no video) instead of conditional rendering. This ensures `attachVideo` works correctly and local webcam displays properly.
- **Recording List Fix**: Recordings now appear correctly in the Gravações page with status "Concluída" (completed). 
- **Asset URL Fetching**: Updated the stop recording endpoint to fetch asset details (fileUrl, fileSize, duration) from 100ms API after stopping. The GET URL endpoint also fetches and caches presigned URLs lazily.
- **Auto-Join Support**: Public meeting room now supports auto-join via URL parameters for 100ms beam recording.
- **Public Token Endpoint Fix**: Fixed Meeting100ms component to use the public token endpoint (`/api/public/reuniao/{slug}/{roomId}/token`) for public meeting rooms, instead of the authenticated endpoint.
- **Environment Variable Sync**: Credentials from secrets (HMS_APP_ACCESS_KEY, HMS_APP_SECRET, HMS_TEMPLATE_ID, HMS_MANAGEMENT_TOKEN) are now automatically synced to the tenant database on server startup.

**Modified Files:**
- `client/src/components/Meeting100ms.tsx`: PeerVideo component always renders video element, added companySlug prop for public token fetching
- `client/src/pages/PublicMeetingRoom.tsx`: Added auto-join and recording bot support, passes companySlug to Meeting100ms
- `server/routes.ts`: Fixed recording stop to fetch 100ms asset, enhanced URL endpoint
- `server/services/hms100ms.ts`: Made meetingUrl required parameter
- `server/services/init.ts`: Added credential sync from environment variables to tenant database

### December 10, 2025 - Google Meet-like Instant Meeting Creation
**New Feature: One-Click Meeting Creation with Shareable Link Modal**

Implemented a Google Meet-style meeting creation experience:
- Clicking "Reunião Instantânea" creates a meeting instantly with one click (no form required)
- A modal appears immediately showing:
  - Success confirmation with checkmark icon
  - The meeting code/link with copy button
  - "Adicionar pessoas" option to invite via email
  - "Copiar link da reunião" to share the link
  - "Participar agora" button to join immediately
- Email invites open the user's default email client with pre-filled subject and meeting link
- Link copying provides toast notification feedback

**New Component:**
- `InstantMeetingModal.tsx`: Modal component that displays after meeting creation

### December 31, 2025 - Project Import Setup
**Configured for Replit environment**

- Fixed `@100mslive/react-sdk` compatibility issue with React 19 by using `--legacy-peer-deps`
- Fixed `selectIsRecordingOn` import error - this selector doesn't exist in SDK v0.11.0, replaced with local state management
- Database configured with Replit PostgreSQL
- Workflow configured on port 5000 with webview output

### Development Setup
```bash
npm install --legacy-peer-deps  # Required due to React 19 peer dep conflicts with @100mslive/react-sdk
npm run db:push                 # Push schema to database  
npm run dev                     # Start development server on port 5000
```

### Deployment
The app is configured for autoscale deployment:
- Build: `npm run build`
- Run: `node dist/index.cjs`

### Environment Variables
Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string (auto-provisioned by Replit)
- `HMS_APP_ACCESS_KEY` - 100ms API access key
- `HMS_APP_SECRET` - 100ms API secret  
- `HMS_TEMPLATE_ID` - 100ms room template ID
- `HMS_MANAGEMENT_TOKEN` - 100ms management token (optional, auto-generated from access key/secret)
- `HMS_API_BASE_URL` - 100ms API base URL (default: https://api.100ms.live/v2)
- `SESSION_SECRET` - Secret for session encryption

n8n Webhook Variables:
- `N8N_WEBHOOK_URL` - (Optional) General webhook for events like reuniao.agendada, booking.criado
- `N8N_WEBHOOK_REUNIAO_INICIADA` - Webhook triggered when user enters a meeting (transcription start)
- `N8N_WEBHOOK_REUNIAO_FINALIZADA` - Webhook triggered when user leaves a meeting (transcription end)

### Verified Integration Status (December 11, 2025)
All credentials have been tested and are working:
- ✅ 100ms room creation: Creates video rooms automatically when scheduling meetings
- ✅ 100ms token generation: Generates auth tokens for meeting participants  
- ✅ n8n transcription webhooks: Sends payload to n8n when meetings start/end
- ✅ Auto-sync credentials: Environment variables are synced to tenant database on startup