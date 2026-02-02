import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { FileSignature, FileText, Palette, PlusCircle, ArrowRight } from "lucide-react";
import { useEffect } from "react";

const AssinaturaIndexPage = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    document.title = "Assinatura Digital | Sistema de Contratos";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 py-16 relative">
        <div className="max-w-5xl mx-auto">
          <header className="text-center mb-20 animate-slide-up">
            <div className="inline-flex items-center gap-2 mb-6 px-5 py-2.5 glass rounded-full border border-primary/20 shadow-glow animate-scale-in">
              <FileSignature className="h-4 w-4 text-primary animate-glow" />
              <span className="text-sm font-semibold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Plataforma Premium
              </span>
            </div>
            
            <h1 className="text-7xl font-extrabold mb-8 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent leading-tight animate-fade-in">
              Assinatura Digital
              <br />
              <span className="text-6xl">de Contratos</span>
            </h1>
            
            <p className="text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed animate-slide-up">
              Plataforma completa para criar contratos personalizados, 
              gerenciar assinaturas e acompanhar o status dos documentos
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-scale-in">
              <Button 
                onClick={() => navigate("/assinatura/criar")}
                variant="default"
                size="lg"
                className="gap-2"
                data-testid="button-criar-assinatura"
              >
                Criar Assinatura
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button 
                onClick={() => navigate("/assinatura/contratos")}
                variant="outline"
                size="lg"
                className="gap-2 glass"
                data-testid="button-ver-contratos"
              >
                <FileText className="h-5 w-5" />
                Ver Contratos
              </Button>
            </div>
          </header>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card 
              className="group p-10 glass hover-lift cursor-pointer border-2 border-border/50 hover:border-primary/30 transition-all duration-500 animate-slide-up"
              onClick={() => navigate("/assinatura/criar")}
              data-testid="card-criar-assinatura"
              style={{ animationDelay: '0.1s' }}
            >
              <div className="p-5 bg-gradient-to-br from-primary/10 to-primary-glow/10 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                <PlusCircle className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                Criar Assinatura
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Gere URLs de assinatura rapidamente com dados do cliente
              </p>
            </Card>

            <Card 
              className="group p-10 glass hover-lift cursor-pointer border-2 border-border/50 hover:border-accent/30 transition-all duration-500 animate-slide-up"
              onClick={() => navigate("/assinatura/personalizar")}
              data-testid="card-personalizar"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="p-5 bg-gradient-to-br from-accent/10 to-accent-light/10 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                <Palette className="h-10 w-10 text-accent" />
              </div>
              <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                Personalizar
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Configure cores, logo e aparência dos contratos
              </p>
            </Card>

            <Card 
              className="group p-10 glass hover-lift cursor-pointer border-2 border-border/50 hover:border-primary-glow/30 transition-all duration-500 animate-slide-up"
              onClick={() => navigate("/assinatura/contratos")}
              data-testid="card-ver-contratos"
              style={{ animationDelay: '0.3s' }}
            >
              <div className="p-5 bg-gradient-to-br from-primary-glow/10 to-primary/10 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-10 w-10 text-primary-glow" />
              </div>
              <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                Ver Contratos
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Acompanhe todos os contratos e status de assinatura
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssinaturaIndexPage;
