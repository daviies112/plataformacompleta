// Database Types for UP Vendas Clone

export type PlanType = 'basic' | 'pro' | 'enterprise';
export type CompanyStatus = 'active' | 'suspended' | 'cancelled';
export type ResellerStatus = 'active' | 'inactive' | 'pending' | 'blocked';
export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type StockType = 'physical' | 'consignment' | 'dropshipping';
export type CommissionStatus = 'pending' | 'released' | 'paid';
export type TransactionType = 'credit' | 'debit' | 'withdrawal' | 'refund' | 'bonus' | 'commission';
export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type LinkStatus = 'active' | 'used' | 'expired';
export type CalculationMethod = 'cascade' | 'fixed_base';

export interface Company {
  id: string;
  user_id: string;
  company_name: string;
  cnpj: string;
  trading_name?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color: string;
  secondary_color: string;
  domain_custom?: string;
  subdomain: string;
  plan_type: PlanType;
  status: CompanyStatus;
  payment_gateway: string;
  gateway_credentials?: GatewayCredentials;
  commission_settings: CommissionSettings;
  minimum_withdrawal: number;
  withdrawal_fee_percentage: number;
  withdrawal_fee_fixed: number;
  created_at: string;
  updated_at: string;
}

export interface GatewayCredentials {
  gateway: string;
  credentials: {
    public_key: string;
    secret_key: string;
    webhook_secret?: string;
  };
  settings: {
    capture_method: 'automatic' | 'manual';
    statement_descriptor: string;
  };
}

export interface CommissionSettings {
  levels: CommissionLevel[];
  company_retention: number;
  calculation_method: CalculationMethod;
  holding_period_days: number;
  sales_tiers?: SalesTier[];
  use_dynamic_tiers?: boolean;
}

export interface SalesTier {
  id: string;
  name: string;
  min_monthly_sales: number;
  max_monthly_sales?: number;
  reseller_percentage: number;
  company_percentage: number;
}

export interface CommissionLevel {
  level: number;
  name: string;
  percentage: number;
  type: 'percentage' | 'fixed';
  min_amount?: number;
  max_amount?: number;
}

export interface Reseller {
  id: string;
  user_id: string;
  company_id: string;
  full_name: string;
  email: string;
  phone?: string;
  cpf_cnpj: string;
  store_url: string;
  store_name: string;
  store_slug: string;
  store_logo_url?: string;
  store_banner_url?: string;
  store_description?: string;
  store_social_links?: Record<string, string>;
  commission_percentage: number;
  level: number;
  sponsor_id?: string;
  bank_account?: BankAccount;
  status: ResellerStatus;
  total_sales: number;
  available_balance: number;
  pending_balance: number;
  pagarme_recipient_id?: string;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  bank_code: string;
  bank_name: string;
  account_type: 'checking' | 'savings';
  account_number: string;
  account_digit?: string;
  branch: string;
  branch_digit?: string;
  holder_name: string;
  holder_document: string;
}

export interface Product {
  id: string;
  company_id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  price: number;
  cost_price?: number;
  images: string[];
  video_url?: string;
  stock_quantity: number;
  stock_type: StockType;
  category_id?: string;
  weight?: number;
  dimensions?: ProductDimensions;
  tags?: string[];
  is_active: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductDimensions {
  width: number;
  height: number;
  length: number;
}

export interface ProductCategory {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  company_id: string;
  reseller_id: string;
  customer_id?: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method?: string;
  payment_gateway_id?: string;
  payment_gateway_data?: any;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  total_amount: number;
  commission_data?: CommissionSplit[];
  shipping_address?: Address;
  billing_address?: Address;
  tracking_code?: string;
  notes?: string;
  customer_notes?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
  shipped_at?: string;
  delivered_at?: string;
}

export interface Address {
  zip_code: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  country?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  product_name: string;
  product_sku: string;
  product_image?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  metadata?: any;
  created_at: string;
}

export interface CommissionSplit {
  id: string;
  order_id: string;
  reseller_id: string;
  level: number;
  percentage: number;
  amount: number;
  status: CommissionStatus;
  released_at?: string;
  paid_at?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  order_id?: string;
  reseller_id: string;
  type: TransactionType;
  amount: number;
  fee: number;
  net_amount: number;
  status: string;
  description?: string;
  payment_gateway_transaction_id?: string;
  metadata?: any;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  reseller_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: WithdrawalStatus;
  bank_account: BankAccount;
  gateway_transaction_id?: string;
  failure_reason?: string;
  requested_at: string;
  completed_at?: string;
  created_at: string;
}

export interface PaymentLink {
  id: string;
  reseller_id: string;
  company_id: string;
  link_token: string;
  products: PaymentLinkProduct[];
  total_amount: number;
  discount_percentage: number;
  custom_message?: string;
  expires_at?: string;
  max_uses: number;
  current_uses: number;
  status: LinkStatus;
  order_id?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface PaymentLinkProduct {
  product_id: string;
  name: string;
  sku: string;
  image?: string;
  price: number;
  quantity: number;
  total: number;
}

export interface Customer {
  id: string;
  company_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  addresses?: Address[];
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface ScheduledRelease {
  id: string;
  reseller_id: string;
  commission_split_id?: string;
  amount: number;
  scheduled_for: string;
  status: string;
  released_at?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  reseller_id?: string;
  company_id?: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read_at?: string;
  created_at: string;
}