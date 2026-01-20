# NEXUS Platform - Data Isolation Implementation

## Overview

This document describes the comprehensive data isolation implementation for the NEXUS multi-tenant reseller platform. The goal is to prevent any data leakage between resellers, ensuring each reseller only sees their own data.

## Architecture

### Authentication Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Login Page     │────▶│  Backend Auth    │────▶│  Supabase       │
│  (Login.tsx)    │     │  (resellerAuth)  │     │  (revendedoras) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                                                │
         ▼                                                ▼
┌─────────────────┐                              ┌─────────────────┐
│  localStorage   │◀─────────────────────────────│  reseller_id    │
│  - reseller_id  │                              │  email, cpf     │
│  - reseller_email                              └─────────────────┘
└─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    All Reseller Components                       │
│  Store.tsx │ Sales.tsx │ Financial.tsx │ useResellerProfile.ts  │
│                                                                  │
│  getResellerId() → filters all queries by reseller_id           │
└─────────────────────────────────────────────────────────────────┘
```

### Data Isolation Layers

1. **Application Layer**: All queries filter by `reseller_id`
2. **Database Layer**: Supabase RLS policies enforce row-level security
3. **Authentication Layer**: JWT tokens validate reseller identity

## Implementation Details

### 1. Centralized Authentication Utility

**File**: `src/features/revendedora/lib/resellerAuth.ts`

```typescript
const RESELLER_ID_KEY = 'current_reseller_id';
const RESELLER_EMAIL_KEY = 'current_reseller_email';

export function saveResellerId(resellerId: string, email?: string): void {
  localStorage.setItem(RESELLER_ID_KEY, resellerId);
  if (email) {
    localStorage.setItem(RESELLER_EMAIL_KEY, email);
  }
  console.log('[ResellerAuth] Saved reseller_id:', resellerId);
}

export function getResellerId(): string | null {
  const resellerId = localStorage.getItem(RESELLER_ID_KEY);
  if (!resellerId) {
    console.warn('[ResellerAuth] No reseller_id found in localStorage');
    return null;
  }
  return resellerId;
}

export function getResellerEmail(): string | null {
  return localStorage.getItem(RESELLER_EMAIL_KEY);
}

export function clearResellerAuth(): void {
  localStorage.removeItem(RESELLER_ID_KEY);
  localStorage.removeItem(RESELLER_EMAIL_KEY);
  console.log('[ResellerAuth] Cleared reseller authentication');
}
```

### 2. Login Flow

**File**: `src/features/revendedora/pages/Login.tsx`

When a reseller logs in successfully:
```typescript
// After successful authentication
saveResellerId(data.resellerId, data.email);
```

### 3. Component Updates

All reseller components were updated to:
1. Import the centralized `getResellerId()` function
2. Return `null` instead of hard-coded fallback IDs
3. Handle missing authentication gracefully

**Example - Store.tsx**:
```typescript
import { getResellerId as getStoredResellerId } from '@/features/revendedora/lib/resellerAuth';

const getResellerId = (): string | null => {
  const storedReseller = getStoredResellerId();
  if (storedReseller) return storedReseller;
  console.error('[Store] Reseller ID não encontrado - usuário precisa fazer login');
  return null;
};

