import { Router, Request, Response } from 'express';
import { z } from 'zod';
import fetch from 'node-fetch';
import { pagarmeService } from '../services/pagarme';
import {
  getCompanyRecipientId,
  getResellerRecipientId,
  saveCompanyRecipientId,
  saveResellerRecipientId,
  calculateSplitWithFees,
  generatePagarmeSplitRules,
  DEVELOPER_RECIPIENT_ID,
  PAGARME_FEE_PERCENTAGE,
  DEVELOPER_FEE_PERCENTAGE,
  TOTAL_PLATFORM_FEE_PERCENTAGE,
} from '../services/commission';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseCredentials } from '../lib/credentialsDb';

const router = Router();

async function getTenantSupabaseClient(tenantId?: string): Promise<{ client: SupabaseClient | null; url: string | null; source: string }> {
  if (tenantId) {
    try {
      const credentials = await getSupabaseCredentials(tenantId);
      if (credentials?.url && credentials?.anonKey) {
        console.log(`[Split] Using DB credentials for tenant: ${tenantId}`);
        const client = createClient(credentials.url, credentials.anonKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });
        return { client, url: credentials.url, source: 'database' };
      }
    } catch (error) {
      console.warn('[Split] Error getting DB credentials:', error);
    }
  }
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    const configPath = path.join(process.cwd(), 'data', 'supabase-config.json');
    
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const supabaseUrl = config.supabaseUrl || config.url;
      const supabaseKey = config.supabaseServiceKey || config.serviceKey || config.supabaseAnonKey;
      
      if (supabaseUrl && supabaseKey) {
        console.log('[Split] Using file credentials (fallback)');
        const client = createClient(supabaseUrl, supabaseKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });
        return { client, url: supabaseUrl, source: 'file' };
      }
    }
  } catch (error) {
    console.warn('[Split] Error reading config file:', error);
  }
  
  return { client: null, url: null, source: 'none' };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const setupCompanySchema = z.object({
  company_name: z.string().min(1).max(200).optional(),
  trading_name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  document: z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos numéricos').optional(),
});

const setupResellerBodySchema = z.object({
  mother_name: z.string().max(200).optional(),
  birthdate: z.string().optional(),
  street: z.string().max(200).optional(),
  number: z.string().max(20).optional(),
  complement: z.string().max(100).optional(),
  neighborhood: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().length(2).optional(),
  zip_code: z.string().optional(),
  bank_account: z.object({
    holder_name: z.string(),
    holder_document: z.string(),
    bank: z.string(),
    branch_number: z.string(),
    branch_check_digit: z.string().optional(),
    account_number: z.string(),
    account_check_digit: z.string(),
    type: z.enum(['checking', 'savings']),
  }).optional(),
}).optional();

const testOrderSchema = z.object({
  reseller_id: z.string().regex(UUID_REGEX, 'reseller_id deve ser um UUID válido').optional(),
  reseller_percentage: z.number().min(0).max(100).optional().default(70),
});

function maskDocument(doc: string | null | undefined): string {
  if (!doc) return '***';
  const clean = doc.replace(/\D/g, '');
  if (clean.length <= 4) return '***';
  return '***' + clean.slice(-4);
}

function requireAdmin(req: Request, res: Response): boolean {
  // Allow in development mode for testing
  const isDev = process.env.NODE_ENV !== 'production' || process.env.REPL_SLUG;
  if (isDev) {
    console.log('[Split] Dev mode - skipping admin check');
    return true;
  }
  
  const session = (req as any).session;
  const userRole = session?.userRole;
  
  if (userRole !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Acesso negado. Apenas administradores podem acessar este recurso.',
    });
    return false;
  }
  return true;
}

function getMasterSupabaseClient() {
  const url = process.env.SUPABASE_OWNER_URL || process.env.SUPABASE_MASTER_URL;
  const key = process.env.SUPABASE_OWNER_SERVICE_KEY || process.env.SUPABASE_MASTER_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.warn('[Split] Master/Owner Supabase not configured');
    return null;
  }
  
  return createClient(url, key);
}

const TEST_ADDRESS = {
  street: 'Av Brigadeiro Faria Lima',
  number: '1811',
  complement: 'Sala 1',
  neighborhood: 'Jardim Paulistano',
  city: 'São Paulo',
  state: 'SP',
  zip_code: '01452001',
  country: 'BR',
};

const TEST_BANK_ACCOUNT = {
  holder_name: 'EMPRESA TESTE LTDA',
  holder_document: '11444777000161',
  bank: '341',
  branch_number: '0001',
  account_number: '123456',
  account_check_digit: '7',
  type: 'checking' as const,
};

const TEST_PARTNER = {
  name: 'Fulano de Tal',
  email: 'fulano@teste.com',
  document: '11111111111',
  type: 'individual' as const,
  mother_name: 'Maria de Tal',
  birthdate: '1990-01-01',
  monthly_income: 5000,
  professional_occupation: 'Empresário',
  address: TEST_ADDRESS,
  phone_numbers: [{ ddd: '11', number: '999999999', type: 'mobile' as const }],
};

