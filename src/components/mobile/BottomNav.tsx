import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  MessageSquare, 
  FileText, 
  MoreHorizontal,
  FileEdit,
  Layout,
  Briefcase,
  Calendar,
  LayoutDashboard,
  Package,
  Search,
  History,
  BarChart3,
  Settings,
  Download,
  Bell,
  Store,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
}

interface DrawerMenuItem {
  path: string;
  icon: React.ElementType;
  label: string;
}

interface DrawerSection {
  title: string;
  items: DrawerMenuItem[];
}

const mainNavItems: NavItem[] = [
  { path: "/kanban", icon: LayoutDashboard, label: "Kanban" },
  { path: "/whatsapp-platform", icon: MessageSquare, label: "WhatsApp" },
  { path: "/faturamento", icon: FileText, label: "Finanças" },
];

const drawerSections: DrawerSection[] = [
  {
    title: "Formulários & Documentos",
    items: [
      { path: "/formulario", icon: FileEdit, label: "Formulário" },
      { path: "/documentos", icon: FileText, label: "Documentos" },
      { path: "/notion", icon: Layout, label: "Notion" },
    ],
  },
  {
    title: "Ferramentas",
    items: [
      { path: "/workspace", icon: Briefcase, label: "Workspace" },
      { path: "/calendario", icon: Calendar, label: "Calendário" },
      { path: "/kanban", icon: LayoutDashboard, label: "Kanban" },
      { path: "/produto", icon: Package, label: "Produtos" },
    ],
  },
  {
    title: "Compliance & CPF",
    items: [
      { path: "/consultar-cpf", icon: Search, label: "Consultar CPF" },
      { path: "/historico-consultas", icon: History, label: "Histórico Consultas" },
    ],
  },
  {
    title: "Administração",
    items: [
      { path: "/produto/admin/dashboard", icon: BarChart3, label: "Admin Dashboard" },
      { path: "/configuracoes", icon: Settings, label: "Configurações" },
      { path: "/export", icon: Download, label: "Exportar Dados" },
      { path: "/notifications", icon: Bell, label: "Notificações" },
    ],
  },
  {
    title: "Plataforma Revendedora",
    items: [
      { path: "/revendedora", icon: Store, label: "Revendedora" },
    ],
  },
];

const triggerHaptic = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const isAnyDrawerItemActive = () => {
    return drawerSections.some(section => 
      section.items.some(item => isActive(item.path))
    );
  };

  const handleNavClick = (path: string) => {
    triggerHaptic();
    navigate(path);
  };

  const handleDrawerItemClick = (path: string) => {
    triggerHaptic();
    setIsDrawerOpen(false);
    navigate(path);
  };

  const handleMoreClick = () => {
    triggerHaptic();
    setIsDrawerOpen(true);
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe"
        style={{
          background: 'rgba(10, 10, 10, 0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: '1px solid rgba(212, 175, 55, 0.2)',
        }}
      >
        <div className="flex items-center justify-around h-16 px-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[48px] min-h-[56px] rounded-xl transition-all duration-200 flex-1",
                  "active:scale-95 touch-manipulation",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary/70"
                )}
                aria-label={item.label}
                title={item.label}
              >
                <div
                  className={cn(
                    "p-2 rounded-lg transition-all duration-200",
                    active && "bg-primary/10"
                  )}
                >
                  <Icon
                    className={cn(
                      "transition-all duration-200",
                      active ? "h-6 w-6" : "h-5 w-5"
                    )}
                  />
                </div>
              </button>
            );
          })}

          <button
            onClick={handleMoreClick}
            className={cn(
              "flex flex-col items-center justify-center min-w-[48px] min-h-[56px] rounded-xl transition-all duration-200 flex-1",
              "active:scale-95 touch-manipulation",
              isAnyDrawerItemActive() || isDrawerOpen
                ? "text-primary"
                : "text-muted-foreground hover:text-primary/70"
            )}
            aria-label="Mais"
            title="Mais opções"
          >
            <div
              className={cn(
                "p-2 rounded-lg transition-all duration-200",
                (isAnyDrawerItemActive() || isDrawerOpen) && "bg-primary/10"
              )}
            >
              <MoreHorizontal
                className={cn(
                  "transition-all duration-200",
                  isAnyDrawerItemActive() || isDrawerOpen ? "h-6 w-6" : "h-5 w-5"
                )}
              />
            </div>
          </button>
        </div>
      </nav>

      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent 
          className="bg-[#0a0a0a] border-primary/20 max-h-[85vh]"
          style={{
            background: 'rgba(10, 10, 10, 0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <DrawerHeader className="border-b border-primary/10 pb-4">
            <DrawerTitle className="text-lg font-semibold text-foreground">
              Mais Opções
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              Acesse todas as funcionalidades da plataforma
            </DrawerDescription>
          </DrawerHeader>
          
          <ScrollArea className="flex-1 px-4 py-2" style={{ maxHeight: 'calc(85vh - 120px)' }}>
            <div className="space-y-6 pb-8">
              {drawerSections.map((section) => (
                <div key={section.title}>
                  <h3 className="text-xs font-semibold text-primary/80 uppercase tracking-wider mb-3 px-1">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      
                      return (
                        <DrawerClose asChild key={item.path}>
                          <button
                            onClick={() => handleDrawerItemClick(item.path)}
                            className={cn(
                              "w-full flex items-center gap-4 min-h-[48px] px-3 py-3 rounded-xl transition-all duration-200",
                              "active:scale-[0.98] touch-manipulation",
                              active
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-foreground hover:bg-white/5 border border-transparent"
                            )}
                          >
                            <div
                              className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                                active 
                                  ? "bg-primary/20" 
                                  : "bg-white/5"
                              )}
                            >
                              <Icon 
                                className={cn(
                                  "w-5 h-5 transition-colors",
                                  active ? "text-primary" : "text-muted-foreground"
                                )} 
                              />
                            </div>
                            <span className={cn(
                              "flex-1 text-left font-medium",
                              active ? "text-primary" : "text-foreground"
                            )}>
                              {item.label}
                            </span>
                            <ChevronRight 
                              className={cn(
                                "w-5 h-5 flex-shrink-0",
                                active ? "text-primary/60" : "text-muted-foreground/40"
                              )} 
                            />
                          </button>
                        </DrawerClose>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </>
  );
}
