import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useLocation } from "wouter";
import { Sparkles, FileText, BarChart3, ArrowRight, Zap, TrendingUp } from "lucide-react";
import { useEffect } from "react";

const Index = () => {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    document.title = "Criar Formulários de Qualificação | Sistema de Leads";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 py-16 relative">
        <div className="max-w-5xl mx-auto">
          <header className="text-center mb-20 animate-slide-up">
            <div className="inline-flex items-center gap-2 mb-6 px-5 py-2.5 glass rounded-full border border-primary/20 shadow-glow animate-scale-in">
              <Sparkles className="h-4 w-4 text-primary animate-glow" />
              <span className="text-sm font-semibold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Plataforma Premium
              </span>
            </div>
            
            <h1 className="text-7xl font-extrabold mb-8 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent leading-tight animate-fade-in">
              Sistema de Qualificação
              <br />
              <span className="text-6xl">de Leads</span>
            </h1>
            
            <p className="text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed animate-slide-up">
              Plataforma completa e profissional para criar formulários personalizados, 
              qualificar clientes e gerenciar reuniões de negócios
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-scale-in">
              <Button 
                onClick={() => setLocation("/admin")}
                variant="premium"
                size="lg"
                className="gap-2 text-lg px-10 py-7 h-auto"
                data-testid="button-create-form"
              >
                Criar Formulário
                <ArrowRight className="h-6 w-6" />
              </Button>
              <Button 
                onClick={() => setLocation("/admin/dashboard")}
                variant="outline"
                size="lg"
                className="gap-2 text-lg px-10 py-7 h-auto glass"
              >
                <BarChart3 className="h-5 w-5" />
                Ver Respostas
              </Button>
            </div>
          </header>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card 
              className="group p-10 glass hover-lift cursor-pointer border-2 border-border/50 hover:border-primary/30 transition-all duration-500 animate-slide-up"
              onClick={() => setLocation("/admin")}
              data-testid="card-create-forms"
              style={{ animationDelay: '0.1s' }}
            >
              <div className="p-5 bg-gradient-to-br from-primary/10 to-primary-glow/10 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                Criar Formulários
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Configure perguntas personalizadas com sistema de pontuação inteligente
              </p>
            </Card>

            <Card 
              className="group p-10 glass hover-lift cursor-pointer border-2 border-border/50 hover:border-accent/30 transition-all duration-500 animate-slide-up"
              onClick={() => setLocation("/admin/formularios")}
              data-testid="card-share-links"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="p-5 bg-gradient-to-br from-accent/10 to-accent-light/10 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap className="h-10 w-10 text-accent" />
              </div>
              <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                Compartilhar Links
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Envie formulários profissionais para seus potenciais clientes
              </p>
            </Card>

            <Card 
              className="group p-10 glass hover-lift cursor-pointer border-2 border-border/50 hover:border-primary-glow/30 transition-all duration-500 animate-slide-up"
              onClick={() => setLocation("/admin/dashboard")}
              data-testid="card-analytics"
              style={{ animationDelay: '0.3s' }}
            >
              <div className="p-5 bg-gradient-to-br from-primary-glow/10 to-primary/10 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-10 w-10 text-primary-glow" />
              </div>
              <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                Análise de Dados
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Visualize e analise os resultados das submissões recebidas
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
