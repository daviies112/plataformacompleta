import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { apiRequest } from '@/lib/queryClient';

interface AdminSupabaseContextType {
  client: SupabaseClient | null;
  loading: boolean;
  error: string | null;
  configured: boolean;
  refresh: () => Promise<void>;
}

const AdminSupabaseContext = createContext<AdminSupabaseContextType>({
  client: null,
  loading: false,
  error: null,
  configured: false,
  refresh: async () => {},
});

export function AdminSupabaseProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiRequest('GET', '/api/config/supabase/credentials');
      const data = await response.json();
      
      if (data.success && data.credentials?.url && data.credentials?.anonKey) {
        const newClient = createClient(data.credentials.url, data.credentials.anonKey, {
          auth: {
            storage: localStorage,
            persistSession: false,
            autoRefreshToken: false,
          }
        });
        setClient(newClient);
        setConfigured(true);
        setError(null);
        console.log('[AdminSupabaseProvider] Client created for:', data.credentials.url);
      } else {
        console.log('[AdminSupabaseProvider] No credentials configured');
        setConfigured(false);
        setClient(null);
      }
    } catch (err: any) {
      console.error('[AdminSupabaseProvider] Error:', err);
      setError(err.message);
      setConfigured(false);
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return (
    <AdminSupabaseContext.Provider value={{ client, loading, error, configured, refresh }}>
      {children}
    </AdminSupabaseContext.Provider>
  );
}

export function useAdminSupabase() {
  return useContext(AdminSupabaseContext);
}
