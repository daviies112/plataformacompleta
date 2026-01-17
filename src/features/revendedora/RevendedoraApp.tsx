import { Routes, Route, Navigate } from "react-router-dom";
import { CompanyProvider } from "@/features/revendedora/contexts/CompanyContext";

import Login from "@/features/revendedora/pages/Login";
import NotFound from "@/features/revendedora/pages/NotFound";
import Demo from "@/features/revendedora/pages/Demo";

import { ResellerLayout } from "@/features/revendedora/layouts/ResellerLayout";
import { AdminLayout } from "@/features/revendedora/layouts/AdminLayout";

import Checkout from "@/features/revendedora/pages/public/Checkout";
import Storefront from "@/features/revendedora/pages/public/Storefront";
import OrderSuccess from "@/features/revendedora/pages/public/OrderSuccess";
import TrackOrder from "@/features/revendedora/pages/public/TrackOrder";
import ProductView from "@/features/revendedora/pages/public/ProductView";

import ResellerDashboard from "@/features/revendedora/pages/reseller/Dashboard";
import ResellerTeam from "@/features/revendedora/pages/reseller/Team";
import ResellerSales from "@/features/revendedora/pages/reseller/Sales";
import ResellerFinancial from "@/features/revendedora/pages/reseller/Financial";
import ResellerStore from "@/features/revendedora/pages/reseller/Store";
import ResellerPaymentPix from "@/features/revendedora/pages/reseller/PaymentPix";
import ResellerPaymentCard from "@/features/revendedora/pages/reseller/PaymentCard";
import ResellerGamification from "@/features/revendedora/pages/reseller/Gamification";

import AdminDashboard from "@/features/revendedora/pages/admin/Dashboard";
import AdminProducts from "@/features/revendedora/pages/admin/Products";
import AdminOrders from "@/features/revendedora/pages/admin/Orders";
import AdminResellers from "@/features/revendedora/pages/admin/Resellers";
import AdminResellerDetails from "@/features/revendedora/pages/admin/ResellerDetails";
import AdminCommissions from "@/features/revendedora/pages/admin/Commissions";
import AdminCommissionConfiguration from "@/features/revendedora/pages/admin/CommissionConfiguration";
import AdminProductRequests from "@/features/revendedora/pages/admin/ProductRequests";
import AdminSettings from "@/features/revendedora/pages/admin/Settings";
import AdminBranding from "@/features/revendedora/pages/admin/Branding";
import AdminGamification from "@/features/revendedora/pages/admin/Gamification";

const RevendedoraApp = () => (
  <CompanyProvider>
    <Routes>
      {/* Rota principal - Mostra gestao de revendedoras para admin */}
      <Route path="" element={<AdminLayout><AdminResellers /></AdminLayout>} />
      
      {/* Login da revendedora (separado do admin) */}
      <Route path="login" element={<Login />} />
      <Route path="demo" element={<Demo />} />
      
      {/* Rotas publicas */}
      <Route path="checkout/:linkToken" element={<Checkout />} />
      <Route path="store/:storeSlug" element={<Storefront />} />
      <Route path="order-success/:orderId" element={<OrderSuccess />} />
      <Route path="track-order/:orderId" element={<TrackOrder />} />
      <Route path="produto/:productId" element={<ProductView />} />
      
      {/* ===== ROTAS ADMIN (Gestao de Revendedoras) ===== */}
      <Route path="admin" element={<Navigate to="/revendedora" replace />} />
      <Route path="admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
      <Route path="admin/resellers" element={<AdminLayout><AdminResellers /></AdminLayout>} />
      <Route path="admin/resellers/:id" element={<AdminLayout><AdminResellerDetails /></AdminLayout>} />
      <Route path="admin/products" element={<AdminLayout><AdminProducts /></AdminLayout>} />
      <Route path="admin/orders" element={<AdminLayout><AdminOrders /></AdminLayout>} />
      <Route path="admin/commissions" element={<AdminLayout><AdminCommissions /></AdminLayout>} />
      <Route path="admin/commission-config" element={<AdminLayout><AdminCommissionConfiguration /></AdminLayout>} />
      <Route path="admin/product-requests" element={<AdminLayout><AdminProductRequests /></AdminLayout>} />
      <Route path="admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
      <Route path="admin/branding" element={<AdminLayout><AdminBranding /></AdminLayout>} />
      <Route path="admin/gamification" element={<AdminLayout><AdminGamification /></AdminLayout>} />
      
      {/* ===== ROTAS REVENDEDORA (apos login) ===== */}
      <Route path="reseller/dashboard" element={<ResellerLayout><ResellerDashboard /></ResellerLayout>} />
      <Route path="reseller/team" element={<ResellerLayout><ResellerTeam /></ResellerLayout>} />
      <Route path="reseller/sales" element={<ResellerLayout><ResellerSales /></ResellerLayout>} />
      <Route path="reseller/financial" element={<ResellerLayout><ResellerFinancial /></ResellerLayout>} />
      <Route path="reseller/store" element={<ResellerLayout><ResellerStore /></ResellerLayout>} />
      <Route path="reseller/payment/pix/:saleId" element={<ResellerLayout><ResellerPaymentPix /></ResellerLayout>} />
      <Route path="reseller/payment/card/:saleId" element={<ResellerLayout><ResellerPaymentCard /></ResellerLayout>} />
      <Route path="reseller/gamification" element={<ResellerLayout><ResellerGamification /></ResellerLayout>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  </CompanyProvider>
);

export default RevendedoraApp;
