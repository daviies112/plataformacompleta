import { Router, Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { pool } from '../db';
import { getClienteSupabase } from '../lib/clienteSupabase';

const router = Router();

// Get Supabase client for public store - uses file config or env vars
const getPublicSupabaseClient = async (): Promise<SupabaseClient | null> => {
  try {
    // Use getClienteSupabase which checks file config first
    const config = await getClienteSupabase();
    if (config?.url && config?.anonKey) {
      return createClient(config.url, config.anonKey);
    }
    
    // Fallback to env vars
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      return createClient(supabaseUrl, supabaseKey);
    }
    
    return null;
  } catch (error) {
    console.error('[PublicStore] Error getting Supabase client:', error);
    return null;
  }
};

router.get('/store/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    
    if (!storeId) {
      return res.status(400).json({ success: false, error: 'Store ID is required' });
    }

    const supabase = await getPublicSupabaseClient();
    if (!supabase) {
      console.error('[PublicStore] Supabase not configured - check data/supabase-config.json or env vars');
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }
    
    console.log('[PublicStore] Loading store:', storeId);

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

// Helper function to get reseller's Supabase client with service key
const getResellerSupabaseClient = async (resellerEmail: string) => {
  try {
    // First try to get from local config
    const configResult = await pool.query(
      'SELECT supabase_url, supabase_anon_key, supabase_service_key FROM reseller_supabase_configs WHERE reseller_email = $1',
      [resellerEmail]
    );
    const config = configResult.rows[0];
    
    if (config?.supabase_url && config?.supabase_service_key) {
      return createClient(config.supabase_url, config.supabase_service_key);
    }
    
    // Fallback to default service key
    if (supabaseUrl && supabaseServiceKey) {
      return createClient(supabaseUrl, supabaseServiceKey);
    }
    
    // Last fallback to anon key
    if (supabaseUrl && supabaseKey) {
      return createClient(supabaseUrl, supabaseKey);
    }
    
    return null;
  } catch (error) {
    console.error('[ResellerStore] Error getting supabase client:', error);
    return null;
  }
};

// PUT /api/reseller/store - Save store configuration
router.put('/reseller/store', async (req: Request, res: Response) => {
  try {
    const { reseller_id, reseller_email, product_ids, is_published, store_name, store_slug } = req.body;
    
    if (!reseller_id || !reseller_email) {
      return res.status(400).json({ success: false, error: 'reseller_id and reseller_email are required' });
    }
    
    const supabase = await getResellerSupabaseClient(reseller_email);
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }
    
    console.log('[ResellerStore] Saving store for reseller:', reseller_id);
    
    // Check if table has the required columns by trying to select
    const { data: tableCheck, error: tableError } = await supabase
      .from('reseller_stores')
      .select('id, reseller_id, product_ids')
      .eq('reseller_id', reseller_id)
      .limit(1);
    
    if (tableError && tableError.code === '42P01') {
      // Table doesn't exist - create it
      console.log('[ResellerStore] Table reseller_stores not found, creating...');
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS reseller_stores (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          reseller_id UUID NOT NULL UNIQUE REFERENCES resellers(id),
          product_ids UUID[] DEFAULT '{}',
          is_published BOOLEAN DEFAULT false,
          store_name TEXT,
          store_slug TEXT UNIQUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_reseller_stores_slug ON reseller_stores(store_slug);
        CREATE INDEX IF NOT EXISTS idx_reseller_stores_published ON reseller_stores(is_published);
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      if (createError) {
        console.error('[ResellerStore] Error creating table:', createError);
      }
    }
    
    // Try to add missing columns
    const addColumnsSQL = `
      ALTER TABLE reseller_stores 
        ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS store_name TEXT,
        ADD COLUMN IF NOT EXISTS store_slug TEXT;
    `;
    
    try {
      await supabase.rpc('exec_sql', { sql: addColumnsSQL });
    } catch (e) {
      // RPC might not exist, continue anyway
      console.log('[ResellerStore] Could not add columns via RPC, continuing...');
    }
    
    // Prepare store data with only safe columns
    const storeData: any = {
      reseller_id,
      product_ids: product_ids || [],
    };
    
    // Try to include optional columns
    if (is_published !== undefined) storeData.is_published = is_published;
    if (store_name !== undefined) storeData.store_name = store_name;
    if (store_slug !== undefined) storeData.store_slug = store_slug || null;
    
    // Check if record exists
    const { data: existing } = await supabase
      .from('reseller_stores')
      .select('id')
      .eq('reseller_id', reseller_id)
      .single();
    
    let result;
    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('reseller_stores')
        .update(storeData)
        .eq('reseller_id', reseller_id)
        .select()
        .single();
      
      if (error) {
        // If error is about missing column, try with minimal data
        if (error.message?.includes('is_published') || error.message?.includes('store_name') || error.message?.includes('store_slug')) {
          console.log('[ResellerStore] Column error, using minimal data');
          const minimalData = { product_ids: product_ids || [] };
          const { data: minData, error: minError } = await supabase
            .from('reseller_stores')
            .update(minimalData)
            .eq('reseller_id', reseller_id)
            .select()
            .single();
          
          if (minError) throw minError;
          result = minData;
        } else {
          throw error;
        }
      } else {
        result = data;
      }
    } else {
      // Insert
      const { data, error } = await supabase
        .from('reseller_stores')
        .insert(storeData)
        .select()
        .single();
      
      if (error) {
        // If error is about missing column, try with minimal data
        if (error.message?.includes('is_published') || error.message?.includes('store_name') || error.message?.includes('store_slug')) {
          console.log('[ResellerStore] Column error on insert, using minimal data');
          const minimalData = { reseller_id, product_ids: product_ids || [] };
          const { data: minData, error: minError } = await supabase
            .from('reseller_stores')
            .insert(minimalData)
            .select()
            .single();
          
          if (minError) throw minError;
          result = minData;
        } else {
          throw error;
        }
      } else {
        result = data;
      }
    }
    
    // Generate public URL
    const publicUrl = store_slug 
      ? `/loja/${store_slug}`
      : `/loja/${reseller_id}`;
    
    console.log('[ResellerStore] Store saved successfully');
    return res.json({ 
      success: true, 
      store: result,
      public_url: publicUrl
    });
    
  } catch (error: any) {
    console.error('[ResellerStore] Error saving store:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// GET /api/reseller/store/:resellerId - Get store configuration
router.get('/reseller/store/:resellerId', async (req: Request, res: Response) => {
  try {
    const { resellerId } = req.params;
    const resellerEmail = req.query.email as string;
    
    if (!resellerId) {
      return res.status(400).json({ success: false, error: 'reseller_id is required' });
    }
    
    const supabase = resellerEmail 
      ? await getResellerSupabaseClient(resellerEmail)
      : await getPublicSupabaseClient();
      
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }
    
    // Try to get store with all columns
    const { data, error } = await supabase
      .from('reseller_stores')
      .select('*')
      .eq('reseller_id', resellerId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      // Try with minimal columns
      if (error.message?.includes('column')) {
        const { data: minData } = await supabase
          .from('reseller_stores')
          .select('id, reseller_id, product_ids')
          .eq('reseller_id', resellerId)
          .single();
        
        return res.json({ 
          success: true, 
          store: minData || null,
          limited_columns: true
        });
      }
      throw error;
    }
    
    // Get company/admin name for store_name fallback
    let companyName = null;
    if (data && !data.store_name) {
      // Try to get from admin_supabase_credentials or revendedoras table
      const { data: resellerData } = await supabase
        .from('resellers')
        .select('admin_id, nome')
        .eq('id', resellerId)
        .single();
      
      if (resellerData?.admin_id) {
        // Get admin name/company from somewhere if available
        companyName = 'Loja';
      }
    }
    
    return res.json({ 
      success: true, 
      store: data || null,
      company_name: companyName
    });
    
  } catch (error: any) {
    console.error('[ResellerStore] Error getting store:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

export default router;
