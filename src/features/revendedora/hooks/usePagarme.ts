import { useState, useCallback } from 'react';

interface PagarmeConfig {
  configured: boolean;
  publicKey: string | null;
}

interface Customer {
  name: string;
  email: string;
  document: string;
  phone?: string;
}

interface Item {
  amount: number;
  description: string;
  quantity: number;
  code?: string;
}

interface PixOrderResult {
  success: boolean;
  orderId: string;
  orderCode: string;
  status: string;
  chargeId: string;
  chargeStatus: string;
  pix: {
    qrCode: string;
    qrCodeUrl: string;
    expiresAt: string;
  };
  amount: number;
}

interface CardOrderResult {
  success: boolean;
  orderId: string;
  orderCode: string;
  status: string;
  chargeId: string;
  chargeStatus: string;
  amount: number;
}

interface OrderStatus {
  id: string;
  code: string;
  status: string;
  amount: number;
  charges: Array<{
    id: string;
    status: string;
    paymentMethod: string;
    amount: number;
  }>;
}

interface TokenizeResult {
  success: boolean;
  tokenId: string;
  type: string;
}

export function usePagarme() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getConfig = useCallback(async (): Promise<PagarmeConfig> => {
    try {
      const response = await fetch('/api/pagarme/config');
      const data = await response.json();
      return data;
    } catch (err: any) {
      console.error('[usePagarme] Config error:', err);
      return { configured: false, publicKey: null };
    }
  }, []);

  const tokenizeCard = useCallback(async (card: {
    number: string;
    holder_name: string;
    holder_document?: string;
    exp_month: number;
    exp_year: number;
    cvv: string;
  }): Promise<TokenizeResult | null> => {
    try {
      const response = await fetch('/api/pagarme/tokenize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao tokenizar cartão');
      }

      return data;
    } catch (err: any) {
      console.error('[usePagarme] Tokenize error:', err);
      throw err;
    }
  }, []);

  const createPixOrder = useCallback(async (
    customer: Customer,
    items: Item[],
    expiresIn?: number
  ): Promise<PixOrderResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const customerData: any = {
        name: customer.name,
        email: customer.email,
        document: customer.document,
        document_type: 'CPF',
        type: 'individual',
      };

      if (customer.phone) {
        const phoneClean = customer.phone.replace(/\D/g, '');
        if (phoneClean.length >= 10) {
          customerData.phones = {
            mobile_phone: {
              country_code: '55',
              area_code: phoneClean.substring(0, 2),
              number: phoneClean.substring(2),
            },
          };
        }
      }

      const response = await fetch('/api/pagarme/orders/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customerData,
          items,
          expiresIn: expiresIn || 86400,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar pedido PIX');
      }

      return data;
    } catch (err: any) {
      setError(err.message);
      console.error('[usePagarme] PIX order error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCardOrderWithToken = useCallback(async (
    customer: Customer,
    items: Item[],
    cardToken: string,
    installments?: number
  ): Promise<CardOrderResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const customerData: any = {
        name: customer.name,
        email: customer.email,
        document: customer.document,
        document_type: 'CPF',
        type: 'individual',
      };

      if (customer.phone) {
        const phoneClean = customer.phone.replace(/\D/g, '');
        if (phoneClean.length >= 10) {
          customerData.phones = {
            mobile_phone: {
              country_code: '55',
              area_code: phoneClean.substring(0, 2),
              number: phoneClean.substring(2),
            },
          };
        }
      }

      const response = await fetch('/api/pagarme/orders/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customerData,
          items,
          cardToken,
          installments: installments || 1,
          statementDescriptor: 'NEXUS',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar cartão');
      }

      return data;
    } catch (err: any) {
      setError(err.message);
      console.error('[usePagarme] Card order error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCardOrder = useCallback(async (
    customer: Customer,
    items: Item[],
    card: {
      number: string;
      holder_name: string;
      holder_document?: string;
      exp_month: number;
      exp_year: number;
      cvv: string;
    },
    installments?: number
  ): Promise<CardOrderResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const tokenResult = await tokenizeCard({
        number: card.number,
        holder_name: card.holder_name,
        holder_document: card.holder_document,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
        cvv: card.cvv,
      });

      if (!tokenResult || !tokenResult.tokenId) {
        throw new Error('Falha ao tokenizar cartão');
      }

      const result = await createCardOrderWithToken(customer, items, tokenResult.tokenId, installments);
      return result;
    } catch (err: any) {
      setError(err.message);
      console.error('[usePagarme] Card order error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tokenizeCard, createCardOrderWithToken]);

  const getOrderStatus = useCallback(async (orderId: string): Promise<OrderStatus | null> => {
    try {
      const response = await fetch(`/api/pagarme/orders/${orderId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar status do pedido');
      }

      return data.order;
    } catch (err: any) {
      console.error('[usePagarme] Get order error:', err);
      return null;
    }
  }, []);

  const cancelOrder = useCallback(async (orderId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pagarme/orders/${orderId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cancelar pedido');
      }

      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('[usePagarme] Cancel order error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getConfig,
    tokenizeCard,
    createPixOrder,
    createCardOrder,
    createCardOrderWithToken,
    getOrderStatus,
    cancelOrder,
  };
}
