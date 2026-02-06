import { useState, useEffect, lazy, Suspense, memo, useMemo, useCallback } from 'react';
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
const ResidenceProofStep = lazy(() => import('@/components/assinatura/steps/ResidenceProofStep').then(m => ({ default: m.ResidenceProofStep })));
const AppPromotionStep = lazy(() => import('@/components/assinatura/steps/AppPromotionStep').then(m => ({ default: m.AppPromotionStep })));
const SuccessStep = lazy(() => import('@/components/assinatura/steps/SuccessStep').then(m => ({ default: m.SuccessStep })));

// Minimal loading skeleton that renders instantly (<50ms)
const LightweightLoadingSkeleton = () => (
  <div className="fixed inset-0 bg-background flex items-center justify-center" style={{ willChange: 'contents' }}>
    <div className="w-full max-w-md px-4">
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-muted rounded-lg" />
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    </div>
  </div>
);

// Step loader component for Suspense fallback
const StepLoader = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Helper to preload components with requestIdleCallback
const preloadComponent = (componentPromise: Promise<any>) => {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => {
      componentPromise.catch(() => {});
    });
  } else {
    setTimeout(() => {
      componentPromise.catch(() => {});
    }, 100);
  }
};

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
  progress_active_step_bg?: string | null;
  progress_complete_step_bg?: string | null;
  progress_inactive_step_bg?: string | null;
  progress_check_icon_color?: string | null;
  progress_inactive_circle_bg?: string | null;
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
  address_street?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  address_neighborhood?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zipcode?: string | null;
  residence_proof_validated?: boolean;
  residence_proof_confidence?: number;
  residence_proof_extracted_address?: string | null;
  residence_proof_date?: string | null;
  residence_proof_manual_review?: boolean;
  step_label_selfie?: string | null;
  step_label_document?: string | null;
  step_label_analysis?: string | null;
  step_label_result?: string | null;
  progress_indicator_inactive_circle_color?: string | null;
  progress_indicator_inactive_text_color?: string | null;
  selfie_capture_button_text?: string | null;
  selfie_retake_button_text?: string | null;
  selfie_confirm_button_text?: string | null;
  selfie_waiting_instruction_text?: string | null;
  detection_default_message?: string | null;
  detection_center_message?: string | null;
  detection_lighting_message?: string | null;
  detection_quality_message?: string | null;
  detection_perfect_message?: string | null;
  background_color?: string | null;
  title_color?: string | null;
  button_color?: string | null;
  button_text_color?: string | null;
  icon_color?: string | null;
  app_url?: string | null;
}

interface ProgressTrackerDisplayProps {
  currentStep: number;
  contract: ContractData | null;
}

