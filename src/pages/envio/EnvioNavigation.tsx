import { Button } from "@/components/ui/button";
import { Calculator, ListOrdered, Search, Send } from "lucide-react";
import { useLocation } from "wouter";

const EnvioNavigation = () => {
  const [location, navigate] = useLocation();

  const navItems = [
    {
      path: "/envio",
      label: "Cotação",
      icon: Calculator,
      exact: true
    },
    {
      path: "/envio/enviar",
      label: "Enviar",
      icon: Send,
      exact: false
    },
    {
      path: "/envio/lista",
      label: "Meus Envios",
      icon: ListOrdered,
      exact: false
    },
    {
      path: "/envio/rastreamento",
      label: "Rastreamento",
      icon: Search,
      exact: false
    }
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return location === item.path;
    }
    return location.startsWith(item.path);
  };

  return (
    <div className="flex items-center gap-2">
      {navItems.map((item) => (
        <Button
          key={item.path}
          variant={isActive(item) ? "default" : "outline"}
          size="sm"
          onClick={() => navigate(item.path)}
          className="gap-2"
          data-testid={`nav-envio-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Button>
      ))}
    </div>
  );
};

export default EnvioNavigation;
