import express, { Request, Response } from 'express';
import { supabaseOwner, SUPABASE_CONFIGURED } from '../config/supabaseOwner';

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
        return res.json({ 
          success: true, 
          redirect: '/dashboard',
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
    const { data, error } = await supabaseOwner!
      .rpc('verificar_login', { 
        p_email: email, 
        p_senha: senha 
      });

    if (error) {
      console.error('Erro ao verificar login:', error);
      
      // Se a funcao verificar_login nao existe, usar modo de desenvolvimento
      if (error.code === 'PGRST202') {
        console.log(`⚠️ [AUTH] Funcao verificar_login nao existe - usando modo desenvolvimento`);
        
        const tenantId = `dev-${email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
        
        req.session.userId = tenantId;
        req.session.userEmail = email;
        req.session.userName = email.split('@')[0];
        req.session.tenantId = tenantId;
        req.session.userRole = 'admin';
        req.session.supabaseUrl = null;
        req.session.supabaseKey = null;
        
        console.log(`✅ [AUTH] Login de desenvolvimento para: ${email}`);
        
        return req.session.save((err) => {
          if (err) {
            console.error('[Session] Erro ao salvar sessão:', err);
            return res.status(500).json({ error: 'Erro ao criar sessão' });
          }
          return res.json({ 
            success: true, 
            redirect: '/dashboard',
            user: {
              nome: email.split('@')[0],
              email: email
            }
          });
        });
      }
      
      return res.status(500).json({ error: 'Erro ao processar login' });
    }

    if (!data || data.length === 0 || !data[0].sucesso) {
      // Registrar log de falha
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
    req.session.supabaseUrl = admin.supabase_url;
    req.session.supabaseKey = admin.supabase_anon_key;

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
      res.json({ 
        success: true, 
        redirect: '/',
        user: {
          nome: admin.nome,
          email: admin.email
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
        nome: req.session.userName,
        email: req.session.userEmail
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
    hasSupabaseConfig: !!(req.session.supabaseUrl && req.session.supabaseKey)
  });
});

export default router;
