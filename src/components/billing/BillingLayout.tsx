import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Dashboard from '@/pages/billing/Dashboard';
import BankDashboard from '@/pages/billing/BankDashboard';
import Attachments from '@/pages/billing/Attachments';
import Home from '@/pages/billing/Home';
import BankAccountSetup from '@/pages/billing/BankAccountSetup';
import Creditos from '@/pages/Financeiro';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { PremiumButton } from '@/platforms/shared/premium/PremiumButton';
import { Menu, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

export const BillingLayout = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] w-full relative">
      {/* Premium Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background/98 to-muted/3 pointer-events-none" />
      <div className="fixed top-0 left-1/3 w-96 h-96 bg-emerald-500/4 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="fixed bottom-0 right-1/3 w-80 h-80 bg-blue-500/3 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '3s' }} />

      {/* Premium Header */}
      <header className="relative z-10 border-b border-white/10 bg-white/[0.02] backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-4 sm:pb-6 lg:pb-8">
          <div className="flex items-center gap-4">
            {isMobile && (
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <button className={cn(
                    "min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center",
                    "bg-white/[0.03] backdrop-blur-xl border border-white/10",
                    "hover:bg-white/[0.06] hover:border-white/20",
                    "active:scale-95 transition-all"
                  )}>
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0 bg-background/95 backdrop-blur-xl">
                  <Sidebar />
                </SheetContent>
              </Sheet>
            )}
            <div className="flex items-center gap-4 flex-1">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/20">
                <Wallet className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-4xl lg:text-2xl font-black text-foreground tracking-tight bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
                  Gestão Financeira
                </h1>
                <p className="text-xl lg:text-sm text-muted-foreground/80 mt-2">
                  Conecte seus bancos de forma segura e gerencie todas as suas contas
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Sidebar + Content */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {!isMobile && (
          <div data-tour="billing-sidebar" className="shrink-0">
            <Sidebar />
          </div>
        )}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-transparent via-white/[0.01] to-transparent">
          <div className="max-w-full mx-auto">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dados-bancarios" element={<BankAccountSetup />} />
              <Route path="/banco/:itemId" element={<BankDashboard />} />
              <Route path="/creditos" element={<Creditos />} />
              <Route path="/anexos" element={<Attachments />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};
