import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const adminToken = localStorage.getItem('authToken');
  if (adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }
  const resellerToken = localStorage.getItem('reseller_auth_token');
  if (!adminToken && resellerToken) {
    headers['Authorization'] = `Bearer ${resellerToken}`;
  }
  const tenantId = localStorage.getItem('tenantId') || 
    (() => { try { const u = localStorage.getItem('user_data'); return u ? JSON.parse(u)?.tenantId : null; } catch { return null; } })();
  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }
  return headers;
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
      const authHeaders = getAuthHeaders();

      try {
        console.log('[AdminSupabaseProvider] Fetching credentials with auth headers...');
        const response = await fetch('/api/config/supabase/credentials', {
          credentials: 'include',
          headers: authHeaders,
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.credentials) {
            const creds = data.credentials;
            url = creds.url || creds.supabaseUrl || creds.supabase_url || null;
            anonKey = creds.anonKey || creds.anon_key || creds.supabaseAnonKey || creds.supabase_anon_key || null;
          } else if (data.url || data.supabase_url) {
            url = data.url || data.supabase_url || null;
            anonKey = data.anonKey || data.anon_key || data.supabase_anon_key || null;
          }
          if (url && anonKey) {
            console.log('[AdminSupabaseProvider] Got credentials from config endpoint');
          }
        } else {
          console.log('[AdminSupabaseProvider] Config endpoint returned status:', response.status);
        }
      } catch (e) {
        console.log('[AdminSupabaseProvider] Config endpoint failed:', e);
      }

      if (!url || !anonKey) {
        try {
          console.log('[AdminSupabaseProvider] Trying fallback /api/config/supabase...');
          const response = await fetch('/api/config/supabase', {
            credentials: 'include',
            headers: authHeaders,
          });
          if (response.ok) {
            const data = await response.json();
            const configData = data.config || data.credentials || data;
            url = configData.url || configData.supabaseUrl || configData.supabase_url || null;
            anonKey = configData.anonKey || configData.anon_key || configData.supabaseAnonKey || configData.supabase_anon_key || null;
            if (url && anonKey) {
              console.log('[AdminSupabaseProvider] Got credentials from fallback endpoint');
            }
          }
        } catch (e) {
          console.log('[AdminSupabaseProvider] Fallback endpoint also failed:', e);
        }
      }

      if (!url || !anonKey) {
        try {
          console.log('[AdminSupabaseProvider] Trying reseller endpoint...');
          const resellerToken = localStorage.getItem('reseller_auth_token');
          if (resellerToken) {
            const response = await fetch('/api/reseller/supabase-config', {
              credentials: 'include',
              headers: { 'Authorization': `Bearer ${resellerToken}`, 'Content-Type': 'application/json' },
            });
            if (response.ok) {
              const data = await response.json();
              url = data.supabase_url || null;
              anonKey = data.supabase_anon_key || null;
              if (url && anonKey) {
                console.log('[AdminSupabaseProvider] Got credentials from reseller endpoint');
              }
            }
          }
        } catch (e) {
          console.log('[AdminSupabaseProvider] Reseller endpoint failed:', e);
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
