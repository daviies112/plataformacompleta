import { createRoot } from "react-dom/client";
import "./index.css";

const path = window.location.pathname;

const isPublicFormRoute = 
  path.startsWith('/f/') ||
  path.startsWith('/form/') ||
  path.startsWith('/formulario/') ||
  /^\/[^/]+\/form\//.test(path);

if (isPublicFormRoute) {
  import("./PublicFormApp").then(({ default: PublicFormApp }) => {
    createRoot(document.getElementById("root")!).render(<PublicFormApp />);
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
      !path.startsWith('/assinar/') &&
      !path.startsWith('/assinatura/') &&
      !path.startsWith('/reuniao/') &&
      !path.startsWith('/reuniao-publica/') &&
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
