import { useState, useEffect, useCallback, useRef } from 'react';

export type HealthStatus = 'healthy' | 'degraded' | 'disconnected';

export interface MonitoringLog {
  timestamp: number;
  type: 'error' | 'warning' | 'info' | 'heartbeat' | 'recovery';
  message: string;
  details?: Record<string, unknown>;
}

export interface MonitoringState {
  status: HealthStatus;
  lastHeartbeat: number | null;
  consecutiveFailures: number;
  isOnline: boolean;
  isVisible: boolean;
  logs: MonitoringLog[];
}

const STORAGE_KEY = 'app_monitoring_logs';
const MAX_LOGS = 100;
const HEARTBEAT_INTERVAL = 30000;
const DEGRADED_THRESHOLD = 2;
const DISCONNECTED_THRESHOLD = 4;
const AUTO_RECOVERY_THRESHOLD = 5;

function loadLogsFromStorage(): MonitoringLog[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.slice(-MAX_LOGS) : [];
    }
  } catch (e) {
    console.warn('[Monitoring] Failed to load logs from storage:', e);
  }
  return [];
}

function saveLogsToStorage(logs: MonitoringLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-MAX_LOGS)));
  } catch (e) {
    console.warn('[Monitoring] Failed to save logs to storage:', e);
  }
}

export function useAppMonitoring() {
  const [state, setState] = useState<MonitoringState>({
    status: 'healthy',
    lastHeartbeat: null,
    consecutiveFailures: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isVisible: typeof document !== 'undefined' ? !document.hidden : true,
    logs: loadLogsFromStorage(),
  });

  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const performanceObserverRef = useRef<PerformanceObserver | null>(null);

  const addLog = useCallback((log: Omit<MonitoringLog, 'timestamp'>) => {
    setState(prev => {
      const newLog: MonitoringLog = { ...log, timestamp: Date.now() };
      const newLogs = [...prev.logs, newLog].slice(-MAX_LOGS);
      saveLogsToStorage(newLogs);
      return { ...prev, logs: newLogs };
    });
  }, []);

  const sendLogsToServer = useCallback(async (logs: MonitoringLog[]) => {
    if (logs.length === 0) return;
    
    try {
      await fetch('/api/monitoring/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs }),
        credentials: 'include',
      });
    } catch (e) {
      console.warn('[Monitoring] Failed to send logs to server:', e);
    }
  }, []);

  const performHeartbeat = useCallback(async () => {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch('/api/health', {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const latency = Date.now() - startTime;
        
        setState(prev => {
          const wasUnhealthy = prev.status !== 'healthy';
          const newStatus: HealthStatus = 'healthy';
          
          if (wasUnhealthy) {
            addLog({
              type: 'recovery',
              message: 'Connection restored',
              details: { latency, previousStatus: prev.status },
            });
          }
          
          return {
            ...prev,
            status: newStatus,
            lastHeartbeat: Date.now(),
            consecutiveFailures: 0,
          };
        });
        
        addLog({
          type: 'heartbeat',
          message: 'Heartbeat successful',
          details: { latency },
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      const latency = Date.now() - startTime;
      
      setState(prev => {
        const newFailures = prev.consecutiveFailures + 1;
        let newStatus: HealthStatus = prev.status;
        
        if (newFailures >= DISCONNECTED_THRESHOLD) {
          newStatus = 'disconnected';
        } else if (newFailures >= DEGRADED_THRESHOLD) {
          newStatus = 'degraded';
        }
        
        return {
          ...prev,
          status: newStatus,
          consecutiveFailures: newFailures,
        };
      });
      
      addLog({
        type: 'warning',
        message: 'Heartbeat failed',
        details: { 
          error: error.message || 'Unknown error',
          latency,
          aborted: error.name === 'AbortError',
        },
      });
      
    }
  }, [addLog]);

  const triggerRecovery = useCallback(() => {
    addLog({
      type: 'recovery',
      message: 'Manual recovery triggered',
    });
    
    sendLogsToServer(state.logs).finally(() => {
      window.location.reload();
    });
  }, [addLog, sendLogsToServer, state.logs]);

  const clearLogs = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(prev => ({ ...prev, logs: [] }));
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      addLog({ type: 'info', message: 'Browser went online' });
      performHeartbeat();
    };
    
    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false, status: 'disconnected' }));
      addLog({ type: 'warning', message: 'Browser went offline' });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addLog, performHeartbeat]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setState(prev => ({ ...prev, isVisible }));
      
      if (isVisible) {
        addLog({ type: 'info', message: 'Tab became visible' });
        performHeartbeat();
      } else {
        addLog({ type: 'info', message: 'Tab became hidden' });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [addLog, performHeartbeat]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      addLog({
        type: 'error',
        message: event.message || 'Unknown error',
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addLog({
        type: 'error',
        message: 'Unhandled promise rejection',
        details: {
          reason: String(event.reason),
        },
      });
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [addLog]);

  useEffect(() => {
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        performanceObserverRef.current = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 100) {
              addLog({
                type: 'warning',
                message: 'Long task detected',
                details: {
                  duration: Math.round(entry.duration),
                  startTime: Math.round(entry.startTime),
                },
              });
            }
          }
        });
        
        performanceObserverRef.current.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('[Monitoring] PerformanceObserver not supported:', e);
      }
    }
    
    return () => {
      if (performanceObserverRef.current) {
        performanceObserverRef.current.disconnect();
      }
    };
  }, [addLog]);

  useEffect(() => {
    performHeartbeat();
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (state.isVisible && state.isOnline) {
        performHeartbeat();
      }
    }, HEARTBEAT_INTERVAL);
    
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [performHeartbeat, state.isVisible, state.isOnline]);

  useEffect(() => {
    addLog({
      type: 'info',
      message: 'Monitoring initialized',
      details: {
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
    });
  }, []);

  return {
    ...state,
    triggerRecovery,
    clearLogs,
    addLog,
    performHeartbeat,
    sendLogsToServer,
  };
}
