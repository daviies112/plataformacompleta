import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { queryClient } from "./lib/queryClient";
import { InstallPWAButton } from "./components/InstallPWAButton";
import { MonitoringProvider } from "./components/MonitoringProvider";

// ✅ OTIMIZAÇÃO CRÍTICA: Todos os imports são ESTÁTICOS para rotas públicas
// Isso elimina qualquer delay de lazy loading/Suspense
import PlatformRouter from './platforms/PlatformRouter';
import FormularioPublicoWrapper from './features/formularios-platform/pages/FormularioPublicoWrapper';
import AssinaturaClientPage from './pages/AssinaturaClientPage';
import AssinaturaFromMeeting from './pages/AssinaturaFromMeeting';
import ReuniaoPublica from './pages/ReuniaoPublica';
import PublicStore from './features/revendedora/pages/public/PublicStore';
import PublicCheckout from './features/revendedora/pages/public/PublicCheckout';
import LoginPage from './pages/Index';
import ResellerLogin from './platforms/reseller/pages/Login';

// ✅ Função centralizada para verificar se é rota pública
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

// ✅ OTIMIZAÇÃO: Componente de rotas públicas SEM Suspense, SEM AuthProvider, SEM loading
const PublicRoutes = () => {
  const location = useLocation();
  const path = location.pathname;
  
  // Assinaturas
  if (path.startsWith('/assinar/')) {
    return <AssinaturaClientPage />;
  }
  
  if (path.startsWith('/assinatura/')) {
    return <AssinaturaFromMeeting />;
  }
  
  // Formulários públicos
  if (path.startsWith('/f/') || 
      path.startsWith('/form/') || 
      path.startsWith('/formulario/') ||
      /^\/[^/]+\/form\//.test(path)) {
    return <FormularioPublicoWrapper />;
  }
  
  // Reuniões públicas
  if (path.startsWith('/reuniao/') || path.startsWith('/reuniao-publica/')) {
    return <ReuniaoPublica />;
  }
  
  // Loja pública
  if (path.startsWith('/loja/')) {
    return <PublicStore />;
  }
  
  // Checkout público
  if (path.startsWith('/checkout/')) {
    return <PublicCheckout />;
  }
  
  // Login principal - SEM AuthProvider wrapper (usa o próprio AuthProvider interno se necessário)
  if (path === '/login' || path === '/') {
    return (
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );
  }
  
  // Login de revendedora
  if (path === '/reseller-login') {
    return <ResellerLogin />;
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
