import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { tenants } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { Tenant } from '@shared/schema';

declare global {
  namespace Express {
    interface Request {
      tenant?: Tenant;
    }
  }
}

export async function requireTenant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'Autenticação necessária' });
    return;
  }

  if (!req.user.tenantId) {
    res.status(403).json({ message: 'Usuário não está associado a nenhum tenant' });
    return;
  }

  try {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, req.user.tenantId))
      .limit(1);

    if (!tenant) {
      res.status(404).json({ message: 'Tenant não encontrado' });
      return;
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    console.error('[Tenant] Erro ao carregar tenant:', error);
    res.status(500).json({ message: 'Erro interno ao carregar tenant' });
  }
}

export async function loadTenantBySlug(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const slug = req.params.slug || req.query.slug as string;

  if (!slug) {
    next();
    return;
  }

  try {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    if (tenant) {
      req.tenant = tenant;
    }

    next();
  } catch (error) {
    console.error('[Tenant] Erro ao carregar tenant por slug:', error);
    next();
  }
}

export function extractTenantId(req: Request): string | null {
  if (req.tenant) {
    return req.tenant.id;
  }

  if (req.user?.tenantId) {
    return req.user.tenantId;
  }

  return null;
}
