import { ContractProvider, useContract } from '@/contexts/ContractContext';
import { LandingStep } from '@/components/steps/LandingStep';
import { VerificationFlow } from '@/components/verification/VerificationFlow';
import { ContractStep } from '@/components/steps/ContractStep';
import { SuccessStep } from '@/components/steps/SuccessStep';
import { brandConfig } from '@/config/branding';

const ContractFlow = () => {
  const { currentStep } = useContract();

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <LandingStep />;
      case 1:
        return <VerificationFlow />;
      case 2:
        return <ContractStep />;
      case 3:
        return <SuccessStep />;
      default:
        return <LandingStep />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main>{renderStep()}</main>

      {/* Footer */}
      {currentStep === 0 && (
        <footer className="py-6 px-4 border-t border-border bg-card">
          <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
            <p>{brandConfig.footerText}</p>
            <p className="mt-1">
              Assinatura digital segura com reconhecimento facial
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

const Index = () => {
  return (
    <ContractProvider>
      <ContractFlow />
    </ContractProvider>
  );
};

export default Index;
