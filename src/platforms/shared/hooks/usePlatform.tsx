import { useState, useEffect } from 'react';

export type Platform = 'desktop' | 'mobile' | 'tablet';

interface PlatformInfo {
  platform: Platform;
  isMobile: boolean;
  isDesktop: boolean;
  isTablet: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
}

const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
} as const;

/**
 * Hook robusto para detecção de plataforma
 * Retorna informações completas sobre a plataforma atual
 */
export function usePlatform(): PlatformInfo {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        platform: 'desktop',
        isMobile: false,
        isDesktop: true,
        isTablet: false,
        screenWidth: 1920,
        screenHeight: 1080,
        orientation: 'landscape',
      };
    }

    return getPlatformInfo();
  });

  useEffect(() => {
    const handleResize = () => {
      setPlatformInfo(getPlatformInfo());
    };

    const handleOrientationChange = () => {
      setPlatformInfo(getPlatformInfo());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Initial check
    setPlatformInfo(getPlatformInfo());

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return platformInfo;
}

function getPlatformInfo(): PlatformInfo {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const orientation = width > height ? 'landscape' : 'portrait';

  let platform: Platform;
  if (width < BREAKPOINTS.mobile) {
    platform = 'mobile';
  } else if (width < BREAKPOINTS.tablet) {
    platform = 'tablet';
  } else {
    platform = 'desktop';
  }

  return {
    platform,
    isMobile: platform === 'mobile',
    isDesktop: platform === 'desktop',
    isTablet: platform === 'tablet',
    screenWidth: width,
    screenHeight: height,
    orientation,
  };
}

/**
 * Hook simplificado para apenas verificar se é mobile
 */
export function useIsMobile(): boolean {
  const { isMobile } = usePlatform();
  return isMobile;
}

/**
 * Hook simplificado para apenas verificar se é desktop
 */
export function useIsDesktop(): boolean {
  const { isDesktop } = usePlatform();
  return isDesktop;
}
