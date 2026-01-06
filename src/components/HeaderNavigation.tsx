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
  FileSignature
} from "lucide-react";

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
      label: "Produto", 
      icon: Package,
      active: location.pathname === "/produto"
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
      path: "/assinatura", 
      label: "Assinatura", 
      icon: FileSignature,
      active: location.pathname.startsWith("/assinatura")
    }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/10">
      <div className="container-luxury">
        <div className="flex items-center justify-between h-16">
          {/* Navigation */}
          <nav className="flex items-center space-x-1">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant={item.active ? "default" : "ghost"}
                size="sm"
                onClick={() => navigate(item.path)}
                className={`h-10 px-4 hover:bg-transparent hover:text-inherit ${item.active ? '!bg-primary !text-black' : 'text-gray-400 hover:text-white'}`}
              >
                <item.icon className="w-4 h-4 mr-2" />
                {item.label}
              </Button>
            ))}
          </nav>

          {/* Settings Icon Only */}
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => navigate("/settings")}
              variant={location.pathname === "/settings" ? "default" : "ghost"}
              size="sm"
              className={`h-10 w-10 p-0 hover:bg-transparent hover:text-inherit ${location.pathname === "/settings" ? '!bg-primary !text-black' : 'text-gray-400 hover:text-white'}`}
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