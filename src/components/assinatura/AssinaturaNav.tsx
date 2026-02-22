import { PlusCircle, Palette, FileText, FileSignature } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { ResellerImportDialog } from "./ResellerImportDialog";

const items = [
  { title: "Criar Assinatura", url: "/assinatura/criar", icon: PlusCircle },
  { title: "Design", url: "/assinatura/personalizar", icon: Palette },
  { title: "Contratos", url: "/assinatura/contratos", icon: FileText },
];

export function AssinaturaNav() {
  const location = useLocation();

  return (
    <nav className="h-14 border-b border-border/50 glass backdrop-blur-xl flex items-center px-6 sticky top-0 z-50 animate-slide-up">


      <div className="flex items-center gap-2 ml-auto">
        <ResellerImportDialog />
        {items.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <Link
              key={item.title}
              to={item.url}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 group
                ${isActive
                  ? "bg-gradient-to-br from-primary/15 to-primary-glow/10 text-primary font-semibold shadow-md border border-primary/20"
                  : "hover-elevate text-sidebar-foreground"
                }
              `}
              data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <span className="transition-all text-sm">
                {item.title}
              </span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-glow ml-1" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