router.get('/status', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  
  console.log('[Split] GET /status - Checking configuration status');
  
  try {
    const pagarmeConfigured = pagarmeService.isConfigured();
    const companyRecipientId = await getCompanyRecipientId();
    
    const supabase = getMasterSupabaseClient();
    let resellersWithRecipient = 0;
    let resellersTotal = 0;
    let resellersList: any[] = [];
    
    if (supabase) {
      const { data: resellers, error } = await supabase
        .from('revendedoras')
        .select('id, nome, pagarme_recipient_id');
      
      if (!error && resellers) {
        resellersTotal = resellers.length;
        resellersWithRecipient = resellers.filter((r: any) => r.pagarme_recipient_id).length;
        resellersList = resellers.map((r: any) => ({
          id: r.id,
          nome: r.nome,
          hasRecipient: !!r.pagarme_recipient_id,
          recipientId: r.pagarme_recipient_id ? r.pagarme_recipient_id.substring(0, 20) + '...' : null,
        }));
      }
    }
    
    const accountId = pagarmeService.getAccountId();
    const isProduction = pagarmeService.isProductionMode();
    
    const status = {
      success: true,
      pagarme: {
        configured: pagarmeConfigured,
        productionMode: isProduction,
        testMode: !isProduction && !!(process.env.CHAVE_SECRETA_TESTE),
        accountId: accountId ? accountId.substring(0, 12) + '...' : null,
        hasAccountId: !!accountId,
      },
      company: {
        recipientId: companyRecipientId,
        configured: !!companyRecipientId,
      },
      resellers: {
        total: resellersTotal,
        withRecipient: resellersWithRecipient,
        pending: resellersTotal - resellersWithRecipient,
        list: resellersList,
      },
      readyForSplit: pagarmeConfigured && !!companyRecipientId,
    };
    
    console.log('[Split] Status check completed');
    res.json(status);
  } catch (error: any) {
    console.error('[Split] Error checking status');
    res.status(500).json({ success: false, error: 'Erro interno ao verificar status' });
  }
});

router.post('/save-company-recipient', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  
  console.log('[Split] POST /save-company-recipient - Saving recipient ID manually');
  
  try {
    const { recipient_id } = req.body;
    
    if (!recipient_id || typeof recipient_id !== 'string' || recipient_id.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'recipient_id inválido. Deve ser uma string válida (ex: rp_xxxxxxxx).',
      });
    }
    
    const saved = await saveCompanyRecipientId(recipient_id.trim());
    
    if (saved) {
      console.log('[Split] Company recipient saved manually');
      return res.json({
        success: true,
        recipientId: recipient_id.trim(),
        message: 'Recipient da empresa salvo com sucesso.',
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar recipient_id no banco.',
      });
    }
  } catch (error: any) {
    console.error('[Split] Error saving company recipient');
    res.status(500).json({ success: false, error: 'Erro interno ao salvar recipient' });
  }
});

router.post('/save-reseller-recipient', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  
  console.log('[Split] POST /save-reseller-recipient - Saving reseller recipient ID manually');
  
  try {
    const { reseller_id, recipient_id } = req.body;
    
    if (!reseller_id || !UUID_REGEX.test(reseller_id)) {
      return res.status(400).json({
        success: false,
        error: 'reseller_id inválido. Deve ser um UUID.',
      });
    }
    
    if (!recipient_id || typeof recipient_id !== 'string' || recipient_id.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'recipient_id inválido. Deve ser uma string válida (ex: rp_xxxxxxxx).',
      });
    }
    
    const saved = await saveResellerRecipientId(reseller_id, recipient_id.trim());
    
    if (saved) {
      console.log('[Split] Reseller recipient saved manually');
      return res.json({
        success: true,
        resellerId: reseller_id,
        recipientId: recipient_id.trim(),
        message: 'Recipient da revendedora salvo com sucesso.',
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar recipient_id no banco.',
      });
    }
  } catch (error: any) {
    console.error('[Split] Error saving reseller recipient');
    res.status(500).json({ success: false, error: 'Erro interno ao salvar recipient' });
  }
});

router.post('/setup-company', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  
  console.log('[Split] POST /setup-company - Creating company recipient');
  
  try {
    const validationResult = setupCompanySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: validationResult.error.errors,
      });
    }
    
    if (!pagarmeService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Pagar.me não configurado. Configure CHAVE_SECRETA_TESTE e CHAVE_PUBLICA_TESTE.',
      });
    }
    
    const existingRecipient = await getCompanyRecipientId();
    if (existingRecipient) {
      console.log('[Split] Company recipient already exists');
      return res.json({
        success: true,
        alreadyExists: true,
        recipientId: existingRecipient,
        message: 'Recipient da empresa já está configurado.',
      });
    }
    
    const {
      company_name = 'EMPRESA TESTE LTDA',
      trading_name = 'Empresa Teste',
      email = 'empresa@teste.com',
      document = '11444777000161',
    } = validationResult.data;
    
    const cleanDocument = document.replace(/\D/g, '');
    
    console.log('[Split] Creating corporate recipient with document ending in:', maskDocument(cleanDocument));
    
    const recipientParams = {
      code: `company_${Date.now()}`,
      company_name,
      trading_name,
      email,
      document: cleanDocument,
      site_url: 'https://nexus.com.br',
      annual_revenue: 1000000,
      corporation_type: 'MEI',
      founding_date: '2020-01-01',
      main_address: TEST_ADDRESS,
      managing_partners: [TEST_PARTNER],
      bank_account: {
        ...TEST_BANK_ACCOUNT,
        holder_name: company_name,
        holder_document: cleanDocument,
      },
      transfer_settings: {
        transfer_enabled: true,
        transfer_interval: 'daily' as const,
        transfer_day: 0,
      },
    };
    
    console.log('[Split] Calling Pagar.me createCorporateRecipient...');
    const recipient = await pagarmeService.createCorporateRecipient(recipientParams);
    
    console.log('[Split] Recipient created successfully');
    
    const saved = await saveCompanyRecipientId(recipient.id);
    console.log('[Split] Saved to database:', saved);
    
    res.json({
      success: true,
      recipientId: recipient.id,
      recipientCode: recipient.code,
      status: recipient.status,
      savedToDatabase: saved,
    });
  } catch (error: any) {
    console.error('[Split] Error creating company recipient');
    res.status(500).json({ success: false, error: 'Erro interno ao criar recipient' });
  }
});

