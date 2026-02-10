import express from 'express';
import Stripe from 'stripe';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { supabaseOwner, SUPABASE_CONFIGURED } from '../config/supabaseOwner';

const router = express.Router();

// Helper para obter Stripe configurado do admin
async function getStripeForAdmin(adminId: string): Promise<Stripe | null> {
  if (!SUPABASE_CONFIGURED || !supabaseOwner) return null;
  
  const { data } = await supabaseOwner
    .from('config_split')
    .select('stripe_secret_key')
    .eq('admin_id', adminId)
    .single();
    
  if (!data?.stripe_secret_key) return null;
  
  return new Stripe(data.stripe_secret_key);
}

// GET /api/stripe/config-status - Verificar se Stripe esta configurado
router.get('/config-status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const adminId = req.user?.tenantId || req.session?.tenantId;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Nao autenticado' });
    }

    if (!SUPABASE_CONFIGURED || !supabaseOwner) {
      return res.json({ configured: false, reason: 'Supabase nao configurado' });
    }

    const { data } = await supabaseOwner
      .from('config_split')
      .select('stripe_secret_key, stripe_publishable_key')
      .eq('admin_id', adminId)
      .single();

    const configured = !!(data?.stripe_secret_key && data?.stripe_publishable_key);

    res.json({
      configured,
      hasSecretKey: !!data?.stripe_secret_key,
      hasPublishableKey: !!data?.stripe_publishable_key
    });

  } catch (error) {
    console.error('Erro ao verificar config Stripe:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/stripe/save-config - Salvar configuracao Stripe do admin
router.post('/save-config', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.session?.userRole === 'reseller') {
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }

    const adminId = req.user?.tenantId || req.session?.tenantId || req.session?.userId;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Nao autenticado' });
    }

    if (!SUPABASE_CONFIGURED || !supabaseOwner) {
      return res.status(503).json({ error: 'Sistema nao configurado' });
    }

    const { stripeSecretKey, stripePublishableKey } = req.body;

    if (!stripeSecretKey || !stripePublishableKey) {
      return res.status(400).json({ error: 'Chaves Stripe sao obrigatorias' });
    }

    // Upsert config
    const { data, error } = await supabaseOwner
      .from('config_split')
      .upsert({
        admin_id: adminId,
        stripe_secret_key: stripeSecretKey,
        stripe_publishable_key: stripePublishableKey
      }, { onConflict: 'admin_id' })
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar config Stripe:', error);
      return res.status(500).json({ error: 'Erro ao salvar configuracao' });
    }

    res.json({
      success: true,
      message: 'Configuracao Stripe salva com sucesso'
    });

  } catch (error) {
    console.error('Erro ao salvar config:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/stripe/onboarding - Criar conta Express para revendedora
router.post('/onboarding', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const adminId = req.user?.tenantId || req.session?.tenantId;
    const revendedoraId = req.user?.userId || req.session?.userId;
    
    if (!adminId || !revendedoraId) {
      return res.status(401).json({ error: 'Nao autenticado' });
    }

    const stripe = await getStripeForAdmin(adminId);
    if (!stripe) {
      return res.status(400).json({
        error: 'Stripe nao configurado para esta empresa',
        action: 'Entre em contato com a empresa para configurar pagamentos'
      });
    }

    // Criar conta conectada Express
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'BR',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Salvar account_id na revendedora
    if (SUPABASE_CONFIGURED && supabaseOwner) {
      await supabaseOwner
        .from('revendedoras')
        .update({ stripe_account_id: account.id })
        .eq('id', revendedoraId);
    }

    // Gerar link de onboarding
    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'http://localhost:5000';
      
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${appUrl}/reseller/stripe-refresh`,
      return_url: `${appUrl}/reseller/stripe-complete`,
      type: 'account_onboarding',
    });

    res.json({
      success: true,
      url: accountLink.url,
      accountId: account.id
    });
    
  } catch (error: any) {
    console.error('Erro onboarding Stripe:', error);
    res.status(500).json({
      error: 'Erro ao configurar conta de pagamentos',
      details: error.message
    });
  }
});

// GET /api/stripe/account-status - Status da conta Stripe da revendedora
router.get('/account-status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const adminId = req.user?.tenantId || req.session?.tenantId;
    const revendedoraId = req.user?.userId || req.session?.userId;

    if (!adminId || !revendedoraId) {
      return res.status(401).json({ error: 'Nao autenticado' });
    }

    if (!SUPABASE_CONFIGURED || !supabaseOwner) {
      return res.status(503).json({ error: 'Sistema nao configurado' });
    }

    // Buscar revendedora
    const { data: revendedora } = await supabaseOwner
      .from('revendedoras')
      .select('stripe_account_id')
      .eq('id', revendedoraId)
      .single();

    if (!revendedora?.stripe_account_id) {
      return res.json({
        connected: false,
        message: 'Conta Stripe nao configurada'
      });
    }

    const stripe = await getStripeForAdmin(adminId);
    if (!stripe) {
      return res.json({
        connected: false,
        message: 'Stripe do admin nao configurado'
      });
    }

    // Verificar status da conta
    const account = await stripe.accounts.retrieve(revendedora.stripe_account_id);

    res.json({
      connected: true,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted
    });

  } catch (error: any) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ error: 'Erro ao verificar status da conta' });
  }
});

// POST /api/stripe/checkout - Criar checkout com split (rota publica para storefront)
// NOTA: Esta rota e publica pois e chamada pelo storefront do cliente final
// A seguranca e garantida pela validacao do revendedoraId no banco
router.post('/checkout', async (req, res) => {
  try {
    const { items, revendedoraId, clienteNome, clienteTelefone } = req.body;

    if (!items?.length || !revendedoraId) {
      return res.status(400).json({
        error: 'Dados incompletos',
        required: ['items', 'revendedoraId']
      });
    }

    // Validar formato UUID do revendedoraId para evitar injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(revendedoraId)) {
      return res.status(400).json({ error: 'ID de revendedora invalido' });
    }

    if (!SUPABASE_CONFIGURED || !supabaseOwner) {
      return res.status(503).json({ error: 'Sistema nao configurado' });
    }

    // Buscar revendedora - apenas status ativo
    const { data: revendedora } = await supabaseOwner
      .from('revendedoras')
      .select('*')
      .eq('id', revendedoraId)
      .eq('status', 'ativo')
      .single();

    if (!revendedora) {
      return res.status(404).json({ error: 'Revendedora nao encontrada ou inativa' });
    }

    if (!revendedora.stripe_account_id) {
      return res.status(400).json({
        error: 'Revendedora ainda nao configurou recebimento de pagamentos'
      });
    }

    // Buscar config_split do admin
    const { data: configSplit } = await supabaseOwner
      .from('config_split')
      .select('stripe_secret_key')
      .eq('admin_id', revendedora.admin_id)
      .single();

    if (!configSplit?.stripe_secret_key) {
      return res.status(400).json({ error: 'Stripe nao configurado pela empresa' });
    }

    const stripe = new Stripe(configSplit.stripe_secret_key);

    // Calcular valores
    const valorTotal = items.reduce((sum: number, item: any) =>
      sum + (Number(item.preco) * Number(item.quantidade || 1)), 0);
    
    const comissaoPercent = Number(revendedora.comissao_padrao) / 100;
    const valorRevendedora = Math.round(valorTotal * comissaoPercent * 100); // Em centavos
    const valorEmpresa = Math.round(valorTotal * 100) - valorRevendedora;

    // Criar sessao de checkout com split
    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'http://localhost:5000';
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map((item: any) => ({
        price_data: {
          currency: 'brl',
          product_data: {
            name: item.nome,
            description: item.descricao || undefined
          },
          unit_amount: Math.round(Number(item.preco) * 100),
        },
        quantity: item.quantidade || 1,
      })),
      mode: 'payment',
      payment_intent_data: {
        application_fee_amount: valorEmpresa,
        transfer_data: {
          destination: revendedora.stripe_account_id,
        },
      },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel`,
      metadata: {
        revendedora_id: revendedoraId,
        admin_id: revendedora.admin_id,
        cliente_nome: clienteNome || '',
        cliente_telefone: clienteTelefone || '',
      },
    });

    // Registrar venda (status pendente ate webhook confirmar)
    await supabaseOwner
      .from('vendas_revendedora')
      .insert({
        revendedora_id: revendedoraId,
        admin_id: revendedora.admin_id,
        valor_total: valorTotal,
        valor_comissao: valorRevendedora / 100,
        valor_empresa: valorEmpresa / 100,
        status_pagamento: 'pendente',
        stripe_payment_id: session.id,
        cliente_nome: clienteNome,
        cliente_telefone: clienteTelefone
      });

    res.json({
      success: true,
      url: session.url,
      sessionId: session.id
    });
    
  } catch (error: any) {
    console.error('Erro checkout:', error);
    res.status(500).json({
      error: 'Erro ao criar checkout',
      details: error.message
    });
  }
});

