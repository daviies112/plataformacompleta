import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Router, Redirect } from "wouter";
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
  <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'linear-gradient(to bottom right, hsl(0, 0%, 100%), hsl(210, 40%, 96%))' }}>
    <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: 'hsl(221, 83%, 53%)' }} />
    <p className="text-sm" style={{ color: 'hsl(215, 16%, 47%)' }}>Carregando formulário...</p>
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
              <Redirect to="/admin/formularios" />
            </Route>

            <Route path="/preview-temp" component={PreviewTemp} />
            <Suspense fallback={<FormLoader />}>
              <Route path="/:companySlug/form/:id">
                <FormularioPublico />
              </Route>
              <Route path="/form/:id">
                <FormularioPublico />
              </Route>
              <Route path="/f/:token">
                <FormularioPublico />
              </Route>
            </Suspense>
            <Route component={NotFound} />
          </Switch>
        </Router>
      </TooltipProvider>
    </SupabaseConfigProvider>
  </QueryClientProvider>
);

export default App;