router.post('/setup-reseller/:resellerId', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  
  const { resellerId } = req.params;
  
  if (!UUID_REGEX.test(resellerId)) {
    return res.status(400).json({
      success: false,
      error: 'resellerId deve ser um UUID válido',
    });
  }
  
  console.log('[Split] POST /setup-reseller - Creating reseller recipient');
  
  try {
    const validationResult = setupResellerBodySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: validationResult.error.errors,
      });
    }
    
    if (!pagarmeService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Pagar.me não configurado. Configure CHAVE_SECRETA_TESTE e CHAVE_PUBLICA_TESTE.',
      });
    }
    
    const existingRecipient = await getResellerRecipientId(resellerId);
    if (existingRecipient) {
      console.log('[Split] Reseller already has recipient');
      return res.json({
        success: true,
        alreadyExists: true,
        recipientId: existingRecipient,
        message: 'Recipient da revendedora já está configurado.',
      });
    }
    
    const supabase = getMasterSupabaseClient();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Master Supabase não configurado. Configure SUPABASE_OWNER_URL e SUPABASE_OWNER_SERVICE_KEY.',
      });
    }
    
    const { data: reseller, error: resellerError } = await supabase
      .from('revendedoras')
      .select('*')
      .eq('id', resellerId)
      .single();
    
    if (resellerError || !reseller) {
      console.error('[Split] Reseller not found');
      return res.status(404).json({
        success: false,
        error: 'Revendedora não encontrada',
      });
    }
    
    console.log('[Split] Reseller found, creating recipient');
    
    const telefone = reseller.telefone || reseller.phone || '11999999999';
    const telefoneClean = telefone.replace(/\D/g, '');
    
    const bodyData = validationResult.data || {};
    
    const recipientParams = {
      code: `reseller_${reseller.id.substring(0, 8)}_${Date.now()}`,
      name: reseller.nome || 'Revendedor(a)',
      email: reseller.email || 'revendedor@teste.com',
      document: (reseller.cpf || '11111111111').replace(/\D/g, ''),
      description: `Revendedor(a)`,
      mother_name: reseller.nome_mae || bodyData.mother_name || 'Não informado',
      birthdate: reseller.data_nascimento || bodyData.birthdate || '1990-01-01',
      monthly_income: 3000,
      professional_occupation: 'Revendedor(a)',
      phone: {
        ddd: telefoneClean.substring(0, 2) || '11',
        number: telefoneClean.substring(2) || '999999999',
      },
      address: {
        street: reseller.endereco?.rua || reseller.rua || bodyData.street || TEST_ADDRESS.street,
        number: reseller.endereco?.numero || reseller.numero || bodyData.number || TEST_ADDRESS.number,
        complementary: reseller.endereco?.complemento || reseller.complemento || bodyData.complement || 'N/A',
        neighborhood: reseller.endereco?.bairro || reseller.bairro || bodyData.neighborhood || TEST_ADDRESS.neighborhood,
        city: reseller.endereco?.cidade || reseller.cidade || bodyData.city || TEST_ADDRESS.city,
        state: reseller.endereco?.estado || reseller.estado || bodyData.state || TEST_ADDRESS.state,
        zip_code: (reseller.endereco?.cep || reseller.cep || bodyData.zip_code || TEST_ADDRESS.zip_code).replace(/\D/g, ''),
      },
      bank_account: bodyData.bank_account || {
        holder_name: reseller.nome || 'Revendedor(a)',
        holder_document: (reseller.cpf || '11111111111').replace(/\D/g, ''),
        bank: '341',
        branch_number: '0001',
        branch_check_digit: '',
        account_number: '123456',
        account_check_digit: '7',
        type: 'checking' as const,
      },
      transfer_settings: {
        transfer_enabled: true,
        transfer_interval: 'weekly' as const,
        transfer_day: 5,
      },
    };
    
    console.log('[Split] Creating individual recipient with document ending in:', maskDocument(recipientParams.document));
    
    const recipient = await pagarmeService.createIndividualRecipient(recipientParams);
    
    console.log('[Split] Recipient created successfully');
    
    const saved = await saveResellerRecipientId(resellerId, recipient.id);
    console.log('[Split] Saved to database:', saved);
    
    res.json({
      success: true,
      resellerId,
      recipientId: recipient.id,
      recipientCode: recipient.code,
      status: recipient.status,
      savedToDatabase: saved,
    });
  } catch (error: any) {
    console.error('[Split] Error creating reseller recipient');
    res.status(500).json({ success: false, error: 'Erro interno ao criar recipient' });
  }
});

router.get('/recipients', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  
  console.log('[Split] GET /recipients - Listing all recipients');
  
  try {
    if (!pagarmeService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Pagar.me não configurado.',
      });
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const size = Math.min(Math.max(parseInt(req.query.size as string) || 20, 1), 100);
    
    console.log('[Split] Listing recipients');
    
    const response = await pagarmeService.listRecipients(page, size);
    
    console.log('[Split] Recipients listed successfully');
    
    res.json({
      success: true,
      recipients: response.data || [],
      paging: response.paging,
    });
  } catch (error: any) {
    console.error('[Split] Error listing recipients');
    res.status(500).json({ success: false, error: 'Erro interno ao listar recipients' });
  }
});

