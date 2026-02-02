import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowRight, 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  ChevronRight, 
  CheckCircle2,
  User,
  Palette,
  FileText,
  Upload,
  X,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';

interface ContractClause {
  title: string;
  content: string;
}

export interface SimplifiedSignatureWizardProps {
  clientName: string;
  clientCpf: string;
  clientEmail: string;
  clientPhone: string;
  onClientNameChange: (value: string) => void;
  onClientCpfChange: (value: string) => void;
  onClientEmailChange: (value: string) => void;
  onClientPhoneChange: (value: string) => void;

  logoUrl: string;
  logoSize: 'small' | 'medium' | 'large';
  logoPosition: 'center' | 'left' | 'right';
  primaryColor: string;
  textColor: string;
  fontFamily: string;
  fontSize: string;
  companyName: string;
  footerText: string;
  onLogoUrlChange: (value: string) => void;
  onLogoSizeChange: (value: 'small' | 'medium' | 'large') => void;
  onLogoPositionChange: (value: 'center' | 'left' | 'right') => void;
  onPrimaryColorChange: (value: string) => void;
  onTextColorChange: (value: string) => void;
  onFontFamilyChange: (value: string) => void;
  onFontSizeChange: (value: string) => void;
  onCompanyNameChange: (value: string) => void;
  onFooterTextChange: (value: string) => void;
  onLogoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;

  verificationPrimaryColor: string;
  verificationTextColor: string;
  verificationFontFamily: string;
  verificationFontSize: string;
  verificationLogoUrl: string;
  verificationLogoSize: 'small' | 'medium' | 'large';
  verificationLogoPosition: 'center' | 'left' | 'right';
  verificationFooterText: string;
  verificationWelcomeText: string;
  verificationInstructions: string;
  verificationSecurityText: string;
  verificationBackgroundColor: string;
  verificationHeaderBackgroundColor: string;
  verificationHeaderCompanyName: string;
  onVerificationPrimaryColorChange: (value: string) => void;
  onVerificationTextColorChange: (value: string) => void;
  onVerificationFontFamilyChange: (value: string) => void;
  onVerificationFontSizeChange: (value: string) => void;
  onVerificationLogoUrlChange: (value: string) => void;
  onVerificationLogoSizeChange: (value: 'small' | 'medium' | 'large') => void;
  onVerificationLogoPositionChange: (value: 'center' | 'left' | 'right') => void;
  onVerificationFooterTextChange: (value: string) => void;
  onVerificationWelcomeTextChange: (value: string) => void;
  onVerificationInstructionsChange: (value: string) => void;
  onVerificationSecurityTextChange: (value: string) => void;
  onVerificationBackgroundColorChange: (value: string) => void;
  onVerificationHeaderBackgroundColorChange: (value: string) => void;
  onVerificationHeaderCompanyNameChange: (value: string) => void;

  progressCardColor: string;
  progressButtonColor: string;
  progressTextColor: string;
  progressTitle: string;
  progressSubtitle: string;
  progressStep1Title: string;
  progressStep1Description: string;
  progressStep2Title: string;
  progressStep2Description: string;
  progressStep3Title: string;
  progressStep3Description: string;
  progressButtonText: string;
  progressFontFamily: string;
  onProgressCardColorChange: (value: string) => void;
  onProgressButtonColorChange: (value: string) => void;
  onProgressTextColorChange: (value: string) => void;
  onProgressTitleChange: (value: string) => void;
  onProgressSubtitleChange: (value: string) => void;
  onProgressStep1TitleChange: (value: string) => void;
  onProgressStep1DescriptionChange: (value: string) => void;
  onProgressStep2TitleChange: (value: string) => void;
  onProgressStep2DescriptionChange: (value: string) => void;
  onProgressStep3TitleChange: (value: string) => void;
  onProgressStep3DescriptionChange: (value: string) => void;
  onProgressButtonTextChange: (value: string) => void;
  onProgressFontFamilyChange: (value: string) => void;

  parabensTitle: string;
  parabensSubtitle: string;
  parabensDescription: string;
  parabensCardColor: string;
  parabensBackgroundColor: string;
  parabensButtonColor: string;
  parabensTextColor: string;
  parabensFontFamily: string;
  parabensFormTitle: string;
  parabensButtonText: string;
  onParabensTitleChange: (value: string) => void;
  onParabensSubtitleChange: (value: string) => void;
  onParabensDescriptionChange: (value: string) => void;
  onParabensCardColorChange: (value: string) => void;
  onParabensBackgroundColorChange: (value: string) => void;
  onParabensButtonColorChange: (value: string) => void;
  onParabensTextColorChange: (value: string) => void;
  onParabensFontFamilyChange: (value: string) => void;
  onParabensFormTitleChange: (value: string) => void;
  onParabensButtonTextChange: (value: string) => void;

