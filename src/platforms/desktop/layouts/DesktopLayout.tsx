import { ReactNode } from 'react';
import HeaderNavigation from '@/components/HeaderNavigation';

interface DesktopLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

/**
 * Layout Desktop - Design profissional para telas grandes
 * - Header fixo no topo com navegação horizontal
 * - Área de conteúdo principal com padding adequado
 * - Otimizado para mouse e teclado
 */
const DesktopLayout = ({ children, fullWidth = false }: DesktopLayoutProps) => {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Desktop Header */}
      <HeaderNavigation />

      {/* Main Content Area - Desktop Optimized */}
      <main className="pt-16">
        {fullWidth ? (
          children
        ) : (
          <div className="container-luxury py-6">
            {children}
          </div>
        )}
      </main>
    </div>
  );
};

export default DesktopLayout;
