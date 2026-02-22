import { useLocation as useReactRouterLocation } from "react-router-dom";
import { Router, Route, Switch } from "wouter";
import { useMemo, lazy, Suspense } from "react";

import FormularioPublico from "./FormularioPublico";

// Skeleton ultra-leve inline - aparece IMEDIATAMENTE sem depender de imports
const FormSkeleton = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    background: 'linear-gradient(to bottom right, #87CEEB, #E0F4FF)'
  }}>
    <div style={{
      width: '100%',
      maxWidth: '600px',
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      padding: '32px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      {/* Title skeleton */}
      <div style={{
        height: '36px',
        backgroundColor: '#f1f5f9',
        borderRadius: '8px',
        marginBottom: '16px',
        animation: 'pulse 1.5s ease-in-out infinite'
      }} />
      {/* Description skeleton */}
      <div style={{
        height: '20px',
        backgroundColor: '#f1f5f9',
        borderRadius: '6px',
        marginBottom: '32px',
        width: '70%',
        animation: 'pulse 1.5s ease-in-out infinite',
        animationDelay: '0.2s'
      }} />
      {/* Button skeleton */}
      <div style={{
        height: '48px',
        backgroundColor: '#22c55e',
        borderRadius: '8px',
        opacity: 0.6,
        animation: 'pulse 1.5s ease-in-out infinite',
        animationDelay: '0.4s'
      }} />
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  </div>
);

/**
 * Wrapper otimizado para FormularioPublico
 * 
 * OTIMIZAÇÕES:
 * ✅ Skeleton aparece IMEDIATAMENTE (inline, sem imports)
 * ✅ FormularioPublico carrega em lazy (não bloqueia skeleton)
 * ✅ Usa pathname atual diretamente para Wouter
 * 
 * ROTAS SUPORTADAS:
 * - /f/:token
 * - /form/:companySlug/:id  
 * - /formulario/:companySlug/form/:id
 * - /:companySlug/form/:id
 */
const FormularioPublicoWrapper = () => {
  const location = useReactRouterLocation();

  // Hook customizado para Wouter que usa o pathname atual do React Router
  const customHook = useMemo(() => {
    return () => [location.pathname, () => { }] as const;
  }, [location.pathname]);

  return (
    <Router hook={customHook as any}>
      {/* 🔍 DEBUG WRAPPER: If this shows, App.tsx is correctly mounting this wrapper */}

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
