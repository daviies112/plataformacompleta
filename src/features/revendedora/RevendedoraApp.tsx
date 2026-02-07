import { Routes, Route, Navigate } from "react-router-dom";
import { CompanyProvider } from "@/features/revendedora/contexts/CompanyContext";
import { AdminSupabaseProvider } from "@/features/revendedora/contexts/AdminSupabaseContext";

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
import ResellerPagarmePayment from "@/features/revendedora/pages/reseller/PagarmePayment";
import ResellerGamification from "@/features/revendedora/pages/reseller/Gamification";
import ResellerSettings from "@/features/revendedora/pages/reseller/Settings";

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
import AdminSplitTest from "@/features/revendedora/pages/admin/SplitTest";

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
      <Route path="/revendedora/admin/dashboard" element={<AdminSupabaseProvider><AdminLayout><AdminDashboard /></AdminLayout></AdminSupabaseProvider>} />
      <Route path="/revendedora/admin/resellers" element={<AdminSupabaseProvider><AdminLayout><AdminResellers /></AdminLayout></AdminSupabaseProvider>} />
      <Route path="/revendedora/admin/resellers/:id" element={<AdminSupabaseProvider><AdminLayout><AdminResellerDetails /></AdminLayout></AdminSupabaseProvider>} />
      <Route path="/revendedora/admin/products" element={<AdminSupabaseProvider><AdminLayout><AdminProducts /></AdminLayout></AdminSupabaseProvider>} />
      <Route path="/revendedora/admin/orders" element={<AdminSupabaseProvider><AdminLayout><AdminOrders /></AdminLayout></AdminSupabaseProvider>} />
      <Route path="/revendedora/admin/commissions" element={<AdminSupabaseProvider><AdminLayout><AdminCommissions /></AdminLayout></AdminSupabaseProvider>} />
      <Route path="/revendedora/admin/commission-config" element={<AdminSupabaseProvider><AdminLayout><AdminCommissionConfiguration /></AdminLayout></AdminSupabaseProvider>} />
      <Route path="/revendedora/admin/product-requests" element={<AdminSupabaseProvider><AdminLayout><AdminProductRequests /></AdminLayout></AdminSupabaseProvider>} />
      <Route path="/revendedora/admin/settings" element={<AdminSupabaseProvider><AdminLayout><AdminSettings /></AdminLayout></AdminSupabaseProvider>} />
      <Route path="/revendedora/admin/branding" element={<AdminSupabaseProvider><AdminLayout><AdminBranding /></AdminLayout></AdminSupabaseProvider>} />
      <Route path="/revendedora/admin/gamification" element={<AdminSupabaseProvider><AdminLayout><AdminGamification /></AdminLayout></AdminSupabaseProvider>} />
      <Route path="/revendedora/admin/split-test" element={<AdminSupabaseProvider><AdminLayout><AdminSplitTest /></AdminLayout></AdminSupabaseProvider>} />
      
      {/* ===== ROTAS REVENDEDORA (apos login) ===== */}
      <Route path="/revendedora/reseller/dashboard" element={<ResellerLayout><ResellerDashboard /></ResellerLayout>} />
      <Route path="/revendedora/reseller/team" element={<ResellerLayout><ResellerTeam /></ResellerLayout>} />
      <Route path="/revendedora/reseller/sales" element={<ResellerLayout><ResellerSales /></ResellerLayout>} />
      <Route path="/revendedora/reseller/financial" element={<ResellerLayout><ResellerFinancial /></ResellerLayout>} />
      <Route path="/revendedora/reseller/store" element={<ResellerLayout><ResellerStore /></ResellerLayout>} />
      <Route path="/revendedora/reseller/checkout/:productId" element={<ResellerLayout><ResellerPagarmePayment /></ResellerLayout>} />
      <Route path="/revendedora/reseller/payment/pix/:saleId" element={<ResellerLayout><ResellerPaymentPix /></ResellerLayout>} />
      <Route path="/revendedora/reseller/payment/card/:saleId" element={<ResellerLayout><ResellerPaymentCard /></ResellerLayout>} />
      <Route path="/revendedora/reseller/gamification" element={<ResellerLayout><ResellerGamification /></ResellerLayout>} />
      <Route path="/revendedora/reseller/settings" element={<ResellerLayout><ResellerSettings /></ResellerLayout>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  </CompanyProvider>
  );
};

export default RevendedoraApp;
