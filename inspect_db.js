
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_OWNER_URL;
const supabaseKey = process.env.SUPABASE_OWNER_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials not found in environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable(tableName) {
    console.log(`\n--- Inspecting table: ${tableName} ---`);
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

    if (error) {
        console.error(`Error inspecting ${tableName}:`, error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
        // console.log('Sample Data:', data[0]);
    } else {
        console.log('Table is empty or no data returned.');
        // Try to get structure via an empty insert error or just assume empty
    }
}

async function main() {
    await inspectTable('products');
    await inspectTable('categories'); // Checking for 'etiqueta'
    await inspectTable('store_products');
    await inspectTable('store_categories');
    await inspectTable('etiquetas'); // Trying this guess
    await inspectTable('tags'); // Trying this guess
}

main();
