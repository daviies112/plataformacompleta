import { PlusCircle, FolderOpen, LayoutDashboard, Sparkles } from "lucide-react";
import { Link, useRoute } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar";

const items = [
  { title: "Criar formulário", url: "/admin", icon: PlusCircle },
  { title: "Ver formulários", url: "/admin/formularios", icon: FolderOpen },
  { title: "Respostas", url: "/admin/dashboard", icon: LayoutDashboard },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="glass border-r border-border/50 backdrop-blur-xl">
      <SidebarContent className="py-4">
        {!collapsed && (
          <div className="px-4 mb-6 animate-fade-in">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary-glow/10 border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary animate-glow" />
              <span className="font-bold text-sm bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Premium
              </span>
            </div>
          </div>
        )}
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-4">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-2">
            <SidebarMenu className="space-y-1 px-2">
              {items.map((item) => {
                const [isActive] = useRoute(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <Link
                        to={item.url}
                        className={`
                          relative rounded-lg transition-all duration-300 group
                          ${
                            isActive
                              ? "bg-gradient-to-br from-primary/15 to-primary-glow/10 text-primary font-semibold shadow-md border border-primary/20"
                              : "hover:bg-sidebar-accent text-sidebar-foreground hover:scale-[1.02]"
                          }
                        `}
                      >
                        <item.icon className={`h-5 w-5 transition-all ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                        {!collapsed && (
                          <span className="transition-all">
                            {item.title}
                          </span>
                        )}
                        {isActive && !collapsed && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary animate-glow" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
