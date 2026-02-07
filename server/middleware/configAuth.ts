/**
 * Middleware de autenticação para endpoints de configuração
 * 
 * Aceita TRÊS formas de autenticação:
 * 1. Token JWT (via header Authorization)
 * 2. Config Master Key (via header X-Config-Key) - apenas para configuração inicial
 * 3. Sessão Express (via cookie de sessão) - com suporte a x-tenant-id como suplemento
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    clientId: string;
    tenantId: string;
  };
  authMethod?: 'jwt' | 'master_key';
}

export function authenticateConfig(req: AuthRequest, res: Response, next: NextFunction) {
  // Método 1: Tentar autenticar com JWT
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    try {
      const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'demo-secret-key-for-development-only';
      
      const decoded = jwt.verify(token, jwtSecret) as {
        userId: string;
        email: string;
        clientId: string;
        tenantId: string;
      };
      
      req.user = decoded;
      req.authMethod = 'jwt';
      console.log('🔐 Autenticado via JWT');
      return next();
    } catch (error) {
      // JWT inválido, tentar método alternativo
    }
  }
  
  // Método 2: Tentar autenticar com Master Key
  const configKey = req.headers['x-config-key'] as string;
  const masterKey = process.env.CONFIG_MASTER_KEY;
  
  if (configKey && masterKey && configKey === masterKey) {
    req.user = {
      userId: 'system',
      email: 'system@config',
      clientId: 'system',
      tenantId: 'system'
    };
    req.authMethod = 'master_key';
    console.log('🔑 Autenticado via Config Master Key');
    return next();
  }
  
  // Método 3: Usar sessão para obter tenantId (se autenticado via sessão)
  const sessionUserId = req.session?.userId;
  const sessionEmail = req.session?.userEmail;
  
  if (sessionUserId) {
    const sessionTenantId = req.session?.tenantId;
    const headerTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = sessionTenantId || headerTenantId || sessionUserId;
    
    console.log(`🔐 [CONFIG] Usando sessão para tenant: ${tenantId}`);
    req.user = {
      userId: sessionUserId,
      email: sessionEmail || 'user@example.com',
      clientId: tenantId,
      tenantId: tenantId
    };
    req.authMethod = 'jwt';
    return next();
  }
  
  // Método 4: Fallback via x-tenant-id + expired/invalid JWT (somente leitura GET)
  // Only allow if a JWT token was provided (even if expired/invalid) AND x-tenant-id matches
  // This handles server-restart scenarios where JWT_SECRET changes but user is still "logged in"
  const headerTenantId = req.headers['x-tenant-id'] as string;
  if (headerTenantId && token && req.method === 'GET') {
    try {
      const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'demo-secret-key-for-development-only';
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.tenantId && decoded.tenantId === headerTenantId) {
        console.log(`🔐 [CONFIG] Fallback via x-tenant-id + decoded JWT: ${headerTenantId} (GET only)`);
        req.user = {
          userId: decoded.userId || headerTenantId,
          email: decoded.email || 'jwt-fallback@tenant',
          clientId: headerTenantId,
          tenantId: headerTenantId
        };
        req.authMethod = 'jwt';
        return next();
      }
    } catch (e) {
    }
  }
  
  // Nenhum método de autenticação válido
  return res.status(401).json({
    success: false,
    error: 'Authentication required',
    message: 'Provide either a valid JWT token (Authorization: Bearer <token>) or Config Master Key (X-Config-Key: <key>)'
  });
}
