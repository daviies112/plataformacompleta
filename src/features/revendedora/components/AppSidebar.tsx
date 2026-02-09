import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
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
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AppSidebarProps {
  type?: 'admin' | 'reseller' | 'company';
  role?: string;
  companyName?: string;
  companyLogo?: string | null;
}

const adminItems = [
  { title: 'Dashboard', url: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'Produtos', url: '/admin/products', icon: Package },
  { title: 'Revendedores', url: '/admin/resellers', icon: Users },
  { title: 'Configurar Comissões', url: '/admin/commission-config', icon: Percent },
  { title: 'Analytics', url: '/admin/analytics', icon: BarChart3 },
  { title: 'Personalização', url: '/admin/branding', icon: Palette },
];

const resellerItems = [
  { title: 'Dashboard', url: '/reseller/dashboard', icon: LayoutDashboard },
  { title: 'Produtos', url: '/reseller/products', icon: Package },
  { title: 'Vendas', url: '/reseller/sales', icon: TrendingUp },
  { title: 'Links de Pagamento', url: '/reseller/payment-links', icon: LinkIcon },
  { title: 'Financeiro', url: '/reseller/financial', icon: Wallet },
  { title: 'Saques', url: '/reseller/withdrawals', icon: ArrowDownToLine },
  { title: 'Minha Loja', url: '/reseller/store', icon: Store },
  { title: 'Equipe', url: '/reseller/team', icon: UsersRound },
];

export function AppSidebar({ type = 'reseller', role, companyName = 'UP Vendas', companyLogo }: AppSidebarProps) {
  const navigate = useNavigate();
  const items = (type === 'admin' || role === 'admin') ? adminItems : resellerItems;

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-3 mb-2">
          {companyLogo ? (
            <img src={companyLogo} alt={companyName} className="h-8 w-8 object-contain rounded" />
          ) : (
            <Building2 className="h-8 w-8 text-primary" />
          )}
          <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {companyName}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          {(type === 'admin' || role === 'admin') ? 'Administrador' : 'Revendedor'}
        </p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <NavLink
                    to={item.url}
                    icon={item.icon}
                    label={item.title}
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start"
          onClick={() => navigate('/revendedora')}
        >
          <Home className="mr-2 h-4 w-4" />
          Voltar ao Início
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
