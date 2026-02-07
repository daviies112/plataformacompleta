import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  ArrowRight, 
  Camera, 
  FileText, 
  CheckCircle, 
  Shield, 
  Award,
  User,
  Mail,
  Phone,
  CreditCard,
  Download,
  Home,
  PenTool
} from 'lucide-react';

interface ContractClause {
  title: string;
  content: string;
}

interface SignaturePreviewProps {
  clientName?: string;
  clientCpf?: string;
  clientEmail?: string;
  clientPhone?: string;
  
  primaryColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: string;
  logoUrl?: string;
  logoSize?: 'small' | 'medium' | 'large';
  logoPosition?: 'center' | 'left' | 'right';
  companyName?: string;
  footerText?: string;
  
  verificationPrimaryColor?: string;
  verificationTextColor?: string;
  verificationFontFamily?: string;
  verificationFontSize?: string;
  verificationLogoUrl?: string;
  verificationLogoSize?: 'small' | 'medium' | 'large';
  verificationLogoPosition?: 'center' | 'left' | 'right';
  verificationFooterText?: string;
  welcomeText?: string;
  instructions?: string;
  securityText?: string;
  backgroundColor?: string;
  headerBackgroundColor?: string;
  
  selfieStepTitle?: string;
  selfieStepDescription?: string;
  documentStepTitle?: string;
  documentStepDescription?: string;
  analysisStepTitle?: string;
  analysisStepDescription?: string;
  resultStepTitle?: string;
  resultStepDescription?: string;
  selfieButtonText?: string;
  selfieInstructionText?: string;
  
  stepLabelSelfie?: string;
  stepLabelDocument?: string;
  stepLabelAnalysis?: string;
  stepLabelResult?: string;
  progressIndicatorInactiveCircleColor?: string;
  progressIndicatorInactiveTextColor?: string;
  selfieCaptureButtonText?: string;
  selfieRetakeButtonText?: string;
  selfieConfirmButtonText?: string;
  detectionDefaultMessage?: string;
  detectionCenterMessage?: string;
  detectionLightingMessage?: string;
  detectionQualityMessage?: string;
  detectionPerfectMessage?: string;
  
  contractTitle?: string;
  clauses?: ContractClause[];
  
  contractPrimaryColor?: string;
  contractTextColor?: string;
  contractBackgroundColor?: string;
  contractFontFamily?: string;
  
  parabensTitle?: string;
  parabensSubtitle?: string;
  parabensDescription?: string;
  parabensCardColor?: string;
  parabensBackgroundColor?: string;
  parabensButtonColor?: string;
  parabensTextColor?: string;
  parabensFontFamily?: string;
  parabensButtonText?: string;
  
  progressCardColor?: string;
  progressButtonColor?: string;
  progressTextColor?: string;
  progressTitle?: string;
  progressSubtitle?: string;
  progressActiveStepBg?: string;
  progressCompleteStepBg?: string;
  progressInactiveStepBg?: string;
  progressCheckIconColor?: string;
  progressInactiveCircleBg?: string;
  
  wizardStep?: number;
  onStepChange?: (step: number) => void;
  verificationPreviewMode?: 'tela-inicial' | 'etapas-fluxo' | 'barra-navegacao' | 'botoes-captura' | 'mensagens-deteccao';
}

