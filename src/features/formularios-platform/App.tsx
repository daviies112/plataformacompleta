import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Router } from "wouter";
import { MainHeader } from "./components/MainHeader";
import { FormularioLayout } from "./components/FormularioLayout";
import { SupabaseConfigProvider } from "./contexts/SupabaseConfigContext";
import { queryClient } from "./lib/queryClient";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import PublicForm from "./pages/PublicForm";
import TrackedPublicForm from "./pages/TrackedPublicForm";
import FormularioPublico from "./pages/FormularioPublico";
import Dashboard from "./pages/Dashboard";
import Gravacoes from "../../pages/Gravacoes";
import VerFormularios from "./pages/VerFormularios";
import VerPaginasFinal from "./pages/VerPaginasFinal";
import EditarFormulario from "./pages/EditarFormulario";
import FormularioRespostas from "./pages/FormularioRespostas";
import WhatsApp from "./pages/WhatsApp";
import PreviewTemp from "./pages/PreviewTemp";
import NotFound from "./pages/NotFound";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SupabaseConfigProvider>
      <TooltipProvider>
        <Router base="/formulario">
          <Switch>
            {/* Rotas administrativas - TODAS explícitas para evitar 404 */}
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
            
            <Route path="/admin/gravacoes">
              <FormularioLayout>
                <Gravacoes />
              </FormularioLayout>
            </Route>
            
            <Route path="/admin">
              <FormularioLayout>
                <Admin />
              </FormularioLayout>
            </Route>
            
            {/* Rota inicial */}
            <Route path="/">
              <FormularioLayout>
                <Admin />
              </FormularioLayout>
            </Route>
            
            {/* Preview temporário em nova aba */}
            <Route path="/preview-temp" component={PreviewTemp} />
            
            {/* Formulários públicos - Nova estrutura com company slug */}
            <Route path="/:companySlug/form/:id" component={FormularioPublico} />
            
            {/* Formulários públicos - URL antiga (fallback/redirect) */}
            <Route path="/form/:id" component={FormularioPublico} />
            
            {/* Rota de token - DEVE SER A ÚLTIMA para não capturar rotas administrativas */}
            <Route path="/f/:token" component={FormularioPublico} />
            
            {/* 404 - Rota não encontrada */}
            <Route component={NotFound} />
          </Switch>
        </Router>
      </TooltipProvider>
    </SupabaseConfigProvider>
  </QueryClientProvider>
);

export default App;
