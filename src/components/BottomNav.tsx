import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard,
  BarChart3,
  Calendar,
  Layers,
  Receipt,
  FileText,
  Package,
  Trello
} from "lucide-react";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Haptic feedback para interações premium
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // Haptic feedback suave
    }
  };

  const handleNavClick = (path: string) => {
    triggerHaptic();
    navigate(path);
  };

  const navItems = [
    { 
      path: "/formulario", 
      label: "Formulário", 
      icon: FileText,
      active: location.pathname === "/formulario"
    },
    { 
      path: "/faturamento", 
      label: "Faturamento", 
      icon: Receipt,
      active: location.pathname.startsWith("/faturamento")
    },
    { 
      path: "/produto", 
      label: "Produto", 
      icon: Package,
      active: location.pathname === "/produto"
    },
    { 
      path: "/kanban", 
      label: "Kanban", 
      icon: Trello,
      active: location.pathname === "/kanban"
    }
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/20 pb-[env(safe-area-inset-bottom)]"
      style={{
        background: 'rgba(10, 10, 10, 0.8)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => handleNavClick(item.path)}
              className={`
                relative flex-1 flex flex-col items-center justify-center h-14 px-1 py-2 rounded-xl
                transition-all duration-300 ease-out
                ${item.active 
                  ? 'text-primary scale-105' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }
                active:scale-95 touch-none
              `}
              data-testid={`nav-${item.path.replace('/', '')}`}
              aria-label={item.label}
              title={item.label}
            >
              {/* Active Indicator Premium */}
              {item.active && (
                <div 
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full
                    shadow-[0_0_12px_rgba(212,175,55,0.6)]
                    animate-in fade-in slide-in-from-top-2 duration-300"
                />
              )}
              
              {/* Icon com fundo de contraste quando ativo */}
              <div className={`relative flex items-center justify-center ${item.active ? 'w-12 h-12 rounded-xl bg-black border border-primary/30' : ''}`}>
                <Icon 
                  className={`w-6 h-6 transition-transform duration-200 ${
                    item.active ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]' : ''
                  }`} 
                />
              </div>
              
              {/* Active background glow sutil */}
              {item.active && (
                <div 
                  className="absolute inset-0 bg-primary/5 rounded-xl -z-10
                    shadow-[inset_0_0_12px_rgba(212,175,55,0.1)]
                    animate-in fade-in zoom-in-95 duration-300"
                />
              )}
            </Button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;