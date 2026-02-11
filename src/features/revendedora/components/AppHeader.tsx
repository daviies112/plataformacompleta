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
  Store,
  Percent,
  Palette,
  Menu,
  ClipboardList,
  Trophy,
  Settings,
  Banknote,
  LogOut,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { clearResellerToken } from '@/features/revendedora/lib/resellerAuth';

interface AppHeaderProps {
  type?: 'admin' | 'reseller' | 'company';
  role?: string;
  companyName?: string;
  companyLogo?: string | null;
  basePath?: string;
}

const getAdminItems = (basePath: string) => ({
  etiqueta: [
    { title: 'Etiqueta', url: '/produto/admin/tags', icon: Tag },
    { title: 'Produtos', url: '/produto/admin/products', icon: Package },
    { title: 'Solicitações', url: '/produto/admin/product-requests', icon: ClipboardList },
  ],
  revendedoras: [
    { title: 'Revendedores', url: '/revendedora/admin/resellers', icon: Users, id: 'admin-resellers' },
    { title: 'Configurar Comissões', url: '/revendedora/admin/commission-config', icon: Percent, id: 'admin-commissions' },
    { title: 'Personalização', url: '/revendedora/admin/branding', icon: Palette },
  ],
  vendas: [
    { title: 'Dashboard', url: '/vendas/dashboard', icon: LayoutDashboard },
    { title: 'Dados Bancários', url: '/vendas/dados-bancarios', icon: Banknote },
    { title: 'Analytics', url: '/vendas/analytics', icon: BarChart3 },
  ],
});

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
  basePath = '/produto/admin',
}: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const adminSections = getAdminItems(basePath);

  const isRevendedoraAdmin = location.pathname.includes('/revendedora/admin');

  const isActive = (url: string) => {
    if (isRevendedoraAdmin && !url.includes('/revendedora/admin')) {
      return false;
    }
    return location.pathname === url || location.pathname.startsWith(url);
  };

  const allAdminItems = type === 'admin' || role === 'admin'
    ? [...adminSections.etiqueta, ...adminSections.revendedoras, ...adminSections.vendas]
    : [];

  const items = type === 'admin' || role === 'admin' ? allAdminItems : resellerItems;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 gap-4">
        <nav className="hidden lg:flex flex-1 items-center gap-1 overflow-x-auto">
          {isRevendedoraAdmin ? (
            <div className="flex items-center gap-2 px-2 py-1 rounded-md ml-2">
              {adminSections.revendedoras.filter(item => item.id).map((item: any) => {
                const Icon = item.icon;
                const active = isActive(item.url);
                return (
                  <button
                    key={item.url}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('navigate-admin', { detail: item.id }));
                    }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all whitespace-nowrap shadow-sm',
                      active
                        ? 'bg-primary text-white ring-2 ring-primary/30 scale-105'
                        : 'bg-muted/20 text-white hover:bg-white/20 hover:scale-105'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </button>
                );
              })}
            </div>
          ) : (
            (type === 'admin' || role === 'admin') ? (
              <>
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/30">
                  {adminSections.etiqueta.map((item) => {
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
                </div>

                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/30 ml-2">
                  {adminSections.revendedoras.map((item) => {
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
                </div>

                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/30 ml-2">
                  {adminSections.vendas.map((item) => {
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
                </div>
              </>
            ) : (
              items.filter(item => item.title !== 'Dashboard').map((item) => {
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
              })
            )
          )}
        </nav>

        <div className="flex lg:hidden items-center gap-2 px-2 py-1 rounded-md ml-2">
          {isRevendedoraAdmin ? (
            adminSections.revendedoras.filter(item => item.id).map((item: any) => {
              const Icon = item.icon;
              const active = isActive(item.url);
              return (
                <button
                  key={item.url}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('navigate-admin', { detail: item.id }));
                  }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap shadow-sm',
                    active
                      ? 'bg-primary text-white ring-2 ring-primary/30 scale-105'
                      : 'bg-muted/20 text-white hover:bg-white/20 hover:scale-105'
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {item.title}
                </button>
              );
            })
          ) : (
             (type === 'admin' || role === 'admin') && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px]">
                  <SheetHeader>
                    <SheetTitle className="text-left">Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-4 mt-6">
                    <div className="space-y-2">
                      {adminSections.etiqueta.map((item) => (
                        <NavLink key={item.url} to={item.url} className={cn('flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md', isActive(item.url) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent')}>
                          <item.icon className="h-4 w-4" /> {item.title}
                        </NavLink>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {adminSections.revendedoras.map((item: any) => (
                        <NavLink key={item.url} to={item.url} className={cn('flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md', isActive(item.url) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent')}>
                          <item.icon className="h-4 w-4" /> {item.title}
                        </NavLink>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {adminSections.vendas.map((item) => (
                        <NavLink key={item.url} to={item.url} className={cn('flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md', isActive(item.url) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent')}>
                          <item.icon className="h-4 w-4" /> {item.title}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {type === 'reseller' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/revendedora/reseller/settings')}
                title="Configurações"
                data-testid="button-settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  clearResellerToken();
                  navigate('/revendedora/login', { replace: true });
                }}
                title="Sair"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
