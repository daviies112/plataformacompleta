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

const RevendedoraApp = () => {
  return (
  <CompanyProvider>
    <Routes>
      {/* Rota principal - Redireciona para login da revendedora */}
      <Route path="/revendedora" element={<Navigate to="/revendedora/login" replace />} />
      
      {/* Login da revendedora */}
      <Route path="/revendedora/login" element={<Login />} />
      <Route path="/revendedora/demo" element={<Demo />} />
      
      {/* Rotas publicas */}
      <Route path="/revendedora/checkout/:linkToken" element={<Checkout />} />
      <Route path="/revendedora/store/:storeSlug" element={<Storefront />} />
      <Route path="/revendedora/order-success/:orderId" element={<OrderSuccess />} />
      <Route path="/revendedora/track-order/:orderId" element={<TrackOrder />} />
      <Route path="/revendedora/produto/:productId" element={<ProductView />} />
      
      {/* ===== ROTAS ADMIN (Gestao de Revendedoras) ===== */}
      <Route path="/revendedora/admin" element={<Navigate to="/revendedora" replace />} />
      <Route path="/revendedora/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
      <Route path="/revendedora/admin/resellers" element={<AdminLayout><AdminResellers /></AdminLayout>} />
      <Route path="/revendedora/admin/resellers/:id" element={<AdminLayout><AdminResellerDetails /></AdminLayout>} />
      <Route path="/revendedora/admin/products" element={<AdminLayout><AdminProducts /></AdminLayout>} />
      <Route path="/revendedora/admin/orders" element={<AdminLayout><AdminOrders /></AdminLayout>} />
      <Route path="/revendedora/admin/commissions" element={<AdminLayout><AdminCommissions /></AdminLayout>} />
      <Route path="/revendedora/admin/commission-config" element={<AdminLayout><AdminCommissionConfiguration /></AdminLayout>} />
      <Route path="/revendedora/admin/product-requests" element={<AdminLayout><AdminProductRequests /></AdminLayout>} />
      <Route path="/revendedora/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
      <Route path="/revendedora/admin/branding" element={<AdminLayout><AdminBranding /></AdminLayout>} />
      <Route path="/revendedora/admin/gamification" element={<AdminLayout><AdminGamification /></AdminLayout>} />
      
      {/* ===== ROTAS REVENDEDORA (apos login) ===== */}
      <Route path="/revendedora/reseller/dashboard" element={<ResellerLayout><ResellerDashboard /></ResellerLayout>} />
      <Route path="/revendedora/reseller/team" element={<ResellerLayout><ResellerTeam /></ResellerLayout>} />
      <Route path="/revendedora/reseller/sales" element={<ResellerLayout><ResellerSales /></ResellerLayout>} />
      <Route path="/revendedora/reseller/financial" element={<ResellerLayout><ResellerFinancial /></ResellerLayout>} />
      <Route path="/revendedora/reseller/store" element={<ResellerLayout><ResellerStore /></ResellerLayout>} />
      <Route path="/revendedora/reseller/payment/pix/:saleId" element={<ResellerLayout><ResellerPaymentPix /></ResellerLayout>} />
      <Route path="/revendedora/reseller/payment/card/:saleId" element={<ResellerLayout><ResellerPaymentCard /></ResellerLayout>} />
      <Route path="/revendedora/reseller/gamification" element={<ResellerLayout><ResellerGamification /></ResellerLayout>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  </CompanyProvider>
  );
};

export default RevendedoraApp;
