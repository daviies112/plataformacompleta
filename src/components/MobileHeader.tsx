import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Download } from "lucide-react";
import nexusLogoFull from "@/assets/nexus-logo-full.png";
import { useNavigate } from "react-router-dom";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { toast } from "sonner";

const MobileHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { install, canInstall, isInstalled } = usePWAInstall();

  const handleInstallClick = async () => {
    const result = await install();
    
    if (result === 'success') {
      toast.success('App instalado com sucesso!');
    } else if (result === 'dismissed') {
      toast.info('Instalação cancelada');
    }
  };

  return (
    <>
      <header 
        className="fixed top-0 left-0 right-0 z-40 border-b border-border/20"
        style={{
          background: 'rgba(10, 10, 10, 0.8)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        }}
      >
        <div className="flex items-center justify-between h-20 px-4">
          {/* Logo + Install Button - Premium Mobile */}
          <div className="flex items-center gap-3">
            <img 
              src={nexusLogoFull} 
              alt="NEXUS" 
              className="h-16 w-auto object-contain opacity-90" 
            />
            
            {/* Install Button - Mobile Only (topo) */}
            {!isInstalled && canInstall && (
              <Button
                onClick={handleInstallClick}
                size="sm"
                className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 
                  font-semibold transition-all duration-200 active:scale-95
                  shadow-[0_0_12px_rgba(212,175,55,0.2)] hover:shadow-[0_0_16px_rgba(212,175,55,0.4)]
                  whitespace-nowrap h-8 text-xs"
                aria-label="Instalar App"
              >
                <Download className="w-3 h-3 mr-1.5" />
                <span>Instalar App</span>
              </Button>
            )}
          </div>

          {/* User Actions Mobile - Premium */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/configuracoes')}
              className="h-8 w-8 p-0 text-primary hover:text-primary/80 hover:bg-primary/10 transition-all duration-200 active:scale-95"
              aria-label="Configurações"
              data-testid="button-settings-mobile"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200 active:scale-95"
              data-testid="button-logout-mobile"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>
    </>
  );
};

export default MobileHeader;