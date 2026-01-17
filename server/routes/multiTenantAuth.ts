import express, { Request, Response } from 'express';
import { supabaseOwner, SUPABASE_CONFIGURED } from '../config/supabaseOwner';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const router = express.Router();

// Funcao helper para carregar credenciais do arquivo
function loadCredentialsFromFile(): { email: string; passwordHash: string } | null {
  try {
    // Primeiro tentar arquivo dedicado de login admin
    const adminLoginPath = path.join(process.cwd(), 'data', 'admin_login.json');
    if (fs.existsSync(adminLoginPath)) {
      const credentials = JSON.parse(fs.readFileSync(adminLoginPath, 'utf-8'));
      if (credentials.email && credentials.passwordHash) {
        console.log('[AUTH] Credenciais de admin carregadas do arquivo');
        return credentials;
      }
    }
  } catch (e) {
    console.warn('[AUTH] Erro ao carregar credenciais do arquivo:', e);
  }
  return null;
}

// Funcao helper para login via arquivo local (fallback)
async function tryLocalLogin(email: string, senha: string): Promise<{ success: boolean; user?: any }> {
  const localCredentials = loadCredentialsFromFile();
  
  if (!localCredentials) {
    console.log('[AUTH] Nenhuma credencial local encontrada');
    return { success: false };
  }
  
  // Comparar emails de forma case-insensitive
  const emailMatch = localCredentials.email.toLowerCase() === email.toLowerCase();
  if (!emailMatch) {
    console.log(`[AUTH] Email nao confere: ${email} vs ${localCredentials.email}`);
    return { success: false };
  }
  
  try {
    const senhaValida = await bcrypt.compare(senha, localCredentials.passwordHash);
    console.log(`[AUTH] Verificacao de senha: ${senhaValida ? 'OK' : 'FALHOU'}`);
    
    if (!senhaValida) {
      return { success: false };
    }
  } catch (err) {
    console.error('[AUTH] Erro ao comparar senha:', err);
    return { success: false };
  }
  
  const tenantId = `dev-${email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
  
  return {
    success: true,
    user: {
      id: tenantId,
      email: email,
      nome: email.split('@')[0],
      supabase_url: null,
      supabase_anon_key: null
    }
  };
}

// Rota de Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // SEMPRE tentar login local primeiro (fallback garantido)
    const localResult = await tryLocalLogin(email, senha);
    
    if (localResult.success && localResult.user) {
      const user = localResult.user;
      const tenantId = user.id;
      
      req.session.userId = tenantId;
      req.session.userEmail = user.email;
      req.session.userName = user.nome;
      req.session.tenantId = tenantId;
      req.session.userRole = 'admin';
      req.session.supabaseUrl = user.supabase_url;
      req.session.supabaseKey = user.supabase_anon_key;
      
      console.log(`✅ [AUTH] Login local bem-sucedido para: ${email}`);
      
      return req.session.save((err) => {
        if (err) {
          console.error('[Session] Erro ao salvar sessão:', err);
          return res.status(500).json({ error: 'Erro ao criar sessão' });
        }
        return res.json({ 
          success: true, 
          redirect: '/dashboard',
          user: {
            nome: user.nome,
            email: user.email
          }
        });
      });
    }

    // Se nao tem Supabase configurado e login local falhou, retornar erro
    if (!SUPABASE_CONFIGURED || !supabaseOwner) {
      console.log(`❌ [AUTH] Login falhou para: ${email} (sem Supabase e credenciais locais nao conferem)`);
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Tentar login via Supabase (verificar_login function)
    try {
      const { data, error } = await supabaseOwner
        .rpc('verificar_login', { 
          p_email: email, 
          p_senha: senha 
        });

      if (error) {
        // Se a funcao nao existe, ja tentamos local acima - retornar erro
        console.error('Erro ao verificar login no Supabase:', error);
        return res.status(401).json({ error: 'Email ou senha inválidos' });
      }

      if (!data || data.length === 0 || !data[0].sucesso) {
        return res.status(401).json({ error: 'Email ou senha inválidos' });
      }

      const admin = data[0];

      req.session.userId = admin.id;
      req.session.userEmail = admin.email;
      req.session.userName = admin.nome;
      req.session.tenantId = admin.id;
      req.session.userRole = 'admin';
      req.session.supabaseUrl = admin.supabase_url;
      req.session.supabaseKey = admin.supabase_anon_key;

      console.log(`✅ [AUTH] Login Supabase bem-sucedido para: ${email}`);

      return req.session.save((err) => {
        if (err) {
          console.error('[Session] Erro ao salvar sessão:', err);
          return res.status(500).json({ error: 'Erro ao criar sessão' });
        }
        res.json({ 
          success: true, 
          redirect: '/',
          user: {
            nome: admin.nome,
            email: admin.email
          }
        });
      });
      
    } catch (supabaseError) {
      console.error('Erro de conexao com Supabase:', supabaseError);
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

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
