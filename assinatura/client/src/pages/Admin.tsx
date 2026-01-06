import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { brandConfig, contractConfig } from '@/config/branding';
import { FileText, Copy, Check, Plus, Trash2, Clock, CheckCircle2, Users, FileCheck, Gift, AlertCircle, Camera, Shield, Smartphone } from 'lucide-react';
import { validateCPF, formatCPF, formatPhone } from '@/lib/validators';
import { VerificationFlow } from '@/components/verification/VerificationFlow';
import { ProgressTrackerStep } from '@/components/steps/ProgressTrackerStep';
import { ContractDetailsModal } from '@/components/modals/ContractDetailsModal';
import type { Contract } from '@shared/schema';

interface ContractClause {
  title: string;
  content: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'cliente' | 'aparencia' | 'verificacao' | 'contrato' | 'progresso' | 'parabens' | 'aplicativos' | 'contratos'>('cliente');
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Dados Cliente
  const [clientName, setClientName] = useState('');
  const [clientCpf, setClientCpf] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Contrato - Conteúdo
  const [contractTitle, setContractTitle] = useState(contractConfig.title);
  const [clauses, setClauses] = useState<ContractClause[]>(contractConfig.clauses);
  
  // Contrato - Personalizações
  const [logoUrl, setLogoUrl] = useState('');
  const [logoSize, setLogoSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [logoPosition, setLogoPosition] = useState<'center' | 'left' | 'right'>('center');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#2c3e50');
  const [textColor, setTextColor] = useState('#333333');
  const [fontFamily, setFontFamily] = useState('Arial, sans-serif');
  const [fontSize, setFontSize] = useState('16px');
  const [companyName, setCompanyName] = useState(brandConfig.companyName);
  const [footerText, setFooterText] = useState(brandConfig.footerText);

  // "Adquirir Maleta" - Personalização de cores
  const [maletaCardColor, setMaletaCardColor] = useState('#dbeafe');
  const [maletaButtonColor, setMaletaButtonColor] = useState('#22c55e');
  const [maletaTextColor, setMaletaTextColor] = useState('#1e40af');

  // Parabéns (ResellerWelcomeStep) - Personalização
  const [parabensTitle, setParabensTitle] = useState('Parabéns, Nova Revendedora! 🎉');
  const [parabensSubtitle, setParabensSubtitle] = useState('Bem-vinda à família de revendedoras!');
  const [parabensDescription, setParabensDescription] = useState('Sua maleta de produtos chegará em breve. Preencha seu endereço para recebê-la.');
  const [parabensCardColor, setParabensCardColor] = useState('#dbeafe');
  const [parabensBackgroundColor, setParabensBackgroundColor] = useState('#f0fdf4');
  const [parabensButtonColor, setParabensButtonColor] = useState('#22c55e');
  const [parabensTextColor, setParabensTextColor] = useState('#1e40af');
  const [parabensFontFamily, setParabensFontFamily] = useState('Arial, sans-serif');
  const [parabensFormTitle, setParabensFormTitle] = useState('Endereço para Entrega');
  const [parabensButtonText, setParabensButtonText] = useState('Confirmar Endereço e Continuar');

  // Verificação - Personalização
  const [verificationPrimaryColor, setVerificationPrimaryColor] = useState('#2c3e50');
  const [verificationTextColor, setVerificationTextColor] = useState('#000000');
  const [verificationFontFamily, setVerificationFontFamily] = useState('Arial, sans-serif');
  const [verificationFontSize, setVerificationFontSize] = useState('16px');
  const [verificationLogoUrl, setVerificationLogoUrl] = useState('');
  const [verificationLogoSize, setVerificationLogoSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [verificationLogoPosition, setVerificationLogoPosition] = useState<'center' | 'left' | 'right'>('center');
  const [verificationLogoPreview, setVerificationLogoPreview] = useState<string | null>(null);
  const [isUploadingVerificationLogo, setIsUploadingVerificationLogo] = useState(false);
  const [verificationFooterText, setVerificationFooterText] = useState('Verificação de Identidade Segura');
  const [verificationWelcomeText, setVerificationWelcomeText] = useState('Verificação de Identidade');
  const [verificationInstructions, setVerificationInstructions] = useState('Processo seguro e rápido para confirmar sua identidade através de reconhecimento facial.');
  const [verificationSecurityText, setVerificationSecurityText] = useState('Suas informações são processadas de forma segura e criptografada');
  const [verificationBackgroundImage, setVerificationBackgroundImage] = useState('');
  const [verificationBackgroundColor, setVerificationBackgroundColor] = useState('#ffffff');
  const [verificationBackgroundPreview, setVerificationBackgroundPreview] = useState<string | null>(null);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  
  // Header da Verificação (Aparência)
  const [verificationHeaderBackgroundColor, setVerificationHeaderBackgroundColor] = useState('#2c3e50');
  const [verificationHeaderLogoUrl, setVerificationHeaderLogoUrl] = useState('');
  const [verificationHeaderCompanyName, setVerificationHeaderCompanyName] = useState('Sua Empresa');
  const [verificationHeaderLogoPreview, setVerificationHeaderLogoPreview] = useState<string | null>(null);
  const [isUploadingHeaderLogo, setIsUploadingHeaderLogo] = useState(false);

  // Rastreador de Progresso (Verificação) - Personalização
  const [progressCardColor, setProgressCardColor] = useState('#dbeafe');
  const [progressButtonColor, setProgressButtonColor] = useState('#22c55e');
  const [progressTextColor, setProgressTextColor] = useState('#1e40af');
  const [progressTitle, setProgressTitle] = useState('Assinatura Digital');
  const [progressSubtitle, setProgressSubtitle] = useState('Conclua os passos abaixo para desbloquear sua maleta digital. Super rápido! ⚡');
  const [progressStep1Title, setProgressStep1Title] = useState('1. Reconhecimento Facial');
  const [progressStep1Description, setProgressStep1Description] = useState('Tire uma selfie para validar sua identidade através de reconhecimento facial');
  const [progressStep2Title, setProgressStep2Title] = useState('2. Assinar Contrato');
  const [progressStep2Description, setProgressStep2Description] = useState('Assine digitalmente o contrato para confirmar seu compromisso');
  const [progressStep3Title, setProgressStep3Title] = useState('3. Baixar Aplicativo');
  const [progressStep3Description, setProgressStep3Description] = useState('Baixe nosso aplicativo oficial para gerenciar seus contratos');
  const [progressButtonText, setProgressButtonText] = useState('Complete os passos acima');
  const [progressFontFamily, setProgressFontFamily] = useState('Arial, sans-serif');
  const [progressFontSize, setProgressFontSize] = useState('16px');

  // URLs dos Aplicativos
  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [googlePlayUrl, setGooglePlayUrl] = useState('');

  const { data: contracts = [], isLoading: isLoadingContracts } = useQuery<Contract[]>({
    queryKey: ['/api/contracts'],
  });

  const createContractMutation = useMutation({
    mutationFn: async (contractData: {
      client_name: string;
      client_cpf: string;
      client_email: string;
      client_phone: string | null;
      contract_html: string;
      protocol_number: string;
      status: string;
      logo_url?: string;
      logo_size?: string;
      logo_position?: string;
      primary_color?: string;
      text_color?: string;
      font_family?: string;
      font_size?: string;
      company_name?: string;
      footer_text?: string;
      maleta_card_color?: string;
      maleta_button_color?: string;
      maleta_text_color?: string;
      verification_primary_color?: string;
      verification_font_family?: string;
      verification_font_size?: string;
      verification_logo_url?: string;
      verification_logo_size?: string;
      verification_logo_position?: string;
      verification_footer_text?: string;
      verification_background_image?: string;
      verification_icon_url?: string;
      verification_welcome_text?: string;
      verification_instructions?: string;
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
      verification_header_background_color?: string;
      verification_header_logo_url?: string;
      verification_header_company_name?: string;
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
    }) => {
      const response = await apiRequest('POST', '/api/contracts', contractData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      const url = `${window.location.origin}/c/${data.access_token}`;
      setGeneratedUrl(url);
      setActiveTab('contratos');
      toast({
        title: 'Contrato criado!',
        description: 'URL gerada com sucesso. Copie e envie ao cliente.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel criar o contrato. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const handleCpfChange = (value: string) => {
    const formatted = formatCPF(value);
    setClientCpf(formatted);
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setClientPhone(formatted);
  };

  const addClause = () => {
    setClauses([...clauses, { title: '', content: '' }]);
  };

  const removeClause = (index: number) => {
    setClauses(clauses.filter((_, i) => i !== index));
  };

  const updateClause = (index: number, field: 'title' | 'content', value: string) => {
    const updated = [...clauses];
    updated[index][field] = value;
    setClauses(updated);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string);
      setLogoUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    setIsUploadingLogo(false);
  };

  const getLogoSizeStyle = (size: string): string => {
    switch (size) {
      case 'small': return 'max-width: 100px;';
      case 'large': return 'max-width: 300px;';
      default: return 'max-width: 200px;';
    }
  };

  const getLogoPositionStyle = (position: string): string => {
    switch (position) {
      case 'left': return 'text-align: left;';
      case 'right': return 'text-align: right;';
      default: return 'text-align: center;';
    }
  };

  const generateContractHTML = () => {
    const clausesHTML = clauses
      .map(
        (clause) => `
        <div style="margin-bottom: 20px;">
          <h3 style="font-weight: bold; margin-bottom: 8px; color: ${textColor};">${clause.title}</h3>
          <p style="text-align: justify; line-height: 1.6; font-size: ${fontSize};">${clause.content}</p>
        </div>
      `
      )
      .join('');

    const logoSection = logoUrl ? `<div style="${getLogoPositionStyle(logoPosition)} margin-bottom: 30px;"><img src="${logoUrl}" alt="Logo" style="${getLogoSizeStyle(logoSize)} height: auto;"></div>` : '';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${contractTitle}</title>
        <style>
          body { font-family: ${fontFamily}; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
          .header { padding: 30px; border-radius: 8px; margin-bottom: 30px; }
          .header h1 { margin: 0; text-align: center; }
          h1 { color: ${primaryColor}; text-align: center; border-bottom: 3px solid ${textColor}; padding-bottom: 15px; }
          h2 { color: ${primaryColor}; margin-top: 30px; font-size: 20px; }
          .contract-section { margin: 20px 0; }
          .signature-section { margin-top: 50px; padding: 20px; border: 2px solid ${primaryColor}; border-radius: 4px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        ${logoSection}
        <div class="header">
          <h1>${contractTitle}</h1>
        </div>
        
        <div class="contract-section">
          <h2>${contractConfig.contractorSection}</h2>
          <p><strong>Nome:</strong> {{CLIENT_NAME}}</p>
          <p><strong>CPF:</strong> {{CLIENT_CPF}}</p>
          <p><strong>E-mail:</strong> {{CLIENT_EMAIL}}</p>
          <p><strong>Telefone:</strong> {{CLIENT_PHONE}}</p>
        </div>

        <div class="contract-section">
          <h2>${contractConfig.clausesSection}</h2>
          ${clausesHTML}
        </div>

        <div class="signature-section" id="signature-placeholder">
        </div>
        
        <div class="footer">
          ${footerText}
        </div>
      </body>
      </html>
    `;
  };

  const handleCreateContract = async () => {
    if (!clientName.trim()) {
      toast({ title: 'Erro', description: 'Nome do cliente e obrigatorio', variant: 'destructive' });
      return;
    }

    const cpfNumbers = clientCpf.replace(/\D/g, '');
    if (!validateCPF(cpfNumbers)) {
      toast({ title: 'Erro', description: 'CPF invalido', variant: 'destructive' });
      return;
    }

    if (!clientEmail.trim() || !clientEmail.includes('@')) {
      toast({ title: 'Erro', description: 'E-mail invalido', variant: 'destructive' });
      return;
    }

    const contractHTML = generateContractHTML();
    const protocolNumber = `CONT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    createContractMutation.mutate({
      client_name: clientName.trim(),
      client_cpf: cpfNumbers,
      client_email: clientEmail.trim(),
      client_phone: clientPhone.replace(/\D/g, '') || null,
      contract_html: contractHTML,
      protocol_number: protocolNumber,
      status: 'pending',
      logo_url: logoUrl || undefined,
      logo_size: logoSize,
      logo_position: logoPosition,
      primary_color: primaryColor,
      text_color: textColor,
      font_family: fontFamily,
      font_size: fontSize,
      company_name: companyName,
      footer_text: footerText,
      maleta_card_color: maletaCardColor,
      maleta_button_color: maletaButtonColor,
      maleta_text_color: maletaTextColor,
      verification_primary_color: verificationPrimaryColor,
      verification_text_color: verificationTextColor,
      verification_font_family: verificationFontFamily,
      verification_font_size: verificationFontSize,
      verification_logo_url: verificationLogoUrl,
      verification_logo_size: verificationLogoSize,
      verification_logo_position: verificationLogoPosition,
      verification_footer_text: verificationFooterText,
      verification_welcome_text: verificationWelcomeText,
      verification_instructions: verificationInstructions,
      verification_background_image: verificationBackgroundImage,
      verification_background_color: verificationBackgroundColor,
      verification_header_background_color: verificationHeaderBackgroundColor,
      verification_header_logo_url: verificationHeaderLogoUrl || undefined,
      verification_header_company_name: verificationHeaderCompanyName,
      progress_card_color: progressCardColor,
      progress_button_color: progressButtonColor,
      progress_text_color: progressTextColor,
      progress_title: progressTitle,
      progress_subtitle: progressSubtitle,
      progress_step1_title: progressStep1Title,
      progress_step1_description: progressStep1Description,
      progress_step2_title: progressStep2Title,
      progress_step2_description: progressStep2Description,
      progress_step3_title: progressStep3Title,
      progress_step3_description: progressStep3Description,
      progress_button_text: progressButtonText,
      progress_font_family: progressFontFamily,
      progress_font_size: progressFontSize,
      app_store_url: appStoreUrl || undefined,
      google_play_url: googlePlayUrl || undefined,
      parabens_title: parabensTitle,
      parabens_subtitle: parabensSubtitle,
      parabens_description: parabensDescription,
      parabens_card_color: parabensCardColor,
      parabens_background_color: parabensBackgroundColor,
      parabens_button_color: parabensButtonColor,
      parabens_text_color: parabensTextColor,
      parabens_font_family: parabensFontFamily,
      parabens_form_title: parabensFormTitle,
      parabens_button_text: parabensButtonText,
    });
  };

  const copyToClipboard = async () => {
    if (generatedUrl) {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copiado!', description: 'URL copiada para a area de transferencia.' });
    }
  };

  const resetForm = () => {
    setClientName('');
    setClientCpf('');
    setClientEmail('');
    setClientPhone('');
    setContractTitle(contractConfig.title);
    setClauses(contractConfig.clauses);
    setGeneratedUrl(null);
    setLogoUrl('');
    setLogoSize('medium');
    setLogoPosition('center');
    setLogoPreview(null);
    setPrimaryColor('#2c3e50');
    setTextColor('#333333');
    setFontFamily('Arial, sans-serif');
    setFontSize('16px');
    setCompanyName(brandConfig.companyName);
    setFooterText(brandConfig.footerText);
    setMaletaCardColor('#dbeafe');
    setMaletaButtonColor('#22c55e');
    setMaletaTextColor('#1e40af');
    setProgressCardColor('#dbeafe');
    setProgressButtonColor('#22c55e');
    setProgressTextColor('#1e40af');
    setProgressTitle('Assinatura Digital');
    setProgressSubtitle('Conclua os passos abaixo para desbloquear sua maleta digital. Super rápido! ⚡');
    setProgressStep1Title('1. Reconhecimento Facial');
    setProgressStep1Description('Tire uma selfie para validar sua identidade através de reconhecimento facial');
    setProgressStep2Title('2. Assinar Contrato');
    setProgressStep2Description('Assine digitalmente o contrato para confirmar seu compromisso');
    setProgressStep3Title('3. Baixar Aplicativo');
    setProgressStep3Description('Baixe nosso aplicativo oficial para gerenciar seus contratos');
    setProgressButtonText('Complete os passos acima');
    setProgressFontFamily('Arial, sans-serif');
    setProgressFontSize('16px');
    setAppStoreUrl('');
    setGooglePlayUrl('');
    setParabensTitle('Parabéns, Nova Revendedora! 🎉');
    setParabensSubtitle('Bem-vinda à família de revendedoras!');
    setParabensDescription('Sua maleta de produtos chegará em breve. Preencha seu endereço para recebê-la.');
    setParabensCardColor('#dbeafe');
    setParabensBackgroundColor('#f0fdf4');
    setParabensButtonColor('#22c55e');
    setParabensTextColor('#1e40af');
    setParabensFontFamily('Arial, sans-serif');
    setParabensFormTitle('Endereço para Entrega');
    setParabensButtonText('Confirmar Endereço e Continuar');
    setGeneratedUrl(null);
    setCopied(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Assinado</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-company-name">{brandConfig.companyName}</h1>
          <p className="text-muted-foreground mt-2">Gerenciador de Contratos para Assinatura</p>
        </div>

        {generatedUrl && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Check className="w-6 h-6" />
                Contrato Criado com Sucesso!
              </CardTitle>
              <CardDescription>
                Copie a URL abaixo e envie para o cliente assinar o contrato.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={generatedUrl} readOnly className="font-mono text-sm" data-testid="input-generated-url" />
                <Button onClick={copyToClipboard} variant="outline" data-testid="button-copy-url">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <Button onClick={resetForm} className="w-full" data-testid="button-new-contract">
                <Plus className="w-4 h-4 mr-2" />
                Criar Novo Contrato
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 border-b">
          <Button
            variant={activeTab === 'cliente' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('cliente')}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Dados Cliente</span>
            <span className="sm:hidden">Cliente</span>
          </Button>
          <Button
            variant={activeTab === 'aparencia' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('aparencia')}
            className="flex items-center gap-2"
          >
            <Gift className="w-4 h-4" />
            <span className="hidden sm:inline">Aparência</span>
            <span className="sm:hidden">Apar</span>
          </Button>
          <Button
            variant={activeTab === 'verificacao' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('verificacao')}
            className="flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Verificação</span>
            <span className="sm:hidden">Verif</span>
          </Button>
          <Button
            variant={activeTab === 'contrato' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('contrato')}
            className="flex items-center gap-2"
          >
            <FileCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Contrato</span>
            <span className="sm:hidden">Config</span>
          </Button>
          <Button
            variant={activeTab === 'progresso' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('progresso')}
            className="flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Progresso</span>
            <span className="sm:hidden">Prog</span>
          </Button>
          <Button
            variant={activeTab === 'parabens' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('parabens')}
            className="flex items-center gap-2"
          >
            <Gift className="w-4 h-4" />
            <span className="hidden sm:inline">Parabéns</span>
            <span className="sm:hidden">Para</span>
          </Button>
          <Button
            variant={activeTab === 'aplicativos' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('aplicativos')}
            className="flex items-center gap-2"
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Links Apps</span>
            <span className="sm:hidden">Apps</span>
          </Button>
          <Button
            variant={activeTab === 'contratos' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('contratos')}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Contratos Criados</span>
            <span className="sm:hidden">Contratos</span>
          </Button>
        </div>

        {/* Aba: Rastreador de Progresso */}
        {activeTab === 'progresso' && (
          <ProgressTrackerStep
            progressTitle={progressTitle}
            onProgressTitleChange={setProgressTitle}
            progressSubtitle={progressSubtitle}
            onProgressSubtitleChange={setProgressSubtitle}
            progressStep1Title={progressStep1Title}
            onProgressStep1TitleChange={setProgressStep1Title}
            progressStep1Description={progressStep1Description}
            onProgressStep1DescriptionChange={setProgressStep1Description}
            progressStep2Title={progressStep2Title}
            onProgressStep2TitleChange={setProgressStep2Title}
            progressStep2Description={progressStep2Description}
            onProgressStep2DescriptionChange={setProgressStep2Description}
            progressStep3Title={progressStep3Title}
            onProgressStep3TitleChange={setProgressStep3Title}
            progressStep3Description={progressStep3Description}
            onProgressStep3DescriptionChange={setProgressStep3Description}
            progressButtonText={progressButtonText}
            onProgressButtonTextChange={setProgressButtonText}
            progressCardColor={progressCardColor}
            onProgressCardColorChange={setProgressCardColor}
            progressButtonColor={progressButtonColor}
            onProgressButtonColorChange={setProgressButtonColor}
            progressTextColor={progressTextColor}
            onProgressTextColorChange={setProgressTextColor}
            progressFontFamily={progressFontFamily}
            onProgressFontFamilyChange={setProgressFontFamily}
            progressFontSize={progressFontSize}
            onProgressFontSizeChange={setProgressFontSize}
          />
        )}

        {/* Aba 1: Contratos Criados */}
        {activeTab === 'aplicativos' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Links de Download dos Aplicativos</CardTitle>
                <CardDescription>
                  Configure as URLs que serão exibidas na última página do fluxo do cliente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="googlePlayUrl">URL Google Play</Label>
                  <Input
                    id="googlePlayUrl"
                    placeholder="https://play.google.com/store/apps/details?id=..."
                    value={googlePlayUrl}
                    onChange={(e) => setGooglePlayUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appStoreUrl">URL Apple App Store</Label>
                  <Input
                    id="appStoreUrl"
                    placeholder="https://apps.apple.com/app/..."
                    value={appStoreUrl}
                    onChange={(e) => setAppStoreUrl(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Aba 1: Contratos Criados */}
        {activeTab === 'contratos' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Contratos Criados
              </CardTitle>
              <CardDescription>Historico de contratos gerados e pronto para assinatura</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingContracts ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : contracts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum contrato criado ainda. Crie um novo contrato preenchendo as abas.</p>
              ) : (
                <div className="space-y-4">
                  {contracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="border rounded-lg overflow-hidden hover:bg-gray-50"
                      data-testid={`contract-row-${contract.id}`}
                    >
                      <div className="flex items-center justify-between gap-4 p-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p 
                            className="font-medium cursor-pointer hover:text-blue-600 hover:underline" 
                            data-testid={`text-contract-name-${contract.id}`}
                            onClick={() => { setSelectedContract(contract); setModalOpen(true); }}
                          >
                            📁 {contract.client_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(contract.status)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const url = `${window.location.origin}/c/${contract.access_token}`;
                              navigator.clipboard.writeText(url);
                              toast({ title: 'URL copiada!' });
                            }}
                            data-testid={`button-copy-contract-url-${contract.id}`}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copiar URL
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Aba 1: Dados Cliente */}
        {activeTab === 'cliente' && (
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Dados do Cliente
              </CardTitle>
              <CardDescription>Informacoes e dados do cliente que vai assinar o contrato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Nome Completo *</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nome completo do cliente"
                    data-testid="input-client-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientCpf">CPF *</Label>
                  <Input
                    id="clientCpf"
                    value={clientCpf}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    data-testid="input-client-cpf"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">E-mail de Contato *</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    data-testid="input-client-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientPhone">Telefone para Contato</Label>
                  <Input
                    id="clientPhone"
                    value={clientPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    data-testid="input-client-phone"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aba 3: Aparência - Background e Logo */}
        {activeTab === 'aparencia' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Aparência da Verificação</CardTitle>
                  <CardDescription>Fundo e logo como primeira tela</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="verificationBackgroundFile">Imagem de Fundo</Label>
                    <Input
                      id="verificationBackgroundFile"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploadingBackground(true);
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setVerificationBackgroundPreview(event.target?.result as string);
                          setVerificationBackgroundImage(event.target?.result as string);
                          setIsUploadingBackground(false);
                        };
                        reader.readAsDataURL(file);
                      }}
                      disabled={isUploadingBackground}
                    />
                    {verificationBackgroundPreview && (
                      <div className="mt-3 p-3 border rounded-md bg-gray-50">
                        <img src={verificationBackgroundPreview} alt="Preview" style={{maxWidth: '200px', height: 'auto'}} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verificationBackgroundColor">Cor de Fundo (se sem imagem)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="verificationBackgroundColor"
                        type="color"
                        value={verificationBackgroundColor}
                        onChange={(e) => setVerificationBackgroundColor(e.target.value)}
                        className="h-10 w-20"
                      />
                      <Input
                        value={verificationBackgroundColor}
                        onChange={(e) => setVerificationBackgroundColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="appearanceLogoFile">Logo para Primeira Tela</Label>
                    <Input
                      id="appearanceLogoFile"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploadingVerificationLogo(true);
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setVerificationLogoPreview(event.target?.result as string);
                          setVerificationLogoUrl(event.target?.result as string);
                          setIsUploadingVerificationLogo(false);
                        };
                        reader.readAsDataURL(file);
                      }}
                      disabled={isUploadingVerificationLogo}
                    />
                    {verificationLogoPreview && (
                      <div className="mt-3 p-3 border rounded-md bg-gray-50">
                        <img src={verificationLogoPreview} alt="Preview" style={{maxWidth: '150px', height: 'auto'}} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="appearanceLogoSize">Tamanho da Logo</Label>
                    <select
                      id="appearanceLogoSize"
                      value={verificationLogoSize}
                      onChange={(e) => setVerificationLogoSize(e.target.value as 'small' | 'medium' | 'large')}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="small">Pequeno (100px)</option>
                      <option value="medium">Médio (200px)</option>
                      <option value="large">Grande (280px)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="appearanceLogoPosition">Posição da Logo</Label>
                    <select
                      id="appearanceLogoPosition"
                      value={verificationLogoPosition}
                      onChange={(e) => setVerificationLogoPosition(e.target.value as 'center' | 'left' | 'right')}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="center">Centro</option>
                      <option value="left">Esquerda</option>
                      <option value="right">Direita</option>
                    </select>
                  </div>

                  <hr className="my-6" />
                  <h3 className="text-lg font-semibold">Header da Página</h3>

                  <div className="space-y-2">
                    <Label htmlFor="headerBackgroundColor">Cor de Fundo do Header</Label>
                    <div className="flex gap-2">
                      <Input
                        id="headerBackgroundColor"
                        type="color"
                        value={verificationHeaderBackgroundColor}
                        onChange={(e) => setVerificationHeaderBackgroundColor(e.target.value)}
                        className="h-10 w-20"
                      />
                      <Input
                        value={verificationHeaderBackgroundColor}
                        onChange={(e) => setVerificationHeaderBackgroundColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="headerLogoFile">Logo do Header</Label>
                    <Input
                      id="headerLogoFile"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploadingHeaderLogo(true);
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setVerificationHeaderLogoPreview(event.target?.result as string);
                          setVerificationHeaderLogoUrl(event.target?.result as string);
                          setIsUploadingHeaderLogo(false);
                        };
                        reader.readAsDataURL(file);
                      }}
                      disabled={isUploadingHeaderLogo}
                    />
                    {verificationHeaderLogoPreview && (
                      <div className="mt-3 p-3 border rounded-md bg-gray-50">
                        <img src={verificationHeaderLogoPreview} alt="Header Logo" style={{maxWidth: '100px', height: 'auto'}} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="headerCompanyName">Nome da Empresa</Label>
                    <Input
                      id="headerCompanyName"
                      value={verificationHeaderCompanyName}
                      onChange={(e) => setVerificationHeaderCompanyName(e.target.value)}
                      placeholder="Nome da sua empresa"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="sticky top-6 h-[calc(100vh-100px)]">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base">Preview</CardTitle>
                  <CardDescription>Tela completa com header</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto flex flex-col" style={{position: 'relative', minHeight: '500px'}}>
                  {/* Header */}
                  <div style={{
                    backgroundColor: verificationHeaderBackgroundColor,
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    marginBottom: '20px',
                    borderRadius: '8px'
                  }}>
                    {verificationHeaderLogoUrl && (
                      <img src={verificationHeaderLogoUrl} alt="Header Logo" style={{
                        height: '40px',
                        maxWidth: '100px'
                      }} />
                    )}
                    {verificationHeaderCompanyName && (
                      <span style={{
                        color: 'white',
                        fontSize: '18px',
                        fontWeight: 'bold'
                      }}>
                        {verificationHeaderCompanyName}
                      </span>
                    )}
                  </div>

                  {/* Main Content */}
                  <div style={{
                    flex: 1,
                    backgroundColor: verificationBackgroundColor,
                    backgroundImage: verificationBackgroundImage ? `url(${verificationBackgroundImage})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {verificationBackgroundImage && (
                      <div className="absolute inset-0 bg-black/40"></div>
                    )}
                    <div style={{position: 'relative', zIndex: 10, textAlign: 'center'}}>
                      {verificationLogoUrl && (
                        <img src={verificationLogoUrl} alt="Logo" style={{
                          maxWidth: verificationLogoSize === 'small' ? '100px' : verificationLogoSize === 'large' ? '280px' : '200px',
                          height: 'auto',
                          marginBottom: '24px',
                          filter: verificationBackgroundImage ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' : 'none'
                        }} />
                      )}
                      <button style={{
                        padding: '12px 32px',
                        backgroundColor: '#2c3e50',
                        color: 'white',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}>
                        Continuar
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Aba 4: Verificação de Identidade */}
        {activeTab === 'verificacao' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Formulário à esquerda */}
            <div className="space-y-6">
              {/* Personalizações */}
              <Card>
                <CardHeader>
                  <CardTitle>Personalizações da Verificação</CardTitle>
                  <CardDescription>Logo, cores, fontes e identidade visual</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="verificationWelcomeText">Título da Página</Label>
                      <Input
                        id="verificationWelcomeText"
                        value={verificationWelcomeText}
                        onChange={(e) => setVerificationWelcomeText(e.target.value)}
                        placeholder="Verificação de Identidade"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verificationInstructions">Instruções</Label>
                      <Textarea
                        id="verificationInstructions"
                        value={verificationInstructions}
                        onChange={(e) => setVerificationInstructions(e.target.value)}
                        placeholder="Descrição do processo"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verificationLogoFile">Logo (Upload)</Label>
                      <Input
                        id="verificationLogoFile"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploadingVerificationLogo(true);
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setVerificationLogoPreview(event.target?.result as string);
                            setVerificationLogoUrl(event.target?.result as string);
                            setIsUploadingVerificationLogo(false);
                          };
                          reader.readAsDataURL(file);
                        }}
                        disabled={isUploadingVerificationLogo}
                      />
                      {verificationLogoPreview && (
                        <div className="mt-3 p-3 border rounded-md bg-gray-50">
                          <img src={verificationLogoPreview} alt="Preview" style={{maxWidth: '150px', height: 'auto'}} />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verificationLogoSize">Tamanho do Logo</Label>
                      <select
                        id="verificationLogoSize"
                        value={verificationLogoSize}
                        onChange={(e) => setVerificationLogoSize(e.target.value as 'small' | 'medium' | 'large')}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="small">Pequeno (100px)</option>
                        <option value="medium">Médio (200px)</option>
                        <option value="large">Grande (300px)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verificationPrimaryColor">Cor Primária</Label>
                      <div className="flex gap-2">
                        <Input
                          id="verificationPrimaryColor"
                          type="color"
                          value={verificationPrimaryColor}
                          onChange={(e) => setVerificationPrimaryColor(e.target.value)}
                          className="h-10 w-20"
                        />
                        <Input
                          value={verificationPrimaryColor}
                          onChange={(e) => setVerificationPrimaryColor(e.target.value)}
                          placeholder="#2c3e50"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verificationTextColor">Cor do Texto</Label>
                      <div className="flex gap-2">
                        <Input
                          id="verificationTextColor"
                          type="color"
                          value={verificationTextColor}
                          onChange={(e) => setVerificationTextColor(e.target.value)}
                          className="h-10 w-20"
                        />
                        <Input
                          value={verificationTextColor}
                          onChange={(e) => setVerificationTextColor(e.target.value)}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verificationFontFamily">Fonte</Label>
                      <select
                        id="verificationFontFamily"
                        value={verificationFontFamily}
                        onChange={(e) => setVerificationFontFamily(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="Arial, sans-serif">Arial</option>
                        <option value="Georgia, serif">Georgia</option>
                        <option value="Courier New, monospace">Courier New</option>
                        <option value="Times New Roman, serif">Times New Roman</option>
                        <option value="Verdana, sans-serif">Verdana</option>
                        <option value="Trebuchet MS, sans-serif">Trebuchet MS</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verificationFontSize">Tamanho da Fonte</Label>
                      <Input
                        id="verificationFontSize"
                        value={verificationFontSize}
                        onChange={(e) => setVerificationFontSize(e.target.value)}
                        placeholder="16px"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verificationFooterText">Texto do Rodapé</Label>
                      <Input
                        id="verificationFooterText"
                        value={verificationFooterText}
                        onChange={(e) => setVerificationFooterText(e.target.value)}
                        placeholder="Texto do rodapé"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verificationSecurityText">Texto de Segurança</Label>
                      <Input
                        id="verificationSecurityText"
                        value={verificationSecurityText}
                        onChange={(e) => setVerificationSecurityText(e.target.value)}
                        placeholder="Suas informações são processadas de forma segura e criptografada"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview à direita */}
            <div className="sticky top-6 h-[calc(100vh-100px)]">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base">Preview da Verificação</CardTitle>
                  <CardDescription>Exatamente como o cliente verá</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                  <div className="min-h-full bg-white py-8 flex items-center justify-center" style={{
                    fontFamily: verificationFontFamily
                  }}>
                    {verificationLogoPosition === 'right' ? (
                      <div className="w-full flex items-center justify-end px-8">
                        {verificationLogoUrl && (
                          <img src={verificationLogoUrl} alt="Logo" style={{
                            maxWidth: verificationLogoSize === 'small' ? '80px' : verificationLogoSize === 'large' ? '150px' : '120px',
                            height: 'auto'
                          }} />
                        )}
                      </div>
                    ) : (
                      <div style={{width: '100%', display: 'flex', justifyContent: verificationLogoPosition === 'left' ? 'space-between' : 'center', alignItems: 'flex-start', position: 'relative', paddingX: '16px'}}>
                        {verificationLogoPosition === 'left' && verificationLogoUrl && (
                          <div style={{paddingTop: '8px', paddingRight: '32px', flexShrink: 0}}>
                            <img src={verificationLogoUrl} alt="Logo" style={{
                              maxWidth: verificationLogoSize === 'small' ? '80px' : verificationLogoSize === 'large' ? '150px' : '120px',
                              height: 'auto'
                            }} />
                          </div>
                        )}
                        
                        <div style={{position: 'relative', zIndex: 1, width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                        {/* Logo no topo se houver - APENAS para CENTER */}
                        {verificationLogoPosition === 'center' && verificationLogoUrl && (
                          <div style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: '24px'
                          }}>
                            <img src={verificationLogoUrl} alt="Logo" style={{
                              maxWidth: verificationLogoSize === 'small' ? '80px' : verificationLogoSize === 'large' ? '150px' : '120px',
                              height: 'auto'
                            }} />
                          </div>
                        )}
                        
                        
                        {/* Título */}
                        <h1 style={{
                          fontSize: '28px',
                          fontWeight: 'bold',
                          color: verificationTextColor,
                          marginBottom: '8px',
                          textAlign: 'center'
                        }}>
                          {verificationWelcomeText}
                        </h1>
                        
                        {/* Descrição */}
                        <p style={{
                          fontSize: '14px',
                          color: verificationTextColor,
                          textAlign: 'center',
                          marginBottom: '32px',
                          maxWidth: '400px',
                          lineHeight: '1.6'
                        }}>
                          {verificationInstructions}
                        </p>
                      
                      {/* Card com os 3 passos - estrutura exata do WelcomeScreen */}
                      <div style={{
                        width: '100%',
                        maxWidth: '420px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        marginBottom: '24px'
                      }}>
                        {/* Passo 1 */}
                        <div style={{
                          padding: '16px',
                          borderRadius: '12px',
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          gap: '16px',
                          alignItems: 'flex-start'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            backgroundColor: `${verificationPrimaryColor}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={verificationPrimaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                              <circle cx="12" cy="13" r="4"></circle>
                            </svg>
                          </div>
                          <div style={{flex: 1}}>
                            <h3 style={{margin: '0 0 4px 0', fontWeight: '600', fontSize: '14px', color: verificationTextColor}}>Tire uma selfie</h3>
                            <p style={{margin: '0', fontSize: '13px', color: verificationTextColor}}>Posicione seu rosto na área indicada</p>
                          </div>
                        </div>
                        
                        {/* Passo 2 */}
                        <div style={{
                          padding: '16px',
                          borderRadius: '12px',
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          gap: '16px',
                          alignItems: 'flex-start'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            backgroundColor: `${verificationPrimaryColor}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={verificationPrimaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="12" y1="11" x2="12" y2="17"></line>
                              <line x1="9" y1="14" x2="15" y2="14"></line>
                            </svg>
                          </div>
                          <div style={{flex: 1}}>
                            <h3 style={{margin: '0 0 4px 0', fontWeight: '600', fontSize: '14px', color: verificationTextColor}}>Fotografe seu documento</h3>
                            <p style={{margin: '0', fontSize: '13px', color: verificationTextColor}}>CNH, RG ou outro documento com foto</p>
                          </div>
                        </div>
                        
                        {/* Passo 3 */}
                        <div style={{
                          padding: '16px',
                          borderRadius: '12px',
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          gap: '16px',
                          alignItems: 'flex-start'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            backgroundColor: `${verificationPrimaryColor}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={verificationPrimaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                              <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                          </div>
                          <div style={{flex: 1}}>
                            <h3 style={{margin: '0 0 4px 0', fontWeight: '600', fontSize: '14px', color: verificationTextColor}}>Verificação automática</h3>
                            <p style={{margin: '0', fontSize: '13px', color: verificationTextColor}}>Comparamos sua foto com o documento</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Botão */}
                      <button style={{
                        width: '100%',
                        backgroundColor: verificationPrimaryColor,
                        color: 'white',
                        padding: '14px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        marginBottom: '24px',
                        transition: 'opacity 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }} onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')} onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>
                        Iniciar Verificação
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                      </button>
                      
                      {/* Rodapé */}
                      <p style={{
                        fontSize: '12px',
                        color: verificationTextColor,
                        textAlign: 'center'
                      }}>
                        {verificationFooterText}
                      </p>

                      {/* Texto de Segurança */}
                      <p style={{
                        fontSize: '11px',
                        color: verificationPrimaryColor,
                        textAlign: 'center',
                        marginTop: '12px',
                        maxWidth: '380px'
                      }}>
                        {verificationSecurityText}
                      </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Aba: Parabéns */}
        {activeTab === 'parabens' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6 min-h-screen overflow-y-auto pr-2">
              <Card>
                <CardHeader>
                  <CardTitle>Personalização - Página de Parabéns</CardTitle>
                  <CardDescription>Customize a página de congratulações para novos revendedoras</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="parabensTitle">Título Principal</Label>
                    <Input
                      id="parabensTitle"
                      value={parabensTitle}
                      onChange={(e) => setParabensTitle(e.target.value)}
                      placeholder="Parabéns, Nova Revendedora!"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parabensSubtitle">Subtítulo</Label>
                    <Input
                      id="parabensSubtitle"
                      value={parabensSubtitle}
                      onChange={(e) => setParabensSubtitle(e.target.value)}
                      placeholder="Bem-vinda à família de revendedoras!"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parabensDescription">Descrição</Label>
                    <Textarea
                      id="parabensDescription"
                      value={parabensDescription}
                      onChange={(e) => setParabensDescription(e.target.value)}
                      placeholder="Sua maleta de produtos chegará em breve..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parabensFormTitle">Título do Formulário de Endereço</Label>
                    <Input
                      id="parabensFormTitle"
                      value={parabensFormTitle}
                      onChange={(e) => setParabensFormTitle(e.target.value)}
                      placeholder="Endereço para Entrega"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parabensButtonText">Texto do Botão</Label>
                    <Input
                      id="parabensButtonText"
                      value={parabensButtonText}
                      onChange={(e) => setParabensButtonText(e.target.value)}
                      placeholder="Confirmar Endereço e Continuar"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parabensCardColor">Cor do Card</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={parabensCardColor} onChange={(e) => setParabensCardColor(e.target.value)} className="h-10 w-20" />
                      <Input value={parabensCardColor} onChange={(e) => setParabensCardColor(e.target.value)} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parabensBackgroundColor">Cor do Fundo da Página</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={parabensBackgroundColor} onChange={(e) => setParabensBackgroundColor(e.target.value)} className="h-10 w-20" />
                      <Input value={parabensBackgroundColor} onChange={(e) => setParabensBackgroundColor(e.target.value)} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parabensButtonColor">Cor do Botão</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={parabensButtonColor} onChange={(e) => setParabensButtonColor(e.target.value)} className="h-10 w-20" />
                      <Input value={parabensButtonColor} onChange={(e) => setParabensButtonColor(e.target.value)} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parabensTextColor">Cor do Texto</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={parabensTextColor} onChange={(e) => setParabensTextColor(e.target.value)} className="h-10 w-20" />
                      <Input value={parabensTextColor} onChange={(e) => setParabensTextColor(e.target.value)} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parabensFontFamily">Fonte</Label>
                    <Input
                      id="parabensFontFamily"
                      value={parabensFontFamily}
                      onChange={(e) => setParabensFontFamily(e.target.value)}
                      placeholder="Arial, sans-serif"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6 min-h-screen overflow-y-auto pr-2">
              <Card>
                <CardHeader>
                  <CardTitle>Pré-visualização da Página</CardTitle>
                  <CardDescription>Como a página aparecerá para o cliente</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-6 rounded-lg" style={{ fontFamily: parabensFontFamily, backgroundColor: parabensBackgroundColor }}>
                    {/* Hero Section */}
                    <div className="text-center mb-8">
                      <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-3xl">🎁</span>
                      </div>
                      <h1 className="text-3xl font-bold mb-3" style={{ color: parabensTextColor }}>{parabensTitle}</h1>
                      <p className="text-lg mb-2" style={{ color: parabensTextColor }}>{parabensSubtitle}</p>
                      <p className="text-sm" style={{ color: parabensTextColor }}>{parabensDescription}</p>
                    </div>

                    {/* Info Cards */}
                    <div className="grid grid-cols-1 gap-3 mb-6">
                      <div className="bg-white rounded p-3 text-sm">
                        <span className="font-semibold">🚚 Entrega Gratuita</span>
                      </div>
                      <div className="bg-white rounded p-3 text-sm">
                        <span className="font-semibold">📍 Receba em Casa</span>
                      </div>
                    </div>

                    {/* Address Form */}
                    <div className="p-4 rounded" style={{ backgroundColor: parabensCardColor }}>
                      <h2 className="font-semibold mb-4 text-sm" style={{ color: parabensTextColor }}>{parabensFormTitle}</h2>
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: parabensTextColor }}>Rua *</label>
                          <div className="h-7 bg-white rounded border border-gray-200"></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="block text-xs font-medium mb-1" style={{ color: parabensTextColor }}>Número *</label>
                            <div className="h-7 bg-white rounded border border-gray-200"></div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: parabensTextColor }}>Complemento</label>
                            <div className="h-7 bg-white rounded border border-gray-200"></div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: parabensTextColor }}>Bairro *</label>
                            <div className="h-7 bg-white rounded border border-gray-200"></div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: parabensTextColor }}>Cidade *</label>
                            <div className="h-7 bg-white rounded border border-gray-200"></div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: parabensTextColor }}>Estado *</label>
                          <div className="h-7 bg-white rounded border border-gray-200"></div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: parabensTextColor }}>CEP *</label>
                          <div className="h-7 bg-white rounded border border-gray-200"></div>
                        </div>
                      </div>
                      <button 
                        disabled 
                        className="w-full py-2 rounded text-white font-semibold mt-4 text-sm"
                        style={{ backgroundColor: parabensButtonColor, opacity: 0.9 }}
                      >
                        {parabensButtonText}
                      </button>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-6 text-gray-600 text-xs">
                      <p>Dados do cliente: <strong>Nome do Cliente</strong></p>
                      <p>Você poderá atualizar este endereço depois</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Aba 3: Contrato */}
        {activeTab === 'contrato' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário - Esquerda */}
            <div className="space-y-6 min-h-screen overflow-y-auto pr-2">
            {/* Personalizações */}
            <Card>
              <CardHeader>
                <CardTitle>Personalizações do Contrato</CardTitle>
                <CardDescription>Logo, cores, fontes e identidade visual</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Nome da sua empresa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logoFile">Logo (Upload)</Label>
                    <Input
                      id="logoFile"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                    />
                    {logoPreview && (
                      <div className="mt-3 p-3 border rounded-md bg-gray-50">
                        <img src={logoPreview} alt="Preview" style={{maxWidth: '150px', height: 'auto'}} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logoSize">Tamanho do Logo</Label>
                    <select
                      id="logoSize"
                      value={logoSize}
                      onChange={(e) => setLogoSize(e.target.value as 'small' | 'medium' | 'large')}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="small">Pequeno (100px)</option>
                      <option value="medium">Médio (200px)</option>
                      <option value="large">Grande (300px)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Posição do Logo</Label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="logoPosition"
                          value="left"
                          checked={logoPosition === 'left'}
                          onChange={(e) => setLogoPosition(e.target.value as 'left' | 'center' | 'right')}
                        />
                        <span>Esquerda</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="logoPosition"
                          value="center"
                          checked={logoPosition === 'center'}
                          onChange={(e) => setLogoPosition(e.target.value as 'left' | 'center' | 'right')}
                        />
                        <span>Centro</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="logoPosition"
                          value="right"
                          checked={logoPosition === 'right'}
                          onChange={(e) => setLogoPosition(e.target.value as 'left' | 'center' | 'right')}
                        />
                        <span>Direita</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Cor Primária</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-10 w-20"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#2c3e50"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="textColor">Cor do Texto</Label>
                    <div className="flex gap-2">
                      <Input
                        id="textColor"
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="h-10 w-20"
                      />
                      <Input
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        placeholder="#333333"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fontFamily">Fonte</Label>
                    <Input
                      id="fontFamily"
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      placeholder="Arial, sans-serif"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fontSize">Tamanho da Fonte</Label>
                    <Input
                      id="fontSize"
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value)}
                      placeholder="16px"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="footerText">Texto do Rodapé</Label>
                  <Textarea
                    id="footerText"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="© 2024 Sua Empresa. Todos os direitos reservados."
                    rows={3}
                  />
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-sm mb-4">Personalizar Card "Adquirir Maleta"</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maletaCardColor">Cor do Card</Label>
                      <div className="flex gap-2">
                        <Input
                          id="maletaCardColor"
                          type="color"
                          value={maletaCardColor}
                          onChange={(e) => setMaletaCardColor(e.target.value)}
                          className="h-10 w-20"
                        />
                        <Input
                          value={maletaCardColor}
                          onChange={(e) => setMaletaCardColor(e.target.value)}
                          placeholder="#dbeafe"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maletaButtonColor">Cor do Botão</Label>
                      <div className="flex gap-2">
                        <Input
                          id="maletaButtonColor"
                          type="color"
                          value={maletaButtonColor}
                          onChange={(e) => setMaletaButtonColor(e.target.value)}
                          className="h-10 w-20"
                        />
                        <Input
                          value={maletaButtonColor}
                          onChange={(e) => setMaletaButtonColor(e.target.value)}
                          placeholder="#22c55e"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maletaTextColor">Cor do Texto</Label>
                      <div className="flex gap-2">
                        <Input
                          id="maletaTextColor"
                          type="color"
                          value={maletaTextColor}
                          onChange={(e) => setMaletaTextColor(e.target.value)}
                          className="h-10 w-20"
                        />
                        <Input
                          value={maletaTextColor}
                          onChange={(e) => setMaletaTextColor(e.target.value)}
                          placeholder="#1e40af"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conteúdo */}
            <Card>
              <CardHeader>
                <CardTitle>Conteúdo do Contrato</CardTitle>
                <CardDescription>Personalize o titulo e as clausulas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contractTitle">Titulo do Contrato</Label>
                  <Input
                    id="contractTitle"
                    value={contractTitle}
                    onChange={(e) => setContractTitle(e.target.value)}
                    placeholder="Ex: CONTRATO DE PRESTACAO DE SERVICOS"
                    data-testid="input-contract-title"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Label>Clausulas</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addClause} data-testid="button-add-clause">
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar Clausula
                    </Button>
                  </div>

                  {clauses.map((clause, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Label>Clausula {index + 1}</Label>
                        {clauses.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeClause(index)}
                            data-testid={`button-remove-clause-${index}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <Input
                        value={clause.title}
                        onChange={(e) => updateClause(index, 'title', e.target.value)}
                        placeholder="Titulo da clausula"
                        data-testid={`input-clause-title-${index}`}
                      />
                      <Textarea
                        value={clause.content}
                        onChange={(e) => updateClause(index, 'content', e.target.value)}
                        placeholder="Conteudo da clausula"
                        rows={3}
                        data-testid={`input-clause-content-${index}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            </div>

            {/* Preview à direita - FIXO */}
            <div className="sticky top-6 h-[calc(100vh-100px)] flex flex-col">
              <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base">Preview do Contrato</CardTitle>
                  <CardDescription>Visualização em tempo real</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                  <div className="border rounded-lg bg-white p-0" style={{fontSize: '12px', height: '100%'}}>
                    <div style={{
                      fontFamily: fontFamily,
                      color: textColor,
                      maxWidth: '600px',
                      margin: '0 auto',
                      padding: '20px'
                    }}>
                      {logoUrl && (
                        <div style={{
                          textAlign: logoPosition as any,
                          marginBottom: '20px'
                        }}>
                          <img src={logoUrl} alt="Logo" style={{
                            maxWidth: logoSize === 'small' ? '100px' : logoSize === 'large' ? '300px' : '200px',
                            height: 'auto'
                          }} />
                        </div>
                      )}
                      <div style={{
                        padding: '15px',
                        borderRadius: '4px',
                        marginBottom: '20px',
                        textAlign: 'center',
                        borderBottom: `3px solid ${primaryColor}`
                      }}>
                        <h1 style={{margin: '0', fontSize: '20px', fontWeight: 'bold', color: primaryColor}}>{contractTitle}</h1>
                        <p style={{margin: '8px 0 0 0', fontSize: '12px', color: textColor}}>Protocolo: <strong>CONT-XXXXX-XXXXX</strong></p>
                      </div>
                      <div style={{fontSize: fontSize, lineHeight: '1.6', marginBottom: '20px', color: textColor}}>
                        <h3 style={{color: textColor, borderBottom: `2px solid ${primaryColor}`, paddingBottom: '8px', marginTop: '20px', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold'}}>
                          INFORMAÇÕES DO CLIENTE
                        </h3>
                        <p style={{margin: '5px 0', color: textColor}}><strong style={{color: primaryColor}}>Nome:</strong> [Nome do cliente]</p>
                        <p style={{margin: '5px 0', color: textColor}}><strong style={{color: primaryColor}}>CPF:</strong> [CPF do cliente]</p>
                        <p style={{margin: '5px 0', color: textColor}}><strong style={{color: primaryColor}}>Email:</strong> [Email do cliente]</p>
                        <p style={{margin: '5px 0', color: textColor}}><strong style={{color: primaryColor}}>Telefone:</strong> [Telefone do cliente]</p>
                      </div>
                      <div>
                        <h3 style={{color: textColor, borderBottom: `2px solid ${primaryColor}`, paddingBottom: '8px', marginTop: '20px', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold'}}>
                          CLÁUSULAS
                        </h3>
                        {clauses.map((clause, idx) => (
                          <div key={idx} style={{marginBottom: '15px'}}>
                            <h4 style={{color: primaryColor, margin: '10px 0 5px 0', fontSize: '13px', fontWeight: 'bold'}}>
                              {clause.title || `Cláusula ${idx + 1}`}
                            </h4>
                            <p style={{margin: '0', textAlign: 'justify', fontSize: fontSize, color: textColor}}>
                              {clause.content || '[Conteúdo da cláusula]'}
                            </p>
                          </div>
                        ))}
                      </div>
                      {footerText && (
                        <div style={{
                          marginTop: '20px',
                          paddingTop: '15px',
                          borderTop: `1px solid ${primaryColor}`,
                          fontSize: '11px',
                          color: textColor,
                          textAlign: 'center'
                        }}>
                          {footerText}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Botão Flutuante Criar Contrato - Sempre Visível */}
        <ContractDetailsModal 
          contract={selectedContract} 
          open={modalOpen} 
          onOpenChange={setModalOpen}
        />

        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={handleCreateContract}
            disabled={createContractMutation.isPending}
            className="rounded-full shadow-lg h-14 px-8 gap-2 hover:shadow-xl transition-all"
            size="lg"
            data-testid="button-create-contract"
          >
            <FileText className="w-5 h-5" />
            <span className="hidden sm:inline">
              {createContractMutation.isPending ? 'Criando...' : 'Criar Contrato'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Admin;
