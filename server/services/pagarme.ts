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

export interface PagarmeSplitRule {
  amount: number;
  recipient_id: string;
  type: 'percentage' | 'flat';
  options?: {
    charge_processing_fee?: boolean;
    charge_remainder_fee?: boolean;
    liable?: boolean;
  };
}

interface CreatePixOrderParams {
  customer: PagarmeCustomer;
  items: PagarmeItem[];
  expiresIn?: number;
  split?: PagarmeSplitRule[];
}

interface CreateCardOrderParams {
  customer: PagarmeCustomer;
  items: PagarmeItem[];
  cardToken: string;
  installments?: number;
  statementDescriptor?: string;
  split?: PagarmeSplitRule[];
}

export interface RecipientAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  country?: string;
}

export interface RecipientPhone {
  ddd: string;
  number: string;
  type: 'mobile' | 'home' | 'commercial';
}

export interface ManagingPartner {
  name: string;
  email: string;
  document: string;
  type: 'individual';
  mother_name?: string;
  birthdate: string;
  monthly_income?: number;
  professional_occupation?: string;
  address: RecipientAddress;
  phone_numbers: RecipientPhone[];
}

export interface CreateCorporateRecipientParams {
  code?: string;
  company_name: string;
  trading_name: string;
  email: string;
  document: string;
  site_url?: string;
  annual_revenue?: number;
  corporation_type?: string;
  founding_date?: string;
  main_address: RecipientAddress;
  managing_partners: ManagingPartner[];
  bank_account: {
    holder_name: string;
    holder_document: string;
    bank: string;
    branch_number: string;
    branch_check_digit?: string;
    account_number: string;
    account_check_digit: string;
    type: 'checking' | 'savings';
  };
  transfer_settings?: {
    transfer_enabled: boolean;
    transfer_interval: 'daily' | 'weekly' | 'monthly';
    transfer_day: number;
  };
}

export interface CreateIndividualRecipientParams {
  code?: string;
  name: string;
  email: string;
  document: string;
  description?: string;
  mother_name?: string;
  birthdate?: string;
  monthly_income?: number;
  professional_occupation?: string;
  phone?: {
    ddd: string;
    number: string;
  };
  address?: {
    street: string;
    number: string;
    complementary?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
  };
  bank_account: {
    holder_name: string;
    holder_document: string;
    bank: string;
    branch_number: string;
    branch_check_digit?: string;
    account_number: string;
    account_check_digit: string;
    type: 'checking' | 'savings';
  };
  transfer_settings?: {
    transfer_enabled: boolean;
    transfer_interval: 'daily' | 'weekly' | 'monthly';
    transfer_day: number;
  };
}

export interface RecipientResponse {
  id: string;
  code: string;
  name?: string;
  email: string;
  document: string;
  status: string;
  created_at: string;
  updated_at: string;
  default_bank_account?: any;
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
  private accountId: string;

  constructor() {
    // Try production keys first, then test keys
    this.secretKey = process.env.CHAVE_SECRETA_PRODUCAO || process.env.CHAVE_SECRETA_TESTE || process.env.CHAVE_SECRETA || '';
    this.publicKey = process.env.CHAVE_PUBLICA_PRODUCAO || process.env.CHAVE_PUBLICA_TESTE || process.env.CHAVE_PUBLICA || '';
    this.accountId = process.env.CHAVE_ID_PRODUCAO || process.env.CHAVE_ID_TESTE || process.env.CHAVE_ID || '';

    // Determine if using production or test
    const isProduction = !!(process.env.CHAVE_SECRETA_PRODUCAO || process.env.CHAVE_PUBLICA_PRODUCAO);
    const isTest = !!(process.env.CHAVE_SECRETA_TESTE || process.env.CHAVE_PUBLICA_TESTE);
    
    if (isProduction) {
      console.log('[Pagar.me] ✅ Usando credenciais de PRODUÇÃO');
    } else if (isTest) {
      console.log('[Pagar.me] ⚠️ Usando credenciais de TESTE');
    }
    
    if (this.accountId) {
      console.log('[Pagar.me] Account ID configurado:', this.accountId.substring(0, 12) + '...');
    }

    if (!this.secretKey) {
      console.warn('[Pagar.me] Nenhuma chave secreta configurada');
    }
    if (!this.publicKey) {
      console.warn('[Pagar.me] Nenhuma chave pública configurada');
    }
  }
  
