import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Router } from "wouter";
import { FormularioLayout } from "./components/FormularioLayout";
import { SupabaseConfigProvider } from "./contexts/SupabaseConfigContext";
import { queryClient } from "./lib/queryClient";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import VerFormularios from "./pages/VerFormularios";
import VerPaginasFinal from "./pages/VerPaginasFinal";
import EditarFormulario from "./pages/EditarFormulario";
import FormularioRespostas from "./pages/FormularioRespostas";
import PreviewTemp from "./pages/PreviewTemp";
import NotFound from "./pages/NotFound";

const FormularioPublico = lazy(() => import("./pages/FormularioPublico"));

const FormLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white to-blue-50">
    <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
    <p className="text-gray-500 text-sm">Carregando formulário...</p>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SupabaseConfigProvider>
      <TooltipProvider>
        <Router base="/formulario">
          <Switch>
            <Route path="/admin/editar/:id">
              <FormularioLayout>
                <EditarFormulario />
              </FormularioLayout>
            </Route>
            
            <Route path="/admin/formularios/:id/respostas">
              <FormularioLayout>
                <FormularioRespostas />
              </FormularioLayout>
            </Route>
            
            <Route path="/admin/formularios">
              <FormularioLayout>
                <VerFormularios />
              </FormularioLayout>
            </Route>
            
            <Route path="/admin/paginas-final">
              <FormularioLayout>
                <VerPaginasFinal />
              </FormularioLayout>
            </Route>
            
            <Route path="/admin/dashboard">
              <FormularioLayout>
                <Dashboard />
              </FormularioLayout>
            </Route>
            
            <Route path="/admin">
              <FormularioLayout>
                <Admin />
              </FormularioLayout>
            </Route>
            
            <Route path="/">
              <FormularioLayout>
                <Admin />
              </FormularioLayout>
            </Route>
            
            <Route path="/preview-temp" component={PreviewTemp} />
            <Route path="/:companySlug/form/:id">
              <Suspense fallback={<FormLoader />}>
                <FormularioPublico />
              </Suspense>
            </Route>
            <Route path="/form/:id">
              <Suspense fallback={<FormLoader />}>
                <FormularioPublico />
              </Suspense>
            </Route>
            <Route path="/f/:token">
              <Suspense fallback={<FormLoader />}>
                <FormularioPublico />
              </Suspense>
            </Route>
            <Route component={NotFound} />
          </Switch>
        </Router>
      </TooltipProvider>
    </SupabaseConfigProvider>
  </QueryClientProvider>
);

export default App;
