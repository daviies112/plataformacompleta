import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, useLocation, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { queryClient } from "./lib/queryClient";
import { InstallPWAButton } from "./components/InstallPWAButton";
import { MonitoringProvider } from "./components/MonitoringProvider";

// ✅ OTIMIZAÇÃO: Imports ESTÁTICOS apenas para o roteador principal (muito leve)
import PlatformRouter from './platforms/PlatformRouter';

// ✅ OTIMIZAÇÃO CRÍTICA: FormularioPublicoWrapper usa import ESTÁTICO
// para eliminar delay de 15 segundos em rotas públicas
import FormularioPublicoWrapper from './features/formularios-platform/pages/FormularioPublicoWrapper';

// Outras páginas usam lazy loading (não são críticas para tempo de carga)
const AssinaturaClientPage = lazy(() => import('./pages/AssinaturaClientPage'));
const AssinaturaFromMeeting = lazy(() => import('./pages/AssinaturaFromMeeting'));
const ReuniaoPublica = lazy(() => import('./pages/ReuniaoPublica'));
const LojaPublica = lazy(() => import('./pages/LojaPublica'));
const PrintLabelsPage = lazy(() => import('./features/produto/pages/PrintLabelsPage'));
import LoginPage from './pages/Index';


// ✅ Skeleton minimalista que renderiza em <50ms (apenas CSS, sem JS pesado)
const MinimalSkeleton = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-full max-w-md px-6 space-y-4">
      <div className="text-center text-muted-foreground animate-pulse mb-4">
        Conectado ao Antigravity localmente...
      </div>
      <div className="h-16 bg-muted/20 rounded-lg animate-pulse" />
      <div className="h-48 bg-muted/20 rounded-lg animate-pulse" />
      <div className="h-12 bg-muted/20 rounded-lg animate-pulse" />
    </div>
  </div>
);

// ✅ Rotas internas de assinatura (não públicas)
const internalAssinaturaRoutes = [
  '/assinatura',
  '/assinatura/criar',
  '/assinatura/personalizar',
  '/assinatura/contratos'
];

// ✅ Função centralizada para verificar se é rota pública
const isPublicRoute = (path: string): boolean => {
  // Rotas internas de assinatura NÃO são públicas
  if (internalAssinaturaRoutes.includes(path)) {
    return false;
  }

  // Rotas internas da loja NÃO são públicas (devem ser tratadas pelo DesktopApp)
  if (path.startsWith('/loja/personalizar') || path.startsWith('/loja/meus-produtos')) {
    return false;
  }

  return (
    path === '/' ||
    path === '/login' ||
    path === '/auth/login' ||
    path === '/print-labels' ||
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

// ✅ Prefetch inteligente - carrega próximos componentes prováveis
const prefetchPublicRoutes = () => {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => {
      // Prefetch rotas mais usadas
      import('./pages/AssinaturaClientPage');
      import('./features/formularios-platform/pages/FormularioPublicoWrapper');
    }, { timeout: 2000 });
  }
};

// ✅ OTIMIZAÇÃO: Componente de rotas públicas com lazy loading
const PublicRoutes = () => {
  const location = useLocation();
  const path = location.pathname;

  // Iniciar prefetch após primeira renderização
  if (typeof window !== 'undefined') {
    prefetchPublicRoutes();
  }

  // Assinaturas
  if (path.startsWith('/assinar/')) {
    return (
      <Suspense fallback={<MinimalSkeleton />}>
        <AssinaturaClientPage />
      </Suspense>
    );
  }

  // Assinaturas públicas (exceto rotas internas)
  if (path.startsWith('/assinatura/') && !internalAssinaturaRoutes.includes(path)) {
    return (
      <Suspense fallback={<MinimalSkeleton />}>
        <AssinaturaFromMeeting />
      </Suspense>
    );
  }

  // Formulários públicos - SEM Suspense/lazy para carregamento instantâneo
  if (path.startsWith('/f/') ||
    path.startsWith('/form/') ||
    path.startsWith('/formulario/') ||
    /^\/[^/]+\/form\//.test(path)) {
    return <FormularioPublicoWrapper />;
  }

  // Reuniões públicas
  if (path.startsWith('/reuniao/') || path.startsWith('/reuniao-publica/')) {
    return (
      <Suspense fallback={<MinimalSkeleton />}>
        <ReuniaoPublica />
      </Suspense>
    );
  }

  // Loja Pública de Semijoias
  if (path.startsWith('/loja/')) {
    return (
      <Suspense fallback={<MinimalSkeleton />}>
        <LojaPublica />
      </Suspense>
    );
  }

  // Página de Impressão de Etiquetas
  if (path === '/print-labels') {
    return (
      <Suspense fallback={<MinimalSkeleton />}>
        <PrintLabelsPage />
      </Suspense>
    );
  }

  // Login principal - PLATAFORMA ADMIN (Email + Senha)
  if (path === '/login' || path === '/') {
    return (
      <AuthProvider>
        <Suspense fallback={<MinimalSkeleton />}>
          <LoginPage />
        </Suspense>
      </AuthProvider>
    );
  }



  return null;
};

const AppRoutes = () => {
  const location = useLocation();
  const path = location.pathname;

  // ⚡ OTIMIZAÇÃO CRÍTICA: Se for rota pública, renderiza IMEDIATAMENTE
  if (isPublicRoute(path)) {
    return <PublicRoutes />;
  }

  // Rotas privadas com AuthProvider e NotificationProvider
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
const App = () => {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isPublic = isPublicRoute(currentPath);

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
