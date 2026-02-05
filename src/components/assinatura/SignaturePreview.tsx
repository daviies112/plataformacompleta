import { useState } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  ArrowRight, 
  Camera, 
  FileText, 
  CheckCircle, 
  Shield, 
  Award
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
  
  selfieStepBackgroundColor?: string;
  selfieStepTextColor?: string;
  documentStepBackgroundColor?: string;
  documentStepTextColor?: string;
  analysisStepBackgroundColor?: string;
  analysisStepTextColor?: string;
  resultStepBackgroundColor?: string;
  resultStepTextColor?: string;
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
  verificationPreviewMode?: string;
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
  selfieStepBackgroundColor = '#ffffff',
  selfieStepTextColor = '#000000',
  documentStepTitle = 'Fotografe seu documento',
  documentStepDescription = 'CNH, RG ou outro documento com foto',
  documentStepBackgroundColor = '#ffffff',
  documentStepTextColor = '#000000',
  analysisStepTitle = 'Verificação automática',
  analysisStepDescription = 'Comparamos sua foto com o documento',
  analysisStepBackgroundColor = '#ffffff',
  analysisStepTextColor = '#000000',
  resultStepTitle = 'Verificação concluída',
  resultStepDescription = 'Sua identidade foi verificada com sucesso',
  resultStepBackgroundColor = '#ffffff',
  resultStepTextColor = '#000000',
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
  clauses = [],
  
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
  verificationPreviewMode = 'tela-inicial'
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

  const verificationSteps = [
    { icon: Camera, title: selfieStepTitle, description: selfieStepDescription, backgroundColor: selfieStepBackgroundColor, textColor: selfieStepTextColor, label: stepLabelSelfie },
    { icon: FileText, title: documentStepTitle, description: documentStepDescription, backgroundColor: documentStepBackgroundColor, textColor: documentStepTextColor, label: stepLabelDocument },
    { icon: CheckCircle, title: analysisStepTitle, description: analysisStepDescription, backgroundColor: analysisStepBackgroundColor, textColor: analysisStepTextColor, label: stepLabelAnalysis },
    { icon: Award, title: resultStepTitle, description: resultStepDescription, backgroundColor: resultStepBackgroundColor, textColor: resultStepTextColor, label: stepLabelResult },
  ];

  const renderTelaInicialPreview = () => (
    <div className="min-h-[400px] flex flex-col items-center p-6" style={{ backgroundColor: selfieStepBackgroundColor || backgroundColor, fontFamily: vFontFamily }}>
      {vLogoUrl && (
        <div className="w-full mb-6" style={{ display: 'flex', justifyContent: getVerificationLogoAlignment() }}>
          <img src={vLogoUrl} alt="Logo" style={{ maxWidth: getVerificationLogoSize(), height: 'auto' }} />
        </div>
      )}
      <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4 relative" style={{ backgroundColor: `${vPrimaryColor}15` }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${vPrimaryColor}25` }}>
          <Camera className="w-8 h-8" style={{ color: vPrimaryColor }} />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-center mb-2" style={{ color: selfieStepTextColor || vTextColor }}>{welcomeText}</h1>
      <p className="text-center mb-4 max-w-sm text-sm" style={{ color: selfieStepTextColor || vTextColor, opacity: 0.85 }}>{instructions}</p>
      <Button size="lg" className="h-12 px-6 text-base font-bold shadow-lg mb-4" style={{ backgroundColor: vPrimaryColor, color: 'white' }}>
        {selfieButtonText}
        <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
      <p className="text-xs text-center max-w-xs" style={{ color: selfieStepTextColor || vPrimaryColor }}>
        <Shield className="w-3 h-3 inline mr-1" />
        {securityText}
      </p>
    </div>
  );

  const renderEtapasFluxoPreview = () => (
    <div className="min-h-[400px] relative p-6" style={{ backgroundColor, fontFamily: vFontFamily }}>
      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center" style={{ minHeight: '300px' }}>
        <p className="text-gray-400 text-sm">Área de Câmera</p>
      </div>
      <div className="absolute bottom-4 left-4 p-4 rounded-xl border shadow-lg max-w-xs" style={{ borderColor: `${vPrimaryColor}30`, backgroundColor: 'white' }}>
        <p className="text-xs font-semibold mb-3" style={{ color: vPrimaryColor }}>Progresso do Fluxo</p>
        <div className="space-y-2">
          {verificationSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === 0;
            return (
              <div key={index} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: isActive ? (step.backgroundColor || `${vPrimaryColor}15`) : 'transparent', borderLeft: isActive ? `3px solid ${vPrimaryColor}` : '3px solid transparent' }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isActive ? vPrimaryColor : progressIndicatorInactiveCircleColor, color: isActive ? 'white' : progressIndicatorInactiveTextColor }}>
                  <Icon className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: isActive ? (step.textColor || vPrimaryColor) : progressIndicatorInactiveTextColor }}>{step.label}</p>
                  <p className="text-xs truncate" style={{ color: isActive ? (step.textColor || vTextColor) : vTextColor, opacity: 0.6 }}>{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderAnalisePreview = () => (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: analysisStepBackgroundColor || backgroundColor, color: analysisStepTextColor || vTextColor, fontFamily: vFontFamily }}>
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: `${vPrimaryColor} transparent ${vPrimaryColor} ${vPrimaryColor}` }}></div>
      <h2 className="text-xl font-bold mb-2" style={{ color: analysisStepTextColor || vTextColor }}>{analysisStepTitle}</h2>
      <p className="opacity-80" style={{ color: analysisStepTextColor || vTextColor }}>{analysisStepDescription}</p>
    </div>
  );

  const renderResultadoPreview = () => (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: resultStepBackgroundColor || backgroundColor, color: resultStepTextColor || vTextColor, fontFamily: vFontFamily }}>
      <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
      <h2 className="text-xl font-bold mb-2" style={{ color: resultStepTextColor || vTextColor }}>{resultStepTitle}</h2>
      <p className="opacity-80" style={{ color: resultStepTextColor || vTextColor }}>{resultStepDescription}</p>
    </div>
  );

  const renderDocumentoPreview = () => (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: documentStepBackgroundColor || backgroundColor, color: documentStepTextColor || vTextColor, fontFamily: vFontFamily }}>
      <FileText className="w-16 h-16 mb-4" style={{ color: vPrimaryColor }} />
      <h2 className="text-xl font-bold mb-2" style={{ color: documentStepTextColor || vTextColor }}>{documentStepTitle}</h2>
      <p className="opacity-80" style={{ color: documentStepTextColor || vTextColor }}>{documentStepDescription}</p>
    </div>
  );

  const renderBarraNavegacaoPreview = () => (
    <div className="min-h-[200px] flex flex-col items-center justify-center p-6" style={{ backgroundColor, fontFamily: vFontFamily }}>
      <p className="text-xs font-semibold mb-4 text-center opacity-70" style={{ color: vTextColor }}>Barra de Navegação (Etapas)</p>
      <div className="w-full max-w-lg p-4 rounded-xl border" style={{ borderColor: `${vPrimaryColor}30`, backgroundColor: `${vPrimaryColor}05` }}>
        <div className="flex items-center justify-between gap-2">
          {verificationSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === 0;
            return (
              <div key={index} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: isActive ? vPrimaryColor : progressIndicatorInactiveCircleColor, color: isActive ? 'white' : progressIndicatorInactiveTextColor }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-center max-w-[80px]" style={{ color: isActive ? vPrimaryColor : progressIndicatorInactiveTextColor }}>{step.label}</span>
                </div>
                {index < verificationSteps.length - 1 && <div className="h-0.5 flex-1 min-w-6 mx-2 -mt-6" style={{ backgroundColor: progressIndicatorInactiveCircleColor }} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderBotoesCapturasPreview = () => (
    <div className="min-h-[200px] flex flex-col items-center justify-center p-6" style={{ backgroundColor, fontFamily: vFontFamily }}>
      <p className="text-xs font-semibold mb-4 text-center opacity-70" style={{ color: vTextColor }}>Botões da Captura de Selfie</p>
      <div className="w-full max-w-md p-6 rounded-xl border" style={{ borderColor: `${vPrimaryColor}30`, backgroundColor: `${vPrimaryColor}05` }}>
        <div className="flex flex-col items-center gap-4">
          <Button size="lg" className="w-full max-w-xs h-12" style={{ backgroundColor: vPrimaryColor, color: 'white' }}>
            <Camera className="w-5 h-5 mr-2" />
            {selfieCaptureButtonText}
          </Button>
          <div className="flex gap-3 w-full max-w-xs">
            <Button variant="outline" className="flex-1 h-10" style={{ borderColor: vPrimaryColor, color: vPrimaryColor }}>{selfieRetakeButtonText}</Button>
            <Button className="flex-1 h-10" style={{ backgroundColor: '#22c55e', color: 'white' }}>
              <CheckCircle className="w-4 h-4 mr-1" />
              {selfieConfirmButtonText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMensagensDeteccaoPreview = () => (
    <div className="min-h-[300px] flex flex-col items-center justify-center p-6" style={{ backgroundColor, fontFamily: vFontFamily }}>
      <p className="text-xs font-semibold mb-4 text-center opacity-70" style={{ color: vTextColor }}>Mensagens de Detecção Facial</p>
      <div className="w-full max-w-md p-4 rounded-xl border" style={{ borderColor: `${vPrimaryColor}30`, backgroundColor: `${vPrimaryColor}05` }}>
        <div className="space-y-3">
          {[
            { label: 'Padrão', message: detectionDefaultMessage },
            { label: 'Centralizar', message: detectionCenterMessage },
            { label: 'Iluminação', message: detectionLightingMessage },
            { label: 'Qualidade', message: detectionQualityMessage },
            { label: 'Perfeito', message: detectionPerfectMessage },
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-3 text-sm p-3 rounded-lg" style={{ backgroundColor: `${vPrimaryColor}10` }}>
              <span className="font-semibold min-w-[90px]" style={{ color: vPrimaryColor }}>{item.label}:</span>
              <span style={{ color: vTextColor }}>{item.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (verificationPreviewMode) {
      case 'etapas-fluxo': return renderEtapasFluxoPreview();
      case 'barra-navegacao': return renderBarraNavegacaoPreview();
      case 'botoes-captura': return renderBotoesCapturasPreview();
      case 'mensagens-deteccao': return renderMensagensDeteccaoPreview();
      case 'documento': return renderDocumentoPreview();
      case 'analise': return renderAnalisePreview();
      case 'resultado': return renderResultadoPreview();
      case 'tela-inicial':
      default: return renderTelaInicialPreview();
    }
  };

  if (wizardStep === 1) {
    return (
      <Card className="w-full max-w-md mx-auto overflow-hidden shadow-xl" style={{ backgroundColor }}>
        <CardHeader className="p-0 border-b overflow-hidden" style={{ backgroundColor: headerBackgroundColor }}>
          <div className="p-4 flex items-center justify-between">
            <h3 className="font-bold text-white truncate">{companyName}</h3>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-white/30"></div>
              <div className="w-2 h-2 rounded-full bg-white/30"></div>
              <div className="w-2 h-2 rounded-full bg-white/30"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">{renderContent()}</CardContent>
        {vFooterText && (
          <CardFooter className="p-3 border-t justify-center bg-gray-50">
            <p className="text-[10px] text-gray-400">{vFooterText}</p>
          </CardFooter>
        )}
      </Card>
    );
  }

  // Fallback para outros steps (Contrato, Parabéns, etc)
  const renderContractStep = () => {
    const cPrimaryColor = contractPrimaryColor || primaryColor;
    const cTextColor = contractTextColor || textColor;
    const cBackgroundColor = contractBackgroundColor || backgroundColor;
    const cFontFamily = contractFontFamily || fontFamily;
    
    return (
      <div className="min-h-[500px] p-6" style={{ backgroundColor: cBackgroundColor, fontFamily: cFontFamily }}>
        {logoUrl && (
          <div className="w-full mb-6" style={{ display: 'flex', justifyContent: 'center' }}>
            <img src={logoUrl} alt="Logo" style={{ maxWidth: '120px', height: 'auto' }} />
          </div>
        )}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2" style={{ color: cTextColor }}>{contractTitle}</h2>
          <p style={{ color: cTextColor, opacity: 0.7 }}>Protocolo: <span className="font-mono font-semibold" style={{ color: cPrimaryColor }}>CONT-PREVIEW-001</span></p>
        </div>
        <div className="space-y-4 mb-8">
          {clauses.map((clause, idx) => (
            <div key={idx} className="p-4 rounded-lg border" style={{ borderColor: `${cPrimaryColor}20` }}>
              <h4 className="font-bold mb-1" style={{ color: cPrimaryColor }}>{idx + 1}. {clause.title}</h4>
              <p className="text-sm leading-relaxed" style={{ color: cTextColor }}>{clause.content}</p>
            </div>
          ))}
        </div>
        <Button className="w-full h-12 text-lg font-bold" style={{ backgroundColor: cPrimaryColor, color: 'white' }}>Assinar Digitalmente</Button>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden shadow-xl" style={{ backgroundColor }}>
      <CardContent className="p-0">
        {wizardStep === 2 ? renderContractStep() : renderTelaInicialPreview()}
      </CardContent>
    </Card>
  );
};