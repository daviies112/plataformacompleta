import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ContractProvider, useContract } from '@/contexts/ContractContext';
import { VerificationFlow } from '@/components/assinatura/verification/VerificationFlow';
import { 
  Camera, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Shield,
  Check,
  ArrowRight,
  Gift
} from 'lucide-react';

interface ContractData {
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
  contract_html?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  text_color?: string | null;
  font_family?: string | null;
  company_name?: string | null;
  verification_primary_color?: string | null;
  verification_text_color?: string | null;
  verification_welcome_text?: string | null;
  verification_instructions?: string | null;
  verification_footer_text?: string | null;
  verification_security_text?: string | null;
  verification_header_company_name?: string | null;
  verification_header_background_color?: string | null;
  progress_title?: string | null;
  progress_subtitle?: string | null;
  progress_step1_title?: string | null;
  progress_step1_description?: string | null;
  progress_step2_title?: string | null;
  progress_step2_description?: string | null;
  progress_step3_title?: string | null;
  progress_step3_description?: string | null;
  progress_card_color?: string | null;
  progress_button_color?: string | null;
  progress_text_color?: string | null;
  parabens_title?: string | null;
  parabens_subtitle?: string | null;
  parabens_description?: string | null;
  parabens_button_text?: string | null;
  parabens_button_color?: string | null;
  parabens_card_color?: string | null;
}

type Step = 'loading' | 'progress' | 'verification' | 'contract' | 'success' | 'error' | 'already_signed';

