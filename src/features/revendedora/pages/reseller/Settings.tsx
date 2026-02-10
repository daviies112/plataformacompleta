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
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCompany } from '@/features/revendedora/contexts/CompanyContext';
import { useToast } from '@/hooks/use-toast';
import { resellerFetch } from '../../lib/resellerAuth';

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

const supabaseSchema = z.object({
  supabase_url: z.string().url('URL inválida').min(1, 'URL é obrigatória'),
  supabase_anon_key: z.string().min(10, 'Anon Key deve ter pelo menos 10 caracteres'),
  supabase_service_key: z.string().optional(),
});

// Schema mais flexível para atualizações quando já configurado
const supabaseUpdateSchema = z.object({
  supabase_url: z.string().url('URL inválida').min(1, 'URL é obrigatória'),
  supabase_anon_key: z.string().optional().refine(
    (val) => !val || val.length >= 10,
    'Anon Key deve ter pelo menos 10 caracteres'
  ),
  supabase_service_key: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type NotificationsFormValues = z.infer<typeof notificationsSchema>;
type SupabaseFormValues = z.infer<typeof supabaseSchema>;

export default function Settings() {
  const { reseller } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [openSections, setOpenSections] = useState<string[]>(['supabase']);
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [showServiceKey, setShowServiceKey] = useState(false);

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
      const response = await resellerFetch('/api/reseller/settings');
      if (!response.ok) return null;
      return response.json();
    },
  });

  const { data: supabaseConfig, isLoading: isLoadingSupabase, refetch: refetchSupabase } = useQuery({
    queryKey: ['/api/reseller/supabase-config'],
    queryFn: async () => {
      const response = await resellerFetch('/api/reseller/supabase-config');
      if (!response.ok) return null;
      return response.json();
    },
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

  // Usar schema flexível quando já configurado (permite atualizar apenas URL)
  const isConfigured = supabaseConfig?.configured || false;
  
  const supabaseForm = useForm<SupabaseFormValues>({
    resolver: zodResolver(isConfigured ? supabaseUpdateSchema : supabaseSchema),
    defaultValues: {
      supabase_url: '',
      supabase_anon_key: '',
      supabase_service_key: '',
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

  useEffect(() => {
    if (supabaseConfig) {
      // Carregar URL e anon_key (service_key apenas indica se existe)
      supabaseForm.reset({
        supabase_url: supabaseConfig.supabase_url || '',
        supabase_anon_key: supabaseConfig.supabase_anon_key || '',
        supabase_service_key: supabaseConfig.has_service_key ? '••••••••••••••••••••' : '',
      });
    }
  }, [supabaseConfig, supabaseForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const response = await resellerFetch('/api/reseller/profile', {
        method: 'PUT',
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
      const response = await resellerFetch('/api/reseller/notifications', {
        method: 'PUT',
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

  const updateSupabaseMutation = useMutation({
    mutationFn: async (data: SupabaseFormValues) => {
      // Primeiro tenta salvar na tabela admin_supabase_credentials (Supabase Owner)
      const adminResponse = await resellerFetch('/api/reseller/admin-supabase-credentials', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      
      if (adminResponse.ok) {
        const result = await adminResponse.json();
        console.log('[Settings] Credenciais salvas via admin route:', result);
        return result;
      }
      
      // Fallback: usa a rota local
      console.log('[Settings] Fallback para rota local');
      const response = await resellerFetch('/api/reseller/supabase-config', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar credenciais');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/supabase-config'] });
      const storageLocation = data?.storage === 'supabase_owner' 
        ? 'na tabela admin_supabase_credentials' 
        : 'localmente';
      toast({
        title: 'Credenciais salvas',
        description: `Suas credenciais Supabase foram salvas ${storageLocation}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar as credenciais.',
        variant: 'destructive',
      });
    },
  });

  const testSupabaseConnection = useMutation({
    mutationFn: async () => {
      const response = await resellerFetch('/api/reseller/supabase-config/test', {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Conexão falhou');
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Conexão OK',
        description: data.message || 'Conexão com Supabase estabelecida com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro de conexão',
        description: error.message || 'Não foi possível conectar ao Supabase.',
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
                      <CardDescription>Configure suas credenciais do Supabase</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {supabaseConfig?.configured && (
                      <Badge variant="default" className="bg-green-500">
                        <Check className="h-3 w-3 mr-1" />
                        Configurado
                      </Badge>
                    )}
                    <ChevronDown className={`h-5 w-5 transition-transform ${openSections.includes('supabase') ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Separator className="mb-6" />

                {isLoadingSupabase ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {supabaseConfig?.inherited && (
                      <Alert className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                        <Info className="h-4 w-4 text-blue-500" />
                        <AlertDescription className="text-blue-700 dark:text-blue-300">
                          Você está usando credenciais herdadas do administrador. Configure suas próprias credenciais para ter independência total.
                        </AlertDescription>
                      </Alert>
                    )}

                    {supabaseConfig?.configured && (
                      <Alert className="mb-4 border-green-200 bg-green-50 dark:bg-green-900/20">
                        <Check className="h-4 w-4 text-green-500" />
                        <AlertDescription className="text-green-700 dark:text-green-300">
                          Suas credenciais Supabase estão configuradas. Você pode atualizar a URL sem precisar reenviar as chaves. Para alterar as chaves, preencha-as novamente.
                        </AlertDescription>
                      </Alert>
                    )}

                    <Form {...supabaseForm}>
                      <form onSubmit={supabaseForm.handleSubmit((data) => updateSupabaseMutation.mutate(data))} className="space-y-4">
                        <FormField
                        control={supabaseForm.control}
                        name="supabase_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL do Projeto Supabase</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="https://seu-projeto.supabase.co"
                                data-testid="input-supabase-url"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Encontre a URL no painel do Supabase em Settings &gt; API
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={supabaseForm.control}
                        name="supabase_anon_key"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Anon Key (Chave Pública)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  type={showAnonKey ? 'text' : 'password'}
                                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                  className="pr-10"
                                  data-testid="input-supabase-anon-key"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => setShowAnonKey(!showAnonKey)}
                                  data-testid="button-toggle-anon-key"
                                >
                                  {showAnonKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormDescription className="text-xs">
                              Chave pública para acessar o banco de dados
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={supabaseForm.control}
                        name="supabase_service_key"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Role Key (Opcional)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  type={showServiceKey ? 'text' : 'password'}
                                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                  className="pr-10"
                                  data-testid="input-supabase-service-key"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => setShowServiceKey(!showServiceKey)}
                                  data-testid="button-toggle-service-key"
                                >
                                  {showServiceKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormDescription className="text-xs">
                              Chave de serviço com acesso total (use com cuidado)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                        <div className="flex items-center gap-2 pt-4">
                          <Button
                            type="submit"
                            disabled={updateSupabaseMutation.isPending}
                            data-testid="button-save-supabase"
                          >
                            {updateSupabaseMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Salvar Credenciais
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => testSupabaseConnection.mutate()}
                            disabled={testSupabaseConnection.isPending || (!supabaseConfig?.configured && !supabaseConfig?.inherited)}
                            data-testid="button-test-supabase"
                          >
                            {testSupabaseConnection.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Testar Conexão
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

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
      </div>
    </div>
  );
}
