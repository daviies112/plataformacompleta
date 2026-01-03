import { usePlatform } from './shared/hooks/usePlatform';
import { useLocation } from 'react-router-dom';
// Direct imports instead of lazy loading to avoid Vite HMR + Suspense bugs
import DesktopApp from './desktop/DesktopApp';
import MobileApp from './mobile/MobileApp';
import Reuniao from '@/pages/Reuniao';
import PublicMeetingRoom from '@/pages/PublicMeetingRoom';

/**
 * PlatformRouter - Roteador inteligente que decide qual app renderizar
 * Baseado na detecção da plataforma (mobile vs desktop)
 * 
 * NOTA: Usando imports diretos ao invés de lazy() devido a bug do Vite HMR + Suspense
 * que causa o loading screen ficar preso. Em produção, o Vite faz code splitting automaticamente.
 */
const PlatformRouter = () => {
  const { isMobile } = usePlatform();
  const location = useLocation();

  // Se a rota for de reunião pública, renderiza o componente isolado sem layout
  if (location.pathname.startsWith('/reuniao/') && location.pathname.split('/').length === 4) {
    return <PublicMeetingRoom />;
  }

  // Se a rota for de reunião, renderiza o componente isolado sem layout
  if (location.pathname.startsWith('/reuniao/') && location.pathname.split('/').length === 3) {
    return <Reuniao />;
  }

  // Renderiza o app apropriado baseado na plataforma
  return isMobile ? <MobileApp /> : <DesktopApp />;
};

export default PlatformRouter;
