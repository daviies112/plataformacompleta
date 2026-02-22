
import { storeService } from './server/services/storeService';
import { getSupabaseCredentialsFromEnv } from './server/lib/credentialsDb';

async function checkTags() {
    console.log('Checking tags column in store_products...');

    // Need a valid tenantId. 'demo-tenant' was used in LojaPublica.tsx
    // Or 'system'.
    const tenantId = 'demo-tenant';

    try {
        // We need to mock getClient or ensure environment is set up
        // But storeService uses getClientSupabaseClient which uses credentialsDb.
        // We need .env loaded.
    } catch (e) {
        console.log(e);
    }
}

// Better approach: Just inspect the Supabase response for ANY product
// We can use a direct supabase client if we have creds.
// credentialsDb.ts has getSupabaseCredentialsFromEnv.

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
    const url = process.env.SUPABASE_OWNER_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_OWNER_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) {
        console.error('Missing Supabase credentials in .env');
        process.exit(1);
    }

    const supabase = createClient(url, key);

    console.log(`Connecting to ${url}...`);

    // Try to fetch one product from store_products
    const { data: products, error } = await supabase
        .from('store_products')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching store_products:', error);
    } else {
        if (products && products.length > 0) {
            console.log('Product keys:', Object.keys(products[0]));
            if ('tags' in products[0]) {
                console.log('✅ tags column EXISTS!');
                console.log('Value:', products[0].tags);
            } else {
                console.log('❌ tags column does NOT exist.');
            }
        } else {
            console.log('No products found in store_products.');
        }
    }

    // Also check categories for 'etiqueta'
    const { data: categories, error: catError } = await supabase
        .from('store_categories')
        .select('*')
        .limit(1);

    if (catError) {
        console.error('Error fetching store_categories:', catError);
    } else {
        if (categories && categories.length > 0) {
            console.log('Category keys:', Object.keys(categories[0]));
            if ('etiqueta' in categories[0]) {
                console.log('✅ etiqueta column EXISTS in store_categories!');
            } else {
                console.log('❌ etiqueta column does NOT exist in store_categories.');
            }
        }
    }
}

run();
