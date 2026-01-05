import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HMSRoomProvider } from "@100mslive/react-sdk";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { queryClient } from "./lib/queryClient";
import PlatformRouter from "./platforms/PlatformRouter";
import { InstallPWAButton } from "./components/InstallPWAButton";

/**
 * App Principal - Versão Profissional com Separação Desktop/Mobile
 * 
 * Detecta automaticamente a plataforma (desktop vs mobile) e renderiza
 * o app apropriado com design e navegação otimizados para cada plataforma.
 * 
 * Arquitetura:
 * - Desktop: Header horizontal + navegação superior
 * - Mobile: Header compacto + navegação inferior (bottom nav)
 * - Roteamento completamente separado e independente
 */
const App = () => (
  <HMSRoomProvider>
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
            <AuthProvider>
              <NotificationProvider>
                {/* Platform Router - Detecta e renderiza Desktop ou Mobile App */}
                <PlatformRouter />
                
                {/* PWA Install Button - Aparece em todas as páginas no canto inferior direito (desktop only) */}
                <InstallPWAButton />
              </NotificationProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HMSRoomProvider>
);

export default App;
