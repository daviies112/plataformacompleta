import { useEffect } from "react";
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
import { Loader2, Video } from "lucide-react";

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

    </div>
  );
}
