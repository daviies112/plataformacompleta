import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ContractDetailsModal } from '@/components/assinatura/modals/ContractDetailsModal';
import { 
  FileText, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  Users, 
  FileCheck, 
  Gift, 
  AlertCircle, 
  Camera, 
  Shield, 
  Smartphone,
  Palette,
  Eye,
  FileSignature
} from 'lucide-react';

interface ContractClause {
  title: string;
  content: string;
}

interface Contract {
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
}

const defaultClauses: ContractClause[] = [
  {
    title: 'Objeto do Contrato',
    content: 'O presente contrato tem por objeto estabelecer os termos e condições para a prestação de serviços entre as partes.'
  },
  {
    title: 'Obrigações das Partes',
    content: 'As partes comprometem-se a cumprir todas as disposições previstas neste instrumento, agindo sempre com boa-fé e transparência.'
  },
  {
    title: 'Prazo de Vigência',
    content: 'Este contrato terá vigência pelo prazo acordado entre as partes, podendo ser renovado mediante acordo mútuo.'
  }
];

const AssinaturaPage = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('cliente');
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
  const [contractTitle, setContractTitle] = useState('Contrato de Prestação de Serviços');
  const [clauses, setClauses] = useState<ContractClause[]>(defaultClauses);
  
  // Contrato - Personalizações
  const [logoUrl, setLogoUrl] = useState('');
  const [logoSize, setLogoSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [logoPosition, setLogoPosition] = useState<'center' | 'left' | 'right'>('center');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#2c3e50');
  const [textColor, setTextColor] = useState('#333333');
  const [fontFamily, setFontFamily] = useState('Arial, sans-serif');
  const [fontSize, setFontSize] = useState('16px');
  const [companyName, setCompanyName] = useState('Sua Empresa');
  const [footerText, setFooterText] = useState('Documento gerado eletronicamente');

  // Maleta - Cores
  const [maletaCardColor, setMaletaCardColor] = useState('#dbeafe');
  const [maletaButtonColor, setMaletaButtonColor] = useState('#22c55e');
  const [maletaTextColor, setMaletaTextColor] = useState('#1e40af');

  // Parabéns - Personalização
  const [parabensTitle, setParabensTitle] = useState('Parabéns!');
  const [parabensSubtitle, setParabensSubtitle] = useState('Processo concluído com sucesso!');
  const [parabensDescription, setParabensDescription] = useState('Sua documentação foi processada. Aguarde as próximas instruções.');
  const [parabensCardColor, setParabensCardColor] = useState('#dbeafe');
  const [parabensBackgroundColor, setParabensBackgroundColor] = useState('#f0fdf4');
  const [parabensButtonColor, setParabensButtonColor] = useState('#22c55e');
  const [parabensTextColor, setParabensTextColor] = useState('#1e40af');
  const [parabensFontFamily, setParabensFontFamily] = useState('Arial, sans-serif');
  const [parabensFormTitle, setParabensFormTitle] = useState('Endereço para Entrega');
  const [parabensButtonText, setParabensButtonText] = useState('Confirmar e Continuar');

  // Verificação - Personalização
  const [verificationPrimaryColor, setVerificationPrimaryColor] = useState('#2c3e50');
  const [verificationTextColor, setVerificationTextColor] = useState('#000000');
  const [verificationFontFamily, setVerificationFontFamily] = useState('Arial, sans-serif');
  const [verificationFontSize, setVerificationFontSize] = useState('16px');
  const [verificationLogoUrl, setVerificationLogoUrl] = useState('');
  const [verificationLogoSize, setVerificationLogoSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [verificationLogoPosition, setVerificationLogoPosition] = useState<'center' | 'left' | 'right'>('center');
  const [verificationFooterText, setVerificationFooterText] = useState('Verificação de Identidade Segura');
  const [verificationWelcomeText, setVerificationWelcomeText] = useState('Verificação de Identidade');
  const [verificationInstructions, setVerificationInstructions] = useState('Processo seguro e rápido para confirmar sua identidade através de reconhecimento facial.');
  const [verificationSecurityText, setVerificationSecurityText] = useState('Suas informações são processadas de forma segura e criptografada');
  const [verificationBackgroundColor, setVerificationBackgroundColor] = useState('#ffffff');
  const [verificationHeaderBackgroundColor, setVerificationHeaderBackgroundColor] = useState('#2c3e50');
  const [verificationHeaderCompanyName, setVerificationHeaderCompanyName] = useState('Sua Empresa');

  // Progresso - Personalização
  const [progressCardColor, setProgressCardColor] = useState('#dbeafe');
  const [progressButtonColor, setProgressButtonColor] = useState('#22c55e');
  const [progressTextColor, setProgressTextColor] = useState('#1e40af');
  const [progressTitle, setProgressTitle] = useState('Assinatura Digital');
  const [progressSubtitle, setProgressSubtitle] = useState('Conclua os passos abaixo para finalizar o processo.');
  const [progressStep1Title, setProgressStep1Title] = useState('1. Reconhecimento Facial');
  const [progressStep1Description, setProgressStep1Description] = useState('Tire uma selfie para validar sua identidade');
  const [progressStep2Title, setProgressStep2Title] = useState('2. Assinar Contrato');
  const [progressStep2Description, setProgressStep2Description] = useState('Assine digitalmente o contrato');
  const [progressStep3Title, setProgressStep3Title] = useState('3. Confirmação');
  const [progressStep3Description, setProgressStep3Description] = useState('Confirme seus dados e finalize');
  const [progressButtonText, setProgressButtonText] = useState('Complete os passos acima');
  const [progressFontFamily, setProgressFontFamily] = useState('Arial, sans-serif');

  // Aplicativos
  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [googlePlayUrl, setGooglePlayUrl] = useState('');

  const { data: contracts = [], isLoading: isLoadingContracts } = useQuery<Contract[]>({
    queryKey: ['/api/assinatura/contracts'],
  });

  const createContractMutation = useMutation({
    mutationFn: async (contractData: Record<string, unknown>) => {
      const response = await apiRequest('POST', '/api/assinatura/contracts', contractData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/assinatura/contracts'] });
      const url = `${window.location.origin}/assinar/${data.access_token}`;
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
        description: 'Não foi possível criar o contrato. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

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
    setClientCpf(formatCPF(value));
  };

  const handlePhoneChange = (value: string) => {
    setClientPhone(formatPhone(value));
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

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string);
      setLogoUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
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
          <h2>Dados do Contratante</h2>
          <p><strong>Nome:</strong> {{CLIENT_NAME}}</p>
          <p><strong>CPF:</strong> {{CLIENT_CPF}}</p>
          <p><strong>E-mail:</strong> {{CLIENT_EMAIL}}</p>
          <p><strong>Telefone:</strong> {{CLIENT_PHONE}}</p>
        </div>

        <div class="contract-section">
          <h2>Cláusulas</h2>
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
      toast({ title: 'Erro', description: 'Nome do cliente é obrigatório', variant: 'destructive' });
      return;
    }

    const cpfNumbers = clientCpf.replace(/\D/g, '');
    if (!validateCPF(cpfNumbers)) {
      toast({ title: 'Erro', description: 'CPF inválido', variant: 'destructive' });
      return;
    }

    if (!clientEmail.trim() || !clientEmail.includes('@')) {
      toast({ title: 'Erro', description: 'E-mail inválido', variant: 'destructive' });
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
      verification_background_color: verificationBackgroundColor,
      verification_header_background_color: verificationHeaderBackgroundColor,
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
      toast({ title: 'Copiado!', description: 'URL copiada para a área de transferência.' });
    }
  };

  const resetForm = () => {
    setClientName('');
    setClientCpf('');
    setClientEmail('');
    setClientPhone('');
    setContractTitle('Contrato de Prestação de Serviços');
    setClauses(defaultClauses);
    setGeneratedUrl(null);
    setLogoUrl('');
    setLogoSize('medium');
    setLogoPosition('center');
    setLogoPreview(null);
    setPrimaryColor('#2c3e50');
    setTextColor('#333333');
    setFontFamily('Arial, sans-serif');
    setFontSize('16px');
    setCompanyName('Sua Empresa');
    setFooterText('Documento gerado eletronicamente');
    setCopied(false);
  };

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'signed':
        return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Assinado</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            <FileSignature className="inline-block w-6 h-6 mr-2" />
            Assinatura Digital
          </h1>
          <p className="text-muted-foreground mt-1">Gerenciador de contratos para assinatura digital</p>
        </div>
      </div>

      {generatedUrl && (
        <Card className="border-green-500/50 bg-green-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="cliente" className="flex items-center gap-2" data-testid="tab-cliente">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Cliente</span>
          </TabsTrigger>
          <TabsTrigger value="aparencia" className="flex items-center gap-2" data-testid="tab-aparencia">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Aparência</span>
          </TabsTrigger>
          <TabsTrigger value="verificacao" className="flex items-center gap-2" data-testid="tab-verificacao">
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Verificação</span>
          </TabsTrigger>
          <TabsTrigger value="contrato" className="flex items-center gap-2" data-testid="tab-contrato">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Contrato</span>
          </TabsTrigger>
          <TabsTrigger value="progresso" className="flex items-center gap-2" data-testid="tab-progresso">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Progresso</span>
          </TabsTrigger>
          <TabsTrigger value="parabens" className="flex items-center gap-2" data-testid="tab-parabens">
            <Gift className="w-4 h-4" />
            <span className="hidden sm:inline">Parabéns</span>
          </TabsTrigger>
          <TabsTrigger value="aplicativos" className="flex items-center gap-2" data-testid="tab-aplicativos">
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Apps</span>
          </TabsTrigger>
          <TabsTrigger value="contratos" className="flex items-center gap-2" data-testid="tab-contratos">
            <FileCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Contratos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cliente" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Cliente</CardTitle>
              <CardDescription>Informações do cliente que irá assinar o contrato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Nome Completo *</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nome do cliente"
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
                    data-testid="input-client-cpf"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">E-mail *</Label>
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
                  <Label htmlFor="clientPhone">Telefone</Label>
                  <Input
                    id="clientPhone"
                    value={clientPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="(00) 00000-0000"
                    data-testid="input-client-phone"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aparencia" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Identidade Visual</CardTitle>
              <CardDescription>Personalize a aparência do contrato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da Empresa</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Sua Empresa"
                    data-testid="input-company-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoFile">Logo (Upload)</Label>
                  <Input
                    id="logoFile"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    data-testid="input-logo-upload"
                  />
                  {logoPreview && (
                    <div className="mt-2 p-3 border rounded-md bg-muted">
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
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    data-testid="select-logo-size"
                  >
                    <option value="small">Pequeno (100px)</option>
                    <option value="medium">Médio (200px)</option>
                    <option value="large">Grande (300px)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoPosition">Posição do Logo</Label>
                  <select
                    id="logoPosition"
                    value={logoPosition}
                    onChange={(e) => setLogoPosition(e.target.value as 'center' | 'left' | 'right')}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    data-testid="select-logo-position"
                  >
                    <option value="left">Esquerda</option>
                    <option value="center">Centro</option>
                    <option value="right">Direita</option>
                  </select>
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
                      data-testid="input-primary-color"
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
                      data-testid="input-text-color"
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
                  <select
                    id="fontFamily"
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    data-testid="select-font-family"
                  >
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="Courier New, monospace">Courier New</option>
                    <option value="Times New Roman, serif">Times New Roman</option>
                    <option value="Verdana, sans-serif">Verdana</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="footerText">Texto do Rodapé</Label>
                  <Input
                    id="footerText"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Texto do rodapé"
                    data-testid="input-footer-text"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verificacao" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Verificação de Identidade</CardTitle>
                  <CardDescription>Personalize a etapa de verificação facial</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="verificationWelcomeText">Título da Página</Label>
                      <Input
                        id="verificationWelcomeText"
                        value={verificationWelcomeText}
                        onChange={(e) => setVerificationWelcomeText(e.target.value)}
                        placeholder="Verificação de Identidade"
                        data-testid="input-verification-welcome"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verificationHeaderCompanyName">Nome da Empresa no Header</Label>
                      <Input
                        id="verificationHeaderCompanyName"
                        value={verificationHeaderCompanyName}
                        onChange={(e) => setVerificationHeaderCompanyName(e.target.value)}
                        placeholder="Sua Empresa"
                        data-testid="input-verification-company"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="verificationInstructions">Instruções</Label>
                      <Textarea
                        id="verificationInstructions"
                        value={verificationInstructions}
                        onChange={(e) => setVerificationInstructions(e.target.value)}
                        placeholder="Descrição do processo"
                        rows={3}
                        data-testid="input-verification-instructions"
                      />
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
                          data-testid="input-verification-primary-color"
                        />
                        <Input
                          value={verificationPrimaryColor}
                          onChange={(e) => setVerificationPrimaryColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verificationHeaderBackgroundColor">Cor do Header</Label>
                      <div className="flex gap-2">
                        <Input
                          id="verificationHeaderBackgroundColor"
                          type="color"
                          value={verificationHeaderBackgroundColor}
                          onChange={(e) => setVerificationHeaderBackgroundColor(e.target.value)}
                          className="h-10 w-20"
                          data-testid="input-verification-header-color"
                        />
                        <Input
                          value={verificationHeaderBackgroundColor}
                          onChange={(e) => setVerificationHeaderBackgroundColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verificationFooterText">Texto do Rodapé</Label>
                      <Input
                        id="verificationFooterText"
                        value={verificationFooterText}
                        onChange={(e) => setVerificationFooterText(e.target.value)}
                        placeholder="Texto do rodapé"
                        data-testid="input-verification-footer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verificationSecurityText">Texto de Segurança</Label>
                      <Input
                        id="verificationSecurityText"
                        value={verificationSecurityText}
                        onChange={(e) => setVerificationSecurityText(e.target.value)}
                        placeholder="Suas informações são seguras"
                        data-testid="input-verification-security"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="sticky top-6 h-fit">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preview da Verificação</CardTitle>
                  <CardDescription>Visualização em tempo real</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden shadow-sm" style={{ minHeight: '400px' }}>
                    <div 
                      className="p-4 flex items-center justify-between"
                      style={{ backgroundColor: verificationHeaderBackgroundColor }}
                    >
                      {logoUrl && (
                        <img src={logoUrl} alt="Logo" className="h-8 object-contain" />
                      )}
                      <span className="text-white font-medium text-sm">{verificationHeaderCompanyName}</span>
                      <Shield className="w-5 h-5 text-white opacity-75" />
                    </div>
                    <div className="p-6 bg-gray-50 flex flex-col items-center">
                      <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                        style={{ backgroundColor: verificationPrimaryColor }}
                      >
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-center" style={{ color: verificationPrimaryColor }}>
                        {verificationWelcomeText}
                      </h3>
                      <p className="text-sm text-gray-600 text-center mb-6 max-w-xs">
                        {verificationInstructions}
                      </p>
                      <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center border-4 mb-4" style={{ borderColor: verificationPrimaryColor }}>
                        <Camera className="w-12 h-12 text-gray-400" />
                      </div>
                      <button 
                        className="px-6 py-2 rounded-lg text-white font-medium text-sm"
                        style={{ backgroundColor: verificationPrimaryColor }}
                      >
                        Tirar Selfie
                      </button>
                      <p className="text-xs text-gray-500 mt-4 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        {verificationSecurityText}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-100 text-center">
                      <p className="text-xs text-gray-500">{verificationFooterText}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contrato" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conteúdo do Contrato</CardTitle>
              <CardDescription>Defina o título e as cláusulas do contrato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contractTitle">Título do Contrato</Label>
                <Input
                  id="contractTitle"
                  value={contractTitle}
                  onChange={(e) => setContractTitle(e.target.value)}
                  placeholder="Contrato de Prestação de Serviços"
                  data-testid="input-contract-title"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Cláusulas</Label>
                  <Button onClick={addClause} variant="outline" size="sm" data-testid="button-add-clause">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Cláusula
                  </Button>
                </div>

                {clauses.map((clause, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Cláusula {index + 1}</Label>
                        <Button
                          onClick={() => removeClause(index)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          data-testid={`button-remove-clause-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Input
                        value={clause.title}
                        onChange={(e) => updateClause(index, 'title', e.target.value)}
                        placeholder="Título da cláusula"
                        data-testid={`input-clause-title-${index}`}
                      />
                      <Textarea
                        value={clause.content}
                        onChange={(e) => updateClause(index, 'content', e.target.value)}
                        placeholder="Conteúdo da cláusula"
                        rows={3}
                        data-testid={`input-clause-content-${index}`}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progresso" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Rastreador de Progresso</CardTitle>
                  <CardDescription>Personalize o indicador de progresso exibido ao cliente</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="progressTitle">Título</Label>
                      <Input
                        id="progressTitle"
                        value={progressTitle}
                        onChange={(e) => setProgressTitle(e.target.value)}
                        placeholder="Assinatura Digital"
                        data-testid="input-progress-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="progressCardColor">Cor do Card</Label>
                      <div className="flex gap-2">
                        <Input
                          id="progressCardColor"
                          type="color"
                          value={progressCardColor}
                          onChange={(e) => setProgressCardColor(e.target.value)}
                          className="h-10 w-20"
                          data-testid="input-progress-card-color"
                        />
                        <Input
                          value={progressCardColor}
                          onChange={(e) => setProgressCardColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="progressSubtitle">Subtítulo</Label>
                      <Textarea
                        id="progressSubtitle"
                        value={progressSubtitle}
                        onChange={(e) => setProgressSubtitle(e.target.value)}
                        placeholder="Conclua os passos abaixo"
                        rows={2}
                        data-testid="input-progress-subtitle"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="progressStep1Title">Passo 1 - Título</Label>
                      <Input
                        id="progressStep1Title"
                        value={progressStep1Title}
                        onChange={(e) => setProgressStep1Title(e.target.value)}
                        placeholder="1. Reconhecimento Facial"
                        data-testid="input-progress-step1-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="progressStep1Description">Passo 1 - Descrição</Label>
                      <Input
                        id="progressStep1Description"
                        value={progressStep1Description}
                        onChange={(e) => setProgressStep1Description(e.target.value)}
                        placeholder="Descrição do passo 1"
                        data-testid="input-progress-step1-desc"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="progressStep2Title">Passo 2 - Título</Label>
                      <Input
                        id="progressStep2Title"
                        value={progressStep2Title}
                        onChange={(e) => setProgressStep2Title(e.target.value)}
                        placeholder="2. Assinar Contrato"
                        data-testid="input-progress-step2-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="progressStep2Description">Passo 2 - Descrição</Label>
                      <Input
                        id="progressStep2Description"
                        value={progressStep2Description}
                        onChange={(e) => setProgressStep2Description(e.target.value)}
                        placeholder="Descrição do passo 2"
                        data-testid="input-progress-step2-desc"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="progressStep3Title">Passo 3 - Título</Label>
                      <Input
                        id="progressStep3Title"
                        value={progressStep3Title}
                        onChange={(e) => setProgressStep3Title(e.target.value)}
                        placeholder="3. Confirmação"
                        data-testid="input-progress-step3-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="progressStep3Description">Passo 3 - Descrição</Label>
                      <Input
                        id="progressStep3Description"
                        value={progressStep3Description}
                        onChange={(e) => setProgressStep3Description(e.target.value)}
                        placeholder="Descrição do passo 3"
                        data-testid="input-progress-step3-desc"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="progressButtonColor">Cor do Botão</Label>
                      <div className="flex gap-2">
                        <Input
                          id="progressButtonColor"
                          type="color"
                          value={progressButtonColor}
                          onChange={(e) => setProgressButtonColor(e.target.value)}
                          className="h-10 w-20"
                          data-testid="input-progress-button-color"
                        />
                        <Input
                          value={progressButtonColor}
                          onChange={(e) => setProgressButtonColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="progressTextColor">Cor do Texto</Label>
                      <div className="flex gap-2">
                        <Input
                          id="progressTextColor"
                          type="color"
                          value={progressTextColor}
                          onChange={(e) => setProgressTextColor(e.target.value)}
                          className="h-10 w-20"
                          data-testid="input-progress-text-color"
                        />
                        <Input
                          value={progressTextColor}
                          onChange={(e) => setProgressTextColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="sticky top-6 h-fit">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preview do Progresso</CardTitle>
                  <CardDescription>Visualização em tempo real</CardDescription>
                </CardHeader>
                <CardContent>
                  <div 
                    style={{ 
                      backgroundColor: progressCardColor,
                      fontFamily: progressFontFamily,
                      padding: '16px',
                      borderRadius: '8px',
                      gap: '12px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <h2 
                      style={{ 
                        color: progressTextColor,
                        fontSize: '18px',
                        fontWeight: 'bold',
                        margin: 0
                      }}
                    >
                      {progressTitle}
                    </h2>
                    <p 
                      style={{ 
                        color: progressTextColor,
                        fontSize: '13px',
                        margin: 0,
                        opacity: 0.9
                      }}
                    >
                      {progressSubtitle}
                    </p>

                    <div style={{ gap: '8px', display: 'flex', flexDirection: 'column' }}>
                      {[
                        { num: 1, title: progressStep1Title, desc: progressStep1Description, complete: true },
                        { num: 2, title: progressStep2Title, desc: progressStep2Description, complete: false },
                        { num: 3, title: progressStep3Title, desc: progressStep3Description, complete: false },
                      ].map((step) => (
                        <div 
                          key={step.num}
                          style={{ 
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '12px',
                            borderRadius: '6px',
                            borderColor: progressButtonColor,
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            backgroundColor: step.complete ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.1)'
                          }}
                        >
                          <div className="flex-shrink-0">
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: progressButtonColor }}
                            >
                              {step.complete ? <Check className="w-3 h-3" /> : step.num}
                            </div>
                          </div>
                          <div className="flex-1">
                            <p 
                              style={{ 
                                color: progressTextColor,
                                fontSize: '13px',
                                fontWeight: 'bold',
                                margin: 0,
                                textDecoration: step.complete ? 'line-through' : 'none'
                              }}
                            >
                              {step.title}
                            </p>
                            <p 
                              style={{ 
                                color: progressTextColor,
                                fontSize: '11px',
                                opacity: 0.8,
                                margin: '2px 0 0 0'
                              }}
                            >
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button 
                      style={{ 
                        backgroundColor: progressButtonColor,
                        fontFamily: progressFontFamily,
                        fontSize: '13px',
                        width: '100%',
                        padding: '10px 0',
                        color: 'white',
                        fontWeight: 'bold',
                        borderRadius: '6px',
                        border: 'none',
                        opacity: 0.5,
                        cursor: 'default'
                      }}
                      disabled
                    >
                      {progressButtonText}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="parabens" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Página de Parabéns</CardTitle>
                  <CardDescription>Personalize a página de conclusão</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="parabensTitle">Título</Label>
                      <Input
                        id="parabensTitle"
                        value={parabensTitle}
                        onChange={(e) => setParabensTitle(e.target.value)}
                        placeholder="Parabéns!"
                        data-testid="input-parabens-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parabensSubtitle">Subtítulo</Label>
                      <Input
                        id="parabensSubtitle"
                        value={parabensSubtitle}
                        onChange={(e) => setParabensSubtitle(e.target.value)}
                        placeholder="Processo concluído!"
                        data-testid="input-parabens-subtitle"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="parabensDescription">Descrição</Label>
                      <Textarea
                        id="parabensDescription"
                        value={parabensDescription}
                        onChange={(e) => setParabensDescription(e.target.value)}
                        placeholder="Sua documentação foi processada"
                        rows={3}
                        data-testid="input-parabens-description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parabensCardColor">Cor do Card</Label>
                      <div className="flex gap-2">
                        <Input
                          id="parabensCardColor"
                          type="color"
                          value={parabensCardColor}
                          onChange={(e) => setParabensCardColor(e.target.value)}
                          className="h-10 w-20"
                          data-testid="input-parabens-card-color"
                        />
                        <Input
                          value={parabensCardColor}
                          onChange={(e) => setParabensCardColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parabensButtonColor">Cor do Botão</Label>
                      <div className="flex gap-2">
                        <Input
                          id="parabensButtonColor"
                          type="color"
                          value={parabensButtonColor}
                          onChange={(e) => setParabensButtonColor(e.target.value)}
                          className="h-10 w-20"
                          data-testid="input-parabens-button-color"
                        />
                        <Input
                          value={parabensButtonColor}
                          onChange={(e) => setParabensButtonColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parabensButtonText">Texto do Botão</Label>
                      <Input
                        id="parabensButtonText"
                        value={parabensButtonText}
                        onChange={(e) => setParabensButtonText(e.target.value)}
                        placeholder="Confirmar e Continuar"
                        data-testid="input-parabens-button-text"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parabensFormTitle">Título do Formulário</Label>
                      <Input
                        id="parabensFormTitle"
                        value={parabensFormTitle}
                        onChange={(e) => setParabensFormTitle(e.target.value)}
                        placeholder="Endereço para Entrega"
                        data-testid="input-parabens-form-title"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="sticky top-6 h-fit">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preview de Parabéns</CardTitle>
                  <CardDescription>Visualização em tempo real</CardDescription>
                </CardHeader>
                <CardContent>
                  <div 
                    className="rounded-lg p-6 flex flex-col items-center"
                    style={{ 
                      backgroundColor: parabensBackgroundColor,
                      fontFamily: parabensFontFamily
                    }}
                  >
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                      style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                    >
                      <Gift className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 
                      className="text-2xl font-bold mb-2 text-center"
                      style={{ color: parabensTextColor }}
                    >
                      {parabensTitle}
                    </h2>
                    <p 
                      className="text-lg mb-1 text-center"
                      style={{ color: parabensTextColor }}
                    >
                      {parabensSubtitle}
                    </p>
                    <p 
                      className="text-sm text-center mb-6 opacity-80"
                      style={{ color: parabensTextColor }}
                    >
                      {parabensDescription}
                    </p>

                    <div 
                      className="w-full p-4 rounded-lg mb-4"
                      style={{ backgroundColor: parabensCardColor }}
                    >
                      <h3 
                        className="text-sm font-semibold mb-3"
                        style={{ color: parabensTextColor }}
                      >
                        {parabensFormTitle}
                      </h3>
                      <div className="space-y-2">
                        <div className="h-8 bg-white rounded border border-gray-200" />
                        <div className="flex gap-2">
                          <div className="h-8 flex-1 bg-white rounded border border-gray-200" />
                          <div className="h-8 w-20 bg-white rounded border border-gray-200" />
                        </div>
                        <div className="flex gap-2">
                          <div className="h-8 flex-1 bg-white rounded border border-gray-200" />
                          <div className="h-8 w-16 bg-white rounded border border-gray-200" />
                        </div>
                      </div>
                    </div>

                    <button 
                      className="w-full py-3 rounded-lg text-white font-bold text-sm"
                      style={{ backgroundColor: parabensButtonColor }}
                    >
                      {parabensButtonText}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="aplicativos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Links dos Aplicativos</CardTitle>
              <CardDescription>URLs das lojas de aplicativos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="appStoreUrl">App Store (iOS)</Label>
                <Input
                  id="appStoreUrl"
                  value={appStoreUrl}
                  onChange={(e) => setAppStoreUrl(e.target.value)}
                  placeholder="https://apps.apple.com/..."
                  data-testid="input-app-store-url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="googlePlayUrl">Google Play (Android)</Label>
                <Input
                  id="googlePlayUrl"
                  value={googlePlayUrl}
                  onChange={(e) => setGooglePlayUrl(e.target.value)}
                  placeholder="https://play.google.com/..."
                  data-testid="input-google-play-url"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contratos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contratos Criados</CardTitle>
              <CardDescription>Lista de todos os contratos gerados</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingContracts ? (
                <div className="text-center py-8 text-muted-foreground">Carregando contratos...</div>
              ) : contracts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum contrato criado ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer"
                      onClick={() => {
                        setSelectedContract(contract);
                        setModalOpen(true);
                      }}
                      data-testid={`contract-item-${contract.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{contract.client_name}</p>
                          <p className="text-sm text-muted-foreground">{contract.client_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(contract.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = `${window.location.origin}/assinar/${contract.access_token}`;
                            navigator.clipboard.writeText(url);
                            toast({ title: 'URL copiada!' });
                          }}
                          data-testid={`button-copy-contract-${contract.id}`}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/assinar/${contract.access_token}`, '_blank');
                          }}
                          data-testid={`button-view-contract-${contract.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {activeTab !== 'contratos' && (
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={resetForm} data-testid="button-reset-form">
            Limpar
          </Button>
          <Button 
            onClick={handleCreateContract} 
            disabled={createContractMutation.isPending}
            data-testid="button-create-contract"
          >
            {createContractMutation.isPending ? 'Criando...' : 'Criar Contrato'}
          </Button>
        </div>
      )}

      {selectedContract && (
        <ContractDetailsModal
          contract={selectedContract}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      )}
    </div>
  );
};

export default AssinaturaPage;
