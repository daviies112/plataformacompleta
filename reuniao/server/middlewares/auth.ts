import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, usuariosTenant, tenants } from '@shared/schema';
import { eq } from 'drizzle-orm';
import 'express-session';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'meetflow-secret-key';
const DEFAULT_TENANT_SLUG = 'meetflow';
const DEFAULT_USER_EMAIL = 'admin@meetflow.local';

export interface AuthenticatedUser {
  id: string;
  username: string;
  tenantId?: string;
  usuarioTenantId?: string;
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
  } catch {
    return null;
  }
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  if (req.session && (req.session as any).token) {
    return (req.session as any).token;
  }

  return null;
}

async function getDefaultUser(): Promise<AuthenticatedUser | null> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, DEFAULT_USER_EMAIL))
      .limit(1);

    if (!user) return null;

    const [userTenant] = await db
      .select()
      .from(usuariosTenant)
      .where(eq(usuariosTenant.userId, user.id))
      .limit(1);

    if (!userTenant) return null;

    return {
      id: user.id,
      username: user.username,
      tenantId: userTenant.tenantId,
      usuarioTenantId: userTenant.id,
      role: userTenant.role || 'admin',
    };
  } catch (error) {
    console.error('[Auth] Erro ao obter usuário padrão:', error);
    return null;
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, decoded.id))
          .limit(1);

        if (user) {
          if (decoded.usuarioTenantId) {
            const [usuarioTenant] = await db
              .select()
              .from(usuariosTenant)
              .where(eq(usuariosTenant.id, decoded.usuarioTenantId))
              .limit(1);

            if (usuarioTenant) {
              decoded.tenantId = usuarioTenant.tenantId;
              decoded.role = usuarioTenant.role || 'user';
            }
          }
          req.user = decoded;
          next();
          return;
        }
      } catch (error) {
        console.error('[Auth] Erro ao verificar usuário:', error);
      }
    }
  }

  const defaultUser = await getDefaultUser();
  if (defaultUser) {
    req.user = defaultUser;
    
    if (req.session) {
      const newToken = generateToken(defaultUser);
      (req.session as any).token = newToken;
    }
    
    next();
    return;
  }

  res.status(401).json({ message: 'Autenticação necessária' });
}

export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }

  next();
}

export async function autoAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
      next();
      return;
    }
  }

  const defaultUser = await getDefaultUser();
  if (defaultUser) {
    req.user = defaultUser;
    next();
    return;
  }

  next();
}