router.post('/test-order', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  
  console.log('[Split] POST /test-order - Creating test order with split');
  
  try {
    const validationResult = testOrderSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: validationResult.error.errors,
      });
    }
    
    const { reseller_id, reseller_percentage } = validationResult.data;
    
    if (reseller_percentage < 0 || reseller_percentage > 100) {
      return res.status(400).json({
        success: false,
        error: 'reseller_percentage deve estar entre 0 e 100',
      });
    }
    
    if (!pagarmeService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Pagar.me não configurado.',
      });
    }
    
    const companyRecipientId = await getCompanyRecipientId();
    if (!companyRecipientId) {
      return res.status(400).json({
        success: false,
        error: 'Company recipient não configurado. Execute POST /api/split/setup-company primeiro.',
      });
    }
    
    let resellerRecipientId = null;
    if (reseller_id) {
      resellerRecipientId = await getResellerRecipientId(reseller_id);
      if (!resellerRecipientId) {
        return res.status(400).json({
          success: false,
          error: 'Reseller não tem recipient configurado. Execute POST /api/split/setup-reseller primeiro.',
        });
      }
    }
    
    const testAmount = 100;
    const companyPercentage = 100 - reseller_percentage;
    
    const splitRules = [];
    
    if (resellerRecipientId) {
      splitRules.push({
        amount: reseller_percentage,
        recipient_id: resellerRecipientId,
        type: 'percentage' as const,
        options: {
          charge_processing_fee: false,
          charge_remainder_fee: false,
          liable: false,
        },
      });
      splitRules.push({
        amount: companyPercentage,
        recipient_id: companyRecipientId,
        type: 'percentage' as const,
        options: {
          charge_processing_fee: true,
          charge_remainder_fee: true,
          liable: true,
        },
      });
    } else {
      splitRules.push({
        amount: 100,
        recipient_id: companyRecipientId,
        type: 'percentage' as const,
        options: {
          charge_processing_fee: true,
          charge_remainder_fee: true,
          liable: true,
        },
      });
    }
    
    console.log('[Split] Creating test PIX order with split');
    
    const order = await pagarmeService.createPixOrder({
      customer: {
        name: 'Cliente Teste Split',
        email: 'teste.split@example.com',
        document: '11111111111',
        document_type: 'CPF',
        type: 'individual',
        phones: {
          mobile_phone: {
            country_code: '55',
            area_code: '11',
            number: '999999999',
          },
        },
      },
      items: [
        {
          amount: testAmount,
          description: 'Produto de teste - Validação Split',
          quantity: 1,
          code: 'TEST_SPLIT',
        },
      ],
      expiresIn: 3600,
      split: splitRules,
    });
    
    console.log('[Split] Test order created successfully');
    
    const pixData = order.charges?.[0]?.last_transaction;
    
    res.json({
      success: true,
      orderId: order.id,
      orderCode: order.code,
      status: order.status,
      amount: order.amount,
      splitRules: splitRules.map(r => ({
        recipientId: r.recipient_id.substring(0, 20) + '...',
        percentage: r.amount,
        type: r.type,
      })),
      pix: pixData ? {
        qrCode: pixData.qr_code,
        qrCodeUrl: pixData.qr_code_url,
        expiresAt: pixData.expires_at,
      } : null,
    });
  } catch (error: any) {
    console.error('[Split] Error creating test order');
    res.status(500).json({ success: false, error: 'Erro interno ao criar pedido de teste' });
  }
});

router.post('/test-pix-no-split', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  
  console.log('[Split] POST /test-pix-no-split - Creating test PIX order WITHOUT split');
  
  try {
    if (!pagarmeService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Pagar.me não configurado.',
      });
    }
    
    const testAmount = req.body.amount || 100;
    
    const order = await pagarmeService.createPixOrder({
      customer: {
        name: 'Cliente Teste PIX',
        email: 'teste.pix@example.com',
        document: '12345678909',
        document_type: 'CPF',
        type: 'individual',
        phones: {
          mobile_phone: {
            country_code: '55',
            area_code: '11',
            number: '999999999',
          },
        },
      },
      items: [
        {
          amount: testAmount,
          description: 'Produto de teste - PIX sem split',
          quantity: 1,
          code: 'TEST_PIX',
        },
      ],
      expiresIn: 3600,
    });
    
    console.log('[Split] Test PIX order (no split) created successfully');
    
    const pixData = order.charges?.[0]?.last_transaction;
    
    res.json({
      success: true,
      orderId: order.id,
      orderCode: order.code,
      status: order.status,
      amount: order.amount,
      hasSplit: false,
      pix: pixData ? {
        qrCode: pixData.qr_code,
        qrCodeUrl: pixData.qr_code_url,
        expiresAt: pixData.expires_at,
      } : null,
      rawResponse: order,
    });
  } catch (error: any) {
    console.error('[Split] Error creating test PIX order (no split):', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao criar pedido de teste',
      details: error.message,
    });
  }
});

