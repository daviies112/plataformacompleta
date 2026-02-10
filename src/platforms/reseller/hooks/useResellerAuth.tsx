import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface ResellerUser {
  id: string;
  nome: string;
  email: string;
  role: 'reseller';
  comissao: number;
}

interface UseResellerAuthReturn {
  user: ResellerUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, senha: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export function useResellerAuth(): UseResellerAuthReturn {
  const [user, setUser] = useState<ResellerUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/reseller/check-session', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Erro ao verificar sessao:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (email: string, senha: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/reseller/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, senha })
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        navigate(data.redirect || '/reseller/dashboard');
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Erro ao fazer login' };
      }
    } catch (error: any) {
      console.error('Erro no login:', error);
      return { success: false, error: error.message || 'Erro de conexao' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/reseller/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      navigate('/reseller-login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    checkSession
  };
}
