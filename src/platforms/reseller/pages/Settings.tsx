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
import { useResellerAuth } from '../hooks/useResellerAuth';
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
  const { user } = useResellerAuth();
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
    enabled: !!user,
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
    enabled: !!user,
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
    if (user) {
      profileForm.reset({
        nome: user.nome || '',
        email: user.email || '',
        telefone: user.telefone || '',
      });
    }
  }, [user, profileForm]);

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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-settings-title">
            Configurações
          </h1>
          <p className="text-muted-foreground">
            Gerencie suas preferências e configurações do sistema
          </p>
        </div>
      </div>
      
      <Separator />

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
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">Perfil do Usuário</CardTitle>
                      <CardDescription>Informações da sua conta</CardDescription>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform ${
                      openSections.includes('profile') ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Form {...profileForm}>
                  <form
                    onSubmit={profileForm.handleSubmit((data) =>
                      updateProfileMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={profileForm.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Seu nome completo"
                              data-testid="input-profile-name"
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
                              placeholder="(00) 00000-0000"
                              data-testid="input-profile-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Salvar Perfil
                      </Button>
                    </div>
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
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">Notificações</CardTitle>
                      <CardDescription>Configure como você recebe alertas</CardDescription>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform ${
                      openSections.includes('notifications') ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Form {...notificationsForm}>
                  <form
                    onSubmit={notificationsForm.handleSubmit((data) =>
                      updateNotificationsMutation.mutate(data)
                    )}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Notificações por Email
                      </h4>
                      <FormField
                        control={notificationsForm.control}
                        name="email_vendas"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm font-medium">
                                Novas Vendas
                              </FormLabel>
                              <FormDescription className="text-xs">
                                Receba um email quando uma venda for realizada
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-email-sales"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={notificationsForm.control}
                        name="email_comissoes"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm font-medium">
                                Comissões
                              </FormLabel>
                              <FormDescription className="text-xs">
                                Receba notificações sobre pagamentos de comissão
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-email-commissions"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={notificationsForm.control}
                        name="email_promocoes"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm font-medium">
                                Promoções e Novidades
                              </FormLabel>
                              <FormDescription className="text-xs">
                                Fique por dentro de novas promoções e produtos
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-email-promotions"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Notificações Push
                      </h4>
                      <FormField
                        control={notificationsForm.control}
                        name="push_vendas"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm font-medium">
                                Alertas de Vendas
                              </FormLabel>
                              <FormDescription className="text-xs">
                                Notificação instantânea ao realizar uma venda
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-push-sales"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={notificationsForm.control}
                        name="push_estoque"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm font-medium">
                                Alertas de Estoque
                              </FormLabel>
                              <FormDescription className="text-xs">
                                Notificação quando produtos estiverem em baixa
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-push-stock"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={updateNotificationsMutation.isPending}
                        data-testid="button-save-notifications"
                      >
                        {updateNotificationsMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Salvar Preferências
                      </Button>
                    </div>
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
                    <Database className="h-5 w-5 text-green-600" />
                    <div>
                      <CardTitle className="text-lg">Supabase Database</CardTitle>
                      <CardDescription>Credenciais do banco de dados</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {supabaseConfig?.supabase_url ? (
                      <Badge variant="default" className="bg-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Configurado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Não configurado
                      </Badge>
                    )}
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform ${
                        openSections.includes('supabase') ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                {supabaseConfig?.inherited_from_admin && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>Credenciais herdadas do administrador</strong>
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                      As credenciais do Supabase são configuradas pelo seu administrador e herdadas automaticamente.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">URL do Projeto</label>
                    <Input
                      value={supabaseConfig?.supabase_url || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-supabase-url"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      URL do projeto Supabase
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Anon Key (Pública)</label>
                    <Input
                      value={supabaseConfig?.supabase_anon_key || ''}
                      disabled
                      type="password"
                      className="mt-1 bg-muted"
                      data-testid="input-supabase-anon-key"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Chave pública para acesso anônimo
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Service Role Key (Secreta)</label>
                    <Input
                      value={supabaseConfig?.supabase_service_key || ''}
                      disabled
                      type="password"
                      className="mt-1 bg-muted"
                      data-testid="input-supabase-service-key"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Chave secreta com acesso total
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => testSupabaseConnection.mutate()}
                    disabled={
                      testSupabaseConnection.isPending ||
                      !supabaseConfig?.supabase_url
                    }
                    data-testid="button-test-supabase"
                  >
                    {testSupabaseConnection.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Database className="h-4 w-4 mr-2" />
                    )}
                    Testar Conexão
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
}