// POST /api/stripe/webhook - Webhook para confirmar pagamentos
// SEGURANCA: Verifica assinatura do Stripe para evitar eventos falsificados
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig) {
      console.error('[STRIPE WEBHOOK] Assinatura ausente');
      return res.status(400).json({ error: 'Assinatura ausente' });
    }

    if (!webhookSecret) {
      console.error('[STRIPE WEBHOOK] STRIPE_WEBHOOK_SECRET nao configurado');
      return res.status(400).json({ error: 'Webhook nao configurado' });
    }

    if (!SUPABASE_CONFIGURED || !supabaseOwner) {
      return res.status(503).json({ error: 'Sistema nao configurado' });
    }

    // Verificar assinatura do webhook usando Stripe
    // Precisamos do admin_id do metadata para obter a stripe instance
    // Primeiro, parse do evento sem verificacao para pegar o admin_id
    let rawEvent;
    try {
      rawEvent = JSON.parse(req.body.toString());
    } catch (e) {
      console.error('[STRIPE WEBHOOK] Body invalido');
      return res.status(400).json({ error: 'Body invalido' });
    }

    // Buscar admin_id do metadata do evento
    const adminId = rawEvent?.data?.object?.metadata?.admin_id;
    
    if (!adminId) {
      console.error('[STRIPE WEBHOOK] admin_id nao encontrado no metadata');
      return res.status(400).json({ error: 'Metadata invalido' });
    }

    // Obter stripe do admin para verificar assinatura
    const stripe = await getStripeForAdmin(adminId);
    if (!stripe) {
      console.error('[STRIPE WEBHOOK] Stripe nao configurado para admin:', adminId);
      return res.status(400).json({ error: 'Stripe nao configurado' });
    }

    // VERIFICACAO DE ASSINATURA - Previne eventos falsificados
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error('[STRIPE WEBHOOK] Falha na verificacao de assinatura:', err.message);
      return res.status(400).json({ error: 'Assinatura invalida' });
    }

    // Processar evento verificado
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Atualizar status da venda
      const { error: updateError } = await supabaseOwner
        .from('vendas_revendedora')
        .update({ status_pagamento: 'pago' })
        .eq('stripe_payment_id', session.id);

      if (updateError) {
        console.error('[STRIPE WEBHOOK] Erro ao atualizar venda:', updateError);
      } else {
        console.log(`[STRIPE] Pagamento confirmado: ${session.id}`);
      }
    }

    res.json({ received: true });

  } catch (error: any) {
    console.error('Erro no webhook:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
