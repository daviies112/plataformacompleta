import { PremiumCard } from '@/platforms/shared/premium/PremiumCard';
import { PremiumButton } from '@/platforms/shared/premium/PremiumButton';
import { PremiumInput } from '@/platforms/shared/premium/PremiumInput';
import { PremiumSwitch } from '@/platforms/shared/premium/PremiumSwitch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { Settings, User, Shield, Plug, Database, Calendar, MessageSquare, Zap, Video, CreditCard, Webhook, Activity, Search, Bell, ChevronDown, Sun, Moon, Code, Server, Cloud, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { BottomNav } from '@/components/mobile/BottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { setColorScheme, getSavedColorScheme, type ColorScheme } from '@/lib/colorScheme';

// Move CollapsibleSection outside to prevent re-renders
const CollapsibleSection = ({ 
  id, 
  title, 
  description, 
  icon: Icon, 
  children,
  openSections,
  setOpenSections
}: { 
  id: string; 
  title: string; 
  description: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
  openSections: Record<string, boolean>;
  setOpenSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) => (
  <Collapsible
    open={openSections[id]}
    onOpenChange={(open) => setOpenSections((prev) => ({...prev, [id]: open}))}
  >
    <PremiumCard variant="elevated" padding="lg" className="group">
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between cursor-pointer select-none">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
          <ChevronDown className={cn(
            "h-6 w-6 text-primary transition-transform duration-300",
            openSections[id] && "rotate-180"
          )} />
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-6">
        {children}
      </CollapsibleContent>
    </PremiumCard>
  </Collapsible>
);

const SettingsPage = () => {
  const { user, client, updateClient, updateUser, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [selectedColorScheme, setSelectedColorScheme] = useState<ColorScheme>(() => {
    return getSavedColorScheme();
  });

  const [openSections, setOpenSections] = useState({
    profile: true,
    company: false,
    system: false,
    notifications: false,
    whatsapp: false,
    supabase: false,
    googleCalendar: false,
    pluggy: false,
    n8n: false,
    evolutionApi: false,
    redis: false,
    sentry: false,
    cloudflare: false,
    betterStack: false,
    bigdatacorp: false,
    supabaseMaster: false,
    cache: false,
    optimizer: false,
    hms100ms: false,
    monitoring: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && (resolvedTheme ?? theme) === 'dark';
  
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  
  const [companyForm, setCompanyForm] = useState({
    name: client?.name || '',
    email: client?.email || ''
  });
  
  const [whatsappQRCode, setWhatsappQRCode] = useState<string | null>(null);
  const [uploadingQRCode, setUploadingQRCode] = useState(false);

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('notification-settings');
      return saved ? JSON.parse(saved) : {
        push: true,
        email: true,
        whatsapp: false,
      };
    } catch (error) {
      console.warn('Failed to parse notification settings from localStorage, using defaults:', error);
      return {
        push: true,
        email: true,
        whatsapp: false,
      };
    }
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
    bigdatacorp: { token_id: '', chave_token: '' },
    supabase_master: { url: '', service_role_key: '' },
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
    hms100ms: { 
      app_access_key: '', 
      app_secret: '', 
      management_token: '',
      template_id: '',
      api_base_url: 'https://api.100ms.live/v2'
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
  
  const handleSaveProfile = () => {
    updateUser(profileForm);
    localStorage.setItem('user-name', profileForm.name);
    localStorage.setItem('user-email', profileForm.email);
    
    toast({
      title: "Perfil atualizado",
      description: "Suas informações foram salvas com sucesso.",
    });
  };

  const handleSaveCompany = () => {
    updateClient(companyForm);
    localStorage.setItem('client-name', companyForm.name);
    localStorage.setItem('client-email', companyForm.email);
    
    toast({
      title: "Empresa atualizada",
      description: "As informações da empresa foram salvas com sucesso.",
    });
  };

  const handleToggleNotification = (type: 'push' | 'email' | 'whatsapp', value: boolean) => {
    const newSettings = { ...notifications, [type]: value };
    setNotifications(newSettings);
    localStorage.setItem('notification-settings', JSON.stringify(newSettings));
    
    toast({
      title: "Notificações atualizadas",
      description: `Notificações via ${type === 'push' ? 'Push' : type === 'email' ? 'Email' : 'WhatsApp'} ${value ? 'ativadas' : 'desativadas'}.`,
    });
  };

  const { data: credentialsStatus, isLoading: isLoadingCredentials, refetch: refetchCredentials } = useQuery({
    queryKey: ['/api/credentials'],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const saveSupabaseMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await fetch('/api/config/supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      
      // ✅ CORREÇÃO CRÍTICA: Salvar no localStorage para que o frontend use as credenciais
      localStorage.setItem('supabase_url', credentials.url);
      localStorage.setItem('supabase_anon_key', credentials.anon_key);
      console.log('✅ Credenciais do Supabase salvas no localStorage');
      
      return response.json();
    },
    onSuccess: () => {
      refetchCredentials();
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/calendar-events'] });
      toast({
        title: "Integração configurada",
        description: "Credenciais do Supabase salvas com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar as credenciais.",
        variant: "destructive",
      });
    },
  });

  const saveGoogleCalendarMutation = useMutation({
    mutationFn: async (credentials: any) => {
      return apiRequest('PUT', `/api/credentials/google_calendar`, credentials);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/calendar-events'] });
      toast({
        title: "Integração configurada",
        description: "Credenciais do Google Calendar salvas com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar as credenciais.",
        variant: "destructive",
      });
    },
  });

  const savePluggyMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await fetch('/api/config/pluggy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      toast({
        title: "Integração configurada",
        description: "Credenciais do Pluggy salvas com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar as credenciais.",
        variant: "destructive",
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
      toast({
        title: "Integração configurada",
        description: "Webhook N8N salvo com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar a configuração.",
        variant: "destructive",
      });
    },
  });

  const saveEvolutionApiMutation = useMutation({
    mutationFn: async (credentials: any) => {
      return apiRequest('PUT', `/api/credentials/evolution_api`, credentials);
    },
    onSuccess: () => {
      refetchCredentials();
      toast({
        title: "Evolution API configurado",
        description: "Credenciais do WhatsApp (Evolution API) salvas com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar as credenciais.",
        variant: "destructive",
      });
    },
  });

  const saveRedisMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await fetch('/api/config/redis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redisUrl: credentials.redis_url,
          redisToken: credentials.redis_token,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Redis configurado", description: "Credenciais do Redis salvas!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const saveSentryMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await fetch('/api/config/sentry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      toast({ title: "Sentry configurado", description: "Monitoramento de erros ativado!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const saveCloudflareMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await fetch('/api/config/cloudflare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zoneId: credentials.zone_id,
          apiToken: credentials.api_token,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Cloudflare configurado", description: "CDN e proteção ativados!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const saveBetterStackMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await fetch('/api/config/better-stack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceToken: credentials.source_token,
          ingestingHost: credentials.ingesting_host || undefined,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Better Stack configurado", description: "Logging e uptime ativados!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const saveBigdatacorpMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await fetch('/api/config/bigdatacorp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: credentials.token_id,
          chaveToken: credentials.chave_token,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "BigDataCorp configurado", description: "Credenciais de consulta CPF salvas!" });
      refetchCredentials();
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const saveSupabaseMasterMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await fetch('/api/config/supabase-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabaseMasterUrl: credentials.url,
          supabaseMasterServiceRoleKey: credentials.service_role_key,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Supabase Master configurado", description: "Credenciais salvas com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ['/api/config/supabase-master'] });
      queryClient.invalidateQueries({ queryKey: ['/api/config/supabase-master/credentials'] });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const saveCacheMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await fetch('/api/config/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Cache configurado", description: "Estratégias de cache salvas com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const saveOptimizerMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await fetch('/api/config/optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Optimizer configurado", description: "Otimizações de query salvas com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const saveHms100msMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await fetch('/api/config/hms100ms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appAccessKey: credentials.app_access_key,
          appSecret: credentials.app_secret,
          managementToken: credentials.management_token,
          templateId: credentials.template_id,
          apiBaseUrl: credentials.api_base_url,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      refetchCredentials();
      queryClient.invalidateQueries({ queryKey: ['/api/config/hms100ms/credentials'] });
      toast({ title: "100ms configurado", description: "Credenciais do 100ms salvas com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const testHms100msMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await fetch('/api/config/hms100ms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appAccessKey: credentials.app_access_key,
          appSecret: credentials.app_secret,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Credenciais inválidas");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Credenciais do 100ms validadas com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro na validação", description: error.message, variant: "destructive" });
    },
  });

  const saveMonitoringMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await fetch('/api/config/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Monitoring configurado", description: "Configurações de monitoramento salvas!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const { data: supabaseCredentials } = useQuery({
    queryKey: ['/api/config/supabase/credentials'],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: googleCredentials } = useQuery({
    queryKey: ['/api/credentials/google_calendar'],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: pluggyCredentials } = useQuery({
    queryKey: ['/api/config/pluggy'],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: n8nCredentials } = useQuery({
    queryKey: ['/api/config/n8n'],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: evolutionCredentials } = useQuery({
    queryKey: ['/api/credentials/evolution_api'],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: whatsappQRCodeData, refetch: refetchQRCode } = useQuery({
    queryKey: ['/api/whatsapp/qrcode'],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  useEffect(() => {
    if (whatsappQRCodeData?.qrCodeUrl) {
      setWhatsappQRCode(whatsappQRCodeData.qrCodeUrl);
    }
  }, [whatsappQRCodeData]);

  const { data: cacheSettings, isLoading: isLoadingCache } = useQuery({
    queryKey: ['/api/config/cache/settings'],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0,
    refetchOnMount: true,
    retry: false,
  });

  const { data: optimizerSettings, isLoading: isLoadingOptimizer } = useQuery({
    queryKey: ['/api/config/optimizer/settings'],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0,
    refetchOnMount: true,
    retry: false,
  });

  const { data: monitoringSettings, isLoading: isLoadingMonitoring } = useQuery({
    queryKey: ['/api/config/monitoring/settings'],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0,
    refetchOnMount: true,
    retry: false,
  });

  const { data: redisCredentials } = useQuery({
    queryKey: ['/api/config/redis/credentials'],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: sentryCredentials } = useQuery({
    queryKey: ['/api/config/sentry/credentials'],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: cloudflareCredentials } = useQuery({
    queryKey: ['/api/config/cloudflare/credentials'],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: betterStackCredentials } = useQuery({
    queryKey: ['/api/config/better-stack/credentials'],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: bigdatacorpCredentials } = useQuery({
    queryKey: ['/api/config/bigdatacorp/credentials'],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: bigdatacorpStatus } = useQuery({
    queryKey: ['/api/config/bigdatacorp'],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: supabaseMasterStatus } = useQuery({
    queryKey: ['/api/config/supabase-master'],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: supabaseMasterCredentials } = useQuery({
    queryKey: ['/api/config/supabase-master/credentials'],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: hms100msCredentials } = useQuery({
    queryKey: ['/api/config/hms100ms/credentials'],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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
    if (pluggyCredentials?.configured) {
      setIntegrationForms(prev => ({
        ...prev,
        pluggy: { client_id: '', client_secret: '' }
      }));
    }
  }, [pluggyCredentials]);

  useEffect(() => {
    if (n8nCredentials?.configured) {
      setIntegrationForms(prev => ({
        ...prev,
        n8n: { webhook_url: '' }
      }));
    }
  }, [n8nCredentials]);

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
          redis_url: redisCredentials.credentials.url || '',
          redis_token: redisCredentials.credentials.token || ''
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
          auth_token: sentryCredentials.credentials.authToken || '',
          organization: sentryCredentials.credentials.organization || '',
          project: sentryCredentials.credentials.project || '',
          environment: sentryCredentials.credentials.environment || 'production',
          traces_sample_rate: sentryCredentials.credentials.tracesSampleRate || '0.1'
        }
      }));
    }
  }, [sentryCredentials]);

  useEffect(() => {
    if (cloudflareCredentials?.success && cloudflareCredentials?.credentials) {
      setIntegrationForms(prev => ({
        ...prev,
        cloudflare: {
          zone_id: cloudflareCredentials.credentials.zoneId || '',
          api_token: cloudflareCredentials.credentials.apiToken || ''
        }
      }));
    }
  }, [cloudflareCredentials]);

  useEffect(() => {
    if (betterStackCredentials?.success && betterStackCredentials?.credentials) {
      setIntegrationForms(prev => ({
        ...prev,
        better_stack: {
          source_token: betterStackCredentials.credentials.sourceToken || '',
          ingesting_host: betterStackCredentials.credentials.ingestingHost || ''
        }
      }));
    }
  }, [betterStackCredentials]);

  useEffect(() => {
    if (bigdatacorpCredentials?.success && bigdatacorpCredentials?.credentials) {
      setIntegrationForms(prev => ({
        ...prev,
        bigdatacorp: {
          token_id: bigdatacorpCredentials.credentials.tokenId || '',
          chave_token: bigdatacorpCredentials.credentials.chaveToken || ''
        }
      }));
    }
  }, [bigdatacorpCredentials]);

  useEffect(() => {
    if (supabaseMasterCredentials?.success && supabaseMasterCredentials?.credentials) {
      setIntegrationForms(prev => ({
        ...prev,
        supabase_master: {
          url: supabaseMasterCredentials.credentials.url || '',
          service_role_key: supabaseMasterCredentials.credentials.serviceRoleKey || ''
        }
      }));
    }
  }, [supabaseMasterCredentials]);

  useEffect(() => {
    if (hms100msCredentials?.credentials) {
      setIntegrationForms(prev => ({
        ...prev,
        hms100ms: {
          app_access_key: hms100msCredentials.credentials.appAccessKey || '',
          app_secret: hms100msCredentials.credentials.appSecret || '',
          management_token: hms100msCredentials.credentials.managementToken || '',
          template_id: hms100msCredentials.credentials.templateId || '',
          api_base_url: hms100msCredentials.credentials.apiBaseUrl || 'https://api.100ms.live/v2'
        }
      }));
    }
  }, [hms100msCredentials]);

  const handleSaveIntegration = (integrationType: string) => {
    const credentials = integrationForms[integrationType as keyof typeof integrationForms];
    
    if (integrationType === 'supabase') {
      if (!credentials.url || !credentials.anon_key) {
        toast({
          title: "Erro",
          description: "Por favor, preencha todos os campos do Supabase",
          variant: "destructive",
        });
        return;
      }
      saveSupabaseMutation.mutate(credentials);
    } else if (integrationType === 'google_calendar') {
      if (!credentials.client_id || !credentials.client_secret) {
        toast({
          title: "Erro",
          description: "Por favor, preencha todos os campos do Google Calendar",
          variant: "destructive",
        });
        return;
      }
      saveGoogleCalendarMutation.mutate(credentials);
    } else if (integrationType === 'pluggy') {
      if (!credentials.client_id || !credentials.client_secret) {
        toast({
          title: "Erro",
          description: "Por favor, preencha todos os campos do Pluggy",
          variant: "destructive",
        });
        return;
      }
      savePluggyMutation.mutate(credentials);
    } else if (integrationType === 'n8n') {
      if (!credentials.webhook_url) {
        toast({
          title: "Erro",
          description: "Por favor, preencha a URL do webhook N8N",
          variant: "destructive",
        });
        return;
      }
      saveN8nMutation.mutate(credentials);
    } else if (integrationType === 'evolution_api') {
      if (!credentials.api_url || !credentials.api_key) {
        toast({
          title: "Erro",
          description: "Por favor, preencha a URL da API e a API Key do Evolution API",
          variant: "destructive",
        });
        return;
      }
      saveEvolutionApiMutation.mutate(credentials);
    } else if (integrationType === 'redis') {
      if (!credentials.redis_url) {
        toast({ title: "Erro", description: "Por favor, preencha a URL do Redis", variant: "destructive" });
        return;
      }
      saveRedisMutation.mutate(credentials);
    } else if (integrationType === 'sentry') {
      if (!credentials.dsn) {
        toast({ title: "Erro", description: "Por favor, preencha o DSN do Sentry", variant: "destructive" });
        return;
      }
      saveSentryMutation.mutate(credentials);
    } else if (integrationType === 'cloudflare') {
      if (!credentials.zone_id || !credentials.api_token) {
        toast({ title: "Erro", description: "Por favor, preencha todos os campos do Cloudflare", variant: "destructive" });
        return;
      }
      saveCloudflareMutation.mutate(credentials);
    } else if (integrationType === 'better_stack') {
      if (!credentials.source_token) {
        toast({ title: "Erro", description: "Por favor, preencha o token do Better Stack", variant: "destructive" });
        return;
      }
      saveBetterStackMutation.mutate(credentials);
    } else if (integrationType === 'bigdatacorp') {
      if (!credentials.token_id || !credentials.chave_token) {
        toast({ title: "Erro", description: "Por favor, preencha TOKEN_ID e CHAVE_TOKEN", variant: "destructive" });
        return;
      }
      saveBigdatacorpMutation.mutate(credentials);
    } else if (integrationType === 'supabase_master') {
      if (!credentials.url || !credentials.service_role_key) {
        toast({ title: "Erro", description: "Por favor, preencha URL e Service Role Key do Supabase Master", variant: "destructive" });
        return;
      }
      saveSupabaseMasterMutation.mutate(credentials);
    } else if (integrationType === 'cache') {
      saveCacheMutation.mutate(credentials);
    } else if (integrationType === 'optimizer') {
      saveOptimizerMutation.mutate(credentials);
    } else if (integrationType === 'hms100ms') {
      if (!credentials.app_access_key || !credentials.app_secret) {
        toast({ title: "Erro", description: "App Access Key e App Secret são obrigatórios", variant: "destructive" });
        return;
      }
      saveHms100msMutation.mutate(credentials);
    } else if (integrationType === 'monitoring') {
      saveMonitoringMutation.mutate(credentials);
    }
  };

  const handleTestConnection = async (integrationType: string) => {
    try {
      // ✅ CORREÇÃO: Enviar as credenciais necessárias para cada tipo de integração
      let testPayload = {};
      
      if (integrationType === 'supabase') {
        testPayload = {
          supabaseUrl: integrationForms.supabase.url,
          supabaseAnonKey: integrationForms.supabase.anon_key,
        };
      } else if (integrationType === 'google_calendar') {
        testPayload = {
          clientId: integrationForms.google_calendar.client_id,
          clientSecret: integrationForms.google_calendar.client_secret,
        };
      } else if (integrationType === 'pluggy') {
        testPayload = {
          clientId: integrationForms.pluggy.client_id,
          clientSecret: integrationForms.pluggy.client_secret,
        };
      } else if (integrationType === 'evolution_api') {
        testPayload = {
          apiUrl: integrationForms.evolution_api.api_url,
          apiKey: integrationForms.evolution_api.api_key,
          instance: integrationForms.evolution_api.instance || 'nexus-whatsapp',
        };
        console.log('🧪 [TEST] Evolution API payload:', {
          apiUrl: integrationForms.evolution_api.api_url ? '✅ Presente' : '❌ Vazio',
          apiKey: integrationForms.evolution_api.api_key ? '✅ Presente' : '❌ Vazio',
          instance: integrationForms.evolution_api.instance || 'nexus-whatsapp'
        });
      } else if (integrationType === 'bigdatacorp') {
        const response = await apiRequest('POST', '/api/config/bigdatacorp/test', {
          tokenId: integrationForms.bigdatacorp.token_id,
          chaveToken: integrationForms.bigdatacorp.chave_token,
        });
        toast({
          title: "Sucesso!",
          description: response.message || "Conexão com BigDataCorp testada com sucesso!",
        });
        return;
      } else if (integrationType === 'supabase_master') {
        const response = await apiRequest('POST', '/api/config/supabase-master/test', {
          supabaseMasterUrl: integrationForms.supabase_master.url,
          supabaseMasterServiceRoleKey: integrationForms.supabase_master.service_role_key,
        });
        toast({
          title: "Sucesso!",
          description: response.message || "Conexão com Supabase Master testada com sucesso!",
        });
        return;
      }
      
      console.log(`🚀 [TEST] Enviando teste para ${integrationType}:`, testPayload);
      const response = await apiRequest('POST', `/api/credentials/test/${integrationType}`, testPayload);
      toast({
        title: "Sucesso!",
        description: response.message || "Conexão testada com sucesso!",
      });
    } catch (error: any) {
      console.error(`❌ [TEST] Erro ao testar ${integrationType}:`, error);
      toast({
        title: "Erro no teste",
        description: error.message || "Falha ao testar conexão",
        variant: "destructive",
      });
    }
  };

  const handleQRCodeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo de imagem (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    setUploadingQRCode(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        try {
          const response = await fetch('/api/whatsapp/qrcode', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              qrCodeData: base64String,
              clientId: client?.id || '1',
            }),
          });

          if (!response.ok) {
            throw new Error('Falha ao salvar QR Code');
          }

          const data = await response.json();
          setWhatsappQRCode(base64String);
          refetchQRCode();

          toast({
            title: "Sucesso!",
            description: "QR Code do WhatsApp atualizado com sucesso!",
          });
        } catch (error: any) {
          toast({
            title: "Erro",
            description: error.message || "Falha ao salvar QR Code",
            variant: "destructive",
          });
        } finally {
          setUploadingQRCode(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      setUploadingQRCode(false);
      toast({
        title: "Erro",
        description: "Falha ao processar imagem",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Premium Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background/98 to-muted/3 pointer-events-none" />
      <div className="fixed top-0 left-1/3 w-96 h-96 bg-primary/4 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="fixed bottom-0 right-1/3 w-80 h-80 bg-secondary/3 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '3s' }} />

      <main className={cn(
        "relative z-10 container mx-auto pt-0 pb-4 sm:pb-6 lg:pb-8 space-y-6 lg:space-y-8 animate-fade-in",
        "px-4 md:px-6 lg:px-8",
        isMobile && "pb-24"
      )}>
        
        {/* Premium Header */}
        <div>
          <div className="flex items-start gap-4 lg:gap-3">
            <div className="p-3 lg:p-2.5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
              <Settings className="h-8 w-8 lg:h-6 lg:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl lg:text-2xl font-black text-foreground tracking-tight bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
                Configurações
              </h1>
              <p className="text-xl lg:text-sm text-muted-foreground/80 mt-2 lg:mt-1">
                Gerencie suas preferências e configurações do sistema
              </p>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-4">
          
          {/* Profile Section */}
          <CollapsibleSection
            openSections={openSections}
            setOpenSections={setOpenSections}
            id="profile"
            title="Perfil do Usuário"
            description="Informações da sua conta"
            icon={User}
          >
            <div className="space-y-4">
              <PremiumInput
                label="Nome"
                value={profileForm.name}
                onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                placeholder="Seu nome"
                data-testid="input-name"
              />
              <PremiumInput
                label="Email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                placeholder="seu@email.com"
                data-testid="input-email"
              />
              <div className="flex items-center gap-4">
                <Label>Função:</Label>
                <Badge variant="secondary" data-testid="badge-role">
                  {user?.role === 'admin' ? 'Administrador' : 'Visualizador'}
                </Badge>
              </div>
              <PremiumButton 
                onClick={handleSaveProfile} 
                data-testid="button-save-profile"
                variant="primary"
              >
                Salvar Alterações
              </PremiumButton>
            </div>
          </CollapsibleSection>

          {/* Company Section */}
          <CollapsibleSection
            openSections={openSections}
            setOpenSections={setOpenSections}
            id="company"
            title="Informações da Empresa"
            description="Detalhes da sua organização"
            icon={Shield}
          >
            <div className="space-y-4">
              <PremiumInput
                label="Nome da Empresa"
                value={companyForm.name}
                onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})}
                placeholder="Nome da sua empresa"
                data-testid="input-company-name"
              />
              <PremiumInput
                label="Email da Empresa"
                type="email"
                value={companyForm.email}
                onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})}
                placeholder="contato@empresa.com"
                data-testid="input-company-email"
              />
              <PremiumButton 
                onClick={handleSaveCompany} 
                data-testid="button-save-company"
                variant="primary"
              >
                Salvar Alterações
              </PremiumButton>
            </div>
          </CollapsibleSection>

          {/* System Section */}
          <CollapsibleSection
            openSections={openSections}
            setOpenSections={setOpenSections}
            id="system"
            title="Preferências do Sistema"
            description="Tema e configurações de interface"
            icon={Settings}
          >
            <div className="space-y-6">
              {/* Tema da Interface */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Tema da Interface</Label>
                <div className="grid grid-cols-2 gap-3">
                  <PremiumButton
                    variant={theme === 'light' ? 'primary' : 'secondary'}
                    onClick={() => setTheme('light')}
                    size="lg"
                  >
                    <Sun className="w-5 h-5 mr-2" />
                    Claro
                  </PremiumButton>
                  <PremiumButton
                    variant={theme === 'dark' ? 'primary' : 'secondary'}
                    onClick={() => setTheme('dark')}
                    size="lg"
                  >
                    <Moon className="w-5 h-5 mr-2" />
                    Escuro
                  </PremiumButton>
                </div>
              </div>

              {/* Esquema de Cores */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Esquema de Cores do Dashboard</Label>
                <p className="text-sm text-muted-foreground">
                  Escolha a paleta de cores principal da interface
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Dourado (Padrão) */}
                  <button
                    onClick={() => {
                      setSelectedColorScheme('golden');
                      setColorScheme('golden');
                      toast({
                        title: "Cores atualizadas!",
                        description: "Esquema de cores Dourado aplicado",
                      });
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105",
                      selectedColorScheme === 'golden' 
                        ? "border-[hsl(45,100%,85%)] bg-[hsl(45,100%,85%)]/10" 
                        : "border-border hover:border-[hsl(45,100%,85%)]/50"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(45,100%,75%)] to-[hsl(45,100%,85%)] border-4 border-background shadow-lg" />
                    <span className="text-sm font-medium">Dourado</span>
                  </button>

                  {/* Azul */}
                  <button
                    onClick={() => {
                      setSelectedColorScheme('blue');
                      setColorScheme('blue');
                      toast({
                        title: "Cores atualizadas!",
                        description: "Esquema de cores Azul aplicado",
                      });
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105",
                      selectedColorScheme === 'blue' 
                        ? "border-[hsl(217,91%,60%)] bg-[hsl(217,91%,60%)]/10" 
                        : "border-border hover:border-[hsl(217,91%,60%)]/50"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(217,91%,50%)] to-[hsl(217,91%,70%)] border-4 border-background shadow-lg" />
                    <span className="text-sm font-medium">Azul</span>
                  </button>

                  {/* Roxo */}
                  <button
                    onClick={() => {
                      setSelectedColorScheme('purple');
                      setColorScheme('purple');
                      toast({
                        title: "Cores atualizadas!",
                        description: "Esquema de cores Roxo aplicado",
                      });
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105",
                      selectedColorScheme === 'purple' 
                        ? "border-[hsl(271,91%,65%)] bg-[hsl(271,91%,65%)]/10" 
                        : "border-border hover:border-[hsl(271,91%,65%)]/50"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(271,91%,55%)] to-[hsl(271,91%,75%)] border-4 border-background shadow-lg" />
                    <span className="text-sm font-medium">Roxo</span>
                  </button>

                  {/* Verde */}
                  <button
                    onClick={() => {
                      setSelectedColorScheme('green');
                      setColorScheme('green');
                      toast({
                        title: "Cores atualizadas!",
                        description: "Esquema de cores Verde aplicado",
                      });
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105",
                      selectedColorScheme === 'green' 
                        ? "border-[hsl(142,71%,45%)] bg-[hsl(142,71%,45%)]/10" 
                        : "border-border hover:border-[hsl(142,71%,45%)]/50"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(142,71%,35%)] to-[hsl(142,71%,55%)] border-4 border-background shadow-lg" />
                    <span className="text-sm font-medium">Verde</span>
                  </button>

                  {/* Rosa */}
                  <button
                    onClick={() => {
                      setSelectedColorScheme('pink');
                      setColorScheme('pink');
                      toast({
                        title: "Cores atualizadas!",
                        description: "Esquema de cores Rosa aplicado",
                      });
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105",
                      selectedColorScheme === 'pink' 
                        ? "border-[hsl(330,81%,60%)] bg-[hsl(330,81%,60%)]/10" 
                        : "border-border hover:border-[hsl(330,81%,60%)]/50"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(330,81%,50%)] to-[hsl(330,81%,70%)] border-4 border-background shadow-lg" />
                    <span className="text-sm font-medium">Rosa</span>
                  </button>

                  {/* Laranja */}
                  <button
                    onClick={() => {
                      setSelectedColorScheme('orange');
                      setColorScheme('orange');
                      toast({
                        title: "Cores atualizadas!",
                        description: "Esquema de cores Laranja aplicado",
                      });
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105",
                      selectedColorScheme === 'orange' 
                        ? "border-[hsl(25,95%,53%)] bg-[hsl(25,95%,53%)]/10" 
                        : "border-border hover:border-[hsl(25,95%,53%)]/50"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(25,95%,43%)] to-[hsl(25,95%,63%)] border-4 border-background shadow-lg" />
                    <span className="text-sm font-medium">Laranja</span>
                  </button>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Notifications Section */}
          <CollapsibleSection
            openSections={openSections}
            setOpenSections={setOpenSections}
            id="notifications"
            title="Notificações"
            description="Configure como você recebe alertas"
            icon={Bell}
          >
            <div className="space-y-4">
              <PremiumSwitch
                label="Notificações Push"
                description="Receba notificações no navegador"
                checked={notifications.push}
                onChange={(e) => handleToggleNotification('push', e.target.checked)}
              />
              <PremiumSwitch
                label="Notificações por Email"
                description="Receba atualizações por email"
                checked={notifications.email}
                onChange={(e) => handleToggleNotification('email', e.target.checked)}
              />
              <PremiumSwitch
                label="Notificações via WhatsApp"
                description="Receba alertas importantes via WhatsApp"
                checked={notifications.whatsapp}
                onChange={(e) => handleToggleNotification('whatsapp', e.target.checked)}
              />
            </div>
          </CollapsibleSection>

          {/* WhatsApp/Evolution API Section */}
          <CollapsibleSection
            openSections={openSections}
            setOpenSections={setOpenSections}
            id="evolutionApi"
            title="Evolution API (WhatsApp)"
            description="Para conectar, escaneie o código QR com seu WhatsApp Web"
            icon={MessageSquare}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                {evolutionCredentials?.success && (
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                    Configurado
                  </Badge>
                )}
              </div>
              
              <PremiumInput
                label="URL da API"
                value={integrationForms.evolution_api.api_url}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  evolution_api: { ...integrationForms.evolution_api, api_url: e.target.value }
                })}
                placeholder="https://api.evolutionapi.com"
                data-testid="input-evolution-url"
              />
              
              <PremiumInput
                label="API Key"
                type="password"
                value={integrationForms.evolution_api.api_key}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  evolution_api: { ...integrationForms.evolution_api, api_key: e.target.value }
                })}
                placeholder="Sua API Key"
                data-testid="input-evolution-api-key"
              />
              
              <PremiumInput
                label="Nome da Instância"
                value={integrationForms.evolution_api.instance}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  evolution_api: { ...integrationForms.evolution_api, instance: e.target.value }
                })}
                placeholder="nexus-whatsapp"
                data-testid="input-evolution-instance"
              />

              {whatsappQRCode && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">QR Code</Label>
                  <p className="text-sm text-muted-foreground">
                    Escaneie o código QR com seu WhatsApp Web
                  </p>
                  <PremiumCard variant="outlined" padding="md">
                    <img 
                      src={whatsappQRCode} 
                      alt="WhatsApp QR Code" 
                      className="w-full max-w-xs mx-auto rounded-lg"
                    />
                  </PremiumCard>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-base font-semibold">Upload QR Code</Label>
                <input
                  id="qr-code-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleQRCodeUpload}
                  disabled={uploadingQRCode}
                  className="hidden"
                />
                <PremiumButton
                  variant="secondary"
                  onClick={() => document.getElementById('qr-code-upload')?.click()}
                  disabled={uploadingQRCode}
                  className="w-full sm:w-auto"
                >
                  {uploadingQRCode ? 'Enviando...' : 'Escolher arquivo'}
                </PremiumButton>
              </div>

              <div className="flex gap-3">
                <PremiumButton 
                  onClick={() => handleSaveIntegration('evolution_api')}
                  isLoading={saveEvolutionApiMutation.isPending}
                  data-testid="button-save-evolution"
                  variant="primary"
                >
                  Salvar Configuração
                </PremiumButton>
                <PremiumButton 
                  variant="secondary"
                  onClick={() => handleTestConnection('evolution_api')}
                  disabled={!evolutionCredentials?.success}
                  data-testid="button-test-evolution"
                >
                  Testar Conexão
                </PremiumButton>
              </div>
            </div>
          </CollapsibleSection>

          {/* Supabase Section */}
          <CollapsibleSection
            openSections={openSections}
            setOpenSections={setOpenSections}
            id="supabase"
            title="Supabase Database"
            description="Configuração do banco de dados"
            icon={Database}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                {credentialsStatus?.credentials?.supabase_configured && (
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                    Configurado
                  </Badge>
                )}
              </div>
              
              <PremiumInput
                label="URL do Projeto Supabase"
                value={integrationForms.supabase.url}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  supabase: { ...integrationForms.supabase, url: e.target.value }
                })}
                placeholder="https://xxxxxxxxxxx.supabase.co"
                data-testid="input-supabase-url"
              />
              
              <PremiumInput
                label="Chave Anônima (anon/public)"
                type="password"
                value={integrationForms.supabase.anon_key}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  supabase: { ...integrationForms.supabase, anon_key: e.target.value }
                })}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                data-testid="input-supabase-anon-key"
              />
              
              <PremiumInput
                label="Bucket de Armazenamento"
                value={integrationForms.supabase.bucket}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  supabase: { ...integrationForms.supabase, bucket: e.target.value }
                })}
                placeholder="receipts"
                data-testid="input-supabase-bucket"
              />

              <div className="flex gap-3">
                <PremiumButton 
                  onClick={() => handleSaveIntegration('supabase')}
                  isLoading={saveSupabaseMutation.isPending}
                  data-testid="button-save-supabase"
                  variant="primary"
                >
                  Salvar Configuração
                </PremiumButton>
                <PremiumButton 
                  variant="secondary"
                  onClick={() => handleTestConnection('supabase')}
                  disabled={!credentialsStatus?.credentials?.supabase_configured}
                  data-testid="button-test-supabase"
                >
                  Testar Conexão
                </PremiumButton>
              </div>
            </div>
          </CollapsibleSection>

          {/* Google Calendar Section */}
          <CollapsibleSection
            openSections={openSections}
            setOpenSections={setOpenSections}
            id="googleCalendar"
            title="Google Calendar"
            description="Sincronização de agenda"
            icon={Calendar}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                {credentialsStatus?.credentials?.google_calendar && (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                    Configurado
                  </Badge>
                )}
              </div>
              
              <PremiumInput
                label="Client ID"
                value={integrationForms.google_calendar.client_id}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  google_calendar: { ...integrationForms.google_calendar, client_id: e.target.value }
                })}
                placeholder="123456789-abcdef.apps.googleusercontent.com"
                data-testid="input-google-client-id"
              />
              
              <PremiumInput
                label="Client Secret"
                type="password"
                value={integrationForms.google_calendar.client_secret}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  google_calendar: { ...integrationForms.google_calendar, client_secret: e.target.value }
                })}
                placeholder="GOCSPX-example-secret-key"
                data-testid="input-google-client-secret"
              />
              
              <PremiumInput
                label="Refresh Token"
                type="password"
                value={integrationForms.google_calendar.refresh_token}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  google_calendar: { ...integrationForms.google_calendar, refresh_token: e.target.value }
                })}
                placeholder="1//04..."
                data-testid="input-google-refresh-token"
              />

              <div className="flex gap-3">
                <PremiumButton 
                  onClick={() => handleSaveIntegration('google_calendar')}
                  isLoading={saveGoogleCalendarMutation.isPending}
                  data-testid="button-save-google-calendar"
                  variant="primary"
                >
                  Salvar Configuração
                </PremiumButton>
                <PremiumButton 
                  variant="secondary"
                  onClick={() => handleTestConnection('google_calendar')}
                  disabled={!credentialsStatus?.credentials?.google_calendar}
                  data-testid="button-test-google-calendar"
                >
                  Testar Conexão
                </PremiumButton>
              </div>
            </div>
          </CollapsibleSection>

          {/* Pluggy Section */}
          <CollapsibleSection
            openSections={openSections}
            setOpenSections={setOpenSections}
            id="pluggy"
            title="Conexão Bancária (Pluggy)"
            description="Integração bancária para transações"
            icon={CreditCard}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                {pluggyCredentials?.configured && (
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                    Configurado
                  </Badge>
                )}
              </div>
              
              <PremiumInput
                label="ID do Cliente"
                value={integrationForms.pluggy.client_id}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  pluggy: { ...integrationForms.pluggy, client_id: e.target.value }
                })}
                placeholder="Seu Client ID"
                data-testid="input-pluggy-client-id"
              />
              
              <PremiumInput
                label="Segredo do Cliente"
                type="password"
                value={integrationForms.pluggy.client_secret}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  pluggy: { ...integrationForms.pluggy, client_secret: e.target.value }
                })}
                placeholder="Seu Client Secret"
                data-testid="input-pluggy-client-secret"
              />

              <div className="flex gap-3">
                <PremiumButton 
                  onClick={() => handleSaveIntegration('pluggy')}
                  isLoading={savePluggyMutation.isPending}
                  data-testid="button-save-pluggy"
                  variant="primary"
                >
                  Salvar Configuração
                </PremiumButton>
                <PremiumButton 
                  variant="secondary"
                  onClick={() => handleTestConnection('pluggy')}
                  disabled={!pluggyCredentials?.configured}
                  data-testid="button-test-pluggy"
                >
                  Testar Conexão
                </PremiumButton>
              </div>
            </div>
          </CollapsibleSection>

          {/* N8N Section */}
          <CollapsibleSection
            openSections={openSections}
            setOpenSections={setOpenSections}
            id="n8n"
            title="Processamento de Documentos (N8N)"
            description="Análise automática com IA"
            icon={Webhook}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                {n8nCredentials?.configured && (
                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                    Configurado
                  </Badge>
                )}
              </div>
              
              <PremiumInput
                label="URL do Webhook"
                value={integrationForms.n8n.webhook_url}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  n8n: { ...integrationForms.n8n, webhook_url: e.target.value }
                })}
                placeholder="https://seu-webhook.com/..."
                data-testid="input-n8n-webhook-url"
              />

              <div className="flex gap-3">
                <PremiumButton 
                  onClick={() => handleSaveIntegration('n8n')}
                  isLoading={saveN8nMutation.isPending}
                  data-testid="button-save-n8n"
                  variant="primary"
                >
                  Salvar Configuração
                </PremiumButton>
                <PremiumButton 
                  variant="secondary"
                  onClick={() => handleTestConnection('n8n')}
                  disabled={!n8nCredentials?.configured}
                  data-testid="button-test-n8n"
                >
                  Testar Conexão
                </PremiumButton>
              </div>
            </div>
          </CollapsibleSection>

          {/* Redis Section */}
          <CollapsibleSection
            openSections={openSections}
            setOpenSections={setOpenSections}
            id="redis"
            title="Redis Cache"
            description="Cache distribuído para performance"
            icon={Server}
          >
            <div className="space-y-4">
              <PremiumInput
                label="Redis URL"
                value={integrationForms.redis.redis_url}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  redis: { ...integrationForms.redis, redis_url: e.target.value }
                })}
                placeholder="redis://..."
              />
              
              <PremiumInput
                label="Redis Token (opcional)"
                type="password"
                value={integrationForms.redis.redis_token}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  redis: { ...integrationForms.redis, redis_token: e.target.value }
                })}
                placeholder="Token de autenticação"
              />

              <div className="flex gap-3">
                <PremiumButton 
                  onClick={() => handleSaveIntegration('redis')}
                  isLoading={saveRedisMutation.isPending}
                  variant="primary"
                >
                  Salvar Configuração
                </PremiumButton>
                <PremiumButton 
                  variant="secondary"
                  onClick={() => handleTestConnection('redis')}
                  disabled={!redisCredentials?.success}
                >
                  Testar Conexão
                </PremiumButton>
              </div>
            </div>
          </CollapsibleSection>

          {/* Sentry Section */}
          <CollapsibleSection
            openSections={openSections}
            setOpenSections={setOpenSections}
            id="sentry"
            title="Sentry Monitoring"
            description="Monitoramento de erros e performance"
            icon={Activity}
          >
            <div className="space-y-4">
              <PremiumInput
                label="DSN"
                type="password"
                value={integrationForms.sentry.dsn}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  sentry: { ...integrationForms.sentry, dsn: e.target.value }
                })}
                placeholder="https://...@sentry.io/..."
              />
              
              <PremiumInput
                label="Environment"
                value={integrationForms.sentry.environment}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  sentry: { ...integrationForms.sentry, environment: e.target.value }
                })}
                placeholder="production"
              />

              <div className="flex gap-3">
                <PremiumButton 
                  onClick={() => handleSaveIntegration('sentry')}
                  isLoading={saveSentryMutation.isPending}
                  variant="primary"
                >
                  Salvar Configuração
                </PremiumButton>
                <PremiumButton 
                  variant="secondary"
                  onClick={() => handleTestConnection('sentry')}
                  disabled={!sentryCredentials?.success}
                >
                  Testar Conexão
                </PremiumButton>
              </div>
            </div>
          </CollapsibleSection>

          {/* Cloudflare Section */}
          <CollapsibleSection
            openSections={openSections}
            setOpenSections={setOpenSections}
            id="cloudflare"
            title="Cloudflare CDN"
            description="CDN e proteção DDoS"
            icon={Cloud}
          >
            <div className="space-y-4">
              <PremiumInput
                label="Zone ID"
                value={integrationForms.cloudflare.zone_id}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  cloudflare: { ...integrationForms.cloudflare, zone_id: e.target.value }
                })}
                placeholder="Zone ID"
              />
              
              <PremiumInput
                label="API Token"
                type="password"
                value={integrationForms.cloudflare.api_token}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  cloudflare: { ...integrationForms.cloudflare, api_token: e.target.value }
                })}
                placeholder="API Token"
              />

              <div className="flex gap-3">
                <PremiumButton 
                  onClick={() => handleSaveIntegration('cloudflare')}
                  isLoading={saveCloudflareMutation.isPending}
                  variant="primary"
                >
                  Salvar Configuração
                </PremiumButton>
                <PremiumButton 
                  variant="secondary"
                  onClick={() => handleTestConnection('cloudflare')}
                  disabled={!cloudflareCredentials?.success}
                >
                  Testar Conexão
                </PremiumButton>
              </div>
            </div>
          </CollapsibleSection>

          {/* Better Stack Section */}
          <CollapsibleSection
            openSections={openSections}
            setOpenSections={setOpenSections}
            id="betterStack"
            title="Better Stack"
            description="Logging centralizado e uptime"
            icon={BarChart3}
          >
            <div className="space-y-4">
              <PremiumInput
                label="Source Token"
                type="password"
                value={integrationForms.better_stack.source_token}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  better_stack: { ...integrationForms.better_stack, source_token: e.target.value }
                })}
                placeholder="Source Token (ex: Gv2bG4...)"
              />
              
              <PremiumInput
                label="Ingesting Host (Opcional)"
                value={integrationForms.better_stack.ingesting_host}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  better_stack: { ...integrationForms.better_stack, ingesting_host: e.target.value }
                })}
                placeholder="Ex: s1553180.eu-nbg-2.betterstackdata.com"
              />

              <div className="flex gap-3">
                <PremiumButton 
                  onClick={() => handleSaveIntegration('better_stack')}
                  isLoading={saveBetterStackMutation.isPending}
                  variant="primary"
                >
                  Salvar Configuração
                </PremiumButton>
                <PremiumButton 
                  variant="secondary"
                  onClick={() => handleTestConnection('better_stack')}
                  disabled={!betterStackCredentials?.success}
                >
                  Testar Conexão
                </PremiumButton>
              </div>
            </div>
          </CollapsibleSection>

          {/* BigDataCorp Section */}
          <CollapsibleSection
            openSections={openSections}
            setOpenSections={setOpenSections}
            id="bigdatacorp"
            title="Consultar CPF (BigDataCorp)"
            description="Consulta de processos judiciais e dados cadastrais"
            icon={Search}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                {bigdatacorpStatus?.configured && (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                    Configurado
                  </Badge>
                )}
              </div>
              
              <PremiumInput
                label="TOKEN_ID"
                type="password"
                value={integrationForms.bigdatacorp.token_id}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  bigdatacorp: { ...integrationForms.bigdatacorp, token_id: e.target.value }
                })}
                placeholder="ID do Token BigDataCorp"
              />
              
              <PremiumInput
                label="CHAVE_TOKEN"
                type="password"
                value={integrationForms.bigdatacorp.chave_token}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  bigdatacorp: { ...integrationForms.bigdatacorp, chave_token: e.target.value }
                })}
                placeholder="Chave do Token BigDataCorp"
              />
              
              <div className="flex gap-3">
                <PremiumButton 
                  onClick={() => handleSaveIntegration('bigdatacorp')}
                  isLoading={saveBigdatacorpMutation.isPending}
                  variant="primary"
                >
                  Salvar Configuração
                </PremiumButton>
                <PremiumButton 
                  variant="secondary"
                  onClick={() => handleTestConnection('bigdatacorp')}
                  disabled={!bigdatacorpStatus?.configured}
                >
                  Testar Conexão
                </PremiumButton>
              </div>
            </div>
          </CollapsibleSection>

          {/* Supabase Master Section */}
          <CollapsibleSection
            openSections={openSections}
            setOpenSections={setOpenSections}
            id="supabaseMaster"
            title="Supabase Master"
            description="Cache de consultas CPF - Histórico centralizado"
            icon={Database}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                {supabaseMasterStatus?.configured && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    Configurado
                  </Badge>
                )}
              </div>
              
              <PremiumInput
                label="URL do Supabase Master"
                value={integrationForms.supabase_master.url}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  supabase_master: { ...integrationForms.supabase_master, url: e.target.value }
                })}
                placeholder="https://xxx.supabase.co"
              />
              
              <PremiumInput
                label="Service Role Key"
                type="password"
                value={integrationForms.supabase_master.service_role_key}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  supabase_master: { ...integrationForms.supabase_master, service_role_key: e.target.value }
                })}
                placeholder="Service Role Key do Supabase Master"
              />

              <div className="flex gap-3">
                <PremiumButton 
                  onClick={() => handleSaveIntegration('supabase_master')}
                  isLoading={saveSupabaseMasterMutation.isPending}
                  variant="primary"
                >
                  Salvar Configuração
                </PremiumButton>
                <PremiumButton 
                  variant="secondary"
                  onClick={() => handleTestConnection('supabase_master')}
                  disabled={!supabaseMasterStatus?.configured}
                >
                  Testar Conexão
                </PremiumButton>
              </div>
            </div>
          </CollapsibleSection>

          {/* Cache Section */}
          <CollapsibleSection
            openSections={openSections}
            setOpenSections={setOpenSections}
            id="cache"
            title="Cache Strategies"
            description="Configurações de cache para otimização"
            icon={Zap}
          >
            <div className="space-y-6">
              <PremiumSwitch
                label="Progressive TTL Enabled"
                description="Habilitar TTL progressivo baseado em acesso"
                checked={integrationForms.cache.progressive_ttl_enabled === 'true'}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  cache: { ...integrationForms.cache, progressive_ttl_enabled: String(e.target.checked) }
                })}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PremiumInput
                  label="Access Threshold High"
                  type="number"
                  value={integrationForms.cache.access_threshold_high}
                  onChange={(e) => setIntegrationForms({
                    ...integrationForms,
                    cache: { ...integrationForms.cache, access_threshold_high: e.target.value }
                  })}
                  placeholder="100"
                />
                <PremiumInput
                  label="Access Threshold Medium"
                  type="number"
                  value={integrationForms.cache.access_threshold_medium}
                  onChange={(e) => setIntegrationForms({
                    ...integrationForms,
                    cache: { ...integrationForms.cache, access_threshold_medium: e.target.value }
                  })}
                  placeholder="50"
                />
                <PremiumInput
                  label="Access Threshold Low"
                  type="number"
                  value={integrationForms.cache.access_threshold_low}
                  onChange={(e) => setIntegrationForms({
                    ...integrationForms,
                    cache: { ...integrationForms.cache, access_threshold_low: e.target.value }
                  })}
                  placeholder="10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <PremiumInput
                  label="TTL High (s)"
                  type="number"
                  value={integrationForms.cache.ttl_high}
                  onChange={(e) => setIntegrationForms({
                    ...integrationForms,
                    cache: { ...integrationForms.cache, ttl_high: e.target.value }
                  })}
                  placeholder="3600"
                />
                <PremiumInput
                  label="TTL Medium (s)"
                  type="number"
                  value={integrationForms.cache.ttl_medium}
                  onChange={(e) => setIntegrationForms({
                    ...integrationForms,
                    cache: { ...integrationForms.cache, ttl_medium: e.target.value }
                  })}
                  placeholder="1800"
                />
                <PremiumInput
                  label="TTL Low (s)"
                  type="number"
                  value={integrationForms.cache.ttl_low}
                  onChange={(e) => setIntegrationForms({
                    ...integrationForms,
                    cache: { ...integrationForms.cache, ttl_low: e.target.value }
                  })}
                  placeholder="900"
                />
                <PremiumInput
                  label="TTL Default (s)"
                  type="number"
                  value={integrationForms.cache.ttl_default}
                  onChange={(e) => setIntegrationForms({
                    ...integrationForms,
                    cache: { ...integrationForms.cache, ttl_default: e.target.value }
                  })}
                  placeholder="300"
                />
              </div>

              <PremiumSwitch
                label="Batch Invalidation Enabled"
                description="Agrupar invalidações de cache"
                checked={integrationForms.cache.batch_invalidation_enabled === 'true'}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  cache: { ...integrationForms.cache, batch_invalidation_enabled: String(e.target.checked) }
                })}
              />

              <PremiumSwitch
                label="Cache Warming Enabled"
                description="Pre-carregar cache frequentemente acessado"
                checked={integrationForms.cache.cache_warming_enabled === 'true'}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  cache: { ...integrationForms.cache, cache_warming_enabled: String(e.target.checked) }
                })}
              />

              <PremiumButton 
                onClick={() => handleSaveIntegration('cache')}
                isLoading={saveCacheMutation.isPending}
                variant="primary"
              >
                Salvar Configuração
              </PremiumButton>
            </div>
          </CollapsibleSection>

          {/* Optimizer Section */}
          <CollapsibleSection
            openSections={openSections}
            setOpenSections={setOpenSections}
            id="optimizer"
            title="Query Optimizer"
            description="Otimizações de consultas ao banco"
            icon={Code}
          >
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Default Field Set</Label>
                <Select
                  value={integrationForms.optimizer.default_field_set}
                  onValueChange={(value) => setIntegrationForms({
                    ...integrationForms,
                    optimizer: { ...integrationForms.optimizer, default_field_set: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PremiumInput
                  label="Default Page Size"
                  type="number"
                  value={integrationForms.optimizer.default_page_size}
                  onChange={(e) => setIntegrationForms({
                    ...integrationForms,
                    optimizer: { ...integrationForms.optimizer, default_page_size: e.target.value }
                  })}
                  placeholder="20"
                />
                <PremiumInput
                  label="Max Page Size"
                  type="number"
                  value={integrationForms.optimizer.max_page_size}
                  onChange={(e) => setIntegrationForms({
                    ...integrationForms,
                    optimizer: { ...integrationForms.optimizer, max_page_size: e.target.value }
                  })}
                  placeholder="100"
                />
              </div>

              <PremiumSwitch
                label="Query Caching Enabled"
                description="Cachear resultados de queries"
                checked={integrationForms.optimizer.query_caching_enabled === 'true'}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  optimizer: { ...integrationForms.optimizer, query_caching_enabled: String(e.target.checked) }
                })}
              />

              <PremiumButton 
                onClick={() => handleSaveIntegration('optimizer')}
                isLoading={saveOptimizerMutation.isPending}
                variant="primary"
              >
                Salvar Configuração
              </PremiumButton>
            </div>
          </CollapsibleSection>

          {/* 100ms Video Conference Section */}
          <CollapsibleSection
            openSections={openSections}
            setOpenSections={setOpenSections}
            id="hms100ms"
            title="Integração com Reunião (100ms)"
            description="Configure credenciais para videoconferência em tempo real"
            icon={Video}
          >
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  ℹ️ <strong>Como obter as credenciais:</strong>
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1 ml-4 list-disc">
                  <li>Visite <a href="https://dashboard.100ms.live" target="_blank" rel="noopener noreferrer" className="underline font-semibold">dashboard.100ms.live</a></li>
                  <li>Vá para Configurações → Credenciais</li>
                  <li>Copie App Access Key e App Secret</li>
                </ul>
              </div>

              <PremiumInput
                label="App Access Key"
                type="password"
                value={integrationForms.hms100ms?.app_access_key || ''}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  hms100ms: { ...integrationForms.hms100ms, app_access_key: e.target.value }
                })}
                placeholder="646..."
              />

              <PremiumInput
                label="App Secret"
                type="password"
                value={integrationForms.hms100ms?.app_secret || ''}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  hms100ms: { ...integrationForms.hms100ms, app_secret: e.target.value }
                })}
                placeholder="Sua chave secreta"
              />

              <PremiumInput
                label="Management Token"
                type="password"
                value={integrationForms.hms100ms?.management_token || ''}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  hms100ms: { ...integrationForms.hms100ms, management_token: e.target.value }
                })}
                placeholder="Token para gerenciar salas (opcional)"
              />

              <PremiumInput
                label="Template ID"
                value={integrationForms.hms100ms?.template_id || ''}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  hms100ms: { ...integrationForms.hms100ms, template_id: e.target.value }
                })}
                placeholder="645..."
              />

              <PremiumInput
                label="API Base URL"
                value={integrationForms.hms100ms?.api_base_url || ''}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  hms100ms: { ...integrationForms.hms100ms, api_base_url: e.target.value }
                })}
                placeholder="https://api.100ms.live/v2"
              />

              <div className="flex gap-2">
                <PremiumButton 
                  onClick={() => testHms100msMutation.mutate({
                    app_access_key: integrationForms.hms100ms?.app_access_key || '',
                    app_secret: integrationForms.hms100ms?.app_secret || '',
                  })}
                  variant="outline"
                  disabled={testHms100msMutation.isPending || !integrationForms.hms100ms?.app_access_key || !integrationForms.hms100ms?.app_secret}
                  isLoading={testHms100msMutation.isPending}
                  data-testid="button-test-100ms"
                >
                  {testHms100msMutation.isPending ? "Testando..." : "Testar Conexão 100ms"}
                </PremiumButton>
                <PremiumButton 
                  onClick={() => handleSaveIntegration('hms100ms')}
                  variant="primary"
                  data-testid="button-save-100ms"
                >
                  Salvar Configuração
                </PremiumButton>
              </div>
            </div>
          </CollapsibleSection>

          {/* Monitoring Section */}
          <CollapsibleSection
            openSections={openSections}
            setOpenSections={setOpenSections}
            id="monitoring"
            title="Monitoring & Alerts"
            description="Monitoramento de recursos e alertas"
            icon={Activity}
          >
            <div className="space-y-6">
              <PremiumSwitch
                label="Monitoring Enabled"
                description="Ativar monitoramento de recursos"
                checked={integrationForms.monitoring.monitoring_enabled === 'true'}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  monitoring: { ...integrationForms.monitoring, monitoring_enabled: String(e.target.checked) }
                })}
              />

              <PremiumInput
                label="Redis Commands Daily Limit"
                type="number"
                value={integrationForms.monitoring.redis_commands_daily}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  monitoring: { ...integrationForms.monitoring, redis_commands_daily: e.target.value }
                })}
                placeholder="1000"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PremiumInput
                  label="Redis Warning Threshold (%)"
                  type="number"
                  value={integrationForms.monitoring.redis_warning_threshold}
                  onChange={(e) => setIntegrationForms({
                    ...integrationForms,
                    monitoring: { ...integrationForms.monitoring, redis_warning_threshold: e.target.value }
                  })}
                  placeholder="70"
                />
                <PremiumInput
                  label="Redis Critical Threshold (%)"
                  type="number"
                  value={integrationForms.monitoring.redis_critical_threshold}
                  onChange={(e) => setIntegrationForms({
                    ...integrationForms,
                    monitoring: { ...integrationForms.monitoring, redis_critical_threshold: e.target.value }
                  })}
                  placeholder="90"
                />
              </div>

              <PremiumSwitch
                label="Alerts Enabled"
                description="Enviar alertas por email"
                checked={integrationForms.monitoring.alerts_enabled === 'true'}
                onChange={(e) => setIntegrationForms({
                  ...integrationForms,
                  monitoring: { ...integrationForms.monitoring, alerts_enabled: String(e.target.checked) }
                })}
              />

              {integrationForms.monitoring.alerts_enabled === 'true' && (
                <PremiumInput
                  label="Alert Email"
                  type="email"
                  value={integrationForms.monitoring.alert_email}
                  onChange={(e) => setIntegrationForms({
                    ...integrationForms,
                    monitoring: { ...integrationForms.monitoring, alert_email: e.target.value }
                  })}
                  placeholder="admin@empresa.com"
                />
              )}

              <PremiumButton 
                onClick={() => handleSaveIntegration('monitoring')}
                isLoading={saveMonitoringMutation.isPending}
                variant="primary"
              >
                Salvar Configuração
              </PremiumButton>
            </div>
          </CollapsibleSection>

        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && <BottomNav />}
    </div>
  );
};

export default SettingsPage;
