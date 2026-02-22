import React, { useState, useEffect } from 'react';
import type { StoreSettings, StoreBanner, StoreCampaign, StoreBenefit, StoreVideo, StoreMosaic } from '../../../server/services/storeService';
import { hexToHSL } from '@/features/revendedora/contexts/CompanyContext';

interface StorePreviewProps {
  settings: Partial<StoreSettings>;
  showFullPage?: boolean; // Se true, mostra página completa; se false, mostra só um card preview
  banners?: StoreBanner[];
  campaigns?: StoreCampaign[];
  benefits?: StoreBenefit[];
  videos?: StoreVideo[];
  mosaics?: StoreMosaic[];
  products?: any[];
}

// Helper function para converter nome do ícone em emoji
function getIconEmoji(iconName: string): string {
  const iconMap: Record<string, string> = {
    gift: '🎁',
    shield: '🛡️',
    truck: '🚚',
    certificate: '📜',
    star: '⭐',
    clock: '⏰',
    heart: '❤️',
    lock: '🔒'
  };
  return iconMap[iconName] || '🎁';
}

function getYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function getVimeoId(url: string): string | null {
  const regExp = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:\w+\/)?|album\/(?:\d+\/)?video\/|)(\d+)(?:$|\/|\?)/;
  const match = url.match(regExp);
  return (match && match[1]) ? match[1] : null;
}

/**
 * StorePreview - Componente de preview da loja com Design System Nacre
 *
 * Mostra em tempo real como a loja ficará com as personalizações aplicadas.
 * Inspiração: Vivara, Pandora, Tiffany & Co (luxo acessível)
 */
