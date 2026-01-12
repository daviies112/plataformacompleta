import { useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import DesktopApp from './desktop/DesktopApp';
import MobileApp from './mobile/MobileApp';
import ReuniaoPublica from '@/pages/ReuniaoPublica';
import { usePlatform } from './shared/hooks/usePlatform';

/**
 * PlatformRouter - Roteador inteligente que decide qual app renderizar
 */
const PlatformRouter = () => {
  const location = useLocation();
  const { isMobile } = usePlatform();

  // Se for uma rota pública de reunião, renderizar diretamente
  if (location.pathname.startsWith('/reuniao/') || location.pathname.startsWith('/reuniao-publica/')) {
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