router.post('/test-card-split', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  
  console.log('[Split] POST /test-card-split - Creating test CARD order WITH split');
  
  try {
    if (!pagarmeService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Pagar.me não configurado.',
      });
    }
    
    const companyRecipientId = await getCompanyRecipientId();
    if (!companyRecipientId) {
      return res.status(400).json({
        success: false,
        error: 'Company recipient não configurado.',
      });
    }
    
    const testAmount = req.body.amount || 1000;
    
    const splitRules = [
      {
        amount: 100,
        recipient_id: companyRecipientId,
        type: 'percentage' as const,
        options: {
          charge_processing_fee: true,
          charge_remainder_fee: true,
          liable: true,
        },
      },
    ];
    
    const orderData = {
      customer: {
        name: 'Cliente Teste Card',
        email: 'teste.card@example.com',
        document: '11111111111',
        document_type: 'CPF' as const,
        type: 'individual' as const,
        phones: {
          mobile_phone: {
            country_code: '55',
            area_code: '11',
            number: '999999999',
          },
        },
      },
      items: [
        {
          amount: testAmount,
          description: 'Produto de teste - Card com split',
          quantity: 1,
          code: 'TEST_CARD_SPLIT',
        },
      ],
      payments: [
        {
          payment_method: 'credit_card',
          credit_card: {
            installments: 1,
            statement_descriptor: 'NEXUS TEST',
            card: {
              number: '4000000000000010',
              holder_name: 'TESTE SPLIT',
              holder_document: '11111111111',
              exp_month: 12,
              exp_year: 2030,
              cvv: '123',
              billing_address: {
                line_1: 'Av Paulista, 1000',
                line_2: 'Apto 1',
                zip_code: '01310100',
                city: 'São Paulo',
                state: 'SP',
                country: 'BR',
              },
            },
          },
          split: splitRules,
        },
      ],
    };
    
    console.log('[Split] Creating test Card order with split');
    console.log('[Split] Split rules:', JSON.stringify(splitRules));
    
    const response = await fetch('https://api.pagar.me/core/v5/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.CHAVE_SECRETA_PRODUCAO || process.env.CHAVE_SECRETA_TESTE}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(orderData),
    });
    
    const order = await response.json() as any;
    
    console.log('[Split] Card order response:', JSON.stringify(order, null, 2));
    
    res.json({
      success: response.ok,
      orderId: order.id,
      orderCode: order.code,
      status: order.status,
      amount: order.amount,
      hasSplit: true,
      splitRules: splitRules.map(r => ({
        recipientId: r.recipient_id.substring(0, 20) + '...',
        percentage: r.amount,
        type: r.type,
      })),
      chargeStatus: order.charges?.[0]?.status,
      gatewayResponse: order.charges?.[0]?.last_transaction?.gateway_response,
      rawResponse: order,
    });
  } catch (error: any) {
    console.error('[Split] Error creating test Card order:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao criar pedido de teste',
      details: error.message,
    });
  }
});

router.post('/test-card-no-split', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  
  console.log('[Split] POST /test-card-no-split - Creating test CARD order WITHOUT split');
  
  try {
    if (!pagarmeService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Pagar.me não configurado.',
      });
    }
    
    const testAmount = req.body.amount || 1000;
    
    const orderData = {
      customer: {
        name: 'Cliente Teste Card',
        email: 'teste.card@example.com',
        document: '11111111111',
        document_type: 'CPF',
        type: 'individual',
        phones: {
          mobile_phone: {
            country_code: '55',
            area_code: '11',
            number: '999999999',
          },
        },
      },
      items: [
        {
          amount: testAmount,
          description: 'Produto de teste - Card sem split',
          quantity: 1,
          code: 'TEST_CARD',
        },
      ],
      payments: [
        {
          payment_method: 'credit_card',
          credit_card: {
            installments: 1,
            statement_descriptor: 'NEXUS TEST',
            card: {
              number: '4000000000000010',
              holder_name: 'TESTE CARD',
              holder_document: '11111111111',
              exp_month: 12,
              exp_year: 2030,
              cvv: '123',
              billing_address: {
                line_1: 'Av Paulista, 1000',
                line_2: 'Apto 1',
                zip_code: '01310100',
                city: 'São Paulo',
                state: 'SP',
                country: 'BR',
              },
            },
          },
        },
      ],
    };
    
    console.log('[Split] Creating test Card order without split');
    
    const response = await fetch('https://api.pagar.me/core/v5/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.CHAVE_SECRETA_PRODUCAO || process.env.CHAVE_SECRETA_TESTE}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(orderData),
    });
    
    const order = await response.json() as any;
    
    console.log('[Split] Card order (no split) response:', JSON.stringify(order, null, 2));
    
    res.json({
      success: response.ok,
      orderId: order.id,
      orderCode: order.code,
      status: order.status,
      amount: order.amount,
      hasSplit: false,
      chargeStatus: order.charges?.[0]?.status,
      gatewayResponse: order.charges?.[0]?.last_transaction?.gateway_response,
      rawResponse: order,
    });
  } catch (error: any) {
    console.error('[Split] Error creating test Card order (no split):', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao criar pedido de teste',
      details: error.message,
    });
  }
});

