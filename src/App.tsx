import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { queryClient } from "./lib/queryClient";
import { InstallPWAButton } from "./components/InstallPWAButton";
import { MonitoringProvider } from "./components/MonitoringProvider";
import { Loader2 } from "lucide-react";

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const FormLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background">
    <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
    <p className="text-muted-foreground text-sm">Carregando formulário...</p>
  </div>
);

// Static imports for main components to avoid Suspense issues in development
import PlatformRouter from './platforms/PlatformRouter';

// ✅ OTIMIZAÇÃO: FormularioPublicoWrapper agora é importação síncrona (muito leve)
import FormularioPublicoWrapper from './features/formularios-platform/pages/FormularioPublicoWrapper';

// Lazy loaded routes
const AssinaturaClientPage = lazy(() => import('./pages/AssinaturaClientPage'));
const AssinaturaFromMeeting = lazy(() => import('./pages/AssinaturaFromMeeting'));
const ReuniaoPublica = lazy(() => import('./pages/ReuniaoPublica'));
const PublicStore = lazy(() => import('./features/revendedora/pages/public/PublicStore'));
const PublicCheckout = lazy(() => import('./features/revendedora/pages/public/PublicCheckout'));
const LoginPage = lazy(() => import('./pages/Index'));
const ResellerLogin = lazy(() => import('./platforms/reseller/pages/Login'));

// ✅ OTIMIZAÇÃO: Função que verifica se é rota pública ANTES de montar providers
const isPublicRoutePath = (path: string): boolean => {
  return (
    path === '/' ||
    path === '/login' ||
    path === '/reseller-login' ||
    path.startsWith('/assinar/') ||
    path.startsWith('/assinatura/') ||
    path.startsWith('/f/') ||
    path.startsWith('/form/') ||
    path.startsWith('/formulario/') ||
    path.startsWith('/reuniao/') ||
    path.startsWith('/reuniao-publica/') ||
    path.startsWith('/loja/') ||
    path.startsWith('/checkout/') ||
    /^\/[^/]+\/form\//.test(path)
  );
};

const PublicRoutes = () => {
  const location = useLocation();
  const path = location.pathname;
  
  if (path.startsWith('/assinar/')) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <AssinaturaClientPage />
      </Suspense>
    );
  }
  
  if (path.startsWith('/assinatura/')) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <AssinaturaFromMeeting />
      </Suspense>
    );
  }
  
  if (path.startsWith('/f/') || 
      path.startsWith('/form/') || 
      path.startsWith('/formulario/') ||
      /^\/[^/]+\/form\//.test(path)) {
    // ✅ OTIMIZAÇÃO: FormularioPublicoWrapper é síncrono, não precisa Suspense
    return <FormularioPublicoWrapper />;
  }
  
  if (path.startsWith('/reuniao/') || path.startsWith('/reuniao-publica/')) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ReuniaoPublica />
      </Suspense>
    );
  }
  
  if (path.startsWith('/loja/')) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PublicStore />
      </Suspense>
    );
  }
  
  if (path.startsWith('/checkout/')) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PublicCheckout />
      </Suspense>
    );
  }
  
  if (path === '/login' || path === '/') {
    return (
      <AuthProvider>
        <Suspense fallback={<LoadingFallback />}>
          <LoginPage />
        </Suspense>
      </AuthProvider>
    );
  }
  
  if (path === '/reseller-login') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ResellerLogin />
      </Suspense>
    );
  }
  
  return null;
};

const isPublicRoute = (path: string): boolean => {
  return (
    path === '/' ||
    path === '/login' ||
    path === '/reseller-login' ||
    path.startsWith('/assinar/') ||
    path.startsWith('/assinatura/') ||
    path.startsWith('/f/') ||
    path.startsWith('/form/') ||
    path.startsWith('/formulario/') ||
    path.startsWith('/reuniao/') ||
    path.startsWith('/reuniao-publica/') ||
    path.startsWith('/loja/') ||
    path.startsWith('/checkout/') ||
    /^\/[^/]+\/form\//.test(path)
  );
};

const AppRoutes = () => {
  const location = useLocation();
  
  if (isPublicRoute(location.pathname)) {
    return <PublicRoutes />;
  }
  
  return (
    <AuthProvider>
      <NotificationProvider>
        <PlatformRouter />
        <InstallPWAButton />
      </NotificationProvider>
    </AuthProvider>
  );
};

// ✅ OTIMIZAÇÃO: Componente App com renderização condicional de MonitoringProvider
// Rotas públicas NÃO carregam MonitoringProvider para renderizar mais rápido
const App = () => {
  // Verifica se é rota pública ANTES de montar qualquer provider pesado
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isPublic = isPublicRoutePath(currentPath);
  
  // Para rotas públicas, usa estrutura minimalista sem MonitoringProvider
  if (isPublic) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="dark" 
          enableSystem={false} 
          storageKey="nexus-theme" 
          disableTransitionOnChange
        >
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }
  
  // Para rotas privadas, usa estrutura completa com MonitoringProvider
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider 
        attribute="class" 
        defaultTheme="dark" 
        enableSystem={false} 
        storageKey="nexus-theme" 
        disableTransitionOnChange
      >
        <TooltipProvider>
          <MonitoringProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <AppRoutes />
            </BrowserRouter>
          </MonitoringProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
