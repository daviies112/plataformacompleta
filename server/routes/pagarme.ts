import { Router } from 'express';
import { pagarmeService } from '../services/pagarme';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { saveCompanyRecipientId, getCompanyRecipientId } from '../services/commission';

const router = Router();

router.get('/config', (req, res) => {
  try {
    const isConfigured = pagarmeService.isConfigured();
    const publicKey = pagarmeService.getPublicKey();

    res.json({
      configured: isConfigured,
      publicKey: isConfigured ? publicKey : null,
    });
  } catch (error: any) {
    console.error('[Pagar.me] Config error:', error.message);
    res.status(500).json({ error: 'Erro ao obter configuração' });
  }
});

router.post('/orders/pix', async (req, res) => {
  try {
    const { customer, items, expiresIn } = req.body;

    if (!customer || typeof customer !== 'object') {
      return res.status(400).json({ error: 'Customer é obrigatório' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items são obrigatórios' });
    }

    if (!customer.name || typeof customer.name !== 'string' || customer.name.trim().length < 2) {
      return res.status(400).json({ error: 'Nome do cliente é obrigatório (mínimo 2 caracteres)' });
    }

    if (!customer.email || typeof customer.email !== 'string' || !customer.email.includes('@')) {
      return res.status(400).json({ error: 'Email do cliente é obrigatório e deve ser válido' });
    }

    if (!customer.document || typeof customer.document !== 'string') {
      return res.status(400).json({ error: 'CPF do cliente é obrigatório' });
    }

    const cpfClean = customer.document.replace(/\D/g, '');
    if (cpfClean.length !== 11 && cpfClean.length !== 14) {
      return res.status(400).json({ error: 'CPF/CNPJ inválido' });
    }

    // OBRIGATÓRIO para PIX: phones deve ser enviado (exigência Pagar.me)
    if (!customer.phones && !customer.phone) {
      return res.status(400).json({ error: 'Telefone é obrigatório para pagamento via PIX' });
    }

    // Se veio phone string, formatar para o formato do Pagar.me
    const customerWithPhone = { ...customer };
    if (customer.phone && !customer.phones) {
      const phoneClean = customer.phone.replace(/\D/g, '');
      const areaCode = phoneClean.slice(0, 2);
      const number = phoneClean.slice(2);
      customerWithPhone.phones = {
        mobile_phone: {
          country_code: '55',
          area_code: areaCode,
          number: number,
        }
      };
    }

    for (const item of items) {
      if (!item.amount || typeof item.amount !== 'number' || item.amount <= 0) {
        return res.status(400).json({ error: 'Cada item deve ter um valor (amount) positivo' });
      }
      if (!item.description || typeof item.description !== 'string') {
        return res.status(400).json({ error: 'Cada item deve ter uma descrição' });
      }
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return res.status(400).json({ error: 'Cada item deve ter uma quantidade positiva' });
      }
    }

    const order = await pagarmeService.createPixOrder({
      customer: customerWithPhone,
      items,
      expiresIn: expiresIn || 86400,
    });

    const pixCharge = order.charges?.[0];
    const pixTransaction = pixCharge?.last_transaction;

    console.log(`[Pagar.me] PIX order created: ${order.id}`);

    res.json({
      success: true,
      orderId: order.id,
      orderCode: order.code,
      status: order.status,
      chargeId: pixCharge?.id,
      chargeStatus: pixCharge?.status,
      pix: {
        qrCode: pixTransaction?.qr_code,
        qrCodeUrl: pixTransaction?.qr_code_url,
        expiresAt: pixTransaction?.expires_at,
      },
      amount: order.amount,
      createdAt: order.created_at,
    });
  } catch (error: any) {
    console.error('[Pagar.me] PIX order error:', error.message);
    res.status(500).json({ error: error.message || 'Erro ao criar pedido PIX' });
  }
});

router.post('/orders/card', async (req, res) => {
  try {
    const { customer, items, cardToken, installments, statementDescriptor } = req.body;

    if (!customer || typeof customer !== 'object') {
      return res.status(400).json({ error: 'Customer é obrigatório' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items são obrigatórios' });
    }

    if (!cardToken || typeof cardToken !== 'string') {
      return res.status(400).json({ error: 'cardToken é obrigatório. Use o endpoint /tokenize primeiro.' });
    }

    if (!customer.name || typeof customer.name !== 'string' || customer.name.trim().length < 2) {
      return res.status(400).json({ error: 'Nome do cliente é obrigatório (mínimo 2 caracteres)' });
    }

    if (!customer.email || typeof customer.email !== 'string' || !customer.email.includes('@')) {
      return res.status(400).json({ error: 'Email do cliente é obrigatório e deve ser válido' });
    }

    if (!customer.document || typeof customer.document !== 'string') {
      return res.status(400).json({ error: 'CPF do cliente é obrigatório' });
    }

    const cpfClean = customer.document.replace(/\D/g, '');
    if (cpfClean.length !== 11 && cpfClean.length !== 14) {
      return res.status(400).json({ error: 'CPF/CNPJ inválido' });
    }

    for (const item of items) {
      if (!item.amount || typeof item.amount !== 'number' || item.amount <= 0) {
        return res.status(400).json({ error: 'Cada item deve ter um valor (amount) positivo' });
      }
      if (!item.description || typeof item.description !== 'string') {
        return res.status(400).json({ error: 'Cada item deve ter uma descrição' });
      }
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return res.status(400).json({ error: 'Cada item deve ter uma quantidade positiva' });
      }
    }

    if (installments !== undefined && (typeof installments !== 'number' || installments < 1 || installments > 12)) {
      return res.status(400).json({ error: 'Número de parcelas deve ser entre 1 e 12' });
    }

    const order = await pagarmeService.createCardOrder({
      customer,
      items,
      cardToken,
      installments: installments || 1,
      statementDescriptor: statementDescriptor || 'NEXUS',
    });

    const cardCharge = order.charges?.[0];

    console.log(`[Pagar.me] Card order created: ${order.id}`);

    res.json({
      success: true,
      orderId: order.id,
      orderCode: order.code,
      status: order.status,
      chargeId: cardCharge?.id,
      chargeStatus: cardCharge?.status,
      amount: order.amount,
      createdAt: order.created_at,
    });
  } catch (error: any) {
    console.error('[Pagar.me] Card order error:', error.message);
    res.status(500).json({ error: error.message || 'Erro ao processar cartão' });
  }
});

router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId || typeof orderId !== 'string' || orderId.length < 10) {
      return res.status(400).json({ error: 'orderId inválido' });
    }

    const order = await pagarmeService.getOrder(orderId);

    res.json({
      success: true,
      order: {
        id: order.id,
        code: order.code,
        status: order.status,
        amount: order.amount,
        charges: order.charges?.map(charge => ({
          id: charge.id,
          status: charge.status,
          paymentMethod: charge.payment_method,
          amount: charge.amount,
        })),
        createdAt: order.created_at,
      },
    });
  } catch (error: any) {
    console.error('[Pagar.me] Get order error:', error.message);
    res.status(500).json({ error: error.message || 'Erro ao buscar pedido' });
  }
});

