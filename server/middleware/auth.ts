import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    clientId: string;
    tenantId: string;
    // ===== CAMPOS NEXUS (Revendedoras) =====
    role?: 'admin' | 'reseller';
    comissao?: number;
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  // Primeiro, verificar se tem sessao valida (funciona em dev e prod)
  const sessionTenantId = req.session?.tenantId;
  const sessionUserId = req.session?.userId;
  const sessionEmail = req.session?.userEmail;
  const sessionRole = req.session?.userRole;
  const sessionComissao = req.session?.comissao;
  
  if (sessionTenantId && sessionUserId) {
    req.user = {
      userId: sessionUserId,
      email: sessionEmail || '',
      clientId: sessionTenantId,
      tenantId: sessionTenantId,
      role: sessionRole || 'admin',
      comissao: sessionComissao
    };
    return next();
  }
  
  if (process.env.NODE_ENV === 'development') {
    // Em dev sem sessao, criar tenant temporario
    
    const tempTenantId = `dev-temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.warn('⚠️ [DEV] Sem sessão - criando tenant temporário:', tempTenantId);
    console.warn('💡 [DEV] Faça login para ter tenant persistente');
    
    req.user = {
      userId: tempTenantId,
      email: 'dev-temp@example.com',
      clientId: tempTenantId,
      tenantId: tempTenantId
    };
    return next();
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'demo-secret-key-for-development-only';
    
    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
      email: string;
      clientId: string;
      tenantId: string;
    };
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}
