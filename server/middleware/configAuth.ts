/**
 * Middleware de autenticação para endpoints de configuração
 * 
 * Aceita DUAS formas de autenticação:
 * 1. Token JWT (via header Authorization)
 * 2. Config Master Key (via header X-Config-Key) - apenas para configuração inicial
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
    // Autenticação bem-sucedida com Master Key
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
  const sessionTenantId = req.session?.tenantId;
  const sessionUserId = req.session?.userId;
  const sessionEmail = req.session?.userEmail;
  
  if (sessionTenantId && sessionUserId) {
    console.log(`🔐 [CONFIG] Usando sessão para tenant: ${sessionTenantId}`);
    req.user = {
      userId: sessionUserId,
      email: sessionEmail || 'user@example.com',
      clientId: sessionTenantId,
      tenantId: sessionTenantId
    };
    req.authMethod = 'jwt';
    return next();
  }
  
  // Nenhum método de autenticação válido
  return res.status(401).json({
    success: false,
    error: 'Authentication required',
    message: 'Provide either a valid JWT token (Authorization: Bearer <token>) or Config Master Key (X-Config-Key: <key>)'
  });
}
