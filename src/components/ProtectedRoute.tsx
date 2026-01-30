import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [forceRedirect, setForceRedirect] = useState(false);

  const isDevelopment = import.meta.env.DEV;
  const bypassAuth = isDevelopment && window.location.hostname === '127.0.0.1';

  // Timeout de segurança: se ficar em loading por mais de 8 segundos, redireciona para login
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.warn('[ProtectedRoute] Timeout atingido - redirecionando para login');
        setForceRedirect(true);
      }, 8000);
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  if (bypassAuth) {
    return <>{children}</>;
  }

  // Se forceRedirect, vai para login
  if (forceRedirect && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading && !forceRedirect) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card border border-border p-8 rounded-2xl shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-lg font-semibold text-foreground">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};