import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeColorScheme } from "./lib/colorScheme";

// Initialize color scheme before app renders (lightweight - no external deps)
initializeColorScheme();

// ✅ OTIMIZAÇÃO CRÍTICA: Renderiza PRIMEIRO, depois carrega Sentry em background
// Isso reduz o bundle inicial em ~21MB
createRoot(document.getElementById("root")!).render(<App />);

// Inicializar Sentry apenas em rotas privadas e após a renderização inicial
// Usa dynamic import para não bloquear o carregamento inicial
const isPublicRoute = window.location.pathname === '/' ||
  window.location.pathname === '/login' ||
  window.location.pathname === '/reseller-login' ||
  window.location.pathname.startsWith('/assinar/') ||
  window.location.pathname.startsWith('/assinatura/') ||
  window.location.pathname.startsWith('/f/') ||
  window.location.pathname.startsWith('/form/') ||
  window.location.pathname.startsWith('/formulario/') ||
  window.location.pathname.startsWith('/reuniao/') ||
  window.location.pathname.startsWith('/reuniao-publica/') ||
  window.location.pathname.startsWith('/loja/') ||
  window.location.pathname.startsWith('/checkout/') ||
  /^\/[^/]+\/form\//.test(window.location.pathname);

// Só carrega Sentry para rotas privadas e depois de 3 segundos
if (!isPublicRoute) {
  setTimeout(() => {
    import("./lib/sentry").then(({ initializeSentry }) => {
      initializeSentry().catch(console.error);
    });
  }, 3000);
}
