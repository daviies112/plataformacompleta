import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Get Supabase Master/Owner client (for revendedoras table)
function getMasterSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_OWNER_URL || process.env.SUPABASE_MASTER_URL;
  const key = process.env.SUPABASE_OWNER_SERVICE_KEY || process.env.SUPABASE_MASTER_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.warn('[Commission] Master/Owner Supabase not configured');
    return null;
  }
  
  return createClient(url, key);
}

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
    // Revendedoras table is in Master/Owner Supabase
    const supabase = getMasterSupabaseClient();
    if (!supabase) {
      console.warn('[Commission] Master Supabase not configured for recipient lookup');
      return null;
    }

    const { data, error } = await supabase
      .from('revendedoras')
      .select('pagarme_recipient_id')
      .eq('id', resellerId)
      .single();

    if (error || !data) {
      console.log(`[Commission] No recipient_id for reseller ${resellerId}`);
      return null;
    }

    console.log(`[Commission] Found recipient_id for reseller ${resellerId}:`, data.pagarme_recipient_id);
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
    // Revendedoras table is in Master/Owner Supabase
    const supabase = getMasterSupabaseClient();
    if (!supabase) {
      console.error('[Commission] Master Supabase not configured for saving recipient');
      return false;
    }

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

// ============================================================
// CONFIGURAÇÃO DE TAXAS E COMISSÕES
// ============================================================

// Taxa fixa do Pagar.me (3%)
export const PAGARME_FEE_PERCENTAGE = 3;

// Taxa do desenvolvedor (3%)
export const DEVELOPER_FEE_PERCENTAGE = 3;

// Taxa total (6% = 3% Pagar.me + 3% Desenvolvedor)
export const TOTAL_PLATFORM_FEE_PERCENTAGE = PAGARME_FEE_PERCENTAGE + DEVELOPER_FEE_PERCENTAGE;

// Recipient ID do desenvolvedor (Nexus Intelligence)
export const DEVELOPER_RECIPIENT_ID = 're_cmkn7cdx110b10l9tp8yk0j92';

export interface SplitCalculation {
  originalAmount: number;
  platformFeeAmount: number;
  pagarmeAmount: number;
  developerAmount: number;
  distributableAmount: number;
  companyAmount: number;
  resellerAmount: number;
  companyPercentage: number;
  resellerPercentage: number;
  tierName: string;
}

/**
 * Calcula a divisão de valores com taxas de plataforma
 * 
 * Lógica CORRETA para Pagar.me:
 * 1. O total do split DEVE ser igual ao valor da ordem
 * 2. A taxa do Pagar.me (3%) é descontada automaticamente do recipient marcado como "liable"
 * 3. Para que a empresa e revendedora recebam os valores corretos líquidos:
 *    - Desenvolvedor recebe 3%
 *    - Empresa recebe sua parte + a taxa do Pagar.me (porque ela é liable e será descontada)
 *    - Revendedora recebe sua parte líquida
 * 
 * Exemplo com R$100 e split 50/50:
 * - Valor total: R$100,00
 * - Desenvolvedor: R$3,00 (3%)
 * - Restante para divisão: R$97,00 (97%)
 * - Mas a empresa (liable) paga a taxa do Pagar.me, então:
 *   - Empresa bruto: R$50,00 (50% de 97 + taxa Pagar.me)
 *   - Empresa líquido: R$47,00 (após taxa)
 *   - Revendedora: R$47,00
 * - Total split: 3 + 50 + 47 = R$100 ✓
 */
