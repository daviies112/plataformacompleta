interface JudicialData {
  totalLawsuits: number;
  lawsuitsAsDefendant: number;
  lawsuitsAsAuthor: number;
  lawsuitsLast30Days: number;
  lawsuitsLast90Days: number;
  lawsuitsLast365Days: number;
}

interface FinancialData {
  hasActiveCollections: boolean;
  totalOccurrences: number;
  consecutiveMonths: number;
  last12Months: number;
  last3Months: number;
}

interface BasicData {
  cpfStatus: string | null;
  isDeceased: boolean;
}

function extractJudicialData(payload: any): JudicialData {
  const result = payload?.Result?.[0];
  const processData = result?.Processes;
  
  return {
    totalLawsuits: processData?.TotalLawsuits || 0,
    lawsuitsAsDefendant: processData?.TotalLawsuitsAsDefendant || 0,
    lawsuitsAsAuthor: processData?.TotalLawsuitsAsAuthor || 0,
    lawsuitsLast30Days: processData?.Last30DaysLawsuits || 0,
    lawsuitsLast90Days: processData?.Last90DaysLawsuits || 0,
    lawsuitsLast365Days: processData?.Last365DaysLawsuits || 0,
  };
}

function extractFinancialData(payload: any): FinancialData {
  const collectionsData = payload?._collections?.Result?.[0]?.Collections;
  
  return {
    hasActiveCollections: collectionsData?.HasActiveCollections === true,
    totalOccurrences: collectionsData?.TotalOccurrences || 0,
    consecutiveMonths: collectionsData?.ConsecutiveMonths || 0,
    last12Months: collectionsData?.Last12Months || 0,
    last3Months: collectionsData?.Last3Months || 0,
  };
}

function extractBasicData(payload: any): BasicData {
  const basicDataPayload = payload?._basic_data?.Result?.[0]?.BasicData;
  
  return {
    cpfStatus: basicDataPayload?.TaxIdStatus || null,
    isDeceased: !!basicDataPayload?.DeathDate,
  };
}

function calculateJudicialScore(data: JudicialData): number {
  let score = 1;
  
  if (data.totalLawsuits === 0) {
    return 1;
  }
  
  if (data.totalLawsuits >= 1 && data.totalLawsuits <= 2) score = 2;
  else if (data.totalLawsuits >= 3 && data.totalLawsuits <= 5) score = 4;
  else if (data.totalLawsuits >= 6 && data.totalLawsuits <= 10) score = 6;
  else if (data.totalLawsuits >= 11 && data.totalLawsuits <= 20) score = 7;
  else if (data.totalLawsuits > 20) score = 8;
  
  if (data.lawsuitsAsDefendant > 0) {
    const defendantRatio = data.lawsuitsAsDefendant / Math.max(data.totalLawsuits, 1);
    if (defendantRatio >= 0.7) score = Math.min(10, score + 2);
    else if (defendantRatio >= 0.5) score = Math.min(10, score + 1.5);
    else if (defendantRatio >= 0.3) score = Math.min(10, score + 1);
  }
  
  if (data.lawsuitsLast30Days > 0) {
    score = Math.min(10, score + 1);
  }
  
  if (data.lawsuitsLast90Days > 2) {
    score = Math.min(10, score + 0.5);
  }
  
  if (data.lawsuitsLast365Days > 5) {
    score = Math.min(10, score + 0.5);
  }
  
  return Math.max(1, Math.min(10, score));
}

function calculateFinancialScore(data: FinancialData): number {
  let score = 1;
  
  if (data.totalOccurrences === 0 && !data.hasActiveCollections) {
    return 1;
  }
  
  if (data.hasActiveCollections) {
    score = 7;
  } else if (data.totalOccurrences > 0) {
    if (data.totalOccurrences <= 2) score = 3;
    else if (data.totalOccurrences <= 5) score = 4;
    else if (data.totalOccurrences <= 10) score = 5;
    else score = 6;
  }
  
  if (data.consecutiveMonths >= 6) {
    score = Math.min(10, score + 2);
  } else if (data.consecutiveMonths >= 3) {
    score = Math.min(10, score + 1);
  }
  
  if (data.last3Months > 0) {
    score = Math.min(10, score + 1);
  }
  
  if (data.last12Months > 5) {
    score = Math.min(10, score + 0.5);
  }
  
  return Math.max(1, Math.min(10, score));
}

function calculateBasicDataScore(data: BasicData): number {
  if (data.isDeceased) {
    return 10;
  }
  
  if (!data.cpfStatus) {
    return 3;
  }
  
  if (data.cpfStatus === 'Regular') {
    return 1;
  }
  
  return 8;
}

export function calculateUnifiedRisk(payload: any): number {
  const judicialData = extractJudicialData(payload);
  const financialData = extractFinancialData(payload);
  const basicData = extractBasicData(payload);
  
  const judicialScore = calculateJudicialScore(judicialData);
  const financialScore = calculateFinancialScore(financialData);
  const basicDataScore = calculateBasicDataScore(basicData);
  
  const finalScore = (judicialScore * 0.50) + (financialScore * 0.35) + (basicDataScore * 0.15);
  
  return Math.round(finalScore * 10) / 10;
}

export function getRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score <= 3) return 'low';
  if (score <= 6) return 'medium';
  return 'high';
}

export function getRiskColor(score: number): string {
  const level = getRiskLevel(score);
  switch (level) {
    case 'low': return 'text-green-500';
    case 'medium': return 'text-amber-500';
    case 'high': return 'text-red-500';
  }
}
