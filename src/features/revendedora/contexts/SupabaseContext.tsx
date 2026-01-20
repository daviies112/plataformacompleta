import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reseller/supabase-config', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Não autenticado');
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
