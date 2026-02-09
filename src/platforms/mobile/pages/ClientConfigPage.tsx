import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MobileCard, MobileInput, MobileButton, MobileSwitch } from '@/platforms/mobile/components/premium';
import * as Accordion from '@radix-ui/react-accordion';
import * as Progress from '@radix-ui/react-progress';
import { toast } from 'sonner';
import { 
  Check, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Mail, 
  Phone, 
  Settings, 
  Database,
  Calendar,
  Video,
  MessageCircle,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

const hapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

interface FormData {
  supabase: { url: string; anon_key: string };
  google_calendar: { client_id: string; client_secret: string; calendar_id: string };
  google_meet: { client_id: string; client_secret: string };
  whatsapp: { phone_number: string; api_key: string; instance_id: string };
  evolution_api: { api_url: string; api_key: string; instance: string };
}

interface FormErrors {
  [key: string]: {
    [field: string]: string;
  };
}

const ClientConfigPage = () => {
  const { credentials, updateCredentials } = useAuth();
  const [openSections, setOpenSections] = useState<string[]>(['basic-data']);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState<FormData>({
    supabase: { url: '', anon_key: '' },
    google_calendar: { client_id: '', client_secret: '', calendar_id: '' },
    google_meet: { client_id: '', client_secret: '' },
    whatsapp: { phone_number: '', api_key: '', instance_id: '' },
    evolution_api: { api_url: '', api_key: '', instance: '' }
  });

  const steps = [
    { id: 1, name: 'Dados Básicos', completed: !!credentials?.supabase_configured },
    { id: 2, name: 'Contato', completed: !!credentials?.google_calendar },
    { id: 3, name: 'Preferências', completed: !!credentials?.google_meet },
    { id: 4, name: 'Automação', completed: !!credentials?.whatsapp || !!credentials?.evolution_api },
  ];

  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => s.completed).length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  const validateField = (section: string, field: string, value: string): string => {
    if (!value.trim()) {
      return 'Este campo é obrigatório';
    }

    if (field === 'url' && !value.startsWith('http')) {
      return 'URL deve começar com http:// ou https://';
    }

    if (field === 'phone_number' && !value.match(/^\+?[1-9]\d{1,14}$/)) {
      return 'Formato de telefone inválido';
    }

    if (field.includes('email') && !value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return 'E-mail inválido';
    }

    return '';
  };

  const updateFormField = (integrationType: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [integrationType]: {
        ...prev[integrationType as keyof typeof prev],
        [field]: value
      }
    }));

    const error = validateField(integrationType, field, value);
    setErrors(prev => ({
      ...prev,
      [integrationType]: {
        ...prev[integrationType],
        [field]: error
      }
    }));

    setTouched(prev => ({ ...prev, [`${integrationType}_${field}`]: true }));
  };

  const autoSave = useCallback(async (integrationType: string) => {
    try {
      const dataToSave = formData[integrationType as keyof typeof formData];
      const success = await updateCredentials(integrationType, dataToSave);
      
      if (success) {
        toast.success('✓ Salvo automaticamente', {
          duration: 2000,
          className: 'bg-white/[0.03] backdrop-blur-xl backdrop-saturate-180 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]',
          position: 'top-right',
        });
      }
    } catch (error) {
      console.error('Autosave error:', error);
    }
  }, [formData, updateCredentials]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const changedSection = Object.keys(formData).find(key => {
        const data = formData[key as keyof typeof formData];
        return Object.values(data).some(val => val !== '');
      });
      
      if (changedSection) {
        autoSave(changedSection);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [formData, autoSave]);

  const handleSectionToggle = (value: string[]) => {
    hapticFeedback();
    setOpenSections(value);
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      const allSections = Object.keys(formData);
      const savePromises = allSections.map(section => {
        const dataToSave = formData[section as keyof typeof formData];
        return updateCredentials(section, dataToSave);
      });

      await Promise.all(savePromises);
      
      toast.success('Configurações salvas com sucesso!', {
        duration: 3000,
        className: 'bg-emerald-500/10 backdrop-blur-xl backdrop-saturate-180 border-emerald-500/20',
      });
    } catch (error) {
      toast.error('Erro ao salvar configurações', {
        duration: 3000,
        className: 'bg-red-500/10 backdrop-blur-xl backdrop-saturate-180 border-red-500/20',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = Object.values(errors).every(sectionErrors => 
    Object.values(sectionErrors).every(error => !error)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/98 to-muted/5 pb-32">
      <div className="container mx-auto px-4 pt-6 space-y-6">
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Configurações
          </h1>
          <p className="text-muted-foreground">
            Configure suas integrações e preferências
          </p>
        </div>

        <MobileCard variant="elevated" padding="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Progresso da Configuração
                </div>
                <div className="text-2xl font-bold text-foreground mt-1">
                  Passo {currentStep} de {totalSteps}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">
                  {completedSteps}/{totalSteps}
                </div>
                <div className="text-xs text-muted-foreground">
                  completos
                </div>
              </div>
            </div>

            <Progress.Root
              className="relative h-3 w-full overflow-hidden rounded-full bg-white/[0.05]"
              value={progressPercentage}
            >
              <Progress.Indicator
                className="h-full w-full flex-1 bg-gradient-to-r from-primary via-primary/90 to-primary transition-all duration-500 ease-out"
                style={{ transform: `translateX(-${100 - progressPercentage}%)` }}
              />
            </Progress.Root>

            <div className="flex items-center justify-between gap-2 pt-2">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                      step.completed
                        ? 'bg-emerald-500/20 border-2 border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.3)]'
                        : currentStep === step.id
                        ? 'bg-primary/20 border-2 border-primary/40 shadow-[0_0_16px_rgba(212,175,55,0.3)]'
                        : 'bg-white/[0.03] border border-white/10'
                    )}
                  >
                    {step.completed ? (
                      <Check className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <span className="text-sm font-semibold text-foreground">
                        {step.id}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 text-center hidden sm:block">
                    {step.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </MobileCard>

        <Accordion.Root
          type="multiple"
          value={openSections}
          onValueChange={handleSectionToggle}
          className="space-y-4"
        >
          <Accordion.Item value="basic-data">
            <MobileCard clickable padding="sm">
              <Accordion.Header>
                <Accordion.Trigger className="w-full">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Database className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-foreground">Dados Básicos</div>
                        <div className="text-sm text-muted-foreground">Configuração do banco de dados</div>
                      </div>
                    </div>
                    {openSections.includes('basic-data') ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </Accordion.Trigger>
              </Accordion.Header>

              <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="px-4 pb-4 pt-2 space-y-4">
                  <MobileInput
                    label="URL do Projeto Supabase"
                    placeholder="https://xxxxxxxxxxx.supabase.co"
                    value={formData.supabase.url}
                    onChange={(e) => updateFormField('supabase', 'url', e.target.value)}
                    error={touched['supabase_url'] ? errors.supabase?.url : undefined}
                  />
                  
                  <MobileInput
                    label="Chave Anônima (anon/public)"
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={formData.supabase.anon_key}
                    onChange={(e) => updateFormField('supabase', 'anon_key', e.target.value)}
                    error={touched['supabase_anon_key'] ? errors.supabase?.anon_key : undefined}
                  />

                  <div className="p-4 rounded-xl bg-orange-500/[0.05] border border-orange-500/20">
                    <div className="text-sm text-orange-400">
                      <strong>Como obter:</strong> Acesse Settings → API no Supabase Dashboard
                    </div>
                  </div>
                </div>
              </Accordion.Content>
            </MobileCard>
          </Accordion.Item>

          <Accordion.Item value="contact">
            <MobileCard clickable padding="sm">
              <Accordion.Header>
                <Accordion.Trigger className="w-full">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-foreground">Contato</div>
                        <div className="text-sm text-muted-foreground">Google Calendar integração</div>
                      </div>
                    </div>
                    {openSections.includes('contact') ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </Accordion.Trigger>
              </Accordion.Header>

              <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="px-4 pb-4 pt-2 space-y-4">
                  <MobileInput
                    label="Client ID"
                    placeholder="123456789-abcdef.apps.googleusercontent.com"
                    value={formData.google_calendar.client_id}
                    onChange={(e) => updateFormField('google_calendar', 'client_id', e.target.value)}
                    icon={User}
                  />
                  
                  <MobileInput
                    label="Client Secret"
                    type="password"
                    placeholder="GOCSPX-example-secret-key"
                    value={formData.google_calendar.client_secret}
                    onChange={(e) => updateFormField('google_calendar', 'client_secret', e.target.value)}
                  />

                  <MobileInput
                    label="Calendar ID"
                    placeholder="primary ou email@gmail.com"
                    value={formData.google_calendar.calendar_id}
                    onChange={(e) => updateFormField('google_calendar', 'calendar_id', e.target.value)}
                    icon={Mail}
                  />
                </div>
              </Accordion.Content>
            </MobileCard>
          </Accordion.Item>

          <Accordion.Item value="preferences">
            <MobileCard clickable padding="sm">
              <Accordion.Header>
                <Accordion.Trigger className="w-full">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <Video className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-foreground">Preferências</div>
                        <div className="text-sm text-muted-foreground">Google Meet configuração</div>
                      </div>
                    </div>
                    {openSections.includes('preferences') ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </Accordion.Trigger>
              </Accordion.Header>

              <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="px-4 pb-4 pt-2 space-y-4">
                  <MobileInput
                    label="Client ID"
                    placeholder="123456789-abcdef.apps.googleusercontent.com"
                    value={formData.google_meet.client_id}
                    onChange={(e) => updateFormField('google_meet', 'client_id', e.target.value)}
                  />
                  
                  <MobileInput
                    label="Client Secret"
                    type="password"
                    placeholder="GOCSPX-example-secret-key"
                    value={formData.google_meet.client_secret}
                    onChange={(e) => updateFormField('google_meet', 'client_secret', e.target.value)}
                  />
                </div>
              </Accordion.Content>
            </MobileCard>
          </Accordion.Item>

          <Accordion.Item value="automation">
            <MobileCard clickable padding="sm">
              <Accordion.Header>
                <Accordion.Trigger className="w-full">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-green-400" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-foreground">Automação</div>
                        <div className="text-sm text-muted-foreground">WhatsApp e Evolution API</div>
                      </div>
                    </div>
                    {openSections.includes('automation') ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </Accordion.Trigger>
              </Accordion.Header>

              <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="px-4 pb-4 pt-2 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp Business
                    </div>
                    
                    <MobileInput
                      label="Número do Telefone"
                      placeholder="+5511999999999"
                      value={formData.whatsapp.phone_number}
                      onChange={(e) => updateFormField('whatsapp', 'phone_number', e.target.value)}
                      icon={Phone}
                    />
                    
                    <MobileInput
                      label="API Key"
                      type="password"
                      placeholder="wa-api-key-example"
                      value={formData.whatsapp.api_key}
                      onChange={(e) => updateFormField('whatsapp', 'api_key', e.target.value)}
                    />

                    <MobileInput
                      label="Instance ID"
                      placeholder="my_instance"
                      value={formData.whatsapp.instance_id}
                      onChange={(e) => updateFormField('whatsapp', 'instance_id', e.target.value)}
                    />
                  </div>

                  <div className="h-px bg-white/10" />

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Zap className="w-4 h-4" />
                      Evolution API
                    </div>

                    <MobileInput
                      label="API URL"
                      placeholder="https://api.evolutionapi.com"
                      value={formData.evolution_api.api_url}
                      onChange={(e) => updateFormField('evolution_api', 'api_url', e.target.value)}
                    />
                    
                    <MobileInput
                      label="API Key"
                      type="password"
                      placeholder="evolution-api-key"
                      value={formData.evolution_api.api_key}
                      onChange={(e) => updateFormField('evolution_api', 'api_key', e.target.value)}
                    />

                    <MobileInput
                      label="Instância"
                      placeholder="my_evolution_instance"
                      value={formData.evolution_api.instance}
                      onChange={(e) => updateFormField('evolution_api', 'instance', e.target.value)}
                    />
                  </div>
                </div>
              </Accordion.Content>
            </MobileCard>
          </Accordion.Item>
        </Accordion.Root>

        <div className="h-24" />
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-background/0 backdrop-blur-xl border-t border-white/10 z-50">
        <div className="container mx-auto max-w-2xl space-y-3">
          <MobileButton
            variant="primary"
            onClick={handleSave}
            isLoading={isLoading}
            disabled={!isFormValid}
          >
            Salvar e Continuar
          </MobileButton>
          
          <MobileButton
            variant="secondary"
            onClick={() => window.history.back()}
          >
            Cancelar
          </MobileButton>
        </div>
      </div>
    </div>
  );
};

export default ClientConfigPage;
