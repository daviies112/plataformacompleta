import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;
let cachedPublishableKey: string | null = null;

export interface CreatePaymentIntentRequest {
  productId: string;
  resellerId: string;
  companyId: string;
  paymentMethod: 'pix' | 'cartao';
  customerData: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface CreatePaymentIntentResponse {
  success: boolean;
  saleId: string;
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  pix?: {
    qrcodeUrl: string;
    qrcodeText: string;
    expiresAt: string;
  };
  split: {
    total: number;
    resellerAmount: number;
    companyAmount: number;
    resellerPercentage: number;
  };
}

async function getStripePublishableKey(): Promise<string | null> {
  if (cachedPublishableKey) {
    return cachedPublishableKey;
  }

  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('/api/stripe/publishable-key');
      if (response.ok) {
        const data = await response.json();
        if (data.publishableKey) {
          cachedPublishableKey = data.publishableKey;
          console.log('[Stripe] Using publishable key from API');
          return cachedPublishableKey;
        }
      }
    } catch (error) {
      lastError = error;
      console.warn(`[Stripe] Attempt ${attempt + 1}/${maxRetries} failed:`, error);
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  if (lastError) {
    console.warn('[Stripe] All API attempts failed:', lastError);
  }

  const envKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (envKey) {
    console.log('[Stripe] Using VITE_STRIPE_PUBLISHABLE_KEY environment variable');
    cachedPublishableKey = envKey;
    return cachedPublishableKey;
  }

  console.error('[Stripe] No publishable key available. Please configure STRIPE_PUBLISHABLE_KEY secret.');
  return null;
}

export class StripeService {
  static async getStripe(): Promise<Stripe | null> {
    if (!stripePromise) {
      const publishableKey = await getStripePublishableKey();
      
      if (!publishableKey) {
        console.error('[Stripe] No publishable key available');
        return null;
      }

      stripePromise = loadStripe(publishableKey);
    }

    return stripePromise;
  }

  /**
   * Cria um Payment Intent via API local
   */
  static async createPaymentIntent(
    request: CreatePaymentIntentRequest
  ): Promise<CreatePaymentIntentResponse> {
    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Erro ao criar payment intent:', data);
        throw new Error(data.error || 'Erro ao criar payment intent');
      }

      return data;
    } catch (error: any) {
      console.error('Erro ao criar payment intent:', error);
      throw new Error(error.message || 'Erro ao criar payment intent');
    }
  }

  /**
   * Confirma pagamento com cartão
   */
  static async confirmCardPayment(
    clientSecret: string,
    elements: StripeElements,
    cardElement: any
  ): Promise<{ success: boolean; error?: string }> {
    const stripe = await this.getStripe();

    if (!stripe) {
      return { success: false, error: 'Stripe não inicializado' };
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });

    if (error) {
      console.error('Erro ao confirmar pagamento:', error);
      return { success: false, error: error.message };
    }

    if (paymentIntent?.status === 'succeeded') {
      return { success: true };
    }

    return { success: false, error: 'Pagamento não concluído' };
  }

  /**
   * Confirma pagamento PIX (apenas retorna client_secret, confirmação via webhook)
   */
  static async confirmPixPayment(
    clientSecret: string
  ): Promise<{ success: boolean; error?: string }> {
    // Para PIX, o pagamento é confirmado via webhook quando o cliente paga
    // Aqui apenas retornamos sucesso para que o QR code possa ser exibido
    return { success: true };
  }

  /**
   * Verifica status de um Payment Intent
   */
  static async retrievePaymentIntent(paymentIntentId: string): Promise<any> {
    const stripe = await this.getStripe();

    if (!stripe) {
      throw new Error('Stripe não inicializado');
    }

    return await stripe.retrievePaymentIntent(paymentIntentId);
  }
}
