import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DesktopLayout from "./layouts/DesktopLayout";

// Import desktop-specific pages
import FormularioPage from "./pages/FormularioPage";
import CalendarPage from "./pages/CalendarPage";
import SettingsPage from "./pages/SettingsPage";
import ClientConfigPage from "./pages/ClientConfigPage";
import WorkspacePage from "./pages/WorkspacePage";
import WorkspaceCalendarPage from "@/pages/WorkspaceCalendarPage";
import BillingPage from "./pages/BillingPage";
import NotificationsPage from "./pages/NotificationsPage";
import WhatsAppPage from "./pages/WhatsAppPage";
import WhatsAppPlatformPage from "@/features/whatsapp-platform/WhatsAppPlatformPage";
import { LeadStatusProvider } from "@/features/whatsapp-platform/contexts/LeadStatusContext";
import ProdutoPage from "@/features/produto/pages/ProdutoPage";
import KanbanPage from "@/features/kanban/pages/KanbanPage";
import NotFoundPage from "./pages/NotFoundPage";
import LoginPage from "./pages/LoginPage";
import NotionBoardsPage from "@/pages/notion/BoardsWrapper";
import NotionHomePage from "@/pages/notion/Home";
import NotionTemplatesPage from "@/pages/notion/Templates";
import NotificationTestPage from "@/pages/NotificationTestPage";
import ExportData from "@/pages/ExportData";
import { Navigate } from "react-router-dom";
import { RootRedirect } from "@/components/RootRedirect";
import PublicForm from "@/features/formularios-platform/pages/PublicForm";
import FormularioPublicoWrapper from "@/features/formularios-platform/pages/FormularioPublicoWrapper";
import ConsultarCPFPage from "@/pages/consultar-cpf";
import HistoricoConsultasPage from "@/pages/historico-consultas";
import Gravacoes from "@/pages/Gravacoes";
import Reuniao from "@/pages/Reuniao";

// Import Revendedora Platform
import RevendedoraApp from "@/features/revendedora/RevendedoraApp";

// Import Reuniao Platform
import { ReuniaoHubPage } from "@/features/reuniao-platform";

// Import Revendedora Admin components for /produto/admin/* routes
import { CompanyProvider } from "@/features/revendedora/contexts/CompanyContext";
import { AdminLayout } from "@/features/revendedora/layouts/AdminLayout";
import AdminDashboard from "@/features/revendedora/pages/admin/Dashboard";
import AdminProducts from "@/features/revendedora/pages/admin/Products";
import AdminOrders from "@/features/revendedora/pages/admin/Orders";
import AdminResellers from "@/features/revendedora/pages/admin/Resellers";
import AdminResellerDetails from "@/features/revendedora/pages/admin/ResellerDetails";
import AdminCommissions from "@/features/revendedora/pages/admin/Commissions";
import AdminCommissionConfiguration from "@/features/revendedora/pages/admin/CommissionConfiguration";
import AdminProductRequests from "@/features/revendedora/pages/admin/ProductRequests";
import AdminAnalytics from "@/features/revendedora/pages/admin/Analytics";
import AdminSettings from "@/features/revendedora/pages/admin/Settings";
import AdminBranding from "@/features/revendedora/pages/admin/Branding";
import AdminGamification from "@/features/revendedora/pages/admin/Gamification";

/**
 * Desktop App - Versão completa para desktop
 * Design otimizado para telas grandes com navegação lateral
 */
const DesktopApp = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />
      <Route path="/form/:id" element={<FormularioPublicoWrapper />} />
      <Route path="/formulario/:companySlug/form/:id" element={<FormularioPublicoWrapper />} />
      <Route path="/:companySlug/form/:id" element={<FormularioPublicoWrapper />} />
      <Route path="/f/:token" element={<FormularioPublicoWrapper />} />
      
      {/* Protected routes with Desktop Layout */}
      {/* Formulário Page - Plataforma completa com header completo */}
      <Route 
        path="/formulario/*" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <FormularioPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/calendar" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CalendarPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/calendario" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CalendarPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/workspace" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <WorkspacePage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/workspace/calendar" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <WorkspaceCalendarPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/workspace/calendario" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <WorkspaceCalendarPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/faturamento/*" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <BillingPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <SettingsPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/configuracoes" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <SettingsPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/config" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <ClientConfigPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/export" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <ExportData />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/exportar" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <ExportData />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/notifications" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <NotificationsPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/notifications/test" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <NotificationTestPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/whatsapp" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <WhatsAppPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/whatsapp-platform" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <LeadStatusProvider>
                <WhatsAppPlatformPage />
              </LeadStatusProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/produto" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <ProdutoPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      {/* Produto Admin Routes - Plataforma de Vendas integrada ao Produto */}
      <Route 
        path="/produto/admin/dashboard" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout><AdminDashboard /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/products" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout><AdminProducts /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/orders" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout><AdminOrders /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/resellers" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout><AdminResellers /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/resellers/:id" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout><AdminResellerDetails /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/commissions" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout><AdminCommissions /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/commission-config" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout><AdminCommissionConfiguration /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/product-requests" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout><AdminProductRequests /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/analytics" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout><AdminAnalytics /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/branding" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout><AdminBranding /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/gamification" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout><AdminGamification /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/settings" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout><AdminSettings /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/kanban" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <KanbanPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/notion" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <NotionHomePage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/notion/boards" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <NotionBoardsPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/notion/templates" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <NotionTemplatesPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/documentos" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <NotionHomePage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/consultar-cpf" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <ConsultarCPFPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/historico-consultas" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <HistoricoConsultasPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/gravacoes" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <Gravacoes />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      {/* Reuniao Platform - Plataforma de videoconferencia e reunioes */}
      <Route 
        path="/reuniao/:id" 
        element={<Reuniao />} 
      />
      <Route 
        path="/reuniao/*" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <ReuniaoHubPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      {/* Revendedora Platform - Plataforma completa de vendas e revendedoras */}
      <Route 
        path="/revendedora/*" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <RevendedoraApp />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      {/* Catch all - 404 */}
      <Route 
        path="*" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <NotFoundPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

export default DesktopApp;
