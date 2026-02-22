export interface StoreSettings {
    id?: string;
    tenant_id: string;

    // BRANDING
    logo_url?: string;
    logo_size?: string;
    logo_position?: string;
    store_name: string;
    store_description?: string;
    store_tagline?: string;

    // CORES (Design System Nacre)
    color_primary?: string;
    color_primary_light?: string;
    color_primary_dim?: string;
    color_background?: string;
    color_surface?: string;
    color_text_primary?: string;
    color_text_secondary?: string;
    color_text_tertiary?: string;

    // TIPOGRAFIA
    font_heading?: string;
    font_body?: string;
    font_size_base?: string;

    // LAYOUT HOME
    layout_type?: string;
    layout_columns?: number;
    show_banner?: boolean;
    show_categories?: boolean;
    show_featured_products?: boolean;

    // HEADER
    header_background?: string;
    header_text_color?: string;
    show_search_bar?: boolean;
    show_cart?: boolean;

    // ANNOUNCEMENT BAR (Faixa de Aviso)
    show_announcement_bar?: boolean;
    announcement_bar_text?: string;
    announcement_bar_bg_color?: string;
    announcement_bar_text_color?: string;

    // FOOTER
    footer_background?: string;
    footer_text_color?: string;
    footer_text?: string;
    show_social_links?: boolean;
    instagram_url?: string;
    facebook_url?: string;
    whatsapp_number?: string;

    // SEO
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;

    // CONFIGURAÇÕES ADICIONAIS
    currency?: string;
    enable_checkout?: boolean;
    enable_wishlist?: boolean;

    // NOVOS CAMPOS - Hero Banners
    hero_banner_autoplay?: boolean;
    hero_banner_interval?: number; // Segundos entre slides

    // Barra de Benefícios
    show_benefits_bar?: boolean;
    benefits_bar_background?: string;

    // Vídeos
    show_video_section?: boolean;

    // Mosaico
    show_mosaic_section?: boolean;
    mosaic_layout_columns?: number; // 2, 3 ou 4

    // Campanhas
    show_active_campaign?: boolean;

    // Products (from reseller_stores table, merged here for convenience but saved separately)
    product_ids?: string[];
    is_published?: boolean;
    store_slug?: string;

    created_at?: string;
    updated_at?: string;
}

export const defaultStoreSettings: Partial<StoreSettings> = {
    store_name: 'Minha Loja',
    store_tagline: 'Elegância em Cada Detalhe',
    color_primary: '#C9A84C',
    color_primary_light: '#E8CC74',
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
