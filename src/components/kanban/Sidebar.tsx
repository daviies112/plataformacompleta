import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: 'Quadros',
      path: '/',
    },
  ];

  return (
    <aside className="w-64 bg-card border-r border-border h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6" />
          Kanban Board
        </h1>
      </div>
      
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
                           (item.path === '/' && location.pathname.startsWith('/board'));
            
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start',
                    isActive && 'bg-secondary'
                  )}
                  data-testid={`sidebar-${item.label.toLowerCase()}`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>
      
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Área de trabalho do Trello
        </p>
      </div>
    </aside>
  );
};
