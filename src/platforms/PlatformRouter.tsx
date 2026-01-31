import { useLocation } from 'react-router-dom';
import { Suspense, lazy, useMemo } from 'react';
import { FormLoader } from '@/features/formularios-platform/components/FormLoader';
import { usePlatform } from './shared/hooks/usePlatform';
import { Loader2 } from 'lucide-react';

// Componentes principais - imports estáticos para evitar problemas de lazy loading em dev
import DesktopApp from './desktop/DesktopApp';
import MobileApp from './mobile/MobileApp';
import RevendedoraApp from '@/features/revendedora/RevendedoraApp';

// Rotas públicas - lazy loading para performance (carregam separadamente)
const ReuniaoPublica = lazy(() => import('@/pages/ReuniaoPublica'));
const FormularioPublicoWrapper = lazy(() => import('@/features/formularios-platform/pages/FormularioPublicoWrapper'));
const ResellerApp = lazy(() => import('./reseller/ResellerApp'));
const PublicStore = lazy(() => import('@/features/revendedora/pages/public/PublicStore'));
const PublicCheckout = lazy(() => import('@/features/revendedora/pages/public/PublicCheckout'));

// Fallback loading simples e leve
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

/**
 * PlatformRouter - Roteador inteligente que decide qual app renderizar
 * 
 * Prioridade de roteamento:
 * 1. Formularios publicos (/formulario/:slug/form/:id, /form/:id, /f/:token)
 * 2. Reunioes publicas (/reuniao/)
 * 3. Plataforma Revendedora (/reseller, /reseller-login)
 * 4. Desktop ou Mobile (baseado no dispositivo)
 */
const PlatformRouter = () => {
  const location = useLocation();
  const { isMobile } = usePlatform();

  // Detectar se é uma rota pública de formulário
  // Padrões: /formulario/:slug/form/:id, /:slug/form/:id, /form/:id, /f/:token
  const isPublicFormRoute = useMemo(() => {
    const path = location.pathname;
    
    // /formulario/:companySlug/form/:id - formato com slug da empresa
    if (/^\/formulario\/[^/]+\/form\/[^/]+/.test(path)) {
      return true;
    }
    
    // /:companySlug/form/:id - formato curto com slug da empresa
    if (/^\/[^/]+\/form\/[^/]+/.test(path) && !path.startsWith('/formulario')) {
      return true;
    }
    
    // /form/:id - acesso público direto
    if (/^\/form\/[^/]+/.test(path)) {
      return true;
    }
    
    // /f/:token - acesso com token
    if (/^\/f\/[^/]+/.test(path)) {
      return true;
    }
    
    return false;
  }, [location.pathname]);

  // Se for uma rota pública de formulário, renderizar diretamente
  if (isPublicFormRoute) {
    return <FormularioPublicoWrapper />;
  }

  // Se for uma rota pública de loja, renderizar diretamente SEM autenticação
  if (location.pathname.startsWith('/loja/')) {
    return <PublicStore />;
  }

  // Se for uma rota pública de checkout, renderizar diretamente SEM autenticação
  if (location.pathname.startsWith('/checkout/')) {
    return <PublicCheckout />;
  }

  // Se for uma rota publica de reuniao, renderizar diretamente
  if (location.pathname.startsWith('/reuniao/') || location.pathname.startsWith('/reuniao-publica/')) {
    return <ReuniaoPublica />;
  }

  // ===== NEXUS: Plataforma Revendedora =====
  // Se for rota de revendedora, renderizar RevendedoraApp diretamente (fora do DesktopApp/MobileApp)
  // Import estático para evitar problemas de lazy loading em dev
  if (location.pathname.startsWith('/revendedora') || location.pathname.startsWith('/reseller') || location.pathname === '/reseller-login') {
    return <RevendedoraApp />;
  }

  // Componentes principais não precisam de Suspense (imports estáticos)
  return isMobile ? <MobileApp /> : <DesktopApp />;
};

export default PlatformRouter;
