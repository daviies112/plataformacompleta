import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { PremiumCard } from '@/platforms/shared/premium/PremiumCard';
import { PremiumButton } from '@/platforms/shared/premium/PremiumButton';
import { PremiumSwitch } from '@/platforms/shared/premium/PremiumSwitch';
import { PremiumInput } from '@/platforms/shared/premium/PremiumInput';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Bell, 
  BellOff, 
  Check, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  XCircle,
  Loader2,
  Database,
  Calendar,
  CreditCard,
  AlertTriangle,
  Send,
  Moon,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const NotificationsPage = () => {
  const { isAuthenticated } = useAuth();
  const {
    settings,
    history,
    isLoading,
    isRegistered,
    updateSettings,
    markAsRead,
    registerDevice,
    unregisterDevice,
    requestPermission,
    sendTestNotification,
    refreshHistory,
    permission,
  } = useNotifications();

  const [isEnabling, setIsEnabling] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleEnableNotifications = async () => {
    if (!isAuthenticated) {
      toast.error('Autenticação necessária', {
        description: 'Você precisa fazer login para ativar as notificações.'
      });
      return;
    }

    setIsEnabling(true);
    
    const hasPermission = permission === 'granted' || await requestPermission();
    
    if (!hasPermission) {
      toast.error('Permissão negada', {
        description: 'Você precisa permitir notificações nas configurações do navegador.'
      });
      setIsEnabling(false);
      return;
    }

    const registered = await registerDevice();
    
    if (registered) {
      await updateSettings({ enabled: 'true' });
      toast.success('Notificações ativadas!', {
        description: 'Você receberá notificações sobre eventos importantes.'
      });
    } else {
      toast.error('Erro ao ativar', {
        description: 'Não foi possível registrar o dispositivo. Tente novamente.'
      });
    }
    
    setIsEnabling(false);
  };

  const handleDisableNotifications = async () => {
    if (!isAuthenticated) {
      toast.error('Autenticação necessária', {
        description: 'Você precisa fazer login para desativar as notificações.'
      });
      return;
    }

    await unregisterDevice();
    await updateSettings({ enabled: 'false' });
    toast.success('Notificações desativadas', {
      description: 'Você não receberá mais notificações.'
    });
  };

  const handleToggleSetting = async (key: string, value: boolean) => {
    if (!isAuthenticated) {
      toast.error('Autenticação necessária', {
        description: 'Você precisa fazer login para alterar as configurações.'
      });
      return;
    }

    const newValue = value ? 'true' : 'false';
    const success = await updateSettings({ [key]: newValue });
    
    if (success) {
      setLocalSettings((prev) => prev ? { ...prev, [key]: newValue } : prev);
    } else {
      toast.error('Erro ao atualizar', {
        description: 'Não foi possível atualizar a configuração.'
      });
    }
  };

  const handleTimeChange = async (key: string, value: string) => {
    if (!isAuthenticated) {
      toast.error('Autenticação necessária', {
        description: 'Você precisa fazer login para alterar as configurações.'
      });
      return;
    }

    const success = await updateSettings({ [key]: value });
    
    if (success) {
      setLocalSettings((prev) => prev ? { ...prev, [key]: value } : prev);
    }
  };

  const handleTestNotification = async () => {
    if (!isAuthenticated) {
      toast.error('Autenticação necessária', {
        description: 'Você precisa fazer login para testar notificações.'
      });
      return;
    }

    if (!isRegistered) {
      toast.error('Ative as notificações', {
        description: 'Você precisa ativar as notificações antes de testar.'
      });
      return;
    }

    setIsTesting(true);
    const success = await sendTestNotification();
    
    if (success) {
      toast.success('Notificação enviada!', {
        description: 'Verifique se recebeu a notificação de teste.'
      });
      await refreshHistory();
    } else {
      toast.error('Erro ao enviar', {
        description: 'Não foi possível enviar a notificação de teste.'
      });
    }
    
    setIsTesting(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SUPABASE_NEW_DATA':
        return <Database className="h-4 w-4 text-blue-400" />;
      case 'GOOGLE_CALENDAR_EVENT':
        return <Calendar className="h-4 w-4 text-green-400" />;
      case 'PLUGGY_UPDATE':
        return <CreditCard className="h-4 w-4 text-purple-400" />;
      case 'SYSTEM_ALERT':
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationTypeName = (type: string) => {
    switch (type) {
      case 'SUPABASE_NEW_DATA':
        return 'Supabase';
      case 'GOOGLE_CALENDAR_EVENT':
        return 'Google Calendar';
      case 'PLUGGY_UPDATE':
        return 'Pluggy';
      case 'SYSTEM_ALERT':
        return 'Sistema';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isEnabled = localSettings?.enabled === 'true';
  const notificationTypes = [
    {
      key: 'supabaseEnabled',
      label: 'Supabase',
      description: 'Novos dados ou atualizações no banco',
      icon: <Database className="h-5 w-5 text-blue-400" />,
    },
    {
      key: 'calendarEnabled',
      label: 'Google Calendar',
      description: 'Eventos e compromissos próximos',
      icon: <Calendar className="h-5 w-5 text-green-400" />,
    },
    {
      key: 'pluggyEnabled',
      label: 'Pluggy',
      description: 'Transações e atualizações bancárias',
      icon: <CreditCard className="h-5 w-5 text-purple-400" />,
    },
    {
      key: 'systemEnabled',
      label: 'Sistema',
      description: 'Alertas e avisos importantes',
      icon: <AlertTriangle className="h-5 w-5 text-amber-400" />,
    },
  ];

  return (
    <div className="relative z-10 container mx-auto pt-0 pb-4 sm:pb-6 lg:pb-8 space-y-6 lg:space-y-8 animate-fade-in px-4 md:px-6 lg:px-8">
      
      <div className="space-y-4">
        <div className="flex items-start gap-4 lg:gap-3">
          <div className="p-3 lg:p-2.5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
            <Bell className="h-8 w-8 lg:h-6 lg:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl lg:text-2xl font-black text-foreground tracking-tight bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
              Notificações
            </h1>
            <p className="text-xl lg:text-sm text-muted-foreground/80 mt-2 lg:mt-1">
              Configure e gerencie suas notificações push
            </p>
          </div>
        </div>
      </div>

      {!isAuthenticated && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle>Autenticação Necessária</AlertTitle>
          <AlertDescription>
            Você precisa fazer login para configurar e visualizar suas notificações. Faça login para continuar.
          </AlertDescription>
        </Alert>
      )}
      
      <PremiumCard variant="elevated" padding="lg">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-bold text-foreground">Status das Notificações</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure e gerencie suas notificações push
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {permission === 'granted' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : permission === 'denied' ? (
                  <XCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <Bell className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-base font-medium">Permissão do Navegador</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {permission === 'granted'
                  ? 'Notificações permitidas'
                  : permission === 'denied'
                  ? 'Notificações bloqueadas - verifique as configurações do navegador'
                  : 'Permissão não solicitada'}
              </p>
            </div>
            <Badge variant={permission === 'granted' ? 'default' : 'secondary'}>
              {permission === 'granted' ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>

          <div className="h-px bg-white/10" />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {isRegistered ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-base font-medium">Dispositivo Registrado</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {isRegistered
                  ? 'Este dispositivo está registrado para receber notificações'
                  : 'Este dispositivo não está registrado'}
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {!isEnabled || !isRegistered ? (
              <PremiumButton
                onClick={handleEnableNotifications}
                disabled={isEnabling || permission === 'denied'}
                variant="primary"
                size="md"
                isLoading={isEnabling}
                className="flex-1"
              >
                <Bell className="mr-2 h-4 w-4" />
                Ativar Notificações
              </PremiumButton>
            ) : (
              <PremiumButton
                onClick={handleDisableNotifications}
                variant="secondary"
                size="md"
                className="flex-1"
              >
                <BellOff className="mr-2 h-4 w-4" />
                Desativar Notificações
              </PremiumButton>
            )}
            <PremiumButton
              onClick={handleTestNotification}
              disabled={!isRegistered || isTesting}
              variant="secondary"
              size="md"
              isLoading={isTesting}
              className="w-auto"
            >
              {!isTesting && <Send className="h-4 w-4" />}
            </PremiumButton>
          </div>
        </div>
      </PremiumCard>

      {isEnabled && (
        <>
          <PremiumCard variant="elevated" padding="lg">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-foreground mb-1">Tipos de Notificação</h3>
              <p className="text-sm text-muted-foreground">
                Escolha quais notificações você deseja receber
              </p>
            </div>
            <div className="space-y-4">
              {notificationTypes.map((type) => (
                <PremiumSwitch
                  key={type.key}
                  label={type.label}
                  description={type.description}
                  checked={localSettings?.[type.key as keyof typeof localSettings] === 'true'}
                  onChange={(e) => handleToggleSetting(type.key, e.target.checked)}
                />
              ))}
            </div>
          </PremiumCard>

          <PremiumCard variant="elevated" padding="lg">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Moon className="h-4 w-4" />
                <h3 className="text-xl font-bold text-foreground">Horário Silencioso</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Não receba notificações durante esse período
              </p>
            </div>
            <div className="space-y-4">
              <PremiumSwitch
                label="Ativar horário silencioso"
                checked={localSettings?.quietHoursEnabled === 'true'}
                onChange={(e) => handleToggleSetting('quietHoursEnabled', e.target.checked)}
              />

              {localSettings?.quietHoursEnabled === 'true' && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Início</label>
                    <input
                      type="time"
                      value={localSettings?.quietHoursStart || '22:00'}
                      onChange={(e) => handleTimeChange('quietHoursStart', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-foreground focus:outline-none focus:border-primary/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fim</label>
                    <input
                      type="time"
                      value={localSettings?.quietHoursEnd || '08:00'}
                      onChange={(e) => handleTimeChange('quietHoursEnd', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-foreground focus:outline-none focus:border-primary/40"
                    />
                  </div>
                </div>
              )}
            </div>
          </PremiumCard>

          <PremiumCard variant="elevated" padding="lg">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-foreground">Preferências Adicionais</h3>
            </div>
            <div className="space-y-4">
              <PremiumSwitch
                label="Som"
                checked={localSettings?.sound === 'true'}
                onChange={(e) => handleToggleSetting('sound', e.target.checked)}
              />

              <PremiumSwitch
                label="Vibração"
                checked={localSettings?.vibration === 'true'}
                onChange={(e) => handleToggleSetting('vibration', e.target.checked)}
              />

              <PremiumSwitch
                label="Mostrar prévia do conteúdo"
                checked={localSettings?.showPreview === 'true'}
                onChange={(e) => handleToggleSetting('showPreview', e.target.checked)}
              />
            </div>
          </PremiumCard>

          <PremiumCard variant="elevated" padding="lg">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4" />
                <h3 className="text-xl font-bold text-foreground">Histórico de Notificações</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Últimas {history.length} notificações recebidas
              </p>
            </div>
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nenhuma notificação ainda</p>
                <p className="text-xs mt-1">
                  As notificações que você receber aparecerão aqui
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {history.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex gap-3 p-3 rounded-lg border transition-colors",
                        notification.read === 'true'
                          ? 'bg-muted/30 border-border/50'
                          : 'bg-primary/5 border-primary/20'
                      )}
                    >
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium leading-none">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.body}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {getNotificationTypeName(notification.type)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.sentAt), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                          {notification.success === 'true' && (
                            <Badge variant="secondary" className="text-xs">
                              {notification.devicesSent} dispositivo(s)
                            </Badge>
                          )}
                          {notification.read !== 'true' && (
                            <PremiumButton
                              size="sm"
                              variant="secondary"
                              className="w-auto h-5 px-2 text-xs ml-auto"
                              onClick={() => markAsRead(notification.id)}
                            >
                              Marcar como lida
                            </PremiumButton>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </PremiumCard>
        </>
      )}
    </div>
  );
};

export default NotificationsPage;
