import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LayoutDashboard,
  BarChart3,
  Calendar,
  Layers,
  Settings,
  Crown,
  Receipt,
  FileText,
  MessageSquare,
  Package,
  Trello,
  Shield,
  ShoppingBag,
  Video,
  FileSignature,
  Truck,
  ChevronDown,
  Calculator,
  ListOrdered,
  Search
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WalletBadge } from "@/components/WalletBadge";

const HeaderNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { 
      path: "/formulario", 
      label: "Formulário", 
      icon: FileText,
      active: location.pathname === "/formulario"
    },
    { 
      path: "/calendar", 
      label: "Calendário", 
      icon: Calendar,
      active: location.pathname === "/calendar"
    },
    { 
      path: "/workspace", 
      label: "Workspace", 
      icon: Layers,
      active: location.pathname === "/workspace"
    },
    { 
      path: "/faturamento", 
      label: "Faturamento", 
      icon: Receipt,
      active: location.pathname.startsWith("/faturamento")
    },
    { 
      path: "/whatsapp-platform", 
      label: "WhatsApp", 
      icon: MessageSquare,
      active: location.pathname === "/whatsapp-platform"
    },
    { 
      path: "/produto", 
      label: "Etiqueta", 
      icon: Package,
      active: location.pathname === "/produto" && !location.pathname.startsWith("/produto/admin"),
      onClick: () => navigate("/produto?page=produto-list")
    },
    { 
      path: "/vendas", 
      label: "Vendas", 
      icon: Crown,
      active: location.pathname.startsWith("/vendas")
    },
    { 
      path: "/kanban", 
      label: "Kanban", 
      icon: Trello,
      active: location.pathname === "/kanban"
    },
    { 
      path: "/reuniao", 
      label: "Reunião", 
      icon: Video,
      active: location.pathname.startsWith("/reuniao")
    },
    { 
      path: "/consultar-cpf", 
      label: "Consultar CPF", 
      icon: Shield,
      active: location.pathname === "/consultar-cpf"
    },
    { 
      path: "/revendedora", 
      label: "Revendedora", 
      icon: ShoppingBag,
      active: location.pathname.startsWith("/revendedora")
    },
    { 
      path: "/assinatura/personalizar", 
      label: "Assinatura", 
      icon: FileSignature,
      active: location.pathname.startsWith("/assinatura")
    }
  ];

  const isEnvioActive = location.pathname.startsWith("/envio");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/10">
      <div className="w-full px-2 sm:px-4">
        <div className="flex items-center h-16 gap-2">
          {/* Navigation with horizontal scroll */}
          <nav className="flex items-center space-x-1 overflow-x-auto scrollbar-hide flex-1 min-w-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant={item.active ? "default" : "ghost"}
                size="sm"
                onClick={() => navigate(item.path)}
                className={`h-10 px-3 whitespace-nowrap flex-shrink-0 hover:bg-transparent hover:text-inherit ${item.active ? '!bg-primary !text-black' : 'text-gray-400 hover:text-white'}`}
              >
                <item.icon className="w-4 h-4 mr-1.5" />
                {item.label}
              </Button>
            ))}
            
            {/* Envio Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isEnvioActive ? "default" : "ghost"}
                  size="sm"
                  className={`h-10 px-3 whitespace-nowrap flex-shrink-0 hover:bg-transparent hover:text-inherit ${isEnvioActive ? '!bg-primary !text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  <Truck className="w-4 h-4 mr-1.5" />
                  Envio
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem 
                  onClick={() => navigate("/envio")}
                  className={location.pathname === "/envio" ? "bg-accent" : ""}
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Cotação de Frete
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => navigate("/envio/lista")}
                  className={location.pathname === "/envio/lista" ? "bg-accent" : ""}
                >
                  <ListOrdered className="w-4 h-4 mr-2" />
                  Meus Envios
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => navigate("/envio/rastreamento")}
                  className={location.pathname === "/envio/rastreamento" ? "bg-accent" : ""}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Rastreamento
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Wallet Balance & Settings */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <WalletBadge />
            <Button
              onClick={() => navigate("/settings")}
              variant={location.pathname === "/settings" ? "default" : "ghost"}
              size="icon"
              className={`h-10 w-10 hover:bg-transparent hover:text-inherit ${location.pathname === "/settings" ? '!bg-primary !text-black' : 'text-gray-400 hover:text-white'}`}
              title="Configurações"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderNavigation;