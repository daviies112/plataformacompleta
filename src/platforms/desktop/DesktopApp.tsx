import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DesktopLayout from "./layouts/DesktopLayout";

// Import desktop-specific pages
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
import ReuniaoDashboard from "@/pages/ReuniaoDashboard";
import ReuniaoPage from "@/pages/Reuniao";
// ReuniaoPublica removido - tratado via lazy loading no PlatformRouter
import GravacoesPage from "@/pages/Gravacoes";
import HorariosDisponiveis from "@/pages/HorariosDisponiveis";
import RoomDesignSettings from "@/pages/RoomDesignSettings";
import ConsultarCPFPage from "@/pages/consultar-cpf";
import HistoricoConsultasPage from "@/pages/historico-consultas";
import ExportDataPage from "@/pages/ExportData";
import { Navigate } from "react-router-dom";
import { RootRedirect } from "@/components/RootRedirect";
// PublicForm e FormularioPublicoWrapper removidos - tratados via lazy loading no PlatformRouter

// Revendedora Platform - NOTA: RevendedoraApp é tratado diretamente no PlatformRouter

// Import Assinatura Platform
import CriarAssinaturaPage from "@/pages/CriarAssinaturaPage";
import PersonalizarAssinaturaPage from "@/pages/PersonalizarAssinaturaPage";
import ContratosListaPage from "@/pages/ContratosListaPage";
// AssinaturaClientPage removido - tratado via lazy loading no App.tsx

// Import Envio Platform
import { EnvioCotacao, EnvioEnviar, EnvioList, EnvioRastreamento } from "@/pages/envio";

// Import Financeiro (Wallet) Page
import Financeiro from "@/pages/Financeiro";

// Import Revendedora Admin components for /produto/admin/* routes
import { CompanyProvider } from "@/features/revendedora/contexts/CompanyContext";
import { AdminSupabaseProvider } from "@/features/revendedora/contexts/AdminSupabaseContext";
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
 * Desktop App - Versão completa para desktop
 * Design otimizado para telas grandes com navegação lateral
 */
const DesktopApp = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />
      {/* Rotas públicas de formulário removidas - tratadas via lazy loading no PlatformRouter */}
      
      {/* Dashboard - Rota principal após login */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <FormularioPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
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
        path="/financeiro" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <Financeiro />
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
              <AdminSupabaseProvider>
                <CompanyProvider>
                  <AdminLayout><AdminResellers /></AdminLayout>
                </CompanyProvider>
              </AdminSupabaseProvider>
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
              <AdminSupabaseProvider>
                <CompanyProvider>
                  <AdminLayout><AdminAnalytics /></AdminLayout>
                </CompanyProvider>
              </AdminSupabaseProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/branding" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <AdminSupabaseProvider>
                <CompanyProvider>
                  <AdminLayout><AdminBranding /></AdminLayout>
                </CompanyProvider>
              </AdminSupabaseProvider>
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
      
      {/* Vendas Routes - Plataforma de Vendas no Header Principal */}
      <Route 
        path="/vendas" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminDashboard /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/dashboard" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminDashboard /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/products" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminProducts /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/orders" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminOrders /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/resellers" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <AdminSupabaseProvider>
                <CompanyProvider>
                  <AdminLayout basePath="/vendas"><AdminResellers /></AdminLayout>
                </CompanyProvider>
              </AdminSupabaseProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/resellers/:id" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminResellerDetails /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/commissions" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminCommissions /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/commission-config" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminCommissionConfiguration /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/product-requests" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminProductRequests /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/analytics" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <AdminSupabaseProvider>
                <CompanyProvider>
                  <AdminLayout basePath="/vendas"><AdminAnalytics /></AdminLayout>
                </CompanyProvider>
              </AdminSupabaseProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/branding" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <AdminSupabaseProvider>
                <CompanyProvider>
                  <AdminLayout basePath="/vendas"><AdminBranding /></AdminLayout>
                </CompanyProvider>
              </AdminSupabaseProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/gamification" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminGamification /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/settings" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><AdminSettings /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendas/dados-bancarios" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout basePath="/vendas"><BankAccountSetup /></AdminLayout>
              </CompanyProvider>
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/produto/admin/dados-bancarios" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CompanyProvider>
                <AdminLayout><BankAccountSetup /></AdminLayout>
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
        path="/reuniao" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <ReuniaoDashboard />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      {/* Rotas de reunião pública removidas - tratadas via lazy loading no PlatformRouter */}
      
      <Route 
        path="/gravacoes" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <GravacoesPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/horarios-disponiveis" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <HorariosDisponiveis />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/room-design" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <RoomDesignSettings />
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
        path="/export" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <ExportDataPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />

      {/* Plataforma Revendedora - REMOVIDO do DesktopApp 
          Rota /revendedora/* é tratada diretamente no PlatformRouter 
          para evitar interferência do AuthContext */}

      {/* Envio Platform Routes */}
      <Route 
        path="/envio" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <EnvioCotacao />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/envio/enviar" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <EnvioEnviar />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/envio/lista" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <EnvioList />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/envio/rastreamento" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <EnvioRastreamento />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />

      {/* Assinatura Digital - Admin */}
      <Route 
        path="/assinatura" 
        element={<Navigate to="/assinatura/personalizar" replace />} 
      />
      <Route 
        path="/assinatura/criar" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <CriarAssinaturaPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/assinatura/personalizar" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <PersonalizarAssinaturaPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/assinatura/contratos" 
        element={
          <ProtectedRoute>
            <DesktopLayout>
              <ContratosListaPage />
            </DesktopLayout>
          </ProtectedRoute>
        } 
      />
      
      {/* Rota /assinar/:token removida - tratada via lazy loading no App.tsx */}
      
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
