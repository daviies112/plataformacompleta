import { PlusCircle, FolderOpen, LayoutDashboard, Sparkles } from "lucide-react";
import { Link, useRoute } from "wouter";

const items = [
  { title: "Criar formulário", url: "/admin", icon: PlusCircle },
  { title: "Ver formulários", url: "/admin/formularios", icon: FolderOpen },
  { title: "Respostas", url: "/admin/dashboard", icon: LayoutDashboard },
];

export function HorizontalNav() {
  return (
    <nav className="h-14 border-b border-border/50 glass backdrop-blur-xl flex items-center px-6 sticky top-0 z-10 animate-slide-up">
      <div className="flex items-center gap-3 mr-8">
        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary-glow/10">
          <Sparkles className="h-5 w-5 text-primary animate-glow" />
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Formulário Premium
        </h1>
      </div>
      
      <div className="flex items-center gap-2 ml-auto">
        {items.map((item) => {
          const [isActive] = useRoute(item.url);
          return (
            <Link
              key={item.title}
              to={item.url}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 group
                ${
                  isActive
                    ? "bg-gradient-to-br from-primary/15 to-primary-glow/10 text-primary font-semibold shadow-md border border-primary/20"
                    : "hover:bg-sidebar-accent text-sidebar-foreground hover:scale-[1.02]"
                }
              `}
            >
              <item.icon className={`h-4 w-4 transition-all ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
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
