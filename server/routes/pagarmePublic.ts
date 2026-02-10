import { Router } from 'express';
import { pagarmeService, PagarmeSplitRule } from '../services/pagarme';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import {
  calculateResellerCommission,
  getCompanyRecipientId,
  getResellerRecipientId,
  saveCompanyRecipientId,
  CommissionResult,
} from '../services/commission';

const router = Router();

interface ProductValidationResult {
  valid: boolean;
  product?: any;
  error?: string;
  serverAmount?: number;
  resellerId?: string;
  companyId?: string;
}

async function validateProduct(storeId: string, productId: string, quantity: number): Promise<ProductValidationResult> {
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

    // First try to find store by slug in reseller_stores table
    let storeData: any = null;
    
    const { data: storeBySlug } = await supabase
      .from('reseller_stores')
      .select('reseller_id, is_published, product_ids')
      .eq('store_slug', storeId)
      .eq('is_published', true)
      .single();

    if (storeBySlug) {
      storeData = storeBySlug;
    } else {
      // Try to find store by reseller_id
      const { data: storeById } = await supabase
        .from('reseller_stores')
        .select('reseller_id, is_published, product_ids')
        .eq('reseller_id', storeId)
        .eq('is_published', true)
        .single();
      
      if (storeById) {
        storeData = storeById;
      }
    }

    if (!storeData) {
      console.log('[Pagar.me Public] Store not found for storeId:', storeId);
      return { valid: false, error: 'Loja não encontrada' };
    }

    console.log('[Pagar.me Public] Found store with reseller_id:', storeData.reseller_id);

    // Check if product is in this store's products
    if (!storeData.product_ids || !storeData.product_ids.includes(productId)) {
      console.log('[Pagar.me Public] Product not in store:', { productId, storeProductIds: storeData.product_ids });
      return { valid: false, error: 'Produto não encontrado nesta loja' };
    }

    // Fetch the product from products table
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, description, price')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.log('[Pagar.me Public] Product not found:', { productId, error: productError });
      return { valid: false, error: 'Produto não encontrado ou indisponível' };
    }

    const serverAmount = Math.round(product.price * 100 * quantity);
    console.log('[Pagar.me Public] Product validated:', { name: product.description, price: product.price, serverAmount });

    return { 
      valid: true, 
      product: { ...product, name: product.description }, 
      serverAmount,
      resellerId: storeData.reseller_id,
      companyId: undefined
    };
  } catch (error) {
    console.error('[Pagar.me Public] Product validation error:', error);
    return { valid: false, error: 'Erro ao validar produto' };
  }
}

async function buildSplitRules(resellerId: string): Promise<{
  split: PagarmeSplitRule[] | null;
  commission: CommissionResult | null;
}> {
  try {
    const [companyRecipientId, resellerRecipientId, commission] = await Promise.all([
      getCompanyRecipientId(),
      getResellerRecipientId(resellerId),
      calculateResellerCommission(resellerId),
    ]);

    if (!companyRecipientId || !resellerRecipientId) {
      console.log('[Split] Missing recipient IDs - company:', companyRecipientId, 'reseller:', resellerRecipientId);
      return { split: null, commission };
    }

    const split: PagarmeSplitRule[] = [
      {
        amount: commission.resellerPercentage,
        recipient_id: resellerRecipientId,
        type: 'percentage',
        options: {
          charge_processing_fee: false,
          charge_remainder_fee: false,
          liable: false,
        },
      },
      {
        amount: commission.companyPercentage,
        recipient_id: companyRecipientId,
        type: 'percentage',
        options: {
          charge_processing_fee: true,
          charge_remainder_fee: true,
          liable: true,
        },
      },
    ];

    console.log(`[Split] Built split rules: ${commission.tierName} (${commission.resellerPercentage}%/${commission.companyPercentage}%)`);
    return { split, commission };
  } catch (error) {
    console.error('[Split] Error building split rules:', error);
    return { split: null, commission: null };
  }
}

