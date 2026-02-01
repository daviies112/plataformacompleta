import { createRoot } from "react-dom/client";
import "./index.css";

const path = window.location.pathname;

const isPublicFormRoute = 
  path.startsWith('/f/') ||
  path.startsWith('/form/') ||
  path.startsWith('/formulario/') ||
  /^\/[^/]+\/form\//.test(path);

const isPublicMeetingRoute = 
  path.startsWith('/reuniao/') ||
  path.startsWith('/reuniao-publica/');

const isPublicSignatureRoute = 
  path.startsWith('/assinar/') ||
  path.startsWith('/assinatura/');

if (isPublicFormRoute) {
  import("./PublicFormApp").then(({ default: PublicFormApp }) => {
    createRoot(document.getElementById("root")!).render(<PublicFormApp />);
  });
} else if (isPublicMeetingRoute) {
  import("./PublicMeetingApp").then(({ default: PublicMeetingApp }) => {
    createRoot(document.getElementById("root")!).render(<PublicMeetingApp />);
  });
} else if (isPublicSignatureRoute) {
  import("./PublicSignatureApp").then(({ default: PublicSignatureApp }) => {
    createRoot(document.getElementById("root")!).render(<PublicSignatureApp />);
  });
} else {
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
