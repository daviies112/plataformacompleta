import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseOwner, SUPABASE_CONFIGURED } from '../config/supabaseOwner';
import { saveCompanySlug, invalidateSlugCache } from '../lib/tenantSlug';

function getJwtSecret(): string {
  return process.env.JWT_SECRET || process.env.SESSION_SECRET || 'demo-secret-key-for-development-only';
}

function generateToken(payload: Record<string, any>): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '24h' });
}

function normalizeSlug(name: string): string {
  return name.trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function autoSetCompanySlug(tenantId: string, companyName: string | null | undefined) {
  if (!companyName || !companyName.trim()) return;
  const slug = normalizeSlug(companyName);
  if (!slug) return;
  try {
    await saveCompanySlug(tenantId, slug);
    console.log(`✅ [AutoSlug] Company slug set to "${slug}" for tenant ${tenantId} (from company_name: "${companyName}")`);
  } catch (err) {
    console.warn(`⚠️ [AutoSlug] Failed to set slug for ${tenantId}:`, err);
  }
}

async function fetchCompanyNameFromOwner(adminId: string): Promise<string | null> {
  if (!supabaseOwner) return null;
  try {
    const { data, error } = await supabaseOwner
      .from('admin_users')
      .select('company_name')
      .eq('id', adminId)
      .single();
    if (!error && data?.company_name) {
      return data.company_name;
    }
  } catch (e) {
    console.warn('[AutoSlug] Could not fetch company_name:', e);
  }
  return null;
}

async function handleDirectLogin(req: Request, res: Response, adminData: any, email: string, senha: string) {
  const passwordHash = adminData.password_hash;
  console.log(`🔍 [AUTH] handleDirectLogin - email: ${email}, has password_hash: ${!!passwordHash}, hash prefix: ${passwordHash?.substring(0, 10) || 'none'}, tenant_id: ${adminData.tenant_id || 'none'}`);
  
  if (!passwordHash) {
    console.error('[AUTH] Usuário sem password_hash:', email);
    return res.status(401).json({ error: 'Email ou senha incorretos' });
  }

  const isValid = await bcrypt.compare(senha, passwordHash);
  console.log(`🔍 [AUTH] bcrypt.compare result: ${isValid}`);
  if (!isValid) {
    console.log(`❌ [AUTH] Senha incorreta para: ${email}`);
    supabaseOwner?.from('logs_acesso').insert({
      email, sucesso: false, ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      mensagem: 'Senha incorreta (login direto)'
    }).then().catch(console.error);
    return res.status(401).json({ error: 'Email ou senha incorretos' });
  }

  const tenantId = adminData.tenant_id || `dev-${email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
  const userName = adminData.nome || adminData.name || adminData.company_name || email.split('@')[0];

  req.session.userId = adminData.id || tenantId;
  req.session.userEmail = email;
  req.session.userName = userName;
  req.session.tenantId = tenantId;
  req.session.userRole = adminData.role || 'admin';
  req.session.supabaseUrl = adminData.supabase_url || null;
  req.session.supabaseKey = adminData.supabase_anon_key || null;
  req.session.companyName = adminData.company_name || userName;

  if (adminData.company_name) {
    await autoSetCompanySlug(tenantId, adminData.company_name);
  }

  supabaseOwner?.from('logs_acesso').insert({
    admin_id: adminData.id, email, sucesso: true,
    ip_address: req.ip, user_agent: req.headers['user-agent'],
    mensagem: 'Login direto bem-sucedido'
  }).then().catch(console.error);

  supabaseOwner?.from('admin_users').update({ last_login: new Date().toISOString() })
    .eq('id', adminData.id).then().catch(console.error);

  console.log(`✅ [AUTH] Login direto bem-sucedido para: ${email} (tenant: ${tenantId})`);

  return req.session.save((err) => {
    if (err) {
      console.error('[Session] Erro ao salvar sessão:', err);
      return res.status(500).json({ error: 'Erro ao criar sessão' });
    }
    const token = generateToken({
      userId: adminData.id || tenantId,
      email: email,
      name: userName,
      clientId: tenantId,
      tenantId: tenantId,
      role: adminData.role || 'admin',
      companyName: adminData.company_name || userName
    });
    return res.json({
      success: true,
      redirect: '/dashboard',
      token,
      user: { nome: userName, email, company_name: adminData.company_name || userName, tenant_id: tenantId }
    });
  });
}

const router = express.Router();

// Rota de Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    // DEVELOPMENT BYPASS: Quando auth não está configurado, permitir login mock
    if (!SUPABASE_CONFIGURED) {
      const { email, senha } = req.body;
      
      if (!email || !senha) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }
      
      // 🔐 MULTI-TENANT: Gerar tenantId único baseado no email
      // Garantir que cada email tem seu próprio tenant, mesmo em modo dev
      const tenantId = `dev-${email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
      
      // Criar sessão mock para desenvolvimento
      req.session.userId = tenantId;
      req.session.userEmail = email;
      req.session.userName = `Dev User (${email})`;
      req.session.tenantId = tenantId; // Cada email é um tenant 100% independente
      req.session.userRole = 'admin'; // Definir role como admin para dev bypass
      req.session.supabaseUrl = null;
      req.session.supabaseKey = null;
      
      console.log(`⚠️ AVISO: Login de desenvolvimento aceito (auth desabilitado) - tenantId: ${tenantId}`);
      console.log(`🔐 [MULTI-TENANT] Tenant isolado criado para: ${email}`);
      
      // IMPORTANT: Save session explicitly before responding to ensure cookie is persisted
      return req.session.save((err) => {
        if (err) {
          console.error('[Session] Erro ao salvar sessão:', err);
          return res.status(500).json({ error: 'Erro ao criar sessão' });
        }
        console.log(`✅ [Session] Sessão salva para tenant: ${tenantId}`);
        const token = generateToken({
          userId: tenantId,
          email: email,
          name: `Dev User (${email})`,
          clientId: tenantId,
          tenantId: tenantId,
          role: 'admin'
        });
        return res.json({ 
          success: true, 
          redirect: '/dashboard',
          token,
          user: {
            nome: `Dev User (${email})`,
            email: email
          }
        });
      });
    }

    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Verificar credenciais no Supabase Principal usando a função verificar_login
    console.log(`🔍 [AUTH] Tentando verificar_login RPC para: ${email}`);
    const { data, error } = await supabaseOwner!
      .rpc('verificar_login', { 
        p_email: email, 
        p_senha: senha 
      });

    console.log(`🔍 [AUTH] RPC resultado - error: ${error?.code || 'none'}, data length: ${data?.length || 0}`);

    if (error) {
      console.error('Erro ao verificar login:', error.code, error.message);
      
      // Se a funcao verificar_login nao existe, fazer login direto via admin_users com bcrypt
      if (error.code === 'PGRST202' || error.code === 'PGRST205') {
        console.log(`⚠️ [AUTH] RPC verificar_login indisponível (${error.code}) - login direto via admin_users`);
        
        const { data: adminData, error: queryErr } = await supabaseOwner!
          .from('admin_users')
          .select('*')
          .eq('email', email)
          .eq('is_active', true)
          .single();

        if (queryErr || !adminData) {
          console.error('[AUTH] Usuário não encontrado:', queryErr?.code, queryErr?.message);
          return res.status(401).json({ error: 'Email ou senha incorretos' });
        }
        
        const normalizedAdmin = {
          ...adminData,
          nome: adminData.nome || adminData.name || adminData.company_name,
        };
        return await handleDirectLogin(req, res, normalizedAdmin, email, senha);
      }
      
      return res.status(500).json({ error: 'Erro ao processar login' });
    }

    if (!data || data.length === 0 || !data[0].sucesso) {
      // RPC returned but password check failed - try direct bcrypt verification as fallback
      console.log(`⚠️ [AUTH] RPC verificar_login retornou sucesso=false, tentando bcrypt direto...`);
      
      const { data: directAdmin, error: directErr } = await supabaseOwner!
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      console.log(`🔍 [AUTH] Query admin_users - error: ${directErr?.code || 'none'}, found: ${!!directAdmin}, keys: ${directAdmin ? Object.keys(directAdmin).join(',') : 'none'}`);

      if (!directErr && directAdmin) {
        const normalizedAdmin = {
          ...directAdmin,
          nome: directAdmin.nome || directAdmin.name || directAdmin.company_name,
        };
        return await handleDirectLogin(req, res, normalizedAdmin, email, senha);
      }

      // If direct login also fails, return error
      supabaseOwner!.from('logs_acesso').insert({
        email: email,
        sucesso: false,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        mensagem: 'Credenciais inválidas'
      }).then().catch(console.error);
      
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const admin = data[0];

    // Criar sessão
    req.session.userId = admin.id;
    req.session.userEmail = admin.email;
    req.session.userName = admin.nome;
    req.session.tenantId = admin.id; // Cada usuário é um tenant independente
    req.session.userRole = 'admin'; // Definir role como admin
    req.session.supabaseUrl = admin.supabase_url;
    req.session.supabaseKey = admin.supabase_anon_key;
    req.session.companyName = admin.company_name || admin.nome;

    // Auto-set company slug from admin_users.company_name
    const companyName = admin.company_name || await fetchCompanyNameFromOwner(admin.id);
    autoSetCompanySlug(admin.id, companyName).catch(() => {});

    // Registrar log de sucesso
    supabaseOwner.from('logs_acesso').insert({
      admin_id: admin.id,
      email: email,
      sucesso: true,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      mensagem: 'Login bem-sucedido'
    }).then().catch(console.error);

    // IMPORTANT: Save session explicitly before responding to ensure cookie is persisted
    req.session.save((err) => {
      if (err) {
        console.error('[Session] Erro ao salvar sessão:', err);
        return res.status(500).json({ error: 'Erro ao criar sessão' });
      }
      console.log(`✅ [Session] Sessão salva para tenant: ${admin.id}`);
      const token = generateToken({
        userId: admin.id,
        email: admin.email,
        name: admin.nome,
        clientId: admin.id,
        tenantId: admin.id,
        role: 'admin',
        companyName: admin.company_name || admin.nome
      });
      res.json({ 
        success: true, 
        redirect: '/',
        token,
        user: {
          nome: admin.nome,
          email: admin.email,
          company_name: admin.company_name || admin.nome,
          tenant_id: admin.id
        }
      });
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota de Logout
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao fazer logout' });
    }
    res.json({ success: true, redirect: '/login' });
  });
});

// Rota para verificar sessão
router.get('/check-session', (req: Request, res: Response) => {
  if (req.session && req.session.userId) {
    res.json({ 
      authenticated: true,
      user: {
        id: req.session.userId,
        nome: req.session.userName,
        email: req.session.userEmail,
        tenant_id: req.session.tenantId,
        role: req.session.userRole || 'admin',
        company_name: req.session.companyName || req.session.userName
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Rota para obter informações do usuário logado
router.get('/user-info', (req: Request, res: Response) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  res.json({
    nome: req.session.userName,
    email: req.session.userEmail,
    company_name: req.session.companyName || req.session.userName,
    hasSupabaseConfig: !!(req.session.supabaseUrl && req.session.supabaseKey)
  });
});

export default router;
