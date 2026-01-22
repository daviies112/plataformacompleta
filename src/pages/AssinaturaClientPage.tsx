import { useState, useEffect, lazy, Suspense, memo, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ContractProvider, useContract } from '@/contexts/ContractContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { 
  Camera, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Check,
  ArrowRight,
  Gift,
  Smartphone,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Lazy load all wizard steps for better performance
const VerificationFlow = lazy(() => import('@/components/assinatura/verification/VerificationFlow').then(m => ({ default: m.VerificationFlow })));
const ContractStep = lazy(() => import('@/components/assinatura/steps/ContractStep').then(m => ({ default: m.ContractStep })));
const ResellerWelcomeStep = lazy(() => import('@/components/assinatura/steps/ResellerWelcomeStep').then(m => ({ default: m.ResellerWelcomeStep })));
const AppPromotionStep = lazy(() => import('@/components/assinatura/steps/AppPromotionStep').then(m => ({ default: m.AppPromotionStep })));
const SuccessStep = lazy(() => import('@/components/assinatura/steps/SuccessStep').then(m => ({ default: m.SuccessStep })));

// Step loader component for Suspense fallback
const StepLoader = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

interface ContractData {
  id: string;
  client_name: string;
  client_cpf: string;
  client_email: string;
  client_phone?: string | null;
  status?: string | null;
  access_token?: string | null;
  created_at?: string;
  signed_at?: string | null;
  protocol_number?: string | null;
  contract_html?: string | null;
  logo_url?: string | null;
  logo_size?: string;
  logo_position?: string;
  primary_color?: string | null;
  text_color?: string | null;
  font_family?: string | null;
  font_size?: string | null;
  company_name?: string | null;
  footer_text?: string | null;
  verification_primary_color?: string | null;
  verification_text_color?: string | null;
  verification_welcome_text?: string | null;
  verification_instructions?: string | null;
  verification_footer_text?: string | null;
  verification_security_text?: string | null;
  verification_header_company_name?: string | null;
  verification_header_background_color?: string | null;
  progress_title?: string | null;
  progress_subtitle?: string | null;
  progress_step1_title?: string | null;
  progress_step1_description?: string | null;
  progress_step2_title?: string | null;
  progress_step2_description?: string | null;
  progress_step3_title?: string | null;
  progress_step3_description?: string | null;
  progress_card_color?: string | null;
  progress_button_color?: string | null;
  progress_text_color?: string | null;
  progress_font_family?: string | null;
  progress_button_text?: string | null;
  parabens_title?: string | null;
  parabens_subtitle?: string | null;
  parabens_description?: string | null;
  parabens_button_text?: string | null;
  parabens_button_color?: string | null;
  parabens_card_color?: string | null;
  parabens_background_color?: string | null;
  parabens_text_color?: string | null;
  parabens_font_family?: string | null;
  parabens_form_title?: string | null;
  app_store_url?: string | null;
  google_play_url?: string | null;
}

interface ProgressTrackerDisplayProps {
  currentStep: number;
  contract: ContractData | null;
}

