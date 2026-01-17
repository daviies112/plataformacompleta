import { Link, useLocation } from 'react-router-dom';
import { Home, Package, DollarSign, Settings, LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState } from 'react';
import { useResellerAuth } from '../hooks/useResellerAuth';

interface Props {
  children: React.ReactNode;
}

export default function ResellerLayout({ children }: Props) {
  const [location] = useLocation();
  const { user, logout } = useResellerAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const menuItems = [
    { path: '/reseller/dashboard', icon: Home, label: 'Inicio' },
    { path: '/reseller/catalog', icon: Package, label: 'Catalogo' },
    { path: '/reseller/sales', icon: DollarSign, label: 'Minhas Vendas' },
    { path: '/reseller/settings', icon: Settings, label: 'Configuracoes' },
  ];

  const handleLogout = async () => {
    await logout();
  };

  const initials = user?.nome ? user.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'R';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden mr-2"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="button-toggle-sidebar"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          
          <div className="flex items-center gap-2 font-semibold">
            <Package className="h-5 w-5 text-purple-600" />
            <span className="hidden md:inline">Portal Revendedora</span>
          </div>
          
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <span>Comissao: {user?.comissao || 20}%</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-purple-100 text-purple-700">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-sm font-medium">{user?.nome || 'Revendedora'}</span>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className={`${sidebarOpen ? 'block' : 'hidden'} md:block fixed md:sticky top-14 z-40 h-[calc(100vh-3.5rem)] w-64 bg-background border-r p-4`}>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      isActive 
                        ? 'bg-purple-100 text-purple-900 dark:bg-purple-900/20 dark:text-purple-100' 
                        : 'hover-elevate text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
