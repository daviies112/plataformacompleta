import { useState } from 'react';
import { ArrowLeft, Shield, ExternalLink, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContract } from '@/contexts/ContractContext';
import { useToast } from '@/hooks/use-toast';
import { govbrConfig } from '@/config/branding';
import { maskCPF } from '@/lib/validators';

interface ClientData {
  client_name: string;
  client_cpf: string;
  client_email: string;
  client_phone: string | null;
}

interface GovBRStepProps {
  clientData?: ClientData;
}

export const GovBRStep = ({ clientData }: GovBRStepProps) => {
  const { setGovbrData, setCurrentStep } = useContract();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleGovBRAuth = async () => {
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const userData = clientData
      ? {
          cpf: maskCPF(clientData.client_cpf),
          nome: clientData.client_name,
          nivel_conta: 'prata',
          email: clientData.client_email,
          authenticated: true,
        }
      : {
          cpf: '123.456.789-00',
          nome: 'João da Silva',
          nivel_conta: 'prata',
          email: 'joao.silva@email.com',
          authenticated: true,
        };

    setGovbrData(userData);
    
    toast({
      title: govbrConfig.successTitle,
      description: govbrConfig.successDescription,
    });
    
    setIsLoading(false);
    setCurrentStep(2);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Shield className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {govbrConfig.title}
        </h2>
        <p className="text-muted-foreground">
          {govbrConfig.description}
        </p>
      </div>

      {clientData && (
        <div className="bg-muted/50 rounded-xl p-4 mb-6">
          <p className="text-sm text-muted-foreground mb-1">Contrato para:</p>
          <p className="font-semibold text-foreground">{clientData.client_name}</p>
          <p className="text-sm text-muted-foreground">CPF: {maskCPF(clientData.client_cpf)}</p>
        </div>
      )}

      <div className="glass-card p-6 mb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#1351B4] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">BR</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Login GOV.BR</h3>
            <p className="text-sm text-muted-foreground">
              O login único do Governo Federal Brasileiro
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {govbrConfig.securityFeatures.map((feature, index) => (
            <div key={index} className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              <span className="text-foreground">{feature}</span>
            </div>
          ))}
        </div>

        <Button
          onClick={handleGovBRAuth}
          disabled={isLoading}
          className="w-full h-14 text-lg font-semibold bg-[#1351B4] hover:bg-[#0D3D8F] text-white shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {govbrConfig.buttonLoadingText}
            </>
          ) : (
            <>
              {govbrConfig.buttonText}
              <ExternalLink className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      <div className="bg-muted/50 rounded-xl p-4 mb-6">
        <p className="text-sm text-muted-foreground text-center">
          {govbrConfig.disclaimer}
        </p>
      </div>
    </div>
  );
};
