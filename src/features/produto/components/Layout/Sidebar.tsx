import { Home, Package, Settings, LogOut, ChevronRight, Users, LayoutDashboard, ShoppingBag, UserCheck, FolderTree, Printer, SettingsIcon, Store, ClipboardList, Percent, BarChart3, Palette, Trophy } from "lucide-react";
import { Button } from "@/features/produto/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/features/produto/lib/utils";
import { Separator } from "@/features/produto/components/ui/separator";
import { useNavigate, useLocation } from "react-router-dom";

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar = ({ currentPage, onNavigate }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [productOpen, setProductOpen] = useState(true);
  const [cadastroOpen, setCadastroOpen] = useState(false);

  const isPlataformaVendasRoute = location.pathname.startsWith("/produto/admin");

  useEffect(() => {
    if (currentPage.startsWith("produto")) {
      setProductOpen(true);
    }
    if (currentPage.startsWith("cadastro")) {
      setCadastroOpen(true);
    }
  }, [currentPage, isPlataformaVendasRoute]);

  const menuItems = [
    {
      icon: Users,
      label: "Cadastros",
      id: "cadastro",
      description: "Gerenciar parceiros",
      submenu: [
        { icon: ShoppingBag, label: "Fornecedores", id: "cadastro-fornecedor" },
      ],
    },
    {
      icon: Package,
      label: "Produtos",
      id: "produto",
      description: "Gerenciar inventário",
      submenu: [
        { icon: Package, label: "Lista de Produtos", id: "produto-list" },
        { icon: FolderTree, label: "Categorias", id: "produto-category" },
        { icon: Printer, label: "Fila de Impressão", id: "produto-print-queue" },
        { icon: Store, label: "Produtos", id: "produto-admin-products" },
        { icon: ClipboardList, label: "Solicitações", id: "produto-admin-requests" },
        { icon: SettingsIcon, label: "Configurações", id: "printer-config" },
      ],
    },
  ];

  const plataformaVendasItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/produto/admin/dashboard" },
    { icon: Package, label: "Produtos", path: "/produto/admin/products" },
    { icon: ShoppingBag, label: "Pedidos", path: "/produto/admin/orders" },
    { icon: Users, label: "Revendedores", path: "/produto/admin/resellers" },
    { icon: ClipboardList, label: "Solicitações", path: "/produto/admin/product-requests" },
    { icon: Percent, label: "Comissões", path: "/produto/admin/commission-config" },
    { icon: BarChart3, label: "Analytics", path: "/produto/admin/analytics" },
    { icon: Palette, label: "Personalização", path: "/produto/admin/branding" },
    { icon: Trophy, label: "Gamificação", path: "/produto/admin/gamification" },
  ];

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border h-screen flex flex-col relative z-10 shadow-sm">
      <div className="p-6 border-b border-sidebar-border bg-gradient-to-b from-sidebar to-sidebar/95">
        <h2 className="text-lg font-bold text-sidebar-foreground tracking-tight">Gestão de Estoque</h2>
        <p className="text-xs text-muted-foreground mt-1">Sistema Profissional</p>
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
                    (currentPage.startsWith(item.id)) && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  )}
                  onClick={() => {
                    if (item.id === "produto") {
                      setProductOpen(!productOpen);
                    } else if (item.id === "cadastro") {
                      setCadastroOpen(!cadastroOpen);
                    }
                  }}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1 text-left text-sm">{item.label}</span>
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 transition-transform duration-200 flex-shrink-0",
                      ((item.id === "produto" && productOpen) || (item.id === "cadastro" && cadastroOpen)) && "rotate-90"
                    )}
                  />
                </Button>
                {((item.id === "produto" && productOpen) || (item.id === "cadastro" && cadastroOpen)) && (
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
                  currentPage === item.id && "bg-primary text-primary-foreground hover:bg-primary-hover font-medium shadow-sm"
                )}
                onClick={() => onNavigate(item.id)}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{item.label}</span>
              </Button>
            )}
          </div>
        ))}

        <Separator className="bg-sidebar-border" />
      </nav>

      <Separator className="bg-sidebar-border" />

      <div className="p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-11 px-3 rounded-lg text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">Sair do Sistema</span>
        </Button>
      </div>
    </aside>
  );
};
