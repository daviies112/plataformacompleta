import { useState, useRef } from 'react';
import { ArrowLeft, FileText, PenTool, AlertCircle, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useContract } from '@/contexts/ContractContext';
import { useToast } from '@/hooks/use-toast';
import { generateProtocolNumber, formatDate, maskCPF, maskPhone } from '@/lib/validators';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { brandConfig, contractConfig } from '@/config/branding';

interface ClientData {
  id: string;
  client_name: string;
  client_cpf: string;
  client_email: string;
  client_phone: string | null;
  contract_html: string;
  protocol_number: string | null;
  logo_url?: string | null;
  logo_size?: string;
  logo_position?: string;
  primary_color?: string | null;
  text_color?: string | null;
  font_family?: string | null;
  font_size?: string | null;
  company_name?: string | null;
  footer_text?: string | null;
}

interface ContractStepProps {
  clientData?: ClientData;
  selfiePhoto?: string | null;
  documentPhoto?: string | null;
  currentStep?: number;
  button_color?: string;
  button_text_color?: string;
  icon_color?: string;
  title_color?: string;
  text_color?: string;
  background_color?: string;
}

export const ContractStep = ({ clientData, selfiePhoto, documentPhoto, currentStep = 2, button_color, button_text_color, icon_color, title_color, text_color, background_color }: ContractStepProps) => {
  const { contractData, setContractData, setCurrentStep } = useContract();
  const { toast } = useToast();
  const [hasScrolled, setHasScrolled] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const resolvedButtonColor = button_color || clientData?.primary_color || undefined;
  const resolvedButtonTextColor = button_text_color || '#ffffff';
  const resolvedIconColor = icon_color || clientData?.primary_color || undefined;
  const resolvedTitleColor = title_color || clientData?.text_color || undefined;
  const resolvedTextColor = text_color || clientData?.text_color || undefined;

  if (!clientData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="contract-loading-container">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-muted-foreground" data-testid="status-contract-loading" />
          <p className="mt-4 text-muted-foreground" data-testid="text-contract-loading">Carregando dados do contrato...</p>
        </div>
      </div>
    );
  }

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        setHasScrolled(true);
      }
    }
  };

  const getLogoPositionStyle = (position?: string): string => {
    switch (position) {
      case 'left': return 'text-align: left;';
      case 'right': return 'text-align: right;';
      default: return 'text-align: center;';
    }
  };

  const getLogoSizeStyle = (size?: string): string => {
    switch (size) {
      case 'small': return 'max-width: 100px;';
      case 'large': return 'max-width: 300px;';
      default: return 'max-width: 200px;';
    }
  };

  const generateContractHTML = (signedAt?: Date) => {
    const now = signedAt || new Date();
    const protocol = clientData?.protocol_number || contractData?.protocol_number || generateProtocolNumber();
    
    const primaryColor = clientData?.primary_color || '#1351B4';
    const textColor = clientData?.text_color || '#333333';
    const fontFamily = clientData?.font_family || 'Arial, sans-serif';
    const fontSize = clientData?.font_size || '16px';
    const logoUrl = clientData?.logo_url;
    const logoSize = clientData?.logo_size || 'medium';
    const logoPosition = clientData?.logo_position || 'center';
    const companyName = clientData?.company_name || 'Sua Empresa';
    const footerText = clientData?.footer_text;
    
    const clausesHTML = contractConfig.clauses.map(clause => `
      <h3 style="font-weight: bold !important; margin-top: 25px !important; margin-bottom: 10px !important; color: ${textColor} !important; font-family: ${fontFamily} !important;">${clause.title}</h3>
      <p style="text-align: justify !important; line-height: 1.6 !important; font-family: ${fontFamily} !important; font-size: ${fontSize} !important; color: ${textColor} !important;">${clause.content}</p>
    `).join('');

    const userName = clientData?.client_name || 'N/A';
    const userCpf = clientData ? maskCPF(clientData.client_cpf) : 'N/A';
    const userEmail = clientData?.client_email || 'N/A';
    const userPhone = clientData?.client_phone ? maskPhone(clientData.client_phone) : '';

    const signatureSection = `
      <div style="margin-top: 50px !important; padding-top: 30px !important; border-top: 2px solid ${primaryColor} !important;">
        <h2 style="color: ${textColor} !important; font-weight: bold !important; margin-bottom: 20px !important; font-family: ${fontFamily} !important;">${contractConfig.signature.title}</h2>
        <p style="margin-bottom: 8px !important; font-family: ${fontFamily} !important; font-size: ${fontSize} !important; color: ${textColor} !important;">${contractConfig.signature.signedText} <strong>${formatDate(now)}</strong></p>
        <p style="margin-bottom: 8px !important; font-family: ${fontFamily} !important; font-size: ${fontSize} !important; color: ${textColor} !important;"><strong>${contractConfig.signature.authMethod}</strong> Reconhecimento Facial</p>
        <p style="margin-bottom: 30px !important; font-family: ${fontFamily} !important; font-size: ${fontSize} !important; color: ${textColor} !important;"><strong>${contractConfig.signature.securityLevel}</strong> Verificado com Segurança</p>
        
        <div style="margin-top: 30px !important; padding: 30px !important; border: 2px solid ${primaryColor} !important; text-align: center !important; max-width: 400px !important; margin-left: auto !important; margin-right: auto !important; background-color: #fafafa !important;">
          <p style="font-family: 'Brush Script MT', 'Segoe Script', 'Bradley Hand', cursive !important; font-size: 32px !important; color: ${primaryColor} !important; margin: 0 0 10px 0 !important; line-height: 1.2 !important;">${userName}</p>
          <div style="border-bottom: 2px solid ${primaryColor} !important; width: 250px !important; margin: 0 auto 15px auto !important;"></div>
          <p style="margin: 0 !important; font-weight: bold !important; font-size: 14px !important; font-family: ${fontFamily} !important; color: ${textColor} !important;">${userName}</p>
          <p style="margin: 5px 0 !important; color: ${textColor} !important; font-size: 13px !important; font-family: ${fontFamily} !important;">CPF: ${userCpf}</p>
        </div>
      </div>
    `;

    return {
      html: `
        <div style="font-family: ${fontFamily} !important; padding: 40px !important; max-width: 800px !important; margin: 0 auto !important; color: ${textColor} !important;">
          <header style="text-align: center !important; margin-bottom: 40px !important; border-bottom: 3px solid ${primaryColor} !important; padding-bottom: 20px !important;">
            <h1 style="color: ${primaryColor} !important; margin: 0 !important; font-family: ${fontFamily} !important; font-size: 28px !important;">${contractConfig.title}</h1>
            <p style="color: ${textColor} !important; margin-top: 10px !important; font-family: ${fontFamily} !important;">Protocolo: <strong>${protocol}</strong></p>
          </header>
          
          <section style="margin-bottom: 30px !important;">
            <h2 style="color: ${textColor} !important; border-bottom: 2px solid ${primaryColor} !important; padding-bottom: 10px !important; font-family: ${fontFamily} !important;">${contractConfig.contractorSection}</h2>
            <p style="font-family: ${fontFamily} !important; font-size: ${fontSize} !important; color: ${textColor} !important;"><strong>Nome:</strong> ${userName}</p>
            <p style="font-family: ${fontFamily} !important; font-size: ${fontSize} !important; color: ${textColor} !important;"><strong>CPF:</strong> ${userCpf}</p>
            <p style="font-family: ${fontFamily} !important; font-size: ${fontSize} !important; color: ${textColor} !important;"><strong>Email:</strong> ${userEmail}</p>
            ${userPhone ? `<p style="font-family: ${fontFamily} !important; font-size: ${fontSize} !important; color: ${textColor} !important;"><strong>Telefone:</strong> ${userPhone}</p>` : ''}
          </section>
          
          <section style="margin-bottom: 30px !important;">
            <h2 style="color: ${textColor} !important; border-bottom: 2px solid ${primaryColor} !important; padding-bottom: 10px !important; font-family: ${fontFamily} !important;">${contractConfig.clausesSection}</h2>
            ${clausesHTML}
          </section>
          
          ${signatureSection}
          
          ${footerText ? `<footer style="margin-top: 50px !important; padding-top: 20px !important; border-top: 1px solid #ddd !important; text-align: center !important; color: ${textColor} !important; font-family: ${fontFamily} !important; font-size: 12px !important; opacity: 0.8 !important;">${footerText}</footer>` : ''}
        </div>
      `,
      protocol,
    };
  };

  const handleSign = async () => {
    if (!hasScrolled || !agreed) {
      toast({
        title: contractConfig.toastScrollTitle,
        description: contractConfig.toastScrollDescription,
        variant: 'destructive',
      });
      return;
    }

    if (!clientData) {
      toast({
        title: 'Erro',
        description: 'Dados do contrato nao encontrados.',
        variant: 'destructive',
      });
      return;
    }

    setIsSigning(true);
    
    try {
      const { html, protocol } = generateContractHTML();
      const now = new Date().toISOString();
      
      await apiRequest('POST', `/api/assinatura/public/contracts/${clientData.id}/finalize`, {
        selfie_photo: selfiePhoto,
        document_photo: documentPhoto,
        signed_contract_html: html,
        status: 'signed',
      });

      setContractData({
        id: clientData.id,
        protocol_number: protocol,
        signed_at: now,
        contract_html: html,
      });

      toast({
        title: contractConfig.toastSuccessTitle,
        description: contractConfig.toastSuccessDescription,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/assinatura/contracts'] });

      setCurrentStep(3);
    } catch (error: any) {
      console.error('Error signing contract:', error);
      toast({
        title: contractConfig.toastErrorTitle,
        description: contractConfig.toastErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setIsSigning(false);
    }
  };

  const { html, protocol } = generateContractHTML();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      {clientData?.logo_url && (
        <div style={{ textAlign: (clientData?.logo_position || 'center') as any, marginBottom: '24px' }}>
          <img 
            src={clientData.logo_url} 
            alt="Logo" 
            style={{
              maxWidth: clientData?.logo_size === 'small' ? '100px' : clientData?.logo_size === 'large' ? '300px' : '200px',
              height: 'auto'
            }} 
          />
        </div>
      )}
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={resolvedTitleColor ? { color: resolvedTitleColor } : undefined} data-testid="text-contract-title">
          {contractConfig.pageTitle}
        </h2>
        <p style={resolvedTextColor ? { color: resolvedTextColor } : undefined} className={resolvedTextColor ? undefined : 'text-muted-foreground'}>
          Protocolo: <span className="font-mono font-semibold" style={resolvedButtonColor ? { color: resolvedButtonColor } : undefined} data-testid="text-protocol">{protocol}</span>
        </p>
      </div>

      <div className="glass-card mb-6">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <FileText className="w-5 h-5" style={resolvedIconColor ? { color: resolvedIconColor } : undefined} />
          <span className="font-medium" style={resolvedTextColor ? { color: resolvedTextColor } : undefined}>{contractConfig.title}</span>
        </div>
        
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-96 overflow-y-auto p-4"
          style={{ backgroundColor: background_color || '#ffffff' }}
          dangerouslySetInnerHTML={{ __html: html }}
          data-testid="contract-viewer"
        />
        
        {!hasScrolled && (
          <div className={resolvedButtonColor ? "flex items-center gap-2 px-4 py-3 border-t" : "flex items-center gap-2 px-4 py-3 bg-warning/10 border-t border-warning/20"} style={resolvedButtonColor ? { backgroundColor: `${resolvedButtonColor}1A`, borderColor: `${resolvedButtonColor}33` } : undefined}>
            <AlertCircle className="w-4 h-4" style={resolvedButtonColor ? { color: resolvedButtonColor } : undefined} />
            <span className="text-sm" style={resolvedButtonColor ? { color: resolvedButtonColor } : undefined}>{contractConfig.scrollWarning}</span>
          </div>
        )}
      </div>

      <div className="glass-card p-4 mb-6">
        <div className="flex items-start gap-3">
          <Checkbox
            id="agreement"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked as boolean)}
            disabled={!hasScrolled}
            className="mt-0.5"
            data-testid="checkbox-agreement"
          />
          <label
            htmlFor="agreement"
            className={`text-sm ${hasScrolled ? 'cursor-pointer' : ''}`}
            style={resolvedTextColor ? { color: resolvedTextColor, opacity: hasScrolled ? 1 : 0.6 } : undefined}
          >
            {contractConfig.agreementText}
          </label>
        </div>
      </div>

      <div className="flex justify-between gap-2 flex-wrap">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(1)}
          className="gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        
        <Button
          onClick={handleSign}
          disabled={!hasScrolled || !agreed || isSigning}
          className="gap-2 h-12 px-6"
          style={resolvedButtonColor ? { backgroundColor: resolvedButtonColor, color: resolvedButtonTextColor } : undefined}
          data-testid="button-sign"
        >
          {isSigning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" style={resolvedButtonColor && !resolvedButtonTextColor ? { color: resolvedButtonColor } : undefined} />
              {contractConfig.signButtonLoading}
            </>
          ) : (
            <>
              <PenTool className="w-4 h-4" />
              {contractConfig.signButton}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
