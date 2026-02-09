import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import MobileLayout from "./layouts/MobileLayout";

// Import mobile-specific pages
import FormularioPage from "./pages/FormularioPage";
import CalendarPage from "./pages/CalendarPage";
import SettingsPage from "./pages/SettingsPage";
import ClientConfigPage from "./pages/ClientConfigPage";
import WorkspacePage from "./pages/WorkspacePage";
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
// ReuniaoPublica, FormularioPublicoWrapper, AssinaturaClientPage removidos - lazy loading no PlatformRouter/App.tsx
import ConsultarCPFPage from "@/pages/consultar-cpf";
import HistoricoConsultasPage from "@/pages/historico-consultas";
import ExportDataPage from "@/pages/ExportData";
import { Navigate } from "react-router-dom";
import { RootRedirect } from "@/components/RootRedirect";

// RevendedoraApp removido - tratado via lazy loading no PlatformRouter

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
import BankAccountSetup from "@/pages/billing/BankAccountSetup";
import AdminGamification from "@/features/revendedora/pages/admin/Gamification";

/**
 * Mobile App - Versão otimizada para mobile
 * Design touch-first com navegação inferior
 */
const MobileApp = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />
      {/* Rotas públicas (/form/*, /reuniao/*, /assinar/*) removidas - lazy loading no PlatformRouter/App.tsx */}
      
      {/* Protected routes with Mobile Layout */}
      {/* Formulário Page - Plataforma completa com header completo */}
      <Route 
        path="/formulario/*" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <FormularioPage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/calendar" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CalendarPage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/calendario" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CalendarPage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/workspace" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <WorkspacePage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/faturamento/*" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <BillingPage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <SettingsPage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/configuracoes" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <SettingsPage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/config" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <ClientConfigPage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/notifications" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <NotificationsPage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/whatsapp" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <WhatsAppPage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/whatsapp-platform" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <LeadStatusProvider>
                <WhatsAppPlatformPage />
              </LeadStatusProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/produto" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <ProdutoPage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      
      {/* Produto Admin Routes - Plataforma de Vendas integrada ao Produto */}
      <Route 
        path="/produto/admin/dashboard" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout><AdminDashboard /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/products" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout><AdminProducts /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/orders" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout><AdminOrders /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/resellers" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout><AdminResellers /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/resellers/:id" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout><AdminResellerDetails /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/commissions" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout><AdminCommissions /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/commission-config" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout><AdminCommissionConfiguration /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/product-requests" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout><AdminProductRequests /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/analytics" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout><AdminAnalytics /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/branding" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout><AdminBranding /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/gamification" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout><AdminGamification /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/settings" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout><AdminSettings /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/dados-bancarios" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout><BankAccountSetup /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      
      {/* Vendas Routes - Plataforma de Vendas no Header Principal */}
      <Route 
        path="/vendas" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminDashboard /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/dashboard" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminDashboard /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/products" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminProducts /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/orders" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminOrders /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/resellers" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminResellers /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/resellers/:id" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminResellerDetails /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/commissions" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminCommissions /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/commission-config" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminCommissionConfiguration /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/product-requests" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminProductRequests /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/analytics" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminAnalytics /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/branding" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminBranding /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/gamification" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminGamification /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/settings" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminSettings /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/dados-bancarios" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><BankAccountSetup /></AdminLayout>
              </CompanyProvider>
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/kanban" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <KanbanPage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/notion" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <NotionHomePage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/notion/boards" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <NotionBoardsPage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/notion/templates" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <NotionTemplatesPage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/documentos" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <NotionHomePage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/consultar-cpf" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <ConsultarCPFPage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/historico-consultas" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <HistoricoConsultasPage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/export" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <ExportDataPage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />

      {/* Rota /revendedora/* removida - tratada via lazy loading no PlatformRouter */}
      
      {/* Catch all - 404 */}
      <Route 
        path="*" 
        element={
          <ProtectedRoute>
            <MobileLayout>
              <NotFoundPage />
            </MobileLayout>
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

export default MobileApp;
