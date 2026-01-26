import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { resellerFetch } from '../lib/resellerAuth';

interface SupabaseContextType {
  client: SupabaseClient | null;
  loading: boolean;
  error: string | null;
  configured: boolean;
  refresh: () => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType>({
  client: null,
  loading: false,
  error: null,
  configured: false,
  refresh: async () => {},
});

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isConfiguredRef = useRef(false);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(() => {
      if (!isConfiguredRef.current) {
        fetchConfigInternal();
      }
    }, 2000);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const fetchConfigInternal = useCallback(async () => {
    try {
      const response = await resellerFetch('/api/reseller/supabase-config');
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('[SupabaseProvider] Not authenticated yet, will retry...');
          setConfigured(false);
          setClient(null);
          isConfiguredRef.current = false;
          return;
        }
        throw new Error('Erro ao buscar configuração');
      }
      
      const data = await response.json();
      
      if (data.supabase_url && data.supabase_anon_key) {
        const newClient = createClient(data.supabase_url, data.supabase_anon_key, {
          auth: {
            storage: localStorage,
            persistSession: false,
            autoRefreshToken: false,
          }
        });
        setClient(newClient);
        setConfigured(true);
        setError(null);
        isConfiguredRef.current = true;
        console.log('[SupabaseProvider] Client created for:', data.supabase_url);
        stopPolling();
      } else {
        console.log('[SupabaseProvider] No credentials configured');
        setConfigured(false);
        setClient(null);
        isConfiguredRef.current = false;
      }
    } catch (err: any) {
      console.error('[SupabaseProvider] Error:', err);
      setError(err.message);
      setConfigured(false);
      setClient(null);
      isConfiguredRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [stopPolling]);

  const refresh = useCallback(async () => {
    setLoading(true);
    isConfiguredRef.current = false;
    await fetchConfigInternal();
    if (!isConfiguredRef.current) {
      startPolling();
    }
  }, [fetchConfigInternal, startPolling]);

  useEffect(() => {
    fetchConfigInternal();
    startPolling();
    
    return () => {
      stopPolling();
    };
  }, [fetchConfigInternal, startPolling, stopPolling]);

  return (
    <SupabaseContext.Provider value={{ client, loading, error, configured, refresh }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  return useContext(SupabaseContext);
}