// ============================================================
// ENDPOINT: Calcular Split com Comissões (apenas simulação)
// ============================================================
router.post('/calculate-commission', async (req: Request, res: Response) => {
  console.log('[Split] POST /calculate-commission - Calculating split with fees');
  
  const { 
    amount = 10000, 
    companyPercentage = 50, 
    resellerPercentage = 50 
  } = req.body;
  
  const calculation = calculateSplitWithFees(
    amount,
    companyPercentage,
    resellerPercentage,
    'Simulação'
  );
  
  res.json({
    success: true,
    message: 'Cálculo de comissões (simulação)',
    input: {
      valorTotal: `R$ ${(amount / 100).toFixed(2)}`,
      empresaPercentual: `${companyPercentage}%`,
      revendedoraPercentual: `${resellerPercentage}%`,
    },
    taxas: {
      taxaTotal: `${TOTAL_PLATFORM_FEE_PERCENTAGE}%`,
      taxaPagarme: `${PAGARME_FEE_PERCENTAGE}%`,
      taxaDesenvolvedor: `${DEVELOPER_FEE_PERCENTAGE}%`,
      valorTaxaTotal: `R$ ${(calculation.platformFeeAmount / 100).toFixed(2)}`,
      valorPagarme: `R$ ${(calculation.pagarmeAmount / 100).toFixed(2)}`,
      valorDesenvolvedor: `R$ ${(calculation.developerAmount / 100).toFixed(2)}`,
    },
    divisao: {
      valorDistribuivel: `R$ ${(calculation.distributableAmount / 100).toFixed(2)}`,
      valorEmpresa: `R$ ${(calculation.companyAmount / 100).toFixed(2)}`,
      valorRevendedora: `R$ ${(calculation.resellerAmount / 100).toFixed(2)}`,
    },
    resumo: {
      valorOriginal: `R$ ${(calculation.originalAmount / 100).toFixed(2)}`,
      desenvolvedor: `R$ ${(calculation.developerAmount / 100).toFixed(2)} (${DEVELOPER_FEE_PERCENTAGE}%)`,
      empresa: `R$ ${(calculation.companyAmount / 100).toFixed(2)} (${companyPercentage}% de ${100 - TOTAL_PLATFORM_FEE_PERCENTAGE}%)`,
      revendedora: `R$ ${(calculation.resellerAmount / 100).toFixed(2)} (${resellerPercentage}% de ${100 - TOTAL_PLATFORM_FEE_PERCENTAGE}%)`,
    },
    rawCalculation: calculation,
  });
});

// ============================================================
// ENDPOINT: Testar Split Completo com Comissões (CARTÃO)
// ============================================================
router.post('/test-full-split', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  
  console.log('[Split] POST /test-full-split - Creating test order WITH full commission split');
  
  try {
    if (!pagarmeService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Pagar.me não configurado.',
      });
    }
    
    const { 
      amount = 10000,
      companyPercentage = 50,
      resellerPercentage = 50,
      companyRecipientId,
      resellerRecipientId,
    } = req.body;
    
    // Usar recipient do desenvolvedor como fallback para testes
    const effectiveCompanyId = companyRecipientId || DEVELOPER_RECIPIENT_ID;
    const effectiveResellerId = resellerRecipientId || DEVELOPER_RECIPIENT_ID;
    
    // Calcular split com taxas
    const calculation = calculateSplitWithFees(
      amount,
      companyPercentage,
      resellerPercentage,
      'Teste'
    );
    
    // Gerar regras de split
    const splitRules = generatePagarmeSplitRules(
      calculation,
      effectiveCompanyId,
      effectiveResellerId
    );
    
    const orderData = {
      customer: {
        name: 'Cliente Teste Split Completo',
        email: 'teste.fullsplit@example.com',
        document: '11111111111',
        document_type: 'CPF',
        type: 'individual',
        phones: {
          mobile_phone: {
            country_code: '55',
            area_code: '11',
            number: '999999999',
          },
        },
      },
      items: [
        {
          amount: amount,
          description: 'Produto de teste - Split completo com comissões',
          quantity: 1,
          code: 'TEST_FULL_SPLIT',
        },
      ],
      payments: [
        {
          payment_method: 'credit_card',
          credit_card: {
            installments: 1,
            statement_descriptor: 'NEXUS SPLIT',
            card: {
              number: '4000000000000010',
              holder_name: 'TESTE FULL SPLIT',
              holder_document: '11111111111',
              exp_month: 12,
              exp_year: 2030,
              cvv: '123',
              billing_address: {
                line_1: 'Av Paulista, 1000',
                line_2: 'Apto 1',
                zip_code: '01310100',
                city: 'São Paulo',
                state: 'SP',
                country: 'BR',
              },
            },
          },
          split: splitRules,
        },
      ],
    };
    
    console.log('[Split] Creating test order with full commission split');
    console.log('[Split] Split rules:', JSON.stringify(splitRules, null, 2));
    
    const response = await fetch('https://api.pagar.me/core/v5/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.CHAVE_SECRETA_PRODUCAO || process.env.CHAVE_SECRETA_TESTE}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(orderData),
    });
    
    const order = await response.json() as any;
    
    console.log('[Split] Full split order response:', JSON.stringify(order, null, 2));
    
    res.json({
      success: response.ok,
      message: 'Teste de split completo com comissões',
      orderId: order.id,
      orderCode: order.code,
      status: order.status,
      amount: order.amount,
      calculation: {
        valorOriginal: `R$ ${(calculation.originalAmount / 100).toFixed(2)}`,
        taxaDesenvolvedor: `R$ ${(calculation.developerAmount / 100).toFixed(2)} (${DEVELOPER_FEE_PERCENTAGE}%)`,
        valorDistribuivel: `R$ ${(calculation.distributableAmount / 100).toFixed(2)} (${100 - TOTAL_PLATFORM_FEE_PERCENTAGE}%)`,
        valorEmpresa: `R$ ${(calculation.companyAmount / 100).toFixed(2)} (${companyPercentage}%)`,
        valorRevendedora: `R$ ${(calculation.resellerAmount / 100).toFixed(2)} (${resellerPercentage}%)`,
      },
      splitRules: splitRules.map(r => ({
        recipientId: r.recipient_id.substring(0, 25) + '...',
        amount: `R$ ${(r.amount / 100).toFixed(2)}`,
        type: r.type,
        liable: r.options.liable,
      })),
      chargeStatus: order.charges?.[0]?.status,
      splitApplied: order.charges?.[0]?.last_transaction?.split,
      rawResponse: order,
    });
  } catch (error: any) {
    console.error('[Split] Error creating full split order:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao criar pedido de teste',
      details: error.message,
    });
  }
});

