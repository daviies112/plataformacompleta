import express, { Request, Response } from 'express';
import { supabaseOwner, SUPABASE_CONFIGURED } from '../config/supabaseOwner';
import { getAdminCredentials } from '../lib/masterSyncService';

const router = express.Router();

// Função para normalizar CPF (remove formatação)
function normalizeCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

// POST /api/reseller/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, cpf } = req.body;

    if (!email || !cpf) {
      return res.status(400).json({ error: 'Email e CPF sao obrigatorios' });
    }

    // Normaliza o CPF removendo formatação
    const cpfNormalizado = normalizeCPF(cpf);

    // Valida formato do CPF (11 dígitos)
    if (cpfNormalizado.length !== 11) {
      return res.status(400).json({ error: 'CPF deve ter 11 digitos' });
    }

    // Modo desenvolvimento: permitir login com credenciais de teste
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    const isTestCredentials = email === 'teste@upvendas.com' && cpfNormalizado === '12345678900';

    if (isDev && isTestCredentials) {
      console.log('[NEXUS-DEV] Login de desenvolvimento para revendedora de teste');
      
      req.session.userId = 'dev-reseller-1';
      req.session.userEmail = email;
      req.session.userName = 'Revendedora Teste';
      req.session.userRole = 'reseller';
      req.session.tenantId = 'dev-admin-default';
      req.session.comissao = 10;

      return req.session.save((err) => {
        if (err) {
          console.error('Erro ao salvar sessao:', err);
          return res.status(500).json({ error: 'Erro ao criar sessao' });
        }
        
        res.json({
          success: true,
          redirect: '/revendedora/reseller/dashboard',
          user: {
            id: 'dev-reseller-1',
            nome: 'Revendedora Teste',
            email: email,
            cpf: cpfNormalizado,
            role: 'reseller',
            comissao: 10
          }
        });
      });
    }

    // Producao: verificar Supabase
    if (!SUPABASE_CONFIGURED || !supabaseOwner) {
      return res.status(503).json({
        error: 'Sistema de autenticacao nao configurado',
        details: 'Configure SUPABASE_OWNER_URL e SUPABASE_OWNER_SERVICE_KEY'
      });
    }

    // 1. Buscar revendedora no banco master por email
    // Primeiro tenta buscar pelo email e depois valida o CPF (formatado ou não)
    console.log('[NEXUS] Buscando revendedora por email:', email);
    
    const { data: revendedoras, error: queryError } = await supabaseOwner
      .from('revendedoras')
      .select('*')
      .eq('email', email);
    
    console.log('[NEXUS] Query result:', { 
      count: revendedoras?.length || 0, 
      error: queryError?.message,
      firstRecord: revendedoras?.[0] ? { 
        email: revendedoras[0].email, 
        cpf: revendedoras[0].cpf, 
        status: revendedoras[0].status 
      } : null
    });
    
    if (queryError) {
      console.error('[NEXUS] Erro na query:', queryError);
      return res.status(500).json({ error: 'Erro ao buscar revendedora' });
    }
    
    // Encontrar revendedora que bate com o CPF (formatado ou normalizado)
    const revendedora = revendedoras?.find(r => {
      const cpfDb = r.cpf?.replace(/\D/g, ''); // Normaliza CPF do banco
      console.log('[NEXUS] Comparando CPF:', { cpfDb, cpfNormalizado, match: cpfDb === cpfNormalizado });
      return cpfDb === cpfNormalizado && ['ativo', 'pendente'].includes(r.status);
    });

    if (!revendedora) {
      console.log('[NEXUS] Revendedora nao encontrada:', email, 'CPF:', cpfNormalizado.substring(0, 3) + '...');
      return res.status(401).json({ error: 'Email ou CPF invalidos' });
    }
    
    console.log('[NEXUS] Revendedora encontrada:', revendedora.email, 'status:', revendedora.status);

    const adminId = revendedora.admin_id;

    // 2. Buscar credenciais do Supabase do Admin (para plataforma separada)
    const adminCredentials = await getAdminCredentials(adminId);
    
    if (!adminCredentials) {
      console.warn(`[NEXUS] Credenciais do admin ${adminId} não encontradas no Master`);
      // Continua sem credenciais - pode usar fallback local
    } else {
      console.log(`[NEXUS] Credenciais do admin ${adminId} carregadas do Master`);
    }

    // 3. Criar sessão com dados do tenant
    req.session.userId = revendedora.id;
    req.session.userEmail = revendedora.email;
    req.session.userName = revendedora.nome;
    req.session.userRole = 'reseller';
    req.session.tenantId = adminId; // CRUCIAL: Tenant é o Admin
    req.session.comissao = Number(revendedora.comissao_padrao);
    
    // Armazena credenciais do Supabase do admin na sessão (para uso posterior)
    if (adminCredentials) {
      req.session.tenantSupabaseUrl = adminCredentials.supabase_url;
      req.session.tenantSupabaseKey = adminCredentials.supabase_anon_key;
    }

    req.session.save((err) => {
      if (err) {
        console.error('Erro ao salvar sessao:', err);
        return res.status(500).json({ error: 'Erro ao criar sessao' });
      }
      
      console.log(`✅ [NEXUS] Login revendedora: ${revendedora.email} -> tenant: ${adminId} (creds: ${adminCredentials ? 'OK' : 'N/A'})`);
      
      res.json({
        success: true,
        redirect: '/revendedora/reseller/dashboard',
        user: {
          id: revendedora.id,
          nome: revendedora.nome,
          email: revendedora.email,
          cpf: revendedora.cpf,
          role: 'reseller',
          comissao: revendedora.comissao_padrao
        },
        tenant: {
          adminId: adminId,
          hasCredentials: !!adminCredentials
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

    const { nome, email, cpf, telefone, adminId } = req.body;

    if (!nome || !email || !cpf || !adminId) {
      return res.status(400).json({
        error: 'Campos obrigatorios: nome, email, cpf, adminId'
      });
    }

    // Normaliza e valida CPF
    const cpfNormalizado = normalizeCPF(cpf);
    if (cpfNormalizado.length !== 11) {
      return res.status(400).json({ error: 'CPF deve ter 11 digitos' });
    }

    const { data, error } = await supabaseOwner
      .from('revendedoras')
      .insert({
        admin_id: adminId,
        nome,
        email,
        cpf: cpfNormalizado,
        telefone: telefone || null,
        status: 'pendente'
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao registrar revendedora:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Email ou CPF ja cadastrado' });
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
