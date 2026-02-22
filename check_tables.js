
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load .env manually to be sure
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const SUPABASE_URL = process.env.SUPABASE_OWNER_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_OWNER_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_OWNER_KEY;

console.log('🚀 Checking tables in Supabase...');
console.log('📍 URL:', SUPABASE_URL);

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in .env');
    console.log('Available keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTables() {
    const tables = ['store_campaigns', 'store_benefits', 'store_videos', 'store_mosaics'];
    let missing = [];

    for (const table of tables) {
        try {
            const { error } = await supabase.from(table).select('id').limit(1);
            if (error) {
                console.log(`❌ Table '${table}' ERROR: ${error.message} (Code: ${error.code})`);
                // 42P01 is undefined_table in Postgres, but Supabase API might return 404 or specific message
                if (error.code === '42P01' || error.message.includes('does not exist')) {
                    missing.push(table);
                }
            } else {
                console.log(`✅ Table '${table}' exists.`);
            }
        } catch (err) {
            console.log(`❌ Table '${table}' EXCEPTION: ${err.message}`);
        }
    }

    if (missing.length > 0) {
        console.log('\n⚠️ Missing tables:', missing.join(', '));
        console.log('👉 You need to run the migration SQL.');
    } else {
        console.log('\n✅ All store tables exist.');
    }
}

checkTables();
