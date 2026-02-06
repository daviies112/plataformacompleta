import { db } from '../db';
import { hms100msConfig } from '../../shared/db-schema';
import { eq } from 'drizzle-orm';

const slugCache = new Map<string, string>();

export async function getCompanySlug(tenantId: string): Promise<string> {
  if (slugCache.has(tenantId)) {
    return slugCache.get(tenantId)!;
  }
  
  try {
    const [config] = await db.select({ companySlug: hms100msConfig.companySlug })
      .from(hms100msConfig)
      .where(eq(hms100msConfig.tenantId, tenantId))
      .limit(1);
    
    if (config?.companySlug) {
      slugCache.set(tenantId, config.companySlug);
      return config.companySlug;
    }
    return tenantId.replace(/^dev-/, '').replace(/_/g, '-');
  } catch {
    return tenantId.replace(/^dev-/, '').replace(/_/g, '-');
  }
}

export function invalidateSlugCache(tenantId: string) {
  slugCache.delete(tenantId);
}

export async function saveCompanySlug(tenantId: string, slug: string): Promise<boolean> {
  try {
    const normalized = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    
    const [existing] = await db.select().from(hms100msConfig)
      .where(eq(hms100msConfig.tenantId, tenantId)).limit(1);
    
    if (existing) {
      await db.update(hms100msConfig)
        .set({ companySlug: normalized, updatedAt: new Date() })
        .where(eq(hms100msConfig.tenantId, tenantId));
    } else {
      await db.insert(hms100msConfig).values({
        tenantId,
        appAccessKey: '',
        appSecret: '',
        companySlug: normalized,
      });
    }
    
    invalidateSlugCache(tenantId);
    return true;
  } catch (err) {
    console.error('[TenantSlug] Error saving slug:', err);
    return false;
  }
}
