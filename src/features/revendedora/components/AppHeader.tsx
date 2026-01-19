import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  Link as LinkIcon,
  Wallet,
  TrendingUp,
  ArrowDownToLine,
  UsersRound,
  BarChart3,
  Home,
  Store,
  Building2,
  Percent,
  Palette,
  Menu,
  ClipboardList,
  Trophy,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { NotificationBell } from '@/components/NotificationBell';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface AppHeaderProps {
  type?: 'admin' | 'reseller' | 'company';
  role?: string;
  companyName?: string;
  companyLogo?: string | null;
}

const adminItems = [
  { title: 'Dashboard', url: '/produto/admin/dashboard', icon: LayoutDashboard },
  { title: 'Produtos', url: '/produto/admin/products', icon: Package },
  { title: 'Solicitações', url: '/produto/admin/product-requests', icon: ClipboardList },
  { title: 'Revendedores', url: '/produto/admin/resellers', icon: Users },
  { title: 'Configurar Comissões', url: '/produto/admin/commission-config', icon: Percent },
  { title: 'Analytics', url: '/produto/admin/analytics', icon: BarChart3 },
  { title: 'Personalização', url: '/produto/admin/branding', icon: Palette },
];

const resellerItems = [
  { title: 'Dashboard', url: '/revendedora/reseller/dashboard', icon: LayoutDashboard },
  { title: 'Vendas', url: '/revendedora/reseller/sales', icon: TrendingUp },
  { title: 'Financeiro', url: '/revendedora/reseller/financial', icon: Wallet },
  { title: 'Minha Loja', url: '/revendedora/reseller/store', icon: Store },
  { title: 'Gamificação', url: '/revendedora/reseller/gamification', icon: Trophy },
  { title: 'Equipe', url: '/revendedora/reseller/team', icon: UsersRound },
  { title: 'Configurações', url: '/revendedora/reseller/settings', icon: Settings },
];

export function AppHeader({
  type = 'reseller',
  role,
  companyName = 'UP Vendas',
  companyLogo,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const items = type === 'admin' || role === 'admin' ? adminItems : resellerItems;

  const isActive = (url: string) => location.pathname === url || location.pathname.startsWith(url);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 gap-4">
        <div className="flex items-center gap-3 min-w-[200px]">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName}
              className="h-8 w-8 object-contain rounded"
            />
          ) : (
            <Building2 className="h-8 w-8 text-primary" />
          )}
          <div className="flex flex-col">
            <h2 className="text-sm font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {companyName}
            </h2>
            <p className="text-xs text-muted-foreground">
              {type === 'admin' || role === 'admin' ? 'Administrador' : 'Revendedor'}
            </p>
          </div>
        </div>

        <nav className="hidden lg:flex flex-1 items-center gap-1 overflow-x-auto">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.url}
                to={item.url}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
                  isActive(item.url)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </NavLink>
            );
          })}
        </nav>

        <Sheet>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="outline" size="sm">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px]">
            <SheetHeader>
              <SheetTitle className="text-left">Menu</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-2 mt-6">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive(item.url)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </NavLink>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button variant="ghost" size="sm" onClick={() => navigate(type === 'admin' || role === 'admin' ? '/produto' : '/revendedora')}>
            <Home className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
