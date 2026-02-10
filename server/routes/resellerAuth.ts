import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { supabaseOwner, SUPABASE_CONFIGURED } from '../config/supabaseOwner';
import { 
  getAdminCredentials, 
  getMasterClient, 
  getAllAdminsWithCredentials,
  createTenantClient,
  processPendingSyncEvents,
  createRevendedoraFromContract
} from '../lib/masterSyncService';
import { pool } from '../db';
import { pagarmeService } from '../services/pagarme';
import { saveResellerRecipientId, getResellerRecipientId } from '../services/commission';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'auto-generated-secret-' + Math.random().toString(36).substring(2);
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET não configurado - usando fallback seguro');
}
const JWT_EXPIRY = '7d';

interface ResellerTokenPayload {
  userId: string;
  userEmail: string;
  userName: string;
  userRole: 'reseller';
  resellerId: string; // ID da revendedora para endpoints de pagamento
  tenantId: string | null;
  companySlug?: string;
  comissao: number;
  projectName?: string;
}

function generateResellerToken(payload: ResellerTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyResellerToken(token: string): ResellerTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as ResellerTokenPayload;
  } catch {
    return null;
  }
}

export function resellerAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.session?.userEmail && req.session?.userRole === 'reseller') {
    return next();
  }
  
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyResellerToken(token);
    if (payload && payload.userRole === 'reseller') {
      req.session.userId = payload.userId;
      req.session.userEmail = payload.userEmail;
      req.session.userName = payload.userName;
      req.session.userRole = payload.userRole;
      req.session.resellerId = payload.resellerId; // ID da revendedora para endpoints de pagamento
      req.session.tenantId = payload.tenantId;
      req.session.comissao = payload.comissao;
      req.session.projectName = payload.projectName;
      return next();
    }
  }
  
  next();
}

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

