import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Video, Workflow, Copy, RefreshCw, Trash2, Check, Eye, EyeOff, Truck, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const configSchema = z.object({
  nome_empresa: z.string().min(2, "Nome muito curto"),
  email_contato: z.string().email(),
  horario_inicio: z.string(),
  horario_fim: z.string(),
  cor_primaria: z.string(),
  cor_secundaria: z.string(),
  hms_app_access_key: z.string().optional(),
  hms_app_secret: z.string().optional(),
  hms_management_token: z.string().optional(),
  hms_template_id: z.string().optional(),
  hms_api_base_url: z.string().optional(),
});

export default function Configuracoes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const [totalExpressUser, setTotalExpressUser] = useState("");
  const [totalExpressPass, setTotalExpressPass] = useState("");
  const [totalExpressReid, setTotalExpressReid] = useState("");
  const [totalExpressService, setTotalExpressService] = useState("EXP");
  const [profitMargin, setProfitMargin] = useState("40");
  const [testMode, setTestMode] = useState(false);
  const [showTotalExpressPass, setShowTotalExpressPass] = useState(false);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["/api/tenants/me"],
    queryFn: async () => {
      const response = await tenantsApi.me();
      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await tenantsApi.update(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/calendar-events"] });
      // Disparar evento para outros componentes recarregarem
      window.dispatchEvent(new CustomEvent('supabase-config-changed'));
      toast({
        title: "Configurações salvas",
        description: "As configurações do tenant foram atualizadas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.response?.data?.message || "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof configSchema>>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      nome_empresa: "",
      email_contato: "",
      horario_inicio: "09:00",
      horario_fim: "18:00",
      cor_primaria: "#3B82F6",
      cor_secundaria: "#10B981",
      hms_app_access_key: "",
      hms_app_secret: "",
      hms_management_token: "",
      hms_template_id: "",
      hms_api_base_url: "https://api.100ms.live/v2",
    },
  });

  const { data: hms100msConfig } = useQuery({
    queryKey: ["/api/config/hms100ms/credentials"],
    queryFn: async () => {
      try {
        // Primeiro, sincronizar secrets do environment
        const syncResponse = await fetch("/api/config/hms100ms/sync-from-env", {
          headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` },
          credentials: 'include',
        });
        
        if (syncResponse.ok) {
          const syncData = await syncResponse.json();
          console.log("✅ [HMS] Credenciais sincronizadas", { syncedFromEnv: syncData.syncedFromEnv });
          if (syncData.credentials) {
            return syncData;
          }
        }
        
        // Se sincronização falhar, buscar do banco normalmente
        const response = await fetch("/api/config/hms100ms/credentials", {
          headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` },
          credentials: 'include',
        });
        if (!response.ok) return null;
        return response.json();
      } catch (error) {
        console.error("❌ [HMS] Erro ao carregar credenciais:", error);
        return null;
      }
    },
  });

  useEffect(() => {
    if (tenant) {
      const config = tenant.configuracoes || {};
      const resetData = {
        nome_empresa: tenant.nome || "",
        email_contato: tenant.email || "",
        horario_inicio: config.horario_comercial?.inicio || "09:00",
        horario_fim: config.horario_comercial?.fim || "18:00",
        cor_primaria: config.cores?.primaria || "#3B82F6",
        cor_secundaria: config.cores?.secundaria || "#10B981",
        hms_app_access_key: hms100msConfig?.credentials?.appAccessKey || "",
        hms_app_secret: hms100msConfig?.credentials?.appSecret || "",
        hms_management_token: hms100msConfig?.credentials?.managementToken || "",
        hms_template_id: hms100msConfig?.credentials?.templateId || "",
        hms_api_base_url: hms100msConfig?.credentials?.apiBaseUrl || "https://api.100ms.live/v2",
      };
      console.log("📋 [Configuracoes] Resetando formulário HMS com dados:", {
        appAccessKey: !!resetData.hms_app_access_key ? "✅" : "❌",
        appSecret: !!resetData.hms_app_secret ? "✅" : "❌",
        managementToken: !!resetData.hms_management_token ? "✅" : "❌",
        templateId: !!resetData.hms_template_id ? "✅" : "❌",
        apiBaseUrl: resetData.hms_api_base_url,
      });
      form.reset(resetData);
    }
  }, [tenant, hms100msConfig, form]);

  const saveHms100msMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/config/hms100ms", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Erro ao salvar configuração");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config/hms100ms/credentials"] });
      toast({
        title: "100ms configurado",
        description: "Credenciais salvas com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testHms100msMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/config/hms100ms/test", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Credenciais inválidas");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Credenciais do 100ms validadas com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na validação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: n8nApiKeyStatus, isLoading: isLoadingN8nStatus } = useQuery({
    queryKey: ["/api/n8n/api-key/status"],
    queryFn: async () => {
      const response = await fetch("/api/n8n/api-key/status", {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` },
        credentials: 'include',
      });
      if (!response.ok) return { hasApiKey: false, hasConfig: false };
      return response.json();
    },
  });

  const generateN8nApiKeyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/n8n/api-key/generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || "Erro ao gerar API Key");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedApiKey(data.apiKey);
      setShowApiKey(true);
      queryClient.invalidateQueries({ queryKey: ["/api/n8n/api-key/status"] });
      toast({
        title: "API Key gerada!",
        description: "Copie e guarde em local seguro. Ela não será mostrada novamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revokeN8nApiKeyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/n8n/api-key", {
        method: "DELETE",
        headers: { 
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || "Erro ao revogar API Key");
      }
      return response.json();
    },
    onSuccess: () => {
      setGeneratedApiKey(null);
      queryClient.invalidateQueries({ queryKey: ["/api/n8n/api-key/status"] });
      toast({
        title: "API Key revogada",
        description: "A chave foi desativada. Gere uma nova se necessário.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyApiKey = async () => {
    if (generatedApiKey) {
      await navigator.clipboard.writeText(generatedApiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copiado!",
        description: "API Key copiada para a área de transferência",
      });
    }
  };

  const { data: totalExpressConfig, isLoading: isLoadingTotalExpress } = useQuery({
    queryKey: ["/api/config/total-express"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/config/total-express", {
          headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` },
          credentials: 'include',
        });
        if (!response.ok) return { configured: false };
        return response.json();
      } catch (error) {
        console.error("❌ [TotalExpress] Erro ao carregar config:", error);
        return { configured: false };
      }
    },
  });

  useEffect(() => {
    if (totalExpressConfig?.configured) {
      setTotalExpressUser(totalExpressConfig.user || "");
      setTotalExpressReid(totalExpressConfig.reid || "");
      setTotalExpressService(totalExpressConfig.serviceType || "EXP");
      const marginPercent = totalExpressConfig.profitMargin 
        ? Math.round((totalExpressConfig.profitMargin - 1) * 100).toString()
        : "40";
      setProfitMargin(marginPercent);
      setTestMode(totalExpressConfig.testMode || false);
    }
  }, [totalExpressConfig]);

  const saveTotalExpressMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/config/total-express", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar configuração");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config/total-express"] });
      setTotalExpressPass("");
      toast({
        title: "TotalExpress configurado",
        description: "Credenciais salvas com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testTotalExpressMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/config/total-express/test", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Credenciais inválidas");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Conexão com TotalExpress validada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na validação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTotalExpressMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/config/total-express", {
        method: "DELETE",
        headers: { 
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao remover configuração");
      }
      return response.json();
    },
    onSuccess: () => {
      setTotalExpressUser("");
      setTotalExpressPass("");
      setTotalExpressReid("");
      setTotalExpressService("EXP");
      setProfitMargin("40");
      setTestMode(false);
      queryClient.invalidateQueries({ queryKey: ["/api/config/total-express"] });
      toast({
        title: "Configuração removida",
        description: "Credenciais do TotalExpress foram removidas",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clearCredentialsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/credentials/clear-all", {
        method: "DELETE",
        headers: { 
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao limpar credenciais");
      }
      return response.json();
    },
    onSuccess: (data) => {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase_') || key.startsWith('credentials_')) {
          localStorage.removeItem(key);
        }
      });
      
      window.dispatchEvent(new CustomEvent('supabase-config-changed'));
      
      queryClient.invalidateQueries({ queryKey: ["/api/credentials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/config/supabase"] });
      queryClient.invalidateQueries({ queryKey: ["/api/config/hms100ms/credentials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/config/total-express"] });
      queryClient.invalidateQueries({ queryKey: ["/api/n8n/api-key/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants/me"] });
      
      toast({
        title: "Credenciais e cache limpos",
        description: `Limpo: ${data.cleared?.database?.length || 0} configs do banco, ${data.cleared?.cache?.length || 0} caches, ${data.cleared?.files?.length || 0} arquivos.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao limpar credenciais",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveTotalExpress = () => {
    if (!totalExpressUser || !totalExpressReid) {
      toast({
        title: "Campos obrigatórios",
        description: "Usuário e Reid são obrigatórios",
        variant: "destructive",
      });
      return;
    }
    if (!totalExpressConfig?.configured && !totalExpressPass) {
      toast({
        title: "Senha obrigatória",
        description: "A senha é obrigatória na primeira configuração",
        variant: "destructive",
      });
      return;
    }
    const marginDecimal = 1 + (parseFloat(profitMargin) / 100);
    saveTotalExpressMutation.mutate({
      user: totalExpressUser,
      password: totalExpressPass || undefined,
      reid: totalExpressReid,
      serviceType: totalExpressService,
      profitMargin: marginDecimal,
      testMode,
    });
  };

  const [tokenId, setTokenId] = useState("");
  const [chaveToken, setChaveToken] = useState("");
  const [showChaveToken, setShowChaveToken] = useState(false);

  const { data: bdcConfig } = useQuery({
    queryKey: ["/api/credentials/bigdatacorp"],
    queryFn: async () => {
      const response = await fetch("/api/credentials/bigdatacorp", {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` },
        credentials: 'include',
      });
      if (!response.ok) return null;
      return response.json();
    },
  });

  useEffect(() => {
    if (bdcConfig?.credentials) {
      setTokenId(bdcConfig.credentials.token_id || "");
    }
  }, [bdcConfig]);

  const saveBdcMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/credentials/bigdatacorp", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Erro ao salvar configuração");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credentials/bigdatacorp"] });
      toast({ title: "BigDataCorp configurado", description: "Credenciais salvas com sucesso" });
    },
  });

  const testBdcMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/credentials/test/bigdatacorp", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Credenciais inválidas");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Conexão com BigDataCorp validada" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  const handleSaveBdc = () => {
    saveBdcMutation.mutate({ token_id: tokenId, chave_token: chaveToken });
  };

  const handleTestBdc = () => {
    testBdcMutation.mutate({ token_id: tokenId, chave_token: chaveToken });
  };

  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [supabaseBucket, setSupabaseBucket] = useState("receipts");
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);

  const { data: supabaseConfig } = useQuery({
    queryKey: ["/api/config/supabase"],
    queryFn: async () => {
      const response = await fetch("/api/config/supabase", {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` },
        credentials: 'include',
      });
      if (!response.ok) return null;
      return response.json();
    },
  });

  const { data: supabaseCreds } = useQuery({
    queryKey: ["/api/config/supabase/credentials"],
    queryFn: async () => {
      const response = await fetch("/api/config/supabase/credentials", {
        headers: { 
          "Authorization": `Bearer ${localStorage.getItem('token')}`,
          "X-Config-Token": localStorage.getItem('token')
        },
        credentials: 'include',
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.success ? data.credentials : null;
    },
    enabled: !!supabaseConfig?.configured,
  });

  useEffect(() => {
    if (supabaseConfig?.configured) {
      setSupabaseUrl(supabaseConfig.supabaseUrl || "");
      setSupabaseBucket(supabaseConfig.supabaseBucket || "receipts");
    }
    if (supabaseCreds) {
      setSupabaseAnonKey(supabaseCreds.supabaseAnonKey || "");
    }
  }, [supabaseConfig, supabaseCreds]);

  const saveSupabaseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/config/supabase", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`,
          "X-Config-Token": localStorage.getItem('token')
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Erro ao salvar configuração");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config/supabase"] });
      queryClient.invalidateQueries({ queryKey: ["/api/config/supabase/credentials"] });
      toast({ title: "Supabase configurado", description: "Credenciais salvas com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  const testSupabaseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/config/supabase/test", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao testar conexão");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Conexão com Supabase validada" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  const handleSaveSupabase = () => {
    saveSupabaseMutation.mutate({ 
      supabaseUrl, 
      supabaseAnonKey, 
      supabaseBucket 
    });
  };

  const handleTestSupabase = () => {
    testSupabaseMutation.mutate({ 
      supabaseUrl, 
      supabaseAnonKey 
    });
  };

  const handleTestTotalExpress = () => {
    if (!totalExpressUser || !totalExpressReid) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha usuário e Reid para testar",
        variant: "destructive",
      });
      return;
    }
    testTotalExpressMutation.mutate({
      user: totalExpressUser,
      password: totalExpressPass || undefined,
      reid: totalExpressReid,
      serviceType: totalExpressService,
    });
  };

  function onSubmit(values: z.infer<typeof configSchema>) {
    updateMutation.mutate({
      nome: values.nome_empresa,
      email: values.email_contato,
      configuracoes: {
        horario_comercial: {
          inicio: values.horario_inicio,
          fim: values.horario_fim,
        },
        duracao_padrao: 60,
        cores: {
          primaria: values.cor_primaria,
          secundaria: values.cor_secundaria,
        },
      },
    });

    if (values.hms_app_access_key && values.hms_app_secret) {
      saveHms100msMutation.mutate({
        appAccessKey: values.hms_app_access_key,
        appSecret: values.hms_app_secret,
        managementToken: values.hms_management_token,
        templateId: values.hms_template_id,
        apiBaseUrl: values.hms_api_base_url,
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações da sua empresa e integrações.
        </p>
      </div>
      <Separator />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Dados da Empresa</CardTitle>
                <CardDescription>
                  Informações visíveis para seus clientes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="nome_empresa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Empresa</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email_contato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email de Contato</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-blue-500" />
                  Supabase Database
                </CardTitle>
                <CardDescription>
                  Configuração do banco de dados e armazenamento.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <FormLabel>URL do Projeto Supabase</FormLabel>
                  <Input 
                    value={supabaseUrl} 
                    onChange={(e) => setSupabaseUrl(e.target.value)} 
                    placeholder="https://xyz.supabase.co"
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel>Chave Anônima (anon/public)</FormLabel>
                  <div className="relative">
                    <Input 
                      type={showSupabaseKey ? "text" : "password"}
                      value={supabaseAnonKey} 
                      onChange={(e) => setSupabaseAnonKey(e.target.value)} 
                      placeholder="Sua chave anônima"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                    >
                      {showSupabaseKey ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <FormLabel>Bucket de Armazenamento</FormLabel>
                  <Input 
                    value={supabaseBucket} 
                    onChange={(e) => setSupabaseBucket(e.target.value)} 
                    placeholder="receipts"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleTestSupabase}
                    disabled={testSupabaseMutation.isPending}
                  >
                    {testSupabaseMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Testar Conexão
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleSaveSupabase}
                    disabled={saveSupabaseMutation.isPending}
                  >
                    {saveSupabaseMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Configuração
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  BigDataCorp (CPF)
                </CardTitle>
                <CardDescription>
                  Configurações para consulta de CPF e Compliance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <FormLabel>Token ID</FormLabel>
                  <Input 
                    value={tokenId} 
                    onChange={(e) => setTokenId(e.target.value)} 
                    placeholder="Seu Token ID"
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel>Chave Token</FormLabel>
                  <div className="relative">
                    <Input 
                      type={showChaveToken ? "text" : "password"}
                      value={chaveToken} 
                      onChange={(e) => setChaveToken(e.target.value)} 
                      placeholder="Sua Chave Token"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowChaveToken(!showChaveToken)}
                    >
                      {showChaveToken ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleTestBdc}
                    disabled={testBdcMutation.isPending}
                  >
                    {testBdcMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Testar Conexão
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleSaveBdc}
                    disabled={saveBdcMutation.isPending}
                  >
                    {saveBdcMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar BigDataCorp
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Horário Comercial</CardTitle>
                <CardDescription>
                  Defina os horários disponíveis para agendamento.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="horario_inicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Abertura</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="horario_fim"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fechamento</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Personalização</CardTitle>
                <CardDescription>
                  Cores e identidade visual da sua marca.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cor_primaria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor Primária</FormLabel>
                        <div className="flex gap-2">
                          <div 
                            className="w-8 h-8 rounded border" 
                            style={{ backgroundColor: field.value }}
                          />
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cor_secundaria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor Secundária</FormLabel>
                         <div className="flex gap-2">
                          <div 
                            className="w-8 h-8 rounded border" 
                            style={{ backgroundColor: field.value }}
                          />
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-blue-500" />
                  <div>
                    <CardTitle>Integração com Reunião (100ms)</CardTitle>
                    <CardDescription>
                      Configure as credenciais para ativar videoconferência em tempo real
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="hms_app_access_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>App Access Key *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="646..." />
                        </FormControl>
                        <FormDescription>
                          Chave de acesso do 100ms
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hms_app_secret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>App Secret *</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormDescription>
                          Chave secreta do 100ms
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hms_management_token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Management Token</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormDescription>
                          Token para gerenciar salas (opcional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hms_template_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="645..." />
                        </FormControl>
                        <FormDescription>
                          ID do template de sala
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="hms_api_base_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Base URL</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        URL base da API do 100ms (padrão: https://api.100ms.live/v2)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    ℹ️ <strong>Como obter as credenciais:</strong>
                  </p>
                  <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-disc">
                    <li>Visite <a href="https://dashboard.100ms.live" target="_blank" rel="noopener noreferrer" className="underline font-semibold">dashboard.100ms.live</a></li>
                    <li>Vá para Configurações → Credenciais</li>
                    <li>Copie App Access Key e App Secret</li>
                    <li>Configure um Template de Sala para obter o Template ID</li>
                  </ul>
                </div>

              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-orange-500" />
                  <div>
                    <CardTitle>Integração N8N</CardTitle>
                    <CardDescription>
                      Gere uma API Key para criar reuniões automaticamente via N8N ou outras automações
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!n8nApiKeyStatus?.hasConfig ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-900">
                      Configure primeiro as credenciais do 100ms acima para poder gerar a API Key do N8N.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">Status da API Key:</span>
                        {isLoadingN8nStatus ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : n8nApiKeyStatus?.hasApiKey ? (
                          <Badge variant="default" className="bg-green-500">Ativa</Badge>
                        ) : (
                          <Badge variant="secondary">Não configurada</Badge>
                        )}
                      </div>
                      {n8nApiKeyStatus?.createdAt && (
                        <span className="text-xs text-muted-foreground">
                          Criada em: {new Date(n8nApiKeyStatus.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>

                    {generatedApiKey && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                        <p className="text-sm font-medium text-green-900">
                          Sua nova API Key foi gerada! Copie e guarde em local seguro:
                        </p>
                        <div className="flex items-center gap-2">
                          <Input
                            readOnly
                            type={showApiKey ? "text" : "password"}
                            value={generatedApiKey}
                            className="font-mono text-sm bg-white"
                            data-testid="input-n8n-api-key"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => setShowApiKey(!showApiKey)}
                            data-testid="button-toggle-api-key"
                          >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={copyApiKey}
                            data-testid="button-copy-api-key"
                          >
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-amber-700">
                          Esta chave não será mostrada novamente. Se perder, gere uma nova.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={n8nApiKeyStatus?.hasApiKey ? "outline" : "default"}
                        disabled={generateN8nApiKeyMutation.isPending}
                        onClick={() => generateN8nApiKeyMutation.mutate()}
                        data-testid="button-generate-n8n-key"
                      >
                        {generateN8nApiKeyMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            {n8nApiKeyStatus?.hasApiKey ? "Regenerar API Key" : "Gerar API Key"}
                          </>
                        )}
                      </Button>

                      {n8nApiKeyStatus?.hasApiKey && (
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={revokeN8nApiKeyMutation.isPending}
                          onClick={() => revokeN8nApiKeyMutation.mutate()}
                          data-testid="button-revoke-n8n-key"
                        >
                          {revokeN8nApiKeyMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Revogando...
                            </>
                          ) : (
                            <>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Revogar API Key
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                      <p className="text-sm font-medium text-blue-900">
                        Como usar no N8N:
                      </p>
                      <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
                        <li>Use o nó <strong>HTTP Request</strong> com método <strong>POST</strong></li>
                        <li>URL: <code className="bg-blue-100 px-1 rounded">/api/n8n/{'{tenantId}'}/reunioes</code></li>
                        <li>Header: <code className="bg-blue-100 px-1 rounded">X-N8N-API-Key: sua_chave_aqui</code></li>
                        <li>Body (JSON): <code className="bg-blue-100 px-1 rounded">{`{"titulo": "Nome da Reunião", "nome": "Participante"}`}</code></li>
                      </ul>
                      <p className="text-xs text-blue-700 mt-2">
                        As reuniões criadas automaticamente herdam o design e cores da sua configuração.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-emerald-500" />
                    <div>
                      <CardTitle>Integração TotalExpress</CardTitle>
                      <CardDescription>
                        Configure as credenciais para cotação e envio de fretes
                      </CardDescription>
                    </div>
                  </div>
                  {isLoadingTotalExpress ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : totalExpressConfig?.configured ? (
                    <Badge variant="default" className="bg-green-500" data-testid="badge-totalexpress-configured">Configurado</Badge>
                  ) : (
                    <Badge variant="secondary" data-testid="badge-totalexpress-not-configured">Não configurado</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Usuário *</label>
                    <Input
                      value={totalExpressUser}
                      onChange={(e) => setTotalExpressUser(e.target.value)}
                      placeholder="Usuário TotalExpress"
                      data-testid="input-totalexpress-user"
                    />
                    <p className="text-xs text-muted-foreground">Usuário de acesso à API</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Senha {!totalExpressConfig?.configured && "*"}</label>
                    <div className="flex gap-2">
                      <Input
                        type={showTotalExpressPass ? "text" : "password"}
                        value={totalExpressPass}
                        onChange={(e) => setTotalExpressPass(e.target.value)}
                        placeholder={totalExpressConfig?.configured ? "••••••••" : "Senha TotalExpress"}
                        data-testid="input-totalexpress-password"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => setShowTotalExpressPass(!showTotalExpressPass)}
                        data-testid="button-toggle-totalexpress-password"
                      >
                        {showTotalExpressPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {totalExpressConfig?.configured 
                        ? "Deixe em branco para manter a senha atual" 
                        : "Senha de acesso à API"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reid *</label>
                    <Input
                      value={totalExpressReid}
                      onChange={(e) => setTotalExpressReid(e.target.value)}
                      placeholder="Código Reid"
                      data-testid="input-totalexpress-reid"
                    />
                    <p className="text-xs text-muted-foreground">Código de identificação do remetente</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Serviço</label>
                    <Select value={totalExpressService} onValueChange={setTotalExpressService}>
                      <SelectTrigger data-testid="select-totalexpress-service">
                        <SelectValue placeholder="Selecione o serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EXP" data-testid="select-item-exp">EXP - Expresso</SelectItem>
                        <SelectItem value="ESP" data-testid="select-item-esp">ESP - Especial</SelectItem>
                        <SelectItem value="PRM" data-testid="select-item-prm">PRM - Premium</SelectItem>
                        <SelectItem value="STD" data-testid="select-item-std">STD - Standard</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Modalidade de entrega padrão</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Margem de Lucro (%)</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="500"
                        value={profitMargin}
                        onChange={(e) => setProfitMargin(e.target.value)}
                        placeholder="40"
                        className="w-24"
                        data-testid="input-totalexpress-profit-margin"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Markup sobre o valor do frete (ex: 40 = 40% de margem)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Modo de Teste</label>
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                        id="totalexpress-testmode"
                        checked={testMode}
                        onCheckedChange={(checked) => setTestMode(!!checked)}
                        data-testid="checkbox-totalexpress-testmode"
                      />
                      <label 
                        htmlFor="totalexpress-testmode" 
                        className="text-sm text-muted-foreground cursor-pointer"
                      >
                        Usar ambiente de homologação
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ative para testar sem gerar envios reais
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={testTotalExpressMutation.isPending || !totalExpressUser || !totalExpressReid}
                    onClick={handleTestTotalExpress}
                    data-testid="button-test-totalexpress"
                  >
                    {testTotalExpressMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testando...
                      </>
                    ) : (
                      "Testar Conexão"
                    )}
                  </Button>
                  <Button
                    type="button"
                    disabled={saveTotalExpressMutation.isPending || !totalExpressUser || !totalExpressReid}
                    onClick={handleSaveTotalExpress}
                    data-testid="button-save-totalexpress"
                  >
                    {saveTotalExpressMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Configuração"
                    )}
                  </Button>
                  {totalExpressConfig?.configured && (
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={deleteTotalExpressMutation.isPending}
                      onClick={() => deleteTotalExpressMutation.mutate()}
                      data-testid="button-delete-totalexpress"
                    >
                      {deleteTotalExpressMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Removendo...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover Configuração
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-emerald-900">
                    ℹ️ Sobre a TotalExpress:
                  </p>
                  <ul className="text-sm text-emerald-800 space-y-1 ml-4 list-disc">
                    <li>Solicite suas credenciais no portal da TotalExpress</li>
                    <li>O código Reid identifica seu cadastro como remetente</li>
                    <li>A margem de lucro será aplicada sobre o valor do frete retornado</li>
                    <li>Use o modo de teste para validar a integração antes de ir para produção</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline"
              disabled={testHms100msMutation.isPending || !form.getValues("hms_app_access_key") || !form.getValues("hms_app_secret")}
              onClick={() => testHms100msMutation.mutate({
                appAccessKey: form.getValues("hms_app_access_key"),
                appSecret: form.getValues("hms_app_secret"),
              })}
              data-testid="button-test-100ms"
            >
              {testHms100msMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                "Testar Conexão 100ms"
              )}
            </Button>
            <Button type="submit" size="lg" disabled={updateMutation.isPending} data-testid="button-save-config">
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Configuração"
              )}
            </Button>
          </div>
        </form>
      </Form>

      <Separator className="my-8" />

      <Card className="border-destructive/50 bg-destructive/5" data-testid="card-danger-zone">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
              <CardDescription>
                Ações destrutivas que não podem ser desfeitas.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="font-medium">Limpar Credenciais e Cache</p>
              <p className="text-sm text-muted-foreground">
                Remove todas as credenciais de integrações (Supabase, N8N, Evolution API, Pluggy) e limpa caches do sistema.
                Útil para testar com novas credenciais ou resetar o ambiente.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={clearCredentialsMutation.isPending}
                  data-testid="button-clear-credentials"
                >
                  {clearCredentialsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Limpando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Limpar Credenciais e Cache
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent data-testid="dialog-clear-credentials">
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpar Todas as Credenciais?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-4">
                      <p>Esta ação irá remover:</p>
                      <ul className="list-disc pl-4 space-y-1 text-sm">
                        <li>Credenciais do Supabase, N8N, Evolution API e Pluggy</li>
                        <li>Configurações de cache e estados de sincronização</li>
                        <li>Arquivos de configuração local</li>
                      </ul>
                      <p className="font-medium text-foreground">O que será preservado:</p>
                      <ul className="list-disc pl-4 space-y-1 text-sm">
                        <li>Dados de usuários e tenant (nome, email, horário)</li>
                        <li>Contratos de assinatura</li>
                        <li>Configurações de personalização</li>
                        <li>Trilha de auditoria</li>
                      </ul>
                      <p className="text-destructive font-medium">Esta ação não pode ser desfeita.</p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-clear">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => clearCredentialsMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-confirm-clear"
                  >
                    Limpar Tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
