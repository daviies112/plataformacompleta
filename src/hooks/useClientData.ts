import { useState, useEffect } from 'react';
import { ClientData, DashboardMetrics } from '@/types/client';
import { loadClientData } from '@/data/clientData';

export const useClientData = () => {
  const [clientData, setClientData] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await loadClientData();
        setClientData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Use fallback data on error
        setClientData([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const metrics: DashboardMetrics = {
    total_clients: clientData.length,
    active_conversations: clientData.filter(c => c.status_atendimento === 'active').length,
    pending_meetings: clientData.reduce((sum, c) => sum + (c.id_reuniao_atual ? 1 : 0), 0),
    completed_meetings: 0,
    response_rate: clientData.length > 0 ? 95 : 0,
    avg_response_time: "2.5min"
  };

  return { clientData, metrics, loading, error };
};