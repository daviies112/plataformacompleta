import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useSupabase } from './SupabaseContext';
import { useAdminSupabase } from './AdminSupabaseContext';
import type { Tables } from '@/features/revendedora/integrations/supabase/types';

type Reseller = Tables<'resellers'>;

interface BrandingConfig {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  sidebar_background: string;
  sidebar_text: string;
  button_color: string;
  button_text_color: string;
  text_color: string;
  heading_color: string;
  selected_item_color: string;
  logo_url: string | null;
  logo_size: string;
  logo_position: string;
  company_name: string;
}

const DEFAULT_BRANDING: BrandingConfig = {
  primary_color: '#9b87f5',
  secondary_color: '#7e69ab',
  accent_color: '#d946ef',
  background_color: '#ffffff',
  sidebar_background: '#1a1a1a',
  sidebar_text: '#ffffff',
  button_color: '#9b87f5',
  button_text_color: '#ffffff',
  text_color: '#000000',
  heading_color: '#1a1a1a',
  selected_item_color: '#9b87f5',
  logo_url: null,
  logo_size: 'medium',
  logo_position: 'left',
  company_name: 'NEXUS',
};

interface CompanyContextType {
  reseller: Reseller | null;
  branding: BrandingConfig;
  loading: boolean;
  brandingLoading: boolean;
  refetch: () => Promise<void>;
  refetchBranding: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

function hexToHSL(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 0%';
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyBrandingToCSS(branding: BrandingConfig) {
  const root = document.documentElement;
  
  root.style.setProperty('--brand-primary', branding.primary_color);
  root.style.setProperty('--brand-secondary', branding.secondary_color);
  root.style.setProperty('--brand-accent', branding.accent_color);
  root.style.setProperty('--brand-background', branding.background_color);
  root.style.setProperty('--brand-sidebar-bg', branding.sidebar_background);
  root.style.setProperty('--brand-sidebar-text', branding.sidebar_text);
  root.style.setProperty('--brand-button', branding.button_color);
  root.style.setProperty('--brand-button-text', branding.button_text_color);
  root.style.setProperty('--brand-text', branding.text_color);
  root.style.setProperty('--brand-heading', branding.heading_color);
  root.style.setProperty('--brand-selected', branding.selected_item_color);
  
  root.style.setProperty('--primary', hexToHSL(branding.primary_color));
  root.style.setProperty('--secondary', hexToHSL(branding.secondary_color));
  root.style.setProperty('--accent', hexToHSL(branding.accent_color));
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const resellerSupabase = useSupabase();
  const adminSupabase = useAdminSupabase();

  const supabaseContext = adminSupabase.configured ? adminSupabase : 
                          resellerSupabase.configured ? resellerSupabase :
                          { client: null, loading: resellerSupabase.loading || adminSupabase.loading, configured: false, error: null, refresh: async () => {} };

  const { client: supabase, loading: supabaseLoading, configured } = supabaseContext;
  const [reseller, setReseller] = useState<Reseller | null>(null);
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(false);
  const [brandingLoading, setBrandingLoading] = useState(true);

  const fetchBrandingData = useCallback(async () => {
    if (!supabase || !configured) {
      console.log('[CompanyContext] Supabase not configured, trying backend API...');
      setBrandingLoading(true);
      try {
        const response = await fetch('/api/public/branding');
        if (response.ok) {
          const data = await response.json();
          if (data && data.button_color) {
            console.log('[CompanyContext] Branding loaded from backend API');
            const newBranding: BrandingConfig = {
              primary_color: data.primary_color || DEFAULT_BRANDING.primary_color,
              secondary_color: data.secondary_color || DEFAULT_BRANDING.secondary_color,
              accent_color: data.accent_color || DEFAULT_BRANDING.accent_color,
              background_color: data.background_color || DEFAULT_BRANDING.background_color,
              sidebar_background: data.sidebar_background || DEFAULT_BRANDING.sidebar_background,
              sidebar_text: data.sidebar_text || DEFAULT_BRANDING.sidebar_text,
              button_color: data.button_color || DEFAULT_BRANDING.button_color,
              button_text_color: data.button_text_color || DEFAULT_BRANDING.button_text_color,
              text_color: data.text_color || DEFAULT_BRANDING.text_color,
              heading_color: data.heading_color || DEFAULT_BRANDING.heading_color,
              selected_item_color: data.selected_item_color || DEFAULT_BRANDING.selected_item_color,
              logo_url: data.logo_url || null,
              logo_size: data.logo_size || DEFAULT_BRANDING.logo_size,
              logo_position: data.logo_position || DEFAULT_BRANDING.logo_position,
              company_name: data.company_name || DEFAULT_BRANDING.company_name,
            };
            setBranding(newBranding);
            applyBrandingToCSS(newBranding);
            setBrandingLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('[CompanyContext] Backend API fallback failed:', err);
      }
      applyBrandingToCSS(DEFAULT_BRANDING);
      setBrandingLoading(false);
      return;
    }

    try {
      setBrandingLoading(true);
      console.log('[CompanyContext] Fetching branding from companies table...');
      
      const { data, error } = await supabase
        .from('companies' as any)
        .select(`
          company_name,
          primary_color,
          secondary_color,
          accent_color,
          background_color,
          sidebar_background,
          sidebar_text,
          button_color,
          button_text_color,
          text_color,
          heading_color,
          selected_item_color,
          logo_url,
          logo_size,
          logo_position,
          branding_updated_at
        `)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[CompanyContext] Error fetching branding:', error);
        return;
      }

      if (data) {
        console.log('[CompanyContext] Branding loaded from Supabase:', data);
        const companyData = data as any;
        
        const newBranding: BrandingConfig = {
          primary_color: companyData.primary_color || DEFAULT_BRANDING.primary_color,
          secondary_color: companyData.secondary_color || DEFAULT_BRANDING.secondary_color,
          accent_color: companyData.accent_color || DEFAULT_BRANDING.accent_color,
          background_color: companyData.background_color || DEFAULT_BRANDING.background_color,
          sidebar_background: companyData.sidebar_background || DEFAULT_BRANDING.sidebar_background,
          sidebar_text: companyData.sidebar_text || DEFAULT_BRANDING.sidebar_text,
          button_color: companyData.button_color || DEFAULT_BRANDING.button_color,
          button_text_color: companyData.button_text_color || DEFAULT_BRANDING.button_text_color,
          text_color: companyData.text_color || DEFAULT_BRANDING.text_color,
          heading_color: companyData.heading_color || DEFAULT_BRANDING.heading_color,
          selected_item_color: companyData.selected_item_color || DEFAULT_BRANDING.selected_item_color,
          logo_url: companyData.logo_url || null,
          logo_size: companyData.logo_size || DEFAULT_BRANDING.logo_size,
          logo_position: companyData.logo_position || DEFAULT_BRANDING.logo_position,
          company_name: companyData.company_name || DEFAULT_BRANDING.company_name,
        };
        
        setBranding(newBranding);
        applyBrandingToCSS(newBranding);
        console.log('[CompanyContext] Branding applied to CSS');
      } else {
        console.log('[CompanyContext] No branding found, using defaults');
        applyBrandingToCSS(DEFAULT_BRANDING);
      }
    } catch (error) {
      console.error('[CompanyContext] Error in fetchBrandingData:', error);
    } finally {
      setBrandingLoading(false);
    }
  }, [supabase, configured]);

  const fetchCompanyData = async () => {
    setReseller(null);
    setLoading(false);
  };

  useEffect(() => {
    if (supabaseLoading) {
      return;
    }
    
    fetchBrandingData();

    if (!supabase || !configured) {
      return;
    }

    const channel = supabase
      .channel('branding_updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'companies' },
        (payload) => {
          console.log('[CompanyContext] Branding update detected:', payload);
          fetchBrandingData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, supabaseLoading, configured, fetchBrandingData]);

  useEffect(() => {
    if (supabaseLoading || !configured) return;
    
    const interval = setInterval(() => {
      fetchBrandingData();
    }, 60000);

    return () => clearInterval(interval);
  }, [supabaseLoading, configured, fetchBrandingData]);

  return (
    <CompanyContext.Provider value={{ 
      reseller, 
      branding,
      loading, 
      brandingLoading,
      refetch: fetchCompanyData,
      refetchBranding: fetchBrandingData,
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

export function useBranding() {
  const { branding, brandingLoading, refetchBranding } = useCompany();
  return { branding, loading: brandingLoading, refetch: refetchBranding };
}

export type { BrandingConfig };