export default function StorePreview({
  settings,
  showFullPage = true,
  banners = [],
  campaigns = [],
  benefits = [],
  videos = [],
  mosaics = [],
  products = []
}: StorePreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-rotate banners
  useEffect(() => {
    if (banners.length <= 1 || !settings.hero_banner_autoplay) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, (settings.hero_banner_interval || 5) * 1000);

    return () => clearInterval(interval);
  }, [banners.length, settings.hero_banner_autoplay, settings.hero_banner_interval]);

  // Load Fonts Dynamically
  useEffect(() => {
    const headingFont = settings.font_heading || 'Cormorant Garamond';
    const bodyFont = settings.font_body || 'DM Sans';

    const linkId = 'store-preview-fonts';
    let link = document.getElementById(linkId) as HTMLLinkElement;

    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    const fonts = [headingFont, bodyFont].map(f => f.replace(/ /g, '+')).join('&family=');
    link.href = `https://fonts.googleapis.com/css2?family=${fonts}:wght@300;400;500;600;700&display=swap`;
  }, [settings.font_heading, settings.font_body]);

  // Valores padrão do Design System Nacre
  const defaultSettings: StoreSettings = {
    tenant_id: '',
    store_name: 'Minha Loja',
    store_tagline: 'Elegância em Cada Detalhe',
    color_primary: '#C9A84C',
    color_primary_light: '#E8CC7A',
    color_primary_dim: '#7A6128',
    color_background: '#080808',
    color_surface: '#111111',
    color_text_primary: '#F5F0E8',
    color_text_secondary: '#B8B0A0',
    color_text_tertiary: '#6B6358',
    font_heading: 'Cormorant Garamond',
    font_body: 'DM Sans',
    layout_type: 'grid',
    layout_columns: 3,
    header_background: '#080808',
    header_text_color: '#F5F0E8',
    footer_background: '#080808',
    footer_text_color: '#B8B0A0',
    show_announcement_bar: false,
    show_search_bar: true,
    show_cart: true,
    show_banner: true,
    show_benefits_bar: true,
    show_active_campaign: true,
    show_categories: true,
    show_video_section: true,
    show_mosaic_section: true
  };

  // Mesclar settings personalizados com padrões
  const s = { ...defaultSettings, ...settings };

  console.log('[StorePreview] Received Settings:', settings);
  console.log('[StorePreview] Merged Settings (s):', s);
  console.log('[StorePreview] Layout Type:', s.layout_type);
  console.log('[StorePreview] Layout Columns:', s.layout_columns);

  // Produtos de exemplo para preview ou reais
  const displayProducts = React.useMemo(() => {
    if (products && products.length > 0) {
      return products.map(p => ({
        id: p.id,
        name: p.description || p.name || 'Produto sem nome',
        price: Number(p.price) || 0,
        image: p.image || p.image_url || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=400&fit=crop'
      }));
    }

    return [
      {
        id: 1,
        name: 'Anel Solitário Dourado',
        price: 129.90,
        image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=400&fit=crop'
      },
      {
        id: 2,
        name: 'Colar Vivara Gold',
        price: 249.90,
        image: 'https://images.unsplash.com/photo-1599643478518-17488fbbcd75?w=400&h=500&fit=crop'
      },
      {
        id: 3,
        name: 'Brincos Diamond',
        price: 189.90,
        image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=400&fit=crop'
      },
      {
        id: 4,
        name: 'Pulseira Charm',
        price: 129.90,
        image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&h=300&fit=crop'
      },
      {
        id: 5,
        name: 'Anel Solitário',
        price: 159.90,
        image: 'https://images.unsplash.com/photo-1603974372310-4929a8b7509c?w=400&h=450&fit=crop'
      },
      {
        id: 6,
        name: 'Anel de Noivado Luxo',
        price: 499.90,
        image: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=400&h=300&fit=crop'
      }
    ];
  }, [products]);

  if (!showFullPage) {
    // Preview compacto (card)
    return (
      <div
        className="preview-card"
        style={{
          backgroundColor: s.color_surface,
          borderRadius: '12px',
          border: `1px solid ${s.color_primary}33`,
          padding: '24px',
          fontFamily: s.font_body,
          '--primary': hexToHSL(s.color_primary),
          '--secondary': hexToHSL(s.color_text_secondary),
          '--accent': hexToHSL(s.color_primary_light || s.color_primary),
        } as React.CSSProperties}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          {s.logo_url && s.logo_url.trim() !== '' ? (
            <img
              src={s.logo_url}
              alt={s.store_name}
              style={{ maxHeight: '60px', marginBottom: '12px' }}
            />
          ) : (
            <div
              style={{
                fontFamily: s.font_heading,
                fontSize: '28px',
                fontWeight: '300',
                color: s.color_text_primary,
                marginBottom: '8px'
              }}
            >
              {s.store_name}
            </div>
          )}
          <div style={{ color: s.color_text_secondary, fontSize: '14px' }}>
            {s.store_tagline || 'Sua loja de semijoias'}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {displayProducts.slice(0, 4).map((product) => (
            <div
              key={product.id}
              style={{
                backgroundColor: s.color_background,
                borderRadius: '8px',
                overflow: 'hidden',
                border: `1px solid ${s.color_primary}22`
              }}
            >
              <div style={{ aspectRatio: '1', background: '#1A1A1A' }} />
              <div style={{ padding: '12px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    color: s.color_text_primary,
                    marginBottom: '4px',
                    fontFamily: s.font_body,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {product.name}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: s.color_primary
                  }}
                >
                  R$ {product.price.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Preview completo (página inteira)
  return (
    <div
      className="store-preview-full"
      style={{
        fontFamily: s.font_body,
        backgroundColor: s.color_background,
        color: s.color_text_primary,
        minHeight: '100vh',
        width: '100%',
        '--primary': hexToHSL(s.color_primary),
        '--secondary': hexToHSL(s.color_text_secondary),
        '--accent': hexToHSL(s.color_primary_light || s.color_primary),
      } as React.CSSProperties}
    >
      {/* ANNOUNCEMENT BAR */}
      {s.show_announcement_bar && (
        <div
          style={{
            backgroundColor: s.announcement_bar_bg_color || '#000000',
            color: s.announcement_bar_text_color || '#FFFFFF',
            padding: '8px 40px',
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: '600',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontFamily: s.font_body
          }}
        >
          {s.announcement_bar_text || 'Insira seu aviso aqui'}
        </div>
      )}

      {/* HEADER */}
      <header
        style={{
          backgroundColor: s.header_background,
          borderBottom: `1px solid ${s.color_primary}22`,
          padding: '16px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {s.logo_url && s.logo_url.trim() !== '' ? (
            <img
              src={s.logo_url}
              alt={s.store_name}
              style={{
                maxHeight: s.logo_size === 'small' ? '32px' : s.logo_size === 'large' ? '56px' : '40px'
              }}
            />
          ) : (
            <div
              style={{
                fontFamily: s.font_heading,
                fontSize: '24px',
                fontWeight: '600',
                color: s.header_text_color,
                letterSpacing: '-0.02em'
              }}
            >
              {s.store_name}
            </div>
          )}

          <nav style={{ display: 'flex', gap: '24px' }}>
            {['Início', 'Produtos', 'Coleções', 'Sobre'].map((item) => (
              <a
                key={item}
                href="#"
                style={{
                  color: s.color_text_secondary,
                  fontSize: '13px',
                  fontWeight: '500',
                  textDecoration: 'none',
                  letterSpacing: '0.02em',
                  transition: 'color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = s.color_primary || '')}
                onMouseLeave={(e) => (e.currentTarget.style.color = s.color_text_secondary || '')}
              >
                {item}
              </a>
            ))}
          </nav>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {s.show_search_bar && (
            <div
              style={{
                backgroundColor: s.color_surface,
                border: `1px solid ${s.color_primary}22`,
                borderRadius: '6px',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z"
                  stroke={s.color_text_tertiary}
                  strokeWidth="1.5"
                />
                <path d="M11 11L14 14" stroke={s.color_text_tertiary} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span style={{ color: s.color_text_tertiary, fontSize: '13px' }}>Buscar...</span>
            </div>
          )}

          {s.show_cart && (
            <button
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: s.color_text_primary,
                cursor: 'pointer',
                padding: '8px'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M2 2H3.5L5.5 12H16L18 6H5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="7" cy="17" r="1" fill="currentColor" />
                <circle cx="15" cy="17" r="1" fill="currentColor" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* HERO BANNERS CAROUSEL */}
      {banners.length > 0 && s.show_banner ? (
        <section style={{ position: 'relative', height: '500px', overflow: 'hidden' }}>
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: banner.media_type !== 'video' && banner.image_url ? `url(${banner.image_url})` : 'none',
                backgroundColor: s.color_surface,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: currentSlide === index ? 1 : 0,
                transition: 'opacity 0.6s ease-in-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {banner.media_type === 'video' && banner.video_url && (
                <video
                  src={banner.video_url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: 1
                  }}
                />
              )}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  textAlign: 'center',
                  maxWidth: '800px',
                  padding: '40px',
                  backgroundColor: banner.image_url ? 'rgba(8, 8, 8, 0.6)' : 'transparent',
                  borderRadius: '12px'
                }}
              >
                {banner.title && (
                  <h1
                    style={{
                      fontFamily: s.font_heading,
                      fontSize: '48px',
                      fontWeight: '300',
                      color: '#F5F0E8',
                      marginBottom: '16px',
                      letterSpacing: '-0.02em'
                    }}
                  >
                    {banner.title}
                  </h1>
                )}
                {banner.subtitle && (
                  <p
                    style={{
                      fontSize: '18px',
                      color: '#E8E0D8',
                      marginBottom: '24px',
                      lineHeight: '1.6'
                    }}
                  >
                    {banner.subtitle}
                  </p>
                )}
                {banner.cta_text && (
                  <button
                    style={{
                      backgroundColor: s.color_primary,
                      color: '#080808',
                      border: 'none',
                      padding: '12px 32px',
                      fontSize: '13px',
                      fontWeight: '600',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontFamily: s.font_body,
                      transition: 'background-color 0.3s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = s.color_primary_light || s.color_primary || '')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = s.color_primary || '')}
                  >
                    {banner.cta_text}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Navigation Dots */}
          {banners.length > 1 && (
            <div
              style={{
                position: 'absolute',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '8px',
                zIndex: 3
              }}
            >
              {banners.map((_, index) => (
                <div
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  style={{
                    width: currentSlide === index ? '24px' : '8px',
                    height: '8px',
                    backgroundColor: currentSlide === index ? s.color_primary : '#ffffff50',
                    borderRadius: '4px',
                    transition: 'all 0.3s',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
          )}
        </section>
      ) : s.show_banner ? (
        // Default Hero quando não há banners
        <section
          style={{
            backgroundColor: s.color_surface,
            padding: '80px 40px',
            textAlign: 'center',
            borderBottom: `1px solid ${s.color_primary}22`
          }}
        >
          <h1
            style={{
              fontFamily: s.font_heading,
              fontSize: '56px',
              fontWeight: '300',
              color: s.color_text_primary,
              marginBottom: '16px',
              letterSpacing: '-0.03em',
              lineHeight: '1.1'
            }}
          >
            {s.store_tagline || 'Elegância em Cada Detalhe'}
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: s.color_text_secondary,
              marginBottom: '32px',
              maxWidth: '600px',
              margin: '0 auto 32px'
            }}
          >
            Descubra peças únicas que combinam sofisticação e estilo atemporal
          </p>
          <button
            style={{
              backgroundColor: s.color_primary,
              color: '#080808',
              border: 'none',
              padding: '12px 32px',
              fontSize: '13px',
              fontWeight: '600',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: s.font_body,
              transition: 'background-color 0.3s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = s.color_primary_light || s.color_primary || '')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = s.color_primary || '')}
          >
            Ver Coleção
          </button>
        </section>
      ) : null
      }

      {/* BENEFITS BAR */}
      {
        benefits && benefits.length > 0 && s.show_benefits_bar && (
          <section
            style={{
              backgroundColor: s.benefits_bar_background || s.color_surface,
              borderTop: `1px solid ${s.color_primary}22`,
              borderBottom: `1px solid ${s.color_primary}22`,
              padding: '24px 40px'
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(benefits.length, 4)}, 1fr)`,
                gap: '32px',
                maxWidth: '1200px',
                margin: '0 auto'
              }}
            >
              {benefits.slice(0, 4).map((benefit, index) => (
                <div key={benefit?.id || index} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>
                    {getIconEmoji(benefit?.icon || 'gift')}
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: s.color_text_primary,
                      marginBottom: '4px',
                      fontFamily: s.font_body
                    }}
                  >
                    {benefit?.title || ''}
                  </div>
                  {benefit?.description && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: s.color_text_secondary,
                        lineHeight: '1.4'
                      }}
                    >
                      {benefit.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )
      }

      {/* MOSAIC SECTION */}
      {
        mosaics && mosaics.length > 0 && s.show_mosaic_section && (
          <section style={{ padding: '64px 40px', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '24px',
              gridAutoRows: 'minmax(250px, auto)'
            }}>
              {mosaics.sort((a, b) => a.display_order - b.display_order).map((mosaic) => {
                // Calcular span baseado no layout_type
                let colSpan = 'span 12'; // Default mobile/full
                let rowSpan = 'span 1';

                if (mosaic.layout_type === '1x1') { colSpan = 'span 3'; rowSpan = 'span 1'; }
                else if (mosaic.layout_type === '2x1') { colSpan = 'span 6'; rowSpan = 'span 1'; }
                else if (mosaic.layout_type === '2x2') { colSpan = 'span 6'; rowSpan = 'span 2'; }
                else if (mosaic.layout_type === '4x2') { colSpan = 'span 12'; rowSpan = 'span 2'; }

                return (
                  <div
                    key={mosaic.id}
                    style={{
                      gridColumn: colSpan,
                      gridRow: rowSpan,
                      position: 'relative',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      minHeight: '250px'
                    }}
                  >
                    {mosaic.media_type === 'video' && mosaic.video_url ? (
                      <video
                        src={mosaic.video_url}
                        autoPlay
                        muted
                        loop
                        playsInline
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.5s'
                        }}
                      />
                    ) : mosaic.image_url ? (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url(${mosaic.image_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        transition: 'transform 0.5s'
                      }} />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#222',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#444'
                      }}>
                        Sem Imagem
                      </div>
                    )}

                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.3s'
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.4)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.2)'}
                    >
                      {mosaic.title && (
                        <h3 style={{
                          color: '#FFF',
                          fontFamily: s.font_heading,
                          fontSize: '24px',
                          fontWeight: '400',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                        }}>
                          {mosaic.title}
                        </h3>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )
      }


      {/* ACTIVE CAMPAIGN */}
      {
        campaigns.length > 0 && s.show_active_campaign && (() => {
          const activeCampaign = campaigns.find((c) => {
            const now = new Date();
            const start = new Date(c.start_date);
            const end = new Date(c.end_date);
            return c.is_active && now >= start && now <= end;
          });

          if (!activeCampaign) return null;

          return (
            <section
              style={{
                padding: '64px 40px',
                backgroundColor: s.color_surface,
                borderBottom: `1px solid ${s.color_primary}22`
              }}
            >
              <div
                style={{
                  maxWidth: '1200px',
                  margin: '0 auto',
                  display: 'flex',
                  gap: '40px',
                  alignItems: 'center',
                  flexDirection: activeCampaign.image_url ? 'row' : 'column'
                }}
              >
                {(activeCampaign.media_type === 'video' && activeCampaign.video_url) ? (
                  <div style={{ flex: '1', minWidth: '400px' }}>
                    <video
                      src={activeCampaign.video_url}
                      autoPlay
                      muted
                      loop
                      playsInline
                      style={{
                        width: '100%',
                        borderRadius: '12px',
                        border: `1px solid ${s.color_primary}33`
                      }}
                    />
                  </div>
                ) : activeCampaign.image_url ? (
                  <div style={{ flex: '1', minWidth: '400px' }}>
                    <img
                      src={activeCampaign.image_url}
                      alt={activeCampaign.name}
                      style={{
                        width: '100%',
                        borderRadius: '12px',
                        border: `1px solid ${s.color_primary}33`
                      }}
                    />
                  </div>
                ) : null}
                <div style={{ flex: '1', textAlign: activeCampaign.image_url ? 'left' : 'center' }}>
                  {activeCampaign.badge_text && (
                    <span
                      style={{
                        display: 'inline-block',
                        backgroundColor: '#EF4444',
                        color: '#ffffff',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        marginBottom: '16px'
                      }}
                    >
                      {activeCampaign.badge_text}
                    </span>
                  )}
                  <h2
                    style={{
                      fontFamily: s.font_heading,
                      fontSize: '42px',
                      fontWeight: '400',
                      color: s.color_text_primary,
                      marginBottom: '16px',
                      letterSpacing: '-0.02em'
                    }}
                  >
                    {activeCampaign.name}
                  </h2>
                  {activeCampaign.description && (
                    <p
                      style={{
                        fontSize: '16px',
                        color: s.color_text_secondary,
                        lineHeight: '1.6',
                        marginBottom: '16px'
                      }}
                    >
                      {activeCampaign.description}
                    </p>
                  )}
                  {activeCampaign.discount_percentage && activeCampaign.discount_percentage > 0 && (
                    <div
                      style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        color: s.color_primary,
                        marginTop: '16px'
                      }}
                    >
                      {activeCampaign.discount_percentage}% OFF
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })()
      }

      {/* PRODUCTS GRID */}
      <section style={{ padding: '64px 40px', maxWidth: '1320px', margin: '0 auto' }}>
        {s.show_categories && (
          <div style={{ marginBottom: '40px' }}>
            <h2
              style={{
                fontFamily: s.font_heading,
                fontSize: '32px',
                fontWeight: '400',
                color: s.color_text_primary,
                marginBottom: '24px',
                letterSpacing: '-0.02em'
              }}
            >
              Destaques
            </h2>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
              {['Todos', 'Anéis', 'Colares', 'Brincos', 'Pulseiras'].map((cat) => (
                <button
                  key={cat}
                  style={{
                    backgroundColor: cat === 'Todos' ? `${s.color_primary}20` : 'transparent',
                    border: `1px solid ${cat === 'Todos' ? s.color_primary : s.color_primary + '33'}`,
                    color: cat === 'Todos' ? s.color_primary : s.color_text_secondary,
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    fontFamily: s.font_body,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (cat !== 'Todos') {
                      e.currentTarget.style.backgroundColor = `${s.color_primary}15`;
                      e.currentTarget.style.borderColor = s.color_primary || '';
                      e.currentTarget.style.color = s.color_primary || '';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (cat !== 'Todos') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = `${s.color_primary}33`;
                      e.currentTarget.style.color = s.color_text_secondary || '';
                    }
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${s.layout_columns || 3}, 1fr)`,
            gap: '24px'
          }}
        >
          {displayProducts.map((product) => (
            <div
              key={product.id}
              style={{
                backgroundColor: s.color_surface,
                borderRadius: '12px',
                overflow: 'hidden',
                border: `1px solid ${s.color_primary}22`,
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.border = `1px solid ${s.color_primary}66`;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 8px 32px ${s.color_primary}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.border = `1px solid ${s.color_primary}22`;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  aspectRatio: '1',
                  background: `linear-gradient(135deg, #1A1A1A 0%, ${s.color_surface} 100%)`,
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '48px'
                  }}
                >
                  💎
                </div>
              </div>
              <div style={{ padding: '20px' }}>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: s.color_text_primary,
                    marginBottom: '8px',
                    fontFamily: s.font_body
                  }}
                >
                  {product.name}
                </h3>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: s.color_primary,
                    marginBottom: '12px'
                  }}
                >
                  R$ {product.price.toFixed(2)}
                </div>
                <button
                  style={{
                    width: '100%',
                    backgroundColor: 'transparent',
                    border: `1px solid ${s.color_primary}66`,
                    color: s.color_text_primary,
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    fontFamily: s.font_body,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${s.color_primary}15`;
                    e.currentTarget.style.borderColor = s.color_primary || '';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = `${s.color_primary}66`;
                  }}
                >
                  Ver Detalhes
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          backgroundColor: s.footer_background,
          borderTop: `1px solid ${s.color_primary}22`,
          padding: '40px',
          textAlign: 'center'
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          {s.show_social_links && (
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              {['instagram', 'facebook', 'whatsapp'].map((social) => (
                <a
                  key={social}
                  href="#"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: `1px solid ${s.color_primary}33`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: s.color_text_secondary,
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = s.color_primary || '';
                    e.currentTarget.style.backgroundColor = `${s.color_primary}15`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${s.color_primary}33`;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {social[0].toUpperCase()}
                </a>
              ))}
            </div>
          )}
        </div>
        <div
          style={{
            fontSize: '13px',
            color: s.footer_text_color,
            fontFamily: s.font_body
          }}
        >
          {s.footer_text || `© ${new Date().getFullYear()} ${s.store_name}. Todos os direitos reservados.`}
        </div>
      </footer>
      {/* CATEGORIES SECTION */}
      {
        s.show_categories && (
          <section style={{ padding: '64px 40px', maxWidth: '1400px', margin: '0 auto' }}>
            <h2
              style={{
                fontFamily: s.font_heading,
                fontSize: '32px',
                textAlign: 'center',
                marginBottom: '40px',
                color: s.color_text_primary
              }}
            >
              Nossas Coleções
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
              {['Lançamentos', 'Mais Vendidos', 'Anéis', 'Colares', 'Brincos', 'Pulseiras'].map((cat) => (
                <div
                  key={cat}
                  style={{
                    height: '300px',
                    backgroundColor: s.color_surface,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${s.color_primary}22`,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: s.color_surface,
                      opacity: 0.5,
                      backgroundImage: 'url(https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  />
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      padding: '12px 24px',
                      backgroundColor: s.color_background,
                      color: s.color_text_primary,
                      fontFamily: s.font_heading,
                      fontSize: '20px',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      border: `1px solid ${s.color_primary}44`
                    }}
                  >
                    {cat}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      }

      {/* FEATURED PRODUCTS */}
      {
        s.show_featured_products && (
          <section style={{ padding: '64px 40px', maxWidth: '1400px', margin: '0 auto', borderTop: `1px solid ${s.color_primary}11` }}>
            <h2
              style={{
                fontFamily: s.font_heading,
                fontSize: '32px',
                textAlign: 'center',
                marginBottom: '16px',
                color: s.color_text_primary
              }}
            >
              Destaques
            </h2>
            <p
              style={{
                textAlign: 'center',
                color: s.color_text_secondary,
                marginBottom: '48px',
                maxWidth: '600px',
                marginLeft: 'auto',
                marginRight: 'auto'
              }}
            >
              Seleção exclusiva das peças mais desejadas do momento
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${s.layout_columns || 4}, 1fr)`,
                gap: '24px'
              }}
            >
              {displayProducts.map((product) => (
                <div
                  key={product.id}
                  style={{
                    backgroundColor: s.color_surface,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: `1px solid ${s.color_primary}11`,
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    cursor: 'pointer',

                    // Masonry specific
                    breakInside: s.layout_type === 'masonry' ? 'avoid' : undefined,
                    marginBottom: s.layout_type === 'masonry' ? '24px' : undefined,

                    // Carousel specific
                    minWidth: s.layout_type === 'carousel' ? '280px' : undefined,
                    marginRight: s.layout_type === 'carousel' ? '24px' : undefined,
                    scrollSnapAlign: s.layout_type === 'carousel' ? 'start' : undefined
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = `0 10px 30px -10px ${s.color_primary}22`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ position: 'relative', paddingTop: '100%' }}>
                    <img
                      src={product.image}
                      alt={product.name}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    <button
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        right: '12px',
                        backgroundColor: s.color_primary,
                        color: '#080808',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = s.color_primary_light || s.color_primary || '')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = s.color_primary || '')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <path d="M16 10a4 4 0 0 1-8 0" />
                      </svg>
                    </button>
                  </div>
                  <div style={{ padding: '16px' }}>
                    <h3
                      style={{
                        fontFamily: s.font_body,
                        fontSize: '14px',
                        color: s.color_text_primary,
                        marginBottom: '8px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {product.name}
                    </h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontFamily: s.font_body,
                          fontSize: '16px',
                          fontWeight: '700',
                          color: s.color_primary
                        }}
                      >
                        R$ {product.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section >
        )
      }

      {/* FOOTER */}
      <footer
        style={{
          backgroundColor: s.footer_background || '#000',
          padding: '64px 40px 32px',
          borderTop: `1px solid ${s.color_primary}22`,
          textAlign: 'center'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '40px' }}>
            {s.logo_url ? (
              <img
                src={s.logo_url}
                alt={s.store_name}
                style={{ maxHeight: '40px', marginBottom: '16px', filter: 'grayscale(100%) opacity(0.7)' }}
              />
            ) : (
              <h2 style={{ fontFamily: s.font_heading, fontSize: '24px', color: s.color_text_primary }}>
                {s.store_name}
              </h2>
            )}
            <p style={{ color: s.footer_text_color, maxWidth: '400px', margin: '16px auto', fontSize: '14px' }}>
              {s.store_tagline || 'Elegância e sofisticação em cada detalhe.'}
            </p>
          </div>

          {/* WhatsApp Button */}
          {s.show_social_links && s.whatsapp_number && (
            <div style={{ marginBottom: '32px' }}>
              <a
                href={`https://wa.me/${s.whatsapp_number}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  backgroundColor: s.color_primary,
                  color: '#080808',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  fontFamily: s.font_body
                }}
              >
                💬 Falar no WhatsApp
              </a>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '40px', flexWrap: 'wrap' }}>
            {['Termos de Uso', 'Política de Privacidade', 'Trocas e Devoluções', 'Contato'].map((item) => (
              <a
                key={item}
                href="#"
                style={{ color: s.footer_text_color, textDecoration: 'none', fontSize: '13px', transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.color = s.color_primary || ''}
                onMouseLeave={(e) => e.currentTarget.style.color = s.footer_text_color || ''}
              >
                {item}
              </a>
            ))}
          </div>

          <div style={{ paddingTop: '32px', borderTop: '1px solid #ffffff11', color: '#666', fontSize: '12px' }}>
            {s.footer_text || `© ${new Date().getFullYear()} ${s.store_name}. Todos os direitos reservados.`}
          </div>
        </div>
      </footer>
    </div >
  );
}
