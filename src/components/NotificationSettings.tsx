import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Bell,
  BellOff,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Calendar,
  CreditCard,
  AlertTriangle,
  Loader2,
  Send,
  Moon,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    permission,
    isRegistered,
    settings,
    history,
    isLoading,
    requestPermission,
    registerDevice,
    unregisterDevice,
    updateSettings,
    sendTestNotification,
    refreshHistory,
    markAsRead,
  } = useNotifications();

  const { toast } = useToast();
  const [isEnabling, setIsEnabling] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleEnableNotifications = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Autenticação necessária',
        description: 'Você precisa fazer login para ativar as notificações.',
        variant: 'destructive',
      });
      return;
    }

    setIsEnabling(true);
    
    const hasPermission = permission === 'granted' || await requestPermission();
    
    if (!hasPermission) {
      toast({
        title: 'Permissão negada',
        description: 'Você precisa permitir notificações nas configurações do navegador.',
        variant: 'destructive',
      });
      setIsEnabling(false);
      return;
    }

    const registered = await registerDevice();
    
    if (registered) {
      await updateSettings({ enabled: 'true' });
      toast({
        title: 'Notificações ativadas!',
        description: 'Você receberá notificações sobre eventos importantes.',
      });
    } else {
      toast({
        title: 'Erro ao ativar',
        description: 'Não foi possível registrar o dispositivo. Tente novamente.',
        variant: 'destructive',
      });
    }
    
    setIsEnabling(false);
  };

  const handleDisableNotifications = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Autenticação necessária',
        description: 'Você precisa fazer login para desativar as notificações.',
        variant: 'destructive',
      });
      return;
    }

    await unregisterDevice();
    await updateSettings({ enabled: 'false' });
    toast({
      title: 'Notificações desativadas',
      description: 'Você não receberá mais notificações.',
    });
  };

  const handleToggleSetting = async (key: string, value: boolean) => {
    if (!isAuthenticated) {
      toast({
        title: 'Autenticação necessária',
        description: 'Você precisa fazer login para alterar as configurações.',
        variant: 'destructive',
      });
      return;
    }

    const newValue = value ? 'true' : 'false';
    const success = await updateSettings({ [key]: newValue });
    
    if (success) {
      setLocalSettings((prev) => prev ? { ...prev, [key]: newValue } : prev);
    } else {
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar a configuração.',
        variant: 'destructive',
      });
    }
  };

  const handleTimeChange = async (key: string, value: string) => {
    if (!isAuthenticated) {
      toast({
        title: 'Autenticação necessária',
        description: 'Você precisa fazer login para alterar as configurações.',
        variant: 'destructive',
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
      toast({
        title: 'Autenticação necessária',
        description: 'Você precisa fazer login para testar notificações.',
        variant: 'destructive',
      });
      return;
    }

    if (!isRegistered) {
      toast({
        title: 'Ative as notificações',
        description: 'Você precisa ativar as notificações antes de testar.',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    const success = await sendTestNotification();
    
    if (success) {
      toast({
        title: 'Notificação enviada!',
        description: 'Verifique se recebeu a notificação de teste.',
      });
      await refreshHistory();
    } else {
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível enviar a notificação de teste.',
        variant: 'destructive',
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
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
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
      
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Status das Notificações
          </CardTitle>
          <CardDescription>
            Configure e gerencie suas notificações push
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                <Label className="text-base">Permissão do Navegador</Label>
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

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {isRegistered ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <Label className="text-base">Dispositivo Registrado</Label>
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
              <Button
                onClick={handleEnableNotifications}
                disabled={isEnabling || permission === 'denied'}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {isEnabling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ativando...
                  </>
                ) : (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Ativar Notificações
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleDisableNotifications}
                variant="outline"
                className="flex-1"
              >
                <BellOff className="mr-2 h-4 w-4" />
                Desativar Notificações
              </Button>
            )}
            <Button
              onClick={handleTestNotification}
              disabled={!isRegistered || isTesting}
              variant="outline"
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isEnabled && (
        <>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Tipos de Notificação</CardTitle>
              <CardDescription>
                Escolha quais notificações você deseja receber
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationTypes.map((type) => (
                <div key={type.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {type.icon}
                    <div>
                      <Label className="text-sm font-medium">{type.label}</Label>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={localSettings?.[type.key as keyof typeof localSettings] === 'true'}
                    onCheckedChange={(checked) => handleToggleSetting(type.key, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Horário Silencioso
              </CardTitle>
              <CardDescription>
                Não receba notificações durante esse período
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Ativar horário silencioso</Label>
                <Switch
                  checked={localSettings?.quietHoursEnabled === 'true'}
                  onCheckedChange={(checked) => handleToggleSetting('quietHoursEnabled', checked)}
                />
              </div>

              {localSettings?.quietHoursEnabled === 'true' && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-sm">Início</Label>
                    <Input
                      type="time"
                      value={localSettings?.quietHoursStart || '22:00'}
                      onChange={(e) => handleTimeChange('quietHoursStart', e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Fim</Label>
                    <Input
                      type="time"
                      value={localSettings?.quietHoursEnd || '08:00'}
                      onChange={(e) => handleTimeChange('quietHoursEnd', e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Preferências Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {localSettings?.sound === 'true' ? (
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Label>Som</Label>
                </div>
                <Switch
                  checked={localSettings?.sound === 'true'}
                  onCheckedChange={(checked) => handleToggleSetting('sound', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <Label>Vibração</Label>
                </div>
                <Switch
                  checked={localSettings?.vibration === 'true'}
                  onCheckedChange={(checked) => handleToggleSetting('vibration', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {localSettings?.showPreview === 'true' ? (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Label>Mostrar prévia do conteúdo</Label>
                </div>
                <Switch
                  checked={localSettings?.showPreview === 'true'}
                  onCheckedChange={(checked) => handleToggleSetting('showPreview', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Histórico de Notificações
              </CardTitle>
              <CardDescription>
                Últimas {history.length} notificações recebidas
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                        className={`flex gap-3 p-3 rounded-lg border transition-colors ${
                          notification.read === 'true'
                            ? 'bg-muted/30 border-border/50'
                            : 'bg-primary/5 border-primary/20'
                        }`}
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
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 px-2 text-xs ml-auto"
                                onClick={() => markAsRead(notification.id)}
                              >
                                Marcar como lida
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
