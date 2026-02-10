import { useState, useEffect, useRef } from 'react';
import {
  Smartphone, Monitor, LayoutDashboard, Store, DollarSign,
  Users, TrendingUp, ShoppingCart, BarChart3, Wallet,
  Mail, CreditCard
} from 'lucide-react';

interface PlatformPreviewProps {
  backgroundColor: string;
  headingColor: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
  sidebarColor: string;
  logoUrl: string;
  logoSize: 'small' | 'medium' | 'large';
  companyName?: string;
}

const logoSizeMap = { small: 48, medium: 80, large: 120 };
const TOTAL_PAGES = 3;
const PAGE_LABELS = ['Login', 'Dashboard', 'Loja'];

export function PlatformPreview({
  backgroundColor,
  headingColor,
  textColor,
  buttonColor,
  buttonTextColor,
  sidebarColor,
  logoUrl,
  logoSize,
  companyName,
}: PlatformPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDesktop = viewMode === 'desktop';

  const goTo = (page: number) => {
    if (transitioning || page === currentPage) return;
    setTransitioning(true);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      setCurrentPage(page);
      setTransitioning(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  const logoEl = logoUrl ? (
    <img
      src={logoUrl}
      alt="Logo"
      style={{ height: logoSizeMap[logoSize], objectFit: 'contain' as const }}
      data-testid="platform-preview-logo"
    />
  ) : null;

  const smallLogoEl = logoUrl ? (
    <img
      src={logoUrl}
      alt="Logo"
      style={{ height: 24, objectFit: 'contain' as const }}
    />
  ) : null;

  const sidebarTextColor = '#ffffff';

  const renderSidebar = (activePage: number) => {
    const menuItems = [
      { label: 'Dashboard', icon: LayoutDashboard, page: 1 },
      { label: 'Loja', icon: Store, page: 2 },
      { label: 'Vendas', icon: TrendingUp, page: -1 },
      { label: 'Financeiro', icon: Wallet, page: -1 },
    ];

    return (
      <div
        style={{
          backgroundColor: sidebarColor,
          width: isDesktop ? 120 : 80,
          minHeight: '100%',
          padding: isDesktop ? '12px 8px' : '8px 4px',
          display: 'flex',
          flexDirection: 'column' as const,
          gap: isDesktop ? 4 : 2,
        }}
      >
        {smallLogoEl && (
          <div style={{ padding: '4px 8px 8px', display: 'flex', justifyContent: 'center' }}>
            <img
              src={logoUrl}
              alt="Logo"
              style={{ height: isDesktop ? 20 : 16, objectFit: 'contain' as const, filter: 'brightness(10)' }}
            />
          </div>
        )}
        {menuItems.map((item) => {
          const isActive = item.page === activePage;
          return (
            <button
              key={item.label}
              onClick={() => { if (item.page > 0) goTo(item.page); }}
              data-testid={`sidebar-item-${item.label.toLowerCase()}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isDesktop ? 6 : 4,
                padding: isDesktop ? '6px 8px' : '4px 6px',
                borderRadius: 4,
                border: 'none',
                cursor: item.page > 0 ? 'pointer' : 'default',
                backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: sidebarTextColor,
                fontSize: isDesktop ? 11 : 9,
                fontWeight: isActive ? 600 : 400,
                textAlign: 'left' as const,
                width: '100%',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              <item.icon style={{ width: isDesktop ? 14 : 10, height: isDesktop ? 14 : 10, flexShrink: 0 }} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderLoginPage = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: isDesktop ? 32 : 20,
      minHeight: isDesktop ? 340 : 400,
      gap: isDesktop ? 16 : 12,
      fontFamily: 'Arial, sans-serif',
      background: buttonColor !== '#9b87f5'
        ? `linear-gradient(135deg, ${backgroundColor} 0%, ${sidebarColor}15 50%, ${backgroundColor} 100%)`
        : 'linear-gradient(to bottom right, #faf5ff, #eef2ff)', // from-purple-50 to-indigo-50
    }}>
      {/* Logo renderizado fora do card, como na página real */}
      {logoUrl && (
        <div style={{ marginBottom: 12 }}>
          <img
            src={logoUrl}
            alt="Logo"
            style={{
              height: logoSize === 'small' ? 48 : logoSize === 'large' ? 120 : 80,
              objectFit: 'contain'
            }}
          />
        </div>
      )}

      {/* Card que encapsula o formulário */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: isDesktop ? 24 : 16,
        width: '100%',
        maxWidth: isDesktop ? 320 : '100%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.1)',
      }}>
        {/* Ícone Shield se não tiver logo, renderizado dentro do card no topo */}
        {!logoUrl && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: buttonColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{ color: buttonTextColor }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        <h2
          style={{
            color: buttonColor !== '#9b87f5' ? headingColor : undefined, // Inherit or default if not custom
            fontSize: isDesktop ? 20 : 18,
            fontWeight: 700,
            margin: '0 0 4px 0',
            textAlign: 'center' as const,
          }}
          data-testid="platform-preview-title"
        >
          {companyName || 'Plataforma de Revendedores'}
        </h2>

        <p style={{
          fontSize: isDesktop ? 12 : 11,
          color: buttonColor !== '#9b87f5' ? `${textColor}99` : undefined, // Use default text color if not custom
          textAlign: 'center',
          margin: '0 0 20px 0'
        }}>
          Faça login para acessar a plataforma
        </p>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
          <div>
            <label style={{ fontSize: isDesktop ? 12 : 11, color: buttonColor !== '#9b87f5' ? textColor : '#000', fontWeight: 500, display: 'block', marginBottom: 6, fontFamily: 'Arial, sans-serif' }}>
              Email
            </label>
            <div
              data-testid="mock-input-email"
              style={{
                width: '100%',
                padding: isDesktop ? '8px 12px' : '8px 10px',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                fontSize: isDesktop ? 13 : 12,
                color: '#64748b',
                fontFamily: 'Arial, sans-serif',
                boxSizing: 'border-box' as const,
              }}
            >
              seu@email.com
            </div>
          </div>
          <div>
            <label style={{ fontSize: isDesktop ? 12 : 11, color: buttonColor !== '#9b87f5' ? textColor : '#000', fontWeight: 500, display: 'block', marginBottom: 6, fontFamily: 'Arial, sans-serif' }}>
              CPF
            </label>
            <div
              data-testid="mock-input-cpf"
              style={{
                width: '100%',
                padding: isDesktop ? '8px 12px' : '8px 10px',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                fontSize: isDesktop ? 13 : 12,
                color: '#64748b',
                fontFamily: 'Arial, sans-serif',
                boxSizing: 'border-box' as const,
              }}
            >
              000.000.000-00
            </div>
          </div>
          <button
            data-testid="mock-button-entrar"
            style={{
              width: '100%',
              padding: isDesktop ? '10px' : '10px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: buttonColor,
              color: buttonTextColor,
              fontSize: isDesktop ? 13 : 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'Arial, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 4
            }}
            onClick={() => goTo(1)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" x2="3" y1="12" y2="12" />
            </svg>
            Entrar
          </button>
        </div>
      </div>
    </div>
  );

  const renderDashboardPage = () => {
    const stats = [
      { label: 'Vendas', value: 'R$ 12.450', icon: TrendingUp, color: '#22c55e' },
      { label: 'Clientes', value: '148', icon: Users, color: '#3b82f6' },
      { label: 'Receita', value: 'R$ 8.920', icon: BarChart3, color: '#a855f7' },
    ];

    return (
      <div style={{ display: 'flex', minHeight: isDesktop ? 340 : 400, fontFamily: 'Arial, sans-serif' }}>
        {renderSidebar(1)}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: isDesktop ? '8px 16px' : '6px 10px',
            borderBottom: `1px solid ${textColor}15`,
          }}>
            {smallLogoEl}
            <span style={{ fontSize: isDesktop ? 13 : 10, fontWeight: 600, color: headingColor }}>Dashboard</span>
          </div>
          <div style={{ flex: 1, padding: isDesktop ? 16 : 10 }}>
            <h3 style={{ fontSize: isDesktop ? 14 : 11, fontWeight: 600, color: headingColor, margin: '0 0 12px 0' }}>
              Visão Geral
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr',
              gap: isDesktop ? 10 : 6,
            }}>
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  data-testid={`stat-card-${stat.label.toLowerCase()}`}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 8,
                    padding: isDesktop ? '14px 12px' : '10px 8px',
                    border: `1px solid ${textColor}10`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: isDesktop ? 10 : 8, color: textColor, fontWeight: 500 }}>{stat.label}</span>
                    <stat.icon style={{ width: isDesktop ? 14 : 10, height: isDesktop ? 14 : 10, color: stat.color }} />
                  </div>
                  <div style={{ fontSize: isDesktop ? 16 : 12, fontWeight: 700, color: headingColor }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: isDesktop ? 9 : 7, color: `${textColor}80`, marginTop: 2 }}>
                    +12% este mês
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStorePage = () => {
    const products = [
      { name: 'Colar Elegance', price: 'R$ 89,90', color: '#f59e0b' },
      { name: 'Brinco Aurora', price: 'R$ 45,00', color: '#ec4899' },
      { name: 'Pulseira Royal', price: 'R$ 65,50', color: '#8b5cf6' },
    ];

    return (
      <div style={{ display: 'flex', minHeight: isDesktop ? 340 : 400, fontFamily: 'Arial, sans-serif' }}>
        {renderSidebar(2)}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: isDesktop ? '8px 16px' : '6px 10px',
            borderBottom: `1px solid ${textColor}15`,
          }}>
            {smallLogoEl}
            <span style={{ fontSize: isDesktop ? 13 : 10, fontWeight: 600, color: headingColor }}>Minha Loja</span>
          </div>
          <div style={{ flex: 1, padding: isDesktop ? 16 : 10 }}>
            <h3 style={{ fontSize: isDesktop ? 14 : 11, fontWeight: 600, color: headingColor, margin: '0 0 12px 0' }}>
              Minha Loja
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr',
              gap: isDesktop ? 10 : 6,
            }}>
              {products.map((product, idx) => (
                <div
                  key={product.name}
                  data-testid={`product-card-${idx}`}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: `1px solid ${textColor}10`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{
                    height: isDesktop ? 60 : 48,
                    backgroundColor: product.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <ShoppingCart style={{ width: isDesktop ? 20 : 16, height: isDesktop ? 20 : 16, color: '#ffffff' }} />
                  </div>
                  <div style={{ padding: isDesktop ? '10px 10px' : '6px 8px' }}>
                    <div style={{ fontSize: isDesktop ? 11 : 9, fontWeight: 600, color: headingColor, marginBottom: 2 }}>
                      {product.name}
                    </div>
                    <div style={{ fontSize: isDesktop ? 12 : 10, fontWeight: 700, color: buttonColor, marginBottom: 6 }}>
                      {product.price}
                    </div>
                    <button
                      data-testid={`button-comprar-${idx}`}
                      style={{
                        width: '100%',
                        padding: isDesktop ? '6px' : '4px',
                        borderRadius: 4,
                        border: 'none',
                        backgroundColor: buttonColor,
                        color: buttonTextColor,
                        fontSize: isDesktop ? 10 : 8,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'Arial, sans-serif',
                      }}
                    >
                      Comprar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const pages = [renderLoginPage, renderDashboardPage, renderStorePage];

  const renderPageDots = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 0' }}>
      {PAGE_LABELS.map((label, i) => (
        <button
          key={label}
          onClick={() => goTo(i)}
          data-testid={`page-dot-${i}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: i === currentPage ? buttonColor : 'transparent',
            color: i === currentPage ? buttonTextColor : textColor,
            fontSize: isDesktop ? 10 : 8,
            fontWeight: i === currentPage ? 600 : 400,
            fontFamily: 'Arial, sans-serif',
            transition: 'all 200ms ease',
          }}
        >
          <span
            style={{
              width: i === currentPage ? 12 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === currentPage ? buttonTextColor : `${textColor}40`,
              display: 'inline-block',
              transition: 'all 200ms ease',
            }}
          />
          {label}
        </button>
      ))}
    </div>
  );

  const viewToggle = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, marginBottom: 12 }}>
      <button
        onClick={() => setViewMode('mobile')}
        data-testid="button-view-mobile"
        className="flex items-center gap-1 px-3 py-1.5 rounded-l-md text-xs font-medium transition-colors"
        style={{
          backgroundColor: viewMode === 'mobile' ? buttonColor : 'transparent',
          color: viewMode === 'mobile' ? buttonTextColor : undefined,
          border: `1px solid ${viewMode === 'mobile' ? buttonColor : 'hsl(var(--border))'}`,
        }}
      >
        <Smartphone className="w-3.5 h-3.5" />
        Mobile
      </button>
      <button
        onClick={() => setViewMode('desktop')}
        data-testid="button-view-desktop"
        className="flex items-center gap-1 px-3 py-1.5 rounded-r-md text-xs font-medium transition-colors"
        style={{
          backgroundColor: viewMode === 'desktop' ? buttonColor : 'transparent',
          color: viewMode === 'desktop' ? buttonTextColor : undefined,
          border: `1px solid ${viewMode === 'desktop' ? buttonColor : 'hsl(var(--border))'}`,
        }}
      >
        <Monitor className="w-3.5 h-3.5" />
        Desktop
      </button>
    </div>
  );

  if (isDesktop) {
    return (
      <div>
        {viewToggle}
        <div
          className="rounded-lg border-2 border-foreground/20 overflow-hidden shadow-xl"
          data-testid="platform-preview-desktop"
        >
          <div className="bg-foreground/10 h-8 flex items-center gap-2 px-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
              <div className="w-3 h-3 rounded-full bg-green-400/60" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-foreground/10 rounded-md px-3 py-0.5 text-[9px] text-muted-foreground max-w-[180px] truncate">
                app.seudominio.com/revendedora
              </div>
            </div>
          </div>
          <div
            style={{
              backgroundColor,
              minHeight: 400,
              fontFamily: 'Arial, sans-serif',
              transition: 'opacity 150ms ease',
              opacity: transitioning ? 0 : 1,
            }}
          >
            {renderPageDots()}
            {pages[currentPage]()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {viewToggle}
      <div className="rounded-[2rem] border-4 border-foreground/20 overflow-hidden shadow-xl" data-testid="platform-preview-mobile">
        <div className="bg-foreground/20 h-6 flex items-center justify-center">
          <div className="w-16 h-3 rounded-full bg-foreground/30" />
        </div>
        <div
          style={{
            backgroundColor,
            minHeight: 480,
            fontFamily: 'Arial, sans-serif',
            transition: 'opacity 150ms ease',
            opacity: transitioning ? 0 : 1,
          }}
        >
          {renderPageDots()}
          {pages[currentPage]()}
        </div>
      </div>
    </div>
  );
}
