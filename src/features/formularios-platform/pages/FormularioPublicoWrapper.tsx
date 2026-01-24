import { useParams as useReactRouterParams, useLocation as useReactRouterLocation } from "react-router-dom";
import { Router, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "../components/ui/tooltip";
import { SupabaseConfigProvider } from "../contexts/SupabaseConfigContext";
import { queryClient } from "../lib/queryClient";
import { useMemo, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const FormularioPublico = lazy(() => import("./FormularioPublico"));

const FormLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background">
    <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
    <p className="text-muted-foreground text-sm">Carregando formulário...</p>
  </div>
);

/**
 * Extrai parâmetros diretamente da URL pathname
 * Usado quando o componente é renderizado fora do contexto de Route do React Router
 */
function extractParamsFromPath(pathname: string): { token?: string; id?: string; companySlug?: string } {
  // Remover query string do pathname (não deveria ter, mas por segurança)
  const cleanPath = pathname.split('?')[0];
  
  // /f/:token
  const tokenMatch = cleanPath.match(/^\/f\/([^/]+)/);
  if (tokenMatch) {
    return { token: decodeURIComponent(tokenMatch[1]) };
  }
  
  // /formulario/:companySlug/form/:id
  const formularioMatch = cleanPath.match(/^\/formulario\/([^/]+)\/form\/([^/]+)/);
  if (formularioMatch) {
    return { 
      companySlug: decodeURIComponent(formularioMatch[1]), 
      id: decodeURIComponent(formularioMatch[2]) 
    };
  }
  
  // /:companySlug/form/:id (sem prefixo /formulario)
  const slugFormMatch = cleanPath.match(/^\/([^/]+)\/form\/([^/]+)/);
  if (slugFormMatch) {
    return { 
      companySlug: decodeURIComponent(slugFormMatch[1]), 
      id: decodeURIComponent(slugFormMatch[2]) 
    };
  }
  
  // /form/:id
  const formMatch = cleanPath.match(/^\/form\/([^/]+)/);
  if (formMatch) {
    return { id: decodeURIComponent(formMatch[1]) };
  }
  
  return {};
}

/**
 * Wrapper para FormularioPublico que permite usá-lo com React Router
 * 
 * FormularioPublico usa Wouter internamente, mas este wrapper permite
 * que ele seja chamado de rotas do React Router nas apps Desktop/Mobile.
 * 
 * Suporta múltiplos formatos de URL:
 * - /f/:token (com token de lead)
 * - /form/:id (acesso público direto)
 * - /formulario/:companySlug/form/:id (acesso público com slug da empresa)
 * - /:companySlug/form/:id (acesso público com slug da empresa)
 */
const FormularioPublicoWrapper = () => {
  const reactRouterParams = useReactRouterParams<{ token?: string; id?: string; companySlug?: string }>();
  const location = useReactRouterLocation();
  
  // Usar parâmetros do React Router se disponíveis, senão extrair da URL
  const params = useMemo(() => {
    if (reactRouterParams.token || reactRouterParams.id || reactRouterParams.companySlug) {
      return reactRouterParams;
    }
    // Fallback: extrair parâmetros diretamente da URL
    return extractParamsFromPath(location.pathname);
  }, [reactRouterParams, location.pathname]);
  
  // Determine qual rota usar baseado nos parâmetros disponíveis
  const wooterPath = useMemo(() => {
    if (params.token) {
      return `/f/${params.token}`;
    } else if (params.companySlug && params.id) {
      return `/${params.companySlug}/form/${params.id}`;
    } else if (params.id) {
      return `/form/${params.id}`;
    }
    return '/';
  }, [params.token, params.id, params.companySlug]);
  
  // Create a custom hook that always returns the current path
  const customHook = useMemo(() => {
    return () => [wooterPath, () => {}] as const;
  }, [wooterPath]);
  
  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseConfigProvider>
        <TooltipProvider>
          <Suspense fallback={<FormLoader />}>
            <Router hook={customHook as any}>
              <Route path="/f/:token">
                <FormularioPublico />
              </Route>
              <Route path="/:companySlug/form/:id">
                <FormularioPublico />
              </Route>
              <Route path="/form/:id">
                <FormularioPublico />
              </Route>
            </Router>
          </Suspense>
        </TooltipProvider>
      </SupabaseConfigProvider>
    </QueryClientProvider>
  );
};

export default FormularioPublicoWrapper;
