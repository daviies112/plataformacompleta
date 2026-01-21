import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

export interface SalesTier {
  id: string;
  name: string;
  min_monthly_sales: number;
  max_monthly_sales?: number;
  reseller_percentage: number;
  company_percentage: number;
}

export interface CommissionConfig {
  use_dynamic_tiers: boolean;
  sales_tiers: SalesTier[];
}

export interface CommissionResult {
  resellerPercentage: number;
  companyPercentage: number;
  tierName: string;
  monthlyVolume: number;
}

const DEFAULT_TIERS: SalesTier[] = [
  { id: '1', name: 'Iniciante', min_monthly_sales: 0, max_monthly_sales: 2000, reseller_percentage: 65, company_percentage: 35 },
  { id: '2', name: 'Bronze', min_monthly_sales: 2000, max_monthly_sales: 4500, reseller_percentage: 70, company_percentage: 30 },
  { id: '3', name: 'Prata', min_monthly_sales: 4500, max_monthly_sales: 10000, reseller_percentage: 75, company_percentage: 25 },
  { id: '4', name: 'Ouro', min_monthly_sales: 10000, reseller_percentage: 80, company_percentage: 20 },
];

function getSupabaseClient() {
  const configPath = path.join(process.cwd(), 'data', 'supabase-config.json');
  if (!fs.existsSync(configPath)) {
    console.warn('[Commission] Config file not found');
    return null;
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const supabaseUrl = config.url || config.supabaseUrl;
  const supabaseKey = config.serviceRoleKey || config.anonKey || config.supabaseAnonKey;
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('[Commission] Supabase credentials not configured');
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function getCommissionConfig(): Promise<CommissionConfig> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.log('[Commission] Using default config (no Supabase)');
      return { use_dynamic_tiers: true, sales_tiers: DEFAULT_TIERS };
    }

    const { data, error } = await supabase
      .from('commission_config')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error || !data) {
      console.log('[Commission] No config found, using defaults');
      return { use_dynamic_tiers: true, sales_tiers: DEFAULT_TIERS };
    }

    console.log('[Commission] Config loaded from Supabase');
    return {
      use_dynamic_tiers: data.use_dynamic_tiers || false,
      sales_tiers: data.sales_tiers?.length > 0 ? data.sales_tiers : DEFAULT_TIERS,
    };
  } catch (error) {
    console.error('[Commission] Error loading config:', error);
    return { use_dynamic_tiers: true, sales_tiers: DEFAULT_TIERS };
  }
}

export async function getResellerMonthlyVolume(resellerId: string): Promise<number> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.log('[Commission] Cannot calculate volume - no Supabase');
      return 0;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data, error } = await supabase
      .from('sales_with_split')
      .select('total_amount')
      .eq('reseller_id', resellerId)
      .eq('paid', true)
      .gte('created_at', startOfMonth.toISOString());

    if (error) {
      console.error('[Commission] Error fetching monthly volume:', error);
      return 0;
    }

    const volume = (data || []).reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
    console.log(`[Commission] Monthly volume for ${resellerId}: R$ ${volume.toFixed(2)}`);
    return volume;
  } catch (error) {
    console.error('[Commission] Error calculating volume:', error);
    return 0;
  }
}

export function calculateCommissionFromTiers(
  monthlyVolume: number,
  config: CommissionConfig
): { resellerPercentage: number; companyPercentage: number; tierName: string } {
  if (!config.use_dynamic_tiers) {
    return { resellerPercentage: 70, companyPercentage: 30, tierName: 'Padrão' };
  }

  const sortedTiers = [...config.sales_tiers].sort((a, b) => a.min_monthly_sales - b.min_monthly_sales);

  for (const tier of sortedTiers) {
    const meetsMinimum = monthlyVolume >= tier.min_monthly_sales;
    const meetsMaximum = tier.max_monthly_sales === undefined || monthlyVolume < tier.max_monthly_sales;

    if (meetsMinimum && meetsMaximum) {
      return {
        resellerPercentage: tier.reseller_percentage,
        companyPercentage: tier.company_percentage,
        tierName: tier.name,
      };
    }
  }

  if (sortedTiers.length > 0) {
    const lastTier = sortedTiers[sortedTiers.length - 1];
    return {
      resellerPercentage: lastTier.reseller_percentage,
      companyPercentage: lastTier.company_percentage,
      tierName: lastTier.name,
    };
  }

  return { resellerPercentage: 70, companyPercentage: 30, tierName: 'Padrão' };
}

export async function calculateResellerCommission(resellerId: string): Promise<CommissionResult> {
  const [config, monthlyVolume] = await Promise.all([
    getCommissionConfig(),
    getResellerMonthlyVolume(resellerId),
  ]);

  const commission = calculateCommissionFromTiers(monthlyVolume, config);

  console.log(`[Commission] Reseller ${resellerId}: ${commission.tierName} tier (${commission.resellerPercentage}% reseller / ${commission.companyPercentage}% company)`);

  return {
    ...commission,
    monthlyVolume,
  };
}

export async function getCompanyRecipientId(): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('platform_settings')
      .select('pagarme_company_recipient_id')
      .eq('id', 'default')
      .single();

    if (error || !data) {
      console.log('[Commission] No company recipient_id found');
      return null;
    }

    return data.pagarme_company_recipient_id || null;
  } catch (error) {
    console.error('[Commission] Error getting company recipient:', error);
    return null;
  }
}

export async function getResellerRecipientId(resellerId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('revendedoras')
      .select('pagarme_recipient_id')
      .eq('id', resellerId)
      .single();

    if (error || !data) {
      console.log(`[Commission] No recipient_id for reseller ${resellerId}`);
      return null;
    }

    return data.pagarme_recipient_id || null;
  } catch (error) {
    console.error('[Commission] Error getting reseller recipient:', error);
    return null;
  }
}

export async function saveCompanyRecipientId(recipientId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('platform_settings')
      .upsert({
        id: 'default',
        pagarme_company_recipient_id: recipientId,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[Commission] Error saving company recipient:', error);
      return false;
    }

    console.log('[Commission] Company recipient_id saved:', recipientId);
    return true;
  } catch (error) {
    console.error('[Commission] Error saving company recipient:', error);
    return false;
  }
}

export async function saveResellerRecipientId(resellerId: string, recipientId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('revendedoras')
      .update({ pagarme_recipient_id: recipientId })
      .eq('id', resellerId);

    if (error) {
      console.error('[Commission] Error saving reseller recipient:', error);
      return false;
    }

    console.log(`[Commission] Reseller ${resellerId} recipient_id saved: ${recipientId}`);
    return true;
  } catch (error) {
    console.error('[Commission] Error saving reseller recipient:', error);
    return false;
  }
}