const ProgressTrackerDisplay = memo(({ currentStep, contract }: ProgressTrackerDisplayProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const progressCardColor = contract?.progress_card_color || contract?.button_color || '#1e3a5f';
  const progressButtonColor = contract?.progress_button_color || contract?.button_color || '#1e3a5f';
  const progressTextColor = contract?.progress_text_color || contract?.button_text_color || '#ffffff';
  const progressFontFamily = contract?.progress_font_family || 'Arial, sans-serif';
  const progressActiveStepBg = contract?.progress_active_step_bg || 'rgba(255,255,255,0.2)';
  const btnColor = contract?.button_color || '#1e3a5f';
  const progressCompleteStepBg = contract?.progress_complete_step_bg || (() => {
    const hex = btnColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r},${g},${b},0.2)`;
  })();
  const progressInactiveStepBg = contract?.progress_inactive_step_bg || 'rgba(255,255,255,0.05)';
  const progressCheckIconColor = contract?.progress_check_icon_color || contract?.button_color || '#1e3a5f';
  const progressInactiveCircleBg = contract?.progress_inactive_circle_bg || 'rgba(255,255,255,0.2)';

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

  const stepMapping = [0, 1, 1, 2, 2, 2, 2];
  const activeStepIndex = stepMapping[currentStep] || 0;

  return (
    <div className="hidden sm:block fixed bottom-4 left-4 z-50">
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
                  className="flex items-start gap-3 p-3 rounded-lg transition-all"
                  style={{
                    backgroundColor: isActive ? progressActiveStepBg : isComplete ? progressCompleteStepBg : progressInactiveStepBg
                  }}
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ 
                      backgroundColor: isComplete ? progressCheckIconColor : isActive ? progressButtonColor : progressInactiveCircleBg,
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
  // Extract token from pathname directly since we render outside React Router's Route
  const token = useMemo(() => {
    const pathname = window.location.pathname;
    const parts = pathname.split('/').filter(Boolean);
    if (parts[0] === 'assinar' && parts.length >= 2) {
      return parts[parts.length - 1];
    }
    return undefined;
  }, []);
  
  const { toast } = useToast();
  const { currentStep, setCurrentStep, setGovbrData, setContractData } = useContract();
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [documentPhoto, setDocumentPhoto] = useState<string | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);

  // Preload VerificationFlow component while waiting for contract data
  useEffect(() => {
    if (isPreloading || currentStep >= 1) return;
    setIsPreloading(true);
    preloadComponent(
      import('@/components/assinatura/verification/VerificationFlow')
    );
  }, [isPreloading, currentStep]);

  const { data: fullData, isLoading, error } = useQuery<{ contract: ContractData; participantData: ParticipantData | null } | null>({
    queryKey: ['/api/assinatura/public/contracts', token, 'full'],
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    networkMode: 'always',
    retry: 1,
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const res = await fetch(`/api/assinatura/public/contracts/${token}/full`, {
          credentials: 'include',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (res.status === 404 || res.status === 401) {
          return null;
        }
        if (!res.ok) {
          throw new Error(`Failed to fetch contract data: ${res.status}`);
        }
        return await res.json();
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          console.warn('[AssinaturaClient] Contract fetch timeout - showing error');
        }
        throw err;
      }
    }
  });

  const contract = fullData?.contract || null;
  const participantData = fullData?.participantData || null;

  // Debug: Log address data from contract
  useEffect(() => {
    if (contract) {
      console.log('[AssinaturaClientPage] Contract address data:', {
        address_street: contract.address_street,
        address_number: contract.address_number,
        address_city: contract.address_city,
        address_state: contract.address_state,
        address_zipcode: contract.address_zipcode,
        address_neighborhood: contract.address_neighborhood,
        address_complement: contract.address_complement
      });
    }
  }, [contract]);

  const { setResidenceProofPhoto, setResidenceProofValidated } = useContract();

  useEffect(() => {
    if (contract) {
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
      
      // Rehydrate residence proof state from contract data
      if (contract.residence_proof_validated !== undefined) {
        setResidenceProofValidated(contract.residence_proof_validated);
        console.log('[AssinaturaClientPage] Rehydrated residence proof validated:', contract.residence_proof_validated);
      }
      
      // Determine starting step based on contract progress
      // Steps: 1=Verification, 2=Contract, 3=Address, 4=ResidenceProof, 5=AppDownload, 6=Success
      let startingStep = 1; // Default: start at verification
      
      if (contract.signed_at) {
        // Contract is signed - check further progress
        if (contract.residence_proof_validated || contract.residence_proof_manual_review) {
          // Residence proof completed - go to app download
          startingStep = 5;
          console.log('[AssinaturaClientPage] Resuming at App Download (step 5)');
        } else if (contract.address_street) {
          // Address filled - go to residence proof
          startingStep = 4;
          console.log('[AssinaturaClientPage] Resuming at Residence Proof (step 4)');
        } else {
          // Contract signed but no address - go to address form
          startingStep = 3;
          console.log('[AssinaturaClientPage] Resuming at Address Form (step 3)');
        }
      }
      
      setCurrentStep(startingStep);
    }
  }, [contract, setGovbrData, setContractData, setCurrentStep, setResidenceProofValidated]);

  // Preload next step during current step for faster transitions
  useEffect(() => {
    // Preload next step components for faster transitions
    // Steps: 1=Verification, 2=Contract, 3=Address/ResellerWelcome, 4=ResidenceProof, 5=AppPromotion, 6=Success
    if (currentStep === 1 || currentStep === 2) {
      preloadComponent(import('@/components/assinatura/steps/ContractStep'));
      preloadComponent(import('@/components/assinatura/steps/ResellerWelcomeStep'));
    } else if (currentStep === 2 || currentStep === 3) {
      preloadComponent(import('@/components/assinatura/steps/ResellerWelcomeStep'));
      preloadComponent(import('@/components/assinatura/steps/ResidenceProofStep'));
    } else if (currentStep === 3 || currentStep === 4) {
      preloadComponent(import('@/components/assinatura/steps/ResidenceProofStep'));
      preloadComponent(import('@/components/assinatura/steps/AppPromotionStep'));
    } else if (currentStep === 4 || currentStep === 5) {
      preloadComponent(import('@/components/assinatura/steps/AppPromotionStep'));
      preloadComponent(import('@/components/assinatura/steps/SuccessStep'));
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

  const primaryColor = contract?.button_color || contract?.primary_color || '#2c3e50';
  const textColor = contract?.text_color || '#333333';
  const progressCardColor = contract?.progress_card_color || contract?.button_color || '#1e3a5f';
  const progressButtonColor = contract?.progress_button_color || contract?.button_color || '#1e3a5f';
  const progressTextColor = contract?.progress_text_color || contract?.button_text_color || '#ffffff';

  if (isLoading) {
    return <LightweightLoadingSkeleton />;
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
            <CheckCircle2 className="w-12 h-12 mx-auto" style={{ color: contract.button_color || contract.primary_color || '#2c3e50' }} />
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

  if (currentStep === 1) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: contract.background_color || '#ffffff' }}>
        <ProgressTrackerDisplay currentStep={currentStep} contract={contract} />
        <Suspense fallback={<StepLoader />}>
          <VerificationFlow 
            onComplete={handleVerificationComplete}
            primaryColor={contract.button_color || contract.verification_primary_color || primaryColor}
            textColor={contract.text_color || contract.verification_text_color || textColor}
            welcomeText={contract.verification_welcome_text || 'Verificação de Identidade'}
            instructionText={contract.verification_instructions || 'Processo seguro e rápido para confirmar sua identidade.'}
            footerText={contract.verification_footer_text || 'Verificação Segura'}
            securityText={contract.verification_security_text || 'Suas informações são processadas de forma segura.'}
            backgroundColor={contract.background_color || '#ffffff'}
            iconColor={contract.icon_color || '#2c3e50'}
            buttonTextColor={contract.button_text_color || '#ffffff'}
            headerBackgroundColor={contract.verification_header_background_color || primaryColor}
            logoUrl={contract.logo_url || undefined}
            stepLabels={contract.step_label_selfie || contract.step_label_document || contract.step_label_analysis || contract.step_label_result ? {
              selfie: contract.step_label_selfie || 'Selfie',
              document: contract.step_label_document || 'Documento',
              analysis: contract.step_label_analysis || 'Análise',
              result: contract.step_label_result || 'Resultado'
            } : undefined}
            inactiveCircleColor={contract.progress_indicator_inactive_circle_color || undefined}
            inactiveTextColor={contract.progress_indicator_inactive_text_color || undefined}
            captureButtonText={contract.selfie_capture_button_text || undefined}
            retakeButtonText={contract.selfie_retake_button_text || undefined}
            confirmButtonText={contract.selfie_confirm_button_text || undefined}
            waitingInstructionText={contract.selfie_waiting_instruction_text || undefined}
            detectionDefaultMessage={contract.detection_default_message || undefined}
            detectionCenterMessage={contract.detection_center_message || undefined}
            detectionLightingMessage={contract.detection_lighting_message || undefined}
            detectionQualityMessage={contract.detection_quality_message || undefined}
            detectionPerfectMessage={contract.detection_perfect_message || undefined}
          />
        </Suspense>
      </div>
    );
  }

  if (currentStep === 2) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: contract.background_color || '#ffffff' }}>
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
            button_color={contract.button_color || contract.primary_color || primaryColor}
            button_text_color={contract.button_text_color || '#ffffff'}
            icon_color={contract.icon_color || contract.button_color || primaryColor}
            title_color={contract.title_color || contract.text_color || textColor}
            text_color={contract.text_color || textColor}
            background_color={contract.background_color || '#ffffff'}
          />
        </Suspense>
      </div>
    );
  }

  if (currentStep === 3) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: contract.background_color || '#ffffff' }}>
        <ProgressTrackerDisplay currentStep={currentStep} contract={contract} />
        <Suspense fallback={<StepLoader />}>
          <ResellerWelcomeStep 
            client_name={contract.client_name}
            parabens_title={contract.parabens_title || undefined}
            parabens_subtitle={contract.parabens_subtitle || undefined}
            parabens_description={contract.parabens_description || undefined}
            parabens_card_color={contract.button_color || contract.parabens_card_color || undefined}
            parabens_background_color={contract.background_color || contract.parabens_background_color || undefined}
            parabens_button_color={contract.button_color || contract.parabens_button_color || undefined}
            parabens_text_color={contract.text_color || contract.parabens_text_color || undefined}
            parabens_font_family={contract.parabens_font_family || undefined}
            parabens_form_title={contract.parabens_form_title || undefined}
            parabens_button_text={contract.parabens_button_text || undefined}
            initialAddress={(contract.address_street || contract.address_city || contract.address_zipcode) ? {
              street: contract.address_street || '',
              number: contract.address_number || '',
              neighborhood: contract.address_neighborhood || '',
              city: contract.address_city || '',
              state: contract.address_state || '',
              zipcode: contract.address_zipcode || '',
              complement: contract.address_complement || ''
            } : (participantData?.participantData?.endereco ? {
              street: participantData.participantData.endereco.rua || '',
              number: participantData.participantData.endereco.numero || '',
              neighborhood: participantData.participantData.endereco.bairro || '',
              city: participantData.participantData.endereco.cidade || '',
              state: participantData.participantData.endereco.estado || '',
              zipcode: participantData.participantData.endereco.cep || '',
              complement: participantData.participantData.endereco.complemento || ''
            } : undefined)}
          />
        </Suspense>
      </div>
    );
  }

  if (currentStep === 4) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: contract.background_color || '#ffffff' }}>
        <ProgressTrackerDisplay currentStep={currentStep} contract={contract} />
        <Suspense fallback={<StepLoader />}>
          <ResidenceProofStep 
            parabens_card_color={contract.button_color || contract.parabens_card_color || undefined}
            parabens_background_color={contract.background_color || contract.parabens_background_color || undefined}
            parabens_button_color={contract.button_color || contract.parabens_button_color || undefined}
            parabens_text_color={contract.text_color || contract.parabens_text_color || undefined}
            parabens_font_family={contract.parabens_font_family || undefined}
            button_text_color={contract.button_text_color || '#ffffff'}
            logo_url={contract.logo_url || undefined}
            logo_size={contract.logo_size || undefined}
            logo_position={contract.logo_position || undefined}
          />
        </Suspense>
      </div>
    );
  }

  if (currentStep === 5) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: contract.background_color || '#ffffff' }}>
        <ProgressTrackerDisplay currentStep={currentStep} contract={contract} />
        <Suspense fallback={<StepLoader />}>
          <AppPromotionStep 
            button_color={contract.button_color || contract.primary_color || primaryColor}
            button_text_color={contract.button_text_color || '#ffffff'}
            icon_color={contract.icon_color || contract.button_color || primaryColor}
            title_color={contract.title_color || contract.text_color || textColor}
            text_color={contract.text_color || textColor}
            background_color={contract.background_color || '#fafafa'}
          />
        </Suspense>
      </div>
    );
  }

  if (currentStep === 6) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: contract.background_color || '#ffffff' }}>
        <Suspense fallback={<StepLoader />}>
          <SuccessStep />
        </Suspense>
      </div>
    );
  }

  // Step 0 or unexpected step - show loading with background color while useEffect sets the correct step
  if (currentStep === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: contract.background_color || '#ffffff' }} data-testid="step-fallback-container">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: contract.button_color || contract.primary_color || '#2c3e50' }} data-testid="status-step-loading" />
      </div>
    );
  }

  // Fallback for unexpected steps - prevents black screen
  console.warn('[AssinaturaClientPage] Unexpected step:', currentStep, '- showing loading fallback');
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: contract.background_color || '#ffffff' }} data-testid="step-fallback-unexpected">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-muted-foreground" data-testid="status-step-loading-unexpected" />
          <p className="mt-4 text-muted-foreground" data-testid="text-step-loading">
            Carregando...
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => {
              console.log('[AssinaturaClientPage] User clicked restart - resetting to step 1');
              setCurrentStep(1);
            }}
            data-testid="button-restart-verification"
          >
            Reiniciar
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
