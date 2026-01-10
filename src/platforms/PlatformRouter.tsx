import DesktopApp from './desktop/DesktopApp';
import MobileApp from './mobile/MobileApp';
import ReuniaoPublica from '@/pages/ReuniaoPublica';
import { useLocation } from 'wouter';
import { usePlatform } from './shared/hooks/usePlatform';
import { Suspense } from 'react';

/**
 * PlatformRouter - Roteador inteligente que decide qual app renderizar
 * Baseado na detecção da plataforma (mobile vs desktop)
 */
const PlatformRouter = () => {
  const { isMobile } = usePlatform();
  const [location] = useLocation();

  console.log('[PlatformRouter] Location:', location, 'isMobile:', isMobile);

  // Se for uma rota pública de reunião, renderizar diretamente
  // Suporta /reuniao/:id, /reuniao/:tenant/:id, /reuniao-publica/:id
  if (location.startsWith('/reuniao/') || location.startsWith('/reuniao-publica/')) {
    return (
      <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">Carregando reunião...</div>}>
        <ReuniaoPublica />
      </Suspense>
    );
  }

  // Renderiza o app apropriado baseado na plataforma
  return isMobile ? <MobileApp /> : <DesktopApp />;
};

export default PlatformRouter;