router.get('/recipient/:recipientId', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  
  const { recipientId } = req.params;
  console.log('[Split] GET /recipient - Getting recipient details');
  
  try {
    if (!pagarmeService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Pagar.me não configurado.',
      });
    }
    
    const recipient = await pagarmeService.getRecipient(recipientId);
    
    res.json({
      success: true,
      recipient,
    });
  } catch (error: any) {
    console.error('[Split] Error getting recipient');
    res.status(500).json({ success: false, error: 'Erro interno ao buscar recipient' });
  }
});

router.get('/resellers-analytics', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  
  console.log('[Split] GET /resellers-analytics - Fetching reseller data from tenant Supabase');
  
  try {
    const tenantId = (req as any).user?.tenantId || 'dev-teste_empresa_com';
    const { client: tenantSupabase, url: supabaseUrl, source } = await getTenantSupabaseClient(tenantId);
    
    if (!tenantSupabase) {
      console.log('[Split] No Supabase credentials found');
      return res.json({
        success: true,
        resellers: [],
        sales: [],
        warning: 'Supabase não configurado. Configure em /configuracoes para visualizar dados.'
      });
    }
    
    console.log(`[Split] Using tenant Supabase (${source}):`, supabaseUrl);
    
    let resellersResult: { data: any[] | null; error: any } = { data: [], error: null };
    let salesResult: { data: any[] | null; error: any } = { data: [], error: null };
    
    resellersResult = await tenantSupabase
      .from('resellers')
      .select('*');
    
    if (resellersResult.error) {
      if (resellersResult.error.code === '42P01') {
        console.log('[Split] resellers table does not exist in tenant Supabase');
      } else {
        console.log('[Split] Error fetching resellers from tenant:', resellersResult.error);
      }
      resellersResult = { data: [], error: null };
    } else {
      console.log('[Split] Found', resellersResult.data?.length || 0, 'resellers in tenant Supabase');
    }
    
    salesResult = await tenantSupabase
      .from('sales_with_split')
      .select('id, reseller_id, product_id, total_amount, reseller_amount, company_amount, paid, paid_at, status, created_at');
    
    if (salesResult.error) {
      if (salesResult.error.code === '42P01') {
        console.log('[Split] sales_with_split table does not exist in tenant Supabase');
      } else {
        console.log('[Split] Error fetching sales_with_split from tenant:', salesResult.error);
      }
      salesResult = { data: [], error: null };
    } else {
      console.log('[Split] Found', salesResult.data?.length || 0, 'sales in tenant Supabase');
    }
    
    const normalizedResellers = (resellersResult.data || []).map((r: any) => ({
      id: r.id,
      nome: r.nome || r.full_name || r.name || null,
      full_name: r.full_name || r.nome || r.name || null,
      email: r.email || null,
      telefone: r.telefone || r.phone || null,
      phone: r.phone || r.telefone || null,
      nivel: r.nivel ?? r.level ?? 1,
      level: r.level ?? r.nivel ?? 1,
      is_active: r.is_active ?? true,
      created_at: r.created_at || null,
    }));
    
    const normalizedSales = (salesResult.data || [])
      .map((sale: any) => {
        const resellerId = sale.reseller_id || sale.revendedora_id;
        if (!resellerId) return null;
        
        return {
          id: sale.id,
          reseller_id: resellerId,
          total_amount: sale.total_amount || sale.valor_total || 0,
          reseller_amount: sale.reseller_amount || sale.valor_revendedora || 0,
          company_amount: sale.company_amount || sale.valor_empresa || 0,
          paid: sale.paid ?? sale.pago ?? false,
          paid_at: sale.paid_at || sale.data_pagamento || null,
          created_at: sale.created_at || null,
        };
      })
      .filter(Boolean);
    
    console.log(`[Split] Loaded ${normalizedResellers.length} resellers and ${normalizedSales.length} sales from tenant Supabase`);
    
    res.json({
      success: true,
      resellers: normalizedResellers,
      sales: normalizedSales,
      source: 'tenant_supabase'
    });
  } catch (error: any) {
    console.error('[Split] Error in resellers-analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao buscar dados',
    });
  }
});

// ============================================================
// COMMISSION CONFIG ENDPOINTS
// ============================================================

router.get('/commission-config', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  
  console.log('[Split] GET /commission-config - Loading commission configuration');
  
  try {
    const tenantId = (req as any).user?.tenantId || 'dev-teste_empresa_com';
    const { client: tenantSupabase, source } = await getTenantSupabaseClient(tenantId);
    
    if (!tenantSupabase) {
      console.log('[Split] No Supabase credentials, using defaults');
      return res.json({
        success: true,
        config: {
          id: 'default',
          use_dynamic_tiers: true,
          sales_tiers: getDefaultTiers(),
        }
      });
    }
    
    console.log(`[Split] Loading commission config (${source})`);
    
    const { data, error } = await tenantSupabase
      .from('commission_config')
      .select('*')
      .eq('id', 'default')
      .single();
    
    if (error) {
      console.log('[Split] No commission_config found, using defaults:', error.message);
      return res.json({
        success: true,
        config: {
          id: 'default',
          use_dynamic_tiers: true,
          sales_tiers: getDefaultTiers(),
        }
      });
    }
    
    console.log('[Split] Commission config loaded successfully');
    res.json({
      success: true,
      config: data,
    });
  } catch (error: any) {
    console.error('[Split] Error loading commission config:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao carregar configuração de comissões',
    });
  }
});

