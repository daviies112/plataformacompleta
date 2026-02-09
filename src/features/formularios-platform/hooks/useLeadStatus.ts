import { useQuery } from "@tanstack/react-query";

interface LeadStatusData {
  success: boolean;
  data?: {
    existe: boolean;
    telefoneNormalizado: string;
    lead?: any;
    sessaoAtiva?: any;
    sessoes?: any[];
    historico?: any[];
    status?: {
      formularioEnviado: boolean;
      formularioAberto: boolean;
      formularioIniciado: boolean;
      formularioConcluido: boolean;
      visualizacoes: number;
      progressoPercentual: number;
      pontuacao?: number;
      statusQualificacao?: string;
    };
  };
  error?: string;
}

export function useLeadStatus(telefone: string, enabled: boolean = true) {
  return useQuery<LeadStatusData>({
    queryKey: ['leadStatus', telefone],
    queryFn: async () => {
      console.log('🔍 Buscando status do lead:', telefone);
      
      const res = await fetch(`/api/leads/status/${encodeURIComponent(telefone)}`);
      
      if (!res.ok) {
        throw new Error(`Erro ao buscar status: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('✅ Status do lead recebido:', data);
      
      return data;
    },
    enabled: !!telefone && enabled,
    refetchInterval: 5000,
    staleTime: 3000,
    retry: 2,
  });
}
