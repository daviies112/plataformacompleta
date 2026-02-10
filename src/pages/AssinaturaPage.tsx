import { useState } from 'react';
import * as React from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ContractDetailsModal } from '@/components/assinatura/modals/ContractDetailsModal';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  FileText, 
  Copy, 
  Check, 
  Plus, 
  Clock, 
  CheckCircle2, 
  FileCheck, 
  Loader2, 
  Eye,
  FileSignature,
  ChevronDown,
  ChevronUp,
  List
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
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showContracts, setShowContracts] = useState(false);

  const [clientName, setClientName] = useState('');
  const [clientCpf, setClientCpf] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  const [contractTitle, setContractTitle] = useState('Contrato de Prestação de Serviços');
  const [clauses, setClauses] = useState<ContractClause[]>(defaultClauses);
  
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

  const [maletaCardColor, setMaletaCardColor] = useState('#dbeafe');
  const [maletaButtonColor, setMaletaButtonColor] = useState('#22c55e');
  const [maletaTextColor, setMaletaTextColor] = useState('#1e40af');

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

  const [contractPrimaryColor, setContractPrimaryColor] = useState('#2c3e50');
  const [contractTextColor, setContractTextColor] = useState('#333333');
  const [contractBackgroundColor, setContractBackgroundColor] = useState('#ffffff');
  const [contractFontFamily, setContractFontFamily] = useState('Arial, sans-serif');

  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [googlePlayUrl, setGooglePlayUrl] = useState('');

  const { data: globalConfig } = useQuery<any>({
    queryKey: ['/api/assinatura/global-config'],
  });
  
  const { data: appPromotionConfig, isLoading: isLoadingAppPromotion } = useQuery<{
    app_store_url: string;
    google_play_url: string;
  }>({
    queryKey: ['/api/assinatura/app-promotion'],
  });

  React.useEffect(() => {
    if (globalConfig) {
      if (globalConfig.logo_url) setLogoUrl(globalConfig.logo_url);
      if (globalConfig.company_name) setCompanyName(globalConfig.company_name);
    }
  }, [globalConfig]);

  React.useEffect(() => {
    if (appPromotionConfig) {
      if (appPromotionConfig.app_store_url) setAppStoreUrl(appPromotionConfig.app_store_url);
      if (appPromotionConfig.google_play_url) setGooglePlayUrl(appPromotionConfig.google_play_url);
    }
  }, [appPromotionConfig]);

  const saveAppPromotionMutation = useMutation({
    mutationFn: async (configData: { app_store_url: string; google_play_url: string }) => {
      const response = await apiRequest('PUT', '/api/assinatura/app-promotion', configData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assinatura/app-promotion'] });
      toast({
        title: 'Links salvos',
        description: 'Os links dos aplicativos foram atualizados com sucesso no Supabase.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os links dos aplicativos.',
        variant: 'destructive',
      });
    }
  });

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

    if (clauses.length === 0 || clauses.some(c => !c.title.trim() || !c.content.trim())) {
      toast({ 
        title: 'Aviso', 
        description: 'Preencha todas as cláusulas do contrato antes de criar.', 
        variant: 'destructive' 
      });
      return;
    }

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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <FileSignature className="w-5 h-5" />
            Assinatura Digital
          </h1>
          <p className="text-sm text-muted-foreground">Gerenciador de contratos para assinatura digital</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowContracts(!showContracts)}
            className="flex items-center gap-2"
            data-testid="button-toggle-contracts"
          >
            <List className="w-4 h-4" />
            Ver Contratos
            {showContracts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {generatedUrl && (
        <Card className="mx-4 mt-4 border-green-500/50 bg-green-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-600 text-lg">
              <Check className="w-5 h-5" />
              Contrato Criado com Sucesso!
            </CardTitle>
            <CardDescription>
              Copie a URL abaixo e envie para o cliente assinar o contrato.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input value={generatedUrl} readOnly className="font-mono text-sm" data-testid="input-generated-url" />
              <Button onClick={copyToClipboard} variant="outline" data-testid="button-copy-url">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Button onClick={resetForm} className="w-full" size="sm" data-testid="button-new-contract">
              <Plus className="w-4 h-4 mr-2" />
              Criar Novo Contrato
            </Button>
          </CardContent>
        </Card>
      )}

      <Collapsible open={showContracts} onOpenChange={setShowContracts}>
        <CollapsibleContent>
          <Card className="mx-4 mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                Contratos Criados
              </CardTitle>
              <CardDescription>Lista de todos os contratos gerados</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingContracts ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Carregando contratos...
                </div>
              ) : contracts.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhum contrato criado ainda</p>
                </div>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {contracts.map((contract) => (
                      <div
                        key={contract.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover-elevate cursor-pointer"
                        onClick={() => {
                          setSelectedContract(contract);
                          setModalOpen(true);
                        }}
                        data-testid={`contract-item-${contract.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium text-sm">{contract.client_name}</p>
                            <p className="text-xs text-muted-foreground">{contract.client_email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(contract.status)}
                          <Button
                            variant="ghost"
                            size="icon"
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
                            size="icon"
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
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex-1 min-h-0 p-4">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
          <ResizablePanel defaultSize={50} minSize={30}>
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <CardTitle className="text-lg">Dados do Cliente</CardTitle>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Nome</label>
                        <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome do cliente" data-testid="input-client-name" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">CPF</label>
                        <Input value={clientCpf} onChange={handleCpfChange} placeholder="000.000.000-00" data-testid="input-client-cpf" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Email</label>
                        <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="email@exemplo.com" data-testid="input-client-email" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Telefone</label>
                        <Input value={clientPhone} onChange={handlePhoneChange} placeholder="(00) 00000-0000" data-testid="input-client-phone" />
                      </div>
                    </div>
                    <Button
                      onClick={handleCreateContract}
                      disabled={createContractMutation.isPending}
                      className="w-full"
                      data-testid="button-create-contract"
                    >
                      {createContractMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando...</>
                      ) : (
                        <><Plus className="w-4 h-4 mr-2" /> Criar Contrato</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col relative">
              <ScrollArea className="flex-1">
                <div className="p-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        URL Gerada
                      </CardTitle>
                      <CardDescription>
                        Crie um contrato e a URL aparecerá aqui
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {generatedUrl ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Input value={generatedUrl} readOnly className="font-mono text-xs" data-testid="input-generated-url" />
                            <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(generatedUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }} data-testid="button-copy-url">
                              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">Envie esta URL para o cliente assinar o contrato.</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Preencha os dados do cliente e clique em "Criar Contrato" para gerar a URL de assinatura.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

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
