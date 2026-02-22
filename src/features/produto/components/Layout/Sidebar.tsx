import { Home, Package, Settings, LogOut, ChevronRight, Users, LayoutDashboard, ShoppingBag, UserCheck, FolderTree, Printer, SettingsIcon, Store, ClipboardList, Percent, BarChart3, Palette, Trophy, LucideIcon, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/features/produto/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/features/produto/lib/utils";
import { Separator } from "@/features/produto/components/ui/separator";
import { useNavigate, useLocation } from "react-router-dom";

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface SubMenuItem {
  icon?: LucideIcon;
  label: string;
  id?: string;
  path?: string;
}

interface MenuItem {
  icon: LucideIcon;
  label: string;
  id: string;
  description?: string;
  path?: string;
  submenu?: SubMenuItem[];
}

export const Sidebar = ({ currentPage, onNavigate }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [productOpen, setProductOpen] = useState(true);
  const [cadastroOpen, setCadastroOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isPlataformaVendasRoute = location.pathname.startsWith("/produto/admin");

  useEffect(() => {
    if (currentPage.startsWith("produto")) {
      setProductOpen(true);
    }
    if (currentPage.startsWith("cadastro")) {
      setCadastroOpen(true);
    }
  }, [currentPage, isPlataformaVendasRoute]);

  const menuItems: MenuItem[] = [
    {
      icon: LayoutDashboard,
      label: "Produção e Estoque",
      id: "produto-admin-products",
      description: "Gestão Unificada",
    },
    {
      icon: Users,
      label: "Revendedoras",
      id: "revendedora-admin-hub",
      path: "/revendedora/admin"
    },
    {
      icon: Printer,
      label: "Fila de Impressão",
      id: "produto-print-queue",
    },
    {
      icon: SettingsIcon,
      label: "Configurações Impressora",
      id: "printer-config",
    },
  ];

  return (
    <aside className={cn(
      "bg-sidebar border-r border-sidebar-border h-screen flex flex-col relative z-20 shadow-sm transition-all duration-300",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className={cn(
        "p-6 border-b border-sidebar-border bg-gradient-to-b from-sidebar to-sidebar/95 flex items-center justify-between overflow-hidden",
        isCollapsed && "px-4 justify-center"
      )}>
        {!isCollapsed && (
          <div className="transition-all duration-300">
            <h2 className="text-lg font-bold text-sidebar-foreground tracking-tight whitespace-nowrap">Gestão de Estoque</h2>
            <p className="text-xs text-muted-foreground mt-1 whitespace-nowrap">Sistema Profissional</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-sidebar-foreground hover:text-primary hover:bg-primary/10 active:bg-primary active:text-primary-foreground transition-all duration-200 shrink-0"
          title={isCollapsed ? "Expandir" : "Recolher"}
        >
          {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </Button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item, index) => (
          <div key={item.id}>
            {item.submenu ? (
              <>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all duration-200",
                    "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm",
                    (currentPage.startsWith(item.id)) && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                    isCollapsed && "justify-center px-0 gap-0"
                  )}
                  onClick={() => {
                    if (isCollapsed) {
                      setIsCollapsed(false);
                      return;
                    }
                    if (item.id === "produto") {
                      setProductOpen(!productOpen);
                    } else if (item.id === "cadastro") {
                      setCadastroOpen(!cadastroOpen);
                    }
                  }}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="flex-1 text-left text-sm">{item.label}</span>}
                  {!isCollapsed && (
                    <ChevronRight
                      className={cn(
                        "w-4 h-4 transition-transform duration-200 flex-shrink-0",
                        ((item.id === "produto" && productOpen) || (item.id === "cadastro" && cadastroOpen)) && "rotate-90"
                      )}
                    />
                  )}
                </Button>
                {!isCollapsed && ((item.id === "produto" && productOpen) || (item.id === "cadastro" && cadastroOpen)) && (
                  <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-sidebar-border pl-3">
                    {item.submenu.map((subitem) => (
                      <Button
                        key={subitem.id || subitem.path}
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-3 h-10 px-3 rounded-lg transition-all duration-200",
                          "text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          currentPage === subitem.id &&
                          "bg-primary text-primary-foreground hover:bg-primary-hover font-medium shadow-sm"
                        )}
                        onClick={() => {
                          if (subitem.path) {
                            navigate(subitem.path);
                          } else if (subitem.id) {
                            onNavigate(subitem.id);
                          }
                        }}
                      >
                        {subitem.icon && <subitem.icon className="w-4 h-4 flex-shrink-0" />}
                        <span className="text-sm">{subitem.label}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all duration-200",
                  "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm",
                  currentPage === item.id && "bg-primary text-primary-foreground hover:bg-primary-hover font-medium shadow-sm",
                  isCollapsed && "justify-center px-0 gap-0"
                )}
                onClick={() => onNavigate(item.id)}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="text-sm">{item.label}</span>}
              </Button>
            )}
          </div>
        ))}

        <Separator className="bg-sidebar-border" />
      </nav>
    </aside>
  );
};
