import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface SupabaseContextType {
  client: SupabaseClient | null;
  loading: boolean;
  error: string | null;
  configured: boolean;
  refresh: () => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType>({
  client: null,
  loading: true,
  error: null,
  configured: false,
  refresh: async () => {},
});

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const retryCountRef = useRef(0);
  const maxRetries = 5;

  const fetchConfig = async (isRetry = false) => {
    try {
      if (!isRetry) {
        setLoading(true);
      }
      
      const response = await fetch('/api/reseller/supabase-config', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401 && retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          console.log(`[SupabaseProvider] Retry ${retryCountRef.current}/${maxRetries} - waiting for session...`);
          setTimeout(() => fetchConfig(true), 800);
          return;
        }
        throw new Error('Não autenticado');
      }
      
      retryCountRef.current = 0;
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
        console.log('[SupabaseProvider] Client created for:', data.supabase_url);
      } else {
        setConfigured(false);
        setClient(null);
        console.log('[SupabaseProvider] No credentials configured');
      }
    } catch (err: any) {
      console.error('[SupabaseProvider] Error:', err);
      setError(err.message);
      setConfigured(false);
      setClient(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <SupabaseContext.Provider value={{ client, loading, error, configured, refresh: fetchConfig }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  return useContext(SupabaseContext);
}
