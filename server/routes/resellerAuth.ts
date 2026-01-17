import express, { Request, Response } from 'express';
import { supabaseOwner, SUPABASE_CONFIGURED } from '../config/supabaseOwner';
import bcrypt from 'bcryptjs';

const router = express.Router();

// POST /api/reseller/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    if (!SUPABASE_CONFIGURED || !supabaseOwner) {
      return res.status(503).json({
        error: 'Sistema de autenticacao nao configurado',
        details: 'Configure SUPABASE_OWNER_URL e SUPABASE_OWNER_SERVICE_KEY'
      });
    }

    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha sao obrigatorios' });
    }

    // 1. Buscar revendedora no banco master
    const { data: revendedora, error } = await supabaseOwner
      .from('revendedoras')
      .select('*')
      .eq('email', email)
      .eq('status', 'ativo')
      .single();

    if (error || !revendedora) {
      console.log('Revendedora nao encontrada:', email);
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    // 2. Verificar senha (usando bcrypt)
    const senhaValida = await bcrypt.compare(senha, revendedora.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    const adminId = revendedora.admin_id;

    // 3. Criar sessao hibrida
    req.session.userId = revendedora.id;
    req.session.userEmail = revendedora.email;
    req.session.userName = revendedora.nome;
    req.session.userRole = 'reseller';
    req.session.tenantId = adminId; // CRUCIAL: Tenant e o Admin
    req.session.comissao = Number(revendedora.comissao_padrao);

    req.session.save((err) => {
      if (err) {
        console.error('Erro ao salvar sessao:', err);
        return res.status(500).json({ error: 'Erro ao criar sessao' });
      }
      
      console.log(`[NEXUS] Login revendedora: ${revendedora.email} -> tenant: ${adminId}`);
      
      res.json({
        success: true,
        redirect: '/reseller/dashboard',
        user: {
          id: revendedora.id,
          nome: revendedora.nome,
          email: revendedora.email,
          role: 'reseller',
          comissao: revendedora.comissao_padrao
        }
      });
    });

  } catch (error) {
    console.error('Erro no login revendedora:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/reseller/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    if (!SUPABASE_CONFIGURED || !supabaseOwner) {
      return res.status(503).json({ error: 'Sistema nao configurado' });
    }

    const { nome, email, senha, telefone, cpf, adminId } = req.body;

    if (!nome || !email || !senha || !adminId) {
      return res.status(400).json({
        error: 'Campos obrigatorios: nome, email, senha, adminId'
      });
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    const { data, error } = await supabaseOwner
      .from('revendedoras')
      .insert({
        admin_id: adminId,
        nome,
        email,
        senha_hash: senhaHash,
        telefone: telefone || null,
        cpf: cpf || null,
        status: 'pendente'
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao registrar revendedora:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Email ja cadastrado' });
      }
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      message: 'Cadastro enviado para aprovacao',
      id: data.id
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/reseller/check-session
router.get('/check-session', (req: Request, res: Response) => {
  if (req.session?.userId && req.session?.userRole === 'reseller') {
    res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        nome: req.session.userName,
        email: req.session.userEmail,
        role: 'reseller',
        comissao: req.session.comissao
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// POST /api/reseller/logout
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao destruir sessao:', err);
      return res.status(500).json({ error: 'Erro ao fazer logout' });
    }
    res.json({ success: true });
  });
});

// ===== ROTAS DE ADMIN PARA GERENCIAR REVENDEDORAS =====

// GET /api/reseller/admin/list - Listar revendedoras do admin
router.get('/admin/list', async (req: Request, res: Response) => {
  try {
    if (!req.session?.userId || req.session?.userRole === 'reseller') {
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }

    if (!SUPABASE_CONFIGURED || !supabaseOwner) {
      return res.status(503).json({ error: 'Sistema nao configurado' });
    }

    const adminId = req.session.tenantId || req.session.userId;

    const { data, error } = await supabaseOwner
      .from('revendedoras')
      .select('id, nome, email, cpf, telefone, status, comissao_padrao, stripe_account_id, created_at')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar revendedoras:', error);
      return res.status(500).json({ error: 'Erro ao buscar revendedoras' });
    }

    res.json({
      success: true,
      revendedoras: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('Erro na listagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PATCH /api/reseller/admin/:id/status - Atualizar status de revendedora
router.patch('/admin/:id/status', async (req: Request, res: Response) => {
  try {
    if (!req.session?.userId || req.session?.userRole === 'reseller') {
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }

    if (!SUPABASE_CONFIGURED || !supabaseOwner) {
      return res.status(503).json({ error: 'Sistema nao configurado' });
    }

    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.session.tenantId || req.session.userId;

    if (!['pendente', 'ativo', 'bloqueado'].includes(status)) {
      return res.status(400).json({ error: 'Status invalido' });
    }

    const { data, error } = await supabaseOwner
      .from('revendedoras')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('admin_id', adminId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar status:', error);
      return res.status(500).json({ error: 'Erro ao atualizar status' });
    }

    res.json({
      success: true,
      message: `Status atualizado para ${status}`,
      revendedora: data
    });

  } catch (error) {
    console.error('Erro na atualizacao:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PATCH /api/reseller/admin/:id/comissao - Atualizar comissao de revendedora
router.patch('/admin/:id/comissao', async (req: Request, res: Response) => {
  try {
    if (!req.session?.userId || req.session?.userRole === 'reseller') {
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }

    if (!SUPABASE_CONFIGURED || !supabaseOwner) {
      return res.status(503).json({ error: 'Sistema nao configurado' });
    }

    const { id } = req.params;
    const { comissao } = req.body;
    const adminId = req.session.tenantId || req.session.userId;

    if (typeof comissao !== 'number' || comissao < 0 || comissao > 100) {
      return res.status(400).json({ error: 'Comissao deve ser entre 0 e 100' });
    }

    const { data, error } = await supabaseOwner
      .from('revendedoras')
      .update({ comissao_padrao: comissao, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('admin_id', adminId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar comissao:', error);
      return res.status(500).json({ error: 'Erro ao atualizar comissao' });
    }

    res.json({
      success: true,
      message: `Comissao atualizada para ${comissao}%`,
      revendedora: data
    });

  } catch (error) {
    console.error('Erro na atualizacao:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
