import { getClientSupabaseClient } from '../lib/multiTenantSupabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// ============================================
// INTERFACES / TYPES
// ============================================

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

  created_at?: string;
  updated_at?: string;
}

export interface StoreBanner {
  id?: string;
  tenant_id: string;
  title?: string;
  subtitle?: string;
  description?: string;
  media_type?: 'image' | 'video';
  image_url: string;
  video_url?: string;
  mobile_image_url?: string;
  cta_text?: string;
  cta_url?: string;
  text_color?: string;
  overlay_opacity?: number;
  text_align?: string;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StoreCategory {
  id?: string;
  tenant_id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  icon?: string;
  parent_id?: string;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StoreProduct {
  id?: string;
  tenant_id: string;
  reseller_id?: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  price: number;
  compare_at_price?: number;
  cost_price?: number;
  category_id?: string;
  sku?: string;
  stock_quantity?: number;
  track_inventory?: boolean;
  allow_backorder?: boolean;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  meta_title?: string;
  meta_description?: string;
  is_active?: boolean;
  is_featured?: boolean;
  display_order?: number;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface StoreProductImage {
  id?: string;
  product_id: string;
  image_url: string;
  thumbnail_url?: string;
  alt_text?: string;
  display_order?: number;
  is_primary?: boolean;
  created_at?: string;
}

export interface StoreProductVariant {
  id?: string;
  product_id: string;
  name: string;
  sku?: string;
  price?: number;
  compare_at_price?: number;
  attributes?: Record<string, any>;
  stock_quantity?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StorePage {
  id?: string;
  tenant_id: string;
  title: string;
  slug: string;
  content?: string;
  meta_title?: string;
  meta_description?: string;
  is_active?: boolean;
  show_in_menu?: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StoreResellerProfile {
  id?: string;
  tenant_id: string;
  reseller_id: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  cover_image_url?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  custom_colors?: Record<string, any>;
  custom_slug?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// NOVAS INTERFACES - Metodologia Pandora/Vivara

export interface StoreBenefit {
  id?: string;
  tenant_id: string;
  icon: string; // Nome do ícone (ex: 'gift', 'shield', 'truck', 'certificate')
  title: string; // Ex: "Garantia de 1 ano"
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StoreVideo {
  id?: string;
  tenant_id: string;
  title?: string;
  description?: string;
  video_url: string; // URL do vídeo ou embed do YouTube/Vimeo
  video_type: 'youtube' | 'vimeo' | 'url'; // Tipo de vídeo
  thumbnail_url?: string;
  section_type: 'hero' | 'institucional' | 'produto'; // Onde exibir
  display_order: number;
  is_active: boolean;
  autoplay: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StoreMosaic {
  id?: string;
  tenant_id: string;
  title?: string; // Título sobreposto (opcional)
  media_type?: 'image' | 'video';
  image_url: string;
  video_url?: string;
  link_url?: string; // Link de destino ao clicar
  layout_type: '1x1' | '1x2' | '2x1' | '2x2' | '4x2'; // Tamanho do tile no grid
  display_order: number;
  is_active: boolean;
  target_tag?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StoreCampaign {
  id?: string;
  tenant_id: string;
  name: string; // Ex: "Dia das Mães 2025"
  description?: string;
  media_type?: 'image' | 'video';
  image_url?: string;
  video_url?: string;
  badge_text?: string; // Ex: "Últimos dias!", "Oferta por tempo limitado"
  start_date: string; // ISO date
  end_date: string; // ISO date
  discount_percentage?: number;
  target_product_ids?: string[]; // UUID[] - produtos incluídos
  target_tag?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// SERVICE CLASS
// ============================================

class StoreService {
  private async getClient(tenantId: string): Promise<SupabaseClient | null> {
    const client = await getClientSupabaseClient(tenantId);
    if (!client) {
      console.error(`[StoreService] Cliente Supabase não disponível para tenant: ${tenantId}`);
    }
    return client;
  }

  // Helper para garantir que o bucket existe
  private async ensureBucketExists(supabase: SupabaseClient, bucketName: string) {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const exists = buckets?.some(b => b.name === bucketName);

      if (!exists) {
        console.log(`[StoreService] Criando bucket: ${bucketName}`);
        const { error } = await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 100 * 1024 * 1024 // 100MB
        });
        if (error) console.error('[StoreService] Erro ao criar bucket:', error);
      }
    } catch (e) {
      console.error('[StoreService] Exceção ao verificar/criar bucket:', e);
    }
  }

  async uploadFile(tenantId: string, bucketName: string, folder: string, file: Express.Multer.File): Promise<string | null> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return null;

    try {
      await this.ensureBucketExists(supabase, bucketName);

      const fileExt = path.extname(file.originalname);
      const fileName = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
      const fileBuffer = fs.readFileSync(file.path);

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, fileBuffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('[StoreService] Erro no upload do Storage:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('[StoreService] Exceção no uploadFile:', error);
      return null;
    }
  }

  // ============================================
  // STORE SETTINGS (Personalizações)
  // ============================================

  async getStoreSettings(tenantId: string): Promise<StoreSettings | null> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[StoreService] Erro ao buscar settings:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[StoreService] Erro ao buscar settings:', error);
      return null;
    }
  }

  async saveStoreSettings(tenantId: string, settings: Partial<StoreSettings>): Promise<StoreSettings | null> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return null;

    try {
      // Verificar se já existe
      const existing = await this.getStoreSettings(tenantId);

      const payload = {
        ...settings,
        tenant_id: tenantId,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        // UPDATE
        const { data, error } = await supabase
          .from('store_settings')
          .update(payload)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao atualizar settings:', error);
          return null;
        }

        return data;
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('store_settings')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao criar settings:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      console.error('[StoreService] Erro ao salvar settings:', error);
      return null;
    }
  }

  // ============================================
  // BANNERS
  // ============================================

  async getBanners(tenantId: string, activeOnly: boolean = false): Promise<StoreBanner[]> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return [];

    try {
      let query = supabase
        .from('store_banners')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[StoreService] Erro ao buscar banners:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[StoreService] Erro ao buscar banners:', error);
      return [];
    }
  }

  async saveBanner(tenantId: string, banner: Partial<StoreBanner>): Promise<StoreBanner | null> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return null;

    try {
      const payload = {
        ...banner,
        tenant_id: tenantId
      };

      if (banner.id) {
        // UPDATE
        const { data, error } = await supabase
          .from('store_banners')
          .update(payload)
          .eq('id', banner.id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao atualizar banner:', error);
          return null;
        }

        return data;
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('store_banners')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao criar banner:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      console.error('[StoreService] Erro ao salvar banner:', error);
      return null;
    }
  }

  async deleteBanner(tenantId: string, bannerId: string): Promise<boolean> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('store_banners')
        .delete()
        .eq('id', bannerId)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[StoreService] Erro ao deletar banner:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[StoreService] Erro ao deletar banner:', error);
      return false;
    }
  }

  // ============================================
  // CATEGORIES
  // ============================================

  async getCategories(tenantId: string, activeOnly: boolean = false): Promise<StoreCategory[]> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return [];

    try {
      let query = supabase
        .from('store_categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[StoreService] Erro ao buscar categorias:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[StoreService] Erro ao buscar categorias:', error);
      return [];
    }
  }

