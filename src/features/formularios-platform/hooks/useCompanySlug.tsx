import { useQuery } from '@tanstack/react-query';

interface CompanySlugData {
  companyName: string | null;
  companySlug: string | null;
}

// Interface para formulário com slug opcional
interface FormWithSlug {
  id: string;
  slug?: string | null;
  [key: string]: any;
}

let cachedSlug: string | null = null;

function getTenantId(): string | null {
  try {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      const parsed = JSON.parse(userData);
      return parsed?.tenantId || null;
    }
    return localStorage.getItem('tenantId') || localStorage.getItem('tenant_id') || null;
  } catch {
    return null;
  }
}

export function useCompanySlug() {
  const { data, isLoading, error } = useQuery<CompanySlugData>({
    queryKey: ['/api/company-slug'],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      const tenantId = getTenantId();
      if (tenantId) {
        headers['x-tenant-id'] = tenantId;
      }
      const response = await fetch('/api/company-slug', { 
        credentials: 'include',
        headers 
      });
      if (!response.ok) {
        throw new Error('Failed to fetch company slug');
      }
      const data = await response.json();
      if (data.companySlug) {
        cachedSlug = data.companySlug;
      }
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    cacheTime: 10 * 60 * 1000, // Manter em cache por 10 minutos
  });

  const slug = data?.companySlug || cachedSlug || 'empresa';

  return {
    slug,
    companySlug: slug, // Alias para compatibilidade
    companyName: data?.companyName || null,
    isLoading,
    error,
  };
}

/**
 * Gera URL completa do formulário
 * @param formOrId - Pode ser um ID de formulário (string) ou um objeto form com slug opcional
 * @param companySlug - Slug da empresa
 * @returns URL completa para o formulário
 */
export function getFormUrl(formOrId: string | FormWithSlug, companySlug?: string): string {
  const slug = companySlug || 'empresa';
  
  // Se for um objeto form, preferir usar o slug do formulário
  if (typeof formOrId === 'object' && formOrId !== null) {
    const formSlug = formOrId.slug || formOrId.id;
    return `${window.location.origin}/formulario/${slug}/form/${formSlug}`;
  }
  
  // Fallback para string (ID do formulário)
  return `${window.location.origin}/formulario/${slug}/form/${formOrId}`;
}

/**
 * Gera URL curta do formulário (sem origin)
 * @param formOrId - Pode ser um ID de formulário (string) ou um objeto form com slug opcional
 * @param companySlug - Slug da empresa
 * @returns URL curta para o formulário
 */
export function getShortFormUrl(formOrId: string | FormWithSlug, companySlug?: string): string {
  const slug = companySlug || 'empresa';
  
  // Se for um objeto form, preferir usar o slug do formulário
  if (typeof formOrId === 'object' && formOrId !== null) {
    const formSlug = formOrId.slug || formOrId.id;
    return `/formulario/${slug}/form/${formSlug}`;
  }
  
  // Fallback para string (ID do formulário)
  return `/formulario/${slug}/form/${formOrId}`;
}

/**
 * Gera URL do formulário preferindo usar slug quando disponível
 * @param form - Objeto do formulário com slug opcional
 * @param companySlug - Slug da empresa
 * @returns URL completa para o formulário
 */
export function getFormUrlWithSlug(form: FormWithSlug, companySlug?: string): string {
  return getFormUrl(form, companySlug);
}

/**
 * Gera URL curta do formulário preferindo usar slug quando disponível
 * @param form - Objeto do formulário com slug opcional
 * @param companySlug - Slug da empresa
 * @returns URL curta para o formulário
 */
export function getShortFormUrlWithSlug(form: FormWithSlug, companySlug?: string): string {
  return getShortFormUrl(form, companySlug);
}
