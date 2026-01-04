import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Router } from "wouter";
import { FormularioLayout } from "./components/FormularioLayout";
import { SupabaseConfigProvider } from "./contexts/SupabaseConfigContext";
import { queryClient } from "./lib/queryClient";
import Admin from "./pages/Admin";
import FormularioPublico from "./pages/FormularioPublico";
import Dashboard from "./pages/Dashboard";
import VerFormularios from "./pages/VerFormularios";
import VerPaginasFinal from "./pages/VerPaginasFinal";
import EditarFormulario from "./pages/EditarFormulario";
import FormularioRespostas from "./pages/FormularioRespostas";
import PreviewTemp from "./pages/PreviewTemp";
import NotFound from "./pages/NotFound";

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
            <Route path="/:companySlug/form/:id" component={FormularioPublico} />
            <Route path="/form/:id" component={FormularioPublico} />
            <Route path="/f/:token" component={FormularioPublico} />
            <Route component={NotFound} />
          </Switch>
        </Router>
      </TooltipProvider>
    </SupabaseConfigProvider>
  </QueryClientProvider>
);

export default App;
