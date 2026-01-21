import { useLocation } from 'react-router-dom';
import { Suspense, lazy, useMemo } from 'react';
import DesktopApp from './desktop/DesktopApp';
import MobileApp from './mobile/MobileApp';
import ReuniaoPublica from '@/pages/ReuniaoPublica';
import FormularioPublicoWrapper from '@/features/formularios-platform/pages/FormularioPublicoWrapper';
import { usePlatform } from './shared/hooks/usePlatform';

const ResellerApp = lazy(() => import('./reseller/ResellerApp'));
const RevendedoraApp = lazy(() => import('@/features/revendedora/RevendedoraApp'));
const PublicStore = lazy(() => import('@/features/revendedora/pages/public/PublicStore'));
const PublicCheckout = lazy(() => import('@/features/revendedora/pages/public/PublicCheckout'));

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

  // Se for uma rota pública de formulário, renderizar diretamente SEM autenticação
  if (isPublicFormRoute) {
    return <FormularioPublicoWrapper />;
  }

  // Se for uma rota pública de loja, renderizar diretamente SEM autenticação
  if (location.pathname.startsWith('/loja/')) {
    return (
      <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-background text-foreground animate-pulse font-sans">Carregando loja...</div>}>
        <PublicStore />
      </Suspense>
    );
  }

  // Se for uma rota pública de checkout, renderizar diretamente SEM autenticação
  if (location.pathname.startsWith('/checkout/')) {
    return (
      <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-background text-foreground animate-pulse font-sans">Carregando checkout...</div>}>
        <PublicCheckout />
      </Suspense>
    );
  }

  // Se for uma rota publica de reuniao, renderizar diretamente
  if (location.pathname.startsWith('/reuniao/') || location.pathname.startsWith('/reuniao-publica/')) {
    return (
      <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-background text-foreground animate-pulse font-sans">Iniciando reuniao...</div>}>
        <ReuniaoPublica />
      </Suspense>
    );
  }

  // ===== NEXUS: Plataforma Revendedora =====
  // Se for rota de revendedora, renderizar RevendedoraApp diretamente (fora do DesktopApp/MobileApp)
  if (location.pathname.startsWith('/revendedora') || location.pathname.startsWith('/reseller') || location.pathname === '/reseller-login') {
    return (
      <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-background text-foreground font-sans">Carregando portal...</div>}>
        <RevendedoraApp />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-background text-foreground font-sans">Carregando plataforma...</div>}>
      {isMobile ? <MobileApp /> : <DesktopApp />}
    </Suspense>
  );
};

export default PlatformRouter;