const ProgressTrackerDisplay = memo(({ currentStep, contract }: ProgressTrackerDisplayProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const progressCardColor = contract?.progress_card_color || '#1e3a5f';
  const progressButtonColor = contract?.progress_button_color || '#22c55e';
  const progressTextColor = contract?.progress_text_color || '#ffffff';
  const progressFontFamily = contract?.progress_font_family || 'Arial, sans-serif';

  const steps = useMemo(() => [
    { 
      num: 1, 
      title: contract?.progress_step1_title || '1. Reconhecimento Facial',
      description: contract?.progress_step1_description || 'Tire uma selfie para validar sua identidade',
      icon: Camera
    },
    { 
      num: 2, 
      title: contract?.progress_step2_title || '2. Assinar Contrato',
      description: contract?.progress_step2_description || 'Assine digitalmente o contrato',
      icon: FileText
    },
    { 
      num: 3, 
      title: contract?.progress_step3_title || '3. Baixar Aplicativo',
      description: contract?.progress_step3_description || 'Baixe o app oficial',
      icon: Smartphone
    },
  ], [contract?.progress_step1_title, contract?.progress_step1_description, contract?.progress_step2_title, contract?.progress_step2_description, contract?.progress_step3_title, contract?.progress_step3_description]);

  const stepMapping = [0, 1, 1, 2, 2, 2];
  const activeStepIndex = stepMapping[currentStep] || 0;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div 
        className="rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
        style={{ 
          backgroundColor: progressCardColor,
          fontFamily: progressFontFamily,
          width: isExpanded ? '320px' : '200px',
          maxHeight: isExpanded ? '400px' : '60px',
        }}
      >
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-3 flex items-center justify-between gap-2"
          style={{ color: progressTextColor }}
        >
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: progressButtonColor, color: 'white' }}
            >
              {activeStepIndex + 1}
            </div>
            <span className="font-medium text-sm">
              {contract?.progress_title || 'Progresso'}
            </span>
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        {isExpanded && (
          <div className="px-3 pb-3 space-y-2">
            {steps.map((step, index) => {
              const isComplete = index < activeStepIndex;
              const isActive = index === activeStepIndex;
              const StepIcon = step.icon;

              return (
                <div 
                  key={step.num}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                    isActive ? 'bg-white/20' : isComplete ? 'bg-green-500/20' : 'bg-white/5'
                  }`}
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ 
                      backgroundColor: isComplete ? '#22c55e' : isActive ? progressButtonColor : 'rgba(255,255,255,0.2)',
                      color: 'white'
                    }}
                  >
                    {isComplete ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p 
                      className={`text-sm font-medium ${isComplete ? 'line-through opacity-70' : ''}`}
                      style={{ color: progressTextColor }}
                    >
                      {step.title}
                    </p>
                    <p 
                      className="text-xs opacity-70 truncate"
                      style={{ color: progressTextColor }}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

interface ParticipantData {
  found: boolean;
  formSubmissionId?: string;
  participantData?: {
    nome?: string;
    email?: string;
    telefone?: string;
    cpf?: string;
    instagram?: string;
    dataNascimento?: string;
    endereco?: {
      cep?: string;
      rua?: string;
      numero?: string;
      complemento?: string;
      bairro?: string;
      cidade?: string;
      estado?: string;
    };
  };
}

const AssinaturaClientContent = () => {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const { currentStep, setCurrentStep, setGovbrData, setContractData } = useContract();
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [documentPhoto, setDocumentPhoto] = useState<string | null>(null);

  const { data: contract, isLoading, error } = useQuery<ContractData | null>({
    queryKey: ['/api/assinatura/public/contracts', token],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(`/api/assinatura/public/contracts/${token}`, {
        credentials: 'include'
      });
      if (res.status === 404 || res.status === 401) {
        return null;
      }
      if (!res.ok) {
        throw new Error(`Failed to fetch contract: ${res.status}`);
      }
      return await res.json();
    }
  });

  const { data: participantData } = useQuery<ParticipantData | null>({
    queryKey: ['/api/assinatura/public/contracts', token, 'participant-data'],
    enabled: !!token && !!contract,
    queryFn: async () => {
      try {
        const res = await fetch(`/api/assinatura/public/contracts/${token}/participant-data`, {
          credentials: 'include'
        });
        if (!res.ok) {
          console.log('[AssinaturaClientPage] Erro ao buscar participant-data:', res.status);
          return null;
        }
        const data = await res.json();
        console.log('[AssinaturaClientPage] Participant data:', data);
        return data;
      } catch (err) {
        console.error('[AssinaturaClientPage] Erro ao buscar participant-data:', err);
        return null;
      }
    }
  });

  useEffect(() => {
    if (contract && currentStep === 0) {
      setGovbrData({
        cpf: contract.client_cpf,
        nome: contract.client_name,
        nivel_conta: 'prata',
        email: contract.client_email,
        authenticated: true
      });
      setContractData({
        id: contract.id,
        protocol_number: contract.protocol_number || undefined,
        contract_html: contract.contract_html || undefined
      });
      // Inicia diretamente na verificação (Step 1), pulando a tela de progresso inicial (Step 0)
      setCurrentStep(1);
    }
  }, [contract, currentStep, setGovbrData, setContractData, setCurrentStep]);

  // Preload next step during current step for faster transitions
  useEffect(() => {
    if (currentStep === 0 || currentStep === 1) {
      import('@/components/assinatura/verification/VerificationFlow');
      import('@/components/assinatura/steps/ContractStep');
    } else if (currentStep === 2) {
      import('@/components/assinatura/steps/ResellerWelcomeStep');
    } else if (currentStep === 3) {
      import('@/components/assinatura/steps/AppPromotionStep');
    } else if (currentStep === 4) {
      import('@/components/assinatura/steps/SuccessStep');
    }
  }, [currentStep]);

  const handleVerificationComplete = (result: any) => {
    // Handle both old format (success, selfie, document) and new format ({ success, selfie, document, result })
    const isNewFormat = result && typeof result === 'object' && 'success' in result;
    const success = isNewFormat ? result.success : (result?.passed ?? !!result);
    const selfie = isNewFormat ? result.selfie : null;
    const document = isNewFormat ? result.document : null;
    
    console.log('[AssinaturaClientPage] handleVerificationComplete called:', { 
      success, 
      hasSelfie: !!selfie, 
      hasDocument: !!document,
      currentStepBefore: currentStep
    });
    
    if (success) {
      if (selfie) setSelfiePhoto(selfie);
      if (document) setDocumentPhoto(document);
      
      console.log('[AssinaturaClientPage] Advancing to step 2 (Contract)');
      setCurrentStep(2);
      
      toast({
        title: 'Verificação concluída!',
        description: 'Sua identidade foi verificada com sucesso.',
      });
    } else {
      console.log('[AssinaturaClientPage] Verification failed, showing error');
      toast({
        title: 'Verificação falhou',
        description: 'Por favor, tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const primaryColor = contract?.primary_color || '#2c3e50';
  const textColor = contract?.text_color || '#333333';
  const progressCardColor = contract?.progress_card_color || '#1e3a5f';
  const progressButtonColor = contract?.progress_button_color || '#22c55e';
  const progressTextColor = contract?.progress_text_color || '#ffffff';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Carregando contrato...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <h2 className="mt-4 text-xl font-semibold">Contrato não encontrado</h2>
            <p className="mt-2 text-muted-foreground">
              O link que você acessou é inválido ou expirou.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (contract.status === 'signed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-600" />
            <h2 className="mt-4 text-xl font-semibold">Contrato já assinado</h2>
            <p className="mt-2 text-muted-foreground">
              Este contrato já foi assinado anteriormente.
            </p>
            {contract.signed_at && (
              <p className="mt-2 text-sm text-muted-foreground">
                Assinado em: {new Date(contract.signed_at).toLocaleString('pt-BR')}
              </p>
            )}
            {contract.protocol_number && (
              <p className="mt-2 text-sm font-mono bg-muted p-2 rounded">
                Protocolo: {contract.protocol_number}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 0) {
    // Step 0 is transitional - show loading while contract data is being loaded and step advances to 1
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="step-initial-container">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-muted-foreground" data-testid="status-initial-loading" />
            <p className="mt-4 text-muted-foreground" data-testid="text-initial-loading">
              Preparando verificação...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-background">
        <ProgressTrackerDisplay currentStep={currentStep} contract={contract} />
        <Suspense fallback={<StepLoader />}>
          <VerificationFlow 
            onComplete={handleVerificationComplete}
            primaryColor={contract.verification_primary_color || primaryColor}
            textColor={contract.verification_text_color || textColor}
            welcomeText={contract.verification_welcome_text || 'Verificação de Identidade'}
            instructionText={contract.verification_instructions || 'Processo seguro e rápido para confirmar sua identidade.'}
            footerText={contract.verification_footer_text || 'Verificação Segura'}
            securityText={contract.verification_security_text || 'Suas informações são processadas de forma segura.'}
            headerBackgroundColor={contract.verification_header_background_color || primaryColor}
            logoUrl={contract.logo_url || undefined}
          />
        </Suspense>
      </div>
    );
  }

  if (currentStep === 2) {
    return (
      <div className="min-h-screen bg-background">
        <ProgressTrackerDisplay currentStep={currentStep} contract={contract} />
        <Suspense fallback={<StepLoader />}>
          <ContractStep 
            clientData={{
              id: contract.id,
              client_name: contract.client_name,
              client_cpf: contract.client_cpf,
              client_email: contract.client_email,
              client_phone: contract.client_phone || null,
              contract_html: contract.contract_html || '',
              protocol_number: contract.protocol_number || null,
              logo_url: contract.logo_url,
              logo_size: contract.logo_size,
              logo_position: contract.logo_position,
              primary_color: contract.primary_color,
              text_color: contract.text_color,
              font_family: contract.font_family,
              font_size: contract.font_size,
              company_name: contract.company_name,
              footer_text: contract.footer_text
            }}
            selfiePhoto={selfiePhoto}
            documentPhoto={documentPhoto}
            currentStep={currentStep}
          />
        </Suspense>
      </div>
    );
  }

  if (currentStep === 3) {
    return (
      <div className="min-h-screen bg-background">
        <ProgressTrackerDisplay currentStep={currentStep} contract={contract} />
        <Suspense fallback={<StepLoader />}>
          <ResellerWelcomeStep 
            client_name={contract.client_name}
            parabens_title={contract.parabens_title || undefined}
            parabens_subtitle={contract.parabens_subtitle || undefined}
            parabens_description={contract.parabens_description || undefined}
            parabens_card_color={contract.parabens_card_color || undefined}
            parabens_background_color={contract.parabens_background_color || undefined}
            parabens_button_color={contract.parabens_button_color || undefined}
            parabens_text_color={contract.parabens_text_color || undefined}
            parabens_font_family={contract.parabens_font_family || undefined}
            parabens_form_title={contract.parabens_form_title || undefined}
            parabens_button_text={contract.parabens_button_text || undefined}
            initialAddress={participantData?.participantData?.endereco ? {
              street: participantData.participantData.endereco.rua || '',
              number: participantData.participantData.endereco.numero || '',
              neighborhood: participantData.participantData.endereco.bairro || '',
              city: participantData.participantData.endereco.cidade || '',
              state: participantData.participantData.endereco.estado || '',
              zipcode: participantData.participantData.endereco.cep || '',
              complement: participantData.participantData.endereco.complemento || ''
            } : undefined}
          />
        </Suspense>
      </div>
    );
  }

  if (currentStep === 4) {
    return (
      <div className="min-h-screen bg-background">
        <ProgressTrackerDisplay currentStep={currentStep} contract={contract} />
        <Suspense fallback={<StepLoader />}>
          <AppPromotionStep />
        </Suspense>
      </div>
    );
  }

  if (currentStep === 5) {
    return (
      <div className="min-h-screen bg-background">
        <Suspense fallback={<StepLoader />}>
          <SuccessStep />
        </Suspense>
      </div>
    );
  }

  // Fallback for unexpected steps - prevents black screen
  console.warn('[AssinaturaClientPage] Unexpected step:', currentStep, '- showing loading fallback');
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" data-testid="step-fallback-container">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-muted-foreground" data-testid="status-step-loading" />
          <p className="mt-4 text-muted-foreground" data-testid="text-step-loading">
            Carregando etapa {currentStep}...
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setCurrentStep(1)}
            data-testid="button-restart-verification"
          >
            Reiniciar verificação
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const AssinaturaClientPage = () => {
  return (
    <ErrorBoundary>
      <ContractProvider>
        <AssinaturaClientContent />
      </ContractProvider>
    </ErrorBoundary>
  );
};

export default AssinaturaClientPage;
