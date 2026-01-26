import { useBranding as useBrandingFromContext, type BrandingConfig as BrandingConfigNew } from '@/features/revendedora/contexts/CompanyContext';

export type { BrandingConfigNew as BrandingConfig };
export { useBrandingFromContext };

interface BrandingConfigLegacy {
  primary_color: string;
  secondary_color: string;
  accent_color?: string;
  logo_url?: string;
  company_name?: string;
}

export function useBranding(_companyId?: string): { branding: BrandingConfigLegacy | null; loading: boolean } {
  const { branding: contextBranding, loading } = useBrandingFromContext();
  
  if (!contextBranding) {
    return { branding: null, loading };
  }
  
  const legacyBranding: BrandingConfigLegacy = {
    primary_color: contextBranding.primary_color || '#000000',
    secondary_color: contextBranding.secondary_color || '#666666',
    accent_color: contextBranding.accent_color,
    logo_url: contextBranding.logo_url,
    company_name: contextBranding.company_name,
  };
  
  return { branding: legacyBranding, loading };
}
