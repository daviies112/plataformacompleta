import { useEffect, useState } from 'react';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { hexToHSL } from '@/utils/colorExtractor';

interface BrandingConfig {
  primary_color: string;
  secondary_color: string;
  accent_color?: string;
  logo_url?: string;
  company_name?: string;
}

export function useBranding(companyId?: string) {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (supabaseLoading) return;
    
    const fetchBranding = async () => {
      try {
        setLoading(true);
        console.log('[useBranding] Fetching branding config...', { companyId });
        
        if (!supabase) {
          console.log('[useBranding] Supabase not configured');
          setLoading(false);
          return;
        }
        
        let query = supabase
          .from('companies' as any)
          .select('primary_color, secondary_color, accent_color, logo_url, company_name');
        
        if (companyId) {
          query = query.eq('id', companyId);
        }
        
        const { data, error } = await query.limit(1).maybeSingle();

        if (error) {
          console.error('[useBranding] Error fetching branding:', error);
          return;
        }

        if (data) {
          const brandingData = data as any as BrandingConfig;
          console.log('[useBranding] ✅ Branding loaded:', brandingData);
          setBranding(brandingData);
          applyBrandingColors(brandingData);
        } else {
          console.log('[useBranding] No branding data found');
        }
      } catch (error) {
        console.error('[useBranding] Error in fetchBranding:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();

    if (!supabase) {
      return;
    }

    console.log('[useBranding] 🔴 Setting up REALTIME subscription for companies table...');
    
    const subscription = supabase
      .channel('companies_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'companies',
        },
        (payload) => {
          console.log('[useBranding] 🔥 REALTIME UPDATE RECEIVED:', payload);
          console.log('[useBranding] Reloading branding...');
          fetchBranding();
        }
      )
      .subscribe((status) => {
        console.log('[useBranding] Subscription status:', status);
      });

    return () => {
      console.log('[useBranding] Unsubscribing from companies changes');
      subscription.unsubscribe();
    };
  }, [companyId, supabase, supabaseLoading]);

  return { branding, loading: loading || supabaseLoading };
}

export function applyBrandingColors(branding: BrandingConfig) {
  const root = document.documentElement;
  
  if (branding.primary_color) {
    const primaryHSL = hexToHSL(branding.primary_color);
    root.style.setProperty('--primary', primaryHSL);
    root.style.setProperty('--sidebar-primary', primaryHSL);
    root.style.setProperty('--sidebar-ring', primaryHSL);
  }
  
  if (branding.secondary_color) {
    const secondaryHSL = hexToHSL(branding.secondary_color);
    root.style.setProperty('--secondary', secondaryHSL);
  }
  
  if (branding.accent_color) {
    const accentHSL = hexToHSL(branding.accent_color);
    root.style.setProperty('--accent', accentHSL);
  }
}
