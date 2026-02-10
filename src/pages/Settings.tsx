import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Save, Eye, EyeOff, CheckCircle, XCircle, Loader2, Database, Webhook, Zap, Search, Activity, Settings as SettingsIcon, Server, AlertCircle, LogOut, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Settings() {
  const { logout, user } = useAuth();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  // Supabase states
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [supabaseBucket, setSupabaseBucket] = useState("receipts");
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [showDatabaseUrl, setShowDatabaseUrl] = useState(false);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(false);
  const [isSupabaseLoading, setIsSupabaseLoading] = useState(false);
  
  // N8N states
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [isN8nConfigured, setIsN8nConfigured] = useState(false);
  const [isN8nLoading, setIsN8nLoading] = useState(false);
  
  // Cache Strategies states
  const [cacheProgressiveTtl, setCacheProgressiveTtl] = useState(false);
  const [cacheThresholdHigh, setCacheThresholdHigh] = useState(100);
  const [cacheThresholdMedium, setCacheThresholdMedium] = useState(50);
  const [cacheThresholdLow, setCacheThresholdLow] = useState(10);
  const [cacheTtlHigh, setCacheTtlHigh] = useState(3600);
  const [cacheTtlMedium, setCacheTtlMedium] = useState(1800);
  const [cacheTtlLow, setCacheTtlLow] = useState(600);
  const [cacheTtlDefault, setCacheTtlDefault] = useState(300);
  const [cacheBatchInvalidation, setCacheBatchInvalidation] = useState(false);
  const [cacheBatchDelay, setCacheBatchDelay] = useState(1000);
  const [cacheWarming, setCacheWarming] = useState(false);
  const [cacheCompression, setCacheCompression] = useState(false);
  const [cacheCompressionThreshold, setCacheCompressionThreshold] = useState(1024);
  const [isCacheConfigured, setIsCacheConfigured] = useState(false);
  const [isCacheLoading, setIsCacheLoading] = useState(false);
  
  // Query Optimizer states
  const [optimizerFieldSet, setOptimizerFieldSet] = useState("compact");
  const [optimizerPageSize, setOptimizerPageSize] = useState(50);
  const [optimizerMaxPageSize, setOptimizerMaxPageSize] = useState(100);
  const [optimizerPaginationType, setOptimizerPaginationType] = useState("offset");
  const [optimizerQueryCaching, setOptimizerQueryCaching] = useState(false);
  const [optimizerCacheTtl, setOptimizerCacheTtl] = useState(300);
  const [optimizerAggregation, setOptimizerAggregation] = useState(false);
  const [isOptimizerConfigured, setIsOptimizerConfigured] = useState(false);
  const [isOptimizerLoading, setIsOptimizerLoading] = useState(false);
  
  // Monitoring states
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [monitoringInterval, setMonitoringInterval] = useState(60000);
  const [redisCommandsDaily, setRedisCommandsDaily] = useState(30000);
  const [redisWarningThreshold, setRedisWarningThreshold] = useState(80);
  const [redisCriticalThreshold, setRedisCriticalThreshold] = useState(95);
  const [supabaseBandwidth, setSupabaseBandwidth] = useState(5000000000);
  const [supabaseWarningThreshold, setSupabaseWarningThreshold] = useState(80);
  const [supabaseCriticalThreshold, setSupabaseCriticalThreshold] = useState(95);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertEmail, setAlertEmail] = useState("");
  const [autoActionsEnabled, setAutoActionsEnabled] = useState(false);
  const [isMonitoringConfigured, setIsMonitoringConfigured] = useState(false);
  const [isMonitoringLoading, setIsMonitoringLoading] = useState(false);
  
  // Redis states
  const [redisUrl, setRedisUrl] = useState("");
  const [redisToken, setRedisToken] = useState("");
  const [showRedisToken, setShowRedisToken] = useState(false);
  const [isRedisConfigured, setIsRedisConfigured] = useState(false);
  const [isRedisLoading, setIsRedisLoading] = useState(false);
  const [isRedisTestingConnection, setIsRedisTestingConnection] = useState(false);
  const [redisConnectionStatus, setRedisConnectionStatus] = useState<'connected' | 'error' | 'not-configured'>('not-configured');
  const [redisTelemetry, setRedisTelemetry] = useState({
    totalCommands: 0,
    limit: 500000,
    usagePercent: 0,
    hitRate: 0,
    storageUsedKB: 0,
    storageLimit: 262144,
    redisConnected: false,
  });
  const [showMigrationHelper, setShowMigrationHelper] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
    loadSupabaseConfig();
    loadN8nConfig();
    loadCacheConfig();
    loadOptimizerConfig();
    loadMonitoringConfig();
    loadRedisConfig();
    loadRedisTelemetry();
    checkRedisSecretsForMigration();
    
    // Auto-refresh telemetry every 30 seconds
    const telemetryInterval = setInterval(() => {
      loadRedisTelemetry();
    }, 30000);
    
    return () => clearInterval(telemetryInterval);
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch("/api/config/pluggy", { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setIsConfigured(data.configured);
      } else {
        setIsConfigured(false);
      }
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
      setIsConfigured(false);
    }
  };

  const loadSupabaseConfig = async () => {
    try {
      const response = await fetch("/api/config/supabase", { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setIsSupabaseConfigured(data.configured);
        
        // Carregar URL se disponível (para exibir)
        if (data.url) {
          setSupabaseUrl(data.url);
        }
        
        // Se tiver anonKey truncada, carregar credenciais completas
        if (data.configured && data.source === 'database') {
          try {
            const credResponse = await fetch("/api/config/supabase/credentials", { credentials: 'include' });
            if (credResponse.ok) {
              const credData = await credResponse.json();
              if (credData.success && credData.credentials) {
                setSupabaseUrl(credData.credentials.url);
                setSupabaseAnonKey(credData.credentials.anonKey);
                if (credData.credentials.databaseUrl) {
                  setDatabaseUrl(credData.credentials.databaseUrl);
                }
                
                // Exibir mensagem informando a fonte
                toast({
                  title: "Configuração Carregada",
                  description: `Supabase configurado via ${credData.source === 'database' ? 'banco de dados' : 'Secrets'}`,
                  variant: "default",
                });
              }
            }
          } catch (credError) {
            console.log("Não foi possível carregar credenciais completas:", credError);
          }
        } else if (data.source === 'secrets') {
          toast({
            title: "Atenção",
            description: "Supabase configurado via Secrets. Considere migrar para o banco de dados.",
            variant: "default",
          });
        }
      } else {
        setIsSupabaseConfigured(false);
      }
    } catch (error) {
      console.error("Erro ao carregar configuração do Supabase:", error);
      setIsSupabaseConfigured(false);
    }
  };

  const loadN8nConfig = async () => {
    try {
      const response = await fetch("/api/config/n8n", { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setIsN8nConfigured(data.configured);
      } else {
        setIsN8nConfigured(false);
      }
    } catch (error) {
      console.error("Erro ao carregar configuração do N8N:", error);
      setIsN8nConfigured(false);
    }
  };

  const loadCacheConfig = async () => {
    try {
      const response = await fetch("/api/config/cache/settings", { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setCacheProgressiveTtl(data.data.progressiveTtlEnabled ?? false);
          setCacheThresholdHigh(data.data.thresholds?.high ?? 100);
          setCacheThresholdMedium(data.data.thresholds?.medium ?? 50);
          setCacheThresholdLow(data.data.thresholds?.low ?? 10);
          setCacheTtlHigh(data.data.ttlValues?.high ?? 3600);
          setCacheTtlMedium(data.data.ttlValues?.medium ?? 1800);
          setCacheTtlLow(data.data.ttlValues?.low ?? 600);
          setCacheTtlDefault(data.data.ttlValues?.default ?? 300);
          setCacheBatchInvalidation(data.data.batchInvalidationEnabled ?? false);
          setCacheBatchDelay(data.data.batchInvalidationDelay ?? 1000);
          setCacheWarming(data.data.cacheWarmingEnabled ?? false);
          setCacheCompression(data.data.compressionEnabled ?? false);
          setCacheCompressionThreshold(data.data.compressionThreshold ?? 1024);
          setIsCacheConfigured(true);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configuração de cache:", error);
    }
  };

  const loadOptimizerConfig = async () => {
    try {
      const response = await fetch("/api/config/optimizer/settings", { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setOptimizerFieldSet(data.data.defaultFieldSet ?? "compact");
          setOptimizerPageSize(data.data.defaultPageSize ?? 50);
          setOptimizerMaxPageSize(data.data.maxPageSize ?? 100);
          setOptimizerPaginationType(data.data.paginationType ?? "offset");
          setOptimizerQueryCaching(data.data.queryCachingEnabled ?? false);
          setOptimizerCacheTtl(data.data.queryCacheTtl ?? 300);
          setOptimizerAggregation(data.data.aggregationEnabled ?? false);
          setIsOptimizerConfigured(true);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configuração do otimizador:", error);
    }
  };

  const loadMonitoringConfig = async () => {
    try {
      const response = await fetch("/api/config/monitoring/settings", { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setMonitoringEnabled(data.data.monitoringEnabled ?? false);
          setMonitoringInterval(data.data.monitoringInterval ?? 60000);
          setRedisCommandsDaily(data.data.limits?.redis?.commandsDaily ?? 30000);
          setRedisWarningThreshold(data.data.thresholds?.redis?.warning ?? 80);
          setRedisCriticalThreshold(data.data.thresholds?.redis?.critical ?? 95);
          setSupabaseBandwidth(data.data.limits?.supabase?.bandwidthMonthly ?? 5000000000);
          setSupabaseWarningThreshold(data.data.thresholds?.supabase?.warning ?? 80);
          setSupabaseCriticalThreshold(data.data.thresholds?.supabase?.critical ?? 95);
          setAlertsEnabled(data.data.alertsEnabled ?? false);
          setAlertEmail(data.data.alertEmail ?? "");
          setAutoActionsEnabled(data.data.autoActionsEnabled ?? false);
          setIsMonitoringConfigured(true);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configuração de monitoramento:", error);
    }
  };

  const handleSaveSupabase = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos do Supabase",
        variant: "destructive",
      });
      return;
    }

    setIsSupabaseLoading(true);
    try {
      const response = await fetch("/api/config/supabase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          supabaseUrl: supabaseUrl,
          supabaseAnonKey: supabaseAnonKey,
          supabaseBucket: supabaseBucket,
          databaseUrl: databaseUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSupabaseConfigured(true);
        
        // ✅ CORREÇÃO CRÍTICA: Salvar no localStorage para que o frontend use as credenciais
        localStorage.setItem('supabase_url', supabaseUrl);
        localStorage.setItem('supabase_anon_key', supabaseAnonKey);
        console.log('✅ Credenciais do Supabase salvas no localStorage');
        
        toast({
          title: "Sucesso",
          description: data.message || "Configuração do Supabase salva com sucesso!",
        });
      } else {
        throw new Error(data.error || "Erro ao salvar configuração");
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do Supabase:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar configuração",
        variant: "destructive",
      });
    } finally {
      setIsSupabaseLoading(false);
    }
  };

  const handleTestSupabase = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha os campos antes de testar",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch("/api/credentials/test/supabase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supabaseUrl: supabaseUrl,
          supabaseAnonKey: supabaseAnonKey,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Conexão bem-sucedida! ✅",
          description: data.message || "Supabase conectado com sucesso!",
        });
      } else {
        throw new Error(data.error || "Falha ao conectar");
      }
    } catch (error) {
      console.error("Erro ao testar conexão:", error);
      toast({
        title: "Falha na conexão ❌",
        description: error instanceof Error ? error.message : "Erro ao testar conexão",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveN8n = async () => {
    if (!n8nWebhookUrl.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha a URL do webhook N8N",
        variant: "destructive",
      });
      return;
    }

    setIsN8nLoading(true);
    try {
      const response = await fetch("/api/config/n8n", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          webhookUrl: n8nWebhookUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsN8nConfigured(true);
        toast({
          title: "Sucesso",
          description: data.message || "URL do webhook N8N salva com sucesso!",
        });
      } else {
        throw new Error(data.error || "Erro ao salvar configuração");
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do N8N:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar configuração",
        variant: "destructive",
      });
    } finally {
      setIsN8nLoading(false);
    }
  };

  const handleSave = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todas as credenciais",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/config/pluggy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          clientId: clientId,
          clientSecret: clientSecret,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsConfigured(true);
        toast({
          title: "Sucesso",
          description: data.message || "Credenciais do Pluggy salvas com sucesso!",
        });
      } else {
        throw new Error(data.error || "Erro ao salvar credenciais");
      }
    } catch (error) {
      console.error("Erro ao salvar credenciais:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar credenciais",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, salve as credenciais antes de testar",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch("https://api.pluggy.ai/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          clientSecret,
        }),
      });

      const data = await response.json();

      if (response.ok && data.apiKey) {
        toast({
          title: "Conexão bem-sucedida! ✅",
          description: "As credenciais estão válidas e funcionando corretamente",
        });
      } else {
        throw new Error(data.message || "Credenciais inválidas");
      }
    } catch (error) {
      console.error("Erro ao testar conexão:", error);
      toast({
        title: "Falha na conexão ❌",
        description: error instanceof Error ? error.message : "Credenciais inválidas ou erro de conexão",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveCache = async () => {
    setIsCacheLoading(true);
    try {
      const response = await fetch("/api/config/cache", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          progressiveTtlEnabled: cacheProgressiveTtl,
          thresholds: {
            high: cacheThresholdHigh,
            medium: cacheThresholdMedium,
            low: cacheThresholdLow,
          },
          ttlValues: {
            high: cacheTtlHigh,
            medium: cacheTtlMedium,
            low: cacheTtlLow,
            default: cacheTtlDefault,
          },
          batchInvalidationEnabled: cacheBatchInvalidation,
          batchInvalidationDelay: cacheBatchDelay,
          cacheWarmingEnabled: cacheWarming,
          compressionEnabled: cacheCompression,
          compressionThreshold: cacheCompressionThreshold,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsCacheConfigured(true);
        toast({
          title: "Sucesso",
          description: data.message || "Configuração de cache salva com sucesso!",
        });
      } else {
        throw new Error(data.error || "Erro ao salvar configuração");
      }
    } catch (error) {
      console.error("Erro ao salvar configuração de cache:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar configuração",
        variant: "destructive",
      });
    } finally {
      setIsCacheLoading(false);
    }
  };

  const handleSaveOptimizer = async () => {
    setIsOptimizerLoading(true);
    try {
      const response = await fetch("/api/config/optimizer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          defaultFieldSet: optimizerFieldSet,
          defaultPageSize: optimizerPageSize,
          maxPageSize: optimizerMaxPageSize,
          paginationType: optimizerPaginationType,
          queryCachingEnabled: optimizerQueryCaching,
          queryCacheTtl: optimizerCacheTtl,
          aggregationEnabled: optimizerAggregation,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsOptimizerConfigured(true);
        toast({
          title: "Sucesso",
          description: data.message || "Configuração do otimizador salva com sucesso!",
        });
      } else {
        throw new Error(data.error || "Erro ao salvar configuração");
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do otimizador:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar configuração",
        variant: "destructive",
      });
    } finally {
      setIsOptimizerLoading(false);
    }
  };

  const handleSaveMonitoring = async () => {
    setIsMonitoringLoading(true);
    try {
      const response = await fetch("/api/config/monitoring", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          monitoringEnabled: monitoringEnabled,
          monitoringInterval: monitoringInterval,
          limits: {
            redis: {
              commandsDaily: redisCommandsDaily,
            },
            supabase: {
              bandwidthMonthly: supabaseBandwidth,
            },
          },
          thresholds: {
            redis: {
              warning: redisWarningThreshold,
              critical: redisCriticalThreshold,
            },
            supabase: {
              warning: supabaseWarningThreshold,
              critical: supabaseCriticalThreshold,
            },
          },
          alertsEnabled: alertsEnabled,
          alertEmail: alertEmail,
          autoActionsEnabled: autoActionsEnabled,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsMonitoringConfigured(true);
        toast({
          title: "Sucesso",
          description: data.message || "Configuração de monitoramento salva com sucesso!",
        });
      } else {
        throw new Error(data.error || "Erro ao salvar configuração");
      }
    } catch (error) {
      console.error("Erro ao salvar configuração de monitoramento:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar configuração",
        variant: "destructive",
      });
    } finally {
      setIsMonitoringLoading(false);
    }
  };

  const loadRedisConfig = async () => {
    try {
      const response = await fetch("/api/config/redis", { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setIsRedisConfigured(data.configured);
        if (data.configured) {
          setRedisConnectionStatus('connected');
          
          // Load credentials if configured
          try {
            const credResponse = await fetch("/api/config/redis/credentials", { credentials: 'include' });
            if (credResponse.ok) {
              const credData = await credResponse.json();
              if (credData.success && credData.credentials) {
                setRedisUrl(credData.credentials.url);
                setRedisToken(credData.credentials.token || "");
              }
            }
          } catch (credError) {
            console.log("Não foi possível carregar credenciais Redis:", credError);
          }
        }
      } else {
        setIsRedisConfigured(false);
        setRedisConnectionStatus('not-configured');
      }
    } catch (error) {
      console.error("Erro ao carregar configuração do Redis:", error);
      setIsRedisConfigured(false);
      setRedisConnectionStatus('error');
    }
  };

  const loadRedisTelemetry = async () => {
    try {
      const response = await fetch("/api/config/redis/telemetry", { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.telemetry) {
          setRedisTelemetry(data.telemetry);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar telemetria do Redis:", error);
    }
  };

  const checkRedisSecretsForMigration = async () => {
    // This is a simple check - in production, you'd query the backend
    // For now, we'll just show the helper if Redis is not configured in DB
    setShowMigrationHelper(!isRedisConfigured);
  };

  const handleTestRedisConnection = async () => {
    if (!redisUrl.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha a URL do Redis antes de testar",
        variant: "destructive",
      });
      return;
    }

    setIsRedisTestingConnection(true);
    try {
      const response = await fetch("/api/config/redis/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          redisUrl: redisUrl,
          redisToken: redisToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRedisConnectionStatus('connected');
        toast({
          title: "Conexão bem-sucedida! ✅",
          description: data.message || "Redis conectado com sucesso!",
        });
      } else {
        setRedisConnectionStatus('error');
        throw new Error(data.error || "Falha ao conectar");
      }
    } catch (error) {
      console.error("Erro ao testar conexão do Redis:", error);
      setRedisConnectionStatus('error');
      toast({
        title: "Falha na conexão ❌",
        description: error instanceof Error ? error.message : "Erro ao testar conexão",
        variant: "destructive",
      });
    } finally {
      setIsRedisTestingConnection(false);
    }
  };

  const handleSaveRedis = async () => {
    if (!redisUrl.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha a URL do Redis",
        variant: "destructive",
      });
      return;
    }

    // Validate URL format
    if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
      toast({
        title: "Erro",
        description: "URL do Redis inválida. Deve começar com redis:// ou rediss://",
        variant: "destructive",
      });
      return;
    }

    setIsRedisLoading(true);
    try {
      const response = await fetch("/api/config/redis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          redisUrl: redisUrl,
          redisToken: redisToken,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsRedisConfigured(true);
        setRedisConnectionStatus('connected');
        toast({
          title: "Sucesso",
          description: data.message || "Configuração do Redis salva com sucesso!",
        });
        
        // Reload telemetry after saving
        loadRedisTelemetry();
      } else {
        throw new Error(data.error || "Erro ao salvar configuração");
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do Redis:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar configuração",
        variant: "destructive",
      });
    } finally {
      setIsRedisLoading(false);
    }
  };

  const handleMigrateRedis = async () => {
    setIsRedisLoading(true);
    try {
      const response = await fetch("/api/config/redis/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setIsRedisConfigured(true);
        setShowMigrationHelper(false);
        toast({
          title: "Migração concluída! ✅",
          description: data.message || "Credenciais migradas com sucesso!",
        });
        
        // Reload config after migration
        loadRedisConfig();
        loadRedisTelemetry();
      } else {
        throw new Error(data.error || "Erro ao migrar credenciais");
      }
    } catch (error) {
      console.error("Erro ao migrar credenciais do Redis:", error);
      toast({
        title: "Erro na migração ❌",
        description: error instanceof Error ? error.message : "Erro ao migrar credenciais",
        variant: "destructive",
      });
    } finally {
      setIsRedisLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
            <SettingsIcon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl lg:text-2xl font-black text-foreground tracking-tight bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
              Configurações
            </h1>
            <p className="text-xl lg:text-sm text-muted-foreground/80 mt-2">
              Gerencie suas preferências e configurações do sistema
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Credenciais Pluggy - Conectar Bancos
            {isConfigured && (
              <span className="inline-flex items-center gap-1 text-sm font-normal text-green-600">
                <CheckCircle className="h-4 w-4" />
                Configurado
              </span>
            )}
            {!isConfigured && (
              <span className="inline-flex items-center gap-1 text-sm font-normal text-amber-600">
                <XCircle className="h-4 w-4" />
                Não configurado
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Configure suas credenciais Pluggy para conectar seus bancos e importar faturas de cartão.
            As credenciais serão salvas de forma segura no banco de dados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientId">Client ID</Label>
            <Input
              id="clientId"
              type="text"
              placeholder="Seu Client ID do Pluggy"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientSecret">Client Secret</Label>
            <div className="relative">
              <Input
                id="clientSecret"
                type={showSecret ? "text" : "password"}
                placeholder="Seu Client Secret do Pluggy"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} className="gap-2" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Credenciais
            </Button>
            <Button 
              onClick={handleTestConnection} 
              variant="outline" 
              className="gap-2"
              disabled={isTesting || !isConfigured}
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Configuração Supabase
            {isSupabaseConfigured && (
              <span className="inline-flex items-center gap-1 text-sm font-normal text-green-600">
                <CheckCircle className="h-4 w-4" />
                Configurado
              </span>
            )}
            {!isSupabaseConfigured && (
              <span className="inline-flex items-center gap-1 text-sm font-normal text-amber-600">
                <XCircle className="h-4 w-4" />
                Não configurado
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Configure o Supabase para armazenar arquivos na nuvem ao invés de base64 no banco de dados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supabaseUrl">Supabase URL</Label>
            <Input
              id="supabaseUrl"
              type="text"
              placeholder="https://xxxxxxxxxxxx.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supabaseAnonKey">Supabase Anon Key</Label>
            <div className="relative">
              <Input
                id="supabaseAnonKey"
                type={showSupabaseKey ? "text" : "password"}
                placeholder="Sua chave pública (anon key)"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowSupabaseKey(!showSupabaseKey)}
              >
                {showSupabaseKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supabaseBucket">Bucket Name (opcional)</Label>
            <Input
              id="supabaseBucket"
              type="text"
              placeholder="receipts"
              value={supabaseBucket}
              onChange={(e) => setSupabaseBucket(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Nome do bucket onde os arquivos serão armazenados. Padrão: "receipts"
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="databaseUrl">Database URL (PostgreSQL)</Label>
            <div className="relative">
              <Input
                id="databaseUrl"
                data-testid="input-database-url"
                type={showDatabaseUrl ? "text" : "password"}
                placeholder="postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres"
                value={databaseUrl}
                onChange={(e) => setDatabaseUrl(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowDatabaseUrl(!showDatabaseUrl)}
                data-testid="button-toggle-database-url"
              >
                {showDatabaseUrl ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Encontrado em Settings → Database → Connection string do seu projeto Supabase
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSaveSupabase} className="gap-2" disabled={isSupabaseLoading}>
              {isSupabaseLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Configuração
            </Button>
            <Button 
              onClick={handleTestSupabase} 
              variant="outline" 
              className="gap-2"
              disabled={isTesting || !supabaseUrl.trim() || !supabaseAnonKey.trim()}
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Testar Conexão
            </Button>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Como configurar o Supabase:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Acesse <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">supabase.com</a> e crie uma conta</li>
              <li>Crie um novo projeto</li>
              <li>Vá em Settings → API</li>
              <li>Copie a "Project URL" e cole em "Supabase URL"</li>
              <li>Copie a "anon public" key e cole em "Supabase Anon Key"</li>
              <li>Crie um bucket chamado "receipts" em Storage</li>
              <li>Salve a configuração</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook N8N (Produção)
            {isN8nConfigured && (
              <span className="inline-flex items-center gap-1 text-sm font-normal text-green-600">
                <CheckCircle className="h-4 w-4" />
                Configurado
              </span>
            )}
            {!isN8nConfigured && (
              <span className="inline-flex items-center gap-1 text-sm font-normal text-amber-600">
                <XCircle className="h-4 w-4" />
                Não configurado
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Configure a URL do webhook N8N para processamento automático de documentos e recibos com IA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.tenantId && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-medium">Seu Tenant ID:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono" data-testid="text-tenant-id-settings">
                    {user.tenantId}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={async () => {
                      await navigator.clipboard.writeText(user.tenantId!);
                      toast({ title: 'Copiado!', description: 'Tenant ID copiado' });
                    }}
                    data-testid="button-copy-tenant-id-settings"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Este é o identificador único da sua plataforma.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="n8nWebhookUrl">URL do Webhook N8N</Label>
            <Input
              id="n8nWebhookUrl"
              type="text"
              placeholder="https://n8n.exemplo.com/webhook/..."
              value={n8nWebhookUrl}
              onChange={(e) => setN8nWebhookUrl(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSaveN8n} className="gap-2" disabled={isN8nLoading}>
              {isN8nLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Configuração
            </Button>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Como funciona:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Ao fazer upload de uma imagem/documento, o sistema envia para este webhook</li>
              <li>O N8N processa a imagem com IA (Google Gemini Vision)</li>
              <li>Extrai automaticamente dados financeiros (estabelecimento, valor, data, etc)</li>
              <li>Os dados são salvos e exibidos no dashboard</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Configuração Redis (Cache)
            {redisConnectionStatus === 'connected' && (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Conectado
              </Badge>
            )}
            {redisConnectionStatus === 'error' && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Erro
              </Badge>
            )}
            {redisConnectionStatus === 'not-configured' && (
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Não configurado
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Configure o Redis (Upstash) para cache de alta performance. Free tier: 500K comandos/mês, 256MB storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Migration Helper */}
          {showMigrationHelper && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>Detectamos credenciais Redis nos Secrets. Migrar para o banco de dados?</span>
                  <Button 
                    onClick={handleMigrateRedis} 
                    size="sm" 
                    variant="outline"
                    disabled={isRedisLoading}
                  >
                    {isRedisLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Migrar Agora"
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Configuration Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="redisUrl">Redis URL</Label>
              <Input
                id="redisUrl"
                type="text"
                placeholder="rediss://default:***@your-redis.upstash.io:6379"
                value={redisUrl}
                onChange={(e) => setRedisUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                URL de conexão do Redis (Upstash). Deve começar com redis:// ou rediss://
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="redisToken">Redis Token (Opcional)</Label>
              <div className="relative">
                <Input
                  id="redisToken"
                  type={showRedisToken ? "text" : "password"}
                  placeholder="•••••••••"
                  value={redisToken}
                  onChange={(e) => setRedisToken(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowRedisToken(!showRedisToken)}
                >
                  {showRedisToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleTestRedisConnection} 
                variant="outline" 
                className="gap-2"
                disabled={isRedisTestingConnection || !redisUrl.trim()}
              >
                {isRedisTestingConnection ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Testar Conexão
              </Button>
              <Button 
                onClick={handleSaveRedis} 
                className="gap-2" 
                disabled={isRedisLoading || !redisUrl.trim()}
              >
                {isRedisLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar Configuração
              </Button>
            </div>
          </div>

          {/* Telemetry Dashboard */}
          {isRedisConfigured && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
              <h3 className="font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Telemetria de Uso
                <span className="text-xs text-muted-foreground font-normal">(Atualiza a cada 30s)</span>
              </h3>
              
              <div className="space-y-4">
                {/* Total Commands */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Comandos Mensais</span>
                    <span className="text-muted-foreground">
                      {redisTelemetry.totalCommands.toLocaleString()} / {redisTelemetry.limit.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={redisTelemetry.usagePercent} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {redisTelemetry.usagePercent.toFixed(1)}% usado ({(500000 - redisTelemetry.totalCommands).toLocaleString()} restantes)
                  </p>
                </div>

                {/* Hit Rate */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Taxa de Acerto (Hit Rate)</span>
                    <span className="text-muted-foreground">
                      {redisTelemetry.hitRate.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={redisTelemetry.hitRate} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Percentual de requisições servidas do cache
                  </p>
                </div>

                {/* Storage Used */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Armazenamento</span>
                    <span className="text-muted-foreground">
                      {redisTelemetry.storageUsedKB.toFixed(0)} KB / {(redisTelemetry.storageLimit / 1024).toFixed(0)} MB
                    </span>
                  </div>
                  <Progress 
                    value={(redisTelemetry.storageUsedKB / redisTelemetry.storageLimit) * 100} 
                    className="h-2" 
                  />
                  <p className="text-xs text-muted-foreground">
                    {((redisTelemetry.storageUsedKB / redisTelemetry.storageLimit) * 100).toFixed(2)}% do limite usado
                  </p>
                </div>

                {/* Connection Status */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">Status da Conexão</span>
                  {redisTelemetry.redisConnected ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Redis Conectado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Cache em Memória
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Setup Instructions */}
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Como configurar o Redis (Upstash):</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Acesse <a href="https://upstash.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">upstash.com</a> e crie uma conta gratuita</li>
              <li>Crie um novo database Redis (escolha a região mais próxima)</li>
              <li>Na página do database, role até "REST API" e copie a URL do Redis</li>
              <li>Cole a URL no campo "Redis URL" acima</li>
              <li>Clique em "Testar Conexão" para verificar</li>
              <li>Se funcionar, clique em "Salvar Configuração"</li>
              <li>Pronto! O cache está ativado ✅</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-3">
              💡 <strong>Dica:</strong> O free tier do Upstash oferece 500K comandos/mês e 256MB de storage, mais que suficiente para a maioria das aplicações.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Cache Strategies
            {isCacheConfigured && (
              <span className="inline-flex items-center gap-1 text-sm font-normal text-green-600">
                <CheckCircle className="h-4 w-4" />
                Configurado
              </span>
            )}
            {!isCacheConfigured && (
              <span className="inline-flex items-center gap-1 text-sm font-normal text-amber-600">
                <XCircle className="h-4 w-4" />
                Não configurado
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Configurações de cache para otimização de performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="cacheProgressiveTtl">Progressive TTL Enabled</Label>
            <Switch
              id="cacheProgressiveTtl"
              checked={cacheProgressiveTtl}
              onCheckedChange={setCacheProgressiveTtl}
            />
          </div>

          <div className="space-y-2">
            <Label>Access Thresholds</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="cacheThresholdHigh" className="text-xs">High</Label>
                <Input
                  id="cacheThresholdHigh"
                  type="number"
                  value={cacheThresholdHigh}
                  onChange={(e) => setCacheThresholdHigh(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="cacheThresholdMedium" className="text-xs">Medium</Label>
                <Input
                  id="cacheThresholdMedium"
                  type="number"
                  value={cacheThresholdMedium}
                  onChange={(e) => setCacheThresholdMedium(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="cacheThresholdLow" className="text-xs">Low</Label>
                <Input
                  id="cacheThresholdLow"
                  type="number"
                  value={cacheThresholdLow}
                  onChange={(e) => setCacheThresholdLow(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>TTL Values (segundos)</Label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label htmlFor="cacheTtlHigh" className="text-xs">High</Label>
                <Input
                  id="cacheTtlHigh"
                  type="number"
                  value={cacheTtlHigh}
                  onChange={(e) => setCacheTtlHigh(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="cacheTtlMedium" className="text-xs">Medium</Label>
                <Input
                  id="cacheTtlMedium"
                  type="number"
                  value={cacheTtlMedium}
                  onChange={(e) => setCacheTtlMedium(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="cacheTtlLow" className="text-xs">Low</Label>
                <Input
                  id="cacheTtlLow"
                  type="number"
                  value={cacheTtlLow}
                  onChange={(e) => setCacheTtlLow(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="cacheTtlDefault" className="text-xs">Default</Label>
                <Input
                  id="cacheTtlDefault"
                  type="number"
                  value={cacheTtlDefault}
                  onChange={(e) => setCacheTtlDefault(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="cacheBatchInvalidation">Batch Invalidation Enabled</Label>
            <Switch
              id="cacheBatchInvalidation"
              checked={cacheBatchInvalidation}
              onCheckedChange={setCacheBatchInvalidation}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cacheBatchDelay">Batch Invalidation Delay (ms)</Label>
            <Input
              id="cacheBatchDelay"
              type="number"
              value={cacheBatchDelay}
              onChange={(e) => setCacheBatchDelay(Number(e.target.value))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="cacheWarming">Cache Warming Enabled</Label>
            <Switch
              id="cacheWarming"
              checked={cacheWarming}
              onCheckedChange={setCacheWarming}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="cacheCompression">Compression Enabled</Label>
            <Switch
              id="cacheCompression"
              checked={cacheCompression}
              onCheckedChange={setCacheCompression}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cacheCompressionThreshold">Compression Threshold (bytes)</Label>
            <Input
              id="cacheCompressionThreshold"
              type="number"
              value={cacheCompressionThreshold}
              onChange={(e) => setCacheCompressionThreshold(Number(e.target.value))}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSaveCache} className="gap-2" disabled={isCacheLoading}>
              {isCacheLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Configuração
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Query Optimizer
            {isOptimizerConfigured && (
              <span className="inline-flex items-center gap-1 text-sm font-normal text-green-600">
                <CheckCircle className="h-4 w-4" />
                Configurado
              </span>
            )}
            {!isOptimizerConfigured && (
              <span className="inline-flex items-center gap-1 text-sm font-normal text-amber-600">
                <XCircle className="h-4 w-4" />
                Não configurado
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Otimizações de queries do banco de dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="optimizerFieldSet">Default Field Set</Label>
            <Select value={optimizerFieldSet} onValueChange={setOptimizerFieldSet}>
              <SelectTrigger id="optimizerFieldSet">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="full">Full</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="optimizerPageSize">Default Page Size</Label>
            <Input
              id="optimizerPageSize"
              type="number"
              value={optimizerPageSize}
              onChange={(e) => setOptimizerPageSize(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="optimizerMaxPageSize">Max Page Size</Label>
            <Input
              id="optimizerMaxPageSize"
              type="number"
              value={optimizerMaxPageSize}
              onChange={(e) => setOptimizerMaxPageSize(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="optimizerPaginationType">Pagination Type</Label>
            <Select value={optimizerPaginationType} onValueChange={setOptimizerPaginationType}>
              <SelectTrigger id="optimizerPaginationType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="offset">Offset</SelectItem>
                <SelectItem value="cursor">Cursor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="optimizerQueryCaching">Query Caching Enabled</Label>
            <Switch
              id="optimizerQueryCaching"
              checked={optimizerQueryCaching}
              onCheckedChange={setOptimizerQueryCaching}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="optimizerCacheTtl">Query Cache TTL (segundos)</Label>
            <Input
              id="optimizerCacheTtl"
              type="number"
              value={optimizerCacheTtl}
              onChange={(e) => setOptimizerCacheTtl(Number(e.target.value))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="optimizerAggregation">Aggregation Enabled</Label>
            <Switch
              id="optimizerAggregation"
              checked={optimizerAggregation}
              onCheckedChange={setOptimizerAggregation}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSaveOptimizer} className="gap-2" disabled={isOptimizerLoading}>
              {isOptimizerLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Configuração
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Monitoring & Limits
            {isMonitoringConfigured && (
              <span className="inline-flex items-center gap-1 text-sm font-normal text-green-600">
                <CheckCircle className="h-4 w-4" />
                Configurado
              </span>
            )}
            {!isMonitoringConfigured && (
              <span className="inline-flex items-center gap-1 text-sm font-normal text-amber-600">
                <XCircle className="h-4 w-4" />
                Não configurado
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Monitoramento de limites do FREE tier
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="monitoringEnabled">Monitoring Enabled</Label>
            <Switch
              id="monitoringEnabled"
              checked={monitoringEnabled}
              onCheckedChange={setMonitoringEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monitoringInterval">Monitoring Interval (ms)</Label>
            <Input
              id="monitoringInterval"
              type="number"
              value={monitoringInterval}
              onChange={(e) => setMonitoringInterval(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="redisCommandsDaily">Redis Commands Daily</Label>
            <Input
              id="redisCommandsDaily"
              type="number"
              value={redisCommandsDaily}
              onChange={(e) => setRedisCommandsDaily(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Redis Thresholds (%)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="redisWarningThreshold" className="text-xs">Warning</Label>
                <Input
                  id="redisWarningThreshold"
                  type="number"
                  value={redisWarningThreshold}
                  onChange={(e) => setRedisWarningThreshold(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="redisCriticalThreshold" className="text-xs">Critical</Label>
                <Input
                  id="redisCriticalThreshold"
                  type="number"
                  value={redisCriticalThreshold}
                  onChange={(e) => setRedisCriticalThreshold(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supabaseBandwidth">Supabase Bandwidth Monthly (bytes)</Label>
            <Input
              id="supabaseBandwidth"
              type="number"
              value={supabaseBandwidth}
              onChange={(e) => setSupabaseBandwidth(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Supabase Thresholds (%)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="supabaseWarningThreshold" className="text-xs">Warning</Label>
                <Input
                  id="supabaseWarningThreshold"
                  type="number"
                  value={supabaseWarningThreshold}
                  onChange={(e) => setSupabaseWarningThreshold(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="supabaseCriticalThreshold" className="text-xs">Critical</Label>
                <Input
                  id="supabaseCriticalThreshold"
                  type="number"
                  value={supabaseCriticalThreshold}
                  onChange={(e) => setSupabaseCriticalThreshold(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="alertsEnabled">Alerts Enabled</Label>
            <Switch
              id="alertsEnabled"
              checked={alertsEnabled}
              onCheckedChange={setAlertsEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alertEmail">Alert Email</Label>
            <Input
              id="alertEmail"
              type="email"
              placeholder="seu-email@exemplo.com"
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="autoActionsEnabled">Auto Actions Enabled</Label>
            <Switch
              id="autoActionsEnabled"
              checked={autoActionsEnabled}
              onCheckedChange={setAutoActionsEnabled}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSaveMonitoring} className="gap-2" disabled={isMonitoringLoading}>
              {isMonitoringLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Configuração
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logout Card */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <LogOut className="h-5 w-5" />
            Sair da Conta
          </CardTitle>
          <CardDescription>
            Encerre sua sessão atual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={logout} 
            variant="destructive" 
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
