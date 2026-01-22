import { useLocation, useNavigate } from "react-router-dom";
import { PremiumButton } from "@/platforms/shared/premium/PremiumButton";
import { Building2, LayoutDashboard, FileText, TrendingUp, Banknote, Wallet } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useItems } from "@/hooks/billing/useBankingData";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: items = [], isLoading, error } = useItems();
  
  console.log('📊 Sidebar - Items:', items, 'Length:', items?.length, 'Loading:', isLoading, 'Error:', error);

  const isActiveBankRoute = (itemId: string) => {
    return location.pathname === `/faturamento/banco/${itemId}`;
  };

  const navItems = [
    {
      path: "/faturamento",
      icon: Building2,
      label: "Conectar Banco",
      testId: "connect-bank"
    },
    {
      path: "/faturamento/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard"
    },
    {
      path: "/faturamento/dados-bancarios",
      icon: Banknote,
      label: "Dados Bancários",
      testId: "bank-data"
    },
    {
      path: "/faturamento/creditos",
      icon: Wallet,
      label: "Créditos",
      testId: "credits-wallet"
    },
    {
      path: "/faturamento/anexos",
      icon: FileText,
      label: "Anexos"
    }
  ];

  return (
    <aside className={cn(
      "w-64 border-r border-white/10 min-h-[calc(100vh-73px)]",
      "bg-white/[0.02] backdrop-blur-xl"
    )}>
      <nav className="flex flex-col gap-2 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              data-tour={item.testId}
              data-testid={`nav-${item.testId || item.label.toLowerCase().replace(' ', '-')}`}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                "text-left w-full font-medium",
                isActive 
                  ? [
                      "bg-gradient-to-r from-primary/20 to-primary/10",
                      "border border-primary/30",
                      "text-foreground shadow-[0_4px_16px_rgba(212,175,55,0.2)]"
                    ]
                  : [
                      "bg-white/[0.03] border border-white/10",
                      "text-muted-foreground",
                      "hover:bg-white/[0.06] hover:border-white/20",
                      "hover:text-foreground"
                    ]
              )}
            >
              <Icon className={cn(
                "h-5 w-5 shrink-0",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}

        {items.length > 0 && (
          <>
            <Separator className="my-4 bg-white/10" />
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground px-3 mb-3 uppercase tracking-wider">
                Bancos Conectados
              </p>
              {items.map((item) => {
                const isActive = isActiveBankRoute(item.id);
                
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/faturamento/banco/${item.id}`)}
                    data-testid={`nav-bank-${item.id}`}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                      "text-left w-full font-medium",
                      isActive 
                        ? [
                            "bg-gradient-to-r from-emerald-500/20 to-emerald-500/10",
                            "border border-emerald-500/30",
                            "text-foreground shadow-[0_4px_16px_rgba(16,185,129,0.2)]"
                          ]
                        : [
                            "bg-white/[0.03] border border-white/10",
                            "text-muted-foreground",
                            "hover:bg-white/[0.06] hover:border-white/20",
                            "hover:text-foreground"
                          ]
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0",
                      isActive 
                        ? "bg-emerald-500/20 border border-emerald-500/30"
                        : "bg-white/[0.05] border border-white/10"
                    )}>
                      <TrendingUp className={cn(
                        "w-4 h-4",
                        isActive ? "text-emerald-400" : "text-muted-foreground"
                      )} />
                    </div>
                    <span className="truncate">{item.connector_name}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </nav>
    </aside>
  );
}
