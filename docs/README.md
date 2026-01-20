# ExecutiveAI Pro - Documentation Index

This folder contains all technical documentation for the ExecutiveAI Pro platform.

## Documentation Files

| File | Description |
|------|-------------|
| [DATA_ISOLATION_IMPLEMENTATION.md](DATA_ISOLATION_IMPLEMENTATION.md) | **CRITICAL** - Multi-tenant data isolation for reseller platform |
| [RESELLER_SYSTEM_DOCUMENTATION.md](RESELLER_SYSTEM_DOCUMENTATION.md) | Complete NEXUS reseller platform documentation |
| [CONTRACT_FORM_SUBMISSION_DATA_FLOW.md](CONTRACT_FORM_SUBMISSION_DATA_FLOW.md) | Data flow from form submissions to contracts |
| [CPF_AUTO_CHECK_FIX_DOCUMENTATION.md](CPF_AUTO_CHECK_FIX_DOCUMENTATION.md) | CPF validation system architecture |
| [MASTER_SYNC_ARCHITECTURE.md](MASTER_SYNC_ARCHITECTURE.md) | Master sync service architecture |
| [SUPABASE_TRIGGER_REQUIREMENTS.md](SUPABASE_TRIGGER_REQUIREMENTS.md) | Supabase trigger requirements |

## SQL Scripts

The `sql/` folder contains SQL scripts for database setup and configuration.

## Quick Reference

### Data Isolation (NEXUS)

The reseller platform uses comprehensive data isolation:

1. **Centralized Auth**: `src/features/revendedora/lib/resellerAuth.ts`
2. **Isolated Tables**: reseller_stores, reseller_profiles, sales_with_split, withdrawals, bank_accounts, orders, payment_links, product_requests, commission_config, commission_splits, reseller_alerts, reseller_badges, reseller_challenges, gamification_activities
3. **Shared Tables**: products, gamification_badges, gamification_challenges, gamification_rewards, gamification_leagues, gamification_config, companies

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/reseller/login` | Reseller authentication |
| `GET /api/reseller/supabase-config` | Get Supabase configuration |
| `PUT /api/reseller/supabase-config` | Update Supabase configuration |

### Environment Variables Required

```env
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://...
SUPABASE_OWNER_URL=https://your-owner.supabase.co
SUPABASE_OWNER_KEY=eyJ...
```

## Version

Last updated: 2026-01-20
