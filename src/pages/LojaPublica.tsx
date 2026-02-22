import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import type { StoreSettings, StoreProduct, StoreResellerProfile, StoreBanner, StoreCampaign, StoreBenefit, StoreVideo, StoreMosaic } from '../../server/services/storeService';
import { useToast } from '@/hooks/use-toast';
import { hexToHSL } from '@/features/revendedora/contexts/CompanyContext';

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

/**
 * LojaPublica - Loja pública da revendedora
 *
 * Rota: /loja/:slug
 *
 * Renderiza loja completa com:
 * - Personalizações do admin (cores, logo, layout)
 * - Produtos da revendedora
 * - Perfil da revendedora
 * - Design System Nacre aplicado
 */
export default function LojaPublica() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tagFilter = searchParams.get('tag');

  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Partial<StoreSettings> | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [profile, setProfile] = useState<StoreResellerProfile | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [cart, setCart] = useState<Array<{ product: StoreProduct; quantity: number }>>([]);
  const [showCart, setShowCart] = useState(false);

  // Novas funcionalidades
  const [banners, setBanners] = useState<StoreBanner[]>([]);
  const [campaigns, setCampaigns] = useState<StoreCampaign[]>([]);
  const [benefits, setBenefits] = useState<StoreBenefit[]>([]);
  const [videos, setVideos] = useState<StoreVideo[]>([]);
  const [mosaics, setMosaics] = useState<StoreMosaic[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    loadStore();
  }, [slug]);

  // Auto-rotate banners
  useEffect(() => {
    if (banners.length <= 1 || !settings?.hero_banner_autoplay) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, (settings.hero_banner_interval || 5) * 1000);

    return () => clearInterval(interval);
  }, [banners.length, settings?.hero_banner_autoplay, settings?.hero_banner_interval]);

  // Load Fonts Dynamically
  useEffect(() => {
    if (!settings) return;

    const headingFont = settings.font_heading || 'Cormorant Garamond';
    const bodyFont = settings.font_body || 'DM Sans';

    const linkId = 'store-public-fonts';
    let link = document.getElementById(linkId) as HTMLLinkElement;

    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    const fonts = [headingFont, bodyFont].map(f => f.replace(/ /g, '+')).join('&family=');
    link.href = `https://fonts.googleapis.com/css2?family=${fonts}:wght@300;400;500;600;700&display=swap`;
  }, [settings?.font_heading, settings?.font_body]);

  async function loadStore() {
    try {
      setLoading(true);

      // Buscar tenant_id pelo slug
      // TODO: Criar endpoint para buscar por slug
      // Por enquanto, vamos simular

      const tenantId = 'demo-tenant'; // TODO: Buscar do backend

      // Carregar tudo em paralelo
      const [settingsRes, productsRes, bannersRes, campaignsRes, benefitsRes] = await Promise.all([
        fetch(`/api/store/settings?tenantId=${tenantId}`),
        fetch(`/api/store/products?tenantId=${tenantId}&active=true`),
        fetch(`/api/store/banners?tenantId=${tenantId}&active=true`),
        fetch(`/api/store/campaigns?tenantId=${tenantId}&active=true`),
        fetch(`/api/store/benefits?tenantId=${tenantId}&active=true`)
      ]);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      }

      if (bannersRes.ok) {
        const bannersData = await bannersRes.json();
        setBanners(bannersData);
      }

      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData);
      }

      if (benefitsRes.ok) {
        const benefitsData = await benefitsRes.json();
        setBenefits(benefitsData);
      }

      // Buscar Videos
      const videosRes = await fetch(`/api/store/videos?tenantId=${tenantId}&active=true`);
      if (videosRes.ok) {
        const videosData = await videosRes.json();
        setVideos(videosData);
      }

      // Buscar Mosaicos
      const mosaicsRes = await fetch(`/api/store/mosaics?tenantId=${tenantId}&active=true`);
      if (mosaicsRes.ok) {
        const mosaicsData = await mosaicsRes.json();
        setMosaics(mosaicsData);
      }

      // TODO: Carregar perfil da revendedora

    } catch (error) {
      console.error('Erro ao carregar loja:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar loja',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function addToCart(product: StoreProduct) {
    const existing = cart.find((item) => item.product.id === product.id);

    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }

    toast({
      title: 'Sucesso',
      description: 'Produto adicionado ao carrinho!',
    });
  }

  const filteredProducts = products.filter((p) => {
    // Filter by Tag if present
    if (tagFilter) {
      if (!p.tags || !Array.isArray(p.tags) || !p.tags.includes(tagFilter)) {
        return false;
      }
    }

    if (selectedCategory === 'todos') return true;
    // TODO: Filtrar por categoria quando implementado
    return true;
  });

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#080808',
          color: '#F5F0E8',
          fontFamily: 'DM Sans, sans-serif'
        }}
      >
        Carregando loja...
      </div>
    );
  }

  if (!settings) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#080808',
          color: '#F5F0E8',
          fontFamily: 'DM Sans, sans-serif'
        }}
      >
        Loja não encontrada
      </div>
    );
  }

  // Valores padrão do Design System Nacre
  const s = {
    color_primary: settings.color_primary || '#C9A84C',
    color_primary_light: settings.color_primary_light || '#E8CC7A',
    color_background: settings.color_background || '#080808',
    color_surface: settings.color_surface || '#111111',
    color_text_primary: settings.color_text_primary || '#F5F0E8',
    color_text_secondary: settings.color_text_secondary || '#B8B0A0',
    color_text_tertiary: settings.color_text_tertiary || '#6B6358',
    font_heading: settings.font_heading || 'Cormorant Garamond',
    font_body: settings.font_body || 'DM Sans',
    show_announcement_bar: settings.show_announcement_bar !== false,
    show_search_bar: settings.show_search_bar !== false,
    show_cart: settings.show_cart !== false,
    show_banner: settings.show_banner !== false,
    show_benefits_bar: settings.show_benefits_bar !== false,
    show_active_campaign: settings.show_active_campaign !== false,
    show_categories: settings.show_categories !== false, // Used for products grid
    show_video_section: settings.show_video_section !== false,
    show_mosaic_section: settings.show_mosaic_section !== false,
    ...settings
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      style={{
        fontFamily: s.font_body,
        backgroundColor: s.color_background,
        color: s.color_text_primary,
        minHeight: '100vh',
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
            fontFamily: s.font_body,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative'
          }}
        >
          {s.announcement_bar_text || 'Insira seu aviso aqui'}

          {/* Tag Filter Clear Button */}
          {tagFilter && (
            <button
              onClick={() => navigate(`/loja/${slug}`)}
              style={{
                position: 'absolute',
                right: '40px',
                background: 'none',
                border: 'none',
                color: 'currentColor',
                cursor: 'pointer',
                fontSize: '10px',
                opacity: 0.8,
                textDecoration: 'underline'
              }}
            >
              Limpar filtro: {tagFilter} ✕
            </button>
          )}
        </div>
      )}

      {/* HEADER */}
      <header
        style={{
          backgroundColor: s.header_background || s.color_background,
          borderBottom: `1px solid ${s.color_primary}22`,
          padding: '16px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100
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
                color: s.header_text_color || s.color_text_primary,
                letterSpacing: '-0.02em'
              }}
            >
              {s.store_name}
            </div>
          )}

          <nav style={{ display: 'flex', gap: '24px' }}>
            {['Início', 'Produtos', 'Sobre'].map((item) => (
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
                onMouseEnter={(e) => (e.currentTarget.style.color = s.color_primary)}
                onMouseLeave={(e) => (e.currentTarget.style.color = s.color_text_secondary)}
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
              <input
                type="text"
                placeholder="Buscar..."
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: s.color_text_primary,
                  fontSize: '13px',
                  outline: 'none',
                  width: '150px'
                }}
              />
            </div>
          )}

          {s.show_cart !== false && (
            <button
              onClick={() => setShowCart(!showCart)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: s.color_text_primary,
                cursor: 'pointer',
                padding: '8px',
                position: 'relative'
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
              {cartCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    backgroundColor: s.color_primary,
                    color: '#080808',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '600'
                  }}
                >
                  {cartCount}
                </span>
              )}
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
                backgroundImage: banner.image_url ? `url(${banner.image_url})` : 'none',
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
                      fontFamily: s.font_body
                    }}
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
            {s.store_description || 'Descubra peças únicas que combinam sofisticação e estilo atemporal'}
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
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = s.color_primary_light;
              e.currentTarget.style.boxShadow = `0 4px 16px ${s.color_primary}4D`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = s.color_primary;
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Ver Coleção
          </button>
        </section>
      ) : null}

      {/* BENEFITS BAR */}
      {benefits && benefits.length > 0 && s.show_benefits_bar && (
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
      )}

      {/* MOSAIC SECTION */}
      {mosaics && mosaics.length > 0 && (
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
                  {mosaic.image_url ? (
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
      )}

      {/* VIDEO SECTION */}
      {videos && videos.length > 0 && (
        <section style={{ backgroundColor: '#000', padding: '0', position: 'relative' }}>
          {videos.filter(v => v.is_active).slice(0, 1).map((video) => (
            <div key={video.id} style={{ position: 'relative', width: '100%', height: '600px', overflow: 'hidden' }}>
              {video.video_type === 'youtube' && video.video_url ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${getYouTubeId(video.video_url)}?autoplay=${video.autoplay ? 1 : 0}&mute=1&loop=1&controls=0&showinfo=0&rel=0`}
                  title={video.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <video
                  src={video.video_url}
                  autoPlay={video.autoplay}
                  muted
                  loop
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
                />
              )}

              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                zIndex: 2,
                width: '100%',
                padding: '20px'
              }}>
                <h2 style={{
                  fontFamily: s.font_heading,
                  fontSize: '48px',
                  color: '#FFF',
                  marginBottom: '16px',
                  textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                }}>
                  {video.title}
                </h2>
                {video.description && (
                  <p style={{
                    fontSize: '18px',
                    color: '#EEE',
                    maxWidth: '600px',
                    margin: '0 auto',
                    lineHeight: '1.6',
                    textShadow: '0 1px 4px rgba(0,0,0,0.5)'
                  }}>
                    {video.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ACTIVE CAMPAIGN */}
      {campaigns.length > 0 && s.show_active_campaign && (() => {
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
              {activeCampaign.image_url && (
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
              )}
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
      })()}

      {/* CATEGORIES SECTION */}
      {s.show_categories && (
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
      )}

      {/* FEATURED PRODUCTS (Real Data) */}
      {s.show_featured_products && products.length > 0 && (
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
            {products.slice(0, 8).map((product) => (
              <div
                key={product.id}
                style={{
                  backgroundColor: s.color_surface,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: `1px solid ${s.color_primary}11`,
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  cursor: 'pointer'
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
                  {/* Placeholder se não tiver imagem */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#1a1a1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <span style={{ fontSize: '12px', color: '#444' }}>Sem imagem</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product);
                    }}
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      right: '12px',
                      backgroundColor: s.color_primary,
                      color: '#000',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                      zIndex: 2
                    }}
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
        </section>
      )}

      {/* PRODUCTS SECTION */}
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
              Nossa Coleção
            </h2>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
              {['Todos', 'Anéis', 'Colares', 'Brincos', 'Pulseiras'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat.toLowerCase())}
                  style={{
                    backgroundColor: selectedCategory === cat.toLowerCase() ? `${s.color_primary}20` : 'transparent',
                    border: `1px solid ${selectedCategory === cat.toLowerCase() ? s.color_primary : s.color_primary + '33'}`,
                    color: selectedCategory === cat.toLowerCase() ? s.color_primary : s.color_text_secondary,
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    fontFamily: s.font_body,
                    transition: 'all 0.2s'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCTS GRID */}
        {products.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              backgroundColor: s.color_surface,
              borderRadius: '12px',
              border: `1px solid ${s.color_primary}22`
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>💎</div>
            <h3
              style={{
                fontSize: '24px',
                color: s.color_text_primary,
                marginBottom: '8px',
                fontFamily: s.font_heading
              }}
            >
              Em breve novos produtos
            </h3>
            <p style={{ color: s.color_text_secondary }}>
              Estamos preparando peças incríveis para você
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${s.layout_columns || 3}, 1fr)`,
              gap: '24px'
            }}
          >
            {filteredProducts.map((product) => (
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
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px'
                  }}
                >
                  💎
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
                  {product.short_description && (
                    <p
                      style={{
                        fontSize: '13px',
                        color: s.color_text_secondary,
                        marginBottom: '12px',
                        lineHeight: '1.5'
                      }}
                    >
                      {product.short_description}
                    </p>
                  )}
                  <div style={{ marginBottom: '12px' }}>
                    {product.compare_at_price && (
                      <div
                        style={{
                          fontSize: '14px',
                          color: s.color_text_tertiary,
                          textDecoration: 'line-through',
                          marginBottom: '4px'
                        }}
                      >
                        R$ {product.compare_at_price.toFixed(2)}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: s.color_primary
                      }}
                    >
                      R$ {product.price.toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    style={{
                      width: '100%',
                      backgroundColor: s.color_primary,
                      color: '#080808',
                      border: 'none',
                      padding: '10px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontFamily: s.font_body,
                      transition: 'all 0.2s',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = s.color_primary_light;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = s.color_primary;
                    }}
                  >
                    Adicionar ao Carrinho
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
            {s.logo_url && s.logo_url.trim() !== '' ? (
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
                  fontFamily: s.font_body,
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = s.color_primary_light || s.color_primary || '')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = s.color_primary || '')}
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

      {/* CARRINHO LATERAL */}
      {showCart && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '400px',
            backgroundColor: s.color_surface,
            borderLeft: `1px solid ${s.color_primary}33`,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.5)'
          }}
        >
          <div style={{ padding: '24px', borderBottom: `1px solid ${s.color_primary}22` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: s.color_text_primary,
                  fontFamily: s.font_heading
                }}
              >
                Carrinho
              </h2>
              <button
                onClick={() => setShowCart(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: s.color_text_secondary,
                  cursor: 'pointer',
                  fontSize: '24px'
                }}
              >
                ×
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', color: s.color_text_secondary, paddingTop: '40px' }}>
                Carrinho vazio
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  style={{
                    marginBottom: '16px',
                    padding: '16px',
                    backgroundColor: s.color_background,
                    borderRadius: '8px',
                    border: `1px solid ${s.color_primary}22`
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: '600', color: s.color_text_primary, marginBottom: '8px' }}>
                    {item.product.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '16px', color: s.color_primary, fontWeight: '600' }}>
                      R$ {(item.product.price * item.quantity).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '13px', color: s.color_text_secondary }}>
                      {item.quantity}x
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div style={{ padding: '24px', borderTop: `1px solid ${s.color_primary}22` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '16px', fontWeight: '600', color: s.color_text_primary }}>Total:</span>
                <span style={{ fontSize: '20px', fontWeight: '600', color: s.color_primary }}>
                  R$ {cartTotal.toFixed(2)}
                </span>
              </div>
              <button
                style={{
                  width: '100%',
                  backgroundColor: s.color_primary,
                  color: '#080808',
                  border: 'none',
                  padding: '14px',
                  fontSize: '14px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = s.color_primary_light || s.color_primary || '')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = s.color_primary || '')}
              >
                Finalizar Compra
              </button>
            </div>
          )}
        </div>
      )}

      {/* OVERLAY DO CARRINHO */}
      {showCart && (
        <div
          onClick={() => setShowCart(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 999
          }}
        />
      )}
    </div>
  );
}
