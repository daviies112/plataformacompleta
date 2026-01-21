import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
};

router.get('/store/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    
    if (!storeId) {
      return res.status(400).json({ success: false, error: 'Store ID is required' });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }

    let storeData = null;
    let resellerId = storeId;

    const { data: storeBySlug, error: slugError } = await supabase
      .from('reseller_stores')
      .select('*')
      .eq('store_slug', storeId)
      .eq('is_published', true)
      .single();

    if (storeBySlug) {
      storeData = storeBySlug;
      resellerId = storeBySlug.reseller_id;
    } else {
      const { data: storeById, error: idError } = await supabase
        .from('reseller_stores')
        .select('*')
        .eq('reseller_id', storeId)
        .eq('is_published', true)
        .single();

      if (storeById) {
        storeData = storeById;
        resellerId = storeById.reseller_id;
      }
    }

    if (!storeData) {
      return res.status(404).json({ success: false, error: 'Store not found or not published' });
    }

    const { data: resellerData, error: resellerError } = await supabase
      .from('resellers')
      .select('id, nome, telefone')
      .eq('id', resellerId)
      .single();

    const { data: profileData } = await supabase
      .from('reseller_profiles')
      .select('profile_photo_url, phone, instagram_handle, bio, show_career_level')
      .eq('reseller_id', resellerId)
      .single();

    let products: any[] = [];
    if (storeData.product_ids && storeData.product_ids.length > 0) {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('id', storeData.product_ids);

      if (!productsError && productsData) {
        products = productsData;
      }
    }

    const productsByCategory: { [key: string]: any[] } = {};
    products.forEach(product => {
      const category = product.category || 'Outros';
      if (!productsByCategory[category]) {
        productsByCategory[category] = [];
      }
      productsByCategory[category].push(product);
    });

    return res.json({
      success: true,
      store: {
        id: storeData.id,
        reseller_id: storeData.reseller_id,
        store_name: storeData.store_name || resellerData?.nome || 'Loja',
        store_slug: storeData.store_slug,
        is_published: storeData.is_published,
      },
      reseller: resellerData ? {
        id: resellerData.id,
        name: resellerData.nome,
        phone: resellerData.telefone,
      } : null,
      profile: profileData || null,
      products,
      productsByCategory,
      totalProducts: products.length,
    });
  } catch (error: any) {
    console.error('[PublicStore] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

export default router;
