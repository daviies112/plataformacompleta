export interface SplitCalculation {
  totalAmount: number;
  totalAmountCents: number;
  
  resellerPercentage: number;
  resellerAmount: number;
  resellerAmountCents: number;
  
  companyPercentage: number;
  companyAmount: number;
  companyAmountCents: number;
}

export class SplitService {
  /**
   * Calcula o split da venda entre revendedora e empresa
   * @param totalAmount - Valor total da venda em reais
   * @param resellerPercentage - Percentual da revendedora (padrão: 70%)
   * @returns Objeto com valores calculados
   */
  static calculateSplit(
    totalAmount: number,
    resellerPercentage: number = 70
  ): SplitCalculation {
    const companyPercentage = 100 - resellerPercentage;
    
    const totalAmountCents = Math.round(totalAmount * 100);
    const resellerAmountCents = Math.round(totalAmountCents * (resellerPercentage / 100));
    const companyAmountCents = totalAmountCents - resellerAmountCents;
    
    return {
      totalAmount,
      totalAmountCents,
      
      resellerPercentage,
      resellerAmount: resellerAmountCents / 100,
      resellerAmountCents,
      
      companyPercentage,
      companyAmount: companyAmountCents / 100,
      companyAmountCents
    };
  }
  
  /**
   * Formata valor em reais para exibição
   */
  static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
}
