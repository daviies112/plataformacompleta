import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/features/revendedora/components/AppHeader';
import { useCompany } from '@/features/revendedora/contexts/CompanyContext';
import { useBranding } from '@/features/revendedora/hooks/useBranding';
import { ChatWidget } from '@/features/revendedora/components/chat/ChatWidget';
import { SupabaseProvider, useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { getResellerToken } from '@/features/revendedora/lib/resellerAuth';

interface ResellerLayoutProps {
  children: ReactNode;
}

function ResellerLayoutContent({ children }: ResellerLayoutProps) {
  const navigate = useNavigate();
  const { loading: companyLoading } = useCompany();
  const { loading: supabaseLoading, configured } = useSupabase();
  const { branding, loading: brandingLoading } = useBranding();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = getResellerToken();
    if (!token) {
      navigate('/revendedora/login', { replace: true });
    } else {
      setAuthChecked(true);
    }
  }, [navigate]);

  if (!authChecked || companyLoading || supabaseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
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
  );
}

export function ResellerLayout({ children }: ResellerLayoutProps) {
  return (
    <SupabaseProvider>
      <ResellerLayoutContent>{children}</ResellerLayoutContent>
    </SupabaseProvider>
  );
}