  isProductionMode(): boolean {
    return !!(process.env.CHAVE_SECRETA_PRODUCAO);
  }
  
  getAccountId(): string | null {
    return this.accountId || null;
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.secretKey}:`).toString('base64');
    return `Basic ${credentials}`;
  }

  private async request<T>(endpoint: string, method: string = 'GET', body?: any): Promise<T> {
    const url = `${PAGARME_API_URL}${endpoint}`;
    
    console.log(`[Pagar.me] ${method} ${endpoint}`);
    if (body) {
      // Log the full request body (mask sensitive data)
      const logBody = JSON.parse(JSON.stringify(body));
      if (logBody.payments?.[0]?.credit_card?.card_token) {
        logBody.payments[0].credit_card.card_token = logBody.payments[0].credit_card.card_token.substring(0, 10) + '...';
      }
      console.log('[Pagar.me] Request body:', JSON.stringify(logBody, null, 2));
    }

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
    
    // Log full response for debugging
    console.log('[Pagar.me] Response status:', response.status);
    console.log('[Pagar.me] Response body:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('[Pagar.me] Error:', data);
      throw new Error(data.message || data.errors?.[0]?.message || 'Erro na API do Pagar.me');
    }

    return data as T;
  }

  async createPixOrder(params: CreatePixOrderParams): Promise<PagarmeOrderResponse> {
    const totalAmount = params.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);

    // CORREÇÃO: expires_in DEVE ser STRING conforme documentação Pagar.me V5 PSP
    const expiresInSeconds = String(params.expiresIn || 86400);

    const paymentConfig: any = {
      payment_method: 'pix',
      pix: {
        expires_in: expiresInSeconds, // STRING conforme documentação oficial
        additional_information: [
          {
            name: 'Pedido',
            value: 'ExecutiveAI Pro'
          }
        ]
      },
    };

    if (params.split && params.split.length > 0) {
      paymentConfig.split = params.split;
      console.log('[Pagar.me] PIX order with SPLIT:', JSON.stringify(params.split));
    }

    // IMPORTANTE: phones é OBRIGATÓRIO para PIX segundo documentação Pagar.me
    // Se não for fornecido, usamos um fallback padrão para não quebrar
    const customerPhones = params.customer.phones || {
      mobile_phone: {
        country_code: '55',
        area_code: '11',
        number: '999999999',
      }
    };

    if (!params.customer.phones) {
      console.warn('[Pagar.me] WARNING: phones não fornecido para PIX - usando fallback padrão');
    }

    // CORREÇÃO: closed: true é OBRIGATÓRIO conforme documentação Pagar.me V5 PSP
    const orderData = {
      closed: true, // OBRIGATÓRIO para PIX funcionar corretamente
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        document: params.customer.document.replace(/\D/g, ''),
        document_type: params.customer.document_type || 'CPF',
        type: params.customer.type || 'individual',
        phones: customerPhones, // Obrigatório para PIX
        ...(params.customer.address && { address: params.customer.address }),
      },
      items: params.items.map(item => ({
        amount: item.amount,
        description: item.description,
        quantity: item.quantity,
        code: item.code || 'ITEM',
      })),
      payments: [paymentConfig],
    };

    console.log('[Pagar.me] Creating PIX order with closed=true');

    return this.request<PagarmeOrderResponse>('/orders', 'POST', orderData);
  }

  async createCardOrder(params: CreateCardOrderParams): Promise<PagarmeOrderResponse> {
    const billingAddress = params.customer.address || {
      country: 'BR',
      state: 'SP',
      city: 'São Paulo',
      zip_code: '01310100',
      line_1: 'Av Paulista, 1000',
      line_2: 'Apto 1',
    };

    const paymentConfig: any = {
      payment_method: 'credit_card',
      credit_card: {
        installments: params.installments || 1,
        statement_descriptor: params.statementDescriptor || 'NEXUS',
        card_token: params.cardToken,
        card: {
          billing_address: billingAddress,
        },
      },
    };

    if (params.split && params.split.length > 0) {
      paymentConfig.split = params.split;
      console.log('[Pagar.me] Card order with SPLIT:', JSON.stringify(params.split));
    }

    // CORREÇÃO: closed: true é OBRIGATÓRIO conforme documentação Pagar.me V5 PSP
    const orderData = {
      closed: true, // OBRIGATÓRIO para pedidos funcionarem corretamente
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
      payments: [paymentConfig],
    };

    console.log('[Pagar.me] Creating Card order with token and closed=true');

    return this.request<PagarmeOrderResponse>('/orders', 'POST', orderData);
  }

  /** @deprecated Use tokenization + createCardOrder instead. This method sends raw card data. */
  async createCardOrderWithData(params: CreateCardOrderWithDataParams): Promise<PagarmeOrderResponse> {
    console.warn('[Pagar.me] SECURITY WARNING: Using deprecated createCardOrderWithData with raw card data. Migrate to tokenization.');
    // CORREÇÃO: closed: true é OBRIGATÓRIO conforme documentação Pagar.me V5 PSP
    const orderData = {
      closed: true, // OBRIGATÓRIO para pedidos funcionarem corretamente
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

  async createCorporateRecipient(params: CreateCorporateRecipientParams): Promise<RecipientResponse> {
    const recipientData = {
      code: params.code || `corp_${Date.now()}`,
      register_information: {
        company_name: params.company_name,
        trading_name: params.trading_name,
        email: params.email,
        document: params.document.replace(/\D/g, ''),
        type: 'corporation',
        site_url: params.site_url || 'https://nexus.com.br',
        annual_revenue: params.annual_revenue || 1000000,
        corporation_type: params.corporation_type || 'MEI',
        founding_date: params.founding_date || '2020-01-01',
        phone_numbers: params.managing_partners[0]?.phone_numbers.map(phone => ({
          ddd: phone.ddd,
          number: phone.number,
          type: phone.type,
        })) || [],
        main_address: {
          street: params.main_address.street,
          street_number: params.main_address.number,
          complementary: params.main_address.complement || 'N/A',
          reference_point: 'N/A',
          neighborhood: params.main_address.neighborhood,
          city: params.main_address.city,
          state: params.main_address.state,
          zip_code: params.main_address.zip_code.replace(/\D/g, ''),
          country: params.main_address.country || 'BR',
        },
        managing_partners: params.managing_partners.map(partner => ({
          name: partner.name,
          email: partner.email,
          document: partner.document.replace(/\D/g, ''),
          type: 'individual',
          mother_name: partner.mother_name || 'Não informado',
          birthdate: partner.birthdate,
          monthly_income: partner.monthly_income || 5000,
          professional_occupation: partner.professional_occupation || 'Empresário',
          self_declared_legal_representative: true,
          address: {
            street: partner.address.street,
            street_number: partner.address.number,
            complementary: partner.address.complement || 'N/A',
            reference_point: 'N/A',
            neighborhood: partner.address.neighborhood,
            city: partner.address.city,
            state: partner.address.state,
            zip_code: partner.address.zip_code.replace(/\D/g, ''),
            country: partner.address.country || 'BR',
          },
          phone_numbers: partner.phone_numbers.map(phone => ({
            ddd: phone.ddd,
            number: phone.number,
            type: phone.type,
          })),
        })),
      },
      default_bank_account: {
        holder_name: params.bank_account.holder_name,
        holder_type: 'company',
        holder_document: params.bank_account.holder_document.replace(/\D/g, ''),
        bank: params.bank_account.bank,
        branch_number: params.bank_account.branch_number,
        ...(params.bank_account.branch_check_digit ? { branch_check_digit: params.bank_account.branch_check_digit } : {}),
        account_number: params.bank_account.account_number,
        account_check_digit: params.bank_account.account_check_digit || params.bank_account.account_number.slice(-1),
        type: params.bank_account.type,
      },
      transfer_settings: params.transfer_settings || {
        transfer_enabled: true,
        transfer_interval: 'daily',
        transfer_day: 0,
      },
    };

    console.log('[Pagar.me] Creating corporate recipient');
    return this.request<RecipientResponse>('/recipients', 'POST', recipientData);
  }

  async createIndividualRecipient(params: CreateIndividualRecipientParams): Promise<RecipientResponse> {
    if (!params.name || !params.email || !params.document) {
      throw new Error('Dados pessoais obrigatórios: nome, email e documento');
    }
    if (!params.phone?.ddd || !params.phone?.number) {
      throw new Error('Telefone obrigatório com DDD e número');
    }
    if (!params.address?.street || !params.address?.number || !params.address?.neighborhood || 
        !params.address?.city || !params.address?.state || !params.address?.zip_code) {
      throw new Error('Endereço completo obrigatório');
    }
    if (!params.mother_name || !params.birthdate) {
      throw new Error('Nome da mãe e data de nascimento são obrigatórios');
    }

    const cleanDocument = params.document.replace(/\D/g, '');

    const recipientData = {
      code: params.code || `ind_${Date.now()}`,
      register_information: {
        name: params.name,
        email: params.email,
        document: cleanDocument,
        type: 'individual',
        site_url: 'https://nexus.com.br',
        mother_name: params.mother_name,
        birthdate: params.birthdate,
        monthly_income: params.monthly_income || 3000,
        professional_occupation: params.professional_occupation || 'Revendedor(a)',
        phone_numbers: [
          {
            ddd: params.phone.ddd,
            number: params.phone.number,
            type: 'mobile',
          },
        ],
        address: {
          street: params.address.street,
          street_number: params.address.number,
          complementary: params.address.complementary || 'N/A',
          reference_point: 'N/A',
          neighborhood: params.address.neighborhood,
          city: params.address.city,
          state: params.address.state,
          zip_code: params.address.zip_code.replace(/\D/g, ''),
          country: 'BR',
        },
      },
      default_bank_account: {
        holder_name: params.bank_account.holder_name,
        holder_type: 'individual',
        holder_document: params.bank_account.holder_document.replace(/\D/g, ''),
        bank: params.bank_account.bank,
        branch_number: params.bank_account.branch_number,
        ...(params.bank_account.branch_check_digit ? { branch_check_digit: params.bank_account.branch_check_digit } : {}),
        account_number: params.bank_account.account_number,
        account_check_digit: params.bank_account.account_check_digit,
        type: params.bank_account.type,
      },
      transfer_settings: params.transfer_settings || {
        transfer_enabled: true,
        transfer_interval: 'weekly',
        transfer_day: 5,
      },
    };

    console.log('[Pagar.me] Creating individual recipient');
    console.log('[Pagar.me] Request body:', JSON.stringify(recipientData, null, 2));
    return this.request<RecipientResponse>('/recipients', 'POST', recipientData);
  }

  async getRecipient(recipientId: string): Promise<RecipientResponse> {
    console.log(`[Pagar.me] Getting recipient: ${recipientId}`);
    return this.request<RecipientResponse>(`/recipients/${recipientId}`, 'GET');
  }

  async updateRecipientBankAccount(recipientId: string, bankAccount: {
    holder_name: string;
    holder_document: string;
    holder_type: 'individual' | 'company';
    bank: string;
    branch_number: string;
    branch_check_digit?: string;
    account_number: string;
    account_check_digit: string;
    type: 'checking' | 'savings';
  }): Promise<RecipientResponse> {
    console.log(`[Pagar.me] Updating bank account for recipient: ${recipientId}`);
    return this.request<RecipientResponse>(`/recipients/${recipientId}`, 'PATCH', {
      default_bank_account: {
        ...bankAccount,
        holder_document: bankAccount.holder_document.replace(/\D/g, ''),
      },
    });
  }

  async listRecipients(page: number = 1, size: number = 10): Promise<{ data: RecipientResponse[]; paging: any }> {
    console.log(`[Pagar.me] Listing recipients page=${page} size=${size}`);
    return this.request<{ data: RecipientResponse[]; paging: any }>(`/recipients?page=${page}&size=${size}`, 'GET');
  }
}

export const pagarmeService = new PagarmeService();
