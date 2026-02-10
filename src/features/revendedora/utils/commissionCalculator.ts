import { SalesTier } from '@/types/database';

/**
 * Calcula a porcentagem de comissão baseada no volume de vendas mensal
 * 
 * @param monthlyVolume - Volume total de vendas do revendedor no mês atual
 * @param salesTiers - Array de faixas de comissão configuradas
 * @returns Objeto com porcentagens do revendedor e da empresa
 */
export function calculateDynamicCommission(
  monthlyVolume: number,
  salesTiers: SalesTier[]
): { resellerPercentage: number; companyPercentage: number; tierName: string } {
  // Ordenar tiers por valor mínimo
  const sortedTiers = [...salesTiers].sort((a, b) => a.min_monthly_sales - b.min_monthly_sales);
  
  // Encontrar a faixa aplicável
  let applicableTier: SalesTier | null = null;
  
  for (const tier of sortedTiers) {
    const meetsMinimum = monthlyVolume >= tier.min_monthly_sales;
    const meetsMaximum = tier.max_monthly_sales === undefined || monthlyVolume < tier.max_monthly_sales;
    
    if (meetsMinimum && meetsMaximum) {
      applicableTier = tier;
      break;
    }
  }
  
  // Se nenhuma faixa for encontrada, usar a última (maior faixa)
  if (!applicableTier && sortedTiers.length > 0) {
    applicableTier = sortedTiers[sortedTiers.length - 1];
  }
  
  // Retornar porcentagens ou padrão (70/30)
  if (applicableTier) {
    return {
      resellerPercentage: applicableTier.reseller_percentage,
      companyPercentage: applicableTier.company_percentage,
      tierName: applicableTier.name,
    };
  }
  
  // Fallback padrão
  return {
    resellerPercentage: 70,
    companyPercentage: 30,
    tierName: 'Padrão',
  };
}

/**
 * Obtém a configuração de comissões salva
 * 
 * @param resellerId - ID do revendedor para isolar dados por tenant
 * @returns Configuração de comissões ou null se não existir
 */
export function getCommissionConfig(resellerId?: string): {
  use_dynamic_tiers: boolean;
  sales_tiers: SalesTier[];
} | null {
  try {
    const storageKey = resellerId 
      ? `commission_config_${resellerId}` 
      : 'commission_config';
    console.log('[CommissionCalculator] Loading config from localStorage:', storageKey);
    const savedConfig = localStorage.getItem(storageKey);
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      return {
        use_dynamic_tiers: config.use_dynamic_tiers || false,
        sales_tiers: config.sales_tiers || [],
      };
    }
  } catch (error) {
    console.error('[CommissionCalculator] Erro ao carregar configuração de comissões:', error);
  }
  
  return null;
}

/**
 * Salva a configuração de comissões
 * 
 * @param resellerId - ID do revendedor para isolar dados por tenant
 * @param config - Configuração de comissões
 */
export function saveCommissionConfig(resellerId: string, config: {
  use_dynamic_tiers: boolean;
  sales_tiers: SalesTier[];
}): void {
  try {
    const storageKey = `commission_config_${resellerId}`;
    console.log('[CommissionCalculator] Saving config to localStorage:', storageKey);
    localStorage.setItem(storageKey, JSON.stringify(config));
  } catch (error) {
    console.error('[CommissionCalculator] Erro ao salvar configuração de comissões:', error);
  }
}

/**
 * Preview de comissão para demonstração
 * 
 * @param saleAmount - Valor da venda
 * @param resellerPercentage - Porcentagem do revendedor
 * @param companyPercentage - Porcentagem da empresa
 * @returns Valores calculados do split
 */
export function calculateSplitPreview(
  saleAmount: number,
  resellerPercentage: number,
  companyPercentage: number
): {
  resellerAmount: number;
  companyAmount: number;
  total: number;
} {
  const resellerAmount = (saleAmount * resellerPercentage) / 100;
  const companyAmount = (saleAmount * companyPercentage) / 100;
  
  return {
    resellerAmount,
    companyAmount,
    total: saleAmount,
  };
}
