import { ReactNode } from 'react';
import { AppHeader } from '@/features/revendedora/components/AppHeader';
import { useCompany } from '@/features/revendedora/contexts/CompanyContext';
import { useBranding } from '@/features/revendedora/hooks/useBranding';
import { ChatWidget } from '@/features/revendedora/components/chat/ChatWidget';
import { SupabaseProvider } from '@/features/revendedora/contexts/SupabaseContext';

interface ResellerLayoutProps {
  children: ReactNode;
}

export function ResellerLayout({ children }: ResellerLayoutProps) {
  const { loading } = useCompany();
  const { branding, loading: brandingLoading } = useBranding();

  if (loading || brandingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SupabaseProvider>
      <div className="min-h-screen flex flex-col">
        <AppHeader 
          type="reseller" 
          companyName={branding?.company_name || "Sistema de Revendedores"}
          companyLogo={branding?.logo_url}
        />
        <main className="flex-1">
          {children}
        </main>
        <ChatWidget />
      </div>
    </SupabaseProvider>
  );
}
