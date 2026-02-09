export interface SubjectInfo {
  name: string;
  cpf: string;
  totalLawsuits: number;
}

export function formatCPF(cpf: string): string {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return cpf;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
}

export function extractSubjectInfo(payload: any): SubjectInfo {
  const result = payload?.Result?.[0];
  const processes = result?.Processes;
  
  const totalLawsuits = processes?.TotalLawsuits ?? 0;
  
  let name = 'N/A';
  let cpf = 'N/A';
  
  if (processes?.Lawsuits && processes.Lawsuits.length > 0) {
    const allParties: any[] = [];
    
    for (const lawsuit of processes.Lawsuits) {
      if (lawsuit.Parties && Array.isArray(lawsuit.Parties)) {
        allParties.push(...lawsuit.Parties);
      }
    }
    
    if (allParties.length > 0) {
      const individualParties = allParties.filter((party: any) => {
        const doc = party.Doc || party.Document || '';
        const cleanDoc = doc.replace(/\D/g, '');
        return cleanDoc.length === 11;
      });
      
      const partyCounts = new Map<string, { count: number; party: any }>();
      
      for (const party of individualParties) {
        const doc = (party.Doc || party.Document || '').replace(/\D/g, '');
        if (doc) {
          const existing = partyCounts.get(doc);
          if (existing) {
            existing.count++;
          } else {
            partyCounts.set(doc, { count: 1, party });
          }
        }
      }
      
      let mostFrequentParty: any = null;
      let maxCount = 0;
      
      partyCounts.forEach((data, doc) => {
        if (data.count > maxCount) {
          maxCount = data.count;
          mostFrequentParty = data.party;
        }
      });
      
      if (mostFrequentParty) {
        name = mostFrequentParty.Name || 'N/A';
        const rawCpf = (mostFrequentParty.Doc || mostFrequentParty.Document || '').replace(/\D/g, '');
        cpf = rawCpf ? formatCPF(rawCpf) : 'N/A';
      }
    }
  }
  
  return {
    name,
    cpf,
    totalLawsuits,
  };
}
