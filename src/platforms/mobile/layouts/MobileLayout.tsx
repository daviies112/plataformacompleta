import { ReactNode } from 'react';
import MobileHeader from '@/components/MobileHeader';
import BottomNav from '@/components/BottomNav';

interface MobileLayoutProps {
  children: ReactNode;
}

/**
 * Layout Mobile Premium - Design touch-first otimizado para mobile 2025
 * - Header compacto premium 56px com glassmorphism
 * - Navegação inferior com micro-interações
 * - Safe area para dispositivos com notch
 * - Padding otimizado para toque e hierarquia visual
 */
const MobileLayout = ({ children }: MobileLayoutProps) => {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Mobile Header Premium - 56px */}
      <MobileHeader />
      
      {/* Main Content Area - Mobile Optimized Premium */}
      <main 
        className="pb-[calc(5rem+env(safe-area-inset-bottom))]" 
        style={{ marginTop: '80px' }}
      >
        <div className="pt-4 px-4">
          {children}
        </div>
      </main>
      
      {/* Bottom Navigation Premium */}
      <BottomNav />
    </div>
  );
};

export default MobileLayout;
