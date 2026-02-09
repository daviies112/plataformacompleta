import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * RootRedirect Component
 * 
 * Redireciona usuários autenticados de "/" para "/dashboard"
 * Usuários não autenticados vão para "/login"
 */
export const RootRedirect = () => {
  const { isAuthenticated } = useAuth();
  
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
};
