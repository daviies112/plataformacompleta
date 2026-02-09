import { useEffect, useState } from "react";
import { FormStatusBadge } from "./FormStatusBadge";
import { Loader2 } from "lucide-react";

interface LeadStatusLabelProps {
  phoneNumber: string;
  refreshInterval?: number;
}

interface LeadStatus {
  exists: boolean;
  formStatus?: string;
  qualificationStatus?: string;
  pontuacao?: number;
  nome?: string;
}

export function LeadStatusLabel({ 
  phoneNumber, 
  refreshInterval = 10000 
}: LeadStatusLabelProps) {
  const [leadStatus, setLeadStatus] = useState<LeadStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeadStatus = async () => {
    if (!phoneNumber) return;

    try {
      const normalizedPhone = phoneNumber.replace(/@.*$/, '');
      const response = await fetch(`/api/leads/status/${normalizedPhone}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar status do lead');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setLeadStatus({
          exists: data.data.existe || false,
          formStatus: data.data.formStatus || data.data.status?.formStatus || 'not_sent',
          qualificationStatus: data.data.qualificationStatus || data.data.status?.qualificationStatus || undefined,
          pontuacao: data.data.pontuacao ?? data.data.status?.pontuacao,
          nome: data.data.nome || data.data.status?.nome,
        });
        setError(null);
      } else {
        setLeadStatus({
          exists: false,
          formStatus: 'not_sent',
          qualificationStatus: undefined,
        });
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Erro ao buscar status do lead:', err);
      setError('Erro ao carregar status');
      setIsLoading(false);
      setLeadStatus({
        exists: false,
        formStatus: 'not_sent',
        qualificationStatus: undefined,
      });
    }
  };

  useEffect(() => {
    fetchLeadStatus();
    
    const interval = setInterval(() => {
      fetchLeadStatus();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [phoneNumber, refreshInterval]);

  if (isLoading && !leadStatus) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Carregando...</span>
      </div>
    );
  }

  if (error && !leadStatus) {
    return null;
  }

  return (
    <FormStatusBadge
      formStatus={leadStatus?.formStatus || 'not_sent'}
      qualificationStatus={leadStatus?.qualificationStatus}
      pontuacao={leadStatus?.pontuacao}
      size="sm"
    />
  );
}
