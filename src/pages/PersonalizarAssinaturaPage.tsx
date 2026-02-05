import { useState } from 'react';
import * as React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { SimplifiedSignatureWizard } from '@/components/assinatura/SimplifiedSignatureWizard';
import { SignaturePreview } from '@/components/assinatura/SignaturePreview';
import { AssinaturaNav } from '@/components/assinatura/AssinaturaNav';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Palette } from 'lucide-react';

interface ContractClause {
  title: string;
  content: string;
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

const PersonalizarAssinaturaPage = () => {
  const { toast } = useToast();

  const [clientName] = useState('João da Silva');
  const [clientCpf] = useState('123.456.789-00');
  const [clientEmail] = useState('cliente@email.com');
  const [clientPhone] = useState('');

  const [contractTitle, setContractTitle] = useState('Contrato de Prestação de Serviços');
  const [clauses, setClauses] = useState<ContractClause[]>(defaultClauses);
  
  const [logoUrl, setLogoUrl] = useState('');
  const [logoSize, setLogoSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [logoPosition, setLogoPosition] = useState<'center' | 'left' | 'right'>('center');
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

  const [selfieStepTitle, setSelfieStepTitle] = useState('Tire uma selfie');
  const [selfieStepDescription, setSelfieStepDescription] = useState('Posicione seu rosto na área indicada');
  const [documentStepTitle, setDocumentStepTitle] = useState('Fotografe seu documento');
  const [documentStepDescription, setDocumentStepDescription] = useState('CNH, RG ou outro documento com foto');
  const [analysisStepTitle, setAnalysisStepTitle] = useState('Verificação automática');
  const [analysisStepDescription, setAnalysisStepDescription] = useState('Comparamos sua foto com o documento');
  const [resultStepTitle, setResultStepTitle] = useState('Verificação concluída');
  const [resultStepDescription, setResultStepDescription] = useState('Sua identidade foi verificada com sucesso');
  const [selfieButtonText, setSelfieButtonText] = useState('Iniciar Verificação');
  const [selfieInstructionText, setSelfieInstructionText] = useState('Posicione seu rosto e aguarde a captura automática');
  
  const [stepLabelSelfie, setStepLabelSelfie] = useState('Selfie');
  const [stepLabelDocument, setStepLabelDocument] = useState('Documento');
  const [stepLabelAnalysis, setStepLabelAnalysis] = useState('Análise');
  const [stepLabelResult, setStepLabelResult] = useState('Resultado');
  const [progressIndicatorInactiveCircleColor, setProgressIndicatorInactiveCircleColor] = useState('#e5e5e5');
  const [progressIndicatorInactiveTextColor, setProgressIndicatorInactiveTextColor] = useState('#666666');
  
  const [selfieStepBackgroundColor, setSelfieStepBackgroundColor] = useState('#ffffff');
  const [selfieStepTextColor, setSelfieStepTextColor] = useState('#000000');
  const [documentStepBackgroundColor, setDocumentStepBackgroundColor] = useState('#ffffff');
  const [documentStepTextColor, setDocumentStepTextColor] = useState('#000000');
  const [analysisStepBackgroundColor, setAnalysisStepBackgroundColor] = useState('#ffffff');
  const [analysisStepTextColor, setAnalysisStepTextColor] = useState('#000000');
  const [resultStepBackgroundColor, setResultStepBackgroundColor] = useState('#ffffff');
  const [resultStepTextColor, setResultStepTextColor] = useState('#000000');

  const [selfieCaptureButtonText, setSelfieCaptureButtonText] = useState('Capturar Agora');
  const [selfieRetakeButtonText, setSelfieRetakeButtonText] = useState('Tirar Outra');
  const [selfieConfirmButtonText, setSelfieConfirmButtonText] = useState('Confirmar');
  const [detectionDefaultMessage, setDetectionDefaultMessage] = useState('Posicione seu rosto na área indicada');
  const [detectionCenterMessage, setDetectionCenterMessage] = useState('Centralize seu rosto');
  const [detectionLightingMessage, setDetectionLightingMessage] = useState('Melhore a iluminação');
  const [detectionQualityMessage, setDetectionQualityMessage] = useState('Aproxime seu rosto');
  const [detectionPerfectMessage, setDetectionPerfectMessage] = useState('Perfeito! Capturando...');

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
  const [progressActiveStepBg, setProgressActiveStepBg] = useState('rgba(255,255,255,0.2)');
  const [progressCompleteStepBg, setProgressCompleteStepBg] = useState('rgba(34,197,94,0.2)');
  const [progressInactiveStepBg, setProgressInactiveStepBg] = useState('rgba(255,255,255,0.05)');
  const [progressCheckIconColor, setProgressCheckIconColor] = useState('#22c55e');
  const [progressInactiveCircleBg, setProgressInactiveCircleBg] = useState('rgba(255,255,255,0.2)');

  const [contractPrimaryColor, setContractPrimaryColor] = useState('#2c3e50');
  const [contractTextColor, setContractTextColor] = useState('#333333');
  const [contractBackgroundColor, setContractBackgroundColor] = useState('#ffffff');
  const [contractFontFamily, setContractFontFamily] = useState('Arial, sans-serif');

  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [googlePlayUrl, setGooglePlayUrl] = useState('');

  const [verificationPreviewMode, setVerificationPreviewMode] = useState<string>('tela-inicial');

  const { data: globalConfig } = useQuery<any>({
    queryKey: ['/api/assinatura/global-config'],
  });
  
  const { data: appPromotionConfig } = useQuery<{
    app_store_url: string;
    google_play_url: string;
  }>({
    queryKey: ['/api/assinatura/app-promotion'],
  });

  React.useEffect(() => {
    if (globalConfig) {
      if (globalConfig.logo_url) setLogoUrl(globalConfig.logo_url);
      if (globalConfig.logo_size) setLogoSize(globalConfig.logo_size);
      if (globalConfig.logo_position) setLogoPosition(globalConfig.logo_position);
      if (globalConfig.company_name) setCompanyName(globalConfig.company_name);
      if (globalConfig.footer_text) setFooterText(globalConfig.footer_text);
      if (globalConfig.primary_color) setPrimaryColor(globalConfig.primary_color);
      if (globalConfig.text_color) setTextColor(globalConfig.text_color);
      if (globalConfig.font_family) setFontFamily(globalConfig.font_family);
      if (globalConfig.font_size) setFontSize(globalConfig.font_size);
      
      if (globalConfig.verification_primary_color) setVerificationPrimaryColor(globalConfig.verification_primary_color);
      if (globalConfig.verification_text_color) setVerificationTextColor(globalConfig.verification_text_color);
      if (globalConfig.verification_font_family) setVerificationFontFamily(globalConfig.verification_font_family);
      if (globalConfig.verification_font_size) setVerificationFontSize(globalConfig.verification_font_size);
      if (globalConfig.verification_logo_url) setVerificationLogoUrl(globalConfig.verification_logo_url);
      if (globalConfig.verification_logo_size) setVerificationLogoSize(globalConfig.verification_logo_size);
      if (globalConfig.verification_logo_position) setVerificationLogoPosition(globalConfig.verification_logo_position);
      if (globalConfig.verification_footer_text) setVerificationFooterText(globalConfig.verification_footer_text);
      if (globalConfig.verification_welcome_text) setVerificationWelcomeText(globalConfig.verification_welcome_text);
      if (globalConfig.verification_instructions) setVerificationInstructions(globalConfig.verification_instructions);
      if (globalConfig.verification_security_text) setVerificationSecurityText(globalConfig.verification_security_text);
      if (globalConfig.verification_background_color) setVerificationBackgroundColor(globalConfig.verification_background_color);
      if (globalConfig.verification_header_background_color) setVerificationHeaderBackgroundColor(globalConfig.verification_header_background_color);
      if (globalConfig.verification_header_company_name) setVerificationHeaderCompanyName(globalConfig.verification_header_company_name);
      
      if (globalConfig.selfie_step_background_color) setSelfieStepBackgroundColor(globalConfig.selfie_step_background_color);
      if (globalConfig.selfie_step_text_color) setSelfieStepTextColor(globalConfig.selfie_step_text_color);
      if (globalConfig.document_step_background_color) setDocumentStepBackgroundColor(globalConfig.document_step_background_color);
      if (globalConfig.document_step_text_color) setDocumentStepTextColor(globalConfig.document_step_text_color);
      if (globalConfig.analysis_step_background_color) setAnalysisStepBackgroundColor(globalConfig.analysis_step_background_color);
      if (globalConfig.analysis_step_text_color) setAnalysisStepTextColor(globalConfig.analysis_step_text_color);
      if (globalConfig.result_step_background_color) setResultStepBackgroundColor(globalConfig.result_step_background_color);
      if (globalConfig.result_step_text_color) setResultStepTextColor(globalConfig.result_step_text_color);
      
      if (globalConfig.progress_card_color) setProgressCardColor(globalConfig.progress_card_color);
      if (globalConfig.progress_button_color) setProgressButtonColor(globalConfig.progress_button_color);
      if (globalConfig.progress_text_color) setProgressTextColor(globalConfig.progress_text_color);
      if (globalConfig.progress_title) setProgressTitle(globalConfig.progress_title);
      if (globalConfig.progress_subtitle) setProgressSubtitle(globalConfig.progress_subtitle);
      if (globalConfig.progress_step1_title) setProgressStep1Title(globalConfig.progress_step1_title);
      if (globalConfig.progress_step1_description) setProgressStep1Description(globalConfig.progress_step1_description);
      if (globalConfig.progress_step2_title) setProgressStep2Title(globalConfig.progress_step2_title);
      if (globalConfig.progress_step2_description) setProgressStep2Description(globalConfig.progress_step2_description);
      if (globalConfig.progress_step3_title) setProgressStep3Title(globalConfig.progress_step3_title);
      if (globalConfig.progress_step3_description) setProgressStep3Description(globalConfig.progress_step3_description);
      if (globalConfig.progress_button_text) setProgressButtonText(globalConfig.progress_button_text);
      if (globalConfig.progress_font_family) setProgressFontFamily(globalConfig.progress_font_family);
      
      if (globalConfig.contract_primary_color) setContractPrimaryColor(globalConfig.contract_primary_color);
      if (globalConfig.contract_text_color) setContractTextColor(globalConfig.contract_text_color);
      if (globalConfig.contract_background_color) setContractBackgroundColor(globalConfig.contract_background_color);
      if (globalConfig.contract_font_family) setContractFontFamily(globalConfig.contract_font_family);
      
      if (globalConfig.app_store_url) setAppStoreUrl(globalConfig.app_store_url);
      if (globalConfig.google_play_url) setGooglePlayUrl(globalConfig.google_play_url);
    }
  }, [globalConfig]);

  React.useEffect(() => {
    if (appPromotionConfig) {
      if (appPromotionConfig.app_store_url) setAppStoreUrl(appPromotionConfig.app_store_url);
      if (appPromotionConfig.google_play_url) setGooglePlayUrl(appPromotionConfig.google_play_url);
    }
  }, [appPromotionConfig]);

  const saveConfigMutation = useMutation({
    mutationFn: async (configData: Record<string, unknown>) => {
      const response = await apiRequest('PUT', '/api/assinatura/global-config', configData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assinatura/global-config'] });
      toast({
        title: 'Configurações salvas',
        description: 'As personalizações foram salvas com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    }
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveConfig = () => {
    saveConfigMutation.mutate({
      logo_url: logoUrl,
      logo_size: logoSize,
      logo_position: logoPosition,
      primary_color: primaryColor,
      text_color: textColor,
      font_family: fontFamily,
      font_size: fontSize,
      company_name: companyName,
      footer_text: footerText,
      
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
      verification_security_text: verificationSecurityText,
      verification_background_color: verificationBackgroundColor,
      verification_header_background_color: verificationHeaderBackgroundColor,
      verification_header_company_name: verificationHeaderCompanyName,
      
      selfie_step_background_color: selfieStepBackgroundColor,
      selfie_step_text_color: selfieStepTextColor,
      document_step_background_color: documentStepBackgroundColor,
      document_step_text_color: documentStepTextColor,
      analysis_step_background_color: analysisStepBackgroundColor,
      analysis_step_text_color: analysisStepTextColor,
      result_step_background_color: resultStepBackgroundColor,
      result_step_text_color: resultStepTextColor,
      
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
      
      contract_primary_color: contractPrimaryColor,
      contract_text_color: contractTextColor,
      contract_background_color: contractBackgroundColor,
      contract_font_family: contractFontFamily,
      
      app_store_url: appStoreUrl,
      google_play_url: googlePlayUrl,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <AssinaturaNav />

      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Palette className="w-5 h-5" />
            Personalizar Assinatura
          </h1>
          <p className="text-sm text-muted-foreground">Configure a aparência dos contratos e etapas de assinatura</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-4">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
          <ResizablePanel defaultSize={50} minSize={30}>
            <ScrollArea className="h-full">
              <div className="p-4">
                <SimplifiedSignatureWizard
                  clientName={clientName}
                  clientCpf={clientCpf}
                  clientEmail={clientEmail}
                  clientPhone={clientPhone}
                  onClientNameChange={() => {}}
                  onClientCpfChange={() => {}}
                  onClientEmailChange={() => {}}
                  onClientPhoneChange={() => {}}
                  logoUrl={logoUrl}
                  logoSize={logoSize}
                  logoPosition={logoPosition}
                  primaryColor={primaryColor}
                  textColor={textColor}
                  fontFamily={fontFamily}
                  fontSize={fontSize}
                  companyName={companyName}
                  footerText={footerText}
                  onLogoUrlChange={setLogoUrl}
                  onLogoSizeChange={setLogoSize}
                  onLogoPositionChange={setLogoPosition}
                  onPrimaryColorChange={setPrimaryColor}
                  onTextColorChange={setTextColor}
                  onFontFamilyChange={setFontFamily}
                  onFontSizeChange={setFontSize}
                  onCompanyNameChange={setCompanyName}
                  onFooterTextChange={setFooterText}
                  onLogoUpload={handleLogoUpload}
                  verificationPreviewMode={verificationPreviewMode}
                  onVerificationPreviewModeChange={setVerificationPreviewMode}
                  verificationPrimaryColor={verificationPrimaryColor}
                  verificationTextColor={verificationTextColor}
                  verificationFontFamily={verificationFontFamily}
                  verificationFontSize={verificationFontSize}
                  verificationLogoUrl={verificationLogoUrl}
                  verificationLogoSize={verificationLogoSize}
                  verificationLogoPosition={verificationLogoPosition}
                  verificationFooterText={verificationFooterText}
                  verificationWelcomeText={verificationWelcomeText}
                  verificationInstructions={verificationInstructions}
                  verificationSecurityText={verificationSecurityText}
                  verificationBackgroundColor={verificationBackgroundColor}
                  verificationHeaderBackgroundColor={verificationHeaderBackgroundColor}
                  verificationHeaderCompanyName={verificationHeaderCompanyName}
                  onVerificationPrimaryColorChange={setVerificationPrimaryColor}
                  onVerificationTextColorChange={setVerificationTextColor}
                  onVerificationFontFamilyChange={setVerificationFontFamily}
                  onVerificationFontSizeChange={setVerificationFontSize}
                  onVerificationLogoUrlChange={setVerificationLogoUrl}
                  onVerificationLogoSizeChange={setVerificationLogoSize}
                  onVerificationLogoPositionChange={setVerificationLogoPosition}
                  onVerificationFooterTextChange={setVerificationFooterText}
                  onVerificationWelcomeTextChange={setVerificationWelcomeText}
                  onVerificationInstructionsChange={setVerificationInstructions}
                  onVerificationSecurityTextChange={setVerificationSecurityText}
                  onVerificationBackgroundColorChange={setVerificationBackgroundColor}
                  onVerificationHeaderBackgroundColorChange={setVerificationHeaderBackgroundColor}
                  onVerificationHeaderCompanyNameChange={setVerificationHeaderCompanyName}
                  selfieStepTitle={selfieStepTitle}
                  selfieStepDescription={selfieStepDescription}
                  documentStepTitle={documentStepTitle}
                  documentStepDescription={documentStepDescription}
                  analysisStepTitle={analysisStepTitle}
                  analysisStepDescription={analysisStepDescription}
                  resultStepTitle={resultStepTitle}
                  resultStepDescription={resultStepDescription}
                  selfieButtonText={selfieButtonText}
                  selfieInstructionText={selfieInstructionText}
                  stepLabelSelfie={stepLabelSelfie}
                  stepLabelDocument={stepLabelDocument}
                  stepLabelAnalysis={stepLabelAnalysis}
                  stepLabelResult={stepLabelResult}
                  progressIndicatorInactiveCircleColor={progressIndicatorInactiveCircleColor}
                  progressIndicatorInactiveTextColor={progressIndicatorInactiveTextColor}
                  selfieCaptureButtonText={selfieCaptureButtonText}
                  selfieRetakeButtonText={selfieRetakeButtonText}
                  selfieConfirmButtonText={selfieConfirmButtonText}
                  onStepLabelSelfieChange={setStepLabelSelfie}
                  onStepLabelDocumentChange={setStepLabelDocument}
                  onStepLabelAnalysisChange={setStepLabelAnalysis}
                  onStepLabelResultChange={setStepLabelResult}
                  onProgressIndicatorInactiveCircleColorChange={setProgressIndicatorInactiveCircleColor}
                  onProgressIndicatorInactiveTextColorChange={setProgressIndicatorInactiveTextColor}
                  onSelfieCaptureButtonTextChange={setSelfieCaptureButtonText}
                  onSelfieRetakeButtonTextChange={setSelfieRetakeButtonText}
                  onSelfieConfirmButtonTextChange={setSelfieConfirmButtonText}
                  detectionDefaultMessage={detectionDefaultMessage}
                  detectionCenterMessage={detectionCenterMessage}
                  detectionLightingMessage={detectionLightingMessage}
                  detectionQualityMessage={detectionQualityMessage}
                  detectionPerfectMessage={detectionPerfectMessage}
                  onDetectionDefaultMessageChange={setDetectionDefaultMessage}
                  onDetectionCenterMessageChange={setDetectionCenterMessage}
                  onDetectionLightingMessageChange={setDetectionLightingMessage}
                  onDetectionQualityMessageChange={setDetectionQualityMessage}
                  onDetectionPerfectMessageChange={setDetectionPerfectMessage}
                  onSelfieStepTitleChange={setSelfieStepTitle}
                  onSelfieStepDescriptionChange={setSelfieStepDescription}
                  selfieStepBackgroundColor={selfieStepBackgroundColor}
                  onSelfieStepBackgroundColorChange={setSelfieStepBackgroundColor}
                  selfieStepTextColor={selfieStepTextColor}
                  onSelfieStepTextColorChange={setSelfieStepTextColor}
                  onDocumentStepTitleChange={setDocumentStepTitle}
                  onDocumentStepDescriptionChange={setDocumentStepDescription}
                  documentStepBackgroundColor={documentStepBackgroundColor}
                  onDocumentStepBackgroundColorChange={setDocumentStepBackgroundColor}
                  documentStepTextColor={documentStepTextColor}
                  onDocumentStepTextColorChange={setDocumentStepTextColor}
                  onAnalysisStepTitleChange={setAnalysisStepTitle}
                  onAnalysisStepDescriptionChange={setAnalysisStepDescription}
                  analysisStepBackgroundColor={analysisStepBackgroundColor}
                  onAnalysisStepBackgroundColorChange={setAnalysisStepBackgroundColor}
                  analysisStepTextColor={analysisStepTextColor}
                  onAnalysisStepTextColorChange={setAnalysisStepTextColor}
                  onResultStepTitleChange={setResultStepTitle}
                  onResultStepDescriptionChange={setResultStepDescription}
                  resultStepBackgroundColor={resultStepBackgroundColor}
                  onResultStepBackgroundColorChange={setResultStepBackgroundColor}
                  resultStepTextColor={resultStepTextColor}
                  onResultStepTextColorChange={setResultStepTextColor}
                  onDocumentStepTitleChange={setDocumentStepTitle}
                  onDocumentStepDescriptionChange={setDocumentStepDescription}
                  onAnalysisStepTitleChange={setAnalysisStepTitle}
                  onAnalysisStepDescriptionChange={setAnalysisStepDescription}
                  onResultStepTitleChange={setResultStepTitle}
                  onResultStepDescriptionChange={setResultStepDescription}
                  onSelfieButtonTextChange={setSelfieButtonText}
                  onSelfieInstructionTextChange={setSelfieInstructionText}
                  progressCardColor={progressCardColor}
                  progressButtonColor={progressButtonColor}
                  progressTextColor={progressTextColor}
                  progressTitle={progressTitle}
                  progressSubtitle={progressSubtitle}
                  progressStep1Title={progressStep1Title}
                  progressStep1Description={progressStep1Description}
                  progressStep2Title={progressStep2Title}
                  progressStep2Description={progressStep2Description}
                  progressStep3Title={progressStep3Title}
                  progressStep3Description={progressStep3Description}
                  progressButtonText={progressButtonText}
                  progressFontFamily={progressFontFamily}
                  progressActiveStepBg={progressActiveStepBg}
                  progressCompleteStepBg={progressCompleteStepBg}
                  progressInactiveStepBg={progressInactiveStepBg}
                  progressCheckIconColor={progressCheckIconColor}
                  progressInactiveCircleBg={progressInactiveCircleBg}
                  onProgressCardColorChange={setProgressCardColor}
                  onProgressButtonColorChange={setProgressButtonColor}
                  onProgressTextColorChange={setProgressTextColor}
                  onProgressTitleChange={setProgressTitle}
                  onProgressSubtitleChange={setProgressSubtitle}
                  onProgressStep1TitleChange={setProgressStep1Title}
                  onProgressStep1DescriptionChange={setProgressStep1Description}
                  onProgressStep2TitleChange={setProgressStep2Title}
                  onProgressStep2DescriptionChange={setProgressStep2Description}
                  onProgressStep3TitleChange={setProgressStep3Title}
                  onProgressStep3DescriptionChange={setProgressStep3Description}
                  onProgressButtonTextChange={setProgressButtonText}
                  onProgressFontFamilyChange={setProgressFontFamily}
                  onProgressActiveStepBgChange={setProgressActiveStepBg}
                  onProgressCompleteStepBgChange={setProgressCompleteStepBg}
                  onProgressInactiveStepBgChange={setProgressInactiveStepBg}
                  onProgressCheckIconColorChange={setProgressCheckIconColor}
                  onProgressInactiveCircleBgChange={setProgressInactiveCircleBg}
                  parabensTitle={parabensTitle}
                  parabensSubtitle={parabensSubtitle}
                  parabensDescription={parabensDescription}
                  parabensCardColor={parabensCardColor}
                  parabensBackgroundColor={parabensBackgroundColor}
                  parabensButtonColor={parabensButtonColor}
                  parabensTextColor={parabensTextColor}
                  parabensFontFamily={parabensFontFamily}
                  parabensFormTitle={parabensFormTitle}
                  parabensButtonText={parabensButtonText}
                  onParabensTitleChange={setParabensTitle}
                  onParabensSubtitleChange={setParabensSubtitle}
                  onParabensDescriptionChange={setParabensDescription}
                  onParabensCardColorChange={setParabensCardColor}
                  onParabensBackgroundColorChange={setParabensBackgroundColor}
                  onParabensButtonColorChange={setParabensButtonColor}
                  onParabensTextColorChange={setParabensTextColor}
                  onParabensFontFamilyChange={setParabensFontFamily}
                  onParabensFormTitleChange={setParabensFormTitle}
                  onParabensButtonTextChange={setParabensButtonText}
                  contractTitle={contractTitle}
                  clauses={clauses}
                  onContractTitleChange={setContractTitle}
                  onClausesChange={setClauses}
                  contractPrimaryColor={contractPrimaryColor}
                  contractTextColor={contractTextColor}
                  contractBackgroundColor={contractBackgroundColor}
                  contractFontFamily={contractFontFamily}
                  onContractPrimaryColorChange={setContractPrimaryColor}
                  onContractTextColorChange={setContractTextColor}
                  onContractBackgroundColorChange={setContractBackgroundColor}
                  onContractFontFamilyChange={setContractFontFamily}
                  appStoreUrl={appStoreUrl}
                  googlePlayUrl={googlePlayUrl}
                  onAppStoreUrlChange={setAppStoreUrl}
                  onGooglePlayUrlChange={setGooglePlayUrl}
                  onCreateContract={handleSaveConfig}
                  isSaving={saveConfigMutation.isPending}
                  onVerificationSubTabChange={setVerificationPreviewMode}
                />
              </div>
            </ScrollArea>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col relative">
              <ScrollArea className="flex-1">
                <div className="p-4">
                  <div className="sticky top-0 z-30 mb-4 pointer-events-none">
                    <Card className="shadow-lg border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pointer-events-auto">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Preview em Tempo Real
                        </CardTitle>
                        <CardDescription>
                          Visualização do contrato e etapas de assinatura
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </div>
                  <Card>
                    <CardContent className="pt-6">
                      <SignaturePreview
                        clientName={clientName}
                        clientCpf={clientCpf}
                        clientEmail={clientEmail}
                        clientPhone={clientPhone}
                        primaryColor={primaryColor}
                        textColor={textColor}
                        fontFamily={fontFamily}
                        fontSize={fontSize}
                        logoUrl={logoUrl}
                        logoSize={logoSize}
                        logoPosition={logoPosition}
                        companyName={companyName}
                        footerText={footerText}
                        verificationPrimaryColor={verificationPrimaryColor}
                        verificationTextColor={verificationTextColor}
                        verificationFontFamily={verificationFontFamily}
                        verificationFontSize={verificationFontSize}
                        verificationLogoUrl={verificationLogoUrl}
                        verificationLogoSize={verificationLogoSize}
                        verificationLogoPosition={verificationLogoPosition}
                        verificationFooterText={verificationFooterText}
                        welcomeText={verificationWelcomeText}
                        instructions={verificationInstructions}
                        securityText={verificationSecurityText}
                        backgroundColor={verificationBackgroundColor}
                        headerBackgroundColor={verificationHeaderBackgroundColor}
                        selfieStepTitle={selfieStepTitle}
                        selfieStepDescription={selfieStepDescription}
                        selfieStepBackgroundColor={selfieStepBackgroundColor}
                        selfieStepTextColor={selfieStepTextColor}
                        documentStepTitle={documentStepTitle}
                        documentStepDescription={documentStepDescription}
                        documentStepBackgroundColor={documentStepBackgroundColor}
                        documentStepTextColor={documentStepTextColor}
                        analysisStepTitle={analysisStepTitle}
                        analysisStepDescription={analysisStepDescription}
                        analysisStepBackgroundColor={analysisStepBackgroundColor}
                        analysisStepTextColor={analysisStepTextColor}
                        resultStepTitle={resultStepTitle}
                        resultStepDescription={resultStepDescription}
                        resultStepBackgroundColor={resultStepBackgroundColor}
                        resultStepTextColor={resultStepTextColor}
                        selfieButtonText={selfieButtonText}
                        selfieInstructionText={selfieInstructionText}
                        selfieStepBackgroundColor={selfieStepBackgroundColor}
                        selfieStepTextColor={selfieStepTextColor}
                        documentStepBackgroundColor={documentStepBackgroundColor}
                        documentStepTextColor={documentStepTextColor}
                        analysisStepBackgroundColor={analysisStepBackgroundColor}
                        analysisStepTextColor={analysisStepTextColor}
                        resultStepBackgroundColor={resultStepBackgroundColor}
                        resultStepTextColor={resultStepTextColor}
                        contractTitle={contractTitle}
                        clauses={clauses}
                        contractPrimaryColor={contractPrimaryColor}
                        contractTextColor={contractTextColor}
                        contractBackgroundColor={contractBackgroundColor}
                        contractFontFamily={contractFontFamily}
                        parabensTitle={parabensTitle}
                        parabensSubtitle={parabensSubtitle}
                        parabensDescription={parabensDescription}
                        parabensCardColor={parabensCardColor}
                        parabensBackgroundColor={parabensBackgroundColor}
                        parabensButtonColor={parabensButtonColor}
                        parabensTextColor={parabensTextColor}
                        parabensFontFamily={parabensFontFamily}
                        parabensButtonText={parabensButtonText}
                        progressCardColor={progressCardColor}
                        progressButtonColor={progressButtonColor}
                        progressTextColor={progressTextColor}
                        progressTitle={progressTitle}
                        progressSubtitle={progressSubtitle}
                        progressActiveStepBg={progressActiveStepBg}
                        progressCompleteStepBg={progressCompleteStepBg}
                        progressInactiveStepBg={progressInactiveStepBg}
                        progressCheckIconColor={progressCheckIconColor}
                        progressInactiveCircleBg={progressInactiveCircleBg}
                        stepLabelSelfie={stepLabelSelfie}
                        stepLabelDocument={stepLabelDocument}
                        stepLabelAnalysis={stepLabelAnalysis}
                        stepLabelResult={stepLabelResult}
                        progressIndicatorInactiveCircleColor={progressIndicatorInactiveCircleColor}
                        progressIndicatorInactiveTextColor={progressIndicatorInactiveTextColor}
                        selfieCaptureButtonText={selfieCaptureButtonText}
                        selfieRetakeButtonText={selfieRetakeButtonText}
                        selfieConfirmButtonText={selfieConfirmButtonText}
                        detectionDefaultMessage={detectionDefaultMessage}
                        detectionCenterMessage={detectionCenterMessage}
                        detectionLightingMessage={detectionLightingMessage}
                        detectionQualityMessage={detectionQualityMessage}
                        detectionPerfectMessage={detectionPerfectMessage}
                        verificationPreviewMode={verificationPreviewMode as any}
                      />
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default PersonalizarAssinaturaPage;
