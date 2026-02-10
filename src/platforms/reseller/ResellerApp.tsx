import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ResellerLayout from './components/ResellerLayout';
import { useResellerAuth } from './hooks/useResellerAuth';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Catalog = lazy(() => import('./pages/Catalog'));
const MySales = lazy(() => import('./pages/MySales'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('@/features/revendedora/pages/Login'));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
    </div>
  );
}

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useResellerAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/reseller-login" replace />;
  }

  return (
    <ResellerLayout>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="sales" element={<MySales />} />
          <Route path="settings" element={<Settings />} />
          <Route path="" element={<Navigate to="/reseller/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/reseller/dashboard" replace />} />
        </Routes>
      </Suspense>
    </ResellerLayout>
  );
}

export default function ResellerApp() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/reseller-login" element={<Login />} />
        <Route path="/reseller/*" element={<ProtectedRoutes />} />
        <Route path="*" element={<Navigate to="/reseller-login" replace />} />
      </Routes>
    </Suspense>
  );
}
