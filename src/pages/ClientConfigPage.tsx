import { useState } from 'react';
import { PremiumCard } from '@/platforms/shared/premium/PremiumCard';
import { PremiumButton } from '@/platforms/shared/premium/PremiumButton';
import { PremiumInput } from '@/platforms/shared/premium/PremiumInput';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Calendar, Video, MessageCircle, Zap, CheckCircle, AlertTriangle, Save, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

const ClientConfigPage = () => {
  const { credentials, updateCredentials } = useAuth();
  const [activeTab, setActiveTab] = useState('supabase');
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  const [formData, setFormData] = useState({
    supabase: { url: '', anon_key: '' },
    google_calendar: { client_id: '', client_secret: '', calendar_id: '' },
    google_meet: { client_id: '', client_secret: '' },
    whatsapp: { phone_number: '', api_key: '', instance_id: '' },
    evolution_api: { api_url: '', api_key: '', instance: '' }
  });

  const integrations = [
    {
      id: 'supabase',
      name: 'Supabase Database',
      icon: Database,
      status: credentials?.supabase_configured || false,
      description: 'Configuração da base de dados Supabase',
      color: 'emerald'
    },
    {
      id: 'google_calendar',
      name: 'Google Calendar',
      icon: Calendar,
      status: credentials?.google_calendar || false,
      description: 'Integração com Google Calendar para agendamentos',
      color: 'blue'
    },
    {
      id: 'google_meet',
      name: 'Google Meet',
      icon: Video,
      status: credentials?.google_meet || false,
      description: 'Criação automática de links do Google Meet',
      color: 'purple'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      icon: MessageCircle,
      status: credentials?.whatsapp || false,
      description: 'Envio de mensagens pelo WhatsApp',
      color: 'green'
    },
    {
      id: 'evolution_api',
      name: 'Evolution API',
      icon: Zap,
      status: credentials?.evolution_api || false,
      description: 'API para automação de WhatsApp',
      color: 'yellow'
    }
  ];

  const handleSave = async (integrationType: string) => {
    setIsLoading(true);
    setSaveMessage('');
    
    try {
      const dataToSave = formData[integrationType as keyof typeof formData];
      const success = await updateCredentials(integrationType, dataToSave);
      if (success) {
        setSaveMessage('Configurações salvas com sucesso!');
        // Disparar evento para outros componentes recarregarem dados (como o Calendário)
        window.dispatchEvent(new CustomEvent('supabase-config-changed'));
      } else {
        setSaveMessage('Erro ao salvar configurações. Tente novamente.');
      }
    } catch (error) {
      setSaveMessage('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const updateFormField = (integrationType: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [integrationType]: {
        ...prev[integrationType as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const renderConfigForm = (integration: any) => {
    switch (integration.id) {
      case 'supabase':
        return (
          <div className="space-y-4">
            <PremiumInput
              label="URL do Projeto Supabase"
              placeholder="https://xxxxxxxxxxx.supabase.co"
              value={formData.supabase.url}
              onChange={(e) => updateFormField('supabase', 'url', e.target.value)}
              data-testid="input-supabase-url"
            />
            <PremiumInput
              label="Chave Anônima (anon/public)"
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={formData.supabase.anon_key}
              onChange={(e) => updateFormField('supabase', 'anon_key', e.target.value)}
              data-testid="input-supabase-anon-key"
            />
            <Alert className="bg-blue-500/10 border-blue-500/20">
              <AlertTriangle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-sm text-blue-300/90">
                <strong>Como obter essas credenciais:</strong><br/>
                1. Acesse seu projeto no Supabase Dashboard<br/>
                2. Vá em Settings → API<br/>
                3. Copie a URL e a chave anon/public
              </AlertDescription>
            </Alert>
          </div>
        );
      
      case 'google_calendar':
        return (
          <div className="space-y-4">
            <PremiumInput
              label="Client ID"
              placeholder="123456789-abcdef.apps.googleusercontent.com"
              data-testid="input-google-client-id"
            />
            <PremiumInput
              label="Client Secret"
              type="password"
              placeholder="GOCSPX-example-secret-key"
              data-testid="input-google-client-secret"
            />
            <PremiumInput
              label="Calendar ID"
              placeholder="primary ou email@gmail.com"
              data-testid="input-google-calendar-id"
            />
          </div>
        );
      
      case 'google_meet':
        return (
          <div className="space-y-4">
            <PremiumInput
              label="Client ID"
              placeholder="123456789-abcdef.apps.googleusercontent.com"
              data-testid="input-meet-client-id"
            />
            <PremiumInput
              label="Client Secret"
              type="password"
              placeholder="GOCSPX-example-secret-key"
              data-testid="input-meet-client-secret"
            />
          </div>
        );
      
      case 'whatsapp':
        return (
          <div className="space-y-4">
            <PremiumInput
              label="Número do Telefone"
              placeholder="+5511999999999"
              data-testid="input-whatsapp-phone"
            />
            <PremiumInput
              label="API Key"
              type="password"
              placeholder="wa-api-key-example"
              data-testid="input-whatsapp-api-key"
            />
            <PremiumInput
              label="Instance ID"
              placeholder="my_instance"
              data-testid="input-whatsapp-instance"
            />
          </div>
        );
      
      case 'evolution_api':
        return (
          <div className="space-y-4">
            <PremiumInput
              label="API URL"
              placeholder="https://api.evolutionapi.com"
              data-testid="input-evolution-url"
            />
            <PremiumInput
              label="API Key"
              type="password"
              placeholder="evolution-api-key"
              data-testid="input-evolution-api-key"
            />
            <PremiumInput
              label="Instância"
              placeholder="my_evolution_instance"
              data-testid="input-evolution-instance"
            />
          </div>
        );
      
      default:
        return <div>Configuração não encontrada</div>;
    }
  };

  const activeIntegration = integrations.find(i => i.id === activeTab);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Premium Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background/98 to-muted/3 pointer-events-none" />
      <div className="fixed top-0 left-1/3 w-96 h-96 bg-primary/4 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="fixed bottom-0 right-1/3 w-80 h-80 bg-secondary/3 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '3s' }} />

      <main className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-6 py-8 space-y-6 lg:space-y-8 animate-fade-in">
        
        {/* Premium Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
              <Settings className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-foreground tracking-tight">
                Configurações de Integração
              </h1>
              <p className="text-lg text-muted-foreground/80 mt-1">
                Configure suas integrações com serviços externos
              </p>
            </div>
          </div>
        </div>

        {saveMessage && (
          <Alert className={cn(
            "backdrop-blur-xl backdrop-saturate-180",
            saveMessage.includes('sucesso') 
              ? 'bg-emerald-500/10 border-emerald-500/20' 
              : 'bg-red-500/10 border-red-500/20'
          )}>
            <AlertDescription className={cn(
              "font-medium",
              saveMessage.includes('sucesso') ? 'text-emerald-300' : 'text-red-300'
            )}>
              {saveMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Integrations List */}
          <PremiumCard variant="elevated" padding="lg">
            <div className="space-y-1 mb-6">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Integrações</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Selecione uma integração para configurar
              </p>
            </div>
            
            <div className="space-y-2">
              {integrations.map((integration) => (
                <button
                  key={integration.id}
                  onClick={() => setActiveTab(integration.id)}
                  className={cn(
                    "w-full p-4 rounded-xl text-left transition-all duration-200",
                    "border cursor-pointer select-none",
                    activeTab === integration.id
                      ? 'bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30 shadow-[0_8px_32px_rgba(212,175,55,0.2)]'
                      : 'bg-white/[0.03] backdrop-blur-xl border-white/10 hover:bg-white/[0.05] hover:border-white/20'
                  )}
                  data-testid={`tab-${integration.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        activeTab === integration.id 
                          ? 'bg-primary/20 border border-primary/30'
                          : 'bg-white/[0.05] border border-white/10'
                      )}>
                        <integration.icon className={cn(
                          "w-5 h-5",
                          activeTab === integration.id ? 'text-primary' : 'text-muted-foreground'
                        )} />
                      </div>
                      <span className={cn(
                        "font-semibold transition-colors",
                        activeTab === integration.id ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {integration.name}
                      </span>
                    </div>
                    {integration.status ? (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      </div>
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-orange-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </PremiumCard>

          {/* Configuration Form */}
          <PremiumCard variant="elevated" padding="xl" className="lg:col-span-2">
            {activeIntegration && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
                      <activeIntegration.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">
                        {activeIntegration.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {activeIntegration.description}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={activeIntegration.status ? 'default' : 'secondary'}
                    className={cn(
                      "px-3 py-1",
                      activeIntegration.status 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                        : 'bg-white/[0.05] text-muted-foreground border-white/10'
                    )}
                  >
                    {activeIntegration.status ? 'Configurado' : 'Não Configurado'}
                  </Badge>
                </div>

                {/* Form Content */}
                <div className="space-y-6">
                  {renderConfigForm(activeIntegration)}
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <PremiumButton
                      onClick={() => handleSave(activeIntegration.id)}
                      isLoading={isLoading}
                      variant="primary"
                      data-testid="button-save-integration"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isLoading ? 'Salvando...' : 'Salvar Configuração'}
                    </PremiumButton>
                    <PremiumButton 
                      variant="secondary" 
                      data-testid="button-test-integration"
                    >
                      Testar Conexão
                    </PremiumButton>
                  </div>

                  {/* Security Notice */}
                  <Alert className="bg-blue-500/10 border-blue-500/20 backdrop-blur-xl">
                    <AlertTriangle className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="text-sm text-blue-300/90">
                      <strong>Importante:</strong> As credenciais são criptografadas e armazenadas com segurança.
                      Certifique-se de que as informações estão corretas antes de salvar.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            )}
          </PremiumCard>
        </div>

      </main>
    </div>
  );
};

export default ClientConfigPage;
