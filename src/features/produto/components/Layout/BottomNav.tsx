import { LayoutDashboard, Package, Users, FolderTree, Menu } from "lucide-react";

interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const BottomNav = ({ currentPage, onNavigate }: BottomNavProps) => {
  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "produto-list", icon: Package, label: "Produtos" },
    { id: "cadastro-fornecedor", icon: Users, label: "Cadastros" },
    { id: "produto-category", icon: FolderTree, label: "Categorias" },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-bottom z-50 shadow-lg"
      data-testid="bottom-nav"
      role="navigation"
      aria-label="Navegação principal"
    >
      <div className="flex items-center justify-around max-w-screen-xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                flex flex-col items-center justify-center gap-1 
                min-w-[68px] h-16 px-2 py-2
                transition-all duration-200 ease-in-out
                active:scale-95 touch-manipulation
                relative group
                ${isActive ? "text-primary" : "text-muted-foreground"}
              `}
              data-testid={`nav-${item.id}`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full transition-all duration-200" />
              )}
              
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-xl
                transition-all duration-200
                ${isActive 
                  ? "bg-primary/10" 
                  : "group-hover:bg-muted"
                }
              `}>
                <Icon className={`
                  w-5 h-5 transition-all duration-200
                  ${isActive ? "stroke-[2.5] scale-110" : "stroke-2"}
                `} />
              </div>
              
              <span className={`
                text-[11px] font-medium transition-all duration-200
                ${isActive ? "font-semibold" : ""}
              `}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