  async saveCategory(tenantId: string, category: Partial<StoreCategory>): Promise<StoreCategory | null> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return null;

    try {
      const payload = {
        ...category,
        tenant_id: tenantId
      };

      if (category.id) {
        // UPDATE
        const { data, error } = await supabase
          .from('store_categories')
          .update(payload)
          .eq('id', category.id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao atualizar categoria:', error);
          return null;
        }

        return data;
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('store_categories')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao criar categoria:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      console.error('[StoreService] Erro ao salvar categoria:', error);
      return null;
    }
  }

  async deleteCategory(tenantId: string, categoryId: string): Promise<boolean> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('store_categories')
        .delete()
        .eq('id', categoryId)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[StoreService] Erro ao deletar categoria:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[StoreService] Erro ao deletar categoria:', error);
      return false;
    }
  }

  // ============================================
  // PRODUCTS
  // ============================================

  async getProducts(tenantId: string, resellerId?: string, activeOnly: boolean = false): Promise<StoreProduct[]> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return [];

    try {
      let query = supabase
        .from('store_products')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (resellerId) {
        query = query.eq('reseller_id', resellerId);
      }

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[StoreService] Erro ao buscar produtos:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[StoreService] Erro ao buscar produtos:', error);
      return [];
    }
  }

  async getProductById(tenantId: string, productId: string): Promise<StoreProduct | null> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('store_products')
        .select('*')
        .eq('id', productId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[StoreService] Erro ao buscar produto:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[StoreService] Erro ao buscar produto:', error);
      return null;
    }
  }

  async getProductBySlug(tenantId: string, slug: string): Promise<StoreProduct | null> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('store_products')
        .select('*')
        .eq('slug', slug)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[StoreService] Erro ao buscar produto por slug:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[StoreService] Erro ao buscar produto por slug:', error);
      return null;
    }
  }

  async saveProduct(tenantId: string, product: Partial<StoreProduct>): Promise<StoreProduct | null> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return null;

    try {
      const payload = {
        ...product,
        tenant_id: tenantId
      };

      if (product.id) {
        // UPDATE
        const { data, error } = await supabase
          .from('store_products')
          .update(payload)
          .eq('id', product.id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao atualizar produto:', error);
          return null;
        }

        return data;
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('store_products')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao criar produto:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      console.error('[StoreService] Erro ao salvar produto:', error);
      return null;
    }
  }

  async deleteProduct(tenantId: string, productId: string): Promise<boolean> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('store_products')
        .delete()
        .eq('id', productId)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[StoreService] Erro ao deletar produto:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[StoreService] Erro ao deletar produto:', error);
      return false;
    }
  }

  // ============================================
  // PRODUCT IMAGES
  // ============================================

  async getProductImages(productId: string): Promise<StoreProductImage[]> {
    // Usa o tenant do produto
    const product = await this.getProductById('', productId); // Busca produto primeiro
    if (!product) return [];

    const supabase = await this.getClient(product.tenant_id);
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('store_product_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[StoreService] Erro ao buscar imagens do produto:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[StoreService] Erro ao buscar imagens do produto:', error);
      return [];
    }
  }

  async saveProductImage(tenantId: string, image: Partial<StoreProductImage>): Promise<StoreProductImage | null> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return null;

    try {
      if (image.id) {
        // UPDATE
        const { data, error } = await supabase
          .from('store_product_images')
          .update(image)
          .eq('id', image.id)
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao atualizar imagem:', error);
          return null;
        }

        return data;
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('store_product_images')
          .insert([image])
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao criar imagem:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      console.error('[StoreService] Erro ao salvar imagem:', error);
      return null;
    }
  }

  async deleteProductImage(tenantId: string, imageId: string): Promise<boolean> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('store_product_images')
        .delete()
        .eq('id', imageId);

      if (error) {
        console.error('[StoreService] Erro ao deletar imagem:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[StoreService] Erro ao deletar imagem:', error);
      return false;
    }
  }

  // ============================================
  // VIDEOS
  // ============================================

  async getVideos(tenantId: string, activeOnly: boolean = false): Promise<StoreVideo[]> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return [];

    try {
      let query = supabase
        .from('store_videos')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[StoreService] Erro ao buscar vídeos:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[StoreService] Erro ao buscar vídeos:', error);
      return [];
    }
  }

  async saveVideo(tenantId: string, video: Partial<StoreVideo>): Promise<StoreVideo | null> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return null;

    try {
      const payload = {
        ...video,
        tenant_id: tenantId
      };

      if (video.id) {
        // UPDATE
        const { data, error } = await supabase
          .from('store_videos')
          .update(payload)
          .eq('id', video.id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao atualizar vídeo:', error);
          return null;
        }

        return data;
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('store_videos')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao criar vídeo:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      console.error('[StoreService] Erro ao salvar vídeo:', error);
      return null;
    }
  }

  async deleteVideo(tenantId: string, videoId: string): Promise<boolean> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('store_videos')
        .delete()
        .eq('id', videoId)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[StoreService] Erro ao deletar vídeo:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[StoreService] Erro ao deletar vídeo:', error);
      return false;
    }
  }

  // ============================================
  // MOSAICS
  // ============================================

  async getMosaics(tenantId: string, activeOnly: boolean = false): Promise<StoreMosaic[]> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return [];

    try {
      let query = supabase
        .from('store_mosaics')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[StoreService] Erro ao buscar mosaicos:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[StoreService] Erro ao buscar mosaicos:', error);
      return [];
    }
  }

  async saveMosaic(tenantId: string, mosaic: Partial<StoreMosaic>): Promise<StoreMosaic | null> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return null;

    try {
      const payload = {
        ...mosaic,
        tenant_id: tenantId
      };

      if (mosaic.id) {
        // UPDATE
        const { data, error } = await supabase
          .from('store_mosaics')
          .update(payload)
          .eq('id', mosaic.id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao atualizar mosaico:', error);
          return null;
        }

        return data;
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('store_mosaics')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao criar mosaico:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      console.error('[StoreService] Erro ao salvar mosaico:', error);
      return null;
    }
  }

  async deleteMosaic(tenantId: string, mosaicId: string): Promise<boolean> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('store_mosaics')
        .delete()
        .eq('id', mosaicId)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[StoreService] Erro ao deletar mosaico:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[StoreService] Erro ao deletar mosaico:', error);
      return false;
    }
  }

  // ============================================
  // RESELLER PROFILE
  // ============================================

  async getResellerProfile(tenantId: string, resellerId: string): Promise<StoreResellerProfile | null> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('store_reseller_profiles')
        .select('*')
        .eq('reseller_id', resellerId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[StoreService] Erro ao buscar perfil:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[StoreService] Erro ao buscar perfil:', error);
      return null;
    }
  }

  async saveResellerProfile(tenantId: string, profile: Partial<StoreResellerProfile>): Promise<StoreResellerProfile | null> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return null;

    try {
      const payload = {
        ...profile,
        tenant_id: tenantId
      };

      if (profile.id) {
        // UPDATE
        const { data, error } = await supabase
          .from('store_reseller_profiles')
          .update(payload)
          .eq('id', profile.id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao atualizar perfil:', error);
          return null;
        }

        return data;
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('store_reseller_profiles')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao criar perfil:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      console.error('[StoreService] Erro ao salvar perfil:', error);
      return null;
    }
  }

  // ============================================
  // BENEFITS (Benefícios)
  // ============================================

  async getBenefits(tenantId: string, activeOnly: boolean = false): Promise<StoreBenefit[]> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return [];

    try {
      let query = supabase
        .from('store_benefits')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[StoreService] Erro ao buscar benefícios:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[StoreService] Erro ao buscar benefícios:', error);
      return [];
    }
  }

  async saveBenefit(tenantId: string, benefit: Partial<StoreBenefit>): Promise<StoreBenefit | null> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return null;

    try {
      const payload = {
        ...benefit,
        tenant_id: tenantId
      };

      if (benefit.id) {
        // UPDATE
        const { data, error } = await supabase
          .from('store_benefits')
          .update(payload)
          .eq('id', benefit.id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao atualizar benefício:', error);
          return null;
        }

        return data;
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('store_benefits')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao criar benefício:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      console.error('[StoreService] Erro ao salvar benefício:', error);
      return null;
    }
  }

  async deleteBenefit(tenantId: string, benefitId: string): Promise<boolean> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('store_benefits')
        .delete()
        .eq('id', benefitId)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[StoreService] Erro ao deletar benefício:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[StoreService] Erro ao deletar benefício:', error);
      return false;
    }
  }

  // ============================================
  // VIDEOS (Vídeos Promocionais) - Já implementado acima
  // ============================================

  // ============================================
  // MOSAICS (Mosaico de Banners) - Já implementado acima
  // ============================================

  // ============================================
  // CAMPAIGNS (Campanhas Sazonais)
  // ============================================

  async getCampaigns(tenantId: string, activeOnly: boolean = false): Promise<StoreCampaign[]> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return [];

    try {
      let query = supabase
        .from('store_campaigns')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('start_date', { ascending: false });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[StoreService] Erro ao buscar campanhas:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[StoreService] Erro ao buscar campanhas:', error);
      return [];
    }
  }

  async getActiveCampaign(tenantId: string): Promise<StoreCampaign | null> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return null;

    try {
      const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      const { data, error } = await supabase
        .from('store_campaigns')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[StoreService] Erro ao buscar campanha ativa:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[StoreService] Erro ao buscar campanha ativa:', error);
      return null;
    }
  }

  async saveCampaign(tenantId: string, campaign: Partial<StoreCampaign>): Promise<StoreCampaign | null> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return null;

    try {
      const payload = {
        ...campaign,
        tenant_id: tenantId
      };

      if (campaign.id) {
        // UPDATE
        const { data, error } = await supabase
          .from('store_campaigns')
          .update(payload)
          .eq('id', campaign.id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao atualizar campanha:', error);
          return null;
        }

        return data;
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('store_campaigns')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error('[StoreService] Erro ao criar campanha:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      console.error('[StoreService] Erro ao salvar campanha:', error);
      return null;
    }
  }

  async getTags(tenantId: string): Promise<string[]> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return [];

    try {
      // Fetch all tags from all products
      const { data, error } = await supabase
        .from('store_products')
        .select('tags')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[StoreService] Erro ao buscar tags:', error);
        return [];
      }

      if (!data) return [];

      // Flatten and uniquify
      const allTags = new Set<string>();
      data.forEach((p: any) => {
        if (Array.isArray(p.tags)) {
          p.tags.forEach((t: string) => allTags.add(t));
        }
      });

      return Array.from(allTags).sort();
    } catch (error) {
      console.error('[StoreService] Erro ao buscar tags:', error);
      return [];
    }
  }

  async deleteCampaign(tenantId: string, campaignId: string): Promise<boolean> {
    const supabase = await this.getClient(tenantId);
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('store_campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[StoreService] Erro ao deletar campanha:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[StoreService] Erro ao deletar campanha:', error);
      return false;
    }
  }
}

export const storeService = new StoreService();
