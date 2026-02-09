import { supabase } from '@/integrations/supabase/client';
import { SplitService } from './SplitService';

export interface CreateSalePayload {
  productId: string;
  resellerId: string;
  companyId: string;
  paymentMethod: 'pix' | 'cartao' | 'dinheiro';
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface CreateSaleResponse {
  success: boolean;
  saleId: string;
  paymentMethod: string;
  status: string;
  message: string;
  clientSecret?: string;
  paymentIntentId?: string;
  
  pix?: {
    qrcodeUrl: string;
    qrcodeText: string;
    expiresAt: string;
  };
  
  card?: {
    paymentUrl: string;
    secureUrl: string;
  };
  
  split?: {
    total: number;
    resellerAmount: number;
    companyAmount: number;
    resellerPercentage: number;
  };
}

export class PaymentService {
  
  /**
   * Cria uma nova venda com split automático
   */
  static async createSale(payload: CreateSalePayload): Promise<CreateSaleResponse> {
    try {
      // 1. Buscar dados do produto
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', payload.productId)
        .single();
      
      if (productError || !product) {
        throw new Error('Produto não encontrado');
      }
      
      // 2. Calcular split
      const split = SplitService.calculateSplit(product.price, 70);
      
      // 3. Para DINHEIRO, criar venda diretamente confirmada
      if (payload.paymentMethod === 'dinheiro') {
        const { data: sale, error: saleError } = await (supabase as any)
          .from('sales_with_split')
          .insert({
            product_id: payload.productId,
            reseller_id: payload.resellerId,
            company_id: payload.companyId,
            payment_method: 'dinheiro',
            status: 'confirmada',
            total_amount: split.totalAmount,
            reseller_amount: split.resellerAmount,
            company_amount: split.companyAmount,
            commission_percentage: split.resellerPercentage,
            paid: true,
            paid_at: new Date().toISOString(),
            customer_name: payload.customerName,
            customer_email: payload.customerEmail,
            customer_phone: payload.customerPhone,
            gateway_type: 'manual',
          })
          .select()
          .single();
        
        if (saleError) {
          throw new Error(`Erro ao criar venda: ${saleError.message}`);
        }
        
        // Confirm payment on server to decrease stock (use forceStockDecrement since sale is already marked as paid)
        try {
          await fetch('/api/payments/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ saleId: sale.id, productId: payload.productId, forceStockDecrement: true })
          });
        } catch (confirmError) {
          console.error('Error confirming cash payment:', confirmError);
        }
        
        return {
          success: true,
          saleId: sale.id,
          paymentMethod: 'dinheiro',
          status: 'confirmada',
          message: 'Venda confirmada com sucesso (dinheiro)',
          split: {
            total: split.totalAmount,
            resellerAmount: split.resellerAmount,
            companyAmount: split.companyAmount,
            resellerPercentage: split.resellerPercentage
          }
        };
      }
      
      // 4. Para PIX ou CARTÃO, usar API local para Pagar.me
      const response = await fetch('/api/pagarme/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: payload.productId,
          resellerId: payload.resellerId,
          companyId: payload.companyId,
          paymentMethod: payload.paymentMethod,
          customerData: {
            name: payload.customerName,
            email: payload.customerEmail,
            phone: payload.customerPhone,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta do servidor:', response.status, errorText);
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || 'Erro ao processar pagamento');
        } catch {
          throw new Error(`Erro do servidor (${response.status}): ${errorText || 'Sem resposta'}`);
        }
      }

      const pagarmeData = await response.json();

      if (!response.ok || !pagarmeData.success) {
        console.error('Erro ao criar payment intent:', pagarmeData);
        throw new Error(pagarmeData.error || 'Erro ao criar pagamento no Pagar.me');
      }

      return {
        success: true,
        saleId: pagarmeData.saleId,
        paymentMethod: payload.paymentMethod,
        status: 'aguardando_pagamento',
        message: 'Pagamento criado com sucesso',
        clientSecret: pagarmeData.clientSecret,
        paymentIntentId: pagarmeData.paymentIntentId,
        ...(payload.paymentMethod === 'pix' && pagarmeData.pix && {
          pix: pagarmeData.pix
        }),
        split: pagarmeData.split,
      };
      
    } catch (error) {
      console.error('Erro ao criar venda:', error);
      throw error;
    }
  }
  
  /**
   * Consulta status de uma venda
   */
  static async getSaleStatus(saleId: string) {
    const { data: sale, error } = await (supabase as any)
      .from('sales_with_split')
      .select('*')
      .eq('id', saleId)
      .single();
    
    if (error) {
      throw new Error(`Erro ao buscar venda: ${error.message}`);
    }
    
    return {
      saleId: sale.id,
      status: sale.status,
      paid: sale.paid,
      paidAt: sale.paid_at,
      totalAmount: sale.total_amount,
      paymentMethod: sale.payment_method
    };
  }
  
  /**
   * Simula pagamento aprovado (para testes - apenas desenvolvimento)
   */
  static async simulatePaymentApproval(saleId: string) {
    const { data: sale, error } = await (supabase as any)
      .from('sales_with_split')
      .update({
        status: 'confirmada',
        paid: true,
        paid_at: new Date().toISOString()
      })
      .eq('id', saleId)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Erro ao aprovar pagamento: ${error.message}`);
    }
    
    return {
      success: true,
      message: 'Pagamento aprovado com sucesso',
      sale
    };
  }
}
