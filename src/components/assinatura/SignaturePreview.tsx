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
  
  contractTitle?: string;
  clauses?: ContractClause[];
  
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
  
  wizardStep?: number;
  onStepChange?: (step: number) => void;
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
  
  contractTitle = 'Contrato de Prestação de Serviços',
  clauses = [
    { title: 'Objeto do Contrato', content: 'O presente contrato tem por objeto estabelecer os termos e condições para a prestação de serviços entre as partes.' },
    { title: 'Obrigações das Partes', content: 'As partes comprometem-se a cumprir todas as disposições previstas neste instrumento, agindo sempre com boa-fé e transparência.' },
    { title: 'Prazo de Vigência', content: 'Este contrato terá vigência pelo prazo acordado entre as partes, podendo ser renovado mediante acordo mútuo.' }
  ],
  
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
  
  wizardStep: externalWizardStep,
  onStepChange
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
      title: 'Tire uma selfie',
      description: 'Posicione seu rosto na área indicada',
    },
    {
      icon: FileText,
      title: 'Fotografe seu documento',
      description: 'CNH, RG ou outro documento com foto',
    },
    {
      icon: CheckCircle,
      title: 'Verificação automática',
      description: 'Comparamos sua foto com o documento',
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
    
    return (
      <div 
        className="min-h-[500px] flex flex-col items-center justify-center p-6"
        style={{ backgroundColor, fontFamily: vFontFamily }}
        data-testid="preview-verification-step"
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
          Iniciar Verificação
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>

        <p 
          className="mt-6 text-xs text-center max-w-xs"
          style={{ color: vPrimaryColor }}
          data-testid="text-security"
        >
          <Shield className="w-4 h-4 inline mr-1" />
          {securityText}
        </p>
        
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
    return (
      <div 
        className="min-h-[500px] p-6"
        style={{ backgroundColor, fontFamily }}
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
            style={{ color: textColor }}
            data-testid="text-contract-title"
          >
            {contractTitle}
          </h2>
          <p style={{ color: textColor, opacity: 0.7 }}>
            Protocolo: <span className="font-mono font-semibold" style={{ color: primaryColor }}>CONT-PREVIEW-001</span>
          </p>
        </div>

        <Card className="mb-6" style={{ borderColor: `${primaryColor}30` }}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: primaryColor }} />
              <CardTitle className="text-lg" style={{ color: textColor }}>Dados do Contratante</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2" style={{ color: textColor }}>
              <User className="w-4 h-4 opacity-60" />
              <span className="font-medium">Nome:</span> {clientName}
            </div>
            <div className="flex items-center gap-2" style={{ color: textColor }}>
              <CreditCard className="w-4 h-4 opacity-60" />
              <span className="font-medium">CPF:</span> {clientCpf}
            </div>
            <div className="flex items-center gap-2" style={{ color: textColor }}>
              <Mail className="w-4 h-4 opacity-60" />
              <span className="font-medium">E-mail:</span> {clientEmail}
            </div>
            {clientPhone && (
              <div className="flex items-center gap-2" style={{ color: textColor }}>
                <Phone className="w-4 h-4 opacity-60" />
                <span className="font-medium">Telefone:</span> {clientPhone}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6" style={{ borderColor: `${primaryColor}30` }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg" style={{ color: textColor }}>Cláusulas do Contrato</CardTitle>
          </CardHeader>
          <CardContent className="max-h-48 overflow-y-auto space-y-4">
            {clauses.map((clause, index) => (
              <div key={index} data-testid={`contract-clause-${index}`}>
                <h4 className="font-bold mb-1" style={{ color: textColor }}>{clause.title}</h4>
                <p className="text-sm text-justify" style={{ color: textColor, opacity: 0.85, fontSize }}>
                  {clause.content}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-6 border-2" style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}05` }}>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm mb-2" style={{ color: textColor, opacity: 0.7 }}>Assinado digitalmente por:</p>
              <p 
                className="text-2xl mb-1"
                style={{ 
                  fontFamily: "'Brush Script MT', 'Segoe Script', cursive", 
                  color: primaryColor 
                }}
              >
                {clientName}
              </p>
              <div 
                className="w-48 h-0.5 mx-auto mb-2"
                style={{ backgroundColor: primaryColor }}
              />
              <p className="text-sm font-semibold" style={{ color: textColor }}>{clientName}</p>
              <p className="text-xs" style={{ color: textColor, opacity: 0.7 }}>CPF: {clientCpf}</p>
            </div>
          </CardContent>
        </Card>

        {footerText && (
          <p 
            className="text-center text-xs"
            style={{ color: textColor, opacity: 0.6 }}
            data-testid="text-contract-footer"
          >
            {footerText}
          </p>
        )}

        <div className="flex justify-between gap-4 mt-6">
          <Button
            variant="outline"
            onClick={() => handleStepChange(0)}
            style={{ borderColor: primaryColor, color: primaryColor }}
            data-testid="button-contract-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button
            onClick={() => handleStepChange(2)}
            style={{ backgroundColor: primaryColor, color: 'white' }}
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
          <span className="text-sm font-medium" style={{ color: textColor }}>
            Pré-visualização do Fluxo de Assinatura
          </span>
          <span className="text-sm" style={{ color: primaryColor }}>
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
                  color: index <= wizardStep ? 'white' : textColor
                }}
              >
                {index + 1}
              </div>
              <span 
                className="text-xs font-medium"
                style={{ 
                  color: index === wizardStep ? primaryColor : `${textColor}80`
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
