# MeetFlow Technical Context & Recovery Guide

## Project Overview
MeetFlow is a multi-tenant SaaS platform for online meetings, using **100ms** for video conferencing. It features an administrative dashboard for tenants and a white-label public interface for clients.

### Tech Stack
- **Frontend**: React 19, TypeScript, TailwindCSS v4, Shadcn/ui, Wouter (routing), TanStack Query.
- **Backend**: Node.js, Express.js, Drizzle ORM, PostgreSQL.
- **Integration**: 100ms API (room creation, token generation, recording).

## Current Critical Issue: System Corruption
During an attempt to implement public multi-tenant meeting routes, the main router file `server/routes.ts` was accidentally truncated from ~4000 lines to ~30 lines. 
- **Symptoms**: The server fails to start (Error 502/500). Browser console shows connection lost.
- **LSP Errors**: Significant syntax errors in `server/routes.ts` and `client/src/components/Meeting100ms.tsx`.

## System Architecture Details

### Multi-Tenancy Logic
The platform uses a `tenants` table where each tenant has a unique `slug`. Administrative users belong to a tenant via the `usuarios_tenant` table.
Clients access meetings through public URLs: `https://{domain}/reuniao/{companySlug}/{roomId}`.

### Database Schema (Key Tables)
- **`tenants`**: `id`, `nome`, `slug`, `appAccessKey`, `appSecret`, `roomDesignConfig`.
- **`reunioes`**: `id`, `tenantId`, `roomId100ms`, `linkReuniao`, `status`.
- **`meeting_bookings`**: Links appointments to meetings.

## The Targeted Feature: Public Meeting Access
The goal is to allow clients to join a video meeting without logging in.
1. **Route**: `GET /api/public/reuniao/:companySlug/:roomId`
   - Must find the tenant by `companySlug`.
   - Must find the meeting by `roomId100ms` and `tenantId`.
   - Return tenant branding and meeting details.
2. **Token Generation**: `POST /api/public/reuniao/:companySlug/:roomId/token`
   - Use the tenant's `appAccessKey` and `appSecret` to generate a 100ms token.
   - Return the token to the frontend.

## Recovery Requirements

### 1. `server/routes.ts` Restoration
This file contains all API endpoints (Auth, Meetings, Tenants, Bookings, Webhooks). It needs to be restored from the last stable state or reconstructed based on the schema.
Key middleware: `requireAuth` and `requireTenant` (extracts tenant from authenticated user session).

### 2. `client/src/components/Meeting100ms.tsx` Fix
The `Meeting100ms` component needs to handle two scenarios for joining:
- **Admin**: Uses authenticated endpoint `/api/reunioes/:id/token-100ms`.
- **Public**: Uses public endpoint `/api/public/reuniao/:companySlug/:roomId/token`.

## Relevant Code Snippets

### HMS Service (`server/services/hms100ms.ts`)
```typescript
export function gerarTokenParticipante(
  roomId: string,
  userId: string,
  role: string,
  appAccessKey: string,
  appSecret: string
): string { ... }
```

### Schema (`shared/schema.ts`)
```typescript
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").unique().notNull(),
  appAccessKey: text("app_access_key"),
  appSecret: text("app_secret"),
  ...
});
```

### Intended Public Route Logic
```typescript
app.get("/api/public/reuniao/:companySlug/:roomId", async (req, res) => {
  const { companySlug, roomId } = req.params;
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, companySlug)).limit(1);
  if (!tenant) return res.status(404).json({ message: "Tenant not found" });
  const [reuniao] = await db.select().from(reunioes).where(and(eq(reunioes.roomId100ms, roomId), eq(reunioes.tenantId, tenant.id))).limit(1);
  if (!reuniao) return res.status(404).json({ message: "Meeting not found" });
  return res.json({ reuniao, tenant, roomDesignConfig: tenant.roomDesignConfig || {} });
});
```

## Next Steps for Claude
1. Analyze the full history of `server/routes.ts` if possible (use `git log` / `cat`).
2. Provide a complete, restored version of `server/routes.ts` that includes the missing 4000 lines of logic.
3. Fix the `Meeting100ms` component join logic.
4. Ensure the server starts successfully.