export function calculateSplitWithFees(
  totalAmountCents: number,
  companyPercentage: number,
  resellerPercentage: number,
  tierName: string = 'Padrão'
): SplitCalculation {
  // Taxa do desenvolvedor (3% do total)
  const developerAmount = Math.round(totalAmountCents * (DEVELOPER_FEE_PERCENTAGE / 100));
  
  // Taxa do Pagar.me (3% do total) - será descontada do liable
  const pagarmeAmount = Math.round(totalAmountCents * (PAGARME_FEE_PERCENTAGE / 100));
  
  // Taxa total de plataforma (informativo)
  const platformFeeAmount = developerAmount + pagarmeAmount;
  
  // Valor a distribuir após taxa do desenvolvedor
  const afterDevFee = totalAmountCents - developerAmount;
  
  // Valor líquido que empresa e revendedora devem receber (após todas as taxas)
  const netDistributable = totalAmountCents - platformFeeAmount;
  
  // Calcular valores LÍQUIDOS para empresa e revendedora
  const companyNetAmount = Math.round(netDistributable * (companyPercentage / 100));
  const resellerNetAmount = netDistributable - companyNetAmount;
  
  // A empresa é liable, então recebe seu valor líquido + taxa Pagar.me (que será descontada)
  const companyGrossAmount = companyNetAmount + pagarmeAmount;
  
  // A revendedora recebe o valor líquido direto
  const resellerGrossAmount = resellerNetAmount;
  
  // Verificação: dev + empresa_bruto + revendedora = total
  const totalSplit = developerAmount + companyGrossAmount + resellerGrossAmount;
  
  const result: SplitCalculation = {
    originalAmount: totalAmountCents,
    platformFeeAmount,
    pagarmeAmount,
    developerAmount,
    distributableAmount: netDistributable,
    companyAmount: companyGrossAmount, // Valor BRUTO que vai no split
    resellerAmount: resellerGrossAmount, // Valor que vai no split
    companyPercentage,
    resellerPercentage,
    tierName,
  };
  
  console.log('[Commission] Split calculation:', {
    original: `R$ ${(totalAmountCents / 100).toFixed(2)}`,
    developer: `R$ ${(developerAmount / 100).toFixed(2)} (${DEVELOPER_FEE_PERCENTAGE}%)`,
    pagarme: `R$ ${(pagarmeAmount / 100).toFixed(2)} (${PAGARME_FEE_PERCENTAGE}% - descontado do liable)`,
    netDistributable: `R$ ${(netDistributable / 100).toFixed(2)} (valor líquido para divisão)`,
    companyNet: `R$ ${(companyNetAmount / 100).toFixed(2)} (${companyPercentage}% líquido)`,
    companyGross: `R$ ${(companyGrossAmount / 100).toFixed(2)} (no split, antes da taxa Pagar.me)`,
    resellerNet: `R$ ${(resellerGrossAmount / 100).toFixed(2)} (${resellerPercentage}% líquido)`,
    totalSplit: `R$ ${(totalSplit / 100).toFixed(2)} (deve ser igual ao original)`,
    tier: tierName,
  });
  
  return result;
}

/**
 * Gera as regras de split para o Pagar.me
 * 
 * O split usa valores flat (em centavos) para precisão exata
 * A taxa do Pagar.me é cobrada automaticamente do liable
 */
export function generatePagarmeSplitRules(
  calculation: SplitCalculation,
  companyRecipientId: string,
  resellerRecipientId: string
): Array<{
  amount: number;
  recipient_id: string;
  type: 'flat';
  options: {
    charge_processing_fee: boolean;
    charge_remainder_fee: boolean;
    liable: boolean;
  };
}> {
  // O desenvolvedor recebe 3% do valor total
  const developerRule = {
    amount: calculation.developerAmount,
    recipient_id: DEVELOPER_RECIPIENT_ID,
    type: 'flat' as const,
    options: {
      charge_processing_fee: false,
      charge_remainder_fee: false,
      liable: false,
    },
  };
  
  // A empresa recebe sua parte do valor distribuível
  const companyRule = {
    amount: calculation.companyAmount,
    recipient_id: companyRecipientId,
    type: 'flat' as const,
    options: {
      charge_processing_fee: true, // Empresa paga as taxas do Pagar.me
      charge_remainder_fee: true,
      liable: true, // Empresa é responsável por chargebacks
    },
  };
  
  // A revendedora recebe sua parte do valor distribuível
  const resellerRule = {
    amount: calculation.resellerAmount,
    recipient_id: resellerRecipientId,
    type: 'flat' as const,
    options: {
      charge_processing_fee: false,
      charge_remainder_fee: false,
      liable: false,
    },
  };
  
  console.log('[Commission] Generated split rules:', {
    developer: `R$ ${(developerRule.amount / 100).toFixed(2)} → ${DEVELOPER_RECIPIENT_ID.substring(0, 20)}...`,
    company: `R$ ${(companyRule.amount / 100).toFixed(2)} → ${companyRecipientId.substring(0, 20)}... (liable)`,
    reseller: `R$ ${(resellerRule.amount / 100).toFixed(2)} → ${resellerRecipientId.substring(0, 20)}...`,
  });
  
  return [developerRule, companyRule, resellerRule];
}

/**
 * Calcula e gera split completo para uma venda
 */
export async function calculateFullSplit(
  totalAmountCents: number,
  resellerId: string,
  companyRecipientId: string,
  resellerRecipientId: string
): Promise<{
  calculation: SplitCalculation;
  splitRules: ReturnType<typeof generatePagarmeSplitRules>;
} | null> {
  try {
    // Obter comissão baseada no tier da revendedora
    const commissionResult = await calculateResellerCommission(resellerId);
    
    // Calcular split com taxas
    const calculation = calculateSplitWithFees(
      totalAmountCents,
      commissionResult.companyPercentage,
      commissionResult.resellerPercentage,
      commissionResult.tierName
    );
    
    // Gerar regras de split
    const splitRules = generatePagarmeSplitRules(
      calculation,
      companyRecipientId,
      resellerRecipientId
    );
    
    return { calculation, splitRules };
  } catch (error) {
    console.error('[Commission] Error calculating full split:', error);
    return null;
  }
}