router.post('/commission-config', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  
  console.log('[Split] POST /commission-config - Saving commission configuration');
  
  try {
    const { use_dynamic_tiers, sales_tiers } = req.body;
    
    if (typeof use_dynamic_tiers !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'use_dynamic_tiers deve ser boolean',
      });
    }
    
    if (!Array.isArray(sales_tiers) || sales_tiers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'sales_tiers deve ser um array com pelo menos uma faixa',
      });
    }
    
    const tenantId = (req as any).user?.tenantId || 'dev-teste_empresa_com';
    const { client: tenantSupabase, source } = await getTenantSupabaseClient(tenantId);
    
    if (!tenantSupabase) {
      return res.status(500).json({
        success: false,
        error: 'Configuração do Supabase não encontrada',
      });
    }
    
    console.log(`[Split] Saving commission config (${source})`);
    
    const { data, error } = await tenantSupabase
      .from('commission_config')
      .upsert({
        id: 'default',
        use_dynamic_tiers,
        sales_tiers,
        updated_at: new Date().toISOString(),
      })
      .select();
    
    if (error) {
      console.error('[Split] Error saving commission config:', error);
      return res.status(500).json({
        success: false,
        error: `Erro ao salvar: ${error.message}`,
      });
    }
    
    console.log('[Split] Commission config saved successfully');
    res.json({
      success: true,
      config: data?.[0] || { id: 'default', use_dynamic_tiers, sales_tiers },
    });
  } catch (error: any) {
    console.error('[Split] Error saving commission config:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao salvar configuração de comissões',
    });
  }
});

function getDefaultTiers() {
  return [
    { id: '1', name: 'Iniciante', min_monthly_sales: 0, max_monthly_sales: 2000, reseller_percentage: 65, company_percentage: 35 },
    { id: '2', name: 'Bronze', min_monthly_sales: 2000, max_monthly_sales: 4500, reseller_percentage: 70, company_percentage: 30 },
    { id: '3', name: 'Prata', min_monthly_sales: 4500, max_monthly_sales: 10000, reseller_percentage: 75, company_percentage: 25 },
    { id: '4', name: 'Ouro', min_monthly_sales: 10000, reseller_percentage: 80, company_percentage: 20 },
  ];
}

// GET /api/split/product-requests - List all product requests for admin
router.get('/product-requests', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  
  console.log('[Split] GET /product-requests - Loading product requests for admin');
  
  try {
    const tenantId = (req as any).user?.tenantId || 'dev-teste_empresa_com';
    const { client: tenantClient, source } = await getTenantSupabaseClient(tenantId);
    
    if (!tenantClient) {
      console.log('[Split] No Supabase credentials');
      return res.json({ success: true, data: [] });
    }
    
    console.log(`[Split] Loading product requests (${source})`);
    
    // Fetch all product requests
    const { data: requests, error } = await tenantClient
      .from('product_requests')
      .select('*, product:product_id(id, description, reference, image)')
      .order('created_at', { ascending: false });
    
    if (error) {
      if (error.code === '42P01') {
        console.log('[Split] product_requests table does not exist');
        return res.json({ success: true, data: [] });
      }
      throw error;
    }
    
    console.log('[Split] Found', requests?.length || 0, 'product requests');
    
    const resellerIds = [...new Set((requests || []).map(r => r.reseller_id))];
    let resellersMap: Record<string, any> = {};
    
    if (resellerIds.length > 0) {
      const { data: resellers, error: resellersError } = await tenantClient
        .from('resellers')
        .select('id, nome, email, telefone')
        .in('id', resellerIds);
      
      if (resellersError) {
        console.log('[Split] Error fetching resellers from tenant:', resellersError.message);
      } else {
        resellersMap = (resellers || []).reduce((acc, r) => {
          acc[r.id] = r;
          return acc;
        }, {} as Record<string, any>);
        console.log('[Split] Found', Object.keys(resellersMap).length, 'resellers for enrichment');
      }
    }
    
    const enrichedData = (requests || []).map(request => ({
      ...request,
      reseller: resellersMap[request.reseller_id] || null
    }));
    
    res.json({ success: true, data: enrichedData });
    
  } catch (error: any) {
    console.error('[Split] Error loading product requests:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao carregar solicitações' });
  }
});

// PATCH /api/split/product-requests/:id - Update product request status
router.patch('/product-requests/:id', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  
  const { id } = req.params;
  const { status } = req.body;
  
  console.log('[Split] PATCH /product-requests/:id - Updating status for', id);
  
  if (!status) {
    return res.status(400).json({ success: false, error: 'Status é obrigatório' });
  }
  
  try {
    const tenantId = (req as any).user?.tenantId || 'dev-teste_empresa_com';
    const { client: tenantClient, source } = await getTenantSupabaseClient(tenantId);
    
    if (!tenantClient) {
      return res.status(400).json({ success: false, error: 'Configuração não encontrada' });
    }
    
    console.log(`[Split] Updating product request (${source})`);
    
    const { data, error } = await tenantClient
      .from('product_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('[Split] Updated product request status:', id, '->', status);
    res.json({ success: true, data });
    
  } catch (error: any) {
    console.error('[Split] Error updating product request:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao atualizar status' });
  }
});

export default router;
