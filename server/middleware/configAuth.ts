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
  const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'demo-secret-key-for-development-only';

  // Método 1: Tentar autenticar com JWT
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    try {
      const decoded = jwt.verify(token, jwtSecret) as {
        userId: string;
        email: string;
        clientId: string;
        tenantId: string;
      };

      req.user = decoded;
      req.authMethod = 'jwt';
      console.log(`🔐 [CONFIG] Autenticado via JWT para tenant: ${decoded.tenantId}`);
      return next();
    } catch (error) {
      console.warn(`⚠️ [CONFIG] JWT inválido ou expirado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
    console.log('🔑 [CONFIG] Autenticado via Config Master Key');
    return next();
  }

  // Método 3: Usar sessão para obter tenantId (se autenticado via sessão)
  if (req.session && req.session.userId) {
    const sessionUserId = req.session.userId;
    const sessionEmail = req.session.userEmail;
    const sessionTenantId = req.session.tenantId;
    const headerTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = sessionTenantId || headerTenantId || sessionUserId;

    console.log(`🔐 [CONFIG] Autenticado via Sessão para tenant: ${tenantId}`);
    req.user = {
      userId: sessionUserId,
      email: sessionEmail || 'user@example.com',
      clientId: tenantId,
      tenantId: tenantId
    };
    req.authMethod = 'jwt';
    return next();
  } else if (req.session) {
    console.log('ℹ️ [CONFIG] Sessão presente mas sem userId');
  } else {
    console.log('ℹ️ [CONFIG] Nenhuma sessão encontrada na requisição');
  }

  // Método 4: Fallback via x-tenant-id + expired/invalid JWT (somente leitura GET)
  const headerTenantId = req.headers['x-tenant-id'] as string;
  if (headerTenantId && token && req.method === 'GET') {
    try {
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
      console.warn('⚠️ [CONFIG] Falha no decode de fallback');
    }
  }

  // Nenhum método de autenticação válido
  console.error(`❌ [CONFIG] Falha na autenticação - Path: ${req.path}, Method: ${req.method}, HasToken: ${!!token}, HasSession: ${!!req.session}`);

  return res.status(401).json({
    success: false,
    error: 'Authentication required',
    message: 'Provide either a valid JWT token (Authorization: Bearer <token>) or Config Master Key (X-Config-Key: <key>)'
  });
}
