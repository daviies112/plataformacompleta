import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { resellerFetch } from '../lib/resellerAuth';

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

function createSupabaseClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      storage: localStorage,
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

export function AdminSupabaseProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      let url: string | null = null;
      let anonKey: string | null = null;

      try {
        const response = await resellerFetch('/api/reseller/supabase-config');
        if (response.ok) {
          const data = await response.json();
          url = data.supabase_url || null;
          anonKey = data.supabase_anon_key || null;
          if (url && anonKey) {
            console.log('[AdminSupabaseProvider] Got credentials from reseller endpoint');
          }
        }
      } catch (e) {
        console.log('[AdminSupabaseProvider] Reseller endpoint failed, trying config endpoint...');
      }

      if (!url || !anonKey) {
        try {
          const response = await fetch('/api/config/supabase/credentials', {
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            const creds = data.credentials;
            url = creds?.url || creds?.supabaseUrl || null;
            anonKey = creds?.anonKey || creds?.anon_key || creds?.supabaseAnonKey || null;
            if (url && anonKey) {
              console.log('[AdminSupabaseProvider] Got credentials from config endpoint');
            }
          }
        } catch (e) {
          console.log('[AdminSupabaseProvider] Config endpoint also failed');
        }
      }

      if (url && anonKey) {
        setClient(createSupabaseClient(url, anonKey));
        setConfigured(true);
        setError(null);
        console.log('[AdminSupabaseProvider] Client created for:', url);
      } else {
        console.log('[AdminSupabaseProvider] No credentials found from any endpoint');
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