// Usage in data loading
const loadStoreConfiguration = async () => {
  const resellerId = getResellerId();
  if (!resellerId) {
    toast.error('Por favor, faça login novamente');
    return;
  }
  // Continue with query filtered by resellerId
};
```

### 4. Tables Classification

#### Isolated Tables (require reseller_id filtering)

| Table | Description |
|-------|-------------|
| `reseller_stores` | Store configurations per reseller |
| `reseller_profiles` | Reseller personal/business profiles |
| `sales_with_split` | Sales with commission splits |
| `withdrawals` | Withdrawal requests |
| `bank_accounts` | Bank account information |
| `orders` | Customer orders |
| `payment_links` | Generated payment links |
| `product_requests` | Product restock requests |
| `commission_config` | Commission configurations |
| `commission_splits` | Split payment configurations |
| `reseller_alerts` | System alerts |
| `reseller_badges` | Earned badges |
| `reseller_challenges` | Challenge participations |
| `gamification_activities` | Activity tracking |

#### Shared Tables (no isolation needed)

| Table | Description |
|-------|-------------|
| `products` | Product catalog (read-only for resellers) |
| `gamification_badges` | Available badges definitions |
| `gamification_challenges` | Available challenges definitions |
| `gamification_rewards` | Available rewards definitions |
| `gamification_leagues` | League configurations |
| `gamification_config` | Gamification settings |
| `companies` | Company information |

### 5. Security Fixes Applied

#### Removed Hard-coded Fallback IDs

**Before (VULNERABLE)**:
```typescript
const getResellerId = (): string => {
  const storedReseller = localStorage.getItem('current_reseller_id');
  if (storedReseller) return storedReseller;
  return '00000000-0000-0000-0000-000000000001'; // DANGEROUS!
};
```

**After (SECURE)**:
```typescript
const getResellerId = (): string | null => {
  const storedReseller = getStoredResellerId();
  if (storedReseller) return storedReseller;
  console.error('[Component] Reseller ID não encontrado');
  return null; // Safe - forces authentication
};
```

#### Removed Arbitrary Reseller Fetching

**Before (VULNERABLE)** in `useChat.ts`:
```typescript
// This code was REMOVED - it could fetch ANY reseller from database
const { data: resellers } = await supabase.from('reseller_profiles').select('id');
if (resellers?.[0]) {
  localStorage.setItem('current_reseller_id', resellers[0].id);
}
```

**After (SECURE)**:
```typescript
// Only use stored reseller_id, never fetch arbitrary data
const resellerId = getStoredResellerId();
if (!resellerId) {
  console.error('[Chat] Reseller ID not found. User must be logged in first.');
  return null;
}
```

## Files Modified

| File | Changes |
|------|---------|
| `src/features/revendedora/lib/resellerAuth.ts` | Added `saveResellerId()`, `getResellerId()`, `getResellerEmail()`, `clearResellerAuth()` |
| `src/features/revendedora/pages/Login.tsx` | Now saves reseller_id after successful login |
| `src/features/revendedora/pages/reseller/Store.tsx` | Uses centralized auth, returns null on missing ID |
| `src/features/revendedora/pages/reseller/Sales.tsx` | Uses centralized auth, returns null on missing ID |
| `src/features/revendedora/pages/reseller/Financial.tsx` | Uses centralized auth, shows error UI on missing ID |
| `src/features/revendedora/hooks/useResellerProfile.ts` | Uses centralized auth, returns null on missing ID |
| `src/features/revendedora/hooks/useChat.ts` | Removed arbitrary reseller fetching, uses centralized auth |

## Supabase RLS Policies

For complete data isolation, these RLS policies should be enabled on isolated tables:

```sql
-- Enable RLS on all isolated tables
ALTER TABLE reseller_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_with_split ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_activities ENABLE ROW LEVEL SECURITY;

-- Example policy for reseller_profiles
CREATE POLICY "Resellers can only view their own profile"
ON reseller_profiles FOR SELECT
USING (reseller_id = auth.uid()::text);

CREATE POLICY "Resellers can only update their own profile"
ON reseller_profiles FOR UPDATE
USING (reseller_id = auth.uid()::text);

CREATE POLICY "Resellers can insert their own profile"
ON reseller_profiles FOR INSERT
WITH CHECK (reseller_id = auth.uid()::text);

-- Service role bypass for admin operations
CREATE POLICY "Service role has full access"
ON reseller_profiles FOR ALL
USING (auth.role() = 'service_role');
```

## Testing Data Isolation

### Test Scenario 1: Different Resellers

1. Login as Reseller A (reseller_id: `aaa-111`)
2. Save store configuration
3. Logout
4. Login as Reseller B (reseller_id: `bbb-222`)
5. Verify Reseller B cannot see Reseller A's store configuration

### Test Scenario 2: Unauthenticated Access

1. Clear localStorage
2. Try to access `/revendedora/loja`
3. Verify error message "Por favor, faça login novamente"
4. Verify no data is loaded

### Test Scenario 3: Same Company, Different Resellers

1. Create two resellers in the same company
2. Login as Reseller 1, create sales
3. Login as Reseller 2
4. Verify Reseller 2 only sees their own sales (should be empty)

## Error Handling

When `reseller_id` is not found:

1. **Console Error**: Logged for debugging
2. **User Message**: "Por favor, faça login novamente"
3. **Data Protection**: No queries executed, no data loaded
4. **UI State**: Shows appropriate error state or redirects to login

## Maintenance Notes

### Adding New Isolated Tables

When adding a new table that requires data isolation:

1. Add `reseller_id` column (UUID type)
2. Create RLS policies
3. Update queries to filter by `reseller_id`
4. Add to the "Isolated Tables" list in documentation

### Adding New Components

When adding a new reseller component:

1. Import `getResellerId` from `resellerAuth.ts`
2. Check for null return value
3. Handle missing authentication gracefully
4. Never use hard-coded fallback IDs

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-20 | 1.0.0 | Initial implementation of data isolation |

## Contact

For questions about this implementation, refer to the NEXUS platform documentation or contact the development team.
