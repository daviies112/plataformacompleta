import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'viewer';
}

interface Client {
  id: string;
  name: string;
  email: string;
  plan_type: 'starter' | 'pro' | 'enterprise';
}

interface ClientCredentials {
  whatsapp: boolean;
  evolution_api: boolean;
  supabase_configured: boolean;
  n8n_configured: boolean;
  google_calendar?: boolean;
  google_meet?: boolean;
}

interface AuthContextType {
  user: User | null;
  client: Client | null;
  credentials: ClientCredentials | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  updateCredentials: (type: string, credentials: any) => Promise<boolean>;
  refreshCredentialFlags: () => Promise<void>;
  updateClient: (clientData: Partial<Client>) => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [credentials, setCredentials] = useState<ClientCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!client;

  // Verificar sessão ao carregar
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('[AuthContext] Checking session...');
        // Verificar se há sessão ativa no servidor
        const response = await fetch('/api/auth/check-session');
        const data = await response.json();
        console.log('[AuthContext] Session check response:', data);
        
        if (data.authenticated && data.user) {
          // Sessão válida - usar dados da sessão
          const userData: User = {
            id: data.user.id || '1',
            email: data.user.email,
            name: data.user.nome || data.user.name,
            role: 'admin' as const
          };
          
          const clientData: Client = {
            id: '1',
            name: 'Sua Empresa',
            email: data.user.email,
            plan_type: 'pro' as const
          };
          
          setUser(userData);
          setClient(clientData);
          
          // Salvar no localStorage para uso posterior
          localStorage.setItem('user_data', JSON.stringify(userData));
          localStorage.setItem('client_data', JSON.stringify(clientData));
          
          // Tentar carregar credenciais salvas
          const savedCredentials = localStorage.getItem('client_credentials');
          if (savedCredentials) {
            setCredentials(JSON.parse(savedCredentials));
          } else {
            setCredentials({
              whatsapp: true,
              evolution_api: true,
              supabase_configured: true,
              n8n_configured: true
            });
          }
        } else {
          // Sem sessão - limpar localStorage
          localStorage.removeItem('user_data');
          localStorage.removeItem('client_data');
          localStorage.removeItem('auth_token');
          setUser(null);
          setClient(null);
          setCredentials(null);
        }
      } catch (error) {
        console.error('[AuthContext] Erro ao verificar sessão:', error);
        // Em caso de erro, limpar dados
        localStorage.removeItem('user_data');
        localStorage.removeItem('client_data');
        localStorage.removeItem('auth_token');
        setUser(null);
        setClient(null);
        setCredentials(null);
      } finally {
        console.log('[AuthContext] Setting isLoading to false');
        setIsLoading(false);
      }
    };
    
    // Add timeout fallback to ensure isLoading is set to false
    const timeout = setTimeout(() => {
      console.log('[AuthContext] Timeout: forcing isLoading to false');
      setIsLoading(false);
    }, 5000);
    
    checkSession().finally(() => clearTimeout(timeout));
    
    return () => clearTimeout(timeout);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Fazer login via API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, senha: password }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Login bem-sucedido - usar dados do usuário retornados
        const userData: User = {
          id: data.user?.id || '1',
          email: data.user?.email || email,
          name: data.user?.nome || data.user?.name || 'Usuário',
          role: 'admin' as const
        };
        
        const clientData: Client = {
          id: '1',
          name: 'Sua Empresa',
          email: email,
          plan_type: 'pro' as const
        };
        
        setUser(userData);
        setClient(clientData);
        
        // Save JWT token for authenticated API requests (critical for host role in meetings)
        if (data.token) {
          localStorage.setItem('authToken', data.token);
          console.log('[AuthContext] Token JWT salvo para requisições autenticadas');
        }
        
        // Salvar no localStorage
        localStorage.setItem('user_data', JSON.stringify(userData));
        localStorage.setItem('client_data', JSON.stringify(clientData));
        
        // Configurar credenciais padrão
        const defaultCredentials = {
          whatsapp: true,
          evolution_api: true,
          supabase_configured: true,
          n8n_configured: true
        };
        setCredentials(defaultCredentials);
        localStorage.setItem('client_credentials', JSON.stringify(defaultCredentials));
        
        // Recarregar credenciais e workspace do Supabase após login bem-sucedido
        // Usando import dinâmico para evitar carregar módulos pesados antes do login
        console.log('🔄 Login bem-sucedido - recarregando credenciais do Supabase...');
        try {
          const { reloadSupabaseCredentials } = await import('@/lib/supabase');
          await reloadSupabaseCredentials();
          
          console.log('🔄 Recarregando workspace do Supabase...');
          const { useNotionStore } = await import('@/stores/notionStore');
          const reloadWorkspace = useNotionStore.getState().reloadFromSupabase;
          await reloadWorkspace();
        } catch (e) {
          console.warn('⚠️ Supabase/workspace reload opcional falhou:', e);
        }
        
        setIsLoading(false);
        return true;
      } else {
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Erro no login:', error);
      setIsLoading(false);
      return false;
    }
  };

  const updateCredentials = async (type: string, newCredentials: any): Promise<boolean> => {
    try {
      // Try API request first (for production backend)
      try {
        await apiRequest('PUT', `/api/credentials/${type}`, newCredentials);
        
        // Refresh credential flags after successful update
        await refreshCredentialFlags();
        
        return true;
      } catch (apiError) {
        console.log('API unavailable, using local storage for credentials');
      }
      
      // Fallback to local storage for demo/development
      if (!user || !client) {
        console.error('User or client not logged in');
        return false;
      }
      
      // Save credentials locally per client
      const clientCredentialsKey = `credentials_${client.id}`;
      const existingCredentials = JSON.parse(localStorage.getItem(clientCredentialsKey) || '{}');
      
      // Update specific credential type
      existingCredentials[type] = newCredentials;
      localStorage.setItem(clientCredentialsKey, JSON.stringify(existingCredentials));
      
      // Update credential flags
      const updatedFlags = { ...credentials };
      if (type === 'supabase') {
        updatedFlags.supabase_configured = true;
        // Update Supabase environment variables for immediate use
        if (newCredentials.url && newCredentials.anon_key) {
          (window as any).VITE_SUPABASE_URL = newCredentials.url;
          (window as any).VITE_SUPABASE_ANON_KEY = newCredentials.anon_key;
        }
      } else if (type === 'google_calendar') {
        updatedFlags.google_calendar = true;
        updatedFlags.google_meet = true;
      } else if (type === 'whatsapp') {
        updatedFlags.whatsapp = true;
      } else if (type === 'evolution_api') {
        updatedFlags.evolution_api = true;
      } else if (type === 'n8n') {
        updatedFlags.n8n_configured = true;
      }
      
      setCredentials(updatedFlags);
      localStorage.setItem('client_credentials', JSON.stringify(updatedFlags));
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar credenciais:', error);
      return false;
    }
  };

  const refreshCredentialFlags = async () => {
    try {
      const response = await apiRequest('GET', '/api/credentials');
      const credentialFlags = await response.json();
      setCredentials(credentialFlags);
      localStorage.setItem('client_credentials', JSON.stringify(credentialFlags));
    } catch (error) {
      console.error('Erro ao buscar flags de credenciais:', error);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
    }
  };

  const updateClient = (clientData: Partial<Client>) => {
    if (client) {
      const updatedClient = { ...client, ...clientData };
      setClient(updatedClient);
      localStorage.setItem('client_data', JSON.stringify(updatedClient));
    }
  };

  const logout = async () => {
    try {
      // 1. Chamar backend para destruir sessão
      await fetch('/api/auth/logout', { method: 'POST' });
      
      // 2. Limpar estado local SOMENTE após sucesso do backend
      setUser(null);
      setClient(null);
      setCredentials(null);
      localStorage.clear();
      
      // 3. Redirecionar para login
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Mesmo com erro, limpar estado local
      setUser(null);
      setClient(null);
      setCredentials(null);
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  const value: AuthContextType = {
    user,
    client,
    credentials,
    isAuthenticated,
    login,
    logout,
    isLoading,
    updateCredentials,
    refreshCredentialFlags,
    updateClient,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};