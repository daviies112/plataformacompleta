import { useLocation as useReactRouterLocation } from "react-router-dom";
import { Router, Route, Switch } from "wouter";
import { useMemo } from "react";
import FormularioPublico from "./FormularioPublico";

/**
 * Wrapper otimizado para FormularioPublico
 * 
 * OTIMIZAÇÕES:
 * ✅ Usa pathname atual diretamente para Wouter (sem depender de params)
 * ✅ Sem providers bloqueantes
 * ✅ Renderização instantânea
 * 
 * ROTAS SUPORTADAS:
 * - /f/:token
 * - /form/:companySlug/:formSlug  
 * - /formulario/:companySlug/form/:formSlug
 * - /:companySlug/form/:formSlug
 */
const FormularioPublicoWrapper = () => {
  const location = useReactRouterLocation();
  
  // Hook customizado para Wouter que usa o pathname atual do React Router
  const customHook = useMemo(() => {
    return () => [location.pathname, () => {}] as const;
  }, [location.pathname]);
  
  return (
    <Router hook={customHook as any}>
      <Switch>
        <Route path="/f/:token">
          <FormularioPublico />
        </Route>
        <Route path="/form/:companySlug/:id">
          <FormularioPublico />
        </Route>
        <Route path="/formulario/:companySlug/form/:id">
          <FormularioPublico />
        </Route>
        <Route path="/:companySlug/form/:id">
          <FormularioPublico />
        </Route>
        <Route>
          <FormularioPublico />
        </Route>
      </Switch>
    </Router>
  );
};

export default FormularioPublicoWrapper;
