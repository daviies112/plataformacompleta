import { useLocation } from 'react-router-dom';
import { Suspense, lazy, useMemo } from 'react';
import { FormLoader } from '@/features/formularios-platform/components/FormLoader';
import { usePlatform } from './shared/hooks/usePlatform';
import { Loader2 } from 'lucide-react';

// Componentes principais - imports estáticos para evitar problemas de lazy loading em dev
import DesktopApp from './desktop/DesktopApp';
import MobileApp from './mobile/MobileApp';
// ✅ CRITICAL FIX: FormularioPublicoWrapper MUST use static import
// Lazy loading was causing a separate bundle that wasn't updated by HMR
import FormularioPublicoWrapper from '@/features/formularios-platform/pages/FormularioPublicoWrapper';

// Rotas públicas - lazy loading para performance (carregam separadamente)
const ReuniaoPublica = lazy(() => import('@/pages/ReuniaoPublica'));
const PublicWorkspaceApp = lazy(() => import('@/PublicWorkspaceApp'));

// Fallback loading simples e leve
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

/**
 * PlatformRouter - Roteador inteligente que decide qual app renderizar
 * 
 * Prioridade de roteamento:
 * 1. Formularios publicos (/formulario/:slug/form/:id, /form/:id, /f/:token)
 * 2. Reunioes publicas (/reuniao/)
 * 3. Plataforma Revendedora (/reseller, /reseller-login)
 * 4. Desktop ou Mobile (baseado no dispositivo)
 */
const PlatformRouter = () => {
  const location = useLocation();
  const { isMobile } = usePlatform();

  // Detectar se é uma rota pública de formulário
  // Padrões: /formulario/:slug/form/:id, /:slug/form/:id, /form/:id, /f/:token
  const isPublicFormRoute = useMemo(() => {
    const path = location.pathname;

    // /formulario/:companySlug/form/:id - formato com slug da empresa
    if (/^\/formulario\/[^/]+\/form\/[^/]+/.test(path)) {
      return true;
    }

    // /:companySlug/form/:id - formato curto com slug da empresa
    if (/^\/[^/]+\/form\/[^/]+/.test(path) && !path.startsWith('/formulario')) {
      return true;
    }

    // /form/:id - acesso público direto
    if (/^\/form\/[^/]+/.test(path)) {
      return true;
    }

    // /f/:token - acesso com token
    if (/^\/f\/[^/]+/.test(path)) {
      return true;
    }

    return false;
  }, [location.pathname]);

  // Detectar se é uma rota pública de workspace
  // Padrões: /w/:token, /workspace/share/:token
  const isPublicWorkspaceRoute = useMemo(() => {
    return /^\/w\/[^/]+/.test(location.pathname) || /^\/workspace\/share\/[^/]+/.test(location.pathname);
  }, [location.pathname]);

  // Se for uma rota pública de formulário, renderizar diretamente
  if (isPublicFormRoute) {
    return <FormularioPublicoWrapper />;
  }

  // Se for uma rota publica de reuniao, renderizar diretamente
  if (location.pathname.startsWith('/reuniao/') || location.pathname.startsWith('/reuniao-publica/')) {
    return <Suspense fallback={<LoadingFallback />}><ReuniaoPublica /></Suspense>;
  }

  // Se for uma rota pública de workspace, renderizar diretamente
  if (isPublicWorkspaceRoute) {
    return <Suspense fallback={<LoadingFallback />}><PublicWorkspaceApp /></Suspense>;
  }

  // Componentes principais não precisam de Suspense (imports estáticos)
  return isMobile ? <MobileApp /> : <DesktopApp />;
};

export default PlatformRouter;
