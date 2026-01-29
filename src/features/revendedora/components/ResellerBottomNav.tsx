import { useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Store,
  Trophy,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { path: "/revendedora/reseller/dashboard", icon: LayoutDashboard, label: "Home" },
  { path: "/revendedora/reseller/sales", icon: TrendingUp, label: "Vendas" },
  { path: "/revendedora/reseller/financial", icon: Wallet, label: "Financeiro" },
  { path: "/revendedora/reseller/store", icon: Store, label: "Loja" },
  { path: "/revendedora/reseller/team", icon: UsersRound, label: "Equipe" },
  { path: "/revendedora/reseller/gamification", icon: Trophy, label: "Ranking" },
];

const triggerHaptic = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

export function ResellerBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const handleNavClick = (path: string) => {
    triggerHaptic();
    navigate(path);
  };

  return (
    <nav 
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe"
      style={{
        background: 'hsl(var(--background) / 0.95)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid hsl(var(--border))',
      }}
    >
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[48px] min-h-[56px] rounded-xl transition-all duration-200 flex-1",
                "active:scale-95 touch-manipulation",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary/70"
              )}
              aria-label={item.label}
              title={item.label}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <div
                className={cn(
                  "p-2 rounded-lg transition-all duration-200",
                  active && "bg-primary/10"
                )}
              >
                <Icon
                  className={cn(
                    "transition-all duration-200",
                    active ? "h-6 w-6" : "h-5 w-5"
                  )}
                />
              </div>
              <span className={cn(
                "text-[10px] font-medium mt-0.5",
                active ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
