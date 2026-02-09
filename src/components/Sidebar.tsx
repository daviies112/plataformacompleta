import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  Settings,
  User,
  Palette,
  Video,
} from "lucide-react";
import { useStore } from "@/lib/mock-store";

export function Sidebar() {
  const [location] = useLocation();
  const tenant = useStore((state) => state.tenant);
  const user = useStore((state) => state.user);

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Calendar, label: "Calendário", href: "/calendario" },
    { icon: Settings, label: "Configurações", href: "/configuracoes" },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2 font-bold text-lg">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
            M
          </div>
          {tenant?.nome || "MeetFlow"}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                location === item.href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t p-4">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user?.nome || 'Usuário'}</span>
            <span className="text-xs text-muted-foreground">{user?.email || 'email@exemplo.com'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
