import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface DeviceInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isStandalone: boolean;
  platform: 'ios' | 'android' | 'desktop';
  browser: 'safari' | 'chrome' | 'firefox' | 'edge' | 'other';
}

export function detectDevice(): DeviceInfo {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isSafari = /safari/.test(ua) && !/chrome/.test(ua);
  const isChrome = /chrome/.test(ua) || /chromium/.test(ua);
  
  // Detectar standalone mode - iOS usa navigator.standalone, outros usam matchMedia
  let isStandalone = false;
  try {
    // iOS Safari
    if ('standalone' in navigator) {
      isStandalone = (navigator as any).standalone === true;
    }
    // Outros browsers
    if (!isStandalone && window.matchMedia) {
      isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    }
  } catch (e) {
    console.warn('[PWA] Erro ao detectar standalone mode:', e);
  }
  
  // Detectar se é mobile ou tablet
  const isMobileUA = /mobile/.test(ua);
  const isTabletUA = /tablet|ipad/.test(ua);
  const isMobile = (isIOS || isAndroid) && !isTabletUA;
  const isTablet = isTabletUA || (isAndroid && !isMobileUA);
  const isDesktop = !isMobile && !isTablet;

  // Detectar browser
  let browser: 'safari' | 'chrome' | 'firefox' | 'edge' | 'other' = 'other';
  if (isSafari) browser = 'safari';
  else if (/edg/.test(ua)) browser = 'edge';
  else if (isChrome) browser = 'chrome';
  else if (/firefox/.test(ua)) browser = 'firefox';

  // Determinar plataforma principal
  let platform: 'ios' | 'android' | 'desktop' = 'desktop';
  if (isIOS) platform = 'ios';
  else if (isAndroid) platform = 'android';

  return {
    isIOS,
    isAndroid,
    isMobile,
    isTablet,
    isDesktop,
    isSafari,
    isChrome,
    isStandalone,
    platform,
    browser,
  };
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [deviceInfo] = useState<DeviceInfo>(detectDevice());
  const [isInstalled, setIsInstalled] = useState(() => deviceInfo.isStandalone);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Verificar standalone mode novamente (importante para iOS)
    let currentlyStandalone = false;
    try {
      // iOS Safari usa navigator.standalone
      if ('standalone' in navigator) {
        currentlyStandalone = (navigator as any).standalone === true;
      }
      // Outros browsers usam matchMedia
      if (!currentlyStandalone && window.matchMedia) {
        currentlyStandalone = window.matchMedia('(display-mode: standalone)').matches;
      }
    } catch (e) {
      console.warn('[PWA] Erro ao verificar standalone mode no effect:', e);
    }

    // Se está em standalone mode, marcar como instalado
    if (currentlyStandalone) {
      console.log('✅ [PWA] App detectado em modo standalone - marcando como instalado');
      setIsInstalled(true);
      setCanInstall(false);
      return;
    }

    // Se já foi marcado como instalado anteriormente, não fazer nada
    if (isInstalled) {
      console.log('✅ [PWA] App já instalado - modo standalone detectado');
      return;
    }

    console.log('📱 [PWA] Device Info:', {
      platform: deviceInfo.platform,
      browser: deviceInfo.browser,
      isMobile: deviceInfo.isMobile,
      isTablet: deviceInfo.isTablet,
      isStandalone: deviceInfo.isStandalone,
    });

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js', { scope: '/' })
        .then((registration) => {
          console.log('✅ [PWA] Service Worker registrado:', registration.scope);
          // Verificar se há update
          registration.update();
        })
        .catch((error) => {
          console.error('❌ [PWA] Erro ao registrar Service Worker:', error);
        });
    }

    // Listener para beforeinstallprompt (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('🎯 [PWA] beforeinstallprompt recebido - instalação automática disponível!');
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      // Salvar também no window global para acesso posterior (importante para iframes)
      (window as any).deferredPrompt = promptEvent;
      setCanInstall(true);
    };

    // Listener para quando o app é instalado
    const handleAppInstalled = () => {
      console.log('🎉 [PWA] App instalado com sucesso!');
      setIsInstalled(true);
      setDeferredPrompt(null);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Para iOS Safari, o botão sempre pode ser mostrado (instalação manual)
    if (deviceInfo.isIOS && deviceInfo.isSafari && !deviceInfo.isStandalone) {
      console.log('📱 [PWA] iOS Safari detectado - instalação manual disponível');
      setCanInstall(true);
    }

    // Para Android não-Chrome, também permitir mostrar instruções
    if (deviceInfo.isAndroid && !deviceInfo.isChrome && !deviceInfo.isStandalone) {
      console.log('📱 [PWA] Android detectado - instalação manual disponível');
      setCanInstall(true);
    }

    // MODO TESTE: Sempre mostrar botão em desenvolvimento para testar UI
    // Detectar se está em ambiente Replit/iframe ou localhost
    const isDevelopment = window.location.hostname.includes('replit') || 
                         window.location.hostname.includes('localhost') ||
                         window.location.hostname.includes('127.0.0.1') ||
                         window.self !== window.top;
    
    if (isDevelopment && !deviceInfo.isStandalone) {
      console.log('🧪 [PWA] Modo desenvolvimento detectado - botão sempre visível para testes');
      setCanInstall(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled, deviceInfo]);

  const install = async (): Promise<'success' | 'dismissed' | 'manual' | 'error'> => {
    // Se tem prompt automático (Chrome/Edge/Android Chrome)
    if (deferredPrompt) {
      try {
        console.log('🚀 [PWA] Iniciando instalação automática com deferredPrompt...');
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          console.log('✅ [PWA] Usuário aceitou instalar');
          setDeferredPrompt(null);
          return 'success';
        } else {
          console.log('ℹ️ [PWA] Usuário recusou a instalação');
          return 'dismissed';
        }
      } catch (error) {
        console.error('❌ [PWA] Erro ao instalar:', error);
        return 'error';
      }
    }
    
    // Para Android Chrome em iframes (Replit), tentar forçar a instalação
    if (deviceInfo.isAndroid && deviceInfo.isChrome) {
      console.log('🔧 [PWA] Android Chrome detectado - tentando instalação alternativa...');
      
      // Tentar usar o evento global se existir
      const globalPrompt = (window as any).deferredPrompt;
      if (globalPrompt) {
        try {
          console.log('🚀 [PWA] Usando prompt global...');
          await globalPrompt.prompt();
          const choiceResult = await globalPrompt.userChoice;
          
          if (choiceResult.outcome === 'accepted') {
            console.log('✅ [PWA] Usuário aceitou instalar (via prompt global)');
            return 'success';
          } else {
            console.log('ℹ️ [PWA] Usuário recusou a instalação');
            return 'dismissed';
          }
        } catch (error) {
          console.error('❌ [PWA] Erro ao instalar via prompt global:', error);
        }
      }
      
      // Se não conseguiu instalar automaticamente, mostrar instruções específicas do Chrome
      console.log('ℹ️ [PWA] Instalação automática não disponível - mostrar instruções do Chrome');
      return 'manual';
    }
    
    // Para iOS e outros casos, retornar 'manual' para mostrar instruções
    console.log('ℹ️ [PWA] Instalação automática não disponível - mostrar instruções');
    return 'manual';
  };

  return {
    install,
    canInstall: canInstall && !isInstalled,
    isInstalled,
    deferredPrompt,
    deviceInfo,
  };
}
