import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pagarmeService } from '../services/pagarme';
import {
  getCompanyRecipientId,
  getResellerRecipientId,
  saveCompanyRecipientId,
  saveResellerRecipientId,
} from '../services/commission';
import { createClient } from '@supabase/supabase-js';

const router = Router();

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
  branch_check_digit: '',
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
    
    const status = {
      success: true,
      pagarme: {
        configured: pagarmeConfigured,
        testMode: !!(process.env.CHAVE_SECRETA_TESTE),
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

export default router;
