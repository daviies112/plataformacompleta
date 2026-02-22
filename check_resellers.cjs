
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) process.env[k] = envConfig[k];

const SUPABASE_URL = process.env.SUPABASE_OWNER_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_OWNER_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_OWNER_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    const { error } = await supabase.from('resellers').select('id').limit(1);
    if (error) {
        console.log(`❌ resellers ERROR: ${error.message} (${error.code})`);
    } else {
        console.log(`✅ resellers exists.`);
    }
}

check();
