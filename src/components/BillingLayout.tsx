import { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './billing/Sidebar';
import Header from './Header';
import Dashboard from '@/pages/billing/Dashboard';
import BankDashboard from '@/pages/billing/BankDashboard';
import Attachments from '@/pages/billing/Attachments';
import Settings from '@/pages/billing/Settings';
import Home from '@/pages/billing/Home';
import Creditos from '@/pages/Financeiro';

export const BillingLayout = () => {
  const location = useLocation();
  
  return (
    <div className="flex min-h-[calc(100vh-5rem)] w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-full mx-auto">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/banco/:itemId" element={<BankDashboard />} />
              <Route path="/dados-bancarios" element={<BankDashboard />} />
              <Route path="/creditos" element={<Creditos />} />
              <Route path="/anexos" element={<Attachments />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};
