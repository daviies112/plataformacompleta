import { useLocation } from 'wouter';
import { lazy, Suspense } from 'react';

// Lazy load apps and pages for better performance
const DesktopApp = lazy(() => import('./desktop/DesktopApp'));
const MobileApp = lazy(() => import('./mobile/MobileApp'));
const ReuniaoPublica = lazy(() => import('@/pages/ReuniaoPublica'));

// Pre-load ReuniaoPublica as it's a priority for external links
const prefetchReuniao = () => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = '/src/pages/ReuniaoPublica.tsx';
  document.head.appendChild(link);
};

/**
 * PlatformRouter - Roteador inteligente que decide qual app renderizar
 */
const PlatformRouter = () => {
  const [location] = useLocation();

  // Se for uma rota pública de reunião, renderizar diretamente com prioridade
  if (location.startsWith('/reuniao/') || location.startsWith('/reuniao-publica/')) {
    return (
      <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-background text-foreground animate-pulse">Iniciando reunião...</div>}>
        <ReuniaoPublica />
      </Suspense>
    );
  }

  // Importar usePlatform sob demanda para evitar bloqueio inicial
  const { isMobile } = require('./shared/hooks/usePlatform').usePlatform();

  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-background">Carregando plataforma...</div>}>
      {isMobile ? <MobileApp /> : <DesktopApp />}
    </Suspense>
  );
};

export default PlatformRouter;
