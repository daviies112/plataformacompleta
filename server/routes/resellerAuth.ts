import express, { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseOwner, SUPABASE_CONFIGURED } from '../config/supabaseOwner';
import { 
  getAdminCredentials, 
  getMasterClient, 
  getAllAdminsWithCredentials,
  createTenantClient,
  processPendingSyncEvents,
  createRevendedoraFromContract
} from '../lib/masterSyncService';

const profileUpdateSchema = z.object({
  nome: z.string().min(2).max(100),
  telefone: z.string().max(20).optional(),
});

const notificationsUpdateSchema = z.object({
  email_vendas: z.boolean(),
  email_comissoes: z.boolean(),
  email_promocoes: z.boolean(),
  push_vendas: z.boolean(),
  push_estoque: z.boolean(),
});

const router = express.Router();

// GET /api/reseller/test-master - Testar conexão com Supabase Master (multitenant)
router.get('/test-master', async (_req: Request, res: Response) => {
  try {
    const master = getMasterClient();
    
    if (!master) {
      return res.json({
        status: 'error',
        message: 'Supabase Master não configurado',
        details: 'Configure SUPABASE_URL e SERVICE_ROLE_KEY nos Secrets'
      });
    }
    
    // Tenta listar revendedoras
    const { data: revendedoras, error: revError } = await master
      .from('revendedoras')
      .select('id, email, nome, admin_id, status')
      .limit(5);
    
    // Tenta listar credenciais de admins
    const { data: adminCreds, error: credError } = await master
      .from('admin_supabase_credentials')
      .select('id, admin_id, project_name, supabase_url')
      .limit(5);
    
    const adminsWithCreds = await getAllAdminsWithCredentials();
    
    res.json({
      status: 'connected',
      message: 'Conexão com Supabase Master OK',
      tables: {
        revendedoras: {
          count: revendedoras?.length || 0,
          error: revError?.message || null,
          sample: revendedoras?.slice(0, 3)
        },
        admin_supabase_credentials: {
          count: adminCreds?.length || 0,
          error: credError?.message || null,
          sample: adminCreds?.map(c => ({ 
            admin_id: c.admin_id, 
            project_name: c.project_name,
            url: c.supabase_url?.substring(0, 40) + '...'
          }))
        }
      },
      adminsConfigurados: adminsWithCreds.length
    });
    
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// GET /api/reseller/sync-now - Força sincronização manual de contratos
router.get('/sync-now', async (_req: Request, res: Response) => {
  try {
    const admins = await getAllAdminsWithCredentials();
    
    if (!admins.length) {
      return res.json({
        status: 'no_admins',
        message: 'Nenhum admin com credenciais configurado no Master'
      });
    }
    
    const results: any[] = [];
    
    for (const admin of admins) {
      try {
        const tenantClient = createTenantClient(admin.credentials);
        
        // Verifica integration_queue
        const { data: queueItems, error: queueError } = await tenantClient
          .from('integration_queue')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        
        // Verifica contracts com status='signed'
        const { data: contracts, error: contractsError } = await tenantClient
          .from('contracts')
          .select('id, status, client_name, client_email, client_cpf, created_at')
          .eq('status', 'signed')
          .order('created_at', { ascending: false })
          .limit(10);
        
        // Processa eventos pendentes
        const processed = await processPendingSyncEvents(admin.admin_id, tenantClient);
        
        results.push({
          admin_id: admin.admin_id,
          supabase_url: admin.credentials.supabase_url,
          integration_queue: {
            count: queueItems?.length || 0,
            error: queueError?.message,
            items: queueItems?.map(i => ({
              id: i.id,
              entity_type: i.entity_type,
              status: i.status,
              payload: i.payload
            }))
          },
          signed_contracts: {
            count: contracts?.length || 0,
            error: contractsError?.message,
            items: contracts
          },
          processed: processed
        });
      } catch (error: any) {
        results.push({
          admin_id: admin.admin_id,
          error: error.message
        });
      }
    }
    
    res.json({
      status: 'ok',
      admins_checked: admins.length,
      results
    });
    
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// POST /api/reseller/create-from-contract - Criar revendedora manualmente de um contrato
router.post('/create-from-contract', async (req: Request, res: Response) => {
  try {
    const { admin_id, contract_id, email, cpf, nome, telefone } = req.body;
    
    if (!admin_id || !email || !cpf || !nome) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: admin_id, email, cpf, nome' 
      });
    }
    
    const revendedoraId = await createRevendedoraFromContract({
      admin_id,
      contract_id: contract_id || 'manual-' + Date.now(),
      email,
      cpf,
      nome,
      telefone
    });
    
    if (revendedoraId) {
      res.json({
        success: true,
        revendedora_id: revendedoraId,
        message: 'Revendedora criada com sucesso'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Falha ao criar revendedora'
      });
    }
    
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

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

    // 3. Criar sessão com dados do tenant (SEM credenciais - buscar sob demanda por segurança)
    req.session.userId = revendedora.id;
    req.session.userEmail = revendedora.email;
    req.session.userName = revendedora.nome;
    req.session.userRole = 'reseller';
    req.session.tenantId = adminId; // CRUCIAL: Tenant é o Admin
    req.session.comissao = Number(revendedora.comissao_padrao);
    
    // NOTA: Credenciais do Supabase NÃO são armazenadas na sessão por segurança
    // Use getAdminCredentials(tenantId) quando precisar das credenciais

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
// 🔐 SEGURANÇA: adminId é derivado da sessão do admin autenticado, NUNCA do body
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Verificar se é um admin autenticado
    if (!req.session?.userId || req.session?.userRole === 'reseller') {
      return res.status(403).json({ error: 'Acesso restrito a administradores autenticados' });
    }

    if (!SUPABASE_CONFIGURED || !supabaseOwner) {
      return res.status(503).json({ error: 'Sistema nao configurado' });
    }

    const { nome, email, cpf, telefone } = req.body;
    
    // 🔐 SEGURANÇA: adminId derivado da sessão, não do body
    const adminId = req.session.tenantId || req.session.userId;

    if (!nome || !email || !cpf) {
      return res.status(400).json({
        error: 'Campos obrigatorios: nome, email, cpf'
      });
    }

    if (!adminId) {
      return res.status(401).json({ error: 'Sessão inválida - adminId não encontrado' });
    }

    // Normaliza e valida CPF
    const cpfNormalizado = normalizeCPF(cpf);
    if (cpfNormalizado.length !== 11) {
      return res.status(400).json({ error: 'CPF deve ter 11 digitos' });
    }

    const { data, error } = await supabaseOwner
      .from('revendedoras')
      .insert({
        admin_id: adminId, // 🔐 Derivado da sessão
        nome,
        email: email.toLowerCase().trim(),
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

    console.log(`✅ [NEXUS] Revendedora registrada: ${email} -> admin: ${adminId}`);

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

// ===== ROTAS DE CONFIGURAÇÕES DA REVENDEDORA =====

// GET /api/reseller/settings - Buscar configurações da revendedora
router.get('/settings', async (req: Request, res: Response) => {
  try {
    if (!req.session?.userEmail || req.session?.userRole !== 'reseller') {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const master = getMasterClient();
    if (!master) {
      return res.status(503).json({ error: 'Sistema não configurado' });
    }

    const { data: revendedora } = await master
      .from('revendedoras')
      .select('*')
      .eq('email', req.session.userEmail)
      .single();

    res.json({
      profile: {
        nome: revendedora?.nome || '',
        email: revendedora?.email || '',
        telefone: revendedora?.telefone || '',
      },
      notifications: revendedora?.notifications_config || {
        email_vendas: true,
        email_comissoes: true,
        email_promocoes: false,
        push_vendas: true,
        push_estoque: true,
      }
    });

  } catch (error: any) {
    console.error('Erro ao buscar settings:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/reseller/supabase-config - Buscar credenciais Supabase da revendedora (próprias ou herdadas)
router.get('/supabase-config', async (req: Request, res: Response) => {
  try {
    if (!req.session?.userEmail || req.session?.userRole !== 'reseller') {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const master = getMasterClient();
    if (!master) {
      return res.status(503).json({ error: 'Sistema não configurado' });
    }

    // Buscar a revendedora com suas credenciais próprias
    const { data: revendedora } = await master
      .from('revendedoras')
      .select('id, admin_id, supabase_url, supabase_anon_key, supabase_service_key')
      .eq('email', req.session.userEmail)
      .single();

    if (!revendedora) {
      return res.json({ 
        supabase_url: '', 
        supabase_anon_key: '', 
        supabase_service_key: '',
        has_own_credentials: false,
        configured: false
      });
    }

    // Verificar se a revendedora tem credenciais próprias
    if (revendedora.supabase_url && revendedora.supabase_anon_key) {
      res.json({
        supabase_url: revendedora.supabase_url || '',
        supabase_anon_key: revendedora.supabase_anon_key || '',
        supabase_service_key: revendedora.supabase_service_key || '',
        has_own_credentials: true,
        configured: true
      });
    } else {
      // Sem credenciais configuradas
      res.json({ 
        supabase_url: '', 
        supabase_anon_key: '', 
        supabase_service_key: '',
        has_own_credentials: false,
        configured: false
      });
    }

  } catch (error: any) {
    console.error('Erro ao buscar supabase config:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/reseller/profile - Atualizar perfil da revendedora
router.put('/profile', async (req: Request, res: Response) => {
  try {
    if (!req.session?.userEmail || req.session?.userRole !== 'reseller') {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const master = getMasterClient();
    if (!master) {
      return res.status(503).json({ error: 'Sistema não configurado' });
    }

    const parseResult = profileUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parseResult.error.errors });
    }

    const { nome, telefone } = parseResult.data;

    const { data, error } = await master
      .from('revendedoras')
      .update({ nome, telefone })
      .eq('email', req.session.userEmail)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar perfil:', error);
      return res.status(500).json({ error: 'Erro ao atualizar' });
    }

    res.json({ success: true, profile: data });

  } catch (error: any) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/reseller/notifications - Atualizar preferências de notificação
router.put('/notifications', async (req: Request, res: Response) => {
  try {
    if (!req.session?.userEmail || req.session?.userRole !== 'reseller') {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const master = getMasterClient();
    if (!master) {
      return res.status(503).json({ error: 'Sistema não configurado' });
    }

    const parseResult = notificationsUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parseResult.error.errors });
    }

    const { error } = await master
      .from('revendedoras')
      .update({ 
        notifications_config: parseResult.data
      })
      .eq('email', req.session.userEmail);

    if (error) {
      console.error('Erro ao atualizar notificações:', error);
      return res.status(500).json({ error: 'Erro ao atualizar' });
    }

    res.json({ success: true });

  } catch (error: any) {
    console.error('Erro ao atualizar notificações:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Schema para validação das credenciais Supabase
const supabaseConfigSchema = z.object({
  supabase_url: z.string().url('URL inválida').min(1, 'URL é obrigatória'),
  supabase_anon_key: z.string().min(10, 'Anon Key inválida'),
  supabase_service_key: z.string().optional(),
});

// PUT /api/reseller/supabase-config - Salvar credenciais Supabase próprias da revendedora
router.put('/supabase-config', async (req: Request, res: Response) => {
  try {
    if (!req.session?.userEmail || req.session?.userRole !== 'reseller') {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const master = getMasterClient();
    if (!master) {
      return res.status(503).json({ error: 'Sistema não configurado' });
    }

    // Validar dados de entrada
    const parseResult = supabaseConfigSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: parseResult.error.errors 
      });
    }

    const { supabase_url, supabase_anon_key, supabase_service_key } = parseResult.data;

    // Atualizar credenciais da revendedora
    const { data, error } = await master
      .from('revendedoras')
      .update({ 
        supabase_url,
        supabase_anon_key,
        supabase_service_key: supabase_service_key || null
      })
      .eq('email', req.session.userEmail)
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar credenciais Supabase:', error);
      return res.status(500).json({ error: 'Erro ao salvar credenciais' });
    }

    console.log(`✅ Credenciais Supabase salvas para revendedora: ${req.session.userEmail}`);

    res.json({ 
      success: true, 
      message: 'Credenciais Supabase salvas com sucesso',
      configured: true
    });

  } catch (error: any) {
    console.error('Erro ao salvar supabase config:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/reseller/supabase-config/test - Testar conexão com Supabase usando credenciais próprias
router.post('/supabase-config/test', async (req: Request, res: Response) => {
  try {
    if (!req.session?.userEmail || req.session?.userRole !== 'reseller') {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const master = getMasterClient();
    if (!master) {
      return res.status(503).json({ error: 'Sistema não configurado' });
    }

    // Buscar a revendedora com suas credenciais próprias
    const { data: revendedora } = await master
      .from('revendedoras')
      .select('id, supabase_url, supabase_anon_key, supabase_service_key')
      .eq('email', req.session.userEmail)
      .single();

    if (!revendedora) {
      return res.status(404).json({ error: 'Revendedora não encontrada' });
    }

    // Verificar se tem credenciais próprias configuradas
    if (!revendedora.supabase_url || !revendedora.supabase_anon_key) {
      return res.status(400).json({ 
        error: 'Credenciais não configuradas',
        message: 'Configure suas credenciais Supabase antes de testar a conexão'
      });
    }

    // Criar cliente com credenciais próprias da revendedora
    const tenantClient = createTenantClient({
      supabase_url: revendedora.supabase_url,
      supabase_anon_key: revendedora.supabase_anon_key,
      supabase_service_key: revendedora.supabase_service_key
    });
    
    // Testar a conexão fazendo uma query simples - tentar tabelas comuns
    let connectionSuccess = false;
    let testedTable = '';
    
    // Tentar diferentes tabelas que podem existir
    const tablesToTest = ['contracts', 'products', 'customers', 'orders', 'users'];
    
    for (const table of tablesToTest) {
      try {
        const { error } = await tenantClient
          .from(table)
          .select('id')
          .limit(1);
        
        if (!error) {
          connectionSuccess = true;
          testedTable = table;
          break;
        }
      } catch (e) {
        // Continuar tentando próxima tabela
      }
    }

    // Se nenhuma tabela funcionou, tentar uma query genérica
    if (!connectionSuccess) {
      try {
        // Query RPC para testar conexão básica
        const { error } = await tenantClient.rpc('version', {});
        if (!error) {
          connectionSuccess = true;
          testedTable = 'rpc:version';
        }
      } catch (e) {
        // Ignorar
      }
    }

    if (connectionSuccess) {
      console.log(`✅ Conexão Supabase testada com sucesso para ${req.session.userEmail} (tabela: ${testedTable})`);
      res.json({ 
        success: true, 
        message: 'Conexão estabelecida com sucesso',
        tested_table: testedTable
      });
    } else {
      res.status(400).json({ 
        error: 'Falha na conexão',
        message: 'Não foi possível conectar ao Supabase. Verifique se a URL e as chaves estão corretas.'
      });
    }

  } catch (error: any) {
    console.error('Erro ao testar conexão:', error);
    res.status(500).json({ error: 'Erro interno: ' + error.message });
  }
});

export default router;