// GET /api/reseller/migrate-credentials - Migração única: sincroniza credenciais de todas as revendedoras existentes
router.get('/migrate-credentials', async (_req: Request, res: Response) => {
  try {
    const master = getMasterClient();
    if (!master) {
      return res.status(503).json({ error: 'Supabase Master não configurado' });
    }
    
    // 1. Buscar todos os admins com credenciais
    const admins = await getAllAdminsWithCredentials();
    
    if (!admins.length) {
      return res.json({ status: 'no_admins', message: 'Nenhum admin com credenciais' });
    }
    
    const results: any[] = [];
    let totalSynced = 0;
    
    // 2. Para cada admin, buscar revendedoras e sincronizar credenciais
    for (const admin of admins) {
      const { data: revendedoras, error } = await master
        .from('revendedoras')
        .select('id, email, nome')
        .eq('admin_id', admin.admin_id);
      
      if (error || !revendedoras?.length) {
        results.push({ admin_id: admin.admin_id, error: error?.message || 'Nenhuma revendedora' });
        continue;
      }
      
      const adminResult = { admin_id: admin.admin_id, revendedoras: [] as any[] };
      
      for (const rev of revendedoras) {
        try {
          await pool.query(
            `INSERT INTO reseller_supabase_configs (reseller_email, supabase_url, supabase_anon_key, supabase_service_key, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (reseller_email) DO UPDATE SET
             supabase_url = EXCLUDED.supabase_url,
             supabase_anon_key = EXCLUDED.supabase_anon_key,
             supabase_service_key = EXCLUDED.supabase_service_key,
             updated_at = NOW()`,
            [rev.email.toLowerCase().trim(), admin.credentials.supabase_url, admin.credentials.supabase_anon_key, admin.credentials.supabase_service_key]
          );
          totalSynced++;
          adminResult.revendedoras.push({ email: rev.email, synced: true });
        } catch (syncErr: any) {
          adminResult.revendedoras.push({ email: rev.email, synced: false, error: syncErr.message });
        }
      }
      
      results.push(adminResult);
    }
    
    console.log(`✅ [MIGRATE] Credenciais sincronizadas para ${totalSynced} revendedoras`);
    
    res.json({
      status: 'ok',
      totalSynced,
      admins: admins.length,
      results
    });
    
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
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
      req.session.resellerId = 'dev-reseller-1'; // ID da revendedora para endpoints de pagamento
      req.session.tenantId = 'dev-admin-default';
      req.session.comissao = 10;

      console.log('[NEXUS-DEV] Sessão configurada:', {
        userId: req.session.userId,
        userEmail: req.session.userEmail,
        userRole: req.session.userRole,
        sessionID: req.sessionID
      });

      const token = generateResellerToken({
        userId: 'dev-reseller-1',
        userEmail: email,
        userName: 'Revendedora Teste',
        userRole: 'reseller',
        resellerId: 'dev-reseller-1', // ID da revendedora para endpoints de pagamento
        tenantId: 'dev-admin-default',
        comissao: 10
      });

      return req.session.save((err) => {
        if (err) {
          console.error('Erro ao salvar sessao:', err);
          return res.status(500).json({ error: 'Erro ao criar sessao' });
        }
        
        console.log('[NEXUS-DEV] Sessão salva com sucesso, sessionID:', req.sessionID);
        
        res.json({
          success: true,
          redirect: '/revendedora/reseller/dashboard',
          token,
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
      .select('*, admin_users(company_name)')
      .eq('email', email);
    
    console.log('[NEXUS] Query result:', { 
      count: revendedoras?.length || 0, 
      error: queryError?.message,
      firstRecord: revendedoras?.[0] ? { 
        email: revendedoras[0].email, 
        cpf: revendedoras[0].cpf, 
        status: revendedoras[0].status,
        admin_id: revendedoras[0].admin_id
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

    // 1.5. Buscar Company Slug do Admin
    let companySlug = '';
    try {
      const { getCompanySlug } = await import('../lib/tenantSlug');
      companySlug = await getCompanySlug(adminId);
    } catch (slugErr) {
      console.warn('[NEXUS] Erro ao buscar company slug no login:', slugErr);
    }

    // 2. Buscar credenciais do Supabase do Admin (para plataforma separada)
    const adminCredentials = await getAdminCredentials(adminId);
    let projectName = 'Plataforma';
    
    if (!adminCredentials) {
      console.warn(`[NEXUS] Credenciais do admin ${adminId} não encontradas no Master`);
      // Continua sem credenciais - pode usar fallback local
    } else {
      console.log(`[NEXUS] Credenciais do admin ${adminId} carregadas`);
      projectName = adminCredentials.project_name || 'Plataforma';
      
      // 2.1. Salvar automaticamente as credenciais no banco local para esta revendedora
      try {
        const checkResult = await pool.query(
          'SELECT id FROM reseller_supabase_configs WHERE reseller_email = $1',
          [revendedora.email]
        );
        
        if (checkResult.rows.length === 0) {
          // Inserir novas credenciais
          await pool.query(
            `INSERT INTO reseller_supabase_configs (reseller_email, supabase_url, supabase_anon_key, supabase_service_key)
             VALUES ($1, $2, $3, $4)`,
            [revendedora.email, adminCredentials.supabase_url, adminCredentials.supabase_anon_key, adminCredentials.supabase_service_key]
          );
          console.log(`✅ [NEXUS] Credenciais do admin salvas automaticamente para: ${revendedora.email}`);
        } else {
          // Atualizar credenciais existentes (caso o admin tenha mudado)
          await pool.query(
            `UPDATE reseller_supabase_configs 
             SET supabase_url = $2, supabase_anon_key = $3, supabase_service_key = $4, updated_at = NOW()
             WHERE reseller_email = $1`,
            [revendedora.email, adminCredentials.supabase_url, adminCredentials.supabase_anon_key, adminCredentials.supabase_service_key]
          );
          console.log(`✅ [NEXUS] Credenciais do admin atualizadas para: ${revendedora.email}`);
        }
      } catch (dbError) {
        console.error('[NEXUS] Erro ao salvar credenciais no banco local:', dbError);
        // Não bloqueia o login se falhar
      }
    }

    // 3. Criar sessão com dados do tenant (SEM credenciais - buscar sob demanda por segurança)
    req.session.userId = revendedora.id;
    req.session.userEmail = revendedora.email;
    req.session.userName = revendedora.nome;
    req.session.userRole = 'reseller';
    req.session.resellerId = revendedora.id; // ID da revendedora para endpoints de pagamento
    req.session.tenantId = adminId; // CRUCIAL: Tenant é o Admin
    req.session.companySlug = companySlug; // Adicionado para isolamento de URL
    req.session.comissao = Number(revendedora.comissao_padrao);
    req.session.projectName = projectName;
    
    // Auto-preencher credenciais do Admin para a revendedora no banco local se não existirem
    if (adminCredentials) {
      try {
        await pool.query(
          `INSERT INTO reseller_supabase_configs (reseller_email, supabase_url, supabase_anon_key, supabase_service_key)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (reseller_email) DO UPDATE SET
           supabase_url = EXCLUDED.supabase_url,
           supabase_anon_key = EXCLUDED.supabase_anon_key,
           supabase_service_key = EXCLUDED.supabase_service_key,
           updated_at = NOW()`,
          [revendedora.email, adminCredentials.supabase_url, adminCredentials.supabase_anon_key, adminCredentials.supabase_service_key]
        );
        console.log(`✅ [NEXUS] Credenciais sincronizadas automaticamente para ${revendedora.email}`);
      } catch (syncErr) {
        console.error('[NEXUS] Erro ao sincronizar credenciais no login:', syncErr);
      }
    }

    const token = generateResellerToken({
      userId: revendedora.id,
      userEmail: revendedora.email,
      userName: revendedora.nome || '',
      userRole: 'reseller',
      resellerId: revendedora.id, // ID da revendedora para endpoints de pagamento
      tenantId: adminId,
      companySlug: companySlug,
      comissao: Number(revendedora.comissao_padrao) || 0,
      projectName: projectName
    });

    req.session.save((err) => {
      if (err) {
        console.error('Erro ao salvar sessao:', err);
        return res.status(500).json({ error: 'Erro ao criar sessao' });
      }
      
      console.log(`✅ [NEXUS] Login revendedora: ${revendedora.email} -> tenant: ${adminId} (creds: ${adminCredentials ? 'OK' : 'N/A'})`);
      console.log('[NEXUS] Session após login:', {
        userId: req.session.userId,
        userEmail: req.session.userEmail,
        userRole: req.session.userRole,
        sessionId: req.sessionID
      });
      
      res.json({
        success: true,
        redirect: '/revendedora/reseller/dashboard',
        token,
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
          hasCredentials: !!adminCredentials,
          projectName: projectName
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
        status: 'pendente',
        company_slug: req.session.companySlug || null
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

    // 🔄 AUTO-SYNC: Copiar credenciais do admin para a revendedora automaticamente
    const resellerEmail = email.toLowerCase().trim();
    try {
      const adminCredentials = await getAdminCredentials(adminId);
      
      if (adminCredentials) {
        await pool.query(
          `INSERT INTO reseller_supabase_configs (reseller_email, supabase_url, supabase_anon_key, supabase_service_key, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (reseller_email) DO UPDATE SET
           supabase_url = EXCLUDED.supabase_url,
           supabase_anon_key = EXCLUDED.supabase_anon_key,
           supabase_service_key = EXCLUDED.supabase_service_key,
           updated_at = NOW()`,
          [resellerEmail, adminCredentials.supabase_url, adminCredentials.supabase_anon_key, adminCredentials.supabase_service_key]
        );
        console.log(`✅ [NEXUS] Credenciais Supabase do admin copiadas automaticamente para: ${resellerEmail}`);
      } else {
        console.warn(`⚠️ [NEXUS] Admin ${adminId} não tem credenciais Supabase configuradas em admin_supabase_credentials`);
      }
    } catch (credError) {
      console.error('[NEXUS] Erro ao copiar credenciais do admin para revendedora:', credError);
      // Não bloqueia o registro - as credenciais podem ser sincronizadas depois no login
    }

    res.json({
      success: true,
      message: 'Cadastro enviado para aprovacao',
      id: data.id,
      credentialsSynced: true
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
      .select('id, nome, email, cpf, telefone, status, comissao_padrao, pagarme_recipient_id:stripe_account_id, created_at')
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

// POST /api/reseller/admin/sync-credentials - Sincronizar credenciais Supabase para todas as revendedoras
router.post('/admin/sync-credentials', async (req: Request, res: Response) => {
  try {
    if (!req.session?.userId || req.session?.userRole === 'reseller') {
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }

    if (!SUPABASE_CONFIGURED || !supabaseOwner) {
      return res.status(503).json({ error: 'Sistema nao configurado' });
    }

    const adminId = req.session.tenantId || req.session.userId;
    
    // 1. Buscar credenciais do admin
    const adminCredentials = await getAdminCredentials(adminId);
    
    if (!adminCredentials) {
      return res.status(400).json({ 
        error: 'Admin não tem credenciais Supabase configuradas em admin_supabase_credentials',
        adminId
      });
    }
    
    // 2. Buscar todas as revendedoras do admin
    const { data: revendedoras, error: queryError } = await supabaseOwner
      .from('revendedoras')
      .select('id, email, nome')
      .eq('admin_id', adminId);
    
    if (queryError) {
      return res.status(500).json({ error: 'Erro ao buscar revendedoras' });
    }
    
    if (!revendedoras?.length) {
      return res.json({ success: true, synced: 0, message: 'Nenhuma revendedora encontrada' });
    }
    
    // 3. Sincronizar credenciais para cada revendedora
    let syncedCount = 0;
    const syncResults: any[] = [];
    
    for (const rev of revendedoras) {
      try {
        await pool.query(
          `INSERT INTO reseller_supabase_configs (reseller_email, supabase_url, supabase_anon_key, supabase_service_key, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (reseller_email) DO UPDATE SET
           supabase_url = EXCLUDED.supabase_url,
           supabase_anon_key = EXCLUDED.supabase_anon_key,
           supabase_service_key = EXCLUDED.supabase_service_key,
           updated_at = NOW()`,
          [rev.email.toLowerCase().trim(), adminCredentials.supabase_url, adminCredentials.supabase_anon_key, adminCredentials.supabase_service_key]
        );
        syncedCount++;
        syncResults.push({ email: rev.email, success: true });
      } catch (syncError: any) {
        syncResults.push({ email: rev.email, success: false, error: syncError.message });
      }
    }
    
    console.log(`✅ [NEXUS] Credenciais sincronizadas para ${syncedCount}/${revendedoras.length} revendedoras`);
    
    res.json({
      success: true,
      synced: syncedCount,
      total: revendedoras.length,
      results: syncResults
    });

  } catch (error) {
    console.error('Erro ao sincronizar credenciais:', error);
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

// Helper function to get authenticated reseller from session or token
async function getAuthenticatedReseller(req: Request): Promise<{ email: string; userId: string; tenantId: string | null } | null> {
  // Check session first
  if (req.session?.userEmail && req.session?.userRole === 'reseller' && req.session?.userId) {
    return { 
      email: req.session.userEmail, 
      userId: req.session.userId,
      tenantId: req.session.tenantId || null 
    };
  }
  
  // Try to get from JWT token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyResellerToken(token);
    if (payload && payload.userRole === 'reseller' && payload.userId) {
      // Populate session for future requests
      req.session.userId = payload.userId;
      req.session.userEmail = payload.userEmail;
      req.session.userName = payload.userName;
      req.session.userRole = payload.userRole;
      req.session.tenantId = payload.tenantId;
      req.session.comissao = payload.comissao;
      req.session.projectName = payload.projectName;
      return { 
        email: payload.userEmail, 
        userId: payload.userId,
        tenantId: payload.tenantId || null 
      };
    } else {
      console.log('[AUTH-DEBUG] JWT token inválido ou não é reseller');
    }
  } else {
    console.log('[AUTH-DEBUG] Sem sessão e sem token JWT');
  }
  
  return null;
}

// GET /api/reseller/supabase-config - Buscar status das credenciais Supabase da revendedora
// SECURITY: Retorna supabase_url e supabase_anon_key apenas para revendedora autenticada
// SECURITY: Nunca retornar supabase_service_key (apenas server-side)
// TRANSITIONAL: Herda do admin se não tiver credenciais próprias
// STORAGE: Usa tabela local reseller_supabase_configs (PostgreSQL Replit)
router.get('/supabase-config', async (req: Request, res: Response) => {
  try {
    const auth = await getAuthenticatedReseller(req);
    if (!auth) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const userEmail = auth.email;

    // Buscar credenciais próprias do banco local
    const result = await pool.query(
      'SELECT supabase_url, supabase_anon_key, supabase_service_key FROM reseller_supabase_configs WHERE reseller_email = $1',
      [userEmail]
    );

    const config = result.rows[0];
    const hasOwnCredentials = !!(config?.supabase_url && config?.supabase_anon_key);
    
    if (hasOwnCredentials) {
      // Retornar URL e anon_key (service_key nunca é exposta no frontend)
      return res.json({
        supabase_url: config.supabase_url,
        supabase_anon_key: config.supabase_anon_key,
        has_service_key: !!config.supabase_service_key,
        configured: true,
        inherited: false
      });
    }
    
    // TRANSITIONAL: Verificar se pode herdar do admin (buscar admin_id do Supabase Master)
    const master = getMasterClient();
    if (master) {
      const { data: revendedora } = await master
        .from('revendedoras')
        .select('admin_id')
        .eq('email', userEmail)
        .single();
      
      if (revendedora?.admin_id) {
        const adminCreds = await getAdminCredentials(revendedora.admin_id);
        
        if (adminCreds && adminCreds.supabase_url && adminCreds.supabase_anon_key) {
          return res.json({
            supabase_url: adminCreds.supabase_url,
            supabase_anon_key: adminCreds.supabase_anon_key,
            has_service_key: !!adminCreds.supabase_service_key,
            configured: false,
            inherited: true
          });
        }
      }
    }

    res.json({ 
      supabase_url: '',
      supabase_anon_key: '',
      has_service_key: false,
      configured: false,
      inherited: false
    });

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

// Schema para validação das credenciais Supabase (nova configuração)
const supabaseConfigSchema = z.object({
  supabase_url: z.string().url('URL inválida').min(1, 'URL é obrigatória'),
  supabase_anon_key: z.string().min(10, 'Anon Key inválida'),
  supabase_service_key: z.string().optional(),
});

// Schema flexível para atualizações parciais (quando já configurado)
const supabaseUpdateSchema = z.object({
  supabase_url: z.string().url('URL inválida').min(1, 'URL é obrigatória'),
  supabase_anon_key: z.string().optional(),
  supabase_service_key: z.string().optional(),
});

// PUT /api/reseller/supabase-config - Salvar credenciais Supabase próprias da revendedora
// STORAGE: Usa tabela local reseller_supabase_configs (PostgreSQL Replit)
// Suporta atualizações parciais quando já configurado
router.put('/supabase-config', async (req: Request, res: Response) => {
  try {
    const auth = await getAuthenticatedReseller(req);
    console.log('[supabase-config PUT] Auth check:', {
      authenticated: !!auth,
      email: auth?.email,
      hasAuthHeader: !!req.headers.authorization
    });
    
    if (!auth) {
      console.log('[supabase-config PUT] Auth failed - returning 401');
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const userEmail = auth.email;

    // Buscar credenciais atuais do banco local
    const currentResult = await pool.query(
      'SELECT supabase_url, supabase_anon_key, supabase_service_key FROM reseller_supabase_configs WHERE reseller_email = $1',
      [userEmail]
    );
    const currentData = currentResult.rows[0];
    const isAlreadyConfigured = !!(currentData?.supabase_url && currentData?.supabase_anon_key);

    // Usar schema apropriado
    const schema = isAlreadyConfigured ? supabaseUpdateSchema : supabaseConfigSchema;
    const parseResult = schema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: parseResult.error.errors 
      });
    }

    const { supabase_url, supabase_anon_key, supabase_service_key } = parseResult.data;

    // Validar anon_key para primeira configuração
    if (!isAlreadyConfigured && (!supabase_anon_key || supabase_anon_key.length < 10)) {
      return res.status(400).json({ error: 'Anon Key é obrigatória para primeira configuração' });
    }

    // Preparar valores para upsert
    const finalAnonKey = (supabase_anon_key && supabase_anon_key.length >= 10) 
      ? supabase_anon_key 
      : (currentData?.supabase_anon_key || null);
    const finalServiceKey = supabase_service_key || (currentData?.supabase_service_key || null);

    // Upsert no banco local (INSERT ou UPDATE)
    await pool.query(`
      INSERT INTO reseller_supabase_configs (reseller_email, supabase_url, supabase_anon_key, supabase_service_key, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (reseller_email) 
      DO UPDATE SET 
        supabase_url = EXCLUDED.supabase_url,
        supabase_anon_key = COALESCE(EXCLUDED.supabase_anon_key, reseller_supabase_configs.supabase_anon_key),
        supabase_service_key = COALESCE(EXCLUDED.supabase_service_key, reseller_supabase_configs.supabase_service_key),
        updated_at = CURRENT_TIMESTAMP
    `, [userEmail, supabase_url, finalAnonKey, finalServiceKey]);

    console.log(`✅ Credenciais Supabase salvas para revendedora: ${userEmail} (banco local)`);

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

// PUT /api/reseller/admin-supabase-credentials - Salvar credenciais na tabela admin_supabase_credentials do Supabase Owner
// STORAGE: Usa tabela admin_supabase_credentials no Supabase Owner
// Permite que o admin configure suas credenciais que serão herdadas pelas revendedoras
router.put('/admin-supabase-credentials', async (req: Request, res: Response) => {
  try {
    const auth = await getAuthenticatedReseller(req);
    console.log('[admin-supabase-credentials PUT] Auth check:', {
      authenticated: !!auth,
      email: auth?.email,
      tenantId: auth?.tenantId,
      hasAuthHeader: !!req.headers.authorization
    });
    
    if (!auth) {
      console.log('[admin-supabase-credentials PUT] Auth failed - returning 401');
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const { supabase_url, supabase_anon_key, supabase_service_key } = req.body;
    
    if (!supabase_url || !supabase_anon_key) {
      return res.status(400).json({ error: 'URL e Anon Key são obrigatórios' });
    }

    // Validar URL do Supabase
    if (!supabase_url.includes('supabase.co')) {
      return res.status(400).json({ error: 'URL inválida. Deve ser uma URL do Supabase' });
    }

    const tenantId = auth.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant não identificado. Faça login novamente.' });
    }

    // Buscar o Supabase Owner para salvar as credenciais
    const { getSupabaseOwnerClient } = await import('../config/supabaseOwner');
    const supabaseOwner = getSupabaseOwnerClient();
    
    if (!supabaseOwner) {
      // Fallback: salvar localmente se Supabase Owner não estiver configurado
      console.log('[admin-supabase-credentials] Supabase Owner não configurado, salvando localmente');
      
      await pool.query(`
        INSERT INTO reseller_supabase_configs (reseller_email, supabase_url, supabase_anon_key, supabase_service_key, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (reseller_email) 
        DO UPDATE SET 
          supabase_url = EXCLUDED.supabase_url,
          supabase_anon_key = EXCLUDED.supabase_anon_key,
          supabase_service_key = COALESCE(EXCLUDED.supabase_service_key, reseller_supabase_configs.supabase_service_key),
          updated_at = CURRENT_TIMESTAMP
      `, [auth.email, supabase_url, supabase_anon_key, supabase_service_key || null]);
      
      console.log(`✅ [admin-supabase-credentials] Credenciais salvas localmente para: ${auth.email}`);
      
      return res.json({ 
        success: true, 
        message: 'Credenciais salvas localmente (Supabase Owner não disponível)',
        storage: 'local'
      });
    }

    // Salvar na tabela admin_supabase_credentials do Supabase Owner
    const { error: upsertError } = await supabaseOwner
      .from('admin_supabase_credentials')
      .upsert({
        admin_id: tenantId,
        supabase_url: supabase_url,
        supabase_anon_key: supabase_anon_key,
        supabase_service_role_key: supabase_service_key || null,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'admin_id' 
      });

    if (upsertError) {
      console.error('[admin-supabase-credentials] Erro ao salvar no Supabase Owner:', upsertError);
      
      // Fallback: salvar localmente
      await pool.query(`
        INSERT INTO reseller_supabase_configs (reseller_email, supabase_url, supabase_anon_key, supabase_service_key, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (reseller_email) 
        DO UPDATE SET 
          supabase_url = EXCLUDED.supabase_url,
          supabase_anon_key = EXCLUDED.supabase_anon_key,
          supabase_service_key = COALESCE(EXCLUDED.supabase_service_key, reseller_supabase_configs.supabase_service_key),
          updated_at = CURRENT_TIMESTAMP
      `, [auth.email, supabase_url, supabase_anon_key, supabase_service_key || null]);
      
      console.log(`✅ [admin-supabase-credentials] Credenciais salvas localmente (fallback): ${auth.email}`);
      
      return res.json({ 
        success: true, 
        message: 'Credenciais salvas localmente (erro ao acessar tabela remota)',
        storage: 'local',
        warning: upsertError.message
      });
    }

    // Também salvar localmente para acesso rápido
    await pool.query(`
      INSERT INTO reseller_supabase_configs (reseller_email, supabase_url, supabase_anon_key, supabase_service_key, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (reseller_email) 
      DO UPDATE SET 
        supabase_url = EXCLUDED.supabase_url,
        supabase_anon_key = EXCLUDED.supabase_anon_key,
        supabase_service_key = COALESCE(EXCLUDED.supabase_service_key, reseller_supabase_configs.supabase_service_key),
        updated_at = CURRENT_TIMESTAMP
    `, [auth.email, supabase_url, supabase_anon_key, supabase_service_key || null]);

    console.log(`✅ [admin-supabase-credentials] Credenciais salvas no Supabase Owner para admin: ${tenantId}`);

    res.json({ 
      success: true, 
      message: 'Credenciais salvas com sucesso na tabela admin_supabase_credentials',
      storage: 'supabase_owner',
      admin_id: tenantId
    });

  } catch (error: any) {
    console.error('Erro ao salvar admin supabase credentials:', error);
    res.status(500).json({ error: 'Erro interno', details: error.message });
  }
});

// POST /api/reseller/supabase-config/test - Testar conexão com Supabase
// STORAGE: Usa tabela local reseller_supabase_configs (PostgreSQL Replit)
// TRANSITIONAL: Testa credenciais próprias ou herdadas do admin
router.post('/supabase-config/test', async (req: Request, res: Response) => {
  try {
    const auth = await getAuthenticatedReseller(req);
    if (!auth) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const userEmail = auth.email;

    let credentials: { supabase_url: string; supabase_anon_key: string; supabase_service_key?: string } | null = null;
    let isInherited = false;

    // Buscar credenciais próprias do banco local
    const configResult = await pool.query(
      'SELECT supabase_url, supabase_anon_key, supabase_service_key FROM reseller_supabase_configs WHERE reseller_email = $1',
      [userEmail]
    );
    const config = configResult.rows[0];

    // Verificar se tem credenciais próprias
    if (config?.supabase_url && config?.supabase_anon_key) {
      credentials = {
        supabase_url: config.supabase_url,
        supabase_anon_key: config.supabase_anon_key,
        supabase_service_key: config.supabase_service_key
      };
    } else {
      // TRANSITIONAL: Tentar herdar do admin via Supabase Master
      const master = getMasterClient();
      if (master) {
        const { data: revendedora } = await master
          .from('revendedoras')
          .select('admin_id')
          .eq('email', userEmail)
          .single();

        if (revendedora?.admin_id) {
          const adminCreds = await getAdminCredentials(revendedora.admin_id);
          if (adminCreds && adminCreds.supabase_url && adminCreds.supabase_anon_key) {
            credentials = adminCreds;
            isInherited = true;
          }
        }
      }
    }

    if (!credentials) {
      return res.status(400).json({ 
        error: 'Credenciais não configuradas',
        message: 'Configure suas credenciais Supabase antes de testar a conexão'
      });
    }

    console.log(`[SUPABASE-TEST] Testando conexão para ${userEmail}`);
    console.log(`[SUPABASE-TEST] URL: ${credentials.supabase_url}`);
    console.log(`[SUPABASE-TEST] Anon Key: ${credentials.supabase_anon_key?.substring(0, 50)}...`);

    // Criar cliente com as credenciais
    const tenantClient = createTenantClient(credentials);
    
    // Testar conexão com query simples - usar tabela que certamente existe
    let connectionSuccess = false;
    let testError: any = null;
    
    // Método 1: Tentar buscar metadados do Supabase (funciona sempre se credenciais válidas)
    try {
      // Usar uma query genérica que funciona em qualquer Supabase
      const { data, error } = await tenantClient
        .from('contracts')
        .select('id')
        .limit(1);
      
      console.log(`[SUPABASE-TEST] Query contracts result:`, { hasData: !!data, error: error?.message });
      
      if (!error) {
        connectionSuccess = true;
      } else {
        testError = error;
        // Se tabela não existe, isso ainda significa que a conexão funcionou
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log(`[SUPABASE-TEST] Tabela contracts não existe, mas conexão OK`);
          connectionSuccess = true;
        }
      }
    } catch (e: any) {
      console.log(`[SUPABASE-TEST] Exception ao testar contracts:`, e.message);
      testError = e;
    }
    
    // Método 2: Se ainda não conectou, tentar auth.getSession (sempre funciona)
    if (!connectionSuccess) {
      try {
        const { data, error } = await tenantClient.auth.getSession();
        console.log(`[SUPABASE-TEST] Auth getSession result:`, { hasData: !!data, error: error?.message });
        if (!error) {
          connectionSuccess = true;
        }
      } catch (e: any) {
        console.log(`[SUPABASE-TEST] Exception ao testar auth:`, e.message);
      }
    }

    if (connectionSuccess) {
      console.log(`✅ [SUPABASE-TEST] Conexão testada com sucesso para ${userEmail} (inherited: ${isInherited})`);
      res.json({ 
        success: true, 
        message: isInherited 
          ? 'Conexão OK (usando credenciais herdadas do administrador)' 
          : 'Conexão estabelecida com sucesso',
        inherited: isInherited
      });
    } else {
      console.log(`❌ [SUPABASE-TEST] Falha na conexão para ${userEmail}:`, testError?.message || 'unknown error');
      res.status(400).json({ 
        error: 'Falha na conexão',
        message: 'Não foi possível conectar ao Supabase. Verifique se as credenciais estão corretas.'
      });
    }

  } catch (error: any) {
    console.error('Erro ao testar conexão:', error);
    res.status(500).json({ error: 'Erro interno: ' + error.message });
  }
});

// ============================================================================
// STORE CONFIGURATION ENDPOINTS - Saves to Supabase Cliente with service_role
// ============================================================================

// Helper to get Supabase client for store operations (uses service_role key)
// Returns { client, adminId } or throws error with specific message
async function getStoreSupabaseClient(userEmail: string): Promise<{ client: any, adminId: string }> {
  const master = getMasterClient();
  
  // Try Master client first
  if (master) {
    // Get admin_id from reseller
    const { data: revendedora, error: revendedoraError } = await master
      .from('revendedoras')
      .select('admin_id')
      .eq('email', userEmail)
      .single();

    if (!revendedoraError && revendedora?.admin_id) {
      // Get admin credentials with service_role_key
      const adminCreds = await getAdminCredentials(revendedora.admin_id);
      if (adminCreds?.supabase_url && adminCreds?.supabase_service_key) {
        console.log('[StoreConfig] Using admin Supabase via Master:', adminCreds.supabase_url.substring(0, 40) + '...');
        
        const { createClient } = await import('@supabase/supabase-js');
        return {
          client: createClient(adminCreds.supabase_url, adminCreds.supabase_service_key),
          adminId: revendedora.admin_id
        };
      }
    }
  }
  
  // Fallback: Try config file credentials
  console.log('[StoreConfig] Master not available, trying config file fallback');
  try {
    const fs = await import('fs');
    const configPath = './data/cliente_supabase_config.json';
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.supabase_url && config.supabase_service_key) {
        console.log('[StoreConfig] Using config file Supabase:', config.supabase_url.substring(0, 40) + '...');
        
        const { createClient } = await import('@supabase/supabase-js');
        return {
          client: createClient(config.supabase_url, config.supabase_service_key),
          adminId: 'config-file'
        };
      }
    }
  } catch (e) {
    console.log('[StoreConfig] Config file fallback failed:', e);
  }
  
  console.log('[StoreConfig] No Supabase credentials available');
  throw new Error('SUPABASE_NOT_CONFIGURED');
}

// GET /api/reseller/store-config - Load store configuration from Supabase
router.get('/store-config', async (req: Request, res: Response) => {
  try {
    const auth = await getAuthenticatedReseller(req);
    if (!auth) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const resellerId = auth.userId;
    console.log('[StoreConfig] Loading config for reseller:', resellerId);

    try {
      const { client: supabase } = await getStoreSupabaseClient(auth.email);
      
      const { data, error } = await supabase
        .from('reseller_stores')
        .select('*')
        .eq('reseller_id', resellerId)
        .maybeSingle();

      if (error) {
        // Table might not exist - check error code
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log('[StoreConfig] Table reseller_stores does not exist in Supabase Cliente');
          return res.status(503).json({ 
            error: 'TABLE_NOT_FOUND',
            message: 'A tabela reseller_stores não existe no Supabase. Execute o SQL de criação.'
          });
        }
        throw error;
      }

      if (data) {
        console.log('[StoreConfig] Found config in Supabase:', { 
          resellerId, 
          productCount: data.product_ids?.length || 0,
          isPublished: data.is_published
        });
        return res.json({
          success: true,
          data: {
            product_ids: data.product_ids || [],
            is_published: data.is_published || false,
            store_name: data.store_name || '',
            store_slug: data.store_slug || ''
          },
          source: 'supabase'
        });
      }

      console.log('[StoreConfig] No config found for reseller:', resellerId);
      return res.json({ success: true, data: null, source: 'supabase' });

    } catch (supabaseError: any) {
      // Specific error codes for frontend to handle
      if (supabaseError.message === 'SUPABASE_NOT_CONFIGURED') {
        return res.status(503).json({ error: 'SUPABASE_NOT_CONFIGURED', message: 'Supabase Master não configurado' });
      }
      if (supabaseError.message === 'RESELLER_NOT_LINKED') {
        return res.status(400).json({ error: 'RESELLER_NOT_LINKED', message: 'Revendedora não vinculada a um administrador' });
      }
      if (supabaseError.message === 'ADMIN_CREDS_NOT_CONFIGURED') {
        return res.status(503).json({ error: 'ADMIN_CREDS_NOT_CONFIGURED', message: 'Credenciais do admin não configuradas' });
      }
      
      console.error('[StoreConfig] Supabase error:', supabaseError.message);
      return res.status(500).json({ error: 'SUPABASE_ERROR', message: supabaseError.message });
    }

  } catch (error: any) {
    console.error('[StoreConfig] Error loading:', error);
    res.status(500).json({ error: 'Erro ao carregar configuração: ' + error.message });
  }
});

// POST /api/reseller/store-config - Save store configuration to Supabase
router.post('/store-config', async (req: Request, res: Response) => {
  try {
    const auth = await getAuthenticatedReseller(req);
    if (!auth) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const resellerId = auth.userId;
    const { product_ids, is_published, store_name, store_slug } = req.body;

    console.log('[StoreConfig] Saving config for reseller:', resellerId);
    console.log('[StoreConfig] Data:', { 
      productCount: product_ids?.length || 0, 
      isPublished: is_published,
      storeName: store_name
    });

    try {
      const { client: supabase } = await getStoreSupabaseClient(auth.email);
      
      const storeData = {
        reseller_id: resellerId,
        product_ids: product_ids || [],
        is_published: is_published || false,
        store_name: store_name || '',
        store_slug: store_slug || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('reseller_stores')
        .upsert(storeData, { 
          onConflict: 'reseller_id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('[StoreConfig] Supabase upsert error:', error);
        
        // Table might not exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return res.status(503).json({ 
            error: 'TABLE_NOT_FOUND',
            message: 'A tabela reseller_stores não existe no Supabase. Execute o SQL de criação.'
          });
        }
        throw error;
      }

      console.log('[StoreConfig] Saved to Supabase successfully');

      return res.json({
        success: true,
        data: data?.[0] || storeData,
        source: 'supabase'
      });

    } catch (supabaseError: any) {
      // Specific error codes for frontend to handle
      if (supabaseError.message === 'SUPABASE_NOT_CONFIGURED') {
        return res.status(503).json({ error: 'SUPABASE_NOT_CONFIGURED', message: 'Supabase Master não configurado' });
      }
      if (supabaseError.message === 'RESELLER_NOT_LINKED') {
        return res.status(400).json({ error: 'RESELLER_NOT_LINKED', message: 'Revendedora não vinculada a um administrador' });
      }
      if (supabaseError.message === 'ADMIN_CREDS_NOT_CONFIGURED') {
        return res.status(503).json({ error: 'ADMIN_CREDS_NOT_CONFIGURED', message: 'Credenciais do admin não configuradas' });
      }
      
      console.error('[StoreConfig] Supabase save error:', supabaseError.message);
      return res.status(500).json({ error: 'SUPABASE_ERROR', message: supabaseError.message });
    }

  } catch (error: any) {
    console.error('[StoreConfig] Error saving:', error);
    res.status(500).json({ error: 'Erro ao salvar configuração: ' + error.message });
  }
});

// ==================== PAGAR.ME RECIPIENT (Recebedor) ====================

// Get reseller's Pagar.me recipient status
router.get('/reseller/pagarme-recipient', resellerAuthMiddleware, async (req, res) => {
  try {
    const auth = await getAuthenticatedReseller(req);
    if (!auth) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const recipientId = await getResellerRecipientId(auth.userId);
    
    if (!recipientId) {
      return res.json({ 
        hasRecipient: false,
        message: 'Recebedor não cadastrado. Configure seus dados bancários para receber pagamentos.'
      });
    }

    // Fetch recipient details from Pagar.me
    try {
      const recipient = await pagarmeService.getRecipient(recipientId);
      return res.json({
        hasRecipient: true,
        recipientId: recipient.id,
        status: recipient.status,
        email: recipient.email,
        createdAt: recipient.created_at,
        bankAccount: recipient.default_bank_account ? {
          bank: recipient.default_bank_account.bank,
          type: recipient.default_bank_account.type,
          lastDigits: recipient.default_bank_account.account_number?.slice(-4) || '****',
        } : null
      });
    } catch (pagarmeError: any) {
      console.error('[ResellerRecipient] Error fetching from Pagar.me:', pagarmeError.message);
      return res.json({
        hasRecipient: true,
        recipientId,
        status: 'unknown',
        error: 'Não foi possível obter detalhes do recebedor'
      });
    }

  } catch (error: any) {
    console.error('[ResellerRecipient] Error:', error);
    res.status(500).json({ error: 'Erro ao buscar recebedor: ' + error.message });
  }
});

// Create or update reseller's Pagar.me recipient
router.post('/reseller/pagarme-recipient', resellerAuthMiddleware, async (req, res) => {
  try {
    const auth = await getAuthenticatedReseller(req);
    if (!auth) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // Check if already has recipient
    const existingRecipientId = await getResellerRecipientId(auth.userId);
    if (existingRecipientId) {
      console.log('[ResellerRecipient] Recipient already exists:', existingRecipientId);
      return res.status(400).json({ 
        error: 'Recebedor já cadastrado',
        recipientId: existingRecipientId,
        message: 'Você já possui um recebedor cadastrado. Para alterar dados bancários, use a opção de atualização.'
      });
    }

    // Validate request body
    const { 
      name, 
      email, 
      document, 
      motherName,
      birthdate,
      monthlyIncome,
      professionalOccupation,
      phone, 
      address, 
      bankAccount 
    } = req.body;

    if (!name || !email || !document || !motherName || !birthdate) {
      return res.status(400).json({ error: 'Dados pessoais obrigatórios: nome, email, CPF, nome da mãe e data de nascimento' });
    }
    if (!phone?.ddd || !phone?.number) {
      return res.status(400).json({ error: 'Telefone obrigatório (DDD e número)' });
    }
    if (!address?.street || !address?.number || !address?.neighborhood || !address?.city || !address?.state || !address?.zip_code) {
      return res.status(400).json({ error: 'Endereço completo obrigatório' });
    }
    if (!bankAccount?.holder_name || !bankAccount?.holder_document || !bankAccount?.bank || !bankAccount?.branch_number || !bankAccount?.account_number || !bankAccount?.account_check_digit || !bankAccount?.type) {
      return res.status(400).json({ error: 'Dados bancários completos obrigatórios' });
    }

    console.log('[ResellerRecipient] Creating recipient for reseller:', auth.userId);

    // Create recipient in Pagar.me
    const recipient = await pagarmeService.createIndividualRecipient({
      code: `reseller_${auth.userId}`,
      name,
      email,
      document,
      mother_name: motherName,
      birthdate,
      monthly_income: monthlyIncome || 3000,
      professional_occupation: professionalOccupation || 'Revendedor(a)',
      phone: {
        ddd: phone.ddd,
        number: phone.number,
      },
      address: {
        street: address.street,
        number: address.number,
        complementary: address.complement || 'N/A',
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        zip_code: address.zip_code,
      },
      bank_account: {
        holder_name: bankAccount.holder_name,
        holder_document: bankAccount.holder_document,
        bank: bankAccount.bank,
        branch_number: bankAccount.branch_number,
        branch_check_digit: bankAccount.branch_check_digit || '',
        account_number: bankAccount.account_number,
        account_check_digit: bankAccount.account_check_digit,
        type: bankAccount.type,
      },
      transfer_settings: {
        transfer_enabled: true,
        transfer_interval: 'weekly',
        transfer_day: 5, // Friday
      },
    });

    console.log('[ResellerRecipient] Recipient created:', recipient.id);

    // Save recipient ID to database
    const saved = await saveResellerRecipientId(auth.userId, recipient.id);
    if (!saved) {
      console.error('[ResellerRecipient] Failed to save recipient ID to database');
    }

    res.json({
      success: true,
      recipientId: recipient.id,
      status: recipient.status,
      message: 'Recebedor cadastrado com sucesso! Agora você pode receber pagamentos com split automático.'
    });

  } catch (error: any) {
    console.error('[ResellerRecipient] Error creating:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar recebedor no Pagar.me' });
  }
});

// Update reseller's bank account
router.patch('/reseller/pagarme-recipient/bank', resellerAuthMiddleware, async (req, res) => {
  try {
    const auth = await getAuthenticatedReseller(req);
    if (!auth) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const recipientId = await getResellerRecipientId(auth.userId);
    if (!recipientId) {
      return res.status(400).json({ error: 'Recebedor não encontrado. Cadastre primeiro.' });
    }

    const { bankAccount } = req.body;
    if (!bankAccount) {
      return res.status(400).json({ error: 'Dados bancários obrigatórios' });
    }

    const updatedRecipient = await pagarmeService.updateRecipientBankAccount(recipientId, {
      holder_name: bankAccount.holder_name,
      holder_document: bankAccount.holder_document,
      holder_type: 'individual',
      bank: bankAccount.bank,
      branch_number: bankAccount.branch_number,
      branch_check_digit: bankAccount.branch_check_digit || '',
      account_number: bankAccount.account_number,
      account_check_digit: bankAccount.account_check_digit,
      type: bankAccount.type,
    });

    res.json({
      success: true,
      recipientId: updatedRecipient.id,
      message: 'Dados bancários atualizados com sucesso!'
    });

  } catch (error: any) {
    console.error('[ResellerRecipient] Error updating bank:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar dados bancários' });
  }
});

// ============================================================
// PRODUCT REQUESTS - Solicitações de Produtos
// ============================================================

// POST /api/reseller/product-requests - Criar solicitação de produto
router.post('/product-requests', resellerAuthMiddleware, async (req, res) => {
  try {
    const auth = await getAuthenticatedReseller(req);
    if (!auth) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const { product_id, quantity, notes } = req.body;
    
    if (!product_id) {
      return res.status(400).json({ error: 'ID do produto é obrigatório' });
    }
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Quantidade deve ser pelo menos 1' });
    }

    // Buscar dados da revendedora no Supabase Owner (incluindo CPF)
    const { data: resellerData, error: resellerError } = await supabaseOwner
      .from('revendedoras')
      .select('id, nome, email, cpf, admin_id')
      .eq('id', auth.userId)
      .single();

    if (resellerError || !resellerData) {
      console.error('[ProductRequest] Error fetching reseller:', resellerError);
      return res.status(404).json({ error: 'Revendedora não encontrada' });
    }

    // Obter credenciais do admin para acessar o Supabase Tenant
    const adminCreds = await getAdminCredentials(resellerData.admin_id);
    if (!adminCreds) {
      return res.status(400).json({ error: 'Credenciais do banco de dados não configuradas. Contate o administrador.' });
    }

    const tenantClient = createTenantClient(adminCreds);
    
    console.log('[ProductRequest] Inserting product request for reseller:', auth.userId);

    // Primeiro, garantir que o reseller existe no Tenant DB (para satisfazer FK)
    // Estrutura da tabela resellers: id, nome (NOT NULL), cpf (NOT NULL), tipo (NOT NULL), nivel (NOT NULL)
    const resellerData_cpf = resellerData.cpf || '';
    const resellerInsertData = {
      id: auth.userId,
      nome: resellerData.nome || resellerData.email,
      cpf: resellerData_cpf,
      tipo: 'revendedora',
      nivel: 'bronze',
      email: resellerData.email
    };
    
    const { error: upsertError } = await tenantClient
      .from('resellers')
      .upsert(resellerInsertData, { onConflict: 'id' });
    
    if (upsertError) {
      console.log('[ProductRequest] Reseller upsert failed:', upsertError.message);
    } else {
      console.log('[ProductRequest] Reseller synced to tenant DB:', auth.userId);
    }

    // Agora inserir a solicitação de produto
    const { data: requestData, error: insertError } = await tenantClient
      .from('product_requests')
      .insert({
        reseller_id: auth.userId,
        product_id: product_id,
        quantity: quantity,
        notes: notes || null,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('[ProductRequest] Insert error:', insertError);
      
      // Se o erro for de foreign key, a tabela resellers pode não existir ou ter estrutura diferente
      if (insertError.code === '23503') {
        console.log('[ProductRequest] FK constraint error - attempting direct insert with minimal reseller data');
        
        // Tentar insert direto com todos os campos obrigatórios
        const { error: directInsertError } = await tenantClient
          .from('resellers')
          .insert(resellerInsertData);
        
        if (directInsertError) {
          console.log('[ProductRequest] Direct reseller insert failed:', directInsertError.message);
          // Se a tabela não existir (42P01), informar erro específico
          if (directInsertError.code === '42P01') {
            throw new Error('A tabela de revendedores não existe no banco de dados. Crie a tabela "resellers" com coluna "id" (UUID) como chave primária.');
          }
        } else {
          console.log('[ProductRequest] Reseller inserted with minimal data');
        }
        
        // Tentar novamente
        const { data: retryData, error: retryError } = await tenantClient
          .from('product_requests')
          .insert({
            reseller_id: auth.userId,
            product_id: product_id,
            quantity: quantity,
            notes: notes || null,
            status: 'pending'
          })
          .select()
          .single();
          
        if (retryError) {
          console.error('[ProductRequest] Insert still failed:', retryError);
          throw new Error('Não foi possível criar a solicitação. Verifique se a tabela "resellers" existe com coluna "id" (UUID) no banco de dados do tenant.');
        }
        
        return res.json({
          success: true,
          data: retryData,
          message: 'Solicitação enviada com sucesso!'
        });
      }
      
      // Outro erro - propagar
      throw insertError;
    }

    // Sucesso
    console.log('[ProductRequest] Request created successfully:', requestData?.id);
    res.json({
      success: true,
      data: requestData,
      message: 'Solicitação enviada com sucesso!'
    });

  } catch (error: any) {
    console.error('[ProductRequest] Error creating request:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar solicitação' });
  }
});

// GET /api/reseller/product-requests - Listar solicitações do reseller
router.get('/product-requests', resellerAuthMiddleware, async (req, res) => {
  try {
    const auth = await getAuthenticatedReseller(req);
    if (!auth) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // Buscar admin_id da revendedora
    const { data: resellerData, error: resellerError } = await supabaseOwner
      .from('revendedoras')
      .select('admin_id')
      .eq('id', auth.userId)
      .single();

    if (resellerError || !resellerData) {
      return res.status(404).json({ error: 'Revendedora não encontrada' });
    }

    const adminCreds = await getAdminCredentials(resellerData.admin_id);
    if (!adminCreds) {
      return res.status(400).json({ error: 'Credenciais não configuradas' });
    }

    const tenantClient = createTenantClient(adminCreds);

    const { data, error } = await tenantClient
      .from('product_requests')
      .select('*, product:product_id(id, description, reference, image)')
      .eq('reseller_id', auth.userId)
      .order('created_at', { ascending: false });

    if (error) {
      // Se tabela não existe, retornar array vazio
      if (error.code === '42P01') {
        return res.json({ success: true, data: [] });
      }
      throw error;
    }

    res.json({ success: true, data: data || [] });

  } catch (error: any) {
    console.error('[ProductRequest] Error fetching requests:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar solicitações' });
  }
});

// GET /api/reseller/admin/product-requests - Listar TODAS as solicitações (admin)
router.get('/admin/product-requests', resellerAuthMiddleware, async (req, res) => {
  try {
    const auth = await getAuthenticatedReseller(req);
    if (!auth) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // Buscar admin_id da revendedora para pegar o tenant correto
    const { data: resellerData, error: resellerError } = await supabaseOwner
      .from('revendedoras')
      .select('admin_id')
      .eq('id', auth.userId)
      .single();

    if (resellerError || !resellerData) {
      return res.status(404).json({ error: 'Dados não encontrados' });
    }

    const adminCreds = await getAdminCredentials(resellerData.admin_id);
    if (!adminCreds) {
      return res.status(400).json({ error: 'Credenciais não configuradas' });
    }

    const tenantClient = createTenantClient(adminCreds);
    console.log('[ProductRequest Admin] Fetching product_requests from tenant...');

    // Admin vê TODAS as solicitações (sem filtro de reseller_id)
    const { data, error } = await tenantClient
      .from('product_requests')
      .select('*, product:product_id(id, description, reference, image)')
      .order('created_at', { ascending: false });

    console.log('[ProductRequest Admin] Query result:', { 
      count: data?.length || 0, 
      error: error?.message || null,
      errorCode: error?.code || null
    });

    if (error) {
      console.error('[ProductRequest Admin] Query error:', error);
      if (error.code === '42P01') {
        return res.json({ success: true, data: [] });
      }
      throw error;
    }

    // Buscar informações das revendedoras do Owner (colunas que existem: id, nome, email, cpf, admin_id)
    const resellerIds = [...new Set((data || []).map(r => r.reseller_id))];
    let resellersMap: Record<string, any> = {};
    
    console.log('[ProductRequest Admin] Looking up resellers:', resellerIds);
    
    if (resellerIds.length > 0) {
      const { data: resellers, error: resellersError } = await supabaseOwner
        .from('revendedoras')
        .select('id, nome, email')
        .in('id', resellerIds);
      
      if (resellersError) {
        console.error('[ProductRequest Admin] Error fetching resellers:', resellersError);
      } else {
        console.log('[ProductRequest Admin] Found resellers:', resellers);
      }
      
      resellersMap = (resellers || []).reduce((acc, r) => {
        acc[r.id] = r;
        return acc;
      }, {} as Record<string, any>);
    }

    // Combinar dados
    const enrichedData = (data || []).map(request => ({
      ...request,
      reseller: resellersMap[request.reseller_id] || null
    }));

    res.json({ success: true, data: enrichedData });

  } catch (error: any) {
    console.error('[ProductRequest] Error fetching admin requests:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar solicitações' });
  }
});

// PATCH /api/reseller/admin/product-requests/:id - Atualizar status (admin)
router.patch('/admin/product-requests/:id', resellerAuthMiddleware, async (req, res) => {
  try {
    const auth = await getAuthenticatedReseller(req);
    if (!auth) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    const { data: resellerData } = await supabaseOwner
      .from('revendedoras')
      .select('admin_id')
      .eq('id', auth.userId)
      .single();

    if (!resellerData) {
      return res.status(404).json({ error: 'Dados não encontrados' });
    }

    const adminCreds = await getAdminCredentials(resellerData.admin_id);
    if (!adminCreds) {
      return res.status(400).json({ error: 'Credenciais não configuradas' });
    }

    const tenantClient = createTenantClient(adminCreds);

    const { data, error } = await tenantClient
      .from('product_requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });

  } catch (error: any) {
    console.error('[ProductRequest] Error updating status:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar status' });
  }
});

export default router;
