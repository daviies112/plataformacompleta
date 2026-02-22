
const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
    const url = process.env.SUPABASE_OWNER_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_OWNER_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) {
        console.error('Missing Supabase credentials in .env');
        console.error('SUPABASE_OWNER_URL:', process.env.SUPABASE_OWNER_URL);
        console.error('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
        process.exit(1);
    }

    console.log(`Connecting to ${url}...`);
    const supabase = createClient(url, key);

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
            if ('etiquetas' in products[0]) {
                console.log('✅ etiquetas column EXISTS!');
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
        } else {
            console.log('No categories found in store_categories.');
        }
    }
}

run();
