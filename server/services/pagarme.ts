import fetch from 'node-fetch';

const PAGARME_API_URL = 'https://api.pagar.me/core/v5';

interface PagarmeCustomer {
  name: string;
  email: string;
  document: string;
  document_type?: 'CPF' | 'CNPJ';
  type?: 'individual' | 'company';
  phones?: {
    mobile_phone?: {
      country_code: string;
      area_code: string;
      number: string;
    };
  };
  address?: {
    country: string;
    state: string;
    city: string;
    zip_code: string;
    line_1: string;
    line_2?: string;
  };
}

interface PagarmeItem {
  amount: number;
  description: string;
  quantity: number;
  code?: string;
}

interface CreatePixOrderParams {
  customer: PagarmeCustomer;
  items: PagarmeItem[];
  expiresIn?: number;
}

interface CreateCardOrderParams {
  customer: PagarmeCustomer;
  items: PagarmeItem[];
  cardToken: string;
  installments?: number;
  statementDescriptor?: string;
}

interface CreateCardOrderWithDataParams {
  customer: PagarmeCustomer;
  items: PagarmeItem[];
  card: {
    number: string;
    holder_name: string;
    exp_month: number;
    exp_year: number;
    cvv: string;
  };
  installments?: number;
  statementDescriptor?: string;
}

interface PagarmeOrderResponse {
  id: string;
  code: string;
  amount: number;
  currency: string;
  status: string;
  charges: Array<{
    id: string;
    amount: number;
    status: string;
    payment_method: string;
    last_transaction?: {
      id: string;
      qr_code?: string;
      qr_code_url?: string;
      expires_at?: string;
    };
  }>;
  customer: any;
  created_at: string;
}

export class PagarmeService {
  private secretKey: string;
  private publicKey: string;

  constructor() {
    this.secretKey = process.env.CHAVE_SECRETA || '';
    this.publicKey = process.env.CHAVE_PUBLICA || '';

    if (!this.secretKey) {
      console.warn('[Pagar.me] CHAVE_SECRETA não configurada');
    }
    if (!this.publicKey) {
      console.warn('[Pagar.me] CHAVE_PUBLICA não configurada');
    }
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.secretKey}:`).toString('base64');
    return `Basic ${credentials}`;
  }

  private async request<T>(endpoint: string, method: string = 'GET', body?: any): Promise<T> {
    const url = `${PAGARME_API_URL}${endpoint}`;
    
    console.log(`[Pagar.me] ${method} ${endpoint}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error('[Pagar.me] Error:', data);
      throw new Error(data.message || data.errors?.[0]?.message || 'Erro na API do Pagar.me');
    }

    return data as T;
  }

  async createPixOrder(params: CreatePixOrderParams): Promise<PagarmeOrderResponse> {
    const totalAmount = params.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);

    const orderData = {
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        document: params.customer.document.replace(/\D/g, ''),
        document_type: params.customer.document_type || 'CPF',
        type: params.customer.type || 'individual',
        ...(params.customer.phones && { phones: params.customer.phones }),
        ...(params.customer.address && { address: params.customer.address }),
      },
      items: params.items.map(item => ({
        amount: item.amount,
        description: item.description,
        quantity: item.quantity,
        code: item.code || 'ITEM',
      })),
      payments: [
        {
          payment_method: 'pix',
          pix: {
            expires_in: params.expiresIn || 86400,
          },
        },
      ],
    };

    console.log('[Pagar.me] Creating PIX order');

    return this.request<PagarmeOrderResponse>('/orders', 'POST', orderData);
  }

  async createCardOrder(params: CreateCardOrderParams): Promise<PagarmeOrderResponse> {
    const orderData = {
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        document: params.customer.document.replace(/\D/g, ''),
        document_type: params.customer.document_type || 'CPF',
        type: params.customer.type || 'individual',
        ...(params.customer.phones && { phones: params.customer.phones }),
        ...(params.customer.address && { address: params.customer.address }),
      },
      items: params.items.map(item => ({
        amount: item.amount,
        description: item.description,
        quantity: item.quantity,
        code: item.code || 'ITEM',
      })),
      payments: [
        {
          payment_method: 'credit_card',
          credit_card: {
            installments: params.installments || 1,
            statement_descriptor: params.statementDescriptor || 'NEXUS',
            card_token: params.cardToken,
          },
        },
      ],
    };

    console.log('[Pagar.me] Creating Card order with token');

    return this.request<PagarmeOrderResponse>('/orders', 'POST', orderData);
  }

  /** @deprecated Use tokenization + createCardOrder instead. This method sends raw card data. */
  async createCardOrderWithData(params: CreateCardOrderWithDataParams): Promise<PagarmeOrderResponse> {
    console.warn('[Pagar.me] SECURITY WARNING: Using deprecated createCardOrderWithData with raw card data. Migrate to tokenization.');
    const orderData = {
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        document: params.customer.document.replace(/\D/g, ''),
        document_type: params.customer.document_type || 'CPF',
        type: params.customer.type || 'individual',
        ...(params.customer.phones && { phones: params.customer.phones }),
        ...(params.customer.address && { address: params.customer.address }),
      },
      items: params.items.map(item => ({
        amount: item.amount,
        description: item.description,
        quantity: item.quantity,
        code: item.code || 'ITEM',
      })),
      payments: [
        {
          payment_method: 'credit_card',
          credit_card: {
            installments: params.installments || 1,
            statement_descriptor: params.statementDescriptor || 'NEXUS',
            card: params.card,
          },
        },
      ],
    };

    return this.request<PagarmeOrderResponse>('/orders', 'POST', orderData);
  }

  async getOrder(orderId: string): Promise<PagarmeOrderResponse> {
    console.log(`[Pagar.me] Getting order: ${orderId}`);
    return this.request<PagarmeOrderResponse>(`/orders/${orderId}`, 'GET');
  }

  async cancelOrder(orderId: string): Promise<PagarmeOrderResponse> {
    return this.request<PagarmeOrderResponse>(`/orders/${orderId}`, 'DELETE');
  }

  async tokenizeCard(card: {
    number: string;
    holder_name: string;
    holder_document: string;
    exp_month: number;
    exp_year: number;
    cvv: string;
  }): Promise<{ id: string; type: string }> {
    const url = `${PAGARME_API_URL}/tokens?appId=${this.publicKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        card,
        type: 'card',
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error('[Pagar.me] Token error:', data);
      throw new Error(data.message || 'Erro ao tokenizar cartão');
    }

    return data;
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  isConfigured(): boolean {
    return !!this.secretKey && !!this.publicKey;
  }
}

export const pagarmeService = new PagarmeService();
