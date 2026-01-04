import { usePlatform } from './shared/hooks/usePlatform';
import DesktopApp from './desktop/DesktopApp';
import MobileApp from './mobile/MobileApp';

/**
 * PlatformRouter - Roteador inteligente que decide qual app renderizar
 * Baseado na detecção da plataforma (mobile vs desktop)
 */
const PlatformRouter = () => {
  const { isMobile } = usePlatform();

  // Renderiza o app apropriado baseado na plataforma
  return isMobile ? <MobileApp /> : <DesktopApp />;
};

export default PlatformRouter;