  contractTitle: string;
  clauses: ContractClause[];
  onContractTitleChange: (value: string) => void;
  onClausesChange: (clauses: ContractClause[]) => void;

  contractPrimaryColor: string;
  contractTextColor: string;
  contractBackgroundColor: string;
  contractFontFamily: string;
  onContractPrimaryColorChange: (value: string) => void;
  onContractTextColorChange: (value: string) => void;
  onContractBackgroundColorChange: (value: string) => void;
  onContractFontFamilyChange: (value: string) => void;

  appStoreUrl: string;
  googlePlayUrl: string;
  onAppStoreUrlChange: (value: string) => void;
  onGooglePlayUrlChange: (value: string) => void;

  onCreateContract: () => void;
  onSaveProgress?: () => void;
  isSaving?: boolean;
}

const fontOptions = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
];

const fontSizeOptions = [
  { value: '14px', label: 'Pequeno (14px)' },
  { value: '16px', label: 'Médio (16px)' },
  { value: '18px', label: 'Grande (18px)' },
  { value: '20px', label: 'Extra Grande (20px)' },
];

export const SimplifiedSignatureWizard = ({
  clientName,
  clientCpf,
  clientEmail,
  clientPhone,
  onClientNameChange,
  onClientCpfChange,
  onClientEmailChange,
  onClientPhoneChange,

  logoUrl,
  logoSize,
  logoPosition,
  primaryColor,
  textColor,
  fontFamily,
  fontSize,
  companyName,
  footerText,
  onLogoUrlChange,
  onLogoSizeChange,
  onLogoPositionChange,
  onPrimaryColorChange,
  onTextColorChange,
  onFontFamilyChange,
  onFontSizeChange,
  onCompanyNameChange,
  onFooterTextChange,
  onLogoUpload,

  verificationPrimaryColor,
  verificationTextColor,
  verificationFontFamily,
  verificationFontSize,
  verificationLogoUrl,
  verificationLogoSize,
  verificationLogoPosition,
  verificationFooterText,
  verificationWelcomeText,
  verificationInstructions,
  verificationSecurityText,
  verificationBackgroundColor,
  verificationHeaderBackgroundColor,
  verificationHeaderCompanyName,
  onVerificationPrimaryColorChange,
  onVerificationTextColorChange,
  onVerificationFontFamilyChange,
  onVerificationFontSizeChange,
  onVerificationLogoUrlChange,
  onVerificationLogoSizeChange,
  onVerificationLogoPositionChange,
  onVerificationFooterTextChange,
  onVerificationWelcomeTextChange,
  onVerificationInstructionsChange,
  onVerificationSecurityTextChange,
  onVerificationBackgroundColorChange,
  onVerificationHeaderBackgroundColorChange,
  onVerificationHeaderCompanyNameChange,

  progressCardColor,
  progressButtonColor,
  progressTextColor,
  progressTitle,
  progressSubtitle,
  progressStep1Title,
  progressStep1Description,
  progressStep2Title,
  progressStep2Description,
  progressStep3Title,
  progressStep3Description,
  progressButtonText,
  progressFontFamily,
  onProgressCardColorChange,
  onProgressButtonColorChange,
  onProgressTextColorChange,
  onProgressTitleChange,
  onProgressSubtitleChange,
  onProgressStep1TitleChange,
  onProgressStep1DescriptionChange,
  onProgressStep2TitleChange,
  onProgressStep2DescriptionChange,
  onProgressStep3TitleChange,
  onProgressStep3DescriptionChange,
  onProgressButtonTextChange,
  onProgressFontFamilyChange,

  parabensTitle,
  parabensSubtitle,
  parabensDescription,
  parabensCardColor,
  parabensBackgroundColor,
  parabensButtonColor,
  parabensTextColor,
  parabensFontFamily,
  parabensFormTitle,
  parabensButtonText,
  onParabensTitleChange,
  onParabensSubtitleChange,
  onParabensDescriptionChange,
  onParabensCardColorChange,
  onParabensBackgroundColorChange,
  onParabensButtonColorChange,
  onParabensTextColorChange,
  onParabensFontFamilyChange,
  onParabensFormTitleChange,
  onParabensButtonTextChange,

  contractTitle,
  clauses,
  onContractTitleChange,
  onClausesChange,

  contractPrimaryColor,
  contractTextColor,
  contractBackgroundColor,
  contractFontFamily,
  onContractPrimaryColorChange,
  onContractTextColorChange,
  onContractBackgroundColorChange,
  onContractFontFamilyChange,

  appStoreUrl,
  googlePlayUrl,
  onAppStoreUrlChange,
  onGooglePlayUrlChange,

  onCreateContract,
  onSaveProgress,
  isSaving = false,
}: SimplifiedSignatureWizardProps) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [step1Tab, setStep1Tab] = useState<'verificacao' | 'progresso' | 'parabens' | 'apps'>('verificacao');
  const [step2Tab, setStep2Tab] = useState<'conteudo' | 'design'>('conteudo');

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const validateCPF = (cpf: string) => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1+$/.test(digits)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(digits.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(digits.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(digits.charAt(10));
  };

  const handleCpfChange = (value: string) => {
    onClientCpfChange(formatCPF(value));
  };

  const handlePhoneChange = (value: string) => {
    onClientPhoneChange(formatPhone(value));
  };

  const addClause = () => {
    onClausesChange([...clauses, { title: '', content: '' }]);
  };

  const removeClause = (index: number) => {
    onClausesChange(clauses.filter((_, i) => i !== index));
  };

  const updateClause = (index: number, field: 'title' | 'content', value: string) => {
    const updated = [...clauses];
    updated[index][field] = value;
    onClausesChange(updated);
  };

  const validateStep1 = (): boolean => {
    // Step 1 is Aparência - no required fields
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!contractTitle.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, preencha o título do contrato.',
        variant: 'destructive',
      });
      return false;
    }

    if (clauses.length === 0) {
      toast({
        title: 'Cláusulas obrigatórias',
        description: 'Adicione pelo menos uma cláusula ao contrato.',
        variant: 'destructive',
      });
      return false;
    }

    const emptyClause = clauses.find(c => !c.title.trim() || !c.content.trim());
    if (emptyClause) {
      toast({
        title: 'Cláusula incompleta',
        description: 'Preencha o título e conteúdo de todas as cláusulas.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const goToNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as 1 | 2);
    }
  };

  const handleCreateContractClick = () => {
    if (validateStep2()) {
      onCreateContract();
    }
  };

  const steps = [
    { number: 1, label: 'Aparência', icon: Palette },
    { number: 2, label: 'Contrato', icon: FileText },
  ];

  const renderStepNavigation = () => (
    <div className="flex items-center justify-center gap-2 mb-6 px-4 py-3 bg-muted/30 rounded-lg" data-testid="step-navigation">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.number;
        const isCompleted = currentStep > step.number;
        
        return (
          <div key={step.number} className="flex items-center">
            <button
              onClick={() => {
                if (step.number < currentStep) {
                  setCurrentStep(step.number as 1 | 2);
                } else if (step.number === currentStep + 1) {
                  goToNextStep();
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : isCompleted
                  ? 'bg-primary/20 text-primary hover:bg-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              data-testid={`step-${step.number}`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
              <span className="font-medium text-sm">{step.number}. {step.label}</span>
            </button>
            {index < steps.length - 1 && (
              <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground" />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4" data-testid="step-1-content">
      <Tabs value={step1Tab} onValueChange={(v) => setStep1Tab(v as any)}>
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="verificacao" data-testid="tab-verificacao">Verificação</TabsTrigger>
          <TabsTrigger value="progresso" data-testid="tab-progresso">Progresso</TabsTrigger>
          <TabsTrigger value="parabens" data-testid="tab-parabens">Parabéns</TabsTrigger>
          <TabsTrigger value="apps" data-testid="tab-apps">Apps</TabsTrigger>
        </TabsList>

        <TabsContent value="verificacao" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tela de Verificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Texto de Boas-vindas</Label>
                <Input
                  value={verificationWelcomeText}
                  onChange={(e) => onVerificationWelcomeTextChange(e.target.value)}
                  placeholder="Verificação de Identidade"
                  data-testid="input-verification-welcome"
                />
              </div>
              <div className="space-y-2">
                <Label>Instruções</Label>
                <Textarea
                  value={verificationInstructions}
                  onChange={(e) => onVerificationInstructionsChange(e.target.value)}
                  placeholder="Processo seguro e rápido..."
                  rows={3}
                  data-testid="input-verification-instructions"
                />
              </div>
              <div className="space-y-2">
                <Label>Texto de Segurança</Label>
                <Input
                  value={verificationSecurityText}
                  onChange={(e) => onVerificationSecurityTextChange(e.target.value)}
                  placeholder="Suas informações são processadas..."
                  data-testid="input-verification-security"
                />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor Principal</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={verificationPrimaryColor}
                      onChange={(e) => onVerificationPrimaryColorChange(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={verificationPrimaryColor}
                      onChange={(e) => onVerificationPrimaryColorChange(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor do Texto</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={verificationTextColor}
                      onChange={(e) => onVerificationTextColorChange(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={verificationTextColor}
                      onChange={(e) => onVerificationTextColorChange(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor de Fundo</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={verificationBackgroundColor}
                      onChange={(e) => onVerificationBackgroundColorChange(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={verificationBackgroundColor}
                      onChange={(e) => onVerificationBackgroundColorChange(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Fonte</Label>
                  <Select value={verificationFontFamily} onValueChange={onVerificationFontFamilyChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontOptions.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progresso" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tela de Progresso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={progressTitle}
                  onChange={(e) => onProgressTitleChange(e.target.value)}
                  placeholder="Assinatura Digital"
                  data-testid="input-progress-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Subtítulo</Label>
                <Input
                  value={progressSubtitle}
                  onChange={(e) => onProgressSubtitleChange(e.target.value)}
                  placeholder="Conclua os passos abaixo..."
                  data-testid="input-progress-subtitle"
                />
              </div>
              <Separator />
              <div className="space-y-3">
                <Label className="font-semibold">Passo 1</Label>
                <Input
                  value={progressStep1Title}
                  onChange={(e) => onProgressStep1TitleChange(e.target.value)}
                  placeholder="1. Reconhecimento Facial"
                />
                <Input
                  value={progressStep1Description}
                  onChange={(e) => onProgressStep1DescriptionChange(e.target.value)}
                  placeholder="Tire uma selfie..."
                />
              </div>
              <div className="space-y-3">
                <Label className="font-semibold">Passo 2</Label>
                <Input
                  value={progressStep2Title}
                  onChange={(e) => onProgressStep2TitleChange(e.target.value)}
                  placeholder="2. Assinar Contrato"
                />
                <Input
                  value={progressStep2Description}
                  onChange={(e) => onProgressStep2DescriptionChange(e.target.value)}
                  placeholder="Assine digitalmente..."
                />
              </div>
              <div className="space-y-3">
                <Label className="font-semibold">Passo 3</Label>
                <Input
                  value={progressStep3Title}
                  onChange={(e) => onProgressStep3TitleChange(e.target.value)}
                  placeholder="3. Confirmação"
                />
                <Input
                  value={progressStep3Description}
                  onChange={(e) => onProgressStep3DescriptionChange(e.target.value)}
                  placeholder="Confirme seus dados..."
                />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor do Card</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={progressCardColor}
                      onChange={(e) => onProgressCardColorChange(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={progressCardColor}
                      onChange={(e) => onProgressCardColorChange(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor do Botão</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={progressButtonColor}
                      onChange={(e) => onProgressButtonColorChange(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={progressButtonColor}
                      onChange={(e) => onProgressButtonColorChange(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parabens" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tela de Parabéns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={parabensTitle}
                  onChange={(e) => onParabensTitleChange(e.target.value)}
                  placeholder="Parabéns!"
                  data-testid="input-parabens-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Subtítulo</Label>
                <Input
                  value={parabensSubtitle}
                  onChange={(e) => onParabensSubtitleChange(e.target.value)}
                  placeholder="Processo concluído com sucesso!"
                  data-testid="input-parabens-subtitle"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={parabensDescription}
                  onChange={(e) => onParabensDescriptionChange(e.target.value)}
                  placeholder="Sua documentação foi processada..."
                  rows={3}
                  data-testid="input-parabens-description"
                />
              </div>
              <div className="space-y-2">
                <Label>Título do Formulário</Label>
                <Input
                  value={parabensFormTitle}
                  onChange={(e) => onParabensFormTitleChange(e.target.value)}
                  placeholder="Endereço para Entrega"
                />
              </div>
              <div className="space-y-2">
                <Label>Texto do Botão</Label>
                <Input
                  value={parabensButtonText}
                  onChange={(e) => onParabensButtonTextChange(e.target.value)}
                  placeholder="Confirmar e Continuar"
                />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor do Card</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={parabensCardColor}
                      onChange={(e) => onParabensCardColorChange(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={parabensCardColor}
                      onChange={(e) => onParabensCardColorChange(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor de Fundo</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={parabensBackgroundColor}
                      onChange={(e) => onParabensBackgroundColorChange(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={parabensBackgroundColor}
                      onChange={(e) => onParabensBackgroundColorChange(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor do Botão</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={parabensButtonColor}
                      onChange={(e) => onParabensButtonColorChange(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={parabensButtonColor}
                      onChange={(e) => onParabensButtonColorChange(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor do Texto</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={parabensTextColor}
                      onChange={(e) => onParabensTextColorChange(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={parabensTextColor}
                      onChange={(e) => onParabensTextColorChange(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Links dos Aplicativos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL App Store (iOS)</Label>
                <Input
                  value={appStoreUrl}
                  onChange={(e) => onAppStoreUrlChange(e.target.value)}
                  placeholder="https://apps.apple.com/..."
                  data-testid="input-app-store-url"
                />
              </div>
              <div className="space-y-2">
                <Label>URL Google Play (Android)</Label>
                <Input
                  value={googlePlayUrl}
                  onChange={(e) => onGooglePlayUrlChange(e.target.value)}
                  placeholder="https://play.google.com/..."
                  data-testid="input-google-play-url"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4" data-testid="step-2-content">
      <Tabs value={step2Tab} onValueChange={(v) => setStep2Tab(v as 'conteudo' | 'design')}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="conteudo" data-testid="tab-step2-conteudo">Conteúdo</TabsTrigger>
          <TabsTrigger value="design" data-testid="tab-step2-design">Design</TabsTrigger>
        </TabsList>

        <TabsContent value="conteudo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Informações do Contrato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contractTitle">Título do Contrato *</Label>
                <Input
                  id="contractTitle"
                  value={contractTitle}
                  onChange={(e) => onContractTitleChange(e.target.value)}
                  placeholder="Contrato de Prestação de Serviços"
                  data-testid="input-contract-title"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Cláusulas do Contrato</CardTitle>
              <Button variant="outline" size="sm" onClick={addClause} data-testid="button-add-clause">
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {clauses.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhuma cláusula adicionada. Clique em "Adicionar" para começar.
                </p>
              ) : (
                clauses.map((clause, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3" data-testid={`clause-${index}`}>
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold">Cláusula {index + 1}</Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeClause(index)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-remove-clause-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Título da cláusula"
                      value={clause.title}
                      onChange={(e) => updateClause(index, 'title', e.target.value)}
                      data-testid={`input-clause-title-${index}`}
                    />
                    <Textarea
                      placeholder="Conteúdo da cláusula"
                      value={clause.content}
                      onChange={(e) => updateClause(index, 'content', e.target.value)}
                      rows={3}
                      data-testid={`input-clause-content-${index}`}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Cores do Contrato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor Principal</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={contractPrimaryColor}
                      onChange={(e) => onContractPrimaryColorChange(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                      data-testid="input-contract-primary-color"
                    />
                    <Input
                      value={contractPrimaryColor}
                      onChange={(e) => onContractPrimaryColorChange(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor do Texto</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={contractTextColor}
                      onChange={(e) => onContractTextColorChange(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                      data-testid="input-contract-text-color"
                    />
                    <Input
                      value={contractTextColor}
                      onChange={(e) => onContractTextColorChange(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor de Fundo</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={contractBackgroundColor}
                      onChange={(e) => onContractBackgroundColorChange(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                      data-testid="input-contract-background-color"
                    />
                    <Input
                      value={contractBackgroundColor}
                      onChange={(e) => onContractBackgroundColorChange(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Fonte</Label>
                  <Select value={contractFontFamily} onValueChange={(v) => onContractFontFamilyChange(v)}>
                    <SelectTrigger data-testid="select-contract-font-family">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontOptions.map((font) => (
                        <SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rodapé do Contrato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Texto do Rodapé</Label>
                <Textarea
                  value={footerText}
                  onChange={(e) => onFooterTextChange(e.target.value)}
                  placeholder="Documento gerado eletronicamente"
                  rows={2}
                  data-testid="input-footer-text"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderNavigationButtons = () => (
    <div className="flex items-center justify-between pt-4 border-t mt-6" data-testid="navigation-buttons">
      <Button
        variant="outline"
        onClick={goToPreviousStep}
        disabled={currentStep === 1}
        data-testid="button-previous"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <div className="flex gap-2">
        {onSaveProgress && (
          <Button
            variant="outline"
            onClick={onSaveProgress}
            disabled={isSaving}
            data-testid="button-save-progress"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Progresso
          </Button>
        )}

        {currentStep < 2 ? (
          <Button onClick={goToNextStep} data-testid="button-next">
            Próximo
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={handleCreateContractClick} 
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700"
            data-testid="button-create-contract"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Criar Contrato
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col" data-testid="simplified-signature-wizard">
      {renderStepNavigation()}
      
      <div className="flex-1 overflow-y-auto px-1">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
      </div>

      {renderNavigationButtons()}
    </div>
  );
};
