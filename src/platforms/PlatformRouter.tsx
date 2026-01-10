import { useLocation } from 'wouter';
import { lazy, Suspense } from 'react';
import { usePlatform } from './shared/hooks/usePlatform';

// Lazy load apps and pages for better performance
const DesktopApp = lazy(() => import('./desktop/DesktopApp'));
const MobileApp = lazy(() => import('./mobile/MobileApp'));
const ReuniaoPublica = lazy(() => import('@/pages/ReuniaoPublica'));

/**
 * PlatformRouter - Roteador inteligente que decide qual app renderizar
 */
const PlatformRouter = () => {
  const [location] = useLocation();
  const { isMobile } = usePlatform();

  // Se for uma rota pública de reunião, renderizar diretamente com prioridade
  if (location.startsWith('/reuniao/') || location.startsWith('/reuniao-publica/')) {
    return (
      <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-background text-foreground animate-pulse font-sans">Iniciando reunião...</div>}>
        <ReuniaoPublica />
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
