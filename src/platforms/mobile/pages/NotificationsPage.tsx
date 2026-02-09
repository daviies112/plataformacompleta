import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/mobile/GlassCard';
import { MobileCard, MobileButton, MobileSwitch } from '@/platforms/mobile/components/premium';
import { 
  Bell, 
  BellOff, 
  Check, 
  Archive, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  XCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type TabType = 'all' | 'alerts' | 'updates' | 'read';

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

const hapticFeedback = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 30,
    };
    navigator.vibrate(patterns[style]);
  }
};

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
    permission,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [swipingId, setSwipingId] = useState<number | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [localSettings, setLocalSettings] = useState(settings);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SUPABASE_NEW_DATA':
      case 'PLUGGY_UPDATE':
        return <Info className="w-5 h-5 text-blue-400" />;
      case 'GOOGLE_CALENDAR_EVENT':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'SYSTEM_ALERT':
        return <AlertCircle className="w-5 h-5 text-amber-400" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    const badges = {
      SUPABASE_NEW_DATA: { label: 'Info', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      GOOGLE_CALENDAR_EVENT: { label: 'Sucesso', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
      PLUGGY_UPDATE: { label: 'Atualização', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
      SYSTEM_ALERT: { label: 'Alerta', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    };

    return badges[type as keyof typeof badges] || { label: 'Info', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
  };

  const filterNotifications = (notifications: NotificationHistory[]) => {
    switch (activeTab) {
      case 'alerts':
        return notifications.filter(n => n.type === 'SYSTEM_ALERT');
      case 'updates':
        return notifications.filter(n => ['SUPABASE_NEW_DATA', 'PLUGGY_UPDATE', 'GOOGLE_CALENDAR_EVENT'].includes(n.type));
      case 'read':
        return notifications.filter(n => n.read === 'true');
      default:
        return notifications;
    }
  };

  const handleTabChange = (tab: TabType) => {
    hapticFeedback('light');
    setActiveTab(tab);
  };

  const handleMarkAllAsRead = async () => {
    hapticFeedback('medium');
    const unreadNotifications = history.filter(n => n.read !== 'true');
    
    if (unreadNotifications.length === 0) {
      toast.info('Nenhuma notificação não lida');
      return;
    }

    try {
      await Promise.all(unreadNotifications.map(n => markAsRead(n.id)));
      hapticFeedback('heavy');
      toast.success(`${unreadNotifications.length} notificações marcadas como lidas! 🎉`);
    } catch (error) {
      toast.error('Erro ao marcar notificações como lidas');
    }
  };

  const handleTouchStart = (e: React.TouchEvent, id: number) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
    setSwipingId(id);
  };

  const handleTouchMove = (e: React.TouchEvent, id: number) => {
    if (swipingId !== id) return;

    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);

    if (!isSwiping.current && Math.abs(deltaX) > 10 && deltaY < 30) {
      isSwiping.current = true;
    }

    if (isSwiping.current) {
      e.preventDefault();
      setSwipeX(Math.max(-150, Math.min(150, deltaX)));
    }
  };

  const handleTouchEnd = async (notification: NotificationHistory) => {
    if (!isSwiping.current) {
      setSwipeX(0);
      setSwipingId(null);
      return;
    }

    const threshold = 80;

    if (swipeX > threshold) {
      hapticFeedback('medium');
      await markAsRead(notification.id);
      toast.success('Marcada como lida ✓');
    } else if (swipeX < -threshold) {
      hapticFeedback('medium');
      await markAsRead(notification.id);
      toast.success('Arquivada', { icon: '📥' });
    }

    setSwipeX(0);
    setSwipingId(null);
    isSwiping.current = false;
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (!isAuthenticated) {
      toast.error('Você precisa fazer login');
      return;
    }

    hapticFeedback('medium');

    if (enabled) {
      const hasPermission = permission === 'granted' || await requestPermission();
      
      if (!hasPermission) {
        toast.error('Permissão de notificações negada');
        return;
      }

      const registered = await registerDevice();
      if (registered) {
        await updateSettings({ enabled: 'true' });
        hapticFeedback('heavy');
        toast.success('Notificações ativadas! 🔔');
      } else {
        toast.error('Erro ao registrar dispositivo');
      }
    } else {
      await unregisterDevice();
      await updateSettings({ enabled: 'false' });
      hapticFeedback('heavy');
      toast.success('Notificações desativadas');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredNotifications = filterNotifications(history);
  const unreadCount = history.filter(n => n.read !== 'true').length;
  const isEnabled = localSettings?.enabled === 'true';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 pb-24">
      <div className="px-4 pt-6 pb-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'}
              </p>
            )}
          </div>
          
          {unreadCount > 0 && (
            <MobileButton
              variant="secondary"
              className="w-auto px-4 py-2 h-auto min-h-0 text-sm"
              onClick={handleMarkAllAsRead}
            >
              <Check className="w-4 h-4 mr-2" />
              Marcar todas
            </MobileButton>
          )}
        </div>

        <MobileCard variant="elevated" padding="sm" className="overflow-hidden">
          <div className="flex gap-2 p-1">
            {[
              { id: 'all', label: 'Todas', count: history.length },
              { id: 'alerts', label: 'Alertas', count: history.filter(n => n.type === 'SYSTEM_ALERT').length },
              { id: 'updates', label: 'Atualizações', count: history.filter(n => ['SUPABASE_NEW_DATA', 'PLUGGY_UPDATE', 'GOOGLE_CALENDAR_EVENT'].includes(n.type)).length },
              { id: 'read', label: 'Lidas', count: history.filter(n => n.read === 'true').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as TabType)}
                className={cn(
                  'flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
                  'touch-manipulation relative overflow-hidden',
                  activeTab === tab.id
                    ? [
                        'bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10',
                        'text-primary shadow-[0_0_24px_rgba(212,175,55,0.3),inset_0_1px_0_rgba(212,175,55,0.2)]',
                        'border border-primary/30',
                      ]
                    : [
                        'text-muted-foreground hover:text-foreground',
                        'hover:bg-white/[0.03]',
                      ]
                )}
              >
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full',
                      activeTab === tab.id
                        ? 'bg-primary/30 text-primary'
                        : 'bg-white/[0.05] text-muted-foreground'
                    )}>
                      {tab.count}
                    </span>
                  )}
                </span>
                {activeTab === tab.id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer" />
                )}
              </button>
            ))}
          </div>
        </MobileCard>

        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <GlassCard variant="default" className="p-12 text-center">
              <div className="space-y-4">
                {activeTab === 'read' && unreadCount > 0 ? (
                  <>
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center border border-emerald-500/20">
                      <Sparkles className="w-10 h-10 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Tudo lido! 🎉</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Você está em dia com suas notificações
                      </p>
                    </div>
                  </>
                ) : history.length === 0 ? (
                  <>
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-white/[0.08] to-white/[0.02] flex items-center justify-center border border-white/10">
                      <BellOff className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Nenhuma notificação</h3>
                      <p className="text-sm text-muted-foreground mt-2 mb-4">
                        Suas notificações aparecerão aqui
                      </p>
                      {!isEnabled && (
                        <MobileButton
                          variant="primary"
                          className="w-auto mx-auto px-6"
                          onClick={() => handleToggleNotifications(true)}
                        >
                          <Bell className="w-4 h-4 mr-2" />
                          Ativar Notificações
                        </MobileButton>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-white/[0.08] to-white/[0.02] flex items-center justify-center border border-white/10">
                      <Bell className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Nenhuma notificação nesta categoria</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Tente outra categoria
                      </p>
                    </div>
                  </>
                )}
              </div>
            </GlassCard>
          ) : (
            filteredNotifications.map((notification, index) => {
              const badge = getNotificationBadge(notification.type);
              const isUnread = notification.read !== 'true';
              const isCurrentlySwiping = swipingId === notification.id;
              const currentSwipeX = isCurrentlySwiping ? swipeX : 0;

              return (
                <div
                  key={notification.id}
                  className="relative"
                  style={{
                    animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`,
                  }}
                >
                  <div
                    className="absolute inset-0 flex items-center justify-between px-6"
                    style={{
                      opacity: Math.abs(currentSwipeX) / 100,
                    }}
                  >
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-medium">Marcar como lida</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-400">
                      <span className="text-sm font-medium">Arquivar</span>
                      <Archive className="w-5 h-5" />
                    </div>
                  </div>

                  <div
                    className="relative"
                    style={{
                      transform: `translateX(${currentSwipeX}px)`,
                      transition: isCurrentlySwiping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    onTouchStart={(e) => handleTouchStart(e, notification.id)}
                    onTouchMove={(e) => handleTouchMove(e, notification.id)}
                    onTouchEnd={() => handleTouchEnd(notification)}
                  >
                    <GlassCard
                      variant="default"
                      className={cn(
                        'p-4 transition-all duration-300',
                        isUnread ? 'opacity-100' : 'opacity-60',
                        isCurrentlySwiping && 'shadow-2xl'
                      )}
                    >
                      <div className="flex gap-3">
                        <div className={cn(
                          'mt-1 flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
                          'bg-gradient-to-br backdrop-blur-xl',
                          isUnread 
                            ? 'from-white/[0.08] to-white/[0.03] border border-white/10'
                            : 'from-white/[0.04] to-white/[0.01] border border-white/5'
                        )}>
                          {getNotificationIcon(notification.type)}
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className={cn(
                              'text-sm font-semibold leading-tight',
                              isUnread ? 'text-foreground' : 'text-muted-foreground'
                            )}>
                              {notification.title}
                            </h3>
                            <span className={cn(
                              'px-2 py-1 text-xs font-medium rounded-lg border backdrop-blur-xl flex-shrink-0',
                              badge.color
                            )}>
                              {badge.label}
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {notification.body}
                          </p>

                          <div className="flex items-center gap-3 pt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.sentAt), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                            
                            {isUnread && (
                              <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                            )}
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <MobileCard variant="elevated" padding="md" className="mt-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground">Push Notifications</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isEnabled ? 'Recebendo atualizações' : 'Ative para receber alertas'}
                </p>
              </div>
            </div>

            <MobileSwitch
              checked={isEnabled}
              onChange={(e) => handleToggleNotifications(e.target.checked)}
              label="Notificações Push"
              description={
                isRegistered
                  ? 'Dispositivo registrado e ativo'
                  : 'Ative para começar a receber'
              }
            />

            {isEnabled && (
              <div className="pt-2 text-xs text-muted-foreground bg-white/[0.02] rounded-lg p-3 border border-white/5">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    Deslize para a direita para marcar como lida ou para a esquerda para arquivar.
                  </p>
                </div>
              </div>
            )}
          </div>
        </MobileCard>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes fadeInUp {
            from, to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-shimmer {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationsPage;
