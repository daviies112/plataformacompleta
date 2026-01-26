import { ReactNode } from 'react';
import { AppHeader } from '@/features/revendedora/components/AppHeader';
import { useCompanyBranding } from '@/features/revendedora/hooks/useCompanyBranding';
import { useCompany } from '@/features/revendedora/contexts/CompanyContext';

interface AdminLayoutProps {
  children: ReactNode;
  basePath?: string;
}

export function AdminLayout({ children, basePath = '/produto/admin' }: AdminLayoutProps) {
  const { company } = useCompanyBranding();
  const { loading } = useCompany();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader 
        type="admin"
        basePath={basePath}
        companyName={company?.company_name}
        companyLogo={company?.logo_url}
      />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
