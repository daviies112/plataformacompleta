import { Router } from 'express';
import { walletService } from '../services/walletService';
import { pagarmeService } from '../services/pagarme';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/balance', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const wallet = await walletService.getWallet(tenantId);
    
    res.json({
      balance: parseFloat(wallet.balance),
      currency: wallet.currency,
      isFrozen: wallet.isFrozen,
      autoRecharge: wallet.autoRecharge,
      autoRechargeTrigger: wallet.autoRechargeTrigger ? parseFloat(wallet.autoRechargeTrigger) : null,
      autoRechargeAmount: wallet.autoRechargeAmount ? parseFloat(wallet.autoRechargeAmount) : null,
      hasCard: !!wallet.savedCardToken,
    });
  } catch (error: any) {
    console.error('[Wallet] Error getting balance:', error);
    res.status(500).json({ error: 'Erro ao buscar saldo' });
  }
});

router.get('/transactions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const { type, status, startDate, endDate, limit, offset } = req.query;

    const filters: any = {};
    if (type) filters.type = type as string;
    if (status) filters.status = status as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (limit) filters.limit = parseInt(limit as string, 10);
    if (offset) filters.offset = parseInt(offset as string, 10);

    const result = await walletService.getTransactions(tenantId, filters);
    
    res.json({
      transactions: result.transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: parseFloat(t.amount),
        balanceBefore: parseFloat(t.balanceBefore),
        balanceAfter: parseFloat(t.balanceAfter),
        description: t.description,
        referenceId: t.referenceId,
        referenceType: t.referenceType,
        status: t.status,
        createdAt: t.createdAt,
        metadata: t.metadata,
      })),
      total: result.total,
    });
  } catch (error: any) {
    console.error('[Wallet] Error getting transactions:', error);
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
});

router.get('/prices', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const prices = await walletService.getAllServicePrices();
    
    res.json({
      prices: prices.map(p => ({
        serviceCode: p.serviceCode,
        serviceName: p.serviceName,
        price: parseFloat(p.price),
        costPrice: parseFloat(p.costPrice),
        description: p.description,
        isActive: p.isActive,
      })),
    });
  } catch (error: any) {
    console.error('[Wallet] Error getting prices:', error);
    res.status(500).json({ error: 'Erro ao buscar preços' });
  }
});

router.post('/recharge/pix', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const userEmail = req.user?.email;
    const userName = 'Usuário';
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const { amount } = req.body;
    
    if (!amount || typeof amount !== 'number' || amount < 10) {
      return res.status(400).json({ error: 'Valor mínimo de recarga: R$ 10,00' });
    }

    if (amount > 10000) {
      return res.status(400).json({ error: 'Valor máximo de recarga: R$ 10.000,00' });
    }

    const order = await pagarmeService.createPixOrder({
      customer: {
        name: userName,
        email: userEmail || `${tenantId}@wallet.local`,
        document: '00000000000',
        document_type: 'CPF',
        type: 'individual',
        // OBRIGATÓRIO para PIX: phones deve ser enviado (exigência Pagar.me)
        phones: {
          mobile_phone: {
            country_code: '55',
            area_code: '11',
            number: '999999999',
          }
        },
      },
      items: [{
        amount: Math.round(amount * 100),
        description: `Recarga de créditos - Wallet`,
        quantity: 1,
        code: `WALLET_RECHARGE_${tenantId}`,
      }],
      expiresIn: 3600,
    });

    const pixCharge = order.charges?.[0];
    const pixTransaction = pixCharge?.last_transaction;

    console.log(`[Wallet] PIX recharge order created: ${order.id} for tenant ${tenantId}, amount: R$ ${amount}`);

    res.json({
      success: true,
      orderId: order.id,
      orderCode: order.code,
      amount,
      pix: {
        qrCode: pixTransaction?.qr_code,
        qrCodeUrl: pixTransaction?.qr_code_url,
        expiresAt: pixTransaction?.expires_at,
      },
      metadata: {
        tenantId,
        rechargeAmount: amount,
      },
    });
  } catch (error: any) {
    console.error('[Wallet] Error creating PIX recharge:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar recarga PIX' });
  }
});

