import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface LeadStatus {
  exists: boolean;
  lead?: {
    id: string;
    nome: string;
    telefone: string;
    formStatus: string;
    qualificationStatus: string;
    pontuacao: number | null;
    formularioEnviado: boolean;
    formularioAberto: boolean;
    formularioIniciado: boolean;
    formularioConcluido: boolean;
    updatedAt: string;
  };
}

interface WhatsappLabel {
  id: string;
  nome: string;
  cor: string;
  formStatus: string;
  qualificationStatus: string | null;
  ordem: number;
}

interface LeadStatusContextType {
  getStatus: (telefone: string) => LeadStatus | null;
  loadStatuses: (telefones: string[]) => Promise<void>;
  refreshAll: () => Promise<void>;
  isLoading: boolean;
  labels: WhatsappLabel[];
}

const LeadStatusContext = createContext<LeadStatusContextType | undefined>(undefined);

export function LeadStatusProvider({ children }: { children: React.ReactNode }) {
  const [statusCache, setStatusCache] = useState<Map<string, LeadStatus>>(new Map());
  const [labels, setLabels] = useState<WhatsappLabel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const batchQueueRef = useRef<Set<string>>(new Set());
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const allTelefonesRef = useRef<Set<string>>(new Set());

  const cleanTelefone = useCallback((telefone: string) => {
    return telefone.replace(/@s\.whatsapp\.net$/, '').replace(/@c\.us$/, '').replace(/@g\.us$/, '');
  }, []);

  const processBatch = useCallback(async (telefones: string[]) => {
    if (telefones.length === 0) return;

    try {
      console.log(`📦 [LeadStatusContext] Processando batch de ${telefones.length} telefones`);
      setIsLoading(true);

      const response = await fetch('/api/leads/status/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telefones }),
      });

      const data = await response.json();

      if (data.success) {
        setStatusCache(prev => {
          const newCache = new Map(prev);
          data.results.forEach((result: any) => {
            const cleanPhone = cleanTelefone(result.telefone);
            newCache.set(cleanPhone, {
              exists: result.exists,
              lead: result.lead,
            });
          });
          return newCache;
        });
        console.log(`✅ [LeadStatusContext] Batch processado com sucesso`);
      }
    } catch (error) {
      console.error('❌ [LeadStatusContext] Erro ao processar batch:', error);
    } finally {
      setIsLoading(false);
    }
  }, [cleanTelefone]);

  const scheduleBatch = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    batchTimeoutRef.current = setTimeout(() => {
      const telefones = Array.from(batchQueueRef.current);
      batchQueueRef.current.clear();
      processBatch(telefones);
    }, 100);
  }, [processBatch]);

  const loadStatuses = useCallback(async (telefones: string[]) => {
    const telefonesLimpos = telefones.map(cleanTelefone);
    
    telefonesLimpos.forEach(t => allTelefonesRef.current.add(t));

    const telefonesNaoCarregados = telefonesLimpos.filter(
      telefone => !statusCache.has(telefone)
    );

    if (telefonesNaoCarregados.length === 0) {
      return;
    }

    telefonesNaoCarregados.forEach(telefone => batchQueueRef.current.add(telefone));
    
    scheduleBatch();
  }, [statusCache, cleanTelefone, scheduleBatch]);

  const getStatus = useCallback((telefone: string): LeadStatus | null => {
    const cleanPhone = cleanTelefone(telefone);
    return statusCache.get(cleanPhone) || null;
  }, [statusCache, cleanTelefone]);

  const refreshAll = useCallback(async () => {
    const telefones = Array.from(allTelefonesRef.current);
    if (telefones.length === 0) return;
    
    console.log(`🔄 [LeadStatusContext] Atualizando ${telefones.length} telefones`);
    await processBatch(telefones);
  }, [processBatch]);

  useEffect(() => {
    const loadLabels = async () => {
      try {
        const response = await fetch('/api/whatsapp-complete/labels');
        const data = await response.json();
        const labelsArray = data.success && Array.isArray(data.labels) ? data.labels : [];
        setLabels(labelsArray);
        console.log('✅ [LeadStatusContext] Labels carregadas:', labelsArray.length);
      } catch (error) {
        console.error('❌ [LeadStatusContext] Erro ao carregar labels:', error);
        setLabels([]);
      }
    };
    loadLabels();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshAll();
    }, 10000);

    return () => clearInterval(interval);
  }, [refreshAll]);

  const value = {
    getStatus,
    loadStatuses,
    refreshAll,
    isLoading,
    labels,
  };

  return (
    <LeadStatusContext.Provider value={value}>
      {children}
    </LeadStatusContext.Provider>
  );
}

export function useLeadStatus() {
  const context = useContext(LeadStatusContext);
  if (!context) {
    throw new Error('useLeadStatus must be used within a LeadStatusProvider');
  }
  return context;
}
