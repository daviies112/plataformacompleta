import { useParams as useReactRouterParams, useLocation as useReactRouterLocation } from "react-router-dom";
import { Router, Route } from "wouter";
import { useMemo } from "react";
import FormularioPublico from "./FormularioPublico";

/**
 * Wrapper otimizado para FormularioPublico
 * 
 * OTIMIZAÇÕES (removidos de App.tsx):
 * ✅ Removido: QueryClientProvider (já em App.tsx)
 * ✅ Removido: TooltipProvider (já em App.tsx)  
 * ✅ Removido: Suspense + fallback (já em App.tsx com fallback otimizado)
 * ✅ Simplificado: Lógica de extração de parâmetros manual
 * ✅ Mantido: Router/Wouter (necessário - FormularioPublico usa useParams() do wouter)
 * 
 * Resultado: Renderização instantânea, providers não bloqueiam,
 * apenas o Router está presente para passar parâmetros ao FormularioPublico
 */
const FormularioPublicoWrapper = () => {
  const reactRouterParams = useReactRouterParams<{ token?: string; id?: string; companySlug?: string }>();
  const location = useReactRouterLocation();
  
  // Usa parâmetros do React Router se disponíveis
  const params = reactRouterParams;
  
  // Determina qual rota Wouter usar baseado nos parâmetros disponíveis
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
  
  // Hook customizado para Wouter que sempre retorna o caminho correto
  const customHook = useMemo(() => {
    return () => [wooterPath, () => {}] as const;
  }, [wooterPath]);
  
  return (
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
  );
};

export default FormularioPublicoWrapper;