async function saveSaleToSupabase(saleData: {
  productId: string;
  resellerId: string;
  companyId?: string;
  paymentMethod: string;
  totalAmount: number;
  quantity: number;
  customerName?: string;
  customerEmail?: string;
  customerDocument?: string;
  pagarmeOrderId: string;
  pagarmeChargeId?: string;
  status: string;
  commission?: CommissionResult | null;
}): Promise<{ success: boolean; saleId?: string; error?: string }> {
  try {
    const configPath = path.join(process.cwd(), 'data', 'supabase-config.json');
    if (!fs.existsSync(configPath)) {
      console.error('[SaveSale] Config file not found');
      return { success: false, error: 'Configuração não encontrada' };
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const supabaseUrl = config.url || config.supabaseUrl;
    const supabaseKey = config.serviceRoleKey || config.anonKey || config.supabaseAnonKey;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[SaveSale] Supabase credentials not configured');
      return { success: false, error: 'Credenciais não configuradas' };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const totalAmountReais = saleData.totalAmount / 100;
    
    const resellerPercentage = saleData.commission?.resellerPercentage ?? 70;
    const companyPercentage = saleData.commission?.companyPercentage ?? 30;
    const tierName = saleData.commission?.tierName ?? 'Padrão';
    
    const resellerAmount = totalAmountReais * (resellerPercentage / 100);
    const companyAmount = totalAmountReais * (companyPercentage / 100);

    const paidStatuses = ['paid', 'captured', 'authorized'];
    const isPaid = paidStatuses.includes(saleData.status?.toLowerCase() || '');
    const saleStatus = isPaid ? 'confirmada' : 'aguardando_pagamento';

    const saleRecord = {
      product_id: saleData.productId,
      reseller_id: saleData.resellerId,
      company_id: saleData.companyId || null,
      payment_method: saleData.paymentMethod,
      status: saleStatus,
      total_amount: totalAmountReais,
      reseller_amount: resellerAmount,
      company_amount: companyAmount,
      commission_percentage: resellerPercentage,
      quantity: saleData.quantity,
      paid: isPaid,
      paid_at: isPaid ? new Date().toISOString() : null,
      pagarme_order_id: saleData.pagarmeOrderId,
      pagarme_charge_id: saleData.pagarmeChargeId || null,
      customer_name: saleData.customerName || null,
      customer_email: saleData.customerEmail || null,
      customer_document: saleData.customerDocument || null,
      created_at: new Date().toISOString(),
    };

    console.log('[SaveSale] Saving sale with dynamic commission:', {
      tier: tierName,
      resellerPercentage,
      companyPercentage,
      resellerAmount,
      companyAmount,
    });

    const { data, error } = await supabase
      .from('sales_with_split')
      .insert(saleRecord)
      .select('id')
      .single();

    if (error) {
      console.error('[SaveSale] Error saving sale:', error);
      return { success: false, error: error.message };
    }

    console.log('[SaveSale] Sale saved successfully:', data?.id);
    return { success: true, saleId: data?.id };
  } catch (error: any) {
    console.error('[SaveSale] Exception:', error);
    return { success: false, error: error.message };
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
  // Validate phone - Pagar.me requires at least one phone
  if (!customer.phone || typeof customer.phone !== 'string') {
    return { valid: false, error: 'Telefone do cliente é obrigatório' };
  }
  const phoneClean = customer.phone.replace(/\D/g, '');
  if (phoneClean.length < 10 || phoneClean.length > 11) {
    return { valid: false, error: 'Telefone inválido (DDD + número)' };
  }
  return { valid: true };
}

// Convert phone string to Pagar.me format
function formatPhoneForPagarme(phone: string) {
  const phoneClean = phone.replace(/\D/g, '');
  // Brazilian phone: DDD (2 digits) + number (8-9 digits)
  const areaCode = phoneClean.slice(0, 2);
  const number = phoneClean.slice(2);
  return {
    mobile_phone: {
      country_code: '55',
      area_code: areaCode,
      number: number,
    }
  };
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

    // Add phones in Pagar.me format
    const customerWithPhone = {
      ...customer,
      phones: formatPhoneForPagarme(customer.phone),
    };

    // Build split rules based on dynamic commission
    let splitRules: PagarmeSplitRule[] | undefined;
    let commissionResult: CommissionResult | null = null;
    
    if (productValidation.resellerId) {
      const { split, commission } = await buildSplitRules(productValidation.resellerId);
      if (split) {
        splitRules = split;
        console.log('[Pagar.me Public] PIX with Split enabled');
      }
      commissionResult = commission;
    }

    const order = await pagarmeService.createPixOrder({
      customer: customerWithPhone,
      items,
      expiresIn: expiresIn || 86400,
      split: splitRules,
    });

    const pixCharge = order.charges?.[0];
    const pixTransaction = pixCharge?.last_transaction;

    console.log(`[Pagar.me Public] PIX order created: ${order.id}${splitRules ? ' (with Split)' : ''}`);

    // Save sale to Supabase
    if (productValidation.resellerId) {
      const saveResult = await saveSaleToSupabase({
        productId,
        resellerId: productValidation.resellerId,
        companyId: productValidation.companyId,
        paymentMethod: 'pix',
        totalAmount: productValidation.serverAmount!,
        quantity: quantity || 1,
        customerName: customer.name,
        customerEmail: customer.email,
        customerDocument: customer.document,
        pagarmeOrderId: order.id,
        pagarmeChargeId: pixCharge?.id,
        status: order.status,
        commission: commissionResult,
      });
      
      if (!saveResult.success) {
        console.error('[Pagar.me Public] Failed to save sale:', saveResult.error);
      } else {
        console.log('[Pagar.me Public] Sale saved with ID:', saveResult.saleId);
      }
    }

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

    console.log('[Pagar.me Public] Card payment request:', JSON.stringify({ storeId, productId, quantity, cardToken: cardToken ? 'present' : 'missing', customer: customer ? 'present' : 'missing', items: items?.length }, null, 2));

    if (!storeId || typeof storeId !== 'string') {
      console.log('[Pagar.me Public] Validation failed: storeId missing');
      return res.status(400).json({ error: 'storeId é obrigatório' });
    }

    if (!productId || typeof productId !== 'string') {
      console.log('[Pagar.me Public] Validation failed: productId missing');
      return res.status(400).json({ error: 'productId é obrigatório' });
    }

    const customerValidation = await validateCustomer(customer);
    if (!customerValidation.valid) {
      console.log('[Pagar.me Public] Validation failed: customer -', customerValidation.error);
      return res.status(400).json({ error: customerValidation.error });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log('[Pagar.me Public] Validation failed: items missing or empty');
      return res.status(400).json({ error: 'Items são obrigatórios' });
    }

    if (!cardToken || typeof cardToken !== 'string') {
      console.log('[Pagar.me Public] Validation failed: cardToken missing');
      return res.status(400).json({ error: 'cardToken é obrigatório' });
    }

    console.log('[Pagar.me Public] Starting product validation for card payment...');
    const productValidation = await validateProduct(storeId, productId, quantity || 1);
    if (!productValidation.valid) {
      console.log('[Pagar.me Public] Validation failed: product -', productValidation.error);
      return res.status(400).json({ error: productValidation.error });
    }

    const clientAmount = items.reduce((sum: number, item: any) => sum + (item.amount * (item.quantity || 1)), 0);
    console.log('[Pagar.me Public] Price validation:', { clientAmount, serverAmount: productValidation.serverAmount });
    if (clientAmount !== productValidation.serverAmount) {
      console.error(`[Pagar.me Public] Price mismatch: client=${clientAmount}, server=${productValidation.serverAmount}`);
      return res.status(400).json({ error: 'Valor do produto não confere. Atualize a página e tente novamente.' });
    }

    items[0].amount = productValidation.serverAmount;
    items[0].description = productValidation.product.name;

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

    // Add phones in Pagar.me format
    const customerWithPhone = {
      ...customer,
      phones: formatPhoneForPagarme(customer.phone),
    };

    // Build split rules based on dynamic commission
    let splitRules: PagarmeSplitRule[] | undefined;
    let commissionResult: CommissionResult | null = null;
    
    if (productValidation.resellerId) {
      const { split, commission } = await buildSplitRules(productValidation.resellerId);
      if (split) {
        splitRules = split;
        console.log('[Pagar.me Public] Card with Split enabled');
      }
      commissionResult = commission;
    }

    const order = await pagarmeService.createCardOrder({
      customer: customerWithPhone,
      items,
      cardToken,
      installments: installments || 1,
      statementDescriptor: statementDescriptor || 'NEXUS',
      split: splitRules,
    });

    const cardCharge = order.charges?.[0];

    console.log(`[Pagar.me Public] Card order created: ${order.id}${splitRules ? ' (with Split)' : ''}, chargeStatus: ${cardCharge?.status}, orderStatus: ${order.status}`);

    // Save sale to Supabase
    if (productValidation.resellerId) {
      const saveResult = await saveSaleToSupabase({
        productId,
        resellerId: productValidation.resellerId,
        companyId: productValidation.companyId,
        paymentMethod: 'cartao',
        totalAmount: productValidation.serverAmount!,
        quantity: quantity || 1,
        customerName: customer.name,
        customerEmail: customer.email,
        customerDocument: customer.document,
        pagarmeOrderId: order.id,
        pagarmeChargeId: cardCharge?.id,
        status: cardCharge?.status || order.status,
        commission: commissionResult,
      });
      
      if (!saveResult.success) {
        console.error('[Pagar.me Public] Failed to save sale:', saveResult.error);
      } else {
        console.log('[Pagar.me Public] Sale saved with ID:', saveResult.saleId);
      }
    }

    // Determine if payment was actually approved
    const chargeStatus = cardCharge?.status?.toLowerCase() || order.status?.toLowerCase();
    const paidStatuses = ['paid', 'captured', 'authorized', 'pending'];
    const failedStatuses = ['failed', 'declined', 'canceled', 'voided', 'error'];
    const isPaymentSuccess = paidStatuses.includes(chargeStatus) && !failedStatuses.includes(chargeStatus);

    res.json({
      success: true,
      paymentSuccess: isPaymentSuccess,
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

router.post('/setup-company-recipient', async (req, res) => {
  try {
    const existingRecipientId = await getCompanyRecipientId();
    if (existingRecipientId) {
      console.log('[Pagar.me Public] Company recipient already exists:', existingRecipientId);
      return res.json({
        success: true,
        message: 'Recipient da empresa já existe',
        recipientId: existingRecipientId,
        alreadyExists: true,
      });
    }

    const recipient = await pagarmeService.createCorporateRecipient({
      code: 'NEXUS_COMPANY',
      company_name: '53.462.690 DAVI DE OLIVEIRA EMERICK',
      trading_name: 'Nexus Intelligence',
      email: 'daviemericko@gmail.com',
      document: '53.462.690/0001-67',
      corporation_type: 'MEI',
      founding_date: '2024-01-01',
      main_address: {
        street: 'Rua Seringueira',
        number: '350',
        neighborhood: 'Nova Gameleira',
        city: 'Belo Horizonte',
        state: 'MG',
        zip_code: '30510-690',
      },
      managing_partners: [
        {
          name: 'Davi de Oliveira Emerick',
          email: 'daviemericko@gmail.com',
          document: '14515566679',
          type: 'individual',
          birthdate: '2000-01-10',
          monthly_income: 10000,
          professional_occupation: 'Empresário',
          address: {
            street: 'Rua Seringueira',
            number: '350',
            neighborhood: 'Nova Gameleira',
            city: 'Belo Horizonte',
            state: 'MG',
            zip_code: '30510-690',
          },
          phone_numbers: [
            {
              ddd: '31',
              number: '992267220',
              type: 'mobile',
            },
          ],
        },
      ],
      bank_account: {
        holder_name: '53.462.690 DAVI DE OLIVEIRA EMERICK',
        holder_document: '53.462.690/0001-67',
        bank: '336',
        branch_number: '0001',
        account_number: '12580555-1',
        account_check_digit: '1',
        type: 'checking',
      },
    });

    console.log('[Pagar.me Public] Company recipient created:', recipient.id);

    const saved = await saveCompanyRecipientId(recipient.id);
    if (!saved) {
      console.error('[Pagar.me Public] Failed to save company recipient ID to database');
    }

    res.json({
      success: true,
      message: 'Recipient da empresa criado com sucesso',
      recipientId: recipient.id,
      recipientCode: recipient.code,
      status: recipient.status,
    });
  } catch (error: any) {
    console.error('[Pagar.me Public] Setup company recipient error:', error.message);
    res.status(500).json({ error: error.message || 'Erro ao criar recipient da empresa' });
  }
});

router.get('/company-recipient', async (req, res) => {
  try {
    const recipientId = await getCompanyRecipientId();
    
    if (!recipientId) {
      return res.json({
        success: true,
        configured: false,
        message: 'Recipient da empresa não configurado',
      });
    }

    const recipient = await pagarmeService.getRecipient(recipientId);

    res.json({
      success: true,
      configured: true,
      recipientId: recipient.id,
      status: recipient.status,
      email: recipient.email,
    });
  } catch (error: any) {
    console.error('[Pagar.me Public] Get company recipient error:', error.message);
    res.status(500).json({ error: error.message || 'Erro ao buscar recipient da empresa' });
  }
});

export default router;
