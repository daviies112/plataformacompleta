import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  User,
  Bell,
  Database,
  ChevronDown,
  Loader2,
  Save,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useCompany } from '@/features/revendedora/contexts/CompanyContext';
import { useToast } from '@/hooks/use-toast';

const profileSchema = z.object({
  nome: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('Email inválido'),
  telefone: z.string().optional(),
});

const notificationsSchema = z.object({
  email_vendas: z.boolean(),
  email_comissoes: z.boolean(),
  email_promocoes: z.boolean(),
  push_vendas: z.boolean(),
  push_estoque: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type NotificationsFormValues = z.infer<typeof notificationsSchema>;

export default function Settings() {
  const { reseller } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [openSections, setOpenSections] = useState<string[]>(['profile']);

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/reseller/settings'],
    queryFn: async () => {
      const response = await fetch('/api/reseller/settings', {
        credentials: 'include',
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!reseller,
  });

  const { data: supabaseConfig, isLoading: isLoadingSupabase } = useQuery({
    queryKey: ['/api/reseller/supabase-config'],
    queryFn: async () => {
      const response = await fetch('/api/reseller/supabase-config', {
        credentials: 'include',
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!reseller,
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
    },
  });

  const notificationsForm = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: {
      email_vendas: true,
      email_comissoes: true,
      email_promocoes: false,
      push_vendas: true,
      push_estoque: true,
    },
  });

  useEffect(() => {
    if (reseller) {
      profileForm.reset({
        nome: reseller.nome || '',
        email: reseller.email || '',
        telefone: reseller.telefone || '',
      });
    }
  }, [reseller, profileForm]);

  useEffect(() => {
    if (settings?.notifications) {
      notificationsForm.reset(settings.notifications);
    }
  }, [settings, notificationsForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const response = await fetch('/api/reseller/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao atualizar perfil');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/settings'] });
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o perfil.',
        variant: 'destructive',
      });
    },
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: NotificationsFormValues) => {
      const response = await fetch('/api/reseller/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao atualizar notificações');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/settings'] });
      toast({
        title: 'Notificações atualizadas',
        description: 'Suas preferências foram salvas.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar as notificações.',
        variant: 'destructive',
      });
    },
  });

  const testSupabaseConnection = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/reseller/supabase-config/test', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Conexão falhou');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Conexão OK',
        description: 'Conexão com Supabase estabelecida com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao Supabase. Verifique as credenciais.',
        variant: 'destructive',
      });
    },
  });

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-settings-title">
            Configurações
          </h1>
          <p className="text-muted-foreground" data-testid="text-settings-description">
            Gerencie suas informações e preferências
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Collapsible
          open={openSections.includes('profile')}
          onOpenChange={() => toggleSection('profile')}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover-elevate rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-blue-500" />
                    <div>
                      <CardTitle className="text-lg">Perfil do Usuário</CardTitle>
                      <CardDescription>Suas informações pessoais</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.includes('profile') ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Separator className="mb-6" />
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome completo</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Seu nome completo"
                              data-testid="input-profile-nome"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              disabled
                              className="bg-muted"
                              data-testid="input-profile-email"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            O email não pode ser alterado
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="(11) 99999-9999"
                              data-testid="input-profile-telefone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar Perfil
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible
          open={openSections.includes('notifications')}
          onOpenChange={() => toggleSection('notifications')}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover-elevate rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-yellow-500" />
                    <div>
                      <CardTitle className="text-lg">Notificações</CardTitle>
                      <CardDescription>Configure suas preferências de notificação</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.includes('notifications') ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Separator className="mb-6" />
                <Form {...notificationsForm}>
                  <form onSubmit={notificationsForm.handleSubmit((data) => updateNotificationsMutation.mutate(data))} className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-3">Notificações por Email</h4>
                      <div className="space-y-4">
                        <FormField
                          control={notificationsForm.control}
                          name="email_vendas"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel className="text-base">Novas vendas</FormLabel>
                                <FormDescription>Receber email quando houver nova venda</FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-email-vendas"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={notificationsForm.control}
                          name="email_comissoes"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel className="text-base">Comissões</FormLabel>
                                <FormDescription>Receber resumo de comissões</FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-email-comissoes"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={notificationsForm.control}
                          name="email_promocoes"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel className="text-base">Promoções</FormLabel>
                                <FormDescription>Receber ofertas e promoções</FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-email-promocoes"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-3">Notificações Push</h4>
                      <div className="space-y-4">
                        <FormField
                          control={notificationsForm.control}
                          name="push_vendas"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel className="text-base">Alertas de vendas</FormLabel>
                                <FormDescription>Notificação instantânea de vendas</FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-push-vendas"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={notificationsForm.control}
                          name="push_estoque"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel className="text-base">Alertas de estoque</FormLabel>
                                <FormDescription>Notificação de estoque baixo</FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-push-estoque"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={updateNotificationsMutation.isPending}
                      data-testid="button-save-notifications"
                    >
                      {updateNotificationsMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar Preferências
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible
          open={openSections.includes('supabase')}
          onOpenChange={() => toggleSection('supabase')}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover-elevate rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-green-500" />
                    <div>
                      <CardTitle className="text-lg">Banco de Dados Supabase</CardTitle>
                      <CardDescription>Credenciais herdadas do administrador</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Somente Leitura</Badge>
                    <ChevronDown className={`h-5 w-5 transition-transform ${openSections.includes('supabase') ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Separator className="mb-6" />

                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 mb-6 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Credenciais Herdadas
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                      As credenciais do Supabase são gerenciadas pelo seu administrador. 
                      Você tem acesso somente leitura para visualizar as configurações.
                    </p>
                  </div>
                </div>

                {isLoadingSupabase ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : supabaseConfig ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">URL do Projeto</label>
                      <Input
                        value={supabaseConfig.url || 'Não configurado'}
                        disabled
                        className="bg-muted mt-1"
                        data-testid="input-supabase-url"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Anon Key</label>
                      <Input
                        value={supabaseConfig.anon_key || '••••••••'}
                        disabled
                        className="bg-muted mt-1"
                        data-testid="input-supabase-anon-key"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Service Role Key</label>
                      <Input
                        value={supabaseConfig.service_role_key || '••••••••'}
                        disabled
                        className="bg-muted mt-1"
                        data-testid="input-supabase-service-key"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => testSupabaseConnection.mutate()}
                        disabled={testSupabaseConnection.isPending}
                        data-testid="button-test-supabase"
                      >
                        {testSupabaseConnection.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Testar Conexão
                      </Button>
                      {supabaseConfig.connected && (
                        <Badge variant="default" className="bg-green-500">
                          <Check className="h-3 w-3 mr-1" />
                          Conectado
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Credenciais não configuradas pelo administrador</p>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
}
