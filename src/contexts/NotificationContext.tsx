import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface NotificationSettings {
  enabled: string;
  sound: string;
  vibration: string;
  badge: string;
  showPreview: string;
  quietHoursEnabled: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  supabaseEnabled: string;
  calendarEnabled: string;
  pluggyEnabled: string;
  systemEnabled: string;
  frequency: string;
  groupNotifications: string;
}

interface NotificationHistory {
  id: number;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  sentAt: Date;
  success: string;
  devicesSent: number;
  read?: string;
  readAt?: Date;
}

interface NotificationContextType {
  permission: NotificationPermission;
  isRegistered: boolean;
  settings: NotificationSettings | null;
  history: NotificationHistory[];
  isLoading: boolean;
  vapidPublicKey: string | null;
  requestPermission: () => Promise<boolean>;
  registerDevice: () => Promise<boolean>;
  unregisterDevice: () => Promise<boolean>;
  updateSettings: (newSettings: Partial<NotificationSettings>) => Promise<boolean>;
  sendTestNotification: () => Promise<boolean>;
  refreshHistory: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const { isAuthenticated } = useAuth();
  const isAuthenticatedRef = useRef(isAuthenticated);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isRegistered, setIsRegistered] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [deviceToken, setDeviceToken] = useState<string | null>(() => {
    // Recuperar token hash do localStorage
    return localStorage.getItem('notification_device_token');
  });

  // Manter ref atualizado
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const fetchVapidKey = async () => {
    try {
      const response = await fetch('/api/notifications/vapid-public-key');
      if (response.ok) {
        const data = await response.json();
        setVapidPublicKey(data.publicKey);
        return data.publicKey;
      }
    } catch (error) {
      console.error('Erro ao buscar chave VAPID:', error);
    }
    return null;
  };

  const fetchSettings = async () => {
    if (!isAuthenticatedRef.current) {
      console.log('[Notifications] Não autenticado - aguardando login');
      return;
    }

    try {
      const response = await fetch('/api/notifications/settings');
      if (response.ok) {
        const data = await response.json();
        // Verificar novamente antes de setar (evitar race condition em logout)
        if (isAuthenticatedRef.current) {
          setSettings(data);
        } else {
          console.log('[Notifications] Descartando settings - usuário deslogou');
        }
      } else if (response.status === 401) {
        console.log('[Notifications] Não autorizado - sessão expirada');
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    }
  };

  const fetchHistory = async () => {
    if (!isAuthenticatedRef.current) {
      console.log('[Notifications] Não autenticado - aguardando login');
      return;
    }

    try {
      const response = await fetch('/api/notifications/history?limit=50');
      if (response.ok) {
        const data = await response.json();
        // Verificar novamente antes de setar (evitar race condition em logout)
        if (isAuthenticatedRef.current) {
          setHistory(data);
        } else {
          console.log('[Notifications] Descartando history - usuário deslogou');
        }
      } else if (response.status === 401) {
        console.log('[Notifications] Não autorizado - sessão expirada');
      }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    }
  };

  const checkRegistrationStatus = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsRegistered(false);
      return;
    }

    try {
      // Add timeout to prevent blocking app initialization
      const registrationPromise = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Service worker timeout')), 3000)
      );
      
      const registration = await Promise.race([registrationPromise, timeoutPromise]) as ServiceWorkerRegistration;
      const subscription = await registration.pushManager.getSubscription();
      setIsRegistered(!!subscription);
    } catch (error) {
      console.log('Service worker não disponível ainda:', error);
      setIsRegistered(false);
    }
  };

  useEffect(() => {
    const initNotifications = async () => {
      if ('Notification' in window) {
        setPermission(Notification.permission);
      }

      // Sempre buscar VAPID key (não precisa auth)
      await fetchVapidKey();
      await checkRegistrationStatus();

      // Buscar settings e history apenas se autenticado
      if (isAuthenticated) {
        await Promise.all([
          fetchSettings(),
          fetchHistory(),
        ]);
      } else {
        // Limpar dados quando não autenticado (logout ou não logado)
        console.log('[Notifications] Não autenticado - limpando dados');
        setSettings(null);
        setHistory([]);
      }

      setIsLoading(false);
    };

    initNotifications();
  }, [isAuthenticated]);

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.error('Notificações não suportadas');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      return false;
    }
  };

  const registerDevice = async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.error('Push notifications não suportadas');
      return false;
    }

    try {
      const key = vapidPublicKey || await fetchVapidKey();
      if (!key) {
        console.error('Chave VAPID não disponível');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      const response = await fetch('/api/notifications/devices/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceInfo: {
            type: 'web',
            name: navigator.userAgent,
            model: navigator.platform,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Guardar token hash retornado pelo backend
        if (data.token) {
          setDeviceToken(data.token);
          localStorage.setItem('notification_device_token', data.token);
          console.log(`✅ Dispositivo registrado com token: ${data.token.substring(0, 8)}...`);
        }
        setIsRegistered(true);
        return true;
      } else {
        console.error('Erro ao registrar dispositivo');
        return false;
      }
    } catch (error) {
      console.error('Erro ao registrar dispositivo:', error);
      return false;
    }
  };

  const unregisterDevice = async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    try {
      // Usar token hash armazenado para remover do backend
      if (deviceToken) {
        const response = await fetch(`/api/notifications/devices/${deviceToken}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          console.log('✅ Dispositivo removido do backend');
        } else {
          console.error('Erro ao remover dispositivo do backend');
        }
      }

      // Remover subscription do navegador
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Limpar estado local
      setDeviceToken(null);
      localStorage.removeItem('notification_device_token');
      setIsRegistered(false);
      console.log('✅ Dispositivo desregistrado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao desregistrar dispositivo:', error);
      return false;
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>): Promise<boolean> => {
    if (!isAuthenticatedRef.current) {
      console.log('[Notifications] updateSettings bloqueado - não autenticado');
      return false;
    }

    try {
      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (response.ok) {
        await fetchSettings();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      return false;
    }
  };

  const sendTestNotification = async (): Promise<boolean> => {
    if (!isAuthenticatedRef.current) {
      console.log('[Notifications] sendTestNotification bloqueado - não autenticado');
      return false;
    }

    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
      });

      if (response.ok) {
        await fetchHistory();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao enviar notificação de teste:', error);
      return false;
    }
  };

  const refreshHistory = async () => {
    await fetchHistory();
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await fetch(`/api/notifications/history/${notificationId}/read`, {
        method: 'POST',
      });
      await fetchHistory();
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const value: NotificationContextType = {
    permission,
    isRegistered,
    settings,
    history,
    isLoading,
    vapidPublicKey,
    requestPermission,
    registerDevice,
    unregisterDevice,
    updateSettings,
    sendTestNotification,
    refreshHistory,
    markAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
