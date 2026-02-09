import { createContext, useContext, ReactNode } from 'react';
import { useAppMonitoring, HealthStatus, MonitoringLog } from '@/hooks/useAppMonitoring';
import { RefreshCw, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MonitoringContextValue {
  status: HealthStatus;
  lastHeartbeat: number | null;
  consecutiveFailures: number;
  isOnline: boolean;
  isVisible: boolean;
  logs: MonitoringLog[];
  triggerRecovery: () => void;
  clearLogs: () => void;
  addLog: (log: Omit<MonitoringLog, 'timestamp'>) => void;
  performHeartbeat: () => Promise<void>;
}

const MonitoringContext = createContext<MonitoringContextValue | null>(null);

export function useMonitoring() {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within MonitoringProvider');
  }
  return context;
}

function StatusBanner({ 
  status, 
  isOnline, 
  consecutiveFailures,
  onReload 
}: { 
  status: HealthStatus; 
  isOnline: boolean;
  consecutiveFailures: number;
  onReload: () => void;
}) {
  if (status === 'healthy' && isOnline) {
    return null;
  }

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        message: 'Você está offline',
        bgClass: 'bg-red-500/90',
        textClass: 'text-white',
      };
    }
    
    if (status === 'disconnected') {
      return {
        icon: WifiOff,
        message: `Conexão perdida (${consecutiveFailures} falhas)`,
        bgClass: 'bg-red-500/90',
        textClass: 'text-white',
      };
    }
    
    return {
      icon: AlertTriangle,
      message: 'Conexão instável',
      bgClass: 'bg-yellow-500/90',
      textClass: 'text-black',
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[9999] ${config.bgClass} ${config.textClass} px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shadow-lg`}
      data-testid="status-banner"
    >
      <Icon className="w-4 h-4" />
      <span>{config.message}</span>
      <Button
        size="sm"
        variant="outline"
        onClick={onReload}
        className="h-7 px-3 text-xs bg-white/20 border-white/30"
        data-testid="button-reload"
      >
        <RefreshCw className="w-3 h-3 mr-1" />
        Recarregar
      </Button>
    </div>
  );
}

interface MonitoringProviderProps {
  children: ReactNode;
}

export function MonitoringProvider({ children }: MonitoringProviderProps) {
  const monitoring = useAppMonitoring();

  const contextValue: MonitoringContextValue = {
    status: monitoring.status,
    lastHeartbeat: monitoring.lastHeartbeat,
    consecutiveFailures: monitoring.consecutiveFailures,
    isOnline: monitoring.isOnline,
    isVisible: monitoring.isVisible,
    logs: monitoring.logs,
    triggerRecovery: monitoring.triggerRecovery,
    clearLogs: monitoring.clearLogs,
    addLog: monitoring.addLog,
    performHeartbeat: monitoring.performHeartbeat,
  };

  const showBanner = monitoring.status !== 'healthy' || !monitoring.isOnline;

  return (
    <MonitoringContext.Provider value={contextValue}>
      {showBanner && (
        <StatusBanner
          status={monitoring.status}
          isOnline={monitoring.isOnline}
          consecutiveFailures={monitoring.consecutiveFailures}
          onReload={monitoring.triggerRecovery}
        />
      )}
      <div className={showBanner ? 'pt-10' : ''}>
        {children}
      </div>
    </MonitoringContext.Provider>
  );
}