export const SignaturePreview = ({
  clientName = 'João da Silva',
  clientCpf = '123.456.789-00',
  clientEmail = 'cliente@email.com',
  clientPhone = '(11) 99999-9999',
  
  primaryColor = '#2c3e50',
  textColor = '#333333',
  fontFamily = 'Arial, sans-serif',
  fontSize = '16px',
  logoUrl = '',
  logoSize = 'medium',
  logoPosition = 'center',
  companyName = 'Sua Empresa',
  footerText = 'Documento gerado eletronicamente',
  
  verificationPrimaryColor,
  verificationTextColor,
  verificationFontFamily,
  verificationFontSize,
  verificationLogoUrl,
  verificationLogoSize,
  verificationLogoPosition,
  verificationFooterText,
  welcomeText = 'Verificação de Identidade',
  instructions = 'Processo seguro e rápido para confirmar sua identidade através de reconhecimento facial.',
  securityText = 'Suas informações são processadas de forma segura e criptografada',
  backgroundColor = '#ffffff',
  headerBackgroundColor = '#2c3e50',
  
  selfieStepTitle = 'Tire uma selfie',
  selfieStepDescription = 'Posicione seu rosto na área indicada',
  documentStepTitle = 'Fotografe seu documento',
  documentStepDescription = 'CNH, RG ou outro documento com foto',
  analysisStepTitle = 'Verificação automática',
  analysisStepDescription = 'Comparamos sua foto com o documento',
  resultStepTitle = 'Verificação concluída',
  resultStepDescription = 'Sua identidade foi verificada com sucesso',
  selfieButtonText = 'Iniciar Verificação',
  selfieInstructionText = 'Posicione seu rosto e aguarde a captura automática',
  
  stepLabelSelfie = 'Selfie',
  stepLabelDocument = 'Documento',
  stepLabelAnalysis = 'Análise',
  stepLabelResult = 'Resultado',
  progressIndicatorInactiveCircleColor = '#e5e5e5',
  progressIndicatorInactiveTextColor = '#666666',
  selfieCaptureButtonText = 'Capturar Agora',
  selfieRetakeButtonText = 'Tirar Outra',
  selfieConfirmButtonText = 'Confirmar',
  detectionDefaultMessage = 'Posicione seu rosto na área indicada',
  detectionCenterMessage = 'Centralize seu rosto',
  detectionLightingMessage = 'Melhore a iluminação',
  detectionQualityMessage = 'Aproxime seu rosto',
  detectionPerfectMessage = 'Perfeito! Capturando...',
  
  contractTitle = 'Contrato de Prestação de Serviços',
  clauses = [
    { title: 'Objeto do Contrato', content: 'O presente contrato tem por objeto estabelecer os termos e condições para a prestação de serviços entre as partes.' },
    { title: 'Obrigações das Partes', content: 'As partes comprometem-se a cumprir todas as disposições previstas neste instrumento, agindo sempre com boa-fé e transparência.' },
    { title: 'Prazo de Vigência', content: 'Este contrato terá vigência pelo prazo acordado entre as partes, podendo ser renovado mediante acordo mútuo.' }
  ],
  
  contractPrimaryColor,
  contractTextColor,
  contractBackgroundColor,
  contractFontFamily,
  
  parabensTitle = 'Parabéns!',
  parabensSubtitle = 'Processo concluído com sucesso!',
  parabensDescription = 'Sua documentação foi processada. Aguarde as próximas instruções.',
  parabensCardColor = '#dbeafe',
  parabensBackgroundColor = '#f0fdf4',
  parabensButtonColor = '#22c55e',
  parabensTextColor = '#1e40af',
  parabensFontFamily = 'Arial, sans-serif',
  parabensButtonText = 'Confirmar e Continuar',
  
  progressCardColor = '#dbeafe',
  progressButtonColor = '#22c55e',
  progressTextColor = '#1e40af',
  progressTitle = 'Assinatura Digital',
  progressSubtitle = 'Conclua os passos abaixo para finalizar o processo.',
  progressActiveStepBg = 'rgba(255,255,255,0.2)',
  progressCompleteStepBg = 'rgba(34,197,94,0.2)',
  progressInactiveStepBg = 'rgba(255,255,255,0.05)',
  progressCheckIconColor = '#22c55e',
  progressInactiveCircleBg = 'rgba(255,255,255,0.2)',
  
  wizardStep: externalWizardStep,
  onStepChange,
  verificationPreviewMode
}: SignaturePreviewProps) => {
  const [internalWizardStep, setInternalWizardStep] = useState(0);
  
  const wizardStep = externalWizardStep !== undefined ? externalWizardStep : internalWizardStep;
  
  const handleStepChange = (step: number) => {
    if (onStepChange) {
      onStepChange(step);
    } else {
      setInternalWizardStep(step);
    }
  };

  const totalSteps = 3;
  const progress = wizardStep === 0 ? 0 : Math.round((wizardStep / (totalSteps - 1)) * 100);

  const getLogoSizeStyle = () => {
    switch (logoSize) {
      case 'small': return '80px';
      case 'large': return '150px';
      default: return '120px';
    }
  };

  const getLogoAlignment = () => {
    switch (logoPosition) {
      case 'left': return 'flex-start';
      case 'right': return 'flex-end';
      default: return 'center';
    }
  };

  const verificationSteps = [
    {
      icon: Camera,
      title: selfieStepTitle,
      description: selfieStepDescription,
    },
    {
      icon: FileText,
      title: documentStepTitle,
      description: documentStepDescription,
    },
    {
      icon: CheckCircle,
      title: analysisStepTitle,
      description: analysisStepDescription,
    },
    {
      icon: Award,
      title: resultStepTitle,
      description: resultStepDescription,
    },
  ];

  const renderVerificationStep = () => {
    const vPrimaryColor = verificationPrimaryColor || primaryColor;
    const vTextColor = verificationTextColor || textColor;
    const vFontFamily = verificationFontFamily || fontFamily;
    const vLogoUrl = verificationLogoUrl || logoUrl;
    const vLogoSize = verificationLogoSize || logoSize;
    const vLogoPosition = verificationLogoPosition || logoPosition;
    const vFooterText = verificationFooterText || footerText;
    
    const getVerificationLogoSize = () => {
      switch (vLogoSize) {
        case 'small': return '80px';
        case 'large': return '200px';
        default: return '140px';
      }
    };
    
    const getVerificationLogoAlignment = () => {
      switch (vLogoPosition) {
        case 'left': return 'flex-start';
        case 'right': return 'flex-end';
        default: return 'center';
      }
    };
    
    const stepLabels = [
      { label: stepLabelSelfie, icon: Camera },
      { label: stepLabelDocument, icon: FileText },
      { label: stepLabelAnalysis, icon: CheckCircle },
      { label: stepLabelResult, icon: Award },
    ];

    const detectionMessages = [
      { label: 'Padrão', message: detectionDefaultMessage },
      { label: 'Centralizar', message: detectionCenterMessage },
      { label: 'Iluminação', message: detectionLightingMessage },
      { label: 'Qualidade', message: detectionQualityMessage },
      { label: 'Perfeito', message: detectionPerfectMessage },
    ];

    const renderTelaInicialPreview = () => (
      <div 
        className="min-h-[400px] flex flex-col items-center p-6"
        style={{ backgroundColor, fontFamily: vFontFamily }}
        data-testid="preview-tela-inicial"
      >
        {vLogoUrl && (
          <div 
            className="w-full mb-6"
            style={{ display: 'flex', justifyContent: getVerificationLogoAlignment() }}
          >
            <img 
              src={vLogoUrl} 
              alt="Logo" 
              style={{ maxWidth: getVerificationLogoSize(), height: 'auto' }}
              data-testid="img-preview-logo"
            />
          </div>
        )}

        <div 
          className="w-24 h-24 rounded-full flex items-center justify-center mb-4 relative"
          style={{ backgroundColor: `${vPrimaryColor}15` }}
        >
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${vPrimaryColor}25` }}
          >
            <Camera className="w-8 h-8" style={{ color: vPrimaryColor }} />
          </div>
        </div>

        <h1 
          className="text-2xl font-bold text-center mb-2"
          style={{ color: vTextColor }}
          data-testid="text-verification-title"
        >
          {welcomeText}
        </h1>

        <p 
          className="text-center mb-4 max-w-sm text-sm"
          style={{ color: vTextColor, opacity: 0.85 }}
          data-testid="text-verification-instructions"
        >
          {instructions}
        </p>

        <Button
          size="lg"
          className="h-12 px-6 text-base font-bold shadow-lg mb-4"
          style={{ backgroundColor: vPrimaryColor, color: 'white' }}
          data-testid="button-start-verification"
        >
          {selfieButtonText}
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>

        <p 
          className="text-xs text-center max-w-xs"
          style={{ color: vPrimaryColor }}
          data-testid="text-security"
        >
          <Shield className="w-3 h-3 inline mr-1" />
          {securityText}
        </p>
      </div>
    );

    const renderEtapasFluxoPreview = () => (
      <div 
        className="min-h-[400px] relative p-6"
        style={{ backgroundColor, fontFamily: vFontFamily }}
        data-testid="preview-etapas-fluxo"
      >
        <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center" style={{ minHeight: '300px' }}>
          <p className="text-gray-400 text-sm">Área de Câmera</p>
        </div>
        
        <div 
          className="absolute bottom-4 left-4 p-4 rounded-xl border shadow-lg max-w-xs"
          style={{ borderColor: `${vPrimaryColor}30`, backgroundColor: 'white' }}
          data-testid="progress-popup"
        >
          <p className="text-xs font-semibold mb-3" style={{ color: vPrimaryColor }}>
            Progresso do Fluxo
          </p>
          <div className="space-y-2">
            {verificationSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === 0;
              const isComplete = false;
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded-lg"
                  style={{ 
                    backgroundColor: isActive ? `${vPrimaryColor}15` : 'transparent',
                    borderLeft: isActive ? `3px solid ${vPrimaryColor}` : '3px solid transparent'
                  }}
                >
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ 
                      backgroundColor: isActive ? vPrimaryColor : progressIndicatorInactiveCircleColor,
                      color: isActive ? 'white' : progressIndicatorInactiveTextColor
                    }}
                  >
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p 
                      className="text-xs font-medium truncate"
                      style={{ color: isActive ? vPrimaryColor : progressIndicatorInactiveTextColor }}
                    >
                      {step.title}
                    </p>
                    <p 
                      className="text-xs truncate"
                      style={{ color: vTextColor, opacity: 0.6 }}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );

    const renderBarraNavegacaoPreview = () => (
      <div 
        className="min-h-[200px] flex flex-col items-center justify-center p-6"
        style={{ backgroundColor, fontFamily: vFontFamily }}
        data-testid="preview-barra-navegacao"
      >
        <p className="text-xs font-semibold mb-4 text-center opacity-70" style={{ color: vTextColor }}>
          Barra de Navegação (Etapas)
        </p>
        <div 
          className="w-full max-w-lg p-4 rounded-xl border"
          style={{ borderColor: `${vPrimaryColor}30`, backgroundColor: `${vPrimaryColor}05` }}
          data-testid="step-navigation-preview"
        >
          <div className="flex items-center justify-between gap-2">
            {stepLabels.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === 0;
              return (
                <div key={index} className="flex items-center" data-testid={`step-nav-${index}`}>
                  <div className="flex flex-col items-center gap-1">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ 
                        backgroundColor: isActive ? vPrimaryColor : progressIndicatorInactiveCircleColor,
                        color: isActive ? 'white' : progressIndicatorInactiveTextColor
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span 
                      className="text-sm font-medium text-center max-w-[80px]"
                      style={{ color: isActive ? vPrimaryColor : progressIndicatorInactiveTextColor }}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < stepLabels.length - 1 && (
                    <div 
                      className="h-0.5 flex-1 min-w-6 mx-2 -mt-6"
                      style={{ backgroundColor: progressIndicatorInactiveCircleColor }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );

    const renderBotoesCapturasPreview = () => (
      <div 
        className="min-h-[200px] flex flex-col items-center justify-center p-6"
        style={{ backgroundColor, fontFamily: vFontFamily }}
        data-testid="preview-botoes-captura"
      >
        <p className="text-xs font-semibold mb-4 text-center opacity-70" style={{ color: vTextColor }}>
          Botões da Captura de Selfie
        </p>
        <div 
          className="w-full max-w-md p-6 rounded-xl border"
          style={{ borderColor: `${vPrimaryColor}30`, backgroundColor: `${vPrimaryColor}05` }}
          data-testid="selfie-capture-preview"
        >
          <div className="flex flex-col items-center gap-4">
            <Button
              size="lg"
              className="w-full max-w-xs h-12"
              style={{ backgroundColor: vPrimaryColor, color: 'white' }}
              data-testid="preview-capture-button"
            >
              <Camera className="w-5 h-5 mr-2" />
              {selfieCaptureButtonText}
            </Button>
            <div className="flex gap-3 w-full max-w-xs">
              <Button
                variant="outline"
                className="flex-1 h-10"
                style={{ borderColor: vPrimaryColor, color: vPrimaryColor }}
                data-testid="preview-retake-button"
              >
                {selfieRetakeButtonText}
              </Button>
              <Button
                className="flex-1 h-10"
                style={{ backgroundColor: '#22c55e', color: 'white' }}
                data-testid="preview-confirm-button"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                {selfieConfirmButtonText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );

    const renderMensagensDeteccaoPreview = () => (
      <div 
        className="min-h-[300px] flex flex-col items-center justify-center p-6"
        style={{ backgroundColor, fontFamily: vFontFamily }}
        data-testid="preview-mensagens-deteccao"
      >
        <p className="text-xs font-semibold mb-4 text-center opacity-70" style={{ color: vTextColor }}>
          Mensagens de Detecção Facial
        </p>
        <div 
          className="w-full max-w-md p-4 rounded-xl border"
          style={{ borderColor: `${vPrimaryColor}30`, backgroundColor: `${vPrimaryColor}05` }}
          data-testid="detection-messages-preview"
        >
          <div className="space-y-3">
            {detectionMessages.map((item, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 text-sm p-3 rounded-lg"
                style={{ backgroundColor: `${vPrimaryColor}10` }}
                data-testid={`detection-message-${index}`}
              >
                <span 
                  className="font-semibold min-w-[90px]"
                  style={{ color: vPrimaryColor }}
                >
                  {item.label}:
                </span>
                <span style={{ color: vTextColor }}>{item.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    if (verificationPreviewMode) {
      switch (verificationPreviewMode) {
        case 'tela-inicial':
          return renderTelaInicialPreview();
        case 'etapas-fluxo':
          return renderEtapasFluxoPreview();
        case 'barra-navegacao':
          return renderBarraNavegacaoPreview();
        case 'botoes-captura':
          return renderBotoesCapturasPreview();
        case 'mensagens-deteccao':
          return renderMensagensDeteccaoPreview();
        default:
          return renderTelaInicialPreview();
      }
    }
    
    return (
      <div 
        className="min-h-[500px] flex flex-col items-center p-6"
        style={{ backgroundColor, fontFamily: vFontFamily }}
        data-testid="preview-verification-step"
      >
        <div 
          className="w-full max-w-md mb-6 p-4 rounded-xl border"
          style={{ borderColor: `${vPrimaryColor}30`, backgroundColor: `${vPrimaryColor}05` }}
          data-testid="step-navigation-preview"
        >
          <p className="text-xs font-semibold mb-3 text-center opacity-70" style={{ color: vTextColor }}>
            Barra de Navegação
          </p>
          <div className="flex items-center justify-between gap-2">
            {stepLabels.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === 0;
              return (
                <div key={index} className="flex items-center" data-testid={`step-nav-${index}`}>
                  <div className="flex flex-col items-center gap-1">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ 
                        backgroundColor: isActive ? vPrimaryColor : progressIndicatorInactiveCircleColor,
                        color: isActive ? 'white' : progressIndicatorInactiveTextColor
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span 
                      className="text-xs font-medium text-center max-w-[60px] truncate"
                      style={{ color: isActive ? vPrimaryColor : progressIndicatorInactiveTextColor }}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < stepLabels.length - 1 && (
                    <div 
                      className="h-0.5 flex-1 min-w-4 mx-1 -mt-4"
                      style={{ backgroundColor: progressIndicatorInactiveCircleColor }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {vLogoUrl && (
          <div 
            className="w-full mb-6"
            style={{ display: 'flex', justifyContent: getVerificationLogoAlignment() }}
          >
            <img 
              src={vLogoUrl} 
              alt="Logo" 
              style={{ maxWidth: getVerificationLogoSize(), height: 'auto' }}
              data-testid="img-preview-logo"
            />
          </div>
        )}

        <div 
          className="w-32 h-32 rounded-full flex items-center justify-center mb-6 relative"
          style={{ backgroundColor: `${vPrimaryColor}15` }}
          data-testid="selfie-illustration"
        >
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${vPrimaryColor}25` }}
          >
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center relative"
              style={{ backgroundColor: `${vPrimaryColor}40` }}
            >
              <svg 
                viewBox="0 0 24 24" 
                className="w-10 h-10"
                fill="none"
                stroke={vPrimaryColor}
                strokeWidth="1.5"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
              </svg>
            </div>
          </div>
          <div 
            className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
            style={{ backgroundColor: vPrimaryColor }}
          >
            <Camera className="w-5 h-5 text-white" />
          </div>
        </div>

        <h1 
          className="text-3xl font-bold text-center mb-3"
          style={{ color: vTextColor }}
          data-testid="text-verification-title"
        >
          {welcomeText}
        </h1>

        <p 
          className="text-center mb-8 max-w-md"
          style={{ color: vTextColor, opacity: 0.85 }}
          data-testid="text-verification-instructions"
        >
          {instructions}
        </p>

        <div className="w-full max-w-sm space-y-4 mb-8">
          {verificationSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-xl bg-white border shadow-sm"
                style={{ borderColor: `${vPrimaryColor}20` }}
                data-testid={`card-verification-step-${index}`}
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${vPrimaryColor}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: vPrimaryColor }} />
                </div>
                <div>
                  <h3 className="font-bold" style={{ color: vTextColor }}>{step.title}</h3>
                  <p className="text-sm" style={{ color: vTextColor, opacity: 0.75 }}>{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          size="lg"
          className="h-14 px-8 text-lg font-bold shadow-lg"
          style={{ backgroundColor: vPrimaryColor, color: 'white' }}
          onClick={() => handleStepChange(1)}
          data-testid="button-start-verification"
        >
          {selfieButtonText}
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>

        <p 
          className="mt-4 text-sm text-center max-w-sm"
          style={{ color: vTextColor, opacity: 0.75 }}
          data-testid="text-selfie-instruction"
        >
          {selfieInstructionText}
        </p>

        <p 
          className="mt-4 text-xs text-center max-w-xs"
          style={{ color: vPrimaryColor }}
          data-testid="text-security"
        >
          <Shield className="w-4 h-4 inline mr-1" />
          {securityText}
        </p>

        <div 
          className="w-full max-w-md mt-8 p-4 rounded-xl border"
          style={{ borderColor: `${vPrimaryColor}30`, backgroundColor: `${vPrimaryColor}05` }}
          data-testid="selfie-capture-preview"
        >
          <p className="text-xs font-semibold mb-3 text-center opacity-70" style={{ color: vTextColor }}>
            Prévia da Captura de Selfie
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              size="sm"
              style={{ backgroundColor: vPrimaryColor, color: 'white' }}
              data-testid="preview-capture-button"
            >
              <Camera className="w-4 h-4 mr-1" />
              {selfieCaptureButtonText}
            </Button>
            <Button
              variant="outline"
              size="sm"
              style={{ borderColor: vPrimaryColor, color: vPrimaryColor }}
              data-testid="preview-retake-button"
            >
              {selfieRetakeButtonText}
            </Button>
            <Button
              size="sm"
              style={{ backgroundColor: '#22c55e', color: 'white' }}
              data-testid="preview-confirm-button"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              {selfieConfirmButtonText}
            </Button>
          </div>
        </div>

        <div 
          className="w-full max-w-md mt-4 p-4 rounded-xl border"
          style={{ borderColor: `${vPrimaryColor}30`, backgroundColor: `${vPrimaryColor}05` }}
          data-testid="detection-messages-preview"
        >
          <p className="text-xs font-semibold mb-3 text-center opacity-70" style={{ color: vTextColor }}>
            Mensagens de Detecção Facial
          </p>
          <div className="space-y-2">
            {detectionMessages.map((item, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 text-xs p-2 rounded-lg"
                style={{ backgroundColor: `${vPrimaryColor}10` }}
                data-testid={`detection-message-${index}`}
              >
                <span 
                  className="font-semibold min-w-[70px]"
                  style={{ color: vPrimaryColor }}
                >
                  {item.label}:
                </span>
                <span style={{ color: vTextColor }}>{item.message}</span>
              </div>
            ))}
          </div>
        </div>
        
        {vFooterText && (
          <p 
            className="mt-4 text-xs text-center opacity-60"
            style={{ color: vTextColor }}
          >
            {vFooterText}
          </p>
        )}
      </div>
    );
  };

  const renderContractStep = () => {
    const cPrimaryColor = contractPrimaryColor || primaryColor;
    const cTextColor = contractTextColor || textColor;
    const cBackgroundColor = contractBackgroundColor || backgroundColor;
    const cFontFamily = contractFontFamily || fontFamily;
    
    return (
      <div 
        className="min-h-[500px] p-6"
        style={{ backgroundColor: cBackgroundColor, fontFamily: cFontFamily }}
        data-testid="preview-contract-step"
      >
        {logoUrl && (
          <div 
            className="w-full mb-6"
            style={{ display: 'flex', justifyContent: getLogoAlignment() }}
          >
            <img 
              src={logoUrl} 
              alt="Logo" 
              style={{ maxWidth: getLogoSizeStyle(), height: 'auto' }}
            />
          </div>
        )}

        <div className="text-center mb-6">
          <h2 
            className="text-2xl font-bold mb-2"
            style={{ color: cTextColor }}
            data-testid="text-contract-title"
          >
            {contractTitle}
          </h2>
          <p style={{ color: cTextColor, opacity: 0.7 }}>
            Protocolo: <span className="font-mono font-semibold" style={{ color: cPrimaryColor }}>CONT-PREVIEW-001</span>
          </p>
        </div>

        <Card className="mb-6" style={{ borderColor: `${cPrimaryColor}30` }}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: cPrimaryColor }} />
              <CardTitle className="text-lg" style={{ color: cTextColor }}>Dados do Contratante</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2" style={{ color: cTextColor }}>
              <User className="w-4 h-4 opacity-60" />
              <span className="font-medium">Nome:</span> {clientName}
            </div>
            <div className="flex items-center gap-2" style={{ color: cTextColor }}>
              <CreditCard className="w-4 h-4 opacity-60" />
              <span className="font-medium">CPF:</span> {clientCpf}
            </div>
            <div className="flex items-center gap-2" style={{ color: cTextColor }}>
              <Mail className="w-4 h-4 opacity-60" />
              <span className="font-medium">E-mail:</span> {clientEmail}
            </div>
            {clientPhone && (
              <div className="flex items-center gap-2" style={{ color: cTextColor }}>
                <Phone className="w-4 h-4 opacity-60" />
                <span className="font-medium">Telefone:</span> {clientPhone}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6" style={{ borderColor: `${cPrimaryColor}30` }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg" style={{ color: cTextColor }}>Cláusulas do Contrato</CardTitle>
          </CardHeader>
          <CardContent className="max-h-48 overflow-y-auto space-y-4">
            {clauses.map((clause, index) => (
              <div key={index} data-testid={`contract-clause-${index}`}>
                <h4 className="font-bold mb-1" style={{ color: cTextColor }}>{clause.title}</h4>
                <p className="text-sm text-justify" style={{ color: cTextColor, opacity: 0.85, fontSize }}>
                  {clause.content}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-6 border-2" style={{ borderColor: cPrimaryColor, backgroundColor: `${cPrimaryColor}05` }}>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm mb-2" style={{ color: cTextColor, opacity: 0.7 }}>Assinado digitalmente por:</p>
              <p 
                className="text-2xl mb-1"
                style={{ 
                  fontFamily: "'Brush Script MT', 'Segoe Script', cursive", 
                  color: cPrimaryColor 
                }}
              >
                {clientName}
              </p>
              <div 
                className="w-48 h-0.5 mx-auto mb-2"
                style={{ backgroundColor: cPrimaryColor }}
              />
              <p className="text-sm font-semibold" style={{ color: cTextColor }}>{clientName}</p>
              <p className="text-xs" style={{ color: cTextColor, opacity: 0.7 }}>CPF: {clientCpf}</p>
            </div>
          </CardContent>
        </Card>

        {footerText && (
          <p 
            className="text-center text-xs"
            style={{ color: cTextColor, opacity: 0.6 }}
            data-testid="text-contract-footer"
          >
            {footerText}
          </p>
        )}

        <div className="flex justify-between gap-4 mt-6">
          <Button
            variant="outline"
            onClick={() => handleStepChange(0)}
            style={{ borderColor: cPrimaryColor, color: cPrimaryColor }}
            data-testid="button-contract-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button
            onClick={() => handleStepChange(2)}
            style={{ backgroundColor: cPrimaryColor, color: 'white' }}
            data-testid="button-contract-sign"
          >
            <PenTool className="w-4 h-4 mr-2" />
            Assinar Contrato
          </Button>
        </div>
      </div>
    );
  };

  const renderCongratulationsStep = () => {
    return (
      <div 
        className="min-h-[500px] flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: parabensBackgroundColor, fontFamily: parabensFontFamily }}
        data-testid="preview-congratulations-step"
      >
        {logoUrl && (
          <div 
            className="w-full mb-6"
            style={{ display: 'flex', justifyContent: getLogoAlignment() }}
          >
            <img 
              src={logoUrl} 
              alt="Logo" 
              style={{ maxWidth: getLogoSizeStyle(), height: 'auto' }}
            />
          </div>
        )}

        <div 
          className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: `${parabensButtonColor}20` }}
        >
          <Award className="w-14 h-14" style={{ color: parabensButtonColor }} />
        </div>

        <h1 
          className="text-4xl font-bold text-center mb-2"
          style={{ color: parabensTextColor }}
          data-testid="text-parabens-title"
        >
          {parabensTitle}
        </h1>

        <h2 
          className="text-xl text-center mb-4"
          style={{ color: parabensTextColor, opacity: 0.9 }}
          data-testid="text-parabens-subtitle"
        >
          {parabensSubtitle}
        </h2>

        <p 
          className="text-center mb-8 max-w-md"
          style={{ color: parabensTextColor, opacity: 0.75 }}
          data-testid="text-parabens-description"
        >
          {parabensDescription}
        </p>

        <Card 
          className="w-full max-w-md mb-6"
          style={{ backgroundColor: parabensCardColor, borderColor: `${parabensTextColor}30` }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2" style={{ color: parabensTextColor }}>
              <CheckCircle className="w-5 h-5" style={{ color: parabensButtonColor }} />
              Detalhes do Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between" style={{ color: parabensTextColor }}>
              <span className="opacity-70">Contratante</span>
              <span className="font-medium">{clientName}</span>
            </div>
            <div className="flex justify-between" style={{ color: parabensTextColor }}>
              <span className="opacity-70">CPF</span>
              <span className="font-medium">{clientCpf}</span>
            </div>
            <div className="flex justify-between" style={{ color: parabensTextColor }}>
              <span className="opacity-70">Data da Assinatura</span>
              <span className="font-medium">{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex justify-between" style={{ color: parabensTextColor }}>
              <span className="opacity-70">Protocolo</span>
              <span className="font-mono font-semibold" style={{ color: primaryColor }}>CONT-PREVIEW-001</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 w-full max-w-md">
          <Button
            size="lg"
            className="w-full h-12"
            style={{ backgroundColor: parabensButtonColor, color: 'white' }}
            data-testid="button-download-contract"
          >
            <Download className="w-5 h-5 mr-2" />
            Baixar Contrato
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full h-12"
            style={{ borderColor: parabensTextColor, color: parabensTextColor }}
            data-testid="button-finish"
          >
            <Home className="w-5 h-5 mr-2" />
            {parabensButtonText}
          </Button>
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStepChange(1)}
            style={{ color: parabensTextColor }}
            data-testid="button-parabens-back"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar ao Contrato
          </Button>
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (wizardStep) {
      case 0:
        return renderVerificationStep();
      case 1:
        return renderContractStep();
      case 2:
        return renderCongratulationsStep();
      default:
        return renderVerificationStep();
    }
  };

  const stepNames = ['Verificação', 'Contrato', 'Parabéns'];

  return (
    <div 
      className="w-full rounded-lg overflow-hidden border shadow-lg"
      style={{ fontFamily }}
      data-testid="signature-preview"
    >
      <div 
        className="p-4 border-b"
        style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30` }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: progressTextColor || textColor }}>
            Pré-visualização do Fluxo de Assinatura
          </span>
          <span className="text-sm" style={{ color: progressTextColor || primaryColor }}>
            {progress}% completo
          </span>
        </div>
        <Progress 
          value={progress} 
          className="h-2"
          style={{ 
            backgroundColor: `${primaryColor}20`,
          }}
        />
        
        <div className="flex justify-between mt-4">
          {stepNames.map((name, index) => (
            <button
              key={index}
              onClick={() => handleStepChange(index)}
              className="flex flex-col items-center gap-1 transition-all"
              data-testid={`button-step-${index}`}
            >
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  index === wizardStep ? 'scale-110' : ''
                }`}
                style={{ 
                  backgroundColor: index <= wizardStep ? primaryColor : `${primaryColor}30`,
                  color: index <= wizardStep ? 'white' : (progressTextColor || textColor)
                }}
              >
                {index + 1}
              </div>
              <span 
                className="text-xs font-medium"
                style={{ 
                  color: index === wizardStep ? (progressTextColor || primaryColor) : `${progressTextColor || textColor}80`
                }}
              >
                {name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        {renderStepContent()}
      </div>
    </div>
  );
};
