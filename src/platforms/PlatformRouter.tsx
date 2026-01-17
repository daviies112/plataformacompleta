import { useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import DesktopApp from './desktop/DesktopApp';
import MobileApp from './mobile/MobileApp';
import ReuniaoPublica from '@/pages/ReuniaoPublica';
import { usePlatform } from './shared/hooks/usePlatform';

const ResellerApp = lazy(() => import('./reseller/ResellerApp'));
const RevendedoraApp = lazy(() => import('@/features/revendedora/RevendedoraApp'));

/**
 * PlatformRouter - Roteador inteligente que decide qual app renderizar
 * 
 * Prioridade de roteamento:
 * 1. Reunioes publicas (/reuniao/)
 * 2. Plataforma Revendedora (/reseller, /reseller-login)
 * 3. Desktop ou Mobile (baseado no dispositivo)
 */
const PlatformRouter = () => {
  const location = useLocation();
  const { isMobile } = usePlatform();

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