router.post('/recharge/card', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const userEmail = req.user?.email;
    const userName = 'Usuário';
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const { amount, cardToken, saveCard } = req.body;
    
    if (!amount || typeof amount !== 'number' || amount < 10) {
      return res.status(400).json({ error: 'Valor mínimo de recarga: R$ 10,00' });
    }

    if (!cardToken) {
      return res.status(400).json({ error: 'Token do cartão é obrigatório' });
    }

    const order = await pagarmeService.createCardOrder({
      customer: {
        name: userName,
        email: userEmail || `${tenantId}@wallet.local`,
        document: '00000000000',
        document_type: 'CPF',
      },
      items: [{
        amount: Math.round(amount * 100),
        description: `Recarga de créditos - Wallet`,
        quantity: 1,
        code: `WALLET_RECHARGE_${tenantId}`,
      }],
      cardToken,
      statementDescriptor: 'EXECUTIVEAI',
    });

    if (order.status === 'paid') {
      const result = await walletService.addFunds(
        tenantId,
        amount,
        `Recarga via Cartão - Pedido ${order.id}`,
        order.id,
        'PAGARME_CARD',
        'CREDIT',
        { orderId: order.id, paymentMethod: 'CARD' }
      );

      if (saveCard && cardToken) {
        await walletService.configureAutoRecharge(tenantId, false, undefined, undefined, cardToken);
      }

      console.log(`[Wallet] Card recharge successful: ${order.id} for tenant ${tenantId}, amount: R$ ${amount}`);

      res.json({
        success: true,
        orderId: order.id,
        amount,
        newBalance: result.newBalance,
        transactionId: result.transactionId,
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Pagamento não aprovado',
        status: order.status,
      });
    }
  } catch (error: any) {
    console.error('[Wallet] Error creating card recharge:', error);
    res.status(500).json({ error: error.message || 'Erro ao processar pagamento' });
  }
});

router.post('/auto-recharge', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const { enabled, triggerAmount, rechargeAmount } = req.body;

    if (enabled) {
      if (!triggerAmount || triggerAmount < 0) {
        return res.status(400).json({ error: 'Valor de gatilho inválido' });
      }
      if (!rechargeAmount || rechargeAmount < 10) {
        return res.status(400).json({ error: 'Valor mínimo de recarga automática: R$ 10,00' });
      }
    }

    const success = await walletService.configureAutoRecharge(
      tenantId,
      enabled,
      triggerAmount,
      rechargeAmount
    );

    if (success) {
      res.json({ success: true, message: 'Configuração atualizada' });
    } else {
      res.status(500).json({ error: 'Erro ao atualizar configuração' });
    }
  } catch (error: any) {
    console.error('[Wallet] Error configuring auto-recharge:', error);
    res.status(500).json({ error: 'Erro ao configurar recarga automática' });
  }
});

router.post('/webhook/pagarme', async (req, res) => {
  try {
    const { type, data, id: eventId } = req.body;

    console.log(`[Wallet Webhook] Received: ${type}, eventId: ${eventId}`);

    // Idempotency check - prevent duplicate processing
    if (eventId && walletService.isWebhookProcessed(eventId)) {
      console.log(`[Wallet Webhook] Event ${eventId} already processed, returning cached result`);
      return res.json({ received: true, cached: true });
    }

    if (type === 'order.paid') {
      const order = data;
      const item = order.items?.[0];
      
      if (item?.code?.startsWith('WALLET_RECHARGE_')) {
        const tenantId = item.code.replace('WALLET_RECHARGE_', '');
        const amount = order.amount / 100;

        const result = await walletService.addFunds(
          tenantId,
          amount,
          `Recarga via PIX - Pedido ${order.id}`,
          order.id,
          'PAGARME_PIX',
          'CREDIT',
          { orderId: order.id, paymentMethod: 'PIX', eventId }
        );

        // Mark event as processed
        if (eventId) {
          walletService.markWebhookProcessed(eventId, result);
        }

        console.log(`[Wallet Webhook] PIX recharge credited: R$ ${amount} to tenant ${tenantId}`);
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('[Wallet Webhook] Error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.post('/admin/add-credit', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const adminTenantId = req.user?.tenantId;
    
    const { targetTenantId, amount, description, type = 'BONUS' } = req.body;

    if (!targetTenantId || !amount || !description) {
      return res.status(400).json({ error: 'Campos obrigatórios: targetTenantId, amount, description' });
    }

    const result = await walletService.addFunds(
      targetTenantId,
      amount,
      description,
      `ADMIN_${adminTenantId}`,
      'ADMIN_CREDIT',
      type,
      { addedBy: adminTenantId }
    );

    if (result.success) {
      res.json({
        success: true,
        transactionId: result.transactionId,
        newBalance: result.newBalance,
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('[Wallet] Error adding admin credit:', error);
    res.status(500).json({ error: 'Erro ao adicionar crédito' });
  }
});

router.post('/admin/update-price', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { serviceCode, serviceName, price, costPrice, description } = req.body;

    if (!serviceCode || !serviceName || price === undefined) {
      return res.status(400).json({ error: 'Campos obrigatórios: serviceCode, serviceName, price' });
    }

    const success = await walletService.createServicePrice(
      serviceCode,
      serviceName,
      price,
      costPrice || 0,
      description
    );

    if (success) {
      res.json({ success: true, message: 'Preço atualizado' });
    } else {
      res.status(500).json({ error: 'Erro ao atualizar preço' });
    }
  } catch (error: any) {
    console.error('[Wallet] Error updating price:', error);
    res.status(500).json({ error: 'Erro ao atualizar preço' });
  }
});

router.post('/initialize-prices', async (req, res) => {
  try {
    await walletService.initializeDefaultPrices();
    res.json({ success: true, message: 'Preços padrão inicializados' });
  } catch (error: any) {
    console.error('[Wallet] Error initializing prices:', error);
    res.status(500).json({ error: 'Erro ao inicializar preços' });
  }
});

export default router;
