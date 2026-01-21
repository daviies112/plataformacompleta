// ============================================================================
// REVENDEDORA FEATURE - COMPLETE EXPORT FILE
// ============================================================================
// This file provides a centralized export for all revendedora feature modules.
// Import from '@/features/revendedora' for clean access to all exports.
// ============================================================================

// ============================================================================
// MAIN APP & ROUTING
// ============================================================================
export { default as RevendedoraApp } from './RevendedoraApp';

// ============================================================================
// CONTEXTS
// ============================================================================
export { AuthProvider, useAuth } from './contexts/AuthContext';
export { CompanyProvider, useCompany } from './contexts/CompanyContext';

// ============================================================================
// LAYOUTS
// ============================================================================
export { AdminLayout } from './layouts/AdminLayout';
export { ResellerLayout } from './layouts/ResellerLayout';

// ============================================================================
// ADMIN PAGES
// ============================================================================
export { default as AdminDashboard } from './pages/admin/Dashboard';
export { default as AdminProducts } from './pages/admin/Products';
export { default as AdminOrders } from './pages/admin/Orders';
export { default as AdminResellers } from './pages/admin/Resellers';
export { default as AdminResellerDetails } from './pages/admin/ResellerDetails';
export { default as AdminCommissions } from './pages/admin/Commissions';
export { default as AdminCommissionConfiguration } from './pages/admin/CommissionConfiguration';
export { default as AdminProductRequests } from './pages/admin/ProductRequests';
export { default as AdminAnalytics } from './pages/admin/Analytics';
export { default as AdminSettings } from './pages/admin/Settings';
export { default as AdminBranding } from './pages/admin/Branding';
export { default as AdminGamification } from './pages/admin/Gamification';
export { default as AdminEvolutionConfig } from './pages/admin/EvolutionConfig';
export { default as AdminProductForm } from './pages/admin/ProductForm';

// ============================================================================
// RESELLER PAGES
// ============================================================================
export { default as ResellerDashboard } from './pages/reseller/Dashboard';
export { default as ResellerTeam } from './pages/reseller/Team';
export { default as ResellerSales } from './pages/reseller/Sales';
export { default as ResellerFinancial } from './pages/reseller/Financial';
export { default as ResellerStore } from './pages/reseller/Store';
export { default as ResellerProducts } from './pages/reseller/Products';
export { default as ResellerPaymentPix } from './pages/reseller/PaymentPix';
export { default as ResellerPaymentCard } from './pages/reseller/PaymentCard';
export { default as ResellerPaymentLinks } from './pages/reseller/PaymentLinks';
export { default as ResellerCreatePaymentLink } from './pages/reseller/CreatePaymentLink';
export { default as ResellerGamification } from './pages/reseller/Gamification';
export { default as ResellerWithdrawals } from './pages/reseller/Withdrawals';

// ============================================================================
// PUBLIC PAGES
// ============================================================================
export { default as Checkout } from './pages/public/Checkout';
export { default as Storefront } from './pages/public/Storefront';
export { default as OrderSuccess } from './pages/public/OrderSuccess';
export { default as TrackOrder } from './pages/public/TrackOrder';
export { default as ProductView } from './pages/public/ProductView';

// ============================================================================
// ROOT PAGES
// ============================================================================
export { default as RevendedoraIndex } from './pages/Index';
export { default as RevendedoraLogin } from './pages/Login';
export { default as RevendedoraNotFound } from './pages/NotFound';
export { default as RevendedoraDemo } from './pages/Demo';

// ============================================================================
// HOOKS - Re-export from hooks/index.ts
// ============================================================================
export * from './hooks';

// ============================================================================
// SERVICES
// ============================================================================
export * from './services/PaymentService';
export * from './services/SplitService';

// ============================================================================
// COMPONENTS - Main Components (Named exports)
// ============================================================================
export { AppHeader } from './components/AppHeader';
export { AppSidebar } from './components/AppSidebar';
export { NotificationBell } from './components/NotificationBell';
export { NavLink } from './components/NavLink';
export { ImageUploader } from './components/ImageUploader';
export { ColorPicker } from './components/ColorPicker';
export { StatCard, OrderCard, ProductCard, ResellerCard } from './components/Cards';
export { BrandingLogoUploader } from './components/BrandingLogoUploader';
export { default as BrandingPreview } from './components/BrandingPreview';
export { PaletteSuggestions } from './components/PaletteSuggestions';

// ============================================================================
// COMPONENTS - Financial (Named exports)
// ============================================================================
export { BalanceCard } from './components/financial/BalanceCard';
export { BankAccountForm } from './components/financial/BankAccountForm';
export { FutureBalanceList } from './components/financial/FutureBalanceList';
export { WithdrawalModal } from './components/financial/WithdrawalModal';

// ============================================================================
// COMPONENTS - Gamification (Named exports via barrel)
// ============================================================================
export * from './components/gamification';

// ============================================================================
// COMPONENTS - Inventory (Named exports)
// ============================================================================
export { BestSellingProducts } from './components/inventory/BestSellingProducts';
export { LowStockAlert } from './components/inventory/LowStockAlert';
export { ProductEditModal } from './components/inventory/ProductEditModal';
export { ProductInventorySettingsModal } from './components/inventory/ProductInventorySettingsModal';
export { StockForecastPanel } from './components/inventory/StockForecastPanel';

// ============================================================================
// COMPONENTS - Modals (Named exports)
// ============================================================================
export { ProductRequestModal } from './components/modals/ProductRequestModal';
export { SellProductModal } from './components/modals/SellProductModal';

// ============================================================================
// COMPONENTS - Reseller (Named exports)
// ============================================================================
export { ResellerProfileForm } from './components/reseller/ResellerProfileForm';

// ============================================================================
// COMPONENTS - Chat (Named exports)
// ============================================================================
export { ChatWidget } from './components/chat/ChatWidget';

// ============================================================================
// TYPES
// ============================================================================
export * from './types/gamification';

// ============================================================================
// UTILS
// ============================================================================
export * from './utils/colorExtractor';
