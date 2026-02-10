import { Request, Response, NextFunction } from 'express';

// Extender os tipos do Express Session
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userEmail?: string;
    userName?: string;
    companyName?: string;
    tenantId?: string;  // Tenant ID para isolamento completo de credenciais
    supabaseUrl?: string;
    supabaseKey?: string;
    // ===== CAMPOS NEXUS (Revendedoras) =====
    userRole?: 'admin' | 'reseller';
    resellerId?: string;  // ID da revendedora no Supabase Owner
    comissao?: number;
    projectName?: string;  // Nome da plataforma/projeto do admin
  }
}

// Middleware para verificar se usuário está autenticado
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Em desenvolvimento, permitir acesso mesmo sem sessão (criar tenant temporário)
  if (process.env.NODE_ENV === 'development') {
    if (!req.session || !req.session.userId) {
      const tempTenantId = `dev-tenant-default`;
      console.warn('⚠️ [DEV] Label Designer: Usando tenant temporário para desenvolvimento');
      
      // Criar sessão temporária se não existir
      if (req.session) {
        req.session.userId = tempTenantId;
        req.session.tenantId = tempTenantId;
        req.session.userEmail = 'dev@example.com';
        req.session.userName = 'Dev User';
      }
    }
    return next();
  }
  
  // Em produção, exigir autenticação real
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ 
      error: 'Não autenticado',
      redirect: '/login'
    });
  }
  next();
}

// Middleware para adicionar dados do usuário nas requisições
export function attachUserData(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    (req as any).user = {
      id: req.session.userId,
      email: req.session.userEmail,
      nome: req.session.userName,
      supabaseUrl: req.session.supabaseUrl,
      supabaseKey: req.session.supabaseKey,
      // ===== CAMPOS NEXUS =====
      role: req.session.userRole || 'admin',
      comissao: req.session.comissao,
      tenantId: req.session.tenantId,
      userId: req.session.userId
    };
  }
  next();
}

// Middleware para verificar se rota é pública (não precisa de autenticação)
export function isPublicRoute(path: string): boolean {
  // Permitir todas as rotas do Vite e assets
  if (path.startsWith('/@') || 
      path.startsWith('/node_modules') ||
      path.startsWith('/src') ||
      path.endsWith('.js') ||
      path.endsWith('.ts') ||
      path.endsWith('.tsx') ||
      path.endsWith('.jsx') ||
      path.endsWith('.css') ||
      path.endsWith('.json') ||
      path.endsWith('.png') ||
      path.endsWith('.jpg') ||
      path.endsWith('.svg') ||
      path.endsWith('.ico')) {
    return true;
  }
  
  const publicRoutes = [
    '/',             // Página inicial / Dashboard (redirecionamento interno)
    '/login',
    '/reuniao/',
    '/api/reunioes/',
    '/api/public/reuniao/',
    '/api/auth/',
    '/api/config/',
    '/api/reseller/login',
    '/api/reseller/register',
    '/api/reseller/check-session',
    '/api/pagarme/webhook',
    '/api/public/checkout/',
    '/reseller-login',
    '/revendedora',  // NEXUS: Plataforma de revendedoras tem login próprio
    '/assinar/',     // Assinatura digital pública (clientes)
    '/api/assinatura/public/',  // API de assinatura pública
    '/api/forms/public/',  // API de formulários públicos (by-slug, by-id, submit)
    '/api/submissions',    // Envio de formulários públicos
    '/api/formularios/submit',  // Envio de formulários (legacy)
    '/health',
    '/assets',
    '/form/',        // Formulário público direto
    '/f/',           // Formulário com token
    '/formulario/',  // Formulário público com slug da empresa
    '/api/n8n',      // API do n8n (tem autenticação própria)
  ];

  // Caso especial para prefixo /api/n8n para garantir isenção
  // Corrigindo para ser mais abrangente e capturar qualquer variação
  const normalizedPath = (path || '').toLowerCase();
  if (normalizedPath === '/api/n8n' || normalizedPath.startsWith('/api/n8n/') || normalizedPath.includes('/api/n8n')) {
    return true;
  }
  
  // Verificar padrões especiais de formulário público
  // /formulario/:companySlug/form/:id ou /:companySlug/form/:id
  if (/^\/formulario\/[^/]+\/form\/[^/]+/.test(path)) {
    return true;
  }
  if (/^\/[^/]+\/form\/[^/]+/.test(path) && !path.startsWith('/api/')) {
    return true;
  }
  
  return publicRoutes.some(route => path.startsWith(route));
}

// Middleware para redirecionar não autenticados
export function redirectIfNotAuth(req: Request, res: Response, next: NextFunction) {
  // Isenção explícita e agressiva para a API do n8n para evitar 401 do redirectIfNotAuth
  const normalizedPath = (req.path || '').toLowerCase();
  if (normalizedPath.startsWith('/api/n8n') || req.originalUrl.toLowerCase().startsWith('/api/n8n')) {
    console.log(`[Auth Bypass] Permitindo acesso público para API n8n: ${req.originalUrl}`);
    return next();
  }

  // Ignorar rotas públicas, API e assets
  if (isPublicRoute(req.path)) {
    return next();
  }
  
  // Se não está autenticado e está tentando acessar página protegida
  if (!req.session || !req.session.userId) {
    // Se é API, SEMPRE retornar 401 JSON
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ 
        error: 'Não autenticado',
        redirect: '/login'
      });
    }
    
    // Se é página HTML, redirecionar
    if (req.accepts('html')) {
      return res.redirect('/login');
    }
    
    // Default: 401 JSON
    return res.status(401).json({ 
      error: 'Não autenticado',
      redirect: '/login'
    });
  }
  
  next();
}
