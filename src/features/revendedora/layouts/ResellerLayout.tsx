import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/features/revendedora/components/AppHeader';
import { useCompany } from '@/features/revendedora/contexts/CompanyContext';
import { ChatWidget } from '@/features/revendedora/components/chat/ChatWidget';
import { SupabaseProvider, useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { getResellerToken } from '@/features/revendedora/lib/resellerAuth';

interface ResellerLayoutProps {
  children: ReactNode;
}

function ResellerLayoutContent({ children }: ResellerLayoutProps) {
  const navigate = useNavigate();
  const { loading: companyLoading, branding, brandingLoading } = useCompany();
  const { loading: supabaseLoading, configured } = useSupabase();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = getResellerToken();
    if (!token) {
      navigate('/revendedora/login', { replace: true });
    } else {
      setAuthChecked(true);
    }
  }, [navigate]);

  if (!authChecked || companyLoading || supabaseLoading || brandingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        '--dynamic-primary': branding.primary_color,
        '--dynamic-secondary': branding.secondary_color,
        '--dynamic-accent': branding.accent_color,
        '--dynamic-sidebar-bg': branding.sidebar_background,
        '--dynamic-sidebar-text': branding.sidebar_text,
        '--dynamic-button': branding.button_color,
        '--dynamic-button-text': branding.button_text_color,
      } as React.CSSProperties}
    >
      <AppHeader 
        type="reseller" 
        companyName={branding.company_name || "Sistema de Revendedores"}
        companyLogo={branding.logo_url}
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
