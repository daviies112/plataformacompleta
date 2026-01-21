import { Router } from 'express';
import { pagarmeService } from '../services/pagarme';

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
      customer,
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

export default router;
