import { Router } from 'express';
import { pagarmeService } from '../services/pagarme';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

async function validateProduct(storeId: string, productId: string, quantity: number): Promise<{ valid: boolean; product?: any; error?: string; serverAmount?: number }> {
  try {
    const configPath = path.join(process.cwd(), 'data', 'supabase-config.json');
    if (!fs.existsSync(configPath)) {
      return { valid: false, error: 'Configuração de loja não encontrada' };
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const supabaseUrl = config.url || config.supabaseUrl;
    const supabaseKey = config.anonKey || config.serviceRoleKey || config.supabaseAnonKey;
    
    if (!supabaseUrl || !supabaseKey) {
      return { valid: false, error: 'Credenciais de loja não configuradas' };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: store, error: storeError } = await supabase
      .from('revendedoras')
      .select('id, store_published, store_name')
      .eq('store_id', storeId)
      .single();

    if (storeError || !store) {
      return { valid: false, error: 'Loja não encontrada' };
    }

    if (!store.store_published) {
      return { valid: false, error: 'Loja não está publicada' };
    }

    const { data: product, error: productError } = await supabase
      .from('reseller_products')
      .select('id, name, price, reseller_id, active')
      .eq('id', productId)
      .eq('reseller_id', store.id)
      .eq('active', true)
      .single();

    if (productError || !product) {
      return { valid: false, error: 'Produto não encontrado ou indisponível' };
    }

    const serverAmount = Math.round(product.price * 100 * quantity);

    return { valid: true, product, serverAmount };
  } catch (error) {
    console.error('[Pagar.me Public] Product validation error:', error);
    return { valid: false, error: 'Erro ao validar produto' };
  }
}

async function validateCustomer(customer: any): Promise<{ valid: boolean; error?: string }> {
  if (!customer || typeof customer !== 'object') {
    return { valid: false, error: 'Customer é obrigatório' };
  }
  if (!customer.name || typeof customer.name !== 'string' || customer.name.trim().length < 2) {
    return { valid: false, error: 'Nome do cliente é obrigatório (mínimo 2 caracteres)' };
  }
  if (!customer.email || typeof customer.email !== 'string' || !customer.email.includes('@')) {
    return { valid: false, error: 'Email do cliente é obrigatório e deve ser válido' };
  }
  if (!customer.document || typeof customer.document !== 'string') {
    return { valid: false, error: 'CPF do cliente é obrigatório' };
  }
  const cpfClean = customer.document.replace(/\D/g, '');
  if (cpfClean.length !== 11 && cpfClean.length !== 14) {
    return { valid: false, error: 'CPF/CNPJ inválido' };
  }
  return { valid: true };
}

router.post('/pix', async (req, res) => {
  try {
    const { customer, items, expiresIn, storeId, productId, quantity } = req.body;

    if (!storeId || typeof storeId !== 'string') {
      return res.status(400).json({ error: 'storeId é obrigatório' });
    }

    if (!productId || typeof productId !== 'string') {
      return res.status(400).json({ error: 'productId é obrigatório' });
    }

    const customerValidation = await validateCustomer(customer);
    if (!customerValidation.valid) {
      return res.status(400).json({ error: customerValidation.error });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items são obrigatórios' });
    }

    {
      const productValidation = await validateProduct(storeId, productId, quantity || 1);
      if (!productValidation.valid) {
        return res.status(400).json({ error: productValidation.error });
      }

      const clientAmount = items.reduce((sum: number, item: any) => sum + (item.amount * (item.quantity || 1)), 0);
      if (clientAmount !== productValidation.serverAmount) {
        console.error(`[Pagar.me Public] Price mismatch: client=${clientAmount}, server=${productValidation.serverAmount}`);
        return res.status(400).json({ error: 'Valor do produto não confere. Atualize a página e tente novamente.' });
      }

      items[0].amount = productValidation.serverAmount;
      items[0].description = productValidation.product.name;
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

    console.log(`[Pagar.me Public] PIX order created: ${order.id}`);

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
    console.error('[Pagar.me Public] PIX order error:', error.message);
    res.status(500).json({ error: error.message || 'Erro ao criar pedido PIX' });
  }
});

router.post('/card', async (req, res) => {
  try {
    const { customer, items, cardToken, installments, statementDescriptor, storeId, productId, quantity } = req.body;

    if (!storeId || typeof storeId !== 'string') {
      return res.status(400).json({ error: 'storeId é obrigatório' });
    }

    if (!productId || typeof productId !== 'string') {
      return res.status(400).json({ error: 'productId é obrigatório' });
    }

    const customerValidation = await validateCustomer(customer);
    if (!customerValidation.valid) {
      return res.status(400).json({ error: customerValidation.error });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items são obrigatórios' });
    }

    if (!cardToken || typeof cardToken !== 'string') {
      return res.status(400).json({ error: 'cardToken é obrigatório' });
    }

    {
      const productValidation = await validateProduct(storeId, productId, quantity || 1);
      if (!productValidation.valid) {
        return res.status(400).json({ error: productValidation.error });
      }

      const clientAmount = items.reduce((sum: number, item: any) => sum + (item.amount * (item.quantity || 1)), 0);
      if (clientAmount !== productValidation.serverAmount) {
        console.error(`[Pagar.me Public] Price mismatch: client=${clientAmount}, server=${productValidation.serverAmount}`);
        return res.status(400).json({ error: 'Valor do produto não confere. Atualize a página e tente novamente.' });
      }

      items[0].amount = productValidation.serverAmount;
      items[0].description = productValidation.product.name;
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

    console.log(`[Pagar.me Public] Card order created: ${order.id}`);

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
    console.error('[Pagar.me Public] Card order error:', error.message);
    res.status(500).json({ error: error.message || 'Erro ao processar cartão' });
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

    console.log('[Pagar.me Public] Card tokenized successfully');

    res.json({
      success: true,
      tokenId: token.id,
      type: token.type,
    });
  } catch (error: any) {
    console.error('[Pagar.me Public] Tokenize error:', error.message);
    res.status(500).json({ error: error.message || 'Erro ao tokenizar cartão' });
  }
});

router.get('/status/:orderId', async (req, res) => {
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
    console.error('[Pagar.me Public] Get order error:', error.message);
    res.status(500).json({ error: error.message || 'Erro ao buscar pedido' });
  }
});

export default router;
