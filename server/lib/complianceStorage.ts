import { db } from "../db.js";
import { 
  tenantsRegistry, 
  datacorpChecks, 
  complianceAuditLog,
  type Tenant,
  type InsertTenant,
  type DatacorpCheck,
  type InsertDatacorpCheck,
  type AuditLog,
  type InsertAuditLog,
} from "../../shared/db-schema.js";
import type { IStorage } from "../storage.js";
import { eq, and, gt, desc, sql } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  async getTenant(id: string): Promise<Tenant | undefined> {
    const results = await db
      .select()
      .from(tenantsRegistry)
      .where(eq(tenantsRegistry.id, id))
      .limit(1);
    
    return results[0];
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const results = await db
      .select()
      .from(tenantsRegistry)
      .where(eq(tenantsRegistry.slug, slug))
      .limit(1);
    
    return results[0];
  }

  async getAllTenants(): Promise<Tenant[]> {
    return db
      .select()
      .from(tenantsRegistry)
      .orderBy(desc(tenantsRegistry.createdAt));
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const results = await db
      .insert(tenantsRegistry)
      .values(tenant)
      .returning();
    
    return results[0];
  }

  async updateTenantActiveStatus(id: string, isActive: boolean): Promise<Tenant> {
    const results = await db
      .update(tenantsRegistry)
      .set({ isActive })
      .where(eq(tenantsRegistry.id, id))
      .returning();
    
    if (!results[0]) {
      throw new Error("Tenant not found");
    }
    
    return results[0];
  }

  async getCheckById(id: string): Promise<DatacorpCheck | undefined> {
    const results = await db
      .select()
      .from(datacorpChecks)
      .where(eq(datacorpChecks.id, id))
      .limit(1);
    
    return results[0];
  }

  async getCachedCheck(cpfHash: string, tenantId: string): Promise<DatacorpCheck | undefined> {
    const results = await db
      .select()
      .from(datacorpChecks)
      .where(
        and(
          eq(datacorpChecks.cpfHash, cpfHash),
          eq(datacorpChecks.tenantId, tenantId),
          gt(datacorpChecks.expiresAt, new Date())
        )
      )
      .orderBy(desc(datacorpChecks.consultedAt))
      .limit(1);
    
    return results[0];
  }

  async getChecksByTenant(tenantId: string, limit = 50): Promise<DatacorpCheck[]> {
    return db
      .select()
      .from(datacorpChecks)
      .where(eq(datacorpChecks.tenantId, tenantId))
      .orderBy(desc(datacorpChecks.consultedAt))
      .limit(limit);
  }

  async getAllChecks(): Promise<DatacorpCheck[]> {
    return db
      .select()
      .from(datacorpChecks)
      .orderBy(desc(datacorpChecks.consultedAt));
  }

  async createCheck(check: InsertDatacorpCheck): Promise<DatacorpCheck> {
    const results = await db
      .insert(datacorpChecks)
      .values(check)
      .returning();
    
    return results[0];
  }

  async getComplianceStats(tenantId?: string): Promise<{
    totalChecks: number;
    cacheSavings: number;
    avgResponseTime: number;
    statusDistribution: {
      approved: number;
      rejected: number;
      manual_review: number;
      error: number;
      pending: number;
    };
  }> {
    const whereClause = tenantId 
      ? eq(datacorpChecks.tenantId, tenantId)
      : undefined;

    const checks = await db
      .select()
      .from(datacorpChecks)
      .where(whereClause);

    const totalChecks = checks.length;
    const cacheHits = checks.filter(c => Number(c.apiCost) === 0).length;
    const cacheSavings = cacheHits * 0.07;

    const statusDistribution = {
      approved: checks.filter(c => c.status === "approved").length,
      rejected: checks.filter(c => c.status === "rejected").length,
      manual_review: checks.filter(c => c.status === "manual_review").length,
      error: checks.filter(c => c.status === "error").length,
      pending: checks.filter(c => c.status === "pending").length,
    };

    const totalResponseTime = checks.reduce((sum, check) => {
      const consultTime = new Date(check.consultedAt).getTime();
      const createTime = new Date(check.createdAt).getTime();
      return sum + (createTime - consultTime);
    }, 0);

    const avgResponseTime = totalChecks > 0 ? totalResponseTime / totalChecks : 0;

    return {
      totalChecks,
      cacheSavings,
      avgResponseTime,
      statusDistribution,
    };
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const results = await db
      .insert(complianceAuditLog)
      .values(log)
      .returning();
    
    return results[0];
  }

  async getAuditLogsByCheck(checkId: string): Promise<AuditLog[]> {
    return db
      .select()
      .from(complianceAuditLog)
      .where(eq(complianceAuditLog.checkId, checkId))
      .orderBy(desc(complianceAuditLog.timestamp));
  }

  async getAuditLogsByTenant(tenantId: string, limit = 100): Promise<AuditLog[]> {
    return db
      .select()
      .from(complianceAuditLog)
      .where(eq(complianceAuditLog.tenantId, tenantId))
      .orderBy(desc(complianceAuditLog.timestamp))
      .limit(limit);
  }
}

// Export singleton instance for use in other modules
export const storage = new DatabaseStorage();
