/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  CRITICAL PERFORMANCE FILE - DO NOT MODIFY WITHOUT READING THIS  ⚠️   ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  This file implements EARLY ROUTE DETECTION for public pages.             ║
 * ║  Without this, public pages (forms, meetings, signatures) take 15+ sec.   ║
 * ║                                                                           ║
 * ║  🔴 NEVER:                                                                 ║
 * ║  - Import heavy dependencies here (TanStack Query, shadcn, lucide, etc)   ║
 * ║  - Remove the route detection logic                                       ║
 * ║  - Move CSS import above the route detection                              ║
 * ║  - Add React context providers before route detection                     ║
 * ║                                                                           ║
 * ║  🟢 ARCHITECTURE:                                                          ║
 * ║  - Public routes → Load ultra-light Public*App (10 modules)               ║
 * ║  - Private routes → Load full App.tsx (80+ modules)                       ║
 * ║                                                                           ║
 * ║  📖 Full documentation: docs/PUBLIC_FORM_PERFORMANCE_FIX.md               ║
 * ║  💰 Cost to discover this fix: $30+ in debugging time                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
import { createRoot } from "react-dom/client";

const path = window.location.pathname;

const isPublicFormRoute = 
  path.startsWith('/f/') ||
  path.startsWith('/form/') ||
  path.startsWith('/formulario/') ||
  /^\/[^/]+\/form\//.test(path);

const isPublicMeetingRoute = 
  path.startsWith('/reuniao/') ||
  path.startsWith('/reuniao-publica/');

// Rotas internas de assinatura (não públicas)
const internalAssinaturaRoutes = [
  '/assinatura',
  '/assinatura/criar',
  '/assinatura/personalizar',
  '/assinatura/contratos'
];

const isPublicSignatureRoute = 
  (path.startsWith('/assinar/') ||
  path.startsWith('/assinatura/')) &&
  !internalAssinaturaRoutes.includes(path);

if (isPublicFormRoute) {
  import("./PublicFormApp").then(({ default: PublicFormApp }) => {
    createRoot(document.getElementById("root")!).render(<PublicFormApp />);
  });
} else if (isPublicMeetingRoute) {
  import("./PublicMeetingApp").then(({ default: PublicMeetingApp }) => {
    createRoot(document.getElementById("root")!).render(<PublicMeetingApp />);
  });
} else if (isPublicSignatureRoute) {
  // Load CSS first for signature pages - required for proper styling
  import("./index.css").then(() => {
    import("./PublicSignatureApp").then(({ default: PublicSignatureApp }) => {
      createRoot(document.getElementById("root")!).render(<PublicSignatureApp />);
    });
  });
} else {
  import("./index.css");
  import("./App").then(({ default: App }) => {
    import("./lib/colorScheme").then(({ initializeColorScheme }) => {
      initializeColorScheme();
    });
    
    createRoot(document.getElementById("root")!).render(<App />);
    
    const isPrivateRoute = 
      path !== '/' &&
      path !== '/login' &&
      path !== '/reseller-login' &&
      !path.startsWith('/loja/') &&
      !path.startsWith('/checkout/');
    
    if (isPrivateRoute) {
      setTimeout(() => {
        import("./lib/sentry").then(({ initializeSentry }) => {
          initializeSentry().catch(console.error);
        });
      }, 3000);
    }
  });
}