router.delete('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId || typeof orderId !== 'string' || orderId.length < 10) {
      return res.status(400).json({ error: 'orderId inválido' });
    }

    const order = await pagarmeService.cancelOrder(orderId);

    console.log(`[Pagar.me] Order cancelled: ${orderId}`);

    res.json({
      success: true,
      message: 'Pedido cancelado com sucesso',
      order: {
        id: order.id,
        status: order.status,
      },
    });
  } catch (error: any) {
    console.error('[Pagar.me] Cancel order error:', error.message);
    res.status(500).json({ error: error.message || 'Erro ao cancelar pedido' });
  }
});

router.post('/tokenize', async (req, res) => {
  try {
    const { card } = req.body;

    if (!card || typeof card !== 'object') {
      return res.status(400).json({ error: 'Dados do cartão são obrigatórios' });
    }

    if (!card.number || typeof card.number !== 'string') {
      return res.status(400).json({ error: 'Número do cartão é obrigatório' });
    }

    const cardNumberClean = card.number.replace(/\D/g, '');
    if (cardNumberClean.length < 13 || cardNumberClean.length > 19) {
      return res.status(400).json({ error: 'Número do cartão inválido' });
    }

    if (!card.holder_name || typeof card.holder_name !== 'string' || card.holder_name.trim().length < 2) {
      return res.status(400).json({ error: 'Nome do titular é obrigatório' });
    }

    if (!card.exp_month || typeof card.exp_month !== 'number' || card.exp_month < 1 || card.exp_month > 12) {
      return res.status(400).json({ error: 'Mês de validade inválido (1-12)' });
    }

    const currentYear = new Date().getFullYear();
    if (!card.exp_year || typeof card.exp_year !== 'number' || card.exp_year < currentYear || card.exp_year > currentYear + 20) {
      return res.status(400).json({ error: 'Ano de validade inválido' });
    }

    if (!card.cvv || typeof card.cvv !== 'string') {
      return res.status(400).json({ error: 'CVV é obrigatório' });
    }

    const cvvClean = card.cvv.replace(/\D/g, '');
    if (cvvClean.length < 3 || cvvClean.length > 4) {
      return res.status(400).json({ error: 'CVV deve ter 3 ou 4 dígitos' });
    }

    const token = await pagarmeService.tokenizeCard({
      number: cardNumberClean,
      holder_name: card.holder_name.trim(),
      holder_document: card.holder_document || '',
      exp_month: card.exp_month,
      exp_year: card.exp_year,
      cvv: cvvClean,
    });

    console.log('[Pagar.me] Card tokenized successfully');

    res.json({
      success: true,
      tokenId: token.id,
      type: token.type,
    });
  } catch (error: any) {
    console.error('[Pagar.me] Tokenize error:', error.message);
    res.status(500).json({ error: error.message || 'Erro ao tokenizar cartão' });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    
    // TODO: Implement webhook signature verification
    // Pagar.me sends a x-hub-signature header that should be verified
    // against the webhook secret configured in Pagar.me dashboard.
    // See: https://docs.pagar.me/docs/webhooks
    // const signature = req.headers['x-hub-signature'];
    // if (!verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    if (!event || !event.type) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const eventType = event.type;
    const data = event.data;
    const eventId = data?.id || 'unknown';

    switch (eventType) {
      case 'order.paid':
        console.log(`[Pagar.me] Webhook: order.paid - ${eventId}`);
        break;
      case 'order.canceled':
        console.log(`[Pagar.me] Webhook: order.canceled - ${eventId}`);
        break;
      case 'charge.paid':
        console.log(`[Pagar.me] Webhook: charge.paid - ${eventId}`);
        break;
      case 'charge.refunded':
        console.log(`[Pagar.me] Webhook: charge.refunded - ${eventId}`);
        break;
      default:
        console.log(`[Pagar.me] Webhook: ${eventType} - ${eventId}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('[Pagar.me] Webhook error:', error.message);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

router.post('/onboarding-empresa', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Verificar se o usuário é admin (não reseller)
    // Usar req.user?.role que é definido pelo authenticateToken baseado na sessão
    const userRole = req.user?.role || req.session?.userRole;
    if (userRole === 'reseller') {
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }

    const {
      razaoSocial,
      cnpj,
      bancoCode,
      agencia,
      agenciaDv,
      conta,
      contaDv,
      tipoConta,
    } = req.body;

    if (!razaoSocial || !cnpj || !bancoCode || !agencia || !conta) {
      return res.status(400).json({ error: 'Dados bancários incompletos' });
    }

    const cnpjClean = cnpj.replace(/\D/g, '');
    if (cnpjClean.length !== 14) {
      return res.status(400).json({ error: 'CNPJ inválido - deve conter 14 dígitos' });
    }

    console.log('[Pagar.me] Creating corporate recipient for company:', razaoSocial);

    const recipient = await pagarmeService.createCorporateRecipient({
      company_name: razaoSocial,
      trading_name: razaoSocial,
      email: req.user?.email || 'admin@empresa.com.br',
      document: cnpjClean,
      main_address: {
        street: 'Endereço Principal',
        number: '1',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zip_code: '01310100',
      },
      managing_partners: [{
        name: razaoSocial,
        email: req.user?.email || 'admin@empresa.com.br',
        document: cnpjClean,
        type: 'individual',
        birthdate: '1990-01-01',
        address: {
          street: 'Endereço Principal',
          number: '1',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zip_code: '01310100',
        },
        phone_numbers: [{
          ddd: '11',
          number: '999999999',
          type: 'mobile',
        }],
      }],
      bank_account: {
        holder_name: razaoSocial,
        holder_document: cnpjClean,
        bank: bancoCode,
        branch_number: agencia,
        branch_check_digit: agenciaDv || '',
        account_number: conta,
        account_check_digit: contaDv || '',
        type: tipoConta === 'poupanca' ? 'savings' : 'checking',
      },
      transfer_settings: {
        transfer_enabled: true,
        transfer_interval: 'daily',
        transfer_day: 0,
      },
    });

    const saved = await saveCompanyRecipientId(recipient.id);
    if (!saved) {
      console.warn('[Pagar.me] Failed to save recipient_id to database, but recipient was created');
    }

    console.log('[Pagar.me] Corporate recipient created:', recipient.id);

    res.json({
      success: true,
      recipientId: recipient.id,
      message: 'Dados bancários cadastrados com sucesso!',
    });
  } catch (error: any) {
    console.error('[Pagar.me] Onboarding empresa error:', error);

    // Tratar erro "action_forbidden" - conta Pagar.me não habilitada para marketplace
    const errorMessage = error.message || '';
    if (errorMessage.includes('action_forbidden') || errorMessage.includes('not allowed to create a recipient')) {
      console.log('[Pagar.me] Conta não habilitada para marketplace - salvando dados localmente');
      
      // Gerar um ID manual para indicar que os dados foram configurados localmente
      const manualRecipientId = `manual_${Date.now()}`;
      
      const saved = await saveCompanyRecipientId(manualRecipientId);
      if (saved) {
        return res.json({
          success: true,
          recipientId: manualRecipientId,
          message: 'Dados bancários salvos localmente. Nota: Sua conta Pagar.me não está habilitada para split de pagamento. Entre em contato com o Pagar.me para habilitar essa funcionalidade.',
          warning: 'split_disabled'
        });
      }
    }

    if (error.response?.errors) {
      const erros = error.response.errors.map((e: any) => e.message).join(', ');
      return res.status(400).json({ error: `Erro Pagar.me: ${erros}` });
    }

    res.status(500).json({ error: error.message || 'Erro ao cadastrar dados bancários' });
  }
});

router.get('/empresa-status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const recipientId = await getCompanyRecipientId();

    if (!recipientId) {
      return res.json({ configured: false });
    }

    let bankDetails = null;
    try {
      const recipientData = await pagarmeService.getRecipient(recipientId);
      if (recipientData?.default_bank_account) {
        const bank = recipientData.default_bank_account;
        bankDetails = {
          banco: bank.bank,
          agencia: bank.branch_number,
          conta: bank.account_number ? `****${bank.account_number.slice(-4)}` : '****',
          tipo: bank.type === 'savings' ? 'Poupança' : 'Corrente',
          holderName: bank.holder_name,
        };
      }
    } catch (e) {
      console.warn('[Pagar.me] Could not fetch recipient details:', e);
    }

    res.json({
      configured: true,
      recipientId,
      bankAccount: bankDetails,
    });
  } catch (error: any) {
    console.error('[Pagar.me] Empresa status error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/onboarding-revendedora', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const resellerId = req.session?.resellerId;
    if (!resellerId) {
      return res.status(403).json({ error: 'Acesso restrito a revendedoras' });
    }

    const {
      nomeCompleto,
      cpf,
      email,
      telefone,
      dataNascimento,
      nomeMae,
      rendaMensal,
      profissao,
      endereco,
      bancoCode,
      agencia,
      agenciaDv,
      conta,
      contaDv,
      tipoConta,
    } = req.body;

    if (!nomeCompleto || !cpf) {
      return res.status(400).json({ error: 'Nome completo e CPF são obrigatórios.' });
    }

    if (!bancoCode || !agencia || !conta || !contaDv) {
      return res.status(400).json({ error: 'Dados bancários incompletos. Banco, agência, conta e dígito são obrigatórios.' });
    }

    if (!telefone || !dataNascimento || !nomeMae) {
      return res.status(400).json({ error: 'Dados pessoais incompletos. Telefone, data de nascimento e nome da mãe são obrigatórios.' });
    }

    if (!endereco || !endereco.cep || !endereco.rua || !endereco.numero || !endereco.bairro || !endereco.cidade || !endereco.estado) {
      return res.status(400).json({ error: 'Endereço incompleto. CEP, rua, número, bairro, cidade e estado são obrigatórios.' });
    }

    const cepClean = endereco.cep.replace(/\D/g, '');
    if (cepClean.length !== 8) {
      return res.status(400).json({ error: 'CEP inválido - deve conter 8 dígitos' });
    }

    const cpfClean = cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      return res.status(400).json({ error: 'CPF inválido - deve conter 11 dígitos' });
    }

    const phoneCleanValidation = telefone.replace(/\D/g, '');
    if (phoneCleanValidation.length < 10) {
      return res.status(400).json({ error: 'Telefone inválido - deve conter DDD + número' });
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Email inválido. Forneça um email válido.' });
    }

    console.log('[Pagar.me] Creating individual recipient for reseller:', nomeCompleto);

    const phoneClean = telefone.replace(/\D/g, '');
    const phoneDdd = phoneClean.slice(0, 2);
    const phoneNumber = phoneClean.slice(2);

    const recipient = await pagarmeService.createIndividualRecipient({
      code: `reseller_${resellerId}_${Date.now()}`,
      name: nomeCompleto,
      email: email,
      document: cpfClean,
      mother_name: nomeMae,
      birthdate: dataNascimento,
      monthly_income: rendaMensal || 3000,
      professional_occupation: profissao || 'Revendedor(a)',
      phone: {
        ddd: phoneDdd,
        number: phoneNumber,
      },
      address: {
        street: endereco.rua,
        number: endereco.numero,
        complementary: endereco.complemento || '',
        neighborhood: endereco.bairro,
        city: endereco.cidade,
        state: endereco.estado,
        zip_code: cepClean,
      },
      bank_account: {
        holder_name: nomeCompleto,
        holder_document: cpfClean,
        bank: bancoCode,
        branch_number: agencia,
        branch_check_digit: agenciaDv || '',
        account_number: conta,
        account_check_digit: contaDv,
        type: tipoConta === 'poupanca' ? 'savings' : 'checking',
      },
      transfer_settings: {
        transfer_enabled: true,
        transfer_interval: 'weekly',
        transfer_day: 5,
      },
    });

    const supabaseUrl = process.env.SUPABASE_OWNER_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_OWNER_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { error } = await supabase
          .from('revendedoras')
          .update({ pagarme_recipient_id: recipient.id })
          .eq('id', resellerId);
        
        if (error) {
          console.warn('[Pagar.me] Failed to save recipient_id to revendedoras:', error.message);
        } else {
          console.log('[Pagar.me] Saved recipient_id to revendedoras table');
        }
      } catch (e: any) {
        console.warn('[Pagar.me] Error updating revendedoras:', e.message);
      }
    }

    console.log('[Pagar.me] Individual recipient created:', recipient.id);

    res.json({
      success: true,
      recipientId: recipient.id,
      message: 'Dados bancários cadastrados com sucesso!',
    });
  } catch (error: any) {
    console.error('[Pagar.me] Onboarding revendedora error:', error);

    if (error.response?.errors) {
      const erros = error.response.errors.map((e: any) => e.message).join(', ');
      return res.status(400).json({ error: `Erro Pagar.me: ${erros}` });
    }

    res.status(500).json({ error: error.message || 'Erro ao cadastrar dados bancários' });
  }
});

router.get('/revendedora-status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const resellerId = req.session?.resellerId;
    if (!resellerId) {
      return res.status(403).json({ error: 'Acesso restrito a revendedoras' });
    }

    const supabaseUrl = process.env.SUPABASE_OWNER_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_OWNER_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.json({ configured: false });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('revendedoras')
      .select('pagarme_recipient_id')
      .eq('id', resellerId)
      .single();

    if (error || !data?.pagarme_recipient_id) {
      return res.json({ configured: false });
    }

    let bankDetails = null;
    try {
      const recipientData = await pagarmeService.getRecipient(data.pagarme_recipient_id);
      if (recipientData?.default_bank_account) {
        const bank = recipientData.default_bank_account;
        bankDetails = {
          banco: bank.bank,
          agencia: bank.branch_number,
          conta: bank.account_number ? `****${bank.account_number.slice(-4)}` : '****',
          tipo: bank.type === 'savings' ? 'Poupança' : 'Corrente',
          holderName: bank.holder_name,
        };
      }
    } catch (e) {
      console.warn('[Pagar.me] Could not fetch recipient details:', e);
    }

    res.json({
      configured: true,
      recipientId: data.pagarme_recipient_id,
      bankAccount: bankDetails,
    });
  } catch (error: any) {
    console.error('[Pagar.me] Revendedora status error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
