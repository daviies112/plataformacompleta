import { Shield, FileCheck, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContract } from '@/contexts/ContractContext';
import { brandConfig, landingConfig } from '@/config/branding';

const iconMap = {
  0: Shield,
  1: FileCheck,
  2: Clock,
};

export const LandingStep = () => {
  const { setCurrentStep } = useContract();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          {brandConfig.logoUrl && (
            <img 
              src={brandConfig.logoUrl} 
              alt={brandConfig.companyName}
              className="h-16 mx-auto mb-8 object-contain"
            />
          )}

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-8">
            <Shield className="w-4 h-4" />
            <span>{landingConfig.badge}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            {landingConfig.title}
            <span className="block gradient-text">{landingConfig.titleHighlight}</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            {landingConfig.subtitle}
          </p>

          <Button
            size="lg"
            onClick={() => setCurrentStep(1)}
            className="group h-14 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {landingConfig.ctaButton}
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>

          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-success" />
            <span>Dados protegidos conforme a LGPD</span>
          </div>
        </div>
      </div>

      <div className="bg-card border-t border-border py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {landingConfig.features.map((feature, index) => {
              const Icon = iconMap[index as keyof typeof iconMap] || Shield;
              return (
                <div
                  key={index}
                  className="flex flex-col items-center text-center p-6 rounded-xl bg-background/50 hover:bg-background transition-colors duration-300 animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
