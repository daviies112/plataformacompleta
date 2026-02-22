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

  // 🚨 DEBUG
  console.log('🔐 ProtectedRoute:', {
    isAuthenticated,
    isLoading,
    isDevelopment,
    hostname: window.location.hostname,
    bypassAuth,
    forceRedirect
  });

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
    console.log('✅ ProtectedRoute: BYPASS AUTH (dev mode)');
    return <>{children}</>;
  }

  // Se forceRedirect, vai para login
  if (forceRedirect && !isAuthenticated) {
    console.log('❌ ProtectedRoute: FORCE REDIRECT TO LOGIN');
    return <Navigate to="/login" replace />;
  }

  if (isLoading && !forceRedirect) {
    console.log('⏳ ProtectedRoute: LOADING...');
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
    console.log('❌ ProtectedRoute: NOT AUTHENTICATED - Redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ ProtectedRoute: AUTHENTICATED - Rendering children');
  return <>{children}</>;
};