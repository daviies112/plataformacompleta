import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ContractProvider, useContract } from '@/contexts/ContractContext';
import { VerificationFlow } from '@/components/verification/VerificationFlow';
import { ContractStep } from '@/components/steps/ContractStep';
import { ResellerWelcomeStep } from '@/components/steps/ResellerWelcomeStep';
import { AppPromotionStep } from '@/components/steps/AppPromotionStep';
import { SuccessStep } from '@/components/steps/SuccessStep';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, FileX, Gift, Check } from 'lucide-react';

interface ContractRecord {
  id: string;
  client_name: string;
  client_cpf: string;
  client_email: string;
  client_phone: string | null;
  contract_html: string;
  protocol_number: string | null;
  status: string | null;
  signed_at: string | null;
  access_token: string | null;
  company_name?: string;
  maleta_card_color?: string;
  maleta_button_color?: string;
  maleta_text_color?: string;
  primary_color?: string;
  text_color?: string;
  font_family?: string;
  font_size?: string;
  logo_url?: string;
  logo_size?: string;
  logo_position?: string;
  footer_text?: string;
  verification_primary_color?: string;
  verification_text_color?: string;
  verification_font_family?: string;
  verification_font_size?: string;
  verification_logo_url?: string;
  verification_logo_size?: string;
  verification_logo_position?: string;
  verification_footer_text?: string;
  verification_background_image?: string;
  verification_background_color?: string;
  verification_icon_url?: string;
  verification_welcome_text?: string;
  verification_instructions?: string;
  verification_security_text?: string;
  verification_header_background_color?: string;
  verification_header_logo_url?: string;
  verification_header_company_name?: string;
  progress_card_color?: string;
  progress_button_color?: string;
  progress_text_color?: string;
  progress_title?: string;
  progress_subtitle?: string;
  progress_step1_title?: string;
  progress_step1_description?: string;
  progress_step2_title?: string;
  progress_step2_description?: string;
  progress_button_text?: string;
  progress_font_family?: string;
  progress_font_size?: string;
  app_store_url?: string;
  google_play_url?: string;
  parabens_title?: string;
  parabens_subtitle?: string;
  parabens_description?: string;
  parabens_card_color?: string;
  parabens_background_color?: string;
  parabens_button_color?: string;
  parabens_text_color?: string;
  parabens_font_family?: string;
  parabens_form_title?: string;
  parabens_button_text?: string;
}