const AssinaturaClientContent = () => {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>('loading');
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [contractAccepted, setContractAccepted] = useState(false);
  const [addressData, setAddressData] = useState({
    street: '',
    number: '',
    complement: '',
    city: '',
    state: '',
    zipcode: ''
  });

  const { data: contract, isLoading, error } = useQuery<ContractData>({
    queryKey: ['/api/assinatura/contracts', token],
    enabled: !!token,
  });

  useEffect(() => {
    if (isLoading) {
      setCurrentStep('loading');
    } else if (error) {
      setCurrentStep('error');
    } else if (contract) {
      if (contract.status === 'signed') {
        setCurrentStep('already_signed');
      } else {
        setCurrentStep('progress');
      }
    }
  }, [isLoading, error, contract]);

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/assinatura/contracts/${contract?.id}/finalize`, {
        address: addressData
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assinatura/contracts', token] });
      setCurrentStep('success');
      toast({
        title: 'Contrato assinado!',
        description: 'Sua assinatura foi registrada com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível finalizar a assinatura. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const handleVerificationComplete = (success: boolean) => {
    if (success) {
      setVerificationComplete(true);
      setCurrentStep('contract');
    } else {
      toast({
        title: 'Verificação falhou',
        description: 'Por favor, tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleSignContract = () => {
    if (!contractAccepted) {
      toast({
        title: 'Aceite o contrato',
        description: 'Você precisa aceitar os termos do contrato para continuar.',
        variant: 'destructive',
      });
      return;
    }
    finalizeMutation.mutate();
  };

  const primaryColor = contract?.primary_color || '#2c3e50';
  const textColor = contract?.text_color || '#333333';
  const progressCardColor = contract?.progress_card_color || '#dbeafe';
  const progressButtonColor = contract?.progress_button_color || '#22c55e';
  const progressTextColor = contract?.progress_text_color || '#1e40af';
  const parabensButtonColor = contract?.parabens_button_color || '#22c55e';
  const parabensCardColor = contract?.parabens_card_color || '#dbeafe';

  if (currentStep === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Carregando contrato...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <h2 className="mt-4 text-xl font-semibold">Contrato não encontrado</h2>
            <p className="mt-2 text-muted-foreground">
              O link que você acessou é inválido ou expirou.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 'already_signed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-600" />
            <h2 className="mt-4 text-xl font-semibold">Contrato já assinado</h2>
            <p className="mt-2 text-muted-foreground">
              Este contrato já foi assinado anteriormente.
            </p>
            {contract?.signed_at && (
              <p className="mt-2 text-sm text-muted-foreground">
                Assinado em: {new Date(contract.signed_at).toLocaleString('pt-BR')}
              </p>
            )}
            {contract?.protocol_number && (
              <p className="mt-2 text-sm font-mono bg-muted p-2 rounded">
                Protocolo: {contract.protocol_number}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 'progress') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          {contract?.logo_url && (
            <div className="text-center mb-6">
              <img 
                src={contract.logo_url} 
                alt="Logo" 
                className="max-h-20 mx-auto"
              />
            </div>
          )}

          <Card style={{ backgroundColor: progressCardColor }}>
            <CardHeader>
              <CardTitle style={{ color: progressTextColor }}>
                {contract?.progress_title || 'Assinatura Digital'}
              </CardTitle>
              <p className="text-sm" style={{ color: progressTextColor }}>
                {contract?.progress_subtitle || 'Conclua os passos abaixo para finalizar o processo.'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className="p-4 rounded-lg border flex items-center gap-4"
                style={{ backgroundColor: 'white' }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: progressButtonColor, color: 'white' }}
                >
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium" style={{ color: progressTextColor }}>
                    {contract?.progress_step1_title || '1. Reconhecimento Facial'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {contract?.progress_step1_description || 'Tire uma selfie para validar sua identidade'}
                  </p>
                </div>
                {verificationComplete && <Check className="ml-auto text-green-600 w-6 h-6" />}
              </div>

              <div 
                className="p-4 rounded-lg border flex items-center gap-4"
                style={{ backgroundColor: 'white' }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: verificationComplete ? progressButtonColor : '#9ca3af', color: 'white' }}
                >
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium" style={{ color: progressTextColor }}>
                    {contract?.progress_step2_title || '2. Assinar Contrato'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {contract?.progress_step2_description || 'Assine digitalmente o contrato'}
                  </p>
                </div>
              </div>

              <div 
                className="p-4 rounded-lg border flex items-center gap-4"
                style={{ backgroundColor: 'white' }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#9ca3af', color: 'white' }}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium" style={{ color: progressTextColor }}>
                    {contract?.progress_step3_title || '3. Confirmação'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {contract?.progress_step3_description || 'Confirme seus dados e finalize'}
                  </p>
                </div>
              </div>

              <Button
                className="w-full mt-4"
                style={{ backgroundColor: progressButtonColor }}
                onClick={() => setCurrentStep('verification')}
                data-testid="button-start-verification"
              >
                Iniciar Verificação
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentStep === 'verification') {
    return (
      <div className="min-h-screen bg-background">
        <VerificationFlow 
          onComplete={handleVerificationComplete}
          primaryColor={contract?.verification_primary_color || primaryColor}
          textColor={contract?.verification_text_color || textColor}
          welcomeText={contract?.verification_welcome_text || 'Verificação de Identidade'}
          instructions={contract?.verification_instructions || 'Processo seguro e rápido para confirmar sua identidade.'}
          footerText={contract?.verification_footer_text || 'Verificação Segura'}
          securityText={contract?.verification_security_text || 'Suas informações são processadas de forma segura.'}
          companyName={contract?.verification_header_company_name || contract?.company_name || ''}
          headerBackgroundColor={contract?.verification_header_background_color || primaryColor}
          logoUrl={contract?.logo_url || undefined}
        />
      </div>
    );
  }

  if (currentStep === 'contract') {
    const processedHTML = contract?.contract_html
      ?.replace('{{CLIENT_NAME}}', contract.client_name || '')
      ?.replace('{{CLIENT_CPF}}', contract.client_cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '')
      ?.replace('{{CLIENT_EMAIL}}', contract.client_email || '')
      ?.replace('{{CLIENT_PHONE}}', contract.client_phone || 'Não informado');

    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {contract?.logo_url && (
            <div className="text-center mb-6">
              <img 
                src={contract.logo_url} 
                alt="Logo" 
                className="max-h-20 mx-auto"
              />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Contrato para Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="prose max-w-none border rounded-lg p-6 bg-white"
                dangerouslySetInnerHTML={{ __html: processedHTML || '' }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="accept"
                  checked={contractAccepted}
                  onCheckedChange={(checked) => setContractAccepted(!!checked)}
                  data-testid="checkbox-accept-contract"
                />
                <Label htmlFor="accept" className="text-sm leading-relaxed">
                  Li e aceito todos os termos e condições do contrato acima. Declaro que as informações fornecidas são verdadeiras e que concordo com a assinatura digital deste documento.
                </Label>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Assinatura protegida por verificação facial e criptografia</span>
              </div>

              <Button
                className="w-full"
                style={{ backgroundColor: progressButtonColor }}
                onClick={handleSignContract}
                disabled={!contractAccepted || finalizeMutation.isPending}
                data-testid="button-sign-contract"
              >
                {finalizeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Assinar Contrato
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentStep === 'success') {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md" style={{ backgroundColor: parabensCardColor }}>
          <CardContent className="pt-6 text-center space-y-4">
            <div 
              className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
              style={{ backgroundColor: parabensButtonColor }}
            >
              <Gift className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: progressTextColor }}>
              {contract?.parabens_title || 'Parabéns!'}
            </h1>
            <h2 className="text-lg font-medium" style={{ color: progressTextColor }}>
              {contract?.parabens_subtitle || 'Contrato assinado com sucesso!'}
            </h2>
            <p className="text-muted-foreground">
              {contract?.parabens_description || 'Sua documentação foi processada. Você receberá uma confirmação por e-mail.'}
            </p>

            {contract?.protocol_number && (
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Número do Protocolo</p>
                <p className="font-mono font-bold text-lg">{contract.protocol_number}</p>
              </div>
            )}

            <Card className="text-left">
              <CardHeader>
                <CardTitle className="text-base">Endereço para Contato (Opcional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="street" className="text-xs">Rua</Label>
                    <Input
                      id="street"
                      value={addressData.street}
                      onChange={(e) => setAddressData({...addressData, street: e.target.value})}
                      placeholder="Rua/Avenida"
                      data-testid="input-address-street"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="number" className="text-xs">Número</Label>
                    <Input
                      id="number"
                      value={addressData.number}
                      onChange={(e) => setAddressData({...addressData, number: e.target.value})}
                      placeholder="123"
                      data-testid="input-address-number"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="city" className="text-xs">Cidade</Label>
                    <Input
                      id="city"
                      value={addressData.city}
                      onChange={(e) => setAddressData({...addressData, city: e.target.value})}
                      placeholder="Cidade"
                      data-testid="input-address-city"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="state" className="text-xs">Estado</Label>
                    <Input
                      id="state"
                      value={addressData.state}
                      onChange={(e) => setAddressData({...addressData, state: e.target.value})}
                      placeholder="SP"
                      data-testid="input-address-state"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              style={{ backgroundColor: parabensButtonColor }}
              onClick={() => window.close()}
              data-testid="button-finish"
            >
              {contract?.parabens_button_text || 'Finalizar'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

const AssinaturaClientPage = () => {
  return (
    <ContractProvider>
      <AssinaturaClientContent />
    </ContractProvider>
  );
};

export default AssinaturaClientPage;
