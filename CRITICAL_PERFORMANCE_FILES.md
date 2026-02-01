# ⚠️ CRITICAL PERFORMANCE FILES - READ BEFORE MODIFYING ⚠️

## Problem That Was Solved

Public pages (forms, meetings, signatures) were taking **15+ seconds** to load for external visitors. After extensive debugging costing **$30+**, the root cause was identified and fixed.

## Root Cause

The original `main.tsx` loaded the full `App.tsx` for ALL routes, including public ones. This meant:
- 80+ JavaScript modules loading unnecessarily
- TanStack Query, shadcn/ui, lucide-react, react-router-dom all loading
- Authentication contexts initializing for unauthenticated visitors
- Supabase connections being established for public content

## Solution Architecture

```
main.tsx (ENTRY POINT - CRITICAL)
    │
    ├── Public Form Routes? (/f/*, /form/*, /formulario/*, /:slug/form/*)
    │       └── PublicFormApp.tsx (ultra-light, ~10 modules)
    │
    ├── Public Meeting Routes? (/reuniao/*, /reuniao-publica/*)
    │       └── PublicMeetingApp.tsx (ultra-light, ~10 modules)
    │
    ├── Public Signature Routes? (/assinar/*, /assinatura/*)
    │       └── PublicSignatureApp.tsx (ultra-light, ~10 modules)
    │
    └── All Other Routes
            └── App.tsx (full application, 80+ modules)
```

## CRITICAL FILES - DO NOT MODIFY WITHOUT UNDERSTANDING

### Frontend (src/)

| File | Purpose | ⚠️ Never Do |
|------|---------|-------------|
| `main.tsx` | Early route detection BEFORE loading any modules | Import heavy dependencies, remove route detection |
| `PublicFormApp.tsx` | Ultra-light form renderer | Import TanStack Query, shadcn, lucide-react |
| `PublicMeetingApp.tsx` | Ultra-light meeting lobby | Import TanStack Query, shadcn, lucide-react |
| `PublicSignatureApp.tsx` | Ultra-light signature page | Import TanStack Query, shadcn, lucide-react |

### Backend (server/)

| File | Purpose | ⚠️ Never Do |
|------|---------|-------------|
| `server/lib/publicCache.ts` | Multi-layer caching for fast responses | Remove cache, add blocking operations |
| `server/routes/meetings.ts` | Meeting endpoints with caching | Remove cache from /public, /room-design-public, /full-public |

## Allowed Imports in Public*App Components

```typescript
// ✅ ALLOWED
import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";

// ❌ NEVER IMPORT
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
```

## Backend Caching Architecture

```
Request → Check In-Memory Cache (3ms)
              │
              ├── Cache HIT → Return immediately
              │
              └── Cache MISS → Check Disk Cache
                                    │
                                    ├── Cache HIT → Return + Update Memory
                                    │
                                    └── Cache MISS → Query DB with timeout
                                                          │
                                                          ├── Success → Cache + Return
                                                          │
                                                          └── Timeout → Fallback to Supabase
```

## Testing After Modifications

1. Clear browser cache completely
2. Open DevTools Network tab
3. Access a public form/meeting/signature URL
4. Verify:
   - **Bundle size**: Should be <500KB (not 2MB+)
   - **Load time**: Should be <2 seconds (not 15+)
   - **Modules loaded**: ~10 (not 80+)

## Full Documentation

See `docs/PUBLIC_FORM_PERFORMANCE_FIX.md` for complete technical documentation.

## Contact

If you're unsure about a change, read the documentation first. Modifying these files incorrectly will cause severe performance degradation for all public visitors.
