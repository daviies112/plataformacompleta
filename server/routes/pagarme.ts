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
    console.error('[Pagar.me] Config error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/orders/pix', async (req, res) => {
  try {
    const { customer, items, expiresIn } = req.body;

    if (!customer || !items || items.length === 0) {
      return res.status(400).json({ error: 'Customer e items são obrigatórios' });
    }

    if (!customer.name || !customer.email || !customer.document) {
      return res.status(400).json({ error: 'Nome, email e CPF do cliente são obrigatórios' });
    }

    const order = await pagarmeService.createPixOrder({
      customer,
      items,
      expiresIn: expiresIn || 86400,
    });

    const pixCharge = order.charges?.[0];
    const pixTransaction = pixCharge?.last_transaction;

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
    console.error('[Pagar.me] PIX order error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/orders/card', async (req, res) => {
  try {
    const { customer, items, cardToken, card, installments, statementDescriptor } = req.body;

    if (!customer || !items || items.length === 0) {
      return res.status(400).json({ error: 'Customer e items são obrigatórios' });
    }

    if (!cardToken && !card) {
      return res.status(400).json({ error: 'cardToken ou card são obrigatórios' });
    }

    let order;

    if (cardToken) {
      order = await pagarmeService.createCardOrder({
        customer,
        items,
        cardToken,
        installments,
        statementDescriptor,
      });
    } else {
      order = await pagarmeService.createCardOrderWithData({
        customer,
        items,
        card,
        installments,
        statementDescriptor,
      });
    }

    const cardCharge = order.charges?.[0];

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
    console.error('[Pagar.me] Card order error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

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
    console.error('[Pagar.me] Get order error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await pagarmeService.cancelOrder(orderId);

    res.json({
      success: true,
      message: 'Pedido cancelado com sucesso',
      order: {
        id: order.id,
        status: order.status,
      },
    });
  } catch (error: any) {
    console.error('[Pagar.me] Cancel order error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/tokenize', async (req, res) => {
  try {
    const { card } = req.body;

    if (!card || !card.number || !card.holder_name || !card.exp_month || !card.exp_year || !card.cvv) {
      return res.status(400).json({ error: 'Dados do cartão incompletos' });
    }

    const token = await pagarmeService.tokenizeCard({
      number: card.number,
      holder_name: card.holder_name,
      holder_document: card.holder_document || '',
      exp_month: card.exp_month,
      exp_year: card.exp_year,
      cvv: card.cvv,
    });

    res.json({
      success: true,
      tokenId: token.id,
      type: token.type,
    });
  } catch (error: any) {
    console.error('[Pagar.me] Tokenize error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    
    console.log('[Pagar.me] Webhook received:', JSON.stringify(event, null, 2));

    const eventType = event.type;
    const data = event.data;

    switch (eventType) {
      case 'order.paid':
        console.log('[Pagar.me] Order paid:', data.id);
        break;
      case 'order.canceled':
        console.log('[Pagar.me] Order canceled:', data.id);
        break;
      case 'charge.paid':
        console.log('[Pagar.me] Charge paid:', data.id);
        break;
      case 'charge.refunded':
        console.log('[Pagar.me] Charge refunded:', data.id);
        break;
      default:
        console.log('[Pagar.me] Unhandled event type:', eventType);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('[Pagar.me] Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
