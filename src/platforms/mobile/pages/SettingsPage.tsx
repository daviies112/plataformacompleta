import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  User, Mail, Lock, Bell, Moon, Globe, Shield, Database, 
  Calendar, Wallet, MessageSquare, LogOut, ChevronRight,
  FileText, Download, Sun, Smartphone, Loader2, Webhook,
  Activity, Video, X, Server, Cloud, BarChart3, Zap
} from 'lucide-react';
import { MobileCard } from '../components/premium/MobileCard';
import { MobileButton } from '../components/premium/MobileButton';
import { MobileSwitch } from '../components/premium/MobileSwitch';
import { MobileInput } from '../components/premium/MobileInput';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const hapticFeedback = (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: [30, 10, 30],
    };
    navigator.vibrate(patterns[intensity]);
  }
};

interface SettingItemProps {
  icon: React.ElementType;
  label: string;
  subtitle?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
  showChevron?: boolean;
  isLoading?: boolean;
}

const SettingItem = ({ icon: Icon, label, subtitle, onClick, badge, showChevron = true, isLoading }: SettingItemProps) => (
  <div
    onClick={() => {
      if (onClick && !isLoading) {
        hapticFeedback('light');
        onClick();
      }
    }}
    className={cn(
      'flex items-center gap-4 py-3 px-1 -mx-1 rounded-xl transition-all duration-200',
      onClick && !isLoading && 'cursor-pointer touch-manipulation active:bg-white/[0.02] active:scale-[0.98]',
      isLoading && 'opacity-50'
    )}
  >
    <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center flex-shrink-0">
      {isLoading ? (
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      ) : (
        <Icon className="w-5 h-5 text-primary" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-base font-medium text-foreground">{label}</div>
      {subtitle && <div className="text-sm text-muted-foreground mt-0.5">{subtitle}</div>}
    </div>
    {badge}
    {showChevron && onClick && !isLoading && <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
  </div>
);

interface SectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const Section = ({ title, children, className }: SectionProps) => (
  <div className={className}>
    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-3">
      {title}
    </h2>
    <MobileCard variant="default" padding="lg" className="space-y-1">
      {children}
    </MobileCard>
  </div>
);

const SettingsPage = () => {
  const { user, client, updateUser, updateClient, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showIntegrationDialog, setShowIntegrationDialog] = useState<string | null>(null);
  
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notification-settings');
    return saved ? JSON.parse(saved) : {
      push: true,
      email: true,
      whatsapp: false,
    };
  });

  const [integrationForms, setIntegrationForms] = useState({
    supabase: { url: '', anon_key: '', bucket: 'receipts' },
    google_calendar: { client_id: '', client_secret: '', refresh_token: '' },
    pluggy: { client_id: '', client_secret: '' },
    n8n: { webhook_url: '' },
    evolution_api: { api_url: '', api_key: '', instance: 'nexus-whatsapp' },
    redis: { redis_url: '', redis_token: '' },
    sentry: { dsn: '', auth_token: '', organization: '', project: '', environment: 'production', traces_sample_rate: '0.1' },
    cloudflare: { zone_id: '', api_token: '' },
    better_stack: { source_token: '', ingesting_host: '' },
    cache: {
      progressive_ttl_enabled: 'false',
      access_threshold_high: '100',
      access_threshold_medium: '50',
      access_threshold_low: '10',
      ttl_high: '3600',
      ttl_medium: '1800',
      ttl_low: '900',
      ttl_default: '300',
      batch_invalidation_enabled: 'false',
      batch_invalidation_delay: '5000',
      cache_warming_enabled: 'false',
      compression_enabled: 'false',
      compression_threshold: '1024'
    },
    optimizer: {
      default_field_set: 'compact',
      default_page_size: '20',
      max_page_size: '100',
      pagination_type: 'offset',
      query_caching_enabled: 'false',
      query_cache_ttl: '300',
      aggregation_enabled: 'false'
    },
    monitoring: {
      monitoring_enabled: 'false',
      monitoring_interval: '60000',
      redis_commands_daily: '1000',
      redis_warning_threshold: '70',
      redis_critical_threshold: '90',
      supabase_bandwidth_monthly: '1073741824',
      supabase_warning_threshold: '70',
      supabase_critical_threshold: '90',
      alerts_enabled: 'false',
      alert_email: '',
      auto_actions_enabled: 'false'
    }
  });

  useEffect(() => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || ''
    });
  }, [user]);

  const isDarkMode = theme === 'dark';
  const planType = client?.plan_type || 'starter';
  const planLabel = planType === 'enterprise' ? 'Premium' : planType === 'pro' ? 'Pro' : 'Free';
  const planColor = planType === 'enterprise' || planType === 'pro' ? 'bg-gradient-to-r from-primary to-primary/80' : 'bg-white/10';

  const { data: credentialsStatus, isLoading: isLoadingCredentials, refetch: refetchCredentials } = useQuery({
    queryKey: ['/api/credentials'],
    enabled: isAuthenticated && !authLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: supabaseCredentials } = useQuery({
    queryKey: ['/api/config/supabase/credentials'],
    enabled: isAuthenticated && !authLoading,
    retry: false,
  });

  const { data: googleCredentials } = useQuery({
    queryKey: ['/api/credentials/google_calendar'],
    enabled: isAuthenticated && !authLoading,
    retry: false,
  });

  const { data: pluggyCredentials } = useQuery({
    queryKey: ['/api/config/pluggy'],
    enabled: isAuthenticated && !authLoading,
    retry: false,
  });

  const { data: evolutionCredentials } = useQuery({
    queryKey: ['/api/credentials/evolution_api'],
    enabled: isAuthenticated && !authLoading,
    retry: false,
  });

  const { data: n8nCredentials } = useQuery({
    queryKey: ['/api/config/n8n'],
    enabled: isAuthenticated && !authLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: redisCredentials } = useQuery({
    queryKey: ['/api/config/redis/credentials'],
    enabled: isAuthenticated && !authLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: sentryCredentials } = useQuery({
    queryKey: ['/api/config/sentry/credentials'],
    enabled: isAuthenticated && !authLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: cloudflareCredentials } = useQuery({
    queryKey: ['/api/config/cloudflare/credentials'],
    enabled: isAuthenticated && !authLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: betterStackCredentials } = useQuery({
    queryKey: ['/api/config/better-stack/credentials'],
    enabled: isAuthenticated && !authLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: cacheSettings, isLoading: isLoadingCache } = useQuery({
    queryKey: ['/api/config/cache/settings'],
    enabled: isAuthenticated && !authLoading,
    staleTime: 0,
    refetchOnMount: true,
    retry: false,
  });

  const { data: optimizerSettings, isLoading: isLoadingOptimizer } = useQuery({
    queryKey: ['/api/config/optimizer/settings'],
    enabled: isAuthenticated && !authLoading,
    staleTime: 0,
    refetchOnMount: true,
    retry: false,
  });

  const { data: monitoringSettings, isLoading: isLoadingMonitoring } = useQuery({
    queryKey: ['/api/config/monitoring/settings'],
    enabled: isAuthenticated && !authLoading,
    staleTime: 0,
    refetchOnMount: true,
    retry: false,
  });

  useEffect(() => {
    if (supabaseCredentials?.success && supabaseCredentials?.credentials) {
      setIntegrationForms(prev => ({
        ...prev,
        supabase: {
          url: supabaseCredentials.credentials.url || '',
          anon_key: supabaseCredentials.credentials.anonKey || '',  // ✅ CORRIGIDO: backend retorna "anonKey"
          bucket: supabaseCredentials.credentials.bucket || 'receipts'
        }
      }));
    }
  }, [supabaseCredentials]);

  useEffect(() => {
    if (googleCredentials?.success && googleCredentials?.credentials) {
      setIntegrationForms(prev => ({
        ...prev,
        google_calendar: {
          client_id: googleCredentials.credentials.client_id || '',
          client_secret: googleCredentials.credentials.client_secret || '',
          refresh_token: googleCredentials.credentials.refresh_token || ''
        }
      }));
    }
  }, [googleCredentials]);

  useEffect(() => {
    if (evolutionCredentials?.success && evolutionCredentials?.credentials) {
      setIntegrationForms(prev => ({
        ...prev,
        evolution_api: {
          api_url: evolutionCredentials.credentials.api_url || '',
          api_key: evolutionCredentials.credentials.api_key || '',
          instance: evolutionCredentials.credentials.instance || 'nexus-whatsapp'
        }
      }));
    }
  }, [evolutionCredentials]);

  useEffect(() => {
    if (n8nCredentials?.configured) {
      setIntegrationForms(prev => ({
        ...prev,
        n8n: { webhook_url: '' }
      }));
    }
  }, [n8nCredentials]);

  useEffect(() => {
    if (cacheSettings?.success && cacheSettings?.settings) {
      setIntegrationForms(prev => ({
        ...prev,
        cache: {
          progressive_ttl_enabled: String(cacheSettings.settings.progressive_ttl_enabled ?? 'false'),
          access_threshold_high: String(cacheSettings.settings.access_threshold_high ?? '100'),
          access_threshold_medium: String(cacheSettings.settings.access_threshold_medium ?? '50'),
          access_threshold_low: String(cacheSettings.settings.access_threshold_low ?? '10'),
          ttl_high: String(cacheSettings.settings.ttl_high ?? '3600'),
          ttl_medium: String(cacheSettings.settings.ttl_medium ?? '1800'),
          ttl_low: String(cacheSettings.settings.ttl_low ?? '900'),
          ttl_default: String(cacheSettings.settings.ttl_default ?? '300'),
          batch_invalidation_enabled: String(cacheSettings.settings.batch_invalidation_enabled ?? 'false'),
          batch_invalidation_delay: String(cacheSettings.settings.batch_invalidation_delay ?? '5000'),
          cache_warming_enabled: String(cacheSettings.settings.cache_warming_enabled ?? 'false'),
          compression_enabled: String(cacheSettings.settings.compression_enabled ?? 'false'),
          compression_threshold: String(cacheSettings.settings.compression_threshold ?? '1024')
        }
      }));
    }
  }, [cacheSettings]);

  useEffect(() => {
    if (optimizerSettings?.success && optimizerSettings?.settings) {
      setIntegrationForms(prev => ({
        ...prev,
        optimizer: {
          default_field_set: optimizerSettings.settings.default_field_set ?? 'compact',
          default_page_size: String(optimizerSettings.settings.default_page_size ?? '20'),
          max_page_size: String(optimizerSettings.settings.max_page_size ?? '100'),
          pagination_type: optimizerSettings.settings.pagination_type ?? 'offset',
          query_caching_enabled: String(optimizerSettings.settings.query_caching_enabled ?? 'false'),
          query_cache_ttl: String(optimizerSettings.settings.query_cache_ttl ?? '300'),
          aggregation_enabled: String(optimizerSettings.settings.aggregation_enabled ?? 'false')
        }
      }));
    }
  }, [optimizerSettings]);

  useEffect(() => {
    if (monitoringSettings?.success && monitoringSettings?.settings) {
      setIntegrationForms(prev => ({
        ...prev,
        monitoring: {
          monitoring_enabled: String(monitoringSettings.settings.monitoring_enabled ?? 'false'),
          monitoring_interval: String(monitoringSettings.settings.monitoring_interval ?? '60000'),
          redis_commands_daily: String(monitoringSettings.settings.redis_commands_daily ?? '1000'),
          redis_warning_threshold: String(monitoringSettings.settings.redis_warning_threshold ?? '70'),
          redis_critical_threshold: String(monitoringSettings.settings.redis_critical_threshold ?? '90'),
          supabase_bandwidth_monthly: String(monitoringSettings.settings.supabase_bandwidth_monthly ?? '1073741824'),
          supabase_warning_threshold: String(monitoringSettings.settings.supabase_warning_threshold ?? '70'),
          supabase_critical_threshold: String(monitoringSettings.settings.supabase_critical_threshold ?? '90'),
          alerts_enabled: String(monitoringSettings.settings.alerts_enabled ?? 'false'),
          alert_email: monitoringSettings.settings.alert_email ?? '',
          auto_actions_enabled: String(monitoringSettings.settings.auto_actions_enabled ?? 'false')
        }
      }));
    }
  }, [monitoringSettings]);

  useEffect(() => {
    if (redisCredentials?.success && redisCredentials?.credentials) {
      setIntegrationForms(prev => ({
        ...prev,
        redis: {
          redis_url: redisCredentials.credentials.redis_url || '',
          redis_token: redisCredentials.credentials.redis_token || ''
        }
      }));
    }
  }, [redisCredentials]);

  useEffect(() => {
    if (sentryCredentials?.success && sentryCredentials?.credentials) {
      setIntegrationForms(prev => ({
        ...prev,
        sentry: {
          dsn: sentryCredentials.credentials.dsn || '',
          auth_token: sentryCredentials.credentials.auth_token || '',
          organization: sentryCredentials.credentials.organization || '',
          project: sentryCredentials.credentials.project || '',
          environment: sentryCredentials.credentials.environment || 'production',
          traces_sample_rate: sentryCredentials.credentials.traces_sample_rate || '0.1'
        }
      }));
    }
  }, [sentryCredentials]);

  useEffect(() => {
    if (cloudflareCredentials?.success && cloudflareCredentials?.credentials) {
      setIntegrationForms(prev => ({
        ...prev,
        cloudflare: {
          zone_id: cloudflareCredentials.credentials.zone_id || '',
          api_token: cloudflareCredentials.credentials.api_token || ''
        }
      }));
    }
  }, [cloudflareCredentials]);

  useEffect(() => {
    if (betterStackCredentials?.success && betterStackCredentials?.credentials) {
      setIntegrationForms(prev => ({
        ...prev,
        better_stack: {
          source_token: betterStackCredentials.credentials.source_token || '',
          ingesting_host: betterStackCredentials.credentials.ingesting_host || ''
        }
      }));
    }
  }, [betterStackCredentials]);

  const saveSupabaseMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await fetch('/api/config/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          supabaseUrl: credentials.url,
          supabaseAnonKey: credentials.anon_key,
          supabaseBucket: credentials.bucket || 'receipts'
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar configuração');
      }
      return response.json();
    },
    onSuccess: () => {
      refetchCredentials();
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/calendar-events'] });
      setShowIntegrationDialog(null);
      toast.success('Integração configurada', {
        description: 'Credenciais do Supabase salvas com sucesso!',
      });
    },
    onError: (error: any) => {
      toast.error('Erro', {
        description: error.message || 'Falha ao salvar as credenciais.',
      });
    },
  });

  const saveGoogleCalendarMutation = useMutation({
    mutationFn: async (credentials: any) => {
      return apiRequest('PUT', `/api/credentials/google_calendar`, credentials);
    },
    onSuccess: () => {
      refetchCredentials();
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/calendar-events'] });
      setShowIntegrationDialog(null);
      toast.success('Integração configurada', {
        description: 'Credenciais do Google Calendar salvas com sucesso!',
      });
    },
    onError: (error: any) => {
      toast.error('Erro', {
        description: error.message || 'Falha ao salvar as credenciais.',
      });
    },
  });

  const savePluggyMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await fetch('/api/config/pluggy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          clientId: credentials.client_id,
          clientSecret: credentials.client_secret,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar configuração');
      }
      return response.json();
    },
    onSuccess: () => {
      refetchCredentials();
      setShowIntegrationDialog(null);
      toast.success('Integração configurada', {
        description: 'Credenciais do Pluggy salvas com sucesso!',
      });
    },
    onError: (error: any) => {
      toast.error('Erro', {
        description: error.message || 'Falha ao salvar as credenciais.',
      });
    },
  });

  const saveEvolutionApiMutation = useMutation({
    mutationFn: async (credentials: any) => {
      return apiRequest('PUT', `/api/credentials/evolution_api`, credentials);
    },
    onSuccess: () => {
      refetchCredentials();
      setShowIntegrationDialog(null);
      toast.success('Evolution API configurado', {
        description: 'Credenciais do WhatsApp (Evolution API) salvas com sucesso!',
      });
    },
    onError: (error: any) => {
      toast.error('Erro', {
        description: error.message || 'Falha ao salvar as credenciais.',
      });
    },
  });

  const saveN8nMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await fetch('/api/config/n8n', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          webhookUrl: credentials.webhook_url,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar configuração');
      }
      
      return response.json();
    },
    onSuccess: () => {
      refetchCredentials();
      setShowIntegrationDialog(null);
      toast.success('Integração configurada', {
        description: 'Webhook N8N salvo com sucesso!',
      });
    },
    onError: (error: any) => {
      toast.error('Erro', {
        description: error.message || 'Falha ao salvar a configuração.',
      });
    },
  });

  const saveRedisMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await fetch('/api/config/redis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          redisUrl: credentials.redis_url,
          redisToken: credentials.redis_token,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      setShowIntegrationDialog(null);
      toast.success('Redis configurado', {
        description: 'Credenciais do Redis salvas!',
      });
    },
    onError: (error: any) => {
      toast.error('Erro', {
        description: error.message,
      });
    },
  });

  const saveSentryMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await fetch('/api/config/sentry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dsn: credentials.dsn,
          authToken: credentials.auth_token,
          organization: credentials.organization,
          project: credentials.project,
          environment: credentials.environment,
          tracesSampleRate: credentials.traces_sample_rate,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      setShowIntegrationDialog(null);
      toast.success('Sentry configurado', {
        description: 'Monitoramento de erros ativado!',
      });
    },
    onError: (error: any) => {
      toast.error('Erro', {
        description: error.message,
      });
    },
  });

  const saveCloudflareMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await fetch('/api/config/cloudflare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          zoneId: credentials.zone_id,
          apiToken: credentials.api_token,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      setShowIntegrationDialog(null);
      toast.success('Cloudflare configurado', {
        description: 'CDN e proteção ativados!',
      });
    },
    onError: (error: any) => {
      toast.error('Erro', {
        description: error.message,
      });
    },
  });

  const saveBetterStackMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await fetch('/api/config/better-stack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sourceToken: credentials.source_token,
          ingestingHost: credentials.ingesting_host || undefined,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      setShowIntegrationDialog(null);
      toast.success('Better Stack configurado', {
        description: 'Logging e uptime ativados!',
      });
    },
    onError: (error: any) => {
      toast.error('Erro', {
        description: error.message,
      });
    },
  });

  const saveCacheMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await fetch('/api/config/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      setShowIntegrationDialog(null);
      toast.success('Cache configurado', {
        description: 'Estratégias de cache salvas com sucesso!',
      });
    },
    onError: (error: any) => {
      toast.error('Erro', {
        description: error.message,
      });
    },
  });

  const saveOptimizerMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await fetch('/api/config/optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      setShowIntegrationDialog(null);
      toast.success('Optimizer configurado', {
        description: 'Otimizações de query salvas com sucesso!',
      });
    },
    onError: (error: any) => {
      toast.error('Erro', {
        description: error.message,
      });
    },
  });

  const saveMonitoringMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await fetch('/api/config/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      setShowIntegrationDialog(null);
      toast.success('Monitoring configurado', {
        description: 'Configurações de monitoramento salvas!',
      });
    },
    onError: (error: any) => {
      toast.error('Erro', {
        description: error.message,
      });
    },
  });

  const integrations = [
    {
      id: 'evolution_api',
      name: 'Evolution API (WhatsApp)',
      description: 'Integração de mensagens WhatsApp',
      icon: MessageSquare,
      connected: credentialsStatus?.evolution_api || false,
    },
    {
      id: 'supabase',
      name: 'Supabase Database',
      description: 'Configuração do banco de dados',
      icon: Database,
      connected: credentialsStatus?.supabase_configured || false,
    },
    {
      id: 'google_calendar',
      name: 'Google Calendar',
      description: 'Sincronização de agenda',
      icon: Calendar,
      connected: credentialsStatus?.google_calendar || false,
    },
    {
      id: 'pluggy',
      name: 'Conexão Bancária (Pluggy)',
      description: 'Integração bancária para transações',
      icon: Wallet,
      connected: pluggyCredentials?.configured || false,
    },
    {
      id: 'n8n',
      name: 'Processamento de Documentos (N8N)',
      description: 'Análise automática com IA',
      icon: Webhook,
      connected: n8nCredentials?.configured || false,
    },
    {
      id: 'redis',
      name: 'Redis Cache',
      description: 'Cache distribuído para performance',
      icon: Server,
      connected: redisCredentials?.success || false,
    },
    {
      id: 'sentry',
      name: 'Sentry Monitoring',
      description: 'Monitoramento de erros e performance',
      icon: Activity,
      connected: sentryCredentials?.success || false,
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare CDN',
      description: 'CDN e proteção DDoS',
      icon: Cloud,
      connected: cloudflareCredentials?.success || false,
    },
    {
      id: 'better_stack',
      name: 'Better Stack',
      description: 'Logging centralizado e uptime',
      icon: BarChart3,
      connected: betterStackCredentials?.success || false,
    },
    {
      id: 'cache',
      name: 'Cache Strategies',
      description: 'Configurações de cache para otimização',
      icon: Server,
      connected: cacheSettings?.success || false,
    },
    {
      id: 'optimizer',
      name: 'Query Optimizer',
      description: 'Otimizações de consultas ao banco',
      icon: Zap,
      connected: optimizerSettings?.success || false,
    },
    {
      id: 'monitoring',
      name: 'Monitoring & Alerts',
      description: 'Monitoramento de recursos e alertas',
      icon: Activity,
      connected: monitoringSettings?.success || false,
    },
  ];

  const handleSaveProfile = () => {
    hapticFeedback('medium');
    updateUser(profileForm);
    localStorage.setItem('user-name', profileForm.name);
    localStorage.setItem('user-email', profileForm.email);
    setShowProfileDialog(false);
    toast.success('Perfil atualizado', {
      description: 'Suas informações foram salvas com sucesso.',
    });
  };

  const handleToggleNotification = (type: 'push' | 'email' | 'whatsapp', value: boolean) => {
    hapticFeedback('light');
    const newSettings = { ...notifications, [type]: value };
    setNotifications(newSettings);
    localStorage.setItem('notification-settings', JSON.stringify(newSettings));
    
    const labels = { push: 'Push', email: 'Email', whatsapp: 'WhatsApp' };
    toast.success(
      `Notificações por ${labels[type]} ${value ? 'ativadas' : 'desativadas'}`,
      { duration: 2000 }
    );
  };

  const handleThemeToggle = (isDark: boolean) => {
    hapticFeedback('medium');
    setTheme(isDark ? 'dark' : 'light');
    toast.success(`Tema ${isDark ? 'escuro' : 'claro'} ativado`, {
      duration: 2000,
    });
  };

  const handleLogout = async () => {
    hapticFeedback('heavy');
    setShowLogoutDialog(false);
    
    try {
      await logout();
      toast.success('Logout realizado com sucesso');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  };

  const handleSaveIntegration = (integrationType: string) => {
    hapticFeedback('medium');
    const credentials = integrationForms[integrationType as keyof typeof integrationForms];
    
    if (integrationType === 'supabase') {
      if (!credentials.url || !credentials.anon_key) {
        toast.error('Erro', {
          description: 'Por favor, preencha todos os campos do Supabase',
        });
        return;
      }
      saveSupabaseMutation.mutate(credentials);
    } else if (integrationType === 'google_calendar') {
      if (!credentials.client_id || !credentials.client_secret) {
        toast.error('Erro', {
          description: 'Por favor, preencha todos os campos do Google Calendar',
        });
        return;
      }
      saveGoogleCalendarMutation.mutate(credentials);
    } else if (integrationType === 'pluggy') {
      if (!credentials.client_id || !credentials.client_secret) {
        toast.error('Erro', {
          description: 'Por favor, preencha todos os campos do Pluggy',
        });
        return;
      }
      savePluggyMutation.mutate(credentials);
    } else if (integrationType === 'evolution_api') {
      if (!credentials.api_url || !credentials.api_key) {
        toast.error('Erro', {
          description: 'Por favor, preencha a URL da API e a API Key do Evolution API',
        });
        return;
      }
      saveEvolutionApiMutation.mutate(credentials);
    } else if (integrationType === 'n8n') {
      if (!credentials.webhook_url) {
        toast.error('Erro', {
          description: 'Por favor, preencha a URL do webhook N8N',
        });
        return;
      }
      saveN8nMutation.mutate(credentials);
    } else if (integrationType === 'redis') {
      if (!credentials.redis_url) {
        toast.error('Erro', {
          description: 'Por favor, preencha a URL do Redis',
        });
        return;
      }
      saveRedisMutation.mutate(credentials);
    } else if (integrationType === 'sentry') {
      if (!credentials.dsn) {
        toast.error('Erro', {
          description: 'Por favor, preencha o DSN do Sentry',
        });
        return;
      }
      saveSentryMutation.mutate(credentials);
    } else if (integrationType === 'cloudflare') {
      if (!credentials.zone_id || !credentials.api_token) {
        toast.error('Erro', {
          description: 'Por favor, preencha todos os campos do Cloudflare',
        });
        return;
      }
      saveCloudflareMutation.mutate(credentials);
    } else if (integrationType === 'better_stack') {
      if (!credentials.source_token) {
        toast.error('Erro', {
          description: 'Por favor, preencha o Source Token do Better Stack',
        });
        return;
      }
      saveBetterStackMutation.mutate(credentials);
    } else if (integrationType === 'cache') {
      saveCacheMutation.mutate(credentials);
    } else if (integrationType === 'optimizer') {
      saveOptimizerMutation.mutate(credentials);
    } else if (integrationType === 'monitoring') {
      saveMonitoringMutation.mutate(credentials);
    }
  };

  const handleExportData = () => {
    hapticFeedback('medium');
    const data = {
      user,
      client,
      notifications,
      theme,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Dados exportados', {
      description: 'Seus dados foram baixados com sucesso!',
    });
  };

  const isSavingIntegration = 
    saveSupabaseMutation.isPending || 
    saveGoogleCalendarMutation.isPending || 
    savePluggyMutation.isPending || 
    saveN8nMutation.isPending ||
    saveEvolutionApiMutation.isPending ||
    saveRedisMutation.isPending ||
    saveSentryMutation.isPending ||
    saveCloudflareMutation.isPending ||
    saveBetterStackMutation.isPending ||
    saveCacheMutation.isPending ||
    saveOptimizerMutation.isPending ||
    saveMonitoringMutation.isPending;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <MobileCard variant="elevated" padding="lg" className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
          
          <div className="relative flex flex-col items-center text-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20 shadow-[0_8px_32px_rgba(212,175,55,0.2)]">
              <User className="w-12 h-12 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                {user?.name || 'Usuário'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {user?.email || 'email@exemplo.com'}
              </p>
              <Badge className={cn('text-xs font-semibold', planColor)}>
                {planLabel}
              </Badge>
            </div>

            <MobileButton
              variant="secondary"
              className="w-full max-w-xs"
              onClick={() => {
                hapticFeedback('light');
                setShowProfileDialog(true);
              }}
            >
              Editar Perfil
            </MobileButton>
          </div>
        </MobileCard>

        <Section title="Conta">
          <SettingItem
            icon={User}
            label="Nome"
            subtitle={user?.name || 'Não definido'}
            onClick={() => setShowProfileDialog(true)}
          />
          <div className="h-px bg-white/5 my-1" />
          <SettingItem
            icon={Mail}
            label="Email"
            subtitle={user?.email || 'Não definido'}
            onClick={() => setShowProfileDialog(true)}
          />
          <div className="h-px bg-white/5 my-1" />
          <SettingItem
            icon={Lock}
            label="Senha"
            subtitle="••••••••"
            onClick={() => toast.info('Alterar senha em desenvolvimento')}
          />
        </Section>

        <Section title="Notificações">
          <MobileSwitch
            label="Notificações Push"
            description="Receber notificações no dispositivo"
            checked={notifications.push}
            onChange={(e) => handleToggleNotification('push', e.target.checked)}
          />
          <div className="h-px bg-white/5 my-2" />
          <MobileSwitch
            label="Notificações por Email"
            description="Receber alertas por email"
            checked={notifications.email}
            onChange={(e) => handleToggleNotification('email', e.target.checked)}
          />
          <div className="h-px bg-white/5 my-2" />
          <MobileSwitch
            label="Notificações WhatsApp"
            description="Receber mensagens no WhatsApp"
            checked={notifications.whatsapp}
            onChange={(e) => handleToggleNotification('whatsapp', e.target.checked)}
          />
        </Section>

        <Section title="Integrações">
          {isLoadingCredentials ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            integrations.map((integration, index) => (
              <div key={integration.id}>
                {index > 0 && <div className="h-px bg-white/5 my-1" />}
                <SettingItem
                  icon={integration.icon}
                  label={integration.name}
                  subtitle={integration.description}
                  onClick={() => setShowIntegrationDialog(integration.id)}
                  badge={
                    <Badge
                      className={cn(
                        'text-xs font-semibold',
                        integration.connected
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-white/5 text-muted-foreground border-white/10'
                      )}
                    >
                      {integration.connected ? 'Conectado' : 'Desconectado'}
                    </Badge>
                  }
                  showChevron={true}
                />
              </div>
            ))
          )}
        </Section>

        <Section title="Aparência">
          <div className="flex items-center justify-between gap-4 py-1">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                {isDarkMode ? (
                  <Moon className="w-5 h-5 text-primary" />
                ) : (
                  <Sun className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-base font-medium text-foreground">Tema Escuro</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {isDarkMode ? 'Ativado' : 'Desativado'}
                </div>
              </div>
            </div>
            <MobileSwitch
              checked={isDarkMode}
              onChange={(e) => handleThemeToggle(e.target.checked)}
              className="flex-shrink-0"
            />
          </div>
          <div className="h-px bg-white/5 my-1" />
          <SettingItem
            icon={Globe}
            label="Idioma"
            subtitle="Português (BR)"
            onClick={() => toast.info('Seleção de idioma em desenvolvimento')}
          />
        </Section>

        <Section title="Privacidade e Dados">
          <SettingItem
            icon={Shield}
            label="Privacidade"
            subtitle="Gerenciar preferências de privacidade"
            onClick={() => toast.info('Configurações de privacidade')}
          />
          <div className="h-px bg-white/5 my-1" />
          <SettingItem
            icon={Database}
            label="Backup de Dados"
            subtitle="Fazer backup das suas informações"
            onClick={() => toast.info('Backup em desenvolvimento')}
          />
          <div className="h-px bg-white/5 my-1" />
          <SettingItem
            icon={Download}
            label="Exportar Dados"
            subtitle="Baixar seus dados em formato JSON"
            onClick={handleExportData}
          />
        </Section>

        <Section title="Sobre">
          <SettingItem
            icon={Smartphone}
            label="Versão"
            subtitle="v2.0.0"
            showChevron={false}
          />
          <div className="h-px bg-white/5 my-1" />
          <SettingItem
            icon={FileText}
            label="Termos de Uso"
            onClick={() => toast.info('Termos de Uso')}
          />
          <div className="h-px bg-white/5 my-1" />
          <SettingItem
            icon={Shield}
            label="Política de Privacidade"
            onClick={() => toast.info('Política de Privacidade')}
          />
        </Section>

        <div className="pt-2 pb-4">
          <MobileButton
            variant="danger"
            onClick={() => {
              hapticFeedback('heavy');
              setShowLogoutDialog(true);
            }}
          >
            <LogOut className="w-5 h-5" />
            Sair da Conta
          </MobileButton>
        </div>
      </div>

      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-md mx-4 rounded-2xl bg-background/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Editar Perfil</DialogTitle>
            <DialogDescription>
              Atualize suas informações pessoais
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Nome</Label>
              <MobileInput
                id="name"
                value={profileForm.name}
                onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Seu nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <MobileInput
                id="email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="seu@email.com"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <MobileButton onClick={handleSaveProfile} className="w-full">
              Salvar Alterações
            </MobileButton>
            <MobileButton 
              variant="secondary" 
              onClick={() => {
                hapticFeedback('light');
                setShowProfileDialog(false);
              }}
              className="w-full"
            >
              Cancelar
            </MobileButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIntegrationDialog === 'supabase'} onOpenChange={(open) => !open && setShowIntegrationDialog(null)}>
        <DialogContent className="max-w-md mx-4 rounded-2xl bg-background/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Configurar Supabase
            </DialogTitle>
            <DialogDescription>
              Configure sua conexão com o Supabase
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="supabase-url" className="text-sm font-medium">URL do Projeto</Label>
              <MobileInput
                id="supabase-url"
                value={integrationForms.supabase.url}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  supabase: { ...prev.supabase, url: e.target.value }
                }))}
                placeholder="https://seu-projeto.supabase.co"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supabase-key" className="text-sm font-medium">Anon Key</Label>
              <MobileInput
                id="supabase-key"
                type="password"
                value={integrationForms.supabase.anon_key}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  supabase: { ...prev.supabase, anon_key: e.target.value }
                }))}
                placeholder="sua-anon-key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supabase-bucket" className="text-sm font-medium">Bucket</Label>
              <MobileInput
                id="supabase-bucket"
                value={integrationForms.supabase.bucket}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  supabase: { ...prev.supabase, bucket: e.target.value }
                }))}
                placeholder="receipts"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <MobileButton 
              onClick={() => handleSaveIntegration('supabase')}
              disabled={isSavingIntegration}
              className="w-full"
            >
              {saveSupabaseMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configuração'
              )}
            </MobileButton>
            <MobileButton 
              variant="secondary" 
              onClick={() => {
                hapticFeedback('light');
                setShowIntegrationDialog(null);
              }}
              disabled={isSavingIntegration}
              className="w-full"
            >
              Cancelar
            </MobileButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIntegrationDialog === 'google_calendar'} onOpenChange={(open) => !open && setShowIntegrationDialog(null)}>
        <DialogContent className="max-w-md mx-4 rounded-2xl bg-background/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Configurar Google Calendar
            </DialogTitle>
            <DialogDescription>
              Configure sua integração com o Google Calendar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="google-client-id" className="text-sm font-medium">Client ID</Label>
              <MobileInput
                id="google-client-id"
                value={integrationForms.google_calendar.client_id}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  google_calendar: { ...prev.google_calendar, client_id: e.target.value }
                }))}
                placeholder="seu-client-id.apps.googleusercontent.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="google-client-secret" className="text-sm font-medium">Client Secret</Label>
              <MobileInput
                id="google-client-secret"
                type="password"
                value={integrationForms.google_calendar.client_secret}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  google_calendar: { ...prev.google_calendar, client_secret: e.target.value }
                }))}
                placeholder="seu-client-secret"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="google-refresh-token" className="text-sm font-medium">Refresh Token (Opcional)</Label>
              <MobileInput
                id="google-refresh-token"
                type="password"
                value={integrationForms.google_calendar.refresh_token}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  google_calendar: { ...prev.google_calendar, refresh_token: e.target.value }
                }))}
                placeholder="seu-refresh-token"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <MobileButton 
              onClick={() => handleSaveIntegration('google_calendar')}
              disabled={isSavingIntegration}
              className="w-full"
            >
              {saveGoogleCalendarMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configuração'
              )}
            </MobileButton>
            <MobileButton 
              variant="secondary" 
              onClick={() => {
                hapticFeedback('light');
                setShowIntegrationDialog(null);
              }}
              disabled={isSavingIntegration}
              className="w-full"
            >
              Cancelar
            </MobileButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIntegrationDialog === 'pluggy'} onOpenChange={(open) => !open && setShowIntegrationDialog(null)}>
        <DialogContent className="max-w-md mx-4 rounded-2xl bg-background/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Configurar Pluggy
            </DialogTitle>
            <DialogDescription>
              Configure sua integração com o Pluggy para dados bancários
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pluggy-client-id" className="text-sm font-medium">Client ID</Label>
              <MobileInput
                id="pluggy-client-id"
                value={integrationForms.pluggy.client_id}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  pluggy: { ...prev.pluggy, client_id: e.target.value }
                }))}
                placeholder="seu-client-id"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pluggy-client-secret" className="text-sm font-medium">Client Secret</Label>
              <MobileInput
                id="pluggy-client-secret"
                type="password"
                value={integrationForms.pluggy.client_secret}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  pluggy: { ...prev.pluggy, client_secret: e.target.value }
                }))}
                placeholder="seu-client-secret"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <MobileButton 
              onClick={() => handleSaveIntegration('pluggy')}
              disabled={isSavingIntegration}
              className="w-full"
            >
              {savePluggyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configuração'
              )}
            </MobileButton>
            <MobileButton 
              variant="secondary" 
              onClick={() => {
                hapticFeedback('light');
                setShowIntegrationDialog(null);
              }}
              disabled={isSavingIntegration}
              className="w-full"
            >
              Cancelar
            </MobileButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIntegrationDialog === 'evolution_api'} onOpenChange={(open) => !open && setShowIntegrationDialog(null)}>
        <DialogContent className="max-w-md mx-4 rounded-2xl bg-background/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Configurar Evolution API
            </DialogTitle>
            <DialogDescription>
              Configure sua integração com o WhatsApp via Evolution API
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="evolution-url" className="text-sm font-medium">URL da API</Label>
              <MobileInput
                id="evolution-url"
                value={integrationForms.evolution_api.api_url}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  evolution_api: { ...prev.evolution_api, api_url: e.target.value }
                }))}
                placeholder="https://sua-api.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evolution-key" className="text-sm font-medium">API Key</Label>
              <MobileInput
                id="evolution-key"
                type="password"
                value={integrationForms.evolution_api.api_key}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  evolution_api: { ...prev.evolution_api, api_key: e.target.value }
                }))}
                placeholder="sua-api-key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evolution-instance" className="text-sm font-medium">Nome da Instância</Label>
              <MobileInput
                id="evolution-instance"
                value={integrationForms.evolution_api.instance}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  evolution_api: { ...prev.evolution_api, instance: e.target.value }
                }))}
                placeholder="nexus-whatsapp"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <MobileButton 
              onClick={() => handleSaveIntegration('evolution_api')}
              disabled={isSavingIntegration}
              className="w-full"
            >
              {saveEvolutionApiMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configuração'
              )}
            </MobileButton>
            <MobileButton 
              variant="secondary" 
              onClick={() => {
                hapticFeedback('light');
                setShowIntegrationDialog(null);
              }}
              disabled={isSavingIntegration}
              className="w-full"
            >
              Cancelar
            </MobileButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIntegrationDialog === 'n8n'} onOpenChange={(open) => !open && setShowIntegrationDialog(null)}>
        <DialogContent className="max-w-md mx-4 rounded-2xl bg-background/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Webhook className="w-5 h-5 text-primary" />
              Configurar N8N
            </DialogTitle>
            <DialogDescription>
              Configure o webhook para processamento de documentos com IA
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="n8n-webhook" className="text-sm font-medium">Webhook URL</Label>
              <MobileInput
                id="n8n-webhook"
                value={integrationForms.n8n.webhook_url}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  n8n: { webhook_url: e.target.value }
                }))}
                placeholder="https://seu-n8n.com/webhook/..."
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <MobileButton 
              onClick={() => handleSaveIntegration('n8n')}
              disabled={isSavingIntegration}
              className="w-full"
            >
              {saveN8nMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configuração'
              )}
            </MobileButton>
            <MobileButton 
              variant="secondary" 
              onClick={() => {
                hapticFeedback('light');
                setShowIntegrationDialog(null);
              }}
              disabled={isSavingIntegration}
              className="w-full"
            >
              Cancelar
            </MobileButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIntegrationDialog === 'redis'} onOpenChange={(open) => !open && setShowIntegrationDialog(null)}>
        <DialogContent className="max-w-md mx-4 rounded-2xl bg-background/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              Configurar Redis Cache
            </DialogTitle>
            <DialogDescription>
              Configure o Redis para cache distribuído
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="redis-url" className="text-sm font-medium">Redis URL</Label>
              <MobileInput
                id="redis-url"
                value={integrationForms.redis.redis_url}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  redis: { ...prev.redis, redis_url: e.target.value }
                }))}
                placeholder="redis://seu-servidor:6379"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="redis-token" className="text-sm font-medium">Token (Opcional)</Label>
              <MobileInput
                id="redis-token"
                type="password"
                value={integrationForms.redis.redis_token}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  redis: { ...prev.redis, redis_token: e.target.value }
                }))}
                placeholder="seu-token"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <MobileButton 
              onClick={() => handleSaveIntegration('redis')}
              disabled={isSavingIntegration}
              className="w-full"
            >
              {saveRedisMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configuração'
              )}
            </MobileButton>
            <MobileButton 
              variant="secondary" 
              onClick={() => {
                hapticFeedback('light');
                setShowIntegrationDialog(null);
              }}
              disabled={isSavingIntegration}
              className="w-full"
            >
              Cancelar
            </MobileButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIntegrationDialog === 'sentry'} onOpenChange={(open) => !open && setShowIntegrationDialog(null)}>
        <DialogContent className="max-w-md mx-4 rounded-2xl bg-background/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Configurar Sentry Monitoring
            </DialogTitle>
            <DialogDescription>
              Configure o Sentry para monitoramento de erros
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="sentry-dsn" className="text-sm font-medium">DSN</Label>
              <MobileInput
                id="sentry-dsn"
                value={integrationForms.sentry.dsn}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  sentry: { ...prev.sentry, dsn: e.target.value }
                }))}
                placeholder="https://xxx@xxx.ingest.sentry.io/xxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sentry-auth-token" className="text-sm font-medium">Auth Token (Opcional)</Label>
              <MobileInput
                id="sentry-auth-token"
                type="password"
                value={integrationForms.sentry.auth_token}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  sentry: { ...prev.sentry, auth_token: e.target.value }
                }))}
                placeholder="seu-auth-token"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sentry-org" className="text-sm font-medium">Organization (Opcional)</Label>
              <MobileInput
                id="sentry-org"
                value={integrationForms.sentry.organization}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  sentry: { ...prev.sentry, organization: e.target.value }
                }))}
                placeholder="sua-organizacao"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sentry-project" className="text-sm font-medium">Project (Opcional)</Label>
              <MobileInput
                id="sentry-project"
                value={integrationForms.sentry.project}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  sentry: { ...prev.sentry, project: e.target.value }
                }))}
                placeholder="seu-projeto"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <MobileButton 
              onClick={() => handleSaveIntegration('sentry')}
              disabled={isSavingIntegration}
              className="w-full"
            >
              {saveSentryMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configuração'
              )}
            </MobileButton>
            <MobileButton 
              variant="secondary" 
              onClick={() => {
                hapticFeedback('light');
                setShowIntegrationDialog(null);
              }}
              disabled={isSavingIntegration}
              className="w-full"
            >
              Cancelar
            </MobileButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIntegrationDialog === 'cloudflare'} onOpenChange={(open) => !open && setShowIntegrationDialog(null)}>
        <DialogContent className="max-w-md mx-4 rounded-2xl bg-background/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Cloud className="w-5 h-5 text-primary" />
              Configurar Cloudflare CDN
            </DialogTitle>
            <DialogDescription>
              Configure o Cloudflare para CDN e proteção DDoS
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cloudflare-zone" className="text-sm font-medium">Zone ID</Label>
              <MobileInput
                id="cloudflare-zone"
                value={integrationForms.cloudflare.zone_id}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  cloudflare: { ...prev.cloudflare, zone_id: e.target.value }
                }))}
                placeholder="seu-zone-id"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cloudflare-token" className="text-sm font-medium">API Token</Label>
              <MobileInput
                id="cloudflare-token"
                type="password"
                value={integrationForms.cloudflare.api_token}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  cloudflare: { ...prev.cloudflare, api_token: e.target.value }
                }))}
                placeholder="seu-api-token"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <MobileButton 
              onClick={() => handleSaveIntegration('cloudflare')}
              disabled={isSavingIntegration}
              className="w-full"
            >
              {saveCloudflareMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configuração'
              )}
            </MobileButton>
            <MobileButton 
              variant="secondary" 
              onClick={() => {
                hapticFeedback('light');
                setShowIntegrationDialog(null);
              }}
              disabled={isSavingIntegration}
              className="w-full"
            >
              Cancelar
            </MobileButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIntegrationDialog === 'better_stack'} onOpenChange={(open) => !open && setShowIntegrationDialog(null)}>
        <DialogContent className="max-w-md mx-4 rounded-2xl bg-background/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Configurar Better Stack
            </DialogTitle>
            <DialogDescription>
              Configure o Better Stack para logging e uptime
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="betterstack-token" className="text-sm font-medium">Source Token</Label>
              <MobileInput
                id="betterstack-token"
                type="password"
                value={integrationForms.better_stack.source_token}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  better_stack: { ...prev.better_stack, source_token: e.target.value }
                }))}
                placeholder="seu-source-token"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="betterstack-host" className="text-sm font-medium">Ingesting Host (Opcional)</Label>
              <MobileInput
                id="betterstack-host"
                value={integrationForms.better_stack.ingesting_host}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  better_stack: { ...prev.better_stack, ingesting_host: e.target.value }
                }))}
                placeholder="in.logs.betterstack.com"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <MobileButton 
              onClick={() => handleSaveIntegration('better_stack')}
              disabled={isSavingIntegration}
              className="w-full"
            >
              {saveBetterStackMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configuração'
              )}
            </MobileButton>
            <MobileButton 
              variant="secondary" 
              onClick={() => {
                hapticFeedback('light');
                setShowIntegrationDialog(null);
              }}
              disabled={isSavingIntegration}
              className="w-full"
            >
              Cancelar
            </MobileButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIntegrationDialog === 'cache'} onOpenChange={(open) => !open && setShowIntegrationDialog(null)}>
        <DialogContent className="max-w-md mx-4 rounded-2xl bg-background/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              Configurar Cache Strategies
            </DialogTitle>
            <DialogDescription>
              Configure estratégias de cache para otimização
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-sm font-medium">TTL Progressivo</Label>
              <MobileSwitch
                checked={integrationForms.cache.progressive_ttl_enabled === 'true'}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  cache: { ...prev.cache, progressive_ttl_enabled: e.target.checked ? 'true' : 'false' }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cache-ttl-default" className="text-sm font-medium">TTL Padrão (segundos)</Label>
              <MobileInput
                id="cache-ttl-default"
                type="number"
                value={integrationForms.cache.ttl_default}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  cache: { ...prev.cache, ttl_default: e.target.value }
                }))}
                placeholder="300"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Compressão</Label>
              <MobileSwitch
                checked={integrationForms.cache.compression_enabled === 'true'}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  cache: { ...prev.cache, compression_enabled: e.target.checked ? 'true' : 'false' }
                }))}
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <MobileButton 
              onClick={() => handleSaveIntegration('cache')}
              disabled={isSavingIntegration}
              className="w-full"
            >
              {saveCacheMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configuração'
              )}
            </MobileButton>
            <MobileButton 
              variant="secondary" 
              onClick={() => {
                hapticFeedback('light');
                setShowIntegrationDialog(null);
              }}
              disabled={isSavingIntegration}
              className="w-full"
            >
              Cancelar
            </MobileButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIntegrationDialog === 'optimizer'} onOpenChange={(open) => !open && setShowIntegrationDialog(null)}>
        <DialogContent className="max-w-md mx-4 rounded-2xl bg-background/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Configurar Query Optimizer
            </DialogTitle>
            <DialogDescription>
              Configure otimizações de consultas ao banco
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="optimizer-page-size" className="text-sm font-medium">Tamanho da Página</Label>
              <MobileInput
                id="optimizer-page-size"
                type="number"
                value={integrationForms.optimizer.default_page_size}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  optimizer: { ...prev.optimizer, default_page_size: e.target.value }
                }))}
                placeholder="20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cache de Queries</Label>
              <MobileSwitch
                checked={integrationForms.optimizer.query_caching_enabled === 'true'}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  optimizer: { ...prev.optimizer, query_caching_enabled: e.target.checked ? 'true' : 'false' }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Agregação</Label>
              <MobileSwitch
                checked={integrationForms.optimizer.aggregation_enabled === 'true'}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  optimizer: { ...prev.optimizer, aggregation_enabled: e.target.checked ? 'true' : 'false' }
                }))}
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <MobileButton 
              onClick={() => handleSaveIntegration('optimizer')}
              disabled={isSavingIntegration}
              className="w-full"
            >
              {saveOptimizerMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configuração'
              )}
            </MobileButton>
            <MobileButton 
              variant="secondary" 
              onClick={() => {
                hapticFeedback('light');
                setShowIntegrationDialog(null);
              }}
              disabled={isSavingIntegration}
              className="w-full"
            >
              Cancelar
            </MobileButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIntegrationDialog === 'monitoring'} onOpenChange={(open) => !open && setShowIntegrationDialog(null)}>
        <DialogContent className="max-w-md mx-4 rounded-2xl bg-background/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Configurar Monitoring & Alerts
            </DialogTitle>
            <DialogDescription>
              Configure monitoramento de recursos e alertas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Monitoramento Ativo</Label>
              <MobileSwitch
                checked={integrationForms.monitoring.monitoring_enabled === 'true'}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  monitoring: { ...prev.monitoring, monitoring_enabled: e.target.checked ? 'true' : 'false' }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Alertas Ativos</Label>
              <MobileSwitch
                checked={integrationForms.monitoring.alerts_enabled === 'true'}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  monitoring: { ...prev.monitoring, alerts_enabled: e.target.checked ? 'true' : 'false' }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monitoring-email" className="text-sm font-medium">Email para Alertas</Label>
              <MobileInput
                id="monitoring-email"
                type="email"
                value={integrationForms.monitoring.alert_email}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  monitoring: { ...prev.monitoring, alert_email: e.target.value }
                }))}
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Ações Automáticas</Label>
              <MobileSwitch
                checked={integrationForms.monitoring.auto_actions_enabled === 'true'}
                onChange={(e) => setIntegrationForms(prev => ({
                  ...prev,
                  monitoring: { ...prev.monitoring, auto_actions_enabled: e.target.checked ? 'true' : 'false' }
                }))}
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <MobileButton 
              onClick={() => handleSaveIntegration('monitoring')}
              disabled={isSavingIntegration}
              className="w-full"
            >
              {saveMonitoringMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configuração'
              )}
            </MobileButton>
            <MobileButton 
              variant="secondary" 
              onClick={() => {
                hapticFeedback('light');
                setShowIntegrationDialog(null);
              }}
              disabled={isSavingIntegration}
              className="w-full"
            >
              Cancelar
            </MobileButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="max-w-md mx-4 rounded-2xl bg-background/95 backdrop-blur-xl border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">
              Confirmar Logout
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-muted-foreground">
              Tem certeza que deseja sair da sua conta? Você precisará fazer login novamente para acessar o sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              onClick={handleLogout}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 h-12 rounded-xl font-semibold"
            >
              Sim, Sair
            </AlertDialogAction>
            <AlertDialogCancel
              onClick={() => hapticFeedback('light')}
              className="w-full h-12 rounded-xl font-semibold"
            >
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;
