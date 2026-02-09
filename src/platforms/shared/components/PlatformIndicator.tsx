import { usePlatform } from '../hooks/usePlatform';

/**
 * Componente de Debug - Mostra qual plataforma está ativa
 * Útil durante desenvolvimento para verificar detecção de plataforma
 */
export const PlatformIndicator = () => {
  const { platform, screenWidth, orientation } = usePlatform();
  
  // Só mostra em desenvolvimento
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  const platformColors = {
    mobile: 'bg-blue-500',
    tablet: 'bg-purple-500',
    desktop: 'bg-green-500',
  };
  
  const platformIcons = {
    mobile: '📱',
    tablet: '📲',
    desktop: '🖥️',
  };
  
  return (
    <div className="fixed bottom-4 left-4 z-[9999] pointer-events-none">
      <div className={`${platformColors[platform]} text-white px-3 py-2 rounded-lg shadow-lg text-xs font-mono flex items-center gap-2`}>
        <span className="text-base">{platformIcons[platform]}</span>
        <div>
          <div className="font-bold uppercase">{platform}</div>
          <div className="opacity-80">{screenWidth}px • {orientation}</div>
        </div>
      </div>
    </div>
  );
};
