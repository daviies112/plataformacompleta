import { useState } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from '@/pages/billing/Dashboard';
import BankDashboard from '@/pages/billing/BankDashboard';
import Attachments from '@/pages/billing/Attachments';
import Settings from '@/pages/billing/Settings';
import Home from '@/pages/billing/Home';

export const BillingLayout = () => {
  const [location] = useLocation();
  
  return (
    <div className="flex min-h-[calc(100vh-5rem)] w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-full mx-auto">
            <Switch>
              <Route path="/faturamento" component={Home} />
              <Route path="/faturamento/dashboard" component={Dashboard} />
              <Route path="/faturamento/banco/:itemId" component={BankDashboard} />
              <Route path="/faturamento/anexos" component={Attachments} />
              <Route path="/faturamento/settings" component={Settings} />
            </Switch>
          </div>
        </div>
      </div>
    </div>
  );
};
