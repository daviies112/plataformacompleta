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

  FileText,
  MessageSquare,
  Package,
  Trello,
  Shield,

  Video,
  Users,
  Percent,
  Banknote,
  BarChart3,
  LayoutDashboard
} from "lucide-react";
import { WalletBadge } from "@/components/WalletBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
      path: "/whatsapp-platform",
      label: "WhatsApp",
      icon: MessageSquare,
      active: location.pathname === "/whatsapp-platform"
    },
    {
      path: "/produto",
      label: "Etiqueta",
      icon: Package,
      active: location.pathname.startsWith("/produto") || location.pathname.startsWith("/vendas/tags"),
      children: [
        {
          label: "Etiqueta",
          path: "/produto/admin/tags",
          icon: Tag
        },
        {
          label: "Produtos",
          path: "/produto/admin/products",
          icon: Package
        },
        {
          label: "Solicitações",
          path: "/produto/admin/product-requests",
          icon: ClipboardList
        }
      ]
    },
    {
      path: "/revendedoras",
      label: "Revendedoras",
      icon: Users,
      active: location.pathname.startsWith("/produto/admin/resellers") || location.pathname.startsWith("/produto/admin/commission-config"),
      children: [
        {
          label: "Revendedores",
          path: "/produto/admin/resellers",
          icon: Users
        },
        {
          label: "Configurar Comissões",
          path: "/produto/admin/commission-config",
          icon: Percent
        }
      ]
    },
    {
      path: "/vendas",
      label: "Vendas",
      icon: Crown,
      active: location.pathname.startsWith("/vendas") && !location.pathname.startsWith("/vendas/tags"),
      children: [
        {
          label: "Dashboard",
          path: "/vendas/dashboard",
          icon: LayoutDashboard // Or reuse Crown if preferred, but LayoutDashboard is more semantic
        },
        {
          label: "Dados Bancários",
          path: "/vendas/dados-bancarios",
          icon: Banknote
        },
        {
          label: "Analytics",
          path: "/vendas/analytics",
          icon: BarChart3
        }
      ]
    },
    {
      path: "/kanban",
      label: "Kanban",
      icon: Trello,
      active: location.pathname === "/kanban"
    },
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
          {navItems.map((item) => {
            if (item.children) {
              return (
                <DropdownMenu key={item.path}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={item.active ? "default" : "ghost"}
                      size="sm"
                      className={`h-10 px-3 whitespace-nowrap flex-shrink-0 hover:bg-transparent hover:text-inherit ${item.active ? '!bg-primary !text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                      <item.icon className="w-4 h-4 mr-1.5" />
                      {item.label}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 bg-[#0A0A0A] border-white/10">
                    {item.children.map((child) => (
                      <DropdownMenuItem
                        key={child.path}
                        onClick={() => navigate(child.path)}
                        className="text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
                      >
                        <child.icon className="w-4 h-4 mr-2" />
                        {child.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            return (
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
            );
          })}

          {/* Envio Button - Direct Navigation */}
          <Button
            variant={isEnvioActive ? "default" : "ghost"}
            size="sm"
            onClick={() => navigate("/envio")}
            className={`h-10 px-3 whitespace-nowrap flex-shrink-0 hover:bg-transparent hover:text-inherit ${isEnvioActive ? '!bg-primary !text-black' : 'text-gray-400 hover:text-white'}`}
          >
            <Truck className="w-4 h-4 mr-1.5" />
            Envio
          </Button>
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