const ProgressTrackerDisplay = ({ 
  currentStep, 
  contract 
}: { 
  currentStep: number;
  contract: ContractRecord;
}) => {
  const progressTitle = contract.progress_title || 'Assinatura Digital';
  const progressSubtitle = contract.progress_subtitle || 'Conclua os passos abaixo para desbloquear sua maleta digital. Super rápido!';
  const progressStep1Title = contract.progress_step1_title || '1. Reconhecimento Facial';
  const progressStep1Description = contract.progress_step1_description || 'Tire uma selfie para validar sua identidade através de reconhecimento facial';
  const progressStep2Title = contract.progress_step2_title || '2. Assinar Contrato';
  const progressStep2Description = contract.progress_step2_description || 'Assine digitalmente o contrato para confirmar seu compromisso';
  const progressStep3Title = contract.progress_step3_title || '3. Baixar Aplicativo';
  const progressStep3Description = contract.progress_step3_description || 'Baixe o app oficial para ativar sua loja e receber sua maleta';
  const progressButtonText = contract.progress_button_text || 'Complete os passos acima';
  const progressCardColor = contract.progress_card_color || '#dbeafe';
  const progressButtonColor = contract.progress_button_color || '#22c55e';
  const progressTextColor = contract.progress_text_color || '#1e40af';
  const progressFontFamily = contract.progress_font_family || 'Arial, sans-serif';
  const progressFontSize = contract.progress_font_size || '14px';

  const step1Complete = currentStep >= 2;
  const step2Complete = currentStep >= 3;
  const step3Complete = currentStep >= 4;
  const allStepsComplete = currentStep >= 4;

  return (
    <div 
      className="fixed bottom-8 left-2 rounded-lg space-y-1 max-w-xs shadow-lg"
      style={{ 
        backgroundColor: progressCardColor,
        fontFamily: progressFontFamily,
        padding: '8px',
        zIndex: 40,
        border: `1px solid ${progressButtonColor}20`
      }}
    >
      <h2 
        className="text-sm font-bold leading-tight"
        style={{ color: progressTextColor, marginBottom: '2px' }}
      >
        {progressTitle}
      </h2>
      <p 
        className="text-xs leading-snug"
        style={{ 
          color: progressTextColor,
          fontSize: '11px',
          marginBottom: '4px'
        }}
      >
        {progressSubtitle}
      </p>

      <div className="space-y-1">
        {/* Passo 1 - Reconhecimento Facial */}
        <div 
          className="flex items-start gap-2 p-1.5 rounded border transition-all"
          style={{ 
            borderColor: progressButtonColor,
            backgroundColor: step1Complete ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.1)',
            borderWidth: '1px',
            boxShadow: 'none'
          }}
        >
          <div className="flex-shrink-0">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ 
                backgroundColor: progressButtonColor,
                animation: step1Complete ? 'none' : 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                flexShrink: 0
              }}
            >
              {step1Complete ? <Check size={14} /> : '1'}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p 
              className="font-semibold text-xs leading-none"
              style={{ 
                color: progressTextColor,
                fontSize: '11px',
                textDecoration: step1Complete ? 'line-through' : 'none'
              }}
            >
              {progressStep1Title}
            </p>
            <p 
              className="text-xs opacity-70 leading-tight mt-0.5"
              style={{ 
                color: progressTextColor,
                fontSize: '10px',
              }}
            >
              {progressStep1Description}
            </p>
          </div>
        </div>

        {/* Passo 2 - Assinatura do Contrato */}
        <div 
          className="flex items-start gap-2 p-1.5 rounded border transition-all"
          style={{ 
            borderColor: progressButtonColor,
            backgroundColor: step2Complete ? 'rgba(34, 197, 94, 0.15)' : (currentStep === 2 ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)'),
            borderWidth: '1px',
            boxShadow: 'none'
          }}
        >
          <div className="flex-shrink-0">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ 
                backgroundColor: progressButtonColor,
                animation: currentStep === 2 ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                flexShrink: 0
              }}
            >
              {step2Complete ? <Check size={14} /> : '2'}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p 
              className="font-semibold text-xs leading-none"
              style={{ 
                color: progressTextColor,
                fontSize: '11px',
                textDecoration: step2Complete ? 'line-through' : 'none',
                opacity: currentStep >= 2 ? 1 : 0.6
              }}
            >
              {progressStep2Title}
            </p>
            <p 
              className="text-xs opacity-70 leading-tight mt-0.5"
              style={{ 
                color: progressTextColor,
                fontSize: '10px',
              }}
            >
              {progressStep2Description}
            </p>
          </div>
        </div>

        {/* Passo 3 - Baixar Aplicativo */}
        <div 
          className="flex items-start gap-2 p-1.5 rounded border transition-all"
          style={{ 
            borderColor: progressButtonColor,
            backgroundColor: step3Complete ? 'rgba(34, 197, 94, 0.15)' : (currentStep === 3 ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)'),
            borderWidth: '1px',
            boxShadow: 'none'
          }}
        >
          <div className="flex-shrink-0">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ 
                backgroundColor: progressButtonColor,
                animation: currentStep === 3 ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                flexShrink: 0
              }}
            >
              {step3Complete ? <Check size={14} /> : '3'}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p 
              className="font-semibold text-xs leading-none"
              style={{ 
                color: progressTextColor,
                fontSize: '11px',
                textDecoration: step3Complete ? 'line-through' : 'none',
                opacity: currentStep >= 3 ? 1 : 0.6
              }}
            >
              {progressStep3Title}
            </p>
            <p 
              className="text-xs opacity-70 leading-tight mt-0.5"
              style={{ 
                color: progressTextColor,
                fontSize: '10px',
              }}
            >
              {progressStep3Description}
            </p>
          </div>
        </div>
      </div>

      {/* Botão de Conclusão */}
      <button 
        className="w-full py-1.5 text-white font-bold rounded text-xs transition-all"
        style={{ 
          backgroundColor: progressButtonColor,
          fontFamily: progressFontFamily,
          fontSize: '11px',
          opacity: allStepsComplete ? 1 : 0.5,
          cursor: allStepsComplete ? 'pointer' : 'not-allowed',
          marginTop: '4px'
        }}
        disabled={!allStepsComplete}
      >
        {allStepsComplete ? '✓ Completo!' : progressButtonText}
      </button>
    </div>
  );
};

const ClientContractFlow = ({ contract }: { contract: ContractRecord }) => {
  const { currentStep, setCurrentStep, setContractData } = useContract();
  const [facialVerified, setFacialVerified] = useState(false);
  const [contractSigned, setContractSigned] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [documentPhoto, setDocumentPhoto] = useState<string | null>(null);

  useEffect(() => {
    setContractData({
      id: contract.id,
      protocol_number: contract.protocol_number || undefined,
      contract_html: contract.contract_html,
      app_store_url: contract.app_store_url,
      google_play_url: contract.google_play_url,
    });
    // Client always starts at verification step (Step 1)
    // Data is always pre-filled from database by admin
    setCurrentStep(1);
  }, [contract, setContractData, setCurrentStep]);

  const handleVerificationComplete = (result: any) => {
    setVerificationResult(result);
    // Extract photos from verification session (stored in browser session)
    const sessionStorage = window.sessionStorage;
    const selfie = sessionStorage.getItem('verification_selfie');
    const document = sessionStorage.getItem('verification_document');
    if (selfie) setSelfiePhoto(selfie);
    if (document) setDocumentPhoto(document);
    setFacialVerified(true);
    setCurrentStep(2);
  };

  const renderStep = () => {
    return (
      <>
        {/* Step Content */}
        {getStepContent()}
      </>
    );
  };

  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <VerificationFlow
            primaryColor={contract.verification_primary_color || contract.primary_color}
            textColor={contract.verification_text_color || contract.text_color}
            fontFamily={contract.verification_font_family || contract.font_family}
            fontSize={contract.verification_font_size || contract.font_size}
            logoUrl={contract.verification_logo_url || contract.logo_url}
            logoSize={(contract.verification_logo_size as any) || (contract.logo_size as any) || 'medium'}
            logoPosition={(contract.verification_logo_position as any) || (contract.logo_position as any) || 'center'}
            footerText={contract.verification_footer_text || contract.footer_text}
            welcomeText={contract.verification_welcome_text}
            instructionText={contract.verification_instructions}
            securityText={contract.verification_security_text}
            backgroundImage={contract.verification_background_image}
            backgroundColor={contract.verification_background_color || '#ffffff'}
            headerBackgroundColor={contract.verification_header_background_color}
            headerLogoUrl={contract.verification_header_logo_url}
            headerCompanyName={contract.verification_header_company_name}
            onComplete={handleVerificationComplete}
            passLogoProps={{
              logoUrl: contract.verification_logo_url || contract.logo_url || '',
              logoSize: (contract.verification_logo_size as any) || (contract.logo_size as any) || 'medium',
              logoPosition: (contract.verification_logo_position as any) || (contract.logo_position as any) || 'center'
            }}
          />
        );
      case 2:
        return (
          <ContractStep 
            clientData={{
              id: contract.id,
              client_name: contract.client_name,
              client_cpf: contract.client_cpf,
              client_email: contract.client_email,
              client_phone: contract.client_phone,
              contract_html: contract.contract_html,
              protocol_number: contract.protocol_number,
              logo_url: contract.logo_url,
              logo_size: contract.logo_size,
              logo_position: contract.logo_position,
              primary_color: contract.primary_color,
              text_color: contract.text_color,
              font_family: contract.font_family,
              font_size: contract.font_size,
              company_name: contract.company_name,
              footer_text: contract.footer_text,
              progress_title: contract.progress_title,
              progress_subtitle: contract.progress_subtitle,
              progress_step1_title: contract.progress_step1_title,
              progress_step1_description: contract.progress_step1_description,
              progress_step2_title: contract.progress_step2_title,
              progress_step2_description: contract.progress_step2_description,
              progress_button_text: contract.progress_button_text,
              progress_card_color: contract.progress_card_color,
              progress_button_color: contract.progress_button_color,
              progress_text_color: contract.progress_text_color,
              progress_font_family: contract.progress_font_family,
              progress_font_size: contract.progress_font_size,
            }}
            selfiePhoto={selfiePhoto} 
            documentPhoto={documentPhoto}
            currentStep={currentStep}
          />
        );
      case 3:
        return (
          <ResellerWelcomeStep
            client_name={contract.client_name}
            parabens_title={contract.parabens_title}
            parabens_subtitle={contract.parabens_subtitle}
            parabens_description={contract.parabens_description}
            parabens_card_color={contract.parabens_card_color}
            parabens_background_color={contract.parabens_background_color}
            parabens_button_color={contract.parabens_button_color}
            parabens_text_color={contract.parabens_text_color}
            parabens_font_family={contract.parabens_font_family}
            parabens_form_title={contract.parabens_form_title}
            parabens_button_text={contract.parabens_button_text}
          />
        );
      case 4:
        return <AppPromotionStep />;
      case 5:
        return <SuccessStep />;
      default:
        return (
          <VerificationFlow
            primaryColor={contract.verification_primary_color || contract.primary_color}
            textColor={contract.verification_text_color || contract.text_color}
            fontFamily={contract.verification_font_family || contract.font_family}
            fontSize={contract.verification_font_size || contract.font_size}
            logoUrl={contract.verification_logo_url || contract.logo_url}
            logoSize={(contract.verification_logo_size as any) || (contract.logo_size as any) || 'medium'}
            logoPosition={(contract.verification_logo_position as any) || (contract.logo_position as any) || 'center'}
            footerText={contract.verification_footer_text || contract.footer_text}
            welcomeText={contract.verification_welcome_text}
            instructionText={contract.verification_instructions}
            securityText={contract.verification_security_text}
            backgroundImage={contract.verification_background_image}
            backgroundColor={contract.verification_background_color || '#ffffff'}
            headerBackgroundColor={contract.verification_header_background_color}
            headerLogoUrl={contract.verification_header_logo_url}
            headerCompanyName={contract.verification_header_company_name}
            onComplete={handleVerificationComplete}
            passLogoProps={{
              logoUrl: contract.verification_logo_url || contract.logo_url || '',
              logoSize: (contract.verification_logo_size as any) || (contract.logo_size as any) || 'medium',
              logoPosition: (contract.verification_logo_position as any) || (contract.logo_position as any) || 'center'
            }}
          />
        );
    }
  };

  const cardColor = contract.progress_card_color || contract.maleta_card_color || '#dbeafe';
  const buttonColor = contract.progress_button_color || contract.maleta_button_color || '#22c55e';
  const textColor = contract.progress_text_color || contract.maleta_text_color || '#1e40af';
  const progressTitle = contract.progress_title || 'Assinatura Digital';
  const progressSubtitle = contract.progress_subtitle || 'Conclua os passos abaixo para desbloquear sua maleta digital. Super rápido! ⚡';
  const progressStep1Title = contract.progress_step1_title || '1. Reconhecimento Facial';
  const progressStep1Description = contract.progress_step1_description || 'Tire uma selfie para validar sua identidade através de reconhecimento facial';
  const progressStep2Title = contract.progress_step2_title || '2. Assinar Contrato';
  const progressStep2Description = contract.progress_step2_description || 'Assine digitalmente o contrato para confirmar seu compromisso';
  const progressStep3Title = contract.progress_step3_title || '3. Baixar Aplicativo';
  const progressStep3Description = contract.progress_step3_description || 'Baixe o app oficial para ativar sua loja e receber sua maleta';
  const progressButtonText = contract.progress_button_text || 'Complete os passos acima';
  const progressFontFamily = contract.progress_font_family || 'Arial, sans-serif';
  const progressFontSize = contract.progress_font_size || '16px';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 overflow-y-auto">{renderStep()}</main>
      {/* Floating Progress Tracker */}
      <ProgressTrackerDisplay currentStep={currentStep} contract={contract} />
    </div>
  );
};

const ClientContract = () => {
  const { token } = useParams<{ token: string }>();
  const [contract, setContract] = useState<ContractRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContract = async () => {
      if (!token) {
        setError('Token inválido');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/contracts/${token}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Contrato não encontrado');
          } else {
            setError('Erro ao buscar contrato');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setContract(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching contract:', err);
        setError('Erro ao carregar contrato');
        setLoading(false);
      }
    };

    fetchContract();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="flex items-center gap-4">
            <div className="animate-spin">
              <Loader2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>Carregando contrato...</CardTitle>
              <CardDescription>Por favor aguarde</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <div className="flex items-center gap-3">
              {error.includes('não encontrado') ? (
                <FileX className="w-8 h-8 text-destructive" />
              ) : (
                <AlertCircle className="w-8 h-8 text-destructive" />
              )}
              <div>
                <CardTitle className="text-destructive">Erro</CardTitle>
                <CardDescription>{error}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileX className="w-8 h-8 text-destructive" />
              <div>
                <CardTitle className="text-destructive">Contrato não encontrado</CardTitle>
                <CardDescription>Token inválido ou contrato removido</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <ContractProvider>
      <ClientContractFlow contract={contract} />
    </ContractProvider>
  );
};

export default ClientContract;
