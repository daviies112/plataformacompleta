import { Link, useLocation } from 'react-router-dom';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavLinkProps {
  to: string;
  label: string;
  icon: LucideIcon;
}

export function NavLink({ to, label, icon: Icon }: NavLinkProps) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link to={to}>
      <SidebarMenuButton className={cn(isActive && 'bg-accent')}>
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </SidebarMenuButton>
    </Link>
  );
}
