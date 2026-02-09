// Commission Configuration Helper

import { CommissionSettings, CommissionLevel } from '@/types/database';

/**
 * Default commission settings for new companies
 */
export const DEFAULT_COMMISSION_SETTINGS: CommissionSettings = {
  levels: [
    {
      level: 1,
      name: 'Revendedor Direto',
      percentage: 30,
      type: 'percentage',
    },
    {
      level: 2,
      name: 'Supervisor',
      percentage: 10,
      type: 'percentage',
    },
    {
      level: 3,
      name: 'Gerente Regional',
      percentage: 5,
      type: 'percentage',
    },
    {
      level: 4,
      name: 'Diretor',
      percentage: 3,
      type: 'percentage',
    },
  ],
  company_retention: 52,
  calculation_method: 'cascade',
  holding_period_days: 30,
};

/**
 * Calculate total commission percentage
 */
export function calculateTotalCommissionPercentage(
  settings: CommissionSettings
): number {
  return settings.levels.reduce((total, level) => total + level.percentage, 0);
}

/**
 * Calculate commission distribution for a sale
 */
export function calculateCommissionDistribution(
  totalAmount: number,
  settings: CommissionSettings
): Array<{ level: number; amount: number; percentage: number }> {
  const distribution = [];
  let remainingAmount = totalAmount;

  for (const level of settings.levels) {
    let commissionAmount = 0;

    if (settings.calculation_method === 'cascade') {
      // Cascade: each level gets % of remaining amount
      commissionAmount = (remainingAmount * level.percentage) / 100;
      remainingAmount -= commissionAmount;
    } else {
      // Fixed base: all levels get % of original amount
      commissionAmount = (totalAmount * level.percentage) / 100;
    }

    distribution.push({
      level: level.level,
      amount: commissionAmount,
      percentage: level.percentage,
    });
  }

  return distribution;
}

/**
 * Calculate company retention amount
 */
export function calculateCompanyRetention(
  totalAmount: number,
  settings: CommissionSettings
): number {
  const totalCommissions = calculateCommissionDistribution(totalAmount, settings)
    .reduce((sum, item) => sum + item.amount, 0);
  
  return totalAmount - totalCommissions;
}

/**
 * Validate commission settings
 */
export function validateCommissionSettings(
  settings: CommissionSettings
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if levels are defined
  if (!settings.levels || settings.levels.length === 0) {
    errors.push('Pelo menos um nível de comissão deve ser definido');
  }

  // Check for duplicate levels
  const levels = settings.levels.map(l => l.level);
  const uniqueLevels = new Set(levels);
  if (levels.length !== uniqueLevels.size) {
    errors.push('Níveis duplicados encontrados');
  }

  // Check percentages
  for (const level of settings.levels) {
    if (level.percentage < 0 || level.percentage > 100) {
      errors.push(`Nível ${level.level}: percentual deve estar entre 0 e 100`);
    }
  }

  // Check total doesn't exceed 100%
  const totalPercentage = calculateTotalCommissionPercentage(settings);
  if (totalPercentage > 100) {
    errors.push(`Total de comissões (${totalPercentage}%) excede 100%`);
  }

  // Check company retention
  if (settings.company_retention < 0 || settings.company_retention > 100) {
    errors.push('Retenção da empresa deve estar entre 0 e 100%');
  }

  // Check holding period
  if (settings.holding_period_days < 0) {
    errors.push('Período de carência não pode ser negativo');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get commission preview for display
 */
export function getCommissionPreview(
  saleAmount: number,
  settings: CommissionSettings
): {
  levels: Array<{
    level: number;
    name: string;
    percentage: number;
    amount: number;
  }>;
  companyRetention: number;
  total: number;
} {
  const distribution = calculateCommissionDistribution(saleAmount, settings);
  
  const levels = settings.levels.map((level, index) => ({
    level: level.level,
    name: level.name,
    percentage: level.percentage,
    amount: distribution[index]?.amount || 0,
  }));

  const companyRetention = calculateCompanyRetention(saleAmount, settings);

  return {
    levels,
    companyRetention,
    total: saleAmount,
  };
}