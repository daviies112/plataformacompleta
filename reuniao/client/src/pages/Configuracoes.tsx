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
import { Loader2 } from "lucide-react";

const configSchema = z.object({
  nome_empresa: z.string().min(2, "Nome muito curto"),
  email_contato: z.string().email(),
  horario_inicio: z.string(),
  horario_fim: z.string(),
  cor_primaria: z.string(),
  cor_secundaria: z.string(),
  token_100ms: z.string().optional(),
  app_access_key: z.string().optional(),
  app_secret: z.string().optional(),
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
      token_100ms: "",
      app_access_key: "",
      app_secret: "",
    },
  });

  useEffect(() => {
    if (tenant) {
      const config = tenant.configuracoes || {};
      form.reset({
        nome_empresa: tenant.nome || "",
        email_contato: tenant.email || "",
        horario_inicio: config.horario_comercial?.inicio || "09:00",
        horario_fim: config.horario_comercial?.fim || "18:00",
        cor_primaria: config.cores?.primaria || "#3B82F6",
        cor_secundaria: config.cores?.secundaria || "#10B981",
        token_100ms: tenant.token100ms || "",
        app_access_key: tenant.appAccessKey || "",
        app_secret: tenant.appSecret || "",
      });
    }
  }, [tenant, form]);

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
      token100ms: values.token_100ms,
      appAccessKey: values.app_access_key,
      appSecret: values.app_secret,
    });
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

            <Card>
              <CardHeader>
                <CardTitle>Credenciais 100ms</CardTitle>
                <CardDescription>
                  Chaves de API para vídeo e áudio em tempo real.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="app_access_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>App Access Key</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="646..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="app_secret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>App Secret</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="token_100ms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Management Token</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormDescription>
                        Token usado para criar salas de vídeo.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </div>
        </form>
      </Form>

    </div>
  );
}
