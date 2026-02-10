import { useNavigate } from 'react-router-dom';
import { PremiumCard } from '@/platforms/shared/premium/PremiumCard';
import { PremiumButton } from '@/platforms/shared/premium/PremiumButton';
import { Home, ArrowLeft, Search, Compass, BarChart3, Users, Settings } from 'lucide-react';

const NotFoundPage = () => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const quickLinks = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: BarChart3, label: 'Análises', path: '/analise' },
    { icon: Users, label: 'Clientes', path: '/clients' },
    { icon: Settings, label: 'Configurações', path: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/98 to-muted/5 flex items-center justify-center px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-secondary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8 animate-fade-in">
        
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <h1 
              className="text-[120px] font-black leading-none bg-gradient-to-br from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent"
              data-testid="text-404"
            >
              404
            </h1>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
          </div>
        </div>

        <PremiumCard variant="elevated" padding="lg">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-muted/10 backdrop-blur-sm flex items-center justify-center">
              <Search className="w-10 h-10 text-muted-foreground/40" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground" data-testid="text-title">
                Página Não Encontrada
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-description">
                A página que você está procurando não existe ou foi movida.
              </p>
            </div>
          </div>
        </PremiumCard>

        <div className="space-y-3">
          <PremiumButton
            variant="primary"
            onClick={() => navigate('/dashboard')}
            className="w-full"
            data-testid="button-home"
          >
            <Home className="w-5 h-5 mr-2" />
            Ir para Dashboard
          </PremiumButton>
          
          <PremiumButton
            variant="secondary"
            onClick={() => navigate(-1)}
            className="w-full"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </PremiumButton>
        </div>

        <PremiumCard variant="default" padding="md">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Compass className="w-4 h-4 text-primary" />
              Links Rápidos
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {quickLinks.map((link) => (
                <button
                  key={link.path}
                  onClick={() => handleNavigate(link.path)}
                  className="group relative flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-primary/20 transition-all duration-200 active:scale-95 min-h-[88px]"
                  data-testid={`link-${link.label.toLowerCase()}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                    <link.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                    {link.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </PremiumCard>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Verifique o endereço ou navegue usando os links acima
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